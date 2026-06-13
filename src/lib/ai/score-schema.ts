import { z } from "zod";

export const aiScoreSchema = z.object({
  dimensions: z.object({
    starCompleteness: z.number().int().min(1).max(5),
    logicStructure: z.number().int().min(1).max(5),
    contentDepth: z.number().int().min(1).max(5),
    communication: z.number().int().min(1).max(5)
  }),
  totalScore: z.number().int().min(0).max(100),
  deductions: z.array(z.string().min(3)).min(1),
  improvements: z.array(z.string().min(3)).min(1),
  sampleAnswer: z.string().min(40),
  reasoning: z.string().min(10)
});

export type AiScoreResult = z.infer<typeof aiScoreSchema>;

export function parseAiScore(payload: unknown): AiScoreResult {
  return aiScoreSchema.parse(payload);
}
