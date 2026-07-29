import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/repositories/prisma-client";
import { cosineSimilarity } from "./embedding";
import { embedQuery } from "./embedding-provider";
import { rerankKnowledge } from "./reranker";
import { freshnessScore, isFresh } from "./source-quality";

export type KnowledgeDomain = "INVESTMENT_BANKING" | "AI_PRODUCT_MANAGER";

const RRF_K = 60;
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
  const rows = await prisma.knowledgeEntry.findMany({
    where: {
      isPublished: true,
      sourceAuthority: { gte: input.minSourceAuthority ?? 0 },
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ...(input.freshnessDays
          ? [{ OR: [
              { publishedAt: null },
              { publishedAt: { gte: new Date(now.getTime() - input.freshnessDays * 86_400_000) } }
            ] }]
          : [])
      ],
      ...(input.domain ? { domain: input.domain } : {}),
      ...(input.categoryPrefix ? { category: { startsWith: input.categoryPrefix } } : {})
    },
    orderBy: [{ sourceAuthority: "desc" }, { updatedAt: "desc" }]
  });

  if (!query) {
    return rows
      .filter((row) => isFresh({ ...row, freshnessDays: input.freshnessDays, now }))
      .slice(0, clampLimit(input.limit))
      .map((row) => formatResult(row, {
        vectorScore: 0,
        keywordScore: 0,
        lexicalRank: null,
        semanticRank: null,
        fusedScore: 1,
        rerankScore: 1,
        retrievalMode: "browse",
        embeddingModel: row.embeddingModel,
        degraded: false
      }));
  }

  const [embedding, lexicalMatches] = await Promise.all([
    embedQuery(query),
    searchLexically(query, input)
  ]);
  const queryVector = embedding.vectors[0] ?? [];
  const lexicalById = new Map(lexicalMatches.map((item, index) => [
    item.id,
    { score: item.rank, rank: index + 1 }
  ]));
  const terms = tokenize(query);

  const scored = rows.map((row) => {
    const compatibleVector = row.embeddingModel === embedding.model &&
      row.embedding.length === queryVector.length;
    const vectorScore = compatibleVector
      ? Math.max(0, cosineSimilarity(queryVector, row.embedding))
      : 0;
    const keywordScore = calculateKeywordScore(row, terms);
    return {
      row,
      vectorScore,
      keywordScore,
      lexicalRank: lexicalById.get(row.id)?.rank ?? null,
      lexicalScore: lexicalById.get(row.id)?.score ?? keywordScore,
      semanticRank: null as number | null
    };
  });

  const semanticRanking = scored
    .filter((item) => item.vectorScore > 0)
    .sort((left, right) => right.vectorScore - left.vectorScore);
  semanticRanking.forEach((item, index) => {
    item.semanticRank = index + 1;
  });

  const initial = scored
    .map((item) => {
      const fusedScore =
        (item.lexicalRank ? 1 / (RRF_K + item.lexicalRank) : 0) +
        (item.semanticRank ? 1 / (RRF_K + item.semanticRank) : 0) +
        item.keywordScore * 0.003;
      return { ...item, fusedScore };
    })
    .filter((item) => item.fusedScore > 0)
    .sort((left, right) => right.fusedScore - left.fusedScore)
    .slice(0, DEFAULT_CANDIDATE_LIMIT);

  const reranked = await rerankKnowledge(
    query,
    initial.map((item) => ({
      id: item.row.id,
      document: buildEmbeddingText(item.row),
      fusedScore: item.fusedScore,
      sourceAuthority: item.row.sourceAuthority,
      freshnessScore: freshnessScore({ ...item.row, now })
    }))
  );

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
      right.row.sourceAuthority - left.row.sourceAuthority)
    .slice(0, clampLimit(input.limit))
    .map((item) => formatResult(item.row, {
      vectorScore: item.vectorScore,
      keywordScore: item.keywordScore,
      lexicalRank: item.lexicalRank,
      semanticRank: item.semanticRank,
      fusedScore: item.fusedScore,
      rerankScore: item.rerankScore,
      retrievalMode: "hybrid",
      embeddingModel: embedding.model,
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
  const tsQuery = tokenize(query)
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

function calculateKeywordScore(
  row: {
    titleZh: string; titleEn: string; summaryZh: string; summaryEn: string;
    contentZh: string; contentEn: string; keywords: string[];
  },
  terms: string[]
) {
  if (!terms.length) return 0;
  const title = normalize(`${row.titleZh} ${row.titleEn} ${row.keywords.join(" ")}`);
  const body = normalize(
    `${row.summaryZh} ${row.summaryEn} ${row.contentZh} ${row.contentEn}`
  );
  const matchedWeight = terms.reduce((score, term) => {
    if (title.includes(term)) return score + 2;
    if (body.includes(term)) return score + 1;
    return score;
  }, 0);
  return matchedWeight / (terms.length * 2);
}

export function buildEmbeddingText(row: {
  titleZh: string; titleEn: string; summaryZh: string; summaryEn: string;
  contentZh: string; contentEn: string; keywords: string[];
}) {
  return [
    row.titleZh, row.titleEn, row.summaryZh, row.summaryEn,
    row.contentZh, row.contentEn, ...row.keywords
  ].join("\n");
}

function formatResult(
  row: {
    id: string; slug: string; domain: string; category: string;
    titleZh: string; titleEn: string; summaryZh: string; summaryEn: string;
    contentZh: string; contentEn: string; keywords: string[];
    competencies: string[]; sourceTitle: string; sourceUrl: string;
    sourceAuthority: number; publishedAt: Date | null; expiresAt: Date | null;
    lastVerifiedAt: Date | null; researchRound: number; embeddingModel: string;
    updatedAt: Date;
  },
  scores: {
    vectorScore: number; keywordScore: number; lexicalRank: number | null;
    semanticRank: number | null; fusedScore: number; rerankScore: number;
    retrievalMode: "browse" | "hybrid"; embeddingModel: string; degraded: boolean;
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
    score: scores.rerankScore,
    ...scores
  };
}

function tokenize(value: string) {
  const normalized = normalize(value);
  const chinese = normalized.match(/[\u3400-\u9fff]+/g) ?? [];
  const words = normalized.match(/[a-z0-9][a-z0-9.+#/-]*/g) ?? [];
  return [...new Set([
    ...words,
    ...chinese.flatMap((run) =>
      run.length < 2
        ? [run]
        : Array.from({ length: run.length - 1 }, (_, index) => run.slice(index, index + 2))
    )
  ])];
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKC");
}

function clampLimit(limit = 50) {
  return Math.min(Math.max(limit, 1), 100);
}
