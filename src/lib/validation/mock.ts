import { z } from "zod";

export const createSessionSchema = z.object({
  userId: z.string().min(1).optional(),
  module: z.enum(["BEHAVIORAL", "CV_RELATED", "TECHNICAL", "MARKET"]),
  targetRole: z.string().min(2).max(80),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  questionCount: z.coerce.number().int().min(1).max(4).default(3)
});

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  content: z.string().min(20, "Answer must contain at least 20 characters.")
});

export const eventSchema = z.object({
  name: z.string().min(2),
  sessionId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  payload: z.record(z.unknown()).optional()
});
