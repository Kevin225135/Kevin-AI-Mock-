import { canAccessOwnedResource } from "@/lib/auth/permissions";
import { analyticsEvents } from "@/lib/analytics/events";
import { prisma } from "@/lib/repositories/prisma-client";
import { DomainError } from "./errors";
import { upsertWorkflowMemory } from "./memory-service";
import {
  buildEquivalentRetestPrompt,
  deriveWeaknessCandidates,
  evaluateRetestOutcome,
  getRetestScore
} from "./training";
import type {
  CurrentUser,
  Difficulty,
  DimensionScores,
  InterviewModule,
  MockSession,
  Question,
  Report,
  TrainingTask,
  Weakness
} from "./types";

export type WeaknessActionInput =
  | { action: "CONFIRM"; dueAt: string }
  | { action: "IGNORE" };

export async function syncSessionWeaknesses(
  session: MockSession,
  report: Report
) {
  const candidates = deriveWeaknessCandidates(report);

  await prisma.$transaction(async (tx) => {
    const persisted = await tx.weakness.findMany({
      where: { sessionId: session.id, status: { not: "PROPOSED" } },
      select: { dimension: true }
    });
    const persistedDimensions = new Set(
      persisted.map((weakness) => weakness.dimension)
    );
    const selectedCandidates = candidates
      .filter((candidate) => !persistedDimensions.has(candidate.dimension))
      .slice(0, Math.max(0, 3 - persisted.length));
    const selectedDimensions = selectedCandidates.map(
      (candidate) => candidate.dimension
    );
    await tx.weakness.deleteMany({
      where: {
        sessionId: session.id,
        status: "PROPOSED",
        ...(selectedDimensions.length
          ? { dimension: { notIn: selectedDimensions } }
          : {})
      }
    });

    for (const candidate of selectedCandidates) {
      const existing = await tx.weakness.findUnique({
        where: {
          sessionId_dimension: {
            sessionId: session.id,
            dimension: candidate.dimension
          }
        }
      });

      if (!existing) {
        await tx.weakness.create({
          data: {
            userId: session.userId,
            sessionId: session.id,
            sourceAnswerId: candidate.sourceAnswerId,
            dimension: candidate.dimension,
            title: candidate.title,
            evidenceRef: candidate.evidenceRef,
            evidenceSummary: candidate.evidenceSummary,
            severity: candidate.severity,
            baselineScore: candidate.baselineScore
          }
        });
      } else if (existing.status === "PROPOSED") {
        await tx.weakness.update({
          where: { id: existing.id },
          data: {
            sourceAnswerId: candidate.sourceAnswerId,
            evidenceRef: candidate.evidenceRef,
            evidenceSummary: candidate.evidenceSummary,
            severity: candidate.severity,
            baselineScore: candidate.baselineScore
          }
        });
      }
    }
  });
  const current = await prisma.weakness.findMany({
    where: { sessionId: session.id }
  });
  await Promise.all(current.map(syncWeaknessMemory));
}

export async function listSessionWeaknesses(
  sessionId: string,
  actor: CurrentUser
): Promise<Weakness[] | null> {
  const session = await prisma.mockSession.findUnique({
    where: { id: sessionId },
    select: { userId: true }
  });
  if (!session || !canAccessOwnedResource(actor, session.userId)) {
    return null;
  }

  return loadSessionWeaknesses(sessionId);
}

export async function updateWeakness(
  weaknessId: string,
  input: WeaknessActionInput,
  actor: CurrentUser
): Promise<Weakness> {
  const weakness = await prisma.weakness.findUnique({
    where: { id: weaknessId },
    include: {
      session: true,
      sourceAnswer: { include: { question: true, score: true } }
    }
  });
  if (!weakness || !canAccessOwnedResource(actor, weakness.userId)) {
    throw new DomainError("Weakness not found.", "WEAKNESS_NOT_FOUND", 404);
  }

  if (input.action === "IGNORE") {
    if (weakness.status === "IGNORED") {
      return loadWeakness(weaknessId);
    }
    if (weakness.status === "PASSED") {
      throw new DomainError(
        "已通过的弱点不能改为忽略。",
        "INVALID_WEAKNESS_TRANSITION",
        409
      );
    }
    const inProgressTask = await prisma.trainingTask.findFirst({
      where: { weaknessId, status: "IN_PROGRESS" }
    });
    if (inProgressTask) {
      throw new DomainError(
        "复测已经进入一场 Mock，完成本题后再更新训练状态。",
        "RETEST_IN_PROGRESS",
        409
      );
    }

    await prisma.$transaction([
      prisma.trainingTask.updateMany({
        where: { weaknessId, status: "PENDING" },
        data: { status: "CANCELLED" }
      }),
      prisma.weakness.update({
        where: { id: weaknessId },
        data: {
          status: "IGNORED",
          ignoredAt: new Date(),
          dueAt: null
        }
      })
    ]);
    return loadWeakness(weaknessId);
  }

  if (weakness.status === "PASSED" || weakness.status === "IGNORED") {
    throw new DomainError(
      "该弱点当前不能加入复测计划。",
      "INVALID_WEAKNESS_TRANSITION",
      409
    );
  }
  const dueAt = parseDueAt(input.dueAt);
  const activeTask = await prisma.trainingTask.findFirst({
    where: { weaknessId, status: { in: ["PENDING", "IN_PROGRESS"] } },
    orderBy: { createdAt: "desc" }
  });
  if (activeTask?.status === "IN_PROGRESS") {
    throw new DomainError(
      "复测已经进入一场 Mock，不能重复创建任务。",
      "RETEST_IN_PROGRESS",
      409
    );
  }

  if (activeTask) {
    await prisma.$transaction([
      prisma.trainingTask.update({
        where: { id: activeTask.id },
        data: { dueAt }
      }),
      prisma.weakness.update({
        where: { id: weaknessId },
        data: { status: "CONFIRMED", dueAt, confirmedAt: new Date() }
      })
    ]);
    return loadWeakness(weaknessId);
  }

  const prompt = buildEquivalentRetestPrompt({
    module: weakness.session.module,
    targetRole: weakness.session.targetRole,
    dimension: weakness.dimension,
    originalPrompt: weakness.sourceAnswer.question.prompt
  });
  const externalId = `v2-retest-${weakness.id}`;

  await prisma.$transaction(async (tx) => {
    const equivalentQuestion = await tx.questionBank.upsert({
      where: { externalId },
      update: {
        prompt,
        expectation: `针对${weakness.title}进行等价题复测；不得复述或背诵原答案。`,
        rubricVersionId:
          weakness.sourceAnswer.score?.rubricVersionId ??
          weakness.sourceAnswer.question.rubricVersionId
      },
      create: {
        externalId,
        module: weakness.session.module,
        targetRole: weakness.session.targetRole,
        difficulty: weakness.session.difficulty,
        prompt,
        expectation: `针对${weakness.title}进行等价题复测；不得复述或背诵原答案。`,
        keywords: ["equivalent-retest", weakness.dimension.toLowerCase()],
        rubricVersionId:
          weakness.sourceAnswer.score?.rubricVersionId ??
          weakness.sourceAnswer.question.rubricVersionId
      }
    });
    const trainingTask = await tx.trainingTask.create({
      data: {
        weaknessId,
        userId: weakness.userId,
        sourceQuestionId: weakness.sourceAnswer.questionId,
        equivalentQuestionId: equivalentQuestion.id,
        dueAt
      }
    });
    await tx.weakness.update({
      where: { id: weaknessId },
      data: { status: "CONFIRMED", dueAt, confirmedAt: new Date() }
    });
    await tx.event.create({
      data: {
        name: analyticsEvents.planCreated,
        userId: weakness.userId,
        sessionId: weakness.sessionId,
        payload: {
          weaknessId,
          trainingTaskId: trainingTask.id,
          dimension: weakness.dimension,
          dueAt: dueAt.toISOString()
        }
      }
    });
  });

  return loadWeakness(weaknessId);
}

export async function findDueRetest(input: {
  userId: string;
  module: InterviewModule;
  targetRole: string;
  difficulty: Difficulty;
}): Promise<{ trainingTaskId: string; question: Question } | null> {
  const task = await prisma.trainingTask.findFirst({
    where: {
      userId: input.userId,
      status: "PENDING",
      dueAt: { lte: new Date() },
      weakness: {
        status: { in: ["CONFIRMED", "NOT_IMPROVED", "IMPROVING"] },
        session: {
          module: input.module,
          targetRole: input.targetRole,
          difficulty: input.difficulty
        }
      }
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    include: { equivalentQuestion: true }
  });

  return task
    ? { trainingTaskId: task.id, question: mapQuestion(task.equivalentQuestion) }
    : null;
}

export async function completeRetestTrainingTask(input: {
  sessionId: string;
  questionId: string;
  answerId: string;
  dimensions: DimensionScores;
}) {
  const task = await prisma.trainingTask.findFirst({
    where: {
      retestSessionId: input.sessionId,
      equivalentQuestionId: input.questionId,
      status: "IN_PROGRESS"
    },
    include: { weakness: true }
  });
  if (!task) return;

  const latestScore = getRetestScore(input.dimensions, task.weakness.dimension);
  const status = evaluateRetestOutcome(
    task.weakness.baselineScore,
    latestScore
  );
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.trainingTask.updateMany({
      where: { id: task.id, status: "IN_PROGRESS" },
      data: {
        status: "COMPLETED",
        retestAnswerId: input.answerId,
        completedAt: new Date()
      }
    });
    if (claimed.count !== 1) return;
    await tx.weakness.update({
      where: { id: task.weaknessId },
      data: { status, latestScore }
    });
    await tx.event.create({
      data: {
        name: analyticsEvents.retestCompleted,
        userId: task.userId,
        sessionId: input.sessionId,
        payload: {
          weaknessId: task.weaknessId,
          trainingTaskId: task.id,
          baselineScore: task.weakness.baselineScore,
          latestScore,
          outcome: status
        }
      }
    });
  });
  await loadWeakness(task.weaknessId);
}

export async function refreshTrainingTaskMemory(trainingTaskId: string) {
  const task = await prisma.trainingTask.findUnique({
    where: { id: trainingTaskId },
    include: { weakness: true }
  });
  if (!task) return;
  await syncTrainingTaskMemory(task.userId, task.weaknessId, task);
  await syncWeaknessMemory(task.weakness);
}

async function loadSessionWeaknesses(sessionId: string): Promise<Weakness[]> {
  const rows = await prisma.weakness.findMany({
    where: { sessionId },
    orderBy: [{ baselineScore: "asc" }, { createdAt: "asc" }],
    include: {
      trainingTasks: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { equivalentQuestion: true }
      }
    },
    take: 3
  });
  return rows.map(mapWeakness);
}

async function loadWeakness(weaknessId: string): Promise<Weakness> {
  const row = await prisma.weakness.findUniqueOrThrow({
    where: { id: weaknessId },
    include: {
      trainingTasks: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { equivalentQuestion: true }
      }
    }
  });
  await syncWeaknessMemory(row);
  const latestTask = row.trainingTasks[0];
  if (latestTask) {
    await syncTrainingTaskMemory(row.userId, row.id, latestTask);
  }
  return mapWeakness(row);
}

async function syncWeaknessMemory(row: {
  id: string;
  userId: string;
  dimension: string;
  title: string;
  evidenceRef: string;
  severity: string;
  status: string;
  baselineScore: number;
  latestScore: number | null;
  dueAt: Date | null;
}) {
  await upsertWorkflowMemory({
    userId: row.userId,
    type: "WEAKNESS",
    sourceRef: `weakness:${row.id}`,
    value: {
      weaknessId: row.id,
      dimension: row.dimension,
      title: row.title,
      severity: row.severity,
      trainingStatus: row.status,
      baselineScore: row.baselineScore,
      latestScore: row.latestScore,
      evidenceRef: row.evidenceRef,
      dueAt: row.dueAt?.toISOString() ?? null
    },
    status:
      row.status === "PROPOSED" ? "PROPOSED" : row.status === "IGNORED" ? "REJECTED" : "CONFIRMED",
    confidence: 1
  });
}

async function syncTrainingTaskMemory(
  userId: string,
  weaknessId: string,
  task: {
    id: string;
    status: string;
    dueAt: Date;
    retestSessionId: string | null;
    retestAnswerId: string | null;
    completedAt: Date | null;
  }
) {
  await upsertWorkflowMemory({
    userId,
    type: "TRAINING_STATE",
    sourceRef: `training-task:${task.id}`,
    value: {
      trainingTaskId: task.id,
      weaknessId,
      trainingStatus: task.status,
      dueAt: task.dueAt.toISOString(),
      retestSessionId: task.retestSessionId,
      retestAnswerId: task.retestAnswerId,
      completedAt: task.completedAt?.toISOString() ?? null
    },
    status: task.status === "CANCELLED" ? "REJECTED" : "CONFIRMED",
    confidence: 1
  });
}

function mapWeakness(row: any): Weakness {
  const latestTask = row.trainingTasks?.[0];
  return {
    id: row.id,
    sessionId: row.sessionId,
    sourceAnswerId: row.sourceAnswerId,
    dimension: row.dimension,
    title: row.title,
    evidenceRef: row.evidenceRef,
    evidenceSummary: row.evidenceSummary,
    severity: row.severity,
    status: row.status,
    baselineScore: row.baselineScore,
    latestScore: row.latestScore ?? undefined,
    dueAt: row.dueAt?.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString(),
    ignoredAt: row.ignoredAt?.toISOString(),
    latestTrainingTask: latestTask ? mapTrainingTask(latestTask) : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function mapTrainingTask(row: any): TrainingTask {
  return {
    id: row.id,
    weaknessId: row.weaknessId,
    status: row.status,
    dueAt: row.dueAt.toISOString(),
    sourceQuestionId: row.sourceQuestionId,
    equivalentQuestion: mapQuestion(row.equivalentQuestion),
    retestSessionId: row.retestSessionId ?? undefined,
    retestAnswerId: row.retestAnswerId ?? undefined,
    completedAt: row.completedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function mapQuestion(row: any): Question {
  return {
    id: row.id,
    module: row.module,
    targetRole: row.targetRole,
    difficulty: row.difficulty,
    prompt: row.prompt,
    expectation: row.expectation ?? undefined,
    keywords: row.keywords ?? [],
    rubricVersionId: row.rubricVersionId ?? undefined
  };
}

function parseDueAt(value: string) {
  const dueAt = new Date(value);
  const now = Date.now();
  if (
    Number.isNaN(dueAt.getTime()) ||
    dueAt.getTime() < now - 60_000 ||
    dueAt.getTime() > now + 365 * 24 * 60 * 60 * 1000
  ) {
    throw new DomainError(
      "复测时间必须在未来一年内。",
      "INVALID_DUE_AT",
      400
    );
  }
  return dueAt;
}
