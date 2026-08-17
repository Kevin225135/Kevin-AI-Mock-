import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { embedDocuments, embedQuery } from "../src/lib/knowledge/embedding-provider";
import {
  buildEmbeddingText,
  rankHybridCandidates,
  rankLegacyCandidates
} from "../src/lib/knowledge/hybrid-ranking";
import { rerankKnowledge } from "../src/lib/knowledge/reranker";
import { freshnessScore, inferSourceAuthority } from "../src/lib/knowledge/source-quality";
import { knowledgeSeeds } from "../src/lib/knowledge/seed-data";
import { investmentBanking400, roundTwoKnowledge } from "../src/lib/knowledge/round-two-data";
import { summerRecruitKnowledge } from "../src/lib/knowledge/summer-recruit-data";

const goldSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string(),
  version: z.string(),
  topK: z.number().int().positive(),
  gate: z.object({
    minimumRecallAt5: z.number().min(0).max(1),
    minimumNdcgAt5: z.number().min(0).max(1),
    maximumRecallRegression: z.number().min(0),
    maximumP95LatencyMs: z.number().positive()
  }),
  queries: z.array(z.object({
    id: z.string(),
    query: z.string().min(1),
    domain: z.enum(["INVESTMENT_BANKING", "AI_PRODUCT_MANAGER"]),
    relevantSlugs: z.array(z.string()).min(1)
  })).min(1)
});

async function main() {
  process.env.EMBEDDING_PROVIDER = "local";
  process.env.RERANK_ENABLED = "false";
  const goldPath = path.join(process.cwd(), "evals", "retrieval", "gold-queries.v1.json");
  const gold = goldSchema.parse(JSON.parse(await readFile(goldPath, "utf8")));
  const seeds = [
    ...knowledgeSeeds,
    ...investmentBanking400,
    ...roundTwoKnowledge,
    ...summerRecruitKnowledge
  ];
  const duplicateSlugs = findDuplicates(seeds.map((seed) => seed.slug));
  if (duplicateSlugs.length) throw new Error(`Duplicate knowledge slugs: ${duplicateSlugs.join(", ")}`);
  const missingGold = gold.queries.flatMap((query) =>
    query.relevantSlugs.filter((slug) => !seeds.some((seed) => seed.slug === slug))
  );
  if (missingGold.length) throw new Error(`Gold slugs missing from corpus: ${[...new Set(missingGold)].join(", ")}`);

  const embeddings = await embedDocuments(seeds.map(buildEmbeddingText));
  const now = new Date("2026-08-17T00:00:00.000Z");
  const corpus = seeds.map((seed, index) => ({
    ...seed,
    id: seed.slug,
    sourceAuthority: inferSourceAuthority(seed.sourceUrl),
    publishedAt: null as Date | null,
    lastVerifiedAt: now,
    embeddingModel: embeddings.model,
    embedding: embeddings.vectors[index]
  }));
  const queryResults: Array<{
    id: string;
    domain: "INVESTMENT_BANKING" | "AI_PRODUCT_MANAGER";
    relevantSlugs: string[];
    legacyTopK: string[];
    hybridTopK: string[];
    legacy: { recallAt5: number; mrrAt5: number; ndcgAt5: number };
    hybrid: { recallAt5: number; mrrAt5: number; ndcgAt5: number };
    latencyMs: number;
    degraded: boolean;
    providers: { embedding: string; rerank: string };
  }> = [];

  for (const item of gold.queries) {
    const startedAt = performance.now();
    const candidates = corpus.filter((entry) => entry.domain === item.domain);
    const queryEmbedding = await embedQuery(item.query);
    const queryVector = queryEmbedding.vectors[0] ?? [];
    const legacy = rankLegacyCandidates({
      query: item.query,
      queryVector,
      queryEmbeddingModel: queryEmbedding.model,
      candidates
    });
    const initial = rankHybridCandidates({
      query: item.query,
      queryVector,
      queryEmbeddingModel: queryEmbedding.model,
      candidates
    });
    const reranked = await rerankKnowledge(item.query, initial.map((candidate) => ({
      id: candidate.row.id,
      document: buildEmbeddingText(candidate.row),
      fusedScore: candidate.fusedScore,
      sourceAuthority: candidate.row.sourceAuthority,
      freshnessScore: freshnessScore({ ...candidate.row, now })
    })));
    const hybrid = initial
      .map((candidate) => ({
        ...candidate,
        finalScore: (reranked.scores.get(candidate.row.id) ?? 0) +
          (candidate.row.sourceAuthority / 100) * 0.04 +
          freshnessScore({ ...candidate.row, now }) * 0.02
      }))
      .sort((left, right) => right.finalScore - left.finalScore || left.row.id.localeCompare(right.row.id));
    const legacySlugs = legacy.slice(0, gold.topK).map((candidate) => candidate.row.id);
    const hybridSlugs = hybrid.slice(0, gold.topK).map((candidate) => candidate.row.id);
    queryResults.push({
      id: item.id,
      domain: item.domain,
      relevantSlugs: item.relevantSlugs,
      legacyTopK: legacySlugs,
      hybridTopK: hybridSlugs,
      legacy: metricsForQuery(legacySlugs, item.relevantSlugs, gold.topK),
      hybrid: metricsForQuery(hybridSlugs, item.relevantSlugs, gold.topK),
      latencyMs: performance.now() - startedAt,
      degraded: embeddings.degraded || queryEmbedding.degraded || reranked.degraded,
      providers: { embedding: queryEmbedding.provider, rerank: reranked.provider }
    });
  }

  const legacy = aggregate(queryResults.map((result) => result.legacy));
  const hybrid = aggregate(queryResults.map((result) => result.hybrid));
  const p95LatencyMs = percentile(queryResults.map((result) => result.latencyMs), 0.95);
  const recallRegression = Math.max(0, legacy.recallAt5 - hybrid.recallAt5);
  const gatePassed = hybrid.recallAt5 >= gold.gate.minimumRecallAt5 &&
    hybrid.ndcgAt5 >= gold.gate.minimumNdcgAt5 &&
    recallRegression <= gold.gate.maximumRecallRegression &&
    p95LatencyMs <= gold.gate.maximumP95LatencyMs;
  const byDomain = Object.fromEntries(
    ["AI_PRODUCT_MANAGER", "INVESTMENT_BANKING"].map((domain) => {
      const rows = queryResults.filter((result) => result.domain === domain);
      return [domain, {
        legacy: aggregate(rows.map((result) => result.legacy)),
        hybrid: aggregate(rows.map((result) => result.hybrid))
      }];
    })
  );

  console.log(JSON.stringify({
    dataset: `${gold.name}@${gold.version}`,
    corpusSize: corpus.length,
    queries: queryResults.length,
    provider: { embedding: embeddings.provider, degraded: embeddings.degraded, externalCalls: 0 },
    legacy,
    hybrid,
    recallRegression,
    p95LatencyMs,
    byDomain,
    gate: { ...gold.gate, passed: gatePassed },
    cases: queryResults
  }, null, 2));
  if (!gatePassed) process.exitCode = 1;
}

function metricsForQuery(retrieved: string[], relevant: string[], topK: number) {
  const top = retrieved.slice(0, topK);
  const hits = top.filter((slug) => relevant.includes(slug)).length;
  const firstRelevant = top.findIndex((slug) => relevant.includes(slug));
  const dcg = top.reduce((score, slug, index) =>
    score + (relevant.includes(slug) ? 1 / Math.log2(index + 2) : 0), 0);
  const idealHits = Math.min(relevant.length, topK);
  const idcg = Array.from({ length: idealHits }, (_, index) => 1 / Math.log2(index + 2))
    .reduce((sum, value) => sum + value, 0);
  return {
    recallAt5: hits / relevant.length,
    mrrAt5: firstRelevant < 0 ? 0 : 1 / (firstRelevant + 1),
    ndcgAt5: idcg ? dcg / idcg : 0
  };
}

function aggregate(metrics: Array<{ recallAt5: number; mrrAt5: number; ndcgAt5: number }>) {
  const divisor = Math.max(metrics.length, 1);
  return {
    recallAt5: metrics.reduce((sum, metric) => sum + metric.recallAt5, 0) / divisor,
    mrrAt5: metrics.reduce((sum, metric) => sum + metric.mrrAt5, 0) / divisor,
    ndcgAt5: metrics.reduce((sum, metric) => sum + metric.ndcgAt5, 0) / divisor
  };
}

function percentile(values: number[], percentileValue: number) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * percentileValue) - 1)] ?? 0;
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
