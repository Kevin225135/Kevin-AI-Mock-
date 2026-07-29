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
  if (!candidates.length || process.env.RERANK_ENABLED === "false") {
    return localRerank(candidates);
  }
  const endpoint = process.env.RERANK_API_URL;
  const apiKey = process.env.RERANK_API_KEY || process.env.AI_API_KEY;
  if (!endpoint || !apiKey) return localRerank(candidates);

  try {
    const documents = candidates.map((candidate) =>
      candidate.document.slice(0, 12_000)
    );
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
      signal: AbortSignal.timeout(
        Number(process.env.RERANK_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS
      )
    });
    if (!response.ok) {
      throw new Error(`Rerank API ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
    const payload = await response.json() as {
      results?: Array<{ index?: number; relevance_score?: number; score?: number }>;
      output?: { results?: Array<{ index?: number; relevance_score?: number }> };
    };
    const results: Array<{
      index?: number;
      relevance_score?: number;
      score?: number;
    }> = payload.results ?? payload.output?.results ?? [];
    const scores = new Map<string, number>();
    for (const item of results) {
      const candidate = candidates[item.index ?? -1];
      if (candidate) {
        scores.set(candidate.id, item.relevance_score ?? item.score ?? 0);
      }
    }
    if (!scores.size) throw new Error("Rerank API returned no scores.");
    return { scores, provider: "qwen3-rerank", degraded: false };
  } catch (error) {
    console.warn("[hybrid-rag] reranker unavailable; using local reranker", {
      message: error instanceof Error ? error.message : String(error)
    });
    return localRerank(candidates);
  }
}

function localRerank(candidates: RerankCandidate[]): RerankResult {
  return {
    scores: new Map(candidates.map((candidate) => [
      candidate.id,
      candidate.fusedScore * 0.8 +
        (candidate.sourceAuthority / 100) * 0.12 +
        candidate.freshnessScore * 0.08
    ])),
    provider: "local",
    degraded: true
  };
}
