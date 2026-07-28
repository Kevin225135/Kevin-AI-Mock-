import { NextRequest, NextResponse } from "next/server";
import { searchKnowledge, type KnowledgeDomain } from "@/lib/knowledge/knowledge-service";

const domains = new Set<KnowledgeDomain>(["INVESTMENT_BANKING", "AI_PRODUCT_MANAGER"]);

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.slice(0, 200) ?? "";
  const rawDomain = request.nextUrl.searchParams.get("domain");
  const domain = rawDomain && domains.has(rawDomain as KnowledgeDomain)
    ? rawDomain as KnowledgeDomain
    : undefined;
  const entries = await searchKnowledge({ query, domain, limit: 60 });
  return NextResponse.json({
    entries,
    total: entries.length,
    retrieval: query ? "hybrid-vector-keyword" : "browse"
  });
}
