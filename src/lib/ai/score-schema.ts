import { z } from "zod";

const oneToFiveScoreSchema = z.preprocess(
  coerceNumber,
  z.number().int().min(1).max(5)
);
const totalScoreSchema = z.preprocess(
  coerceNumber,
  z.number().int().min(0).max(100)
);
const stringArraySchema = z.preprocess(
  normalizeStringArray,
  z.array(z.string().min(3)).min(1)
);

export const aiScoreSchema = z.object({
  dimensions: z.object({
    starCompleteness: oneToFiveScoreSchema,
    logicStructure: oneToFiveScoreSchema,
    contentDepth: oneToFiveScoreSchema,
    communication: oneToFiveScoreSchema
  }),
  totalScore: totalScoreSchema,
  deductions: stringArraySchema,
  improvements: stringArraySchema,
  sampleAnswer: z.string().min(40),
  reasoning: z.string().min(10)
});

export type AiScoreResult = z.infer<typeof aiScoreSchema>;

export function parseAiScore(payload: unknown): AiScoreResult {
  return aiScoreSchema.parse(payload);
}

function coerceNumber(value: unknown) {
  if (typeof value === "string" && value.trim() !== "") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.round(numeric) : value;
  }
  if (typeof value === "number") {
    return Math.round(value);
  }
  return value;
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyArrayItem(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const parsed = parseJsonArray(trimmed);
  if (parsed) {
    return normalizeStringArray(parsed);
  }

  return splitListString(trimmed);
}

function stringifyArrayItem(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function parseJsonArray(value: string) {
  if (!value.startsWith("[")) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function splitListString(value: string) {
  const parts = value
    .split(/\n+|[;；]/)
    .map((part) => part.replace(/^[-*•\s\d.、)）]+/, "").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : [value];
}
