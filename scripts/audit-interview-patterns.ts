import { PrismaClient } from "@prisma/client";
import { evaluatePatternQuality } from "../src/lib/rag/interview-pattern-service";

const prisma = new PrismaClient();

async function main() {
  const [rows, ingestionAudits] = await Promise.all([
    prisma.interviewPattern.findMany(),
    prisma.interviewPatternIngestion.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000
    })
  ]);
  const invalidPublished = rows
    .filter((row) => row.isPublished)
    .map((row) => {
      const evaluated = evaluatePatternQuality({
        question: row.question,
        sourceTitle: row.sourceTitle,
        sourceUrl: row.sourceUrl ?? undefined,
        collectionMethod: row.collectionMethod,
        rightsStatus: row.rightsStatus,
        roleTags: row.roleTags,
        competencyTags: row.competencyTags,
        qualityScore: row.qualityScore
      });
      const reasons = [
        ...evaluated.reasons,
        ...(row.qualityStatus === "APPROVED" ? [] : ["STATUS_NOT_APPROVED"])
      ];
      return {
        id: row.id,
        externalId: row.externalId,
        publishable: reasons.length === 0,
        reasons
      };
    })
    .filter((row) => !row.publishable);
  const report = {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    published: rows.filter((row) => row.isPublished).length,
    byRights: countBy(rows.map((row) => row.rightsStatus)),
    byQuality: countBy(rows.map((row) => row.qualityStatus)),
    ingestionOutcomes: countBy(ingestionAudits.map((row) => row.outcome)),
    ingestionReasons: countBy(ingestionAudits.flatMap((row) => row.reasons)),
    missingSource: rows.filter((row) => !row.sourceTitle.trim()).length,
    missingRoleTags: rows.filter((row) => !row.roleTags.length).length,
    missingCompetencyTags: rows.filter((row) => !row.competencyTags.length).length,
    recordsWithQualityReasons: rows.filter((row) => row.qualityReasons.length > 0).length,
    invalidPublished
  };
  console.log(JSON.stringify(report, null, 2));
  if (invalidPublished.length > 0) process.exitCode = 1;
}

function countBy(values: string[]) {
  return Object.fromEntries(
    [...new Set(values)]
      .sort()
      .map((value) => [value, values.filter((candidate) => candidate === value).length])
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
