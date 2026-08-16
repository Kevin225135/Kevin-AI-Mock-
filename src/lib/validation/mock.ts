import { z } from "zod";

export const createSessionSchema = z.object({
  module: z.enum(["BEHAVIORAL", "CV_RELATED", "TECHNICAL", "MARKET"]),
  targetRole: z.string().min(2).max(80),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  questionCount: z.coerce.number().int().min(1).max(4).default(3),
  resumeId: z.string().min(1).optional()
});

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  content: z.string().min(20, "Answer must contain at least 20 characters."),
  transcript: z.string().max(20000).optional(),
  sttStatus: z.enum(["COMPLETED", "FAILED", "NOT_USED"]).optional()
});

export const retryAnswerSchema = submitAnswerSchema.omit({ questionId: true });

export const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

export const eventSchema = z.object({
  name: z.string().min(2),
  sessionId: z.string().min(1).optional(),
  payload: z.record(z.unknown()).optional()
});
