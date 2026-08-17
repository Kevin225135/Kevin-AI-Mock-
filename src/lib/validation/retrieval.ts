import { z } from "zod";

export const dualDomainRetrievalSchema = z.object({
  query: z.string().trim().min(2).max(500),
  module: z.enum(["BEHAVIORAL", "CV_RELATED", "TECHNICAL", "MARKET"]).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  company: z.string().trim().min(1).max(100).optional(),
  targetRole: z.string().trim().min(2).max(100).optional(),
  competency: z.string().trim().min(1).max(100).optional(),
  projectKeyword: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5)
});
