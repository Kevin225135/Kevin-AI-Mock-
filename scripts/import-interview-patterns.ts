import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { ingestInterviewPattern } from "../src/lib/rag/interview-pattern-service";
import { prisma } from "../src/lib/repositories/prisma-client";

const rowSchema = z.object({
  externalId: z.string().min(1).max(160),
  question: z.string().min(1).max(4000),
  answerGuidance: z.string().max(8000).optional(),
  module: z.enum(["BEHAVIORAL", "CV_RELATED", "TECHNICAL", "MARKET"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  companyTags: z.array(z.string().min(1).max(100)).max(30).optional(),
  roleTags: z.array(z.string().min(1).max(100)).min(1).max(30),
  competencyTags: z.array(z.string().min(1).max(100)).min(1).max(30),
  projectKeywords: z.array(z.string().min(1).max(100)).max(30).optional(),
  sourceTitle: z.string().min(1).max(300),
  sourceUrl: z.string().url().or(z.string().startsWith("internal://")).optional(),
  collectionMethod: z.string().min(1).max(100),
  rightsStatus: z.enum([
    "INTERNAL",
    "LICENSED",
    "PUBLIC_DOMAIN",
    "PERMISSION_GRANTED",
    "RESTRICTED",
    "UNKNOWN"
  ]),
  qualityScore: z.number().min(0).max(1),
  sourceUpdatedAt: z.string().datetime({ offset: true }).optional(),
  publish: z.boolean().optional()
});

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("Usage: npm run patterns:import -- <patterns.json>");
  }
  const parsedJson = JSON.parse(await readFile(resolve(inputPath), "utf8"));
  const rows = z.array(rowSchema).min(1).parse(parsedJson);
  const results = [];
  for (const row of rows) {
    const result = await ingestInterviewPattern(row);
    results.push({
      externalId: row.externalId,
      patternId: result.pattern.id,
      outcome: result.audit.outcome,
      reasons: result.audit.reasons,
      published: result.pattern.isPublished
    });
  }
  console.log(JSON.stringify({ importedAt: new Date().toISOString(), results }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
