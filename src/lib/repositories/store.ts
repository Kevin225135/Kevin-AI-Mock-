import type {
  AiScore,
  AnalyticsEventInput,
  CreateSessionInput,
  Difficulty,
  InterviewModule,
  MockSession,
  Question,
  Report,
  SessionStatus,
  SubmitAnswerInput
} from "@/lib/domain/types";
import type { AiScoreResult } from "@/lib/ai/score-schema";

export type QuestionFilter = {
  module: InterviewModule;
  targetRole: string;
  difficulty: Difficulty;
};

export type SessionPatch = Partial<{
  status: SessionStatus;
  currentQuestionIndex: number;
  followUpRound: number;
}>;

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
  saveScore(
    sessionId: string,
    answerId: string,
    result: AiScoreResult
  ): Promise<AiScore>;
  updateSession(
    sessionId: string,
    patch: SessionPatch
  ): Promise<MockSession>;
  saveReport(report: Omit<Report, "id" | "createdAt">): Promise<Report>;
  getReport(sessionId: string): Promise<Report | null>;
  trackEvent(input: AnalyticsEventInput): Promise<void>;
}
