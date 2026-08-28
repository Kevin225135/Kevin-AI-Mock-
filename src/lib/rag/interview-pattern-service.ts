import { createHash } from "node:crypto";
import type { Difficulty, InterviewModule } from "@/lib/domain/types";
import { isSafeRetrievedContent } from "@/lib/ai/safety";

export type InterviewPatternInput = {
  question: string;
  sourceTitle: string;
  sourceUrl?: string;
  collectionMethod: string;
  rightsStatus:
    | "INTERNAL"
    | "LICENSED"
    | "PUBLIC_DOMAIN"
    | "PERMISSION_GRANTED"
    | "RESTRICTED"
    | "UNKNOWN";
  roleTags: string[];
  competencyTags: string[];
  qualityScore: number;
};

export type InterviewPatternIngestInput = InterviewPatternInput & {
  externalId: string;
  answerGuidance?: string;
  module: InterviewModule;
  difficulty: Difficulty;
  companyTags?: string[];
  projectKeywords?: string[];
  sourceUpdatedAt?: string;
  publish?: boolean;
};

export function computePatternDedupeHash(question: string) {
  const canonical = question
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, "")
    .trim();
  return createHash("sha256").update(canonical).digest("hex");
}

export function evaluatePatternQuality(input: InterviewPatternInput) {
  const reasons: string[] = [];
  if (input.question.trim().length < 12) reasons.push("QUESTION_TOO_SHORT");
  if (!input.sourceTitle.trim()) reasons.push("SOURCE_MISSING");
  if (!input.collectionMethod.trim()) reasons.push("COLLECTION_METHOD_MISSING");
  if (!input.roleTags.length) reasons.push("ROLE_TAG_MISSING");
  if (!input.competencyTags.length) reasons.push("COMPETENCY_TAG_MISSING");
  if (input.rightsStatus === "RESTRICTED" || input.rightsStatus === "UNKNOWN") {
    reasons.push("RIGHTS_NOT_USABLE");
  }
  if (input.qualityScore < 0.7) reasons.push("QUALITY_BELOW_THRESHOLD");
  if (input.qualityScore > 1) reasons.push("QUALITY_SCORE_OUT_OF_RANGE");
  if (!isSafeRetrievedContent(input.question)) reasons.push("PROMPT_INJECTION");
  return { publishable: reasons.length === 0, reasons };
}

export async function ingestInterviewPattern(input: InterviewPatternIngestInput) {
  const { prisma } = await import("@/lib/repositories/prisma-client");
  const quality = evaluatePatternQuality(input);
  const dedupeHash = computePatternDedupeHash(input.question);
  const sourceUpdatedAt = input.sourceUpdatedAt ? new Date(input.sourceUpdatedAt) : null;
  const shouldPublish = quality.publishable && input.publish === true;
  const patternData = {
    question: input.question.trim(),
    answerGuidance: input.answerGuidance?.trim() || null,
    module: input.module,
    difficulty: input.difficulty,
    companyTags: input.companyTags ?? [],
    roleTags: input.roleTags,
    competencyTags: input.competencyTags,
    projectKeywords: input.projectKeywords ?? [],
    sourceTitle: input.sourceTitle.trim(),
    sourceUrl: input.sourceUrl?.trim() || null,
    collectionMethod: input.collectionMethod.trim(),
    rightsStatus: input.rightsStatus,
    dedupeHash,
    qualityStatus: quality.publishable
      ? shouldPublish
        ? ("APPROVED" as const)
        : ("REVIEW" as const)
      : ("REJECTED" as const),
    qualityScore: input.qualityScore,
    qualityReasons: quality.reasons,
    sourceUpdatedAt,
    lastReviewedAt: new Date(),
    isPublished: shouldPublish
  };

  return prisma.$transaction(async (tx) => {
    const [sameHash, sameExternalId] = await Promise.all([
      tx.interviewPattern.findUnique({ where: { dedupeHash } }),
      tx.interviewPattern.findUnique({
        where: { externalId: input.externalId }
      })
    ]);

    if (sameHash && sameHash.id !== sameExternalId?.id) {
      const audit = await tx.interviewPatternIngestion.create({
        data: {
          patternId: sameHash.id,
          externalId: input.externalId,
          dedupeHash,
          outcome: "DUPLICATE",
          reasons: ["DUPLICATE_HASH"],
          sourceTitle: input.sourceTitle,
          sourceUrl: input.sourceUrl,
          collectionMethod: input.collectionMethod,
          rightsStatus: input.rightsStatus
        }
      });
      return { pattern: sameHash, audit, accepted: false, duplicate: true };
    }

    const pattern = sameExternalId
      ? await tx.interviewPattern.update({
          where: { id: sameExternalId.id },
          data: patternData
        })
      : await tx.interviewPattern.create({
          data: { externalId: input.externalId, ...patternData }
        });
    const audit = await tx.interviewPatternIngestion.create({
      data: {
        patternId: pattern.id,
        externalId: input.externalId,
        dedupeHash,
        outcome: sameExternalId ? "UPDATED" : quality.publishable ? "ACCEPTED" : "REJECTED",
        reasons: quality.reasons,
        sourceTitle: input.sourceTitle,
        sourceUrl: input.sourceUrl,
        collectionMethod: input.collectionMethod,
        rightsStatus: input.rightsStatus
      }
    });
    return {
      pattern,
      audit,
      accepted: quality.publishable,
      duplicate: false
    };
  });
}

export async function retrieveInterviewPatterns(input: {
  query: string;
  module?: InterviewModule;
  difficulty?: Difficulty;
  company?: string;
  targetRole?: string;
  competency?: string;
  projectKeyword?: string;
  limit?: number;
}) {
  const { prisma } = await import("@/lib/repositories/prisma-client");
  const rows = await prisma.interviewPattern.findMany({
    where: {
      isPublished: true,
      qualityStatus: "APPROVED",
      rightsStatus: {
        in: ["INTERNAL", "LICENSED", "PUBLIC_DOMAIN", "PERMISSION_GRANTED"]
      },
      ...(input.module ? { module: input.module } : {}),
      ...(input.difficulty ? { difficulty: input.difficulty } : {}),
      ...(input.company ? { companyTags: { has: input.company } } : {}),
      ...(input.targetRole ? { roleTags: { has: input.targetRole } } : {}),
      ...(input.competency ? { competencyTags: { has: input.competency } } : {}),
      ...(input.projectKeyword ? { projectKeywords: { has: input.projectKeyword } } : {})
    },
    orderBy: [{ qualityScore: "desc" }, { updatedAt: "desc" }],
    take: 200
  });
  const terms = tokenize(input.query);
  const safe = rows.filter((row) => isSafeRetrievedContent(row.question));
  const selected = safe
    .map((row) => {
      const haystack = tokenize(
        [
          row.question,
          row.answerGuidance,
          ...row.companyTags,
          ...row.roleTags,
          ...row.competencyTags,
          ...row.projectKeywords
        ]
          .filter(Boolean)
          .join(" ")
      );
      const lexical = terms.length
        ? terms.filter((term) => haystack.includes(term)).length / terms.length
        : 0;
      const score = Math.round((lexical * 0.65 + row.qualityScore * 0.35) * 1000) / 1000;
      return {
        id: row.id,
        question: row.question,
        answerGuidance: row.answerGuidance ?? undefined,
        module: row.module,
        difficulty: row.difficulty,
        companyTags: row.companyTags,
        roleTags: row.roleTags,
        competencyTags: row.competencyTags,
        sourceTitle: row.sourceTitle,
        sourceUrl: row.sourceUrl ?? undefined,
        rightsStatus: row.rightsStatus,
        qualityStatus: row.qualityStatus,
        qualityScore: row.qualityScore,
        score,
        updatedAt: row.updatedAt.toISOString()
      };
    })
    .filter((row) => !terms.length || row.score > row.qualityScore * 0.35)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.min(Math.max(input.limit ?? 5, 1), 20));

  return {
    candidates: rows.length,
    excludedUnsafe: rows.length - safe.length,
    selected,
    degraded: selected.length === 0,
    degradationReason: selected.length === 0 ? "INTERVIEW_PATTERN_ZERO_RECALL" : undefined
  };
}

function tokenize(value: string) {
  const normalized = value.toLowerCase().normalize("NFKC");
  const chinese = normalized.match(/[\u3400-\u9fff]+/g) ?? [];
  const words = normalized.match(/[a-z0-9][a-z0-9.+#/-]*/g) ?? [];
  return [
    ...words,
    ...chinese.flatMap((run) =>
      run.length < 2
        ? [run]
        : Array.from({ length: run.length - 1 }, (_, index) => run.slice(index, index + 2))
    )
  ];
}
