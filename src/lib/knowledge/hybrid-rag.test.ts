import assert from "node:assert/strict";
import test from "node:test";
import { EMBEDDING_MODEL, embedText } from "./embedding";
import { embedDocuments, isRemoteEmbeddingEnabled } from "./embedding-provider";
import { rankHybridCandidates, rankLegacyCandidates } from "./hybrid-ranking";
import { rerankKnowledge } from "./reranker";
import { freshnessScore, inferSourceAuthority, isFresh } from "./source-quality";

test("assigns higher authority to official and academic sources", () => {
  assert.ok(inferSourceAuthority("https://www.sec.gov/rules") > inferSourceAuthority("https://example.com/post"));
  assert.ok(inferSourceAuthority("https://pages.stern.nyu.edu/research") > inferSourceAuthority("not-a-url"));
});

test("filters expired knowledge and decays stale knowledge", () => {
  const now = new Date("2026-07-29T00:00:00Z");
  assert.equal(isFresh({
    expiresAt: new Date("2026-07-28T00:00:00Z"),
    publishedAt: null,
    now
  }), false);
  assert.ok(
    freshnessScore({ publishedAt: new Date("2026-07-20T00:00:00Z"), lastVerifiedAt: null, now }) >
    freshnessScore({ publishedAt: new Date("2024-07-20T00:00:00Z"), lastVerifiedAt: null, now })
  );
  assert.ok(
    freshnessScore({
      publishedAt: new Date("2024-07-20T00:00:00Z"),
      lastVerifiedAt: new Date("2026-07-28T00:00:00Z"),
      now
    }) > 0.9
  );
});

test("embedding provider is local unless remote use is explicitly enabled", async () => {
  const previousProvider = process.env.EMBEDDING_PROVIDER;
  const previousKey = process.env.EMBEDDING_API_KEY;
  delete process.env.EMBEDDING_PROVIDER;
  process.env.EMBEDDING_API_KEY = "configured-but-not-authorized-without-provider";
  try {
    assert.equal(isRemoteEmbeddingEnabled(), false);
    const result = await embedDocuments(["降低大模型幻觉", "reduce model hallucination"]);
    assert.equal(result.provider, "local");
    assert.equal(result.degraded, true);
    assert.equal(result.vectors.length, 2);
    assert.equal(result.vectors[0].length, 384);
  } finally {
    if (previousProvider === undefined) delete process.env.EMBEDDING_PROVIDER;
    else process.env.EMBEDDING_PROVIDER = previousProvider;
    if (previousKey === undefined) delete process.env.EMBEDDING_API_KEY;
    else process.env.EMBEDDING_API_KEY = previousKey;
  }
});

test("local reranker preserves relevance while using source quality as a tie-breaker", async () => {
  const result = await rerankKnowledge("query", [
    { id: "relevant", document: "relevant", fusedScore: 0.03, sourceAuthority: 60, freshnessScore: 0.5 },
    { id: "authority", document: "authority", fusedScore: 0.01, sourceAuthority: 95, freshnessScore: 1 }
  ]);
  assert.equal(result.provider, "local");
  assert.ok(result.scores.get("relevant")! > result.scores.get("authority")!);
});

test("RRF hybrid ranking keeps an exact bilingual Gold match in the first position", () => {
  const rows = [
    knowledgeRow("gold", "评估集与评分标准", "Evaluation sets and rubrics", ["evals", "rubric", "golden dataset"]),
    knowledgeRow("other", "资本募集与承销", "Capital raising and underwriting", ["IPO", "underwriting"])
  ];
  const query = "LLM 评测集 rubric golden dataset";
  const queryVector = embedText(query);
  const hybrid = rankHybridCandidates({
    query,
    queryVector,
    queryEmbeddingModel: EMBEDDING_MODEL,
    candidates: rows
  });
  const legacy = rankLegacyCandidates({
    query,
    queryVector,
    queryEmbeddingModel: EMBEDDING_MODEL,
    candidates: rows
  });
  assert.equal(hybrid[0].row.id, "gold");
  assert.equal(legacy[0].row.id, "gold");
});

function knowledgeRow(id: string, titleZh: string, titleEn: string, keywords: string[]) {
  const text = `${titleZh} ${titleEn} ${keywords.join(" ")}`;
  return {
    id,
    titleZh,
    titleEn,
    summaryZh: text,
    summaryEn: text,
    contentZh: text,
    contentEn: text,
    keywords,
    sourceAuthority: 80,
    embeddingModel: EMBEDDING_MODEL,
    embedding: embedText(text)
  };
}
