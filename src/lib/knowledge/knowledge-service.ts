import { prisma } from "@/lib/repositories/prisma-client";
import { cosineSimilarity, embedText } from "./embedding";

export type KnowledgeDomain = "INVESTMENT_BANKING" | "AI_PRODUCT_MANAGER";

export async function searchKnowledge(input: {
  query?: string;
  domain?: KnowledgeDomain;
  limit?: number;
}) {
  const query = input.query?.trim() ?? "";
  const rows = await prisma.knowledgeEntry.findMany({
    where: {
      isPublished: true,
      ...(input.domain ? { domain: input.domain } : {})
    },
    orderBy: [{ domain: "asc" }, { category: "asc" }, { updatedAt: "desc" }]
  });
  const queryVector = query ? embedText(query) : null;
  const terms = normalize(query).split(" ").filter(Boolean);
  return rows
    .map((row) => {
      const haystack = normalize([
        row.titleZh, row.titleEn, row.summaryZh, row.summaryEn,
        row.contentZh, row.contentEn, ...row.keywords
      ].join(" "));
      const keywordScore = terms.length
        ? terms.filter((term) => haystack.includes(term)).length / terms.length
        : 0;
      const vectorScore = queryVector
        ? Math.max(0, cosineSimilarity(queryVector, row.embedding))
        : 0;
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
        researchRound: row.researchRound,
        updatedAt: row.updatedAt.toISOString(),
        vectorScore,
        keywordScore,
        score: query ? vectorScore * 0.65 + keywordScore * 0.35 : 1
      };
    })
    .filter((row) => !query || row.score > 0)
    .sort((a, b) => b.score - a.score || a.titleEn.localeCompare(b.titleEn))
    .slice(0, Math.min(Math.max(input.limit ?? 50, 1), 100));
}

function normalize(value: string) {
  const normalized = value.toLowerCase().normalize("NFKC");
  const chinese = normalized.match(/[\u3400-\u9fff]+/g) ?? [];
  const words = normalized.match(/[a-z0-9][a-z0-9.+#/-]*/g) ?? [];
  return [...words, ...chinese.flatMap((run) =>
    run.length < 2 ? [run] : Array.from({ length: run.length - 1 }, (_, index) => run.slice(index, index + 2))
  )].join(" ");
}
