import { PrismaClient } from "@prisma/client";
import type {
  AiScore,
  AnswerRecord,
  MockSession,
  Question,
  Report
} from "@/lib/domain/types";
import type { AppDataStore, QuestionFilter, SessionPatch } from "./store";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const prismaDataStore: AppDataStore = {
  async listQuestions(filter) {
    const rows = await prisma.questionBank.findMany({
      where: {
        module: filter.module as any
      },
      orderBy: [{ targetRole: "asc" }, { difficulty: "asc" }, { createdAt: "asc" }]
    });

    return sortQuestionCandidates(rows.map(mapQuestion), filter);
  },

  async createSession(input, questions) {
    const session = await prisma.mockSession.create({
      data: {
        userId: input.userId,
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

    const snapshot = await this.getSession(session.id);
    if (!snapshot) {
      throw new Error("Failed to create session snapshot");
    }
    return snapshot;
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
        sessionId_questionId_followUpRound: {
          sessionId,
          questionId: input.questionId,
          followUpRound: session.followUpRound
        }
      },
      update: { content: input.content },
      create: {
        sessionId,
        questionId: input.questionId,
        content: input.content,
        followUpRound: session.followUpRound
      }
    });

    const updated = await this.getSession(sessionId);
    if (!updated) {
      throw new Error(`Session not found after answer save: ${sessionId}`);
    }
    return updated;
  },

  async saveScore(sessionId, answerId, result) {
    const score = await prisma.aiScore.upsert({
      where: { answerId },
      update: {
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
    expectation: row.expectation ?? undefined
  };
}

function mapAnswer(row: any): AnswerRecord {
  return {
    id: row.id,
    sessionId: row.sessionId,
    questionId: row.questionId,
    content: row.content,
    followUpRound: row.followUpRound,
    submittedAt: row.submittedAt.toISOString()
  };
}

function mapScore(row: any): AiScore {
  return {
    id: row.id,
    sessionId: row.sessionId,
    answerId: row.answerId,
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
    userId: row.userId ?? undefined,
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
