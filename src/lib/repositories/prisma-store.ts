import { consumeSessionQuota } from "@/lib/domain/usage-service";
import type {
  AiScore,
  AnswerRecord,
  MockSession,
  Question,
  Report
} from "@/lib/domain/types";
import { prisma } from "./prisma-client";
import type { AppDataStore, QuestionFilter, SessionPatch } from "./store";

export const prismaDataStore: AppDataStore = {
  async listQuestions(filter) {
    const recentSessions = filter.userId
      ? await prisma.mockSession.findMany({
          where: { userId: filter.userId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { selectedQuestionIds: true }
        })
      : [];
    const recentlyUsedIds = new Set(
      recentSessions.flatMap((session) => session.selectedQuestionIds)
    );
    const rows = await prisma.questionBank.findMany({
      where: {
        module: filter.module as any,
        targetRole: filter.targetRole,
        difficulty: filter.difficulty as any
      },
      orderBy: { createdAt: "asc" }
    });

    const questions = rows.map(mapQuestion);
    const fresh = questions.filter((question) => !recentlyUsedIds.has(question.id));
    const reused = questions.filter((question) => recentlyUsedIds.has(question.id));
    // Preserve exact module/role/difficulty matching. Recent questions move to
    // the end instead of causing a cross-role or cross-difficulty fallback.
    return [...sortQuestionCandidates(fresh, filter), ...sortQuestionCandidates(reused, filter)];
  },

  async createSession(input, questions) {
    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.mockSession.create({
        data: {
          userId: input.userId,
          resumeId: input.resumeId,
          module: input.module as any,
          targetRole: input.targetRole,
          difficulty: input.difficulty as any,
          status: "IN_PROGRESS",
          questionCount: questions.length,
          currentQuestionIndex: 0,
          selectedQuestionIds: questions.map((question) => question.id),
          followUpRound: 0
        }
      });

      await consumeSessionQuota(tx, input.userId, created.id);
      return created;
    });

    const snapshot = await this.getSession(session.id);
    if (!snapshot) {
      throw new Error("Failed to create session snapshot");
    }
    return snapshot;
  },

  async listSessions(userId) {
    const rows = await prisma.mockSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        answers: { orderBy: { submittedAt: "asc" }, include: { score: true } },
        scores: true,
        report: true
      }
    });
    const questionIds = [...new Set(rows.flatMap((row) => row.selectedQuestionIds))];
    const questionRows = await prisma.questionBank.findMany({
      where: { id: { in: questionIds } }
    });
    const byId = new Map(questionRows.map((question) => [question.id, question]));
    return rows.map((row) =>
      mapSession(
        row,
        row.selectedQuestionIds
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map((question) => mapQuestion(question))
      )
    );
  },

  async getSession(sessionId) {
    const session = await prisma.mockSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: { orderBy: { submittedAt: "asc" }, include: { score: true } },
        scores: true,
        report: true
      }
    });

    if (!session) {
      return null;
    }

    const questionRows = await prisma.questionBank.findMany({
      where: { id: { in: session.selectedQuestionIds } }
    });
    const byId = new Map(questionRows.map((question) => [question.id, question]));
    const questions = session.selectedQuestionIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((question) => mapQuestion(question));

    return mapSession(session, questions);
  },

  async saveAnswer(sessionId, input) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await prisma.answer.upsert({
      where: {
        sessionId_questionId_followUpRound_attemptNo: {
          sessionId,
          questionId: input.questionId,
          followUpRound: session.followUpRound,
          attemptNo: 1
        }
      },
      // A repeated request must never overwrite the original answer.
      update: {},
      create: {
        sessionId,
        questionId: input.questionId,
        content: input.content,
        transcript: input.transcript,
        sttStatus: input.sttStatus,
        followUpRound: session.followUpRound,
        attemptNo: 1,
        attemptKind: "INITIAL"
      }
    });

    const updated = await this.getSession(sessionId);
    if (!updated) {
      throw new Error(`Session not found after answer save: ${sessionId}`);
    }
    return updated;
  },

  async getAnswerContext(answerId) {
    const row = await prisma.answer.findUnique({
      where: { id: answerId },
      include: { question: true, score: true }
    });
    if (!row) {
      return null;
    }

    const session = await this.getSession(row.sessionId);
    if (!session) {
      return null;
    }

    return {
      answer: mapAnswer(row),
      question: mapQuestion(row.question),
      session,
      score: row.score ? mapScore(row.score) : undefined
    };
  },

  async createRetryAttempt(sourceAnswerId, input) {
    const source = await prisma.answer.findUnique({ where: { id: sourceAnswerId } });
    if (!source) {
      throw new Error("Answer attempt not found.");
    }

    const idempotent = await prisma.answer.findUnique({
      where: { idempotencyKey: input.idempotencyKey }
    });
    if (idempotent) {
      if (idempotent.parentAnswerId !== sourceAnswerId) {
        throw new Error("Idempotency key was already used for another retry.");
      }
      return mapAnswer(idempotent);
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const latest = await prisma.answer.aggregate({
        where: {
          sessionId: source.sessionId,
          questionId: source.questionId,
          followUpRound: source.followUpRound
        },
        _max: { attemptNo: true }
      });

      try {
        const created = await prisma.answer.create({
          data: {
            sessionId: source.sessionId,
            questionId: source.questionId,
            content: input.content,
            transcript: input.transcript,
            sttStatus: input.sttStatus,
            followUpRound: source.followUpRound,
            attemptNo: (latest._max.attemptNo ?? 0) + 1,
            attemptKind: "RETRY",
            parentAnswerId: sourceAnswerId,
            idempotencyKey: input.idempotencyKey
          }
        });
        return mapAnswer(created);
      } catch (error) {
        const existing = await prisma.answer.findUnique({
          where: { idempotencyKey: input.idempotencyKey }
        });
        if (existing?.parentAnswerId === sourceAnswerId) {
          return mapAnswer(existing);
        }
        if (!isUniqueConstraintError(error) || attempt === 2) {
          throw error;
        }
      }
    }

    throw new Error("Unable to allocate a retry attempt number.");
  },

  async saveScore(sessionId, answerId, result, rubricVersionId) {
    const score = await prisma.aiScore.upsert({
      where: { answerId },
      update: {
        rubricVersionId,
        starCompleteness: result.dimensions.starCompleteness,
        logicStructure: result.dimensions.logicStructure,
        contentDepth: result.dimensions.contentDepth,
        communication: result.dimensions.communication,
        totalScore: result.totalScore,
        deductions: result.deductions,
        improvements: result.improvements,
        sampleAnswer: result.sampleAnswer,
        reasoning: result.reasoning,
        rawJson: result as any
      },
      create: {
        sessionId,
        answerId,
        rubricVersionId,
        starCompleteness: result.dimensions.starCompleteness,
        logicStructure: result.dimensions.logicStructure,
        contentDepth: result.dimensions.contentDepth,
        communication: result.dimensions.communication,
        totalScore: result.totalScore,
        deductions: result.deductions,
        improvements: result.improvements,
        sampleAnswer: result.sampleAnswer,
        reasoning: result.reasoning,
        rawJson: result as any
      }
    });

    return mapScore(score);
  },

  async updateSession(sessionId, patch) {
    await prisma.mockSession.update({
      where: { id: sessionId },
      data: mapSessionPatch(patch)
    });

    const updated = await this.getSession(sessionId);
    if (!updated) {
      throw new Error(`Session not found after update: ${sessionId}`);
    }
    return updated;
  },

  async appendQuestion(sessionId, questionId) {
    const session = await prisma.mockSession.findUniqueOrThrow({
      where: { id: sessionId }
    });
    await prisma.mockSession.update({
      where: { id: sessionId },
      data: {
        selectedQuestionIds: [
          ...session.selectedQuestionIds.slice(0, session.currentQuestionIndex + 1),
          questionId,
          ...session.selectedQuestionIds.slice(session.currentQuestionIndex + 1)
        ],
        questionCount: session.questionCount + 1
      }
    });
    const updated = await this.getSession(sessionId);
    if (!updated) {
      throw new Error("Session not found after adding follow-up.");
    }
    return updated;
  },

  async saveReport(reportInput) {
    const report = await prisma.report.upsert({
      where: { sessionId: reportInput.sessionId },
      update: {
        summary: reportInput.summary,
        averageScore: reportInput.averageScore,
        dimensionAverages: reportInput.dimensionAverages as any,
        questionFeedback: reportInput.questionFeedback as any,
        nextPracticePlan: reportInput.nextPracticePlan
      },
      create: {
        sessionId: reportInput.sessionId,
        summary: reportInput.summary,
        averageScore: reportInput.averageScore,
        dimensionAverages: reportInput.dimensionAverages as any,
        questionFeedback: reportInput.questionFeedback as any,
        nextPracticePlan: reportInput.nextPracticePlan
      }
    });

    return mapReport(report);
  },

  async getReport(sessionId) {
    const report = await prisma.report.findUnique({ where: { sessionId } });
    return report ? mapReport(report) : null;
  },

  async trackEvent(input) {
    await prisma.event.create({
      data: {
        name: input.name,
        userId: input.userId,
        sessionId: input.sessionId,
        payload: input.payload as any
      }
    });
  }
};

function mapQuestion(row: any): Question {
  return {
    id: row.id,
    module: row.module,
    targetRole: row.targetRole,
    difficulty: row.difficulty,
    prompt: row.prompt,
    expectation: row.expectation ?? undefined,
    keywords: row.keywords ?? [],
    rubricVersionId: row.rubricVersionId ?? undefined,
    retrievalContext: row.retrievalContext ?? undefined
  };
}

function mapAnswer(row: any): AnswerRecord {
  return {
    id: row.id,
    sessionId: row.sessionId,
    questionId: row.questionId,
    content: row.content,
    followUpRound: row.followUpRound,
    attemptNo: row.attemptNo,
    attemptKind: row.attemptKind,
    parentAnswerId: row.parentAnswerId ?? undefined,
    submittedAt: row.submittedAt.toISOString()
  };
}

function mapScore(row: any): AiScore {
  return {
    id: row.id,
    sessionId: row.sessionId,
    answerId: row.answerId,
    rubricVersionId: row.rubricVersionId ?? undefined,
    dimensions: {
      starCompleteness: row.starCompleteness,
      logicStructure: row.logicStructure,
      contentDepth: row.contentDepth,
      communication: row.communication
    },
    totalScore: row.totalScore,
    deductions: row.deductions,
    improvements: row.improvements,
    sampleAnswer: row.sampleAnswer,
    reasoning: row.reasoning,
    rawJson: row.rawJson,
    createdAt: row.createdAt.toISOString()
  };
}

function mapReport(row: any): Report {
  return {
    id: row.id,
    sessionId: row.sessionId,
    summary: row.summary,
    averageScore: row.averageScore,
    dimensionAverages: row.dimensionAverages,
    questionFeedback: row.questionFeedback,
    nextPracticePlan: row.nextPracticePlan,
    createdAt: row.createdAt.toISOString()
  };
}

function mapSession(row: any, questions: Question[]): MockSession {
  return {
    id: row.id,
    userId: row.userId,
    resumeId: row.resumeId ?? undefined,
    module: row.module,
    targetRole: row.targetRole,
    difficulty: row.difficulty,
    status: row.status,
    questionCount: row.questionCount,
    currentQuestionIndex: row.currentQuestionIndex,
    selectedQuestionIds: row.selectedQuestionIds,
    followUpRound: row.followUpRound,
    questions,
    answers: row.answers.map(mapAnswer),
    scores: row.scores.map(mapScore),
    report: row.report ? mapReport(row.report) : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function mapSessionPatch(patch: SessionPatch) {
  return {
    status: patch.status,
    currentQuestionIndex: patch.currentQuestionIndex,
    followUpRound: patch.followUpRound
  };
}

function uniqueQuestions(questions: Question[]) {
  const seen = new Set<string>();
  return questions.filter((question) => {
    if (seen.has(question.id)) {
      return false;
    }
    seen.add(question.id);
    return true;
  });
}

function sortQuestionCandidates(questions: Question[], filter: QuestionFilter) {
  return uniqueQuestions(questions).sort((a, b) => {
    const scoreA = candidateScore(a, filter);
    const scoreB = candidateScore(b, filter);
    return scoreB - scoreA;
  });
}

function candidateScore(question: Question, filter: QuestionFilter) {
  return (
    (question.targetRole === filter.targetRole ? 2 : 0) +
    (question.difficulty === filter.difficulty ? 1 : 0)
  );
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
  );
}
