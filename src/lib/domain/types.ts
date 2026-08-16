export type InterviewModule =
  | "BEHAVIORAL"
  | "CV_RELATED"
  | "TECHNICAL"
  | "MARKET";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type SessionStatus =
  | "CREATED"
  | "IN_PROGRESS"
  | "SCORING"
  | "COMPLETED"
  | "FAILED";

export type UserRole = "USER" | "ADMIN";

export type UserStatus = "ACTIVE" | "SUSPENDED";

export type CurrentUser = {
  id: string;
  email: string;
  name?: string;
  targetRole?: string;
  role: UserRole;
  status: UserStatus;
  planCode: string;
};

export type ScoreDimension =
  | "starCompleteness"
  | "logicStructure"
  | "contentDepth"
  | "communication";

export type DimensionScores = Record<ScoreDimension, number>;

export type Question = {
  id: string;
  module: InterviewModule;
  targetRole: string;
  difficulty: Difficulty;
  prompt: string;
  expectation?: string;
  keywords?: string[];
  retrievalContext?: RagQuestionContext;
};

export type RagQuestionContext = {
  competencyId: string;
  competencyLabel: string;
  evidence: Array<{ text: string; source: string; matchedKeywords: string[] }>;
  expectedSignals: string[];
  researchSources: string[];
  knowledgeEvidence?: Array<{
    id: string;
    titleZh: string;
    titleEn: string;
    sourceUrl: string;
    score: number;
  }>;
  webEvidence?: Array<{
    title: string;
    url: string;
    snippet: string;
    publishedAt?: string;
    retrievedAt: string;
  }>;
};

export type ResumeProject = {
  name: string;
  description: string;
  technologies: string[];
};

export type ResumeProfile = {
  id: string;
  fileName: string;
  mimeType: string;
  summary?: string;
  companies: string[];
  roles: string[];
  skills: string[];
  projects: ResumeProject[];
  education: string[];
  createdAt: string;
  retentionExpiresAt?: string;
};

export type AnswerRecord = {
  id: string;
  sessionId: string;
  questionId: string;
  content: string;
  followUpRound: number;
  submittedAt: string;
};

export type AiScore = {
  id: string;
  sessionId: string;
  answerId: string;
  dimensions: DimensionScores;
  totalScore: number;
  deductions: string[];
  improvements: string[];
  sampleAnswer: string;
  reasoning: string;
  rawJson: unknown;
  createdAt: string;
};

export type ReportQuestionFeedback = {
  questionId: string;
  prompt: string;
  answer: string;
  totalScore: number;
  dimensions: DimensionScores;
  deductions: string[];
  improvements: string[];
  sampleAnswer: string;
};

export type Report = {
  id: string;
  sessionId: string;
  summary: string;
  averageScore: number;
  dimensionAverages: DimensionScores;
  questionFeedback: ReportQuestionFeedback[];
  nextPracticePlan: string[];
  createdAt: string;
};

export type MockSession = {
  id: string;
  userId: string;
  resumeId?: string;
  module: InterviewModule;
  targetRole: string;
  difficulty: Difficulty;
  status: SessionStatus;
  questionCount: number;
  currentQuestionIndex: number;
  selectedQuestionIds: string[];
  followUpRound: number;
  questions: Question[];
  answers: AnswerRecord[];
  scores: AiScore[];
  report?: Report;
  createdAt: string;
  updatedAt: string;
};

export type CreateSessionInput = {
  userId: string;
  module: InterviewModule;
  targetRole: string;
  difficulty: Difficulty;
  questionCount: number;
  resumeId?: string;
};

export type SubmitAnswerInput = {
  questionId: string;
  content: string;
  transcript?: string;
  sttStatus?: "COMPLETED" | "FAILED" | "NOT_USED";
};

export type AnalyticsEventInput = {
  name: string;
  sessionId?: string;
  userId?: string;
  payload?: Record<string, unknown>;
};
