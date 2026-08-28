import { NextRequest, NextResponse } from "next/server";
import { countKnowledge, searchKnowledge, type KnowledgeDomain } from "@/lib/knowledge/knowledge-service";

const domains = new Set<KnowledgeDomain>(["INVESTMENT_BANKING", "AI_PRODUCT_MANAGER"]);

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.slice(0, 200) ?? "";
  const rawDomain = request.nextUrl.searchParams.get("domain");
  const domain = rawDomain && domains.has(rawDomain as KnowledgeDomain)
    ? rawDomain as KnowledgeDomain
    : undefined;
  const categoryPrefix = request.nextUrl.searchParams.get("collection")?.slice(0, 40) || undefined;
  const [entries, total] = await Promise.all([
    searchKnowledge({ query, domain, categoryPrefix, limit: 100 }),
    countKnowledge({ domain, categoryPrefix })
  ]);
  return NextResponse.json({
    entries,
    total,
    returned: entries.length,
    retrieval: query ? "hybrid-rrf-rerank" : "browse",
    degraded: query ? entries.some((entry) => entry.degraded) : false,
    providers: query
      ? {
          embedding: [...new Set(entries.map((entry) => entry.embeddingProvider))],
          rerank: [...new Set(entries.map((entry) => entry.rerankProvider))]
        }
      : null
  });
}
