import { questionBank } from "@/lib/data/questions";
import type {
  AiScore,
  AnalyticsEventInput,
  AnswerRecord,
  MockSession,
  Question,
  Report
} from "@/lib/domain/types";
import type { AppDataStore, QuestionFilter } from "./store";

type MemoryState = {
  sessions: Map<string, MockSession>;
  reports: Map<string, Report>;
  events: AnalyticsEventInput[];
};

const globalForMemory = globalThis as unknown as {
  aiMockMemoryState?: MemoryState;
};

const memoryState =
  globalForMemory.aiMockMemoryState ??
  {
    sessions: new Map<string, MockSession>(),
    reports: new Map<string, Report>(),
    events: []
  };

globalForMemory.aiMockMemoryState = memoryState;

const { sessions, reports, events } = memoryState;

export const memoryDataStore: AppDataStore = {
  async listQuestions(filter) {
    return selectQuestionCandidates(filter);
  },

  async createSession(input, questions) {
    const timestamp = now();
    const session: MockSession = {
      id: makeId("session"),
      userId: input.userId,
      module: input.module,
      targetRole: input.targetRole,
      difficulty: input.difficulty,
      status: "IN_PROGRESS",
      questionCount: questions.length,
      currentQuestionIndex: 0,
      selectedQuestionIds: questions.map((question) => question.id),
      followUpRound: 0,
      questions,
      answers: [],
      scores: [],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    sessions.set(session.id, session);
    return clone(session);
  },

  async getSession(sessionId) {
    const session = sessions.get(sessionId);
    return session ? clone(session) : null;
  },

  async saveAnswer(sessionId, input) {
    const session = requireSession(sessionId);
    const timestamp = now();
    const existingIndex = session.answers.findIndex(
      (answer) =>
        answer.questionId === input.questionId &&
        answer.followUpRound === session.followUpRound
    );
    const answer: AnswerRecord = {
      id: existingIndex >= 0 ? session.answers[existingIndex].id : makeId("answer"),
      sessionId,
      questionId: input.questionId,
      content: input.content,
      followUpRound: session.followUpRound,
      submittedAt: timestamp
    };

    if (existingIndex >= 0) {
      session.answers[existingIndex] = answer;
    } else {
      session.answers.push(answer);
    }

    session.updatedAt = timestamp;
    sessions.set(sessionId, session);
    return clone(session);
  },

  async saveScore(sessionId, answerId, result) {
    const session = requireSession(sessionId);
    const timestamp = now();
    const existingIndex = session.scores.findIndex(
      (score) => score.answerId === answerId
    );
    const score: AiScore = {
      id: existingIndex >= 0 ? session.scores[existingIndex].id : makeId("score"),
      sessionId,
      answerId,
      dimensions: result.dimensions,
      totalScore: result.totalScore,
      deductions: result.deductions,
      improvements: result.improvements,
      sampleAnswer: result.sampleAnswer,
      reasoning: result.reasoning,
      rawJson: result,
      createdAt: timestamp
    };

    if (existingIndex >= 0) {
      session.scores[existingIndex] = score;
    } else {
      session.scores.push(score);
    }

    session.updatedAt = timestamp;
    sessions.set(sessionId, session);
    return clone(score);
  },

  async updateSession(sessionId, patch) {
    const session = requireSession(sessionId);
    const updated: MockSession = {
      ...session,
      ...patch,
      updatedAt: now()
    };
    sessions.set(sessionId, updated);
    return clone(updated);
  },

  async saveReport(reportInput) {
    const report: Report = {
      ...reportInput,
      id: makeId("report"),
      createdAt: now()
    };
    reports.set(report.sessionId, report);

    const session = requireSession(report.sessionId);
    sessions.set(report.sessionId, {
      ...session,
      report,
      updatedAt: now()
    });

    return clone(report);
  },

  async getReport(sessionId) {
    const report = reports.get(sessionId) ?? sessions.get(sessionId)?.report;
    return report ? clone(report) : null;
  },

  async trackEvent(input) {
    events.push({
      ...input,
      payload: {
        ...input.payload,
        trackedAt: now()
      }
    });
  }
};

function selectQuestionCandidates(filter: QuestionFilter) {
  const exact = questionBank.filter(
    (question) =>
      question.module === filter.module &&
      question.targetRole === filter.targetRole &&
      question.difficulty === filter.difficulty
  );
  const sameRole = questionBank.filter(
    (question) =>
      question.module === filter.module && question.targetRole === filter.targetRole
  );
  const sameDifficulty = questionBank.filter(
    (question) =>
      question.module === filter.module && question.difficulty === filter.difficulty
  );
  const sameModule = questionBank.filter(
    (question) => question.module === filter.module
  );

  return uniqueQuestions([...exact, ...sameRole, ...sameDifficulty, ...sameModule]);
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

function requireSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  return session;
}

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function now() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
