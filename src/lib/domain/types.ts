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

export type WeaknessDimension =
  | "STAR_COMPLETENESS"
  | "LOGIC_STRUCTURE"
  | "CONTENT_DEPTH"
  | "COMMUNICATION";

export type WeaknessSeverity = "LOW" | "MEDIUM" | "HIGH";

export type WeaknessStatus =
  | "PROPOSED"
  | "CONFIRMED"
  | "IGNORED"
  | "NOT_IMPROVED"
  | "IMPROVING"
  | "PASSED";

export type TrainingTaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type DimensionScores = Record<ScoreDimension, number>;

export type Question = {
  id: string;
  module: InterviewModule;
  targetRole: string;
  difficulty: Difficulty;
  prompt: string;
  expectation?: string;
  keywords?: string[];
  rubricVersionId?: string;
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
  attemptNo: number;
  attemptKind: "INITIAL" | "RETRY" | "RETEST";
  parentAnswerId?: string;
  submittedAt: string;
};

export type AiScore = {
  id: string;
  sessionId: string;
  answerId: string;
  rubricVersionId?: string;
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
  initialAttemptId: string;
  latestAttemptId: string;
  attemptNo: number;
  attemptCount: number;
  rubricVersionId?: string;
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

export type TrainingTask = {
  id: string;
  weaknessId: string;
  status: TrainingTaskStatus;
  dueAt: string;
  sourceQuestionId: string;
  equivalentQuestion: Question;
  retestSessionId?: string;
  retestAnswerId?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Weakness = {
  id: string;
  sessionId: string;
  sourceAnswerId: string;
  dimension: WeaknessDimension;
  title: string;
  evidenceRef: string;
  evidenceSummary: string;
  severity: WeaknessSeverity;
  status: WeaknessStatus;
  baselineScore: number;
  latestScore?: number;
  dueAt?: string;
  confirmedAt?: string;
  ignoredAt?: string;
  latestTrainingTask?: TrainingTask;
  createdAt: string;
  updatedAt: string;
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
  trainingTaskId?: string;
};

export type SubmitAnswerInput = {
  questionId: string;
  content: string;
  transcript?: string;
  sttStatus?: "COMPLETED" | "FAILED" | "NOT_USED";
};

export type RetryAnswerInput = Omit<SubmitAnswerInput, "questionId"> & {
  idempotencyKey: string;
};

export type DimensionDelta = {
  dimension: ScoreDimension;
  before: number;
  after: number;
  delta: number;
};

export type AttemptComparison = {
  sourceAttempt: AnswerRecord;
  retryAttempt: AnswerRecord;
  rubricVersionId: string;
  beforeTotal: number;
  afterTotal: number;
  totalDelta: number;
  dimensionDeltas: DimensionDelta[];
  improvedDimensions: ScoreDimension[];
  adoptedActions: string[];
  unverifiedActions: string[];
  remainingActions: string[];
};

export type AnalyticsEventInput = {
  name: string;
  sessionId?: string;
  userId?: string;
  payload?: Record<string, unknown>;
};
