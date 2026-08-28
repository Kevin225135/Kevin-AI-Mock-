import type {
  AiScore,
  AnswerRecord,
  AnalyticsEventInput,
  CreateSessionInput,
  Difficulty,
  InterviewModule,
  MockSession,
  Question,
  Report,
  RetryAnswerInput,
  SessionStatus,
  SubmitAnswerInput
} from "@/lib/domain/types";
import type { AiScoreResult } from "@/lib/ai/score-schema";

export type QuestionFilter = {
  module: InterviewModule;
  targetRole: string;
  difficulty: Difficulty;
  userId?: string;
};

export type SessionPatch = Partial<{
  status: SessionStatus;
  currentQuestionIndex: number;
  followUpRound: number;
}>;

export type AnswerAttemptContext = {
  answer: AnswerRecord;
  question: Question;
  session: MockSession;
  score?: AiScore;
};

export interface AppDataStore {
  listQuestions(filter: QuestionFilter): Promise<Question[]>;
  createSession(
    input: CreateSessionInput,
    questions: Question[]
  ): Promise<MockSession>;
  listSessions(userId: string): Promise<MockSession[]>;
  getSession(sessionId: string): Promise<MockSession | null>;
  saveAnswer(
    sessionId: string,
    input: SubmitAnswerInput
  ): Promise<MockSession>;
  getAnswerContext(answerId: string): Promise<AnswerAttemptContext | null>;
  createRetryAttempt(
    sourceAnswerId: string,
    input: RetryAnswerInput
  ): Promise<AnswerRecord>;
  saveScore(
    sessionId: string,
    answerId: string,
    result: AiScoreResult,
    rubricVersionId?: string
  ): Promise<AiScore>;
  updateSession(
    sessionId: string,
    patch: SessionPatch
  ): Promise<MockSession>;
  appendQuestion(sessionId: string, questionId: string): Promise<MockSession>;
  saveReport(report: Omit<Report, "id" | "createdAt">): Promise<Report>;
  getReport(sessionId: string): Promise<Report | null>;
  trackEvent(input: AnalyticsEventInput): Promise<void>;
}
