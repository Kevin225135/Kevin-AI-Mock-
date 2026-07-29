import assert from "node:assert/strict";
import test from "node:test";
import { embedDocuments } from "./embedding-provider";
import { rerankKnowledge } from "./reranker";
import {
  freshnessScore,
  inferSourceAuthority,
  isFresh
} from "./source-quality";

test("assigns higher authority to official sources", () => {
  assert.ok(
    inferSourceAuthority("https://www.hkex.com.hk/rules") >
    inferSourceAuthority("https://example.com/post")
  );
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
});

test("embedding provider has a deterministic local fallback", async () => {
  const originalProvider = process.env.EMBEDDING_PROVIDER;
  process.env.EMBEDDING_PROVIDER = "local";
  try {
    const result = await embedDocuments(["降低大模型幻觉", "reduce model hallucination"]);
    assert.equal(result.provider, "local");
    assert.equal(result.degraded, true);
    assert.equal(result.vectors.length, 2);
    assert.equal(result.vectors[0].length, 384);
  } finally {
    if (originalProvider === undefined) delete process.env.EMBEDDING_PROVIDER;
    else process.env.EMBEDDING_PROVIDER = originalProvider;
  }
});

test("local reranker preserves availability and rewards source quality", async () => {
  const originalEnabled = process.env.RERANK_ENABLED;
  process.env.RERANK_ENABLED = "false";
  try {
    const result = await rerankKnowledge("AI product", [
      {
        id: "official",
        document: "AI product workflow",
        fusedScore: 0.02,
        sourceAuthority: 95,
        freshnessScore: 1
      },
      {
        id: "unknown",
        document: "AI product workflow",
        fusedScore: 0.02,
        sourceAuthority: 40,
        freshnessScore: 0.2
      }
    ]);
    assert.equal(result.degraded, true);
    assert.ok(result.scores.get("official")! > result.scores.get("unknown")!);
  } finally {
    if (originalEnabled === undefined) delete process.env.RERANK_ENABLED;
    else process.env.RERANK_ENABLED = originalEnabled;
  }
});
