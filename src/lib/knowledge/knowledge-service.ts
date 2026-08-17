import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/repositories/prisma-client";
import { embedQuery } from "./embedding-provider";
import {
  buildEmbeddingText,
  rankHybridCandidates,
  tokenizeKnowledgeQuery
} from "./hybrid-ranking";
import { rerankKnowledge } from "./reranker";
import { freshnessScore, isFresh } from "./source-quality";

export type KnowledgeDomain = "INVESTMENT_BANKING" | "AI_PRODUCT_MANAGER";
const DEFAULT_CANDIDATE_LIMIT = 60;

export async function searchKnowledge(input: {
  query?: string;
  domain?: KnowledgeDomain;
  categoryPrefix?: string;
  limit?: number;
  minSourceAuthority?: number;
  freshnessDays?: number;
}) {
  const query = input.query?.trim() ?? "";
  const now = new Date();
  const rows = (await prisma.knowledgeEntry.findMany({
    where: {
      isPublished: true,
      sourceAuthority: { gte: input.minSourceAuthority ?? 0 },
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
      ...(input.domain ? { domain: input.domain } : {}),
      ...(input.categoryPrefix ? { category: { startsWith: input.categoryPrefix } } : {})
    },
    orderBy: [{ sourceAuthority: "desc" }, { updatedAt: "desc" }]
  })).filter((row) => isFresh({ ...row, freshnessDays: input.freshnessDays, now }));

  if (!query) {
    return rows.slice(0, clampLimit(input.limit)).map((row) => formatResult(row, {
      vectorScore: 0,
      keywordScore: 0,
      lexicalRank: null,
      semanticRank: null,
      fusedScore: 1,
      rerankScore: 1,
      finalScore: 1,
      retrievalMode: "browse",
      embeddingModel: row.embeddingModel,
      embeddingProvider: "stored",
      rerankProvider: "none",
      degraded: false
    }));
  }

  const [embedding, lexicalMatches] = await Promise.all([
    embedQuery(query),
    searchLexically(query, input)
  ]);
  const queryVector = embedding.vectors[0] ?? [];
  const lexicalRanks = new Map(lexicalMatches.map((item, index) => [item.id, index + 1]));
  const initial = rankHybridCandidates({
    query,
    queryVector,
    queryEmbeddingModel: embedding.model,
    candidates: rows,
    lexicalRanks,
    candidateLimit: DEFAULT_CANDIDATE_LIMIT
  });
  const reranked = await rerankKnowledge(query, initial.map((item) => ({
    id: item.row.id,
    document: buildEmbeddingText(item.row),
    fusedScore: item.fusedScore,
    sourceAuthority: item.row.sourceAuthority,
    freshnessScore: freshnessScore({ ...item.row, now })
  })));

  return initial
    .map((item) => {
      const rerankScore = reranked.scores.get(item.row.id) ?? 0;
      const qualityScore =
        (item.row.sourceAuthority / 100) * 0.04 +
        freshnessScore({ ...item.row, now }) * 0.02;
      return { ...item, rerankScore, finalScore: rerankScore + qualityScore };
    })
    .sort((left, right) =>
      right.finalScore - left.finalScore ||
      right.row.sourceAuthority - left.row.sourceAuthority ||
      left.row.id.localeCompare(right.row.id))
    .slice(0, clampLimit(input.limit))
    .map((item) => formatResult(item.row, {
      vectorScore: item.vectorScore,
      keywordScore: item.keywordScore,
      lexicalRank: item.lexicalRank,
      semanticRank: item.semanticRank,
      fusedScore: item.fusedScore,
      rerankScore: item.rerankScore,
      finalScore: item.finalScore,
      retrievalMode: "hybrid",
      embeddingModel: embedding.model,
      embeddingProvider: embedding.provider,
      rerankProvider: reranked.provider,
      degraded: embedding.degraded || reranked.degraded
    }));
}

export async function countKnowledge(input: {
  domain?: KnowledgeDomain;
  categoryPrefix?: string;
}) {
  return prisma.knowledgeEntry.count({
    where: {
      isPublished: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      ...(input.domain ? { domain: input.domain } : {}),
      ...(input.categoryPrefix ? { category: { startsWith: input.categoryPrefix } } : {})
    }
  });
}

async function searchLexically(
  query: string,
  input: { domain?: KnowledgeDomain; categoryPrefix?: string }
) {
  const tsQuery = tokenizeKnowledgeQuery(query)
    .slice(0, 24)
    .map((term) => `${term.replace(/[^a-z0-9\u3400-\u9fff.+#/-]/gi, "")}:*`)
    .filter((term) => term !== ":*")
    .join(" | ");
  if (!tsQuery) return [] as Array<{ id: string; rank: number }>;
  const domainFilter = input.domain
    ? Prisma.sql`AND "domain" = ${input.domain}`
    : Prisma.empty;
  const categoryFilter = input.categoryPrefix
    ? Prisma.sql`AND "category" LIKE ${`${input.categoryPrefix}%`}`
    : Prisma.empty;
  const matches = await prisma.$queryRaw<Array<{ id: string; rank: number }>>(Prisma.sql`
    SELECT "id",
      ts_rank_cd("search_vector", to_tsquery('simple', ${tsQuery}), 32)::float8 AS "rank"
    FROM "knowledge_entries"
    WHERE "is_published" = true
      AND ("expires_at" IS NULL OR "expires_at" > NOW())
      AND "search_vector" @@ to_tsquery('simple', ${tsQuery})
      ${domainFilter}
      ${categoryFilter}
    ORDER BY "rank" DESC
    LIMIT ${DEFAULT_CANDIDATE_LIMIT}
  `);
  return matches.map((item) => ({ id: item.id, rank: Number(item.rank) }));
}

function formatResult(
  row: {
    id: string;
    slug: string;
    domain: string;
    category: string;
    titleZh: string;
    titleEn: string;
    summaryZh: string;
    summaryEn: string;
    contentZh: string;
    contentEn: string;
    keywords: string[];
    competencies: string[];
    sourceTitle: string;
    sourceUrl: string;
    sourceAuthority: number;
    publishedAt: Date | null;
    expiresAt: Date | null;
    lastVerifiedAt: Date | null;
    researchRound: number;
    embeddingModel: string;
    updatedAt: Date;
  },
  scores: {
    vectorScore: number;
    keywordScore: number;
    lexicalRank: number | null;
    semanticRank: number | null;
    fusedScore: number;
    rerankScore: number;
    finalScore: number;
    retrievalMode: "browse" | "hybrid";
    embeddingModel: string;
    embeddingProvider: string;
    rerankProvider: string;
    degraded: boolean;
  }
) {
  return {
    id: row.id,
    slug: row.slug,
    domain: row.domain as KnowledgeDomain,
    category: row.category,
    titleZh: row.titleZh,
    titleEn: row.titleEn,
    summaryZh: row.summaryZh,
    summaryEn: row.summaryEn,
    contentZh: row.contentZh,
    contentEn: row.contentEn,
    keywords: row.keywords,
    competencies: row.competencies,
    sourceTitle: row.sourceTitle,
    sourceUrl: row.sourceUrl,
    sourceAuthority: row.sourceAuthority,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
    researchRound: row.researchRound,
    updatedAt: row.updatedAt.toISOString(),
    score: scores.finalScore,
    ...scores
  };
}

function clampLimit(limit = 50) {
  return Math.min(Math.max(limit, 1), 100);
}

export { buildEmbeddingText } from "./hybrid-ranking";
