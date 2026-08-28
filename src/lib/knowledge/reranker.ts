const DEFAULT_TIMEOUT_MS = 8_000;

export type RerankCandidate = {
  id: string;
  document: string;
  fusedScore: number;
  sourceAuthority: number;
  freshnessScore: number;
};

export type RerankResult = {
  scores: Map<string, number>;
  provider: "qwen3-rerank" | "local";
  degraded: boolean;
};

export async function rerankKnowledge(
  query: string,
  candidates: RerankCandidate[]
): Promise<RerankResult> {
  if (!candidates.length || !isRemoteRerankEnabled()) return localRerank(candidates);
  const endpoint = process.env.RERANK_API_URL!;
  const apiKey = process.env.RERANK_API_KEY || process.env.AI_API_KEY;
  try {
    const documents = candidates.map((candidate) => candidate.document.slice(0, 12_000));
    const nativeDashScope = endpoint.includes("/services/rerank/");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(nativeDashScope
        ? {
            model: process.env.RERANK_MODEL || "qwen3-rerank",
            input: { query, documents },
            parameters: {
              top_n: candidates.length,
              return_documents: false,
              instruct: "Retrieve passages that are most useful for generating a rigorous job interview question."
            }
          }
        : {
            model: process.env.RERANK_MODEL || "qwen3-rerank",
            query,
            documents,
            top_n: candidates.length,
            return_documents: false,
            instruct: "Retrieve passages that are most useful for generating a rigorous job interview question."
          }),
      signal: AbortSignal.timeout(Number(process.env.RERANK_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS)
    });
    if (!response.ok) throw new Error(`Rerank API returned HTTP ${response.status}.`);

    const payload = await response.json() as {
      results?: Array<{ index?: number; relevance_score?: number; score?: number }>;
      output?: { results?: Array<{ index?: number; relevance_score?: number }> };
    };
    const results: Array<{ index?: number; relevance_score?: number; score?: number }> =
      payload.results ?? payload.output?.results ?? [];
    const scores = new Map<string, number>();
    for (const item of results) {
      const candidate = candidates[item.index ?? -1];
      if (candidate) scores.set(candidate.id, item.relevance_score ?? item.score ?? 0);
    }
    if (!scores.size) throw new Error("Rerank API returned no scores.");
    return { scores, provider: "qwen3-rerank", degraded: false };
  } catch (error) {
    console.warn("[hybrid-rag] reranker unavailable; using local reranker", {
      message: error instanceof Error ? error.message : "RERANK_PROVIDER_ERROR"
    });
    return localRerank(candidates);
  }
}

export function isRemoteRerankEnabled() {
  return process.env.RERANK_ENABLED === "true" &&
    Boolean(process.env.RERANK_API_URL) &&
    Boolean(process.env.RERANK_API_KEY || process.env.AI_API_KEY);
}

function localRerank(candidates: RerankCandidate[]): RerankResult {
  const maximumFusedScore = Math.max(...candidates.map((candidate) => candidate.fusedScore), 1e-9);
  return {
    scores: new Map(candidates.map((candidate) => [
      candidate.id,
      (candidate.fusedScore / maximumFusedScore) * 0.82 +
        (candidate.sourceAuthority / 100) * 0.12 +
        candidate.freshnessScore * 0.06
    ])),
    provider: "local",
    degraded: true
  };
}
