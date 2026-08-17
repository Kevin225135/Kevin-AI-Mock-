import { z } from "zod";
import {
  DEFAULT_MOCK_QUESTIONS,
  MAX_MOCK_QUESTIONS,
  MIN_MOCK_QUESTIONS
} from "@/lib/domain/constants";

export const createSessionSchema = z.object({
  module: z.enum(["BEHAVIORAL", "CV_RELATED", "TECHNICAL", "MARKET"]),
  targetRole: z.string().min(2).max(80),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  questionCount: z.coerce.number().int()
    .min(MIN_MOCK_QUESTIONS)
    .max(MAX_MOCK_QUESTIONS)
    .default(DEFAULT_MOCK_QUESTIONS),
  resumeId: z.string().min(1).optional()
});

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  content: z.string().min(20, "Answer must contain at least 20 characters."),
  transcript: z.string().max(20000).optional(),
  sttStatus: z.enum(["COMPLETED", "FAILED", "NOT_USED"]).optional()
});

export const retryAnswerSchema = submitAnswerSchema.omit({ questionId: true });

export const weaknessActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("CONFIRM"),
    dueAt: z.string().datetime({ offset: true })
  }),
  z.object({ action: z.literal("IGNORE") })
]);

export const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

const eventPayloadSchema = z
  .record(z.unknown())
  .refine((value) => JSON.stringify(value).length <= 4000, "Event payload is too large.");

export const eventSchema = z.object({
  name: z.enum([
    "mock_start",
    "question_answered",
    "score_generated",
    "report_view",
    "mock_complete",
    "seven_day_return",
    "report_feedback_submit",
    "badcase_report",
    "score_retry_click",
    "retry_started",
    "retry_completed",
    "feedback_adopted",
    "plan_created",
    "retest_completed"
  ]),
  sessionId: z.string().min(1).optional(),
  payload: eventPayloadSchema.optional()
});
