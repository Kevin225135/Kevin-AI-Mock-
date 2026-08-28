import { cosineSimilarity } from "./embedding";

export const RRF_K = 60;
export const DEFAULT_CANDIDATE_LIMIT = 60;

export type RankableKnowledge = {
  id: string;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  contentZh: string;
  contentEn: string;
  keywords: string[];
  sourceAuthority: number;
  embeddingModel: string;
  embedding: number[];
};

export function rankHybridCandidates<T extends RankableKnowledge>(input: {
  query: string;
  queryVector: number[];
  queryEmbeddingModel: string;
  candidates: T[];
  lexicalRanks?: Map<string, number>;
  candidateLimit?: number;
}) {
  const terms = tokenizeKnowledgeQuery(input.query);
  const scored = input.candidates.map((row) => {
    const compatibleVector = row.embeddingModel === input.queryEmbeddingModel &&
      row.embedding.length === input.queryVector.length;
    return {
      row,
      vectorScore: compatibleVector
        ? Math.max(0, cosineSimilarity(input.queryVector, row.embedding))
        : 0,
      keywordScore: calculateKeywordScore(row, terms),
      lexicalRank: input.lexicalRanks?.get(row.id) ?? null as number | null,
      semanticRank: null as number | null
    };
  });

  if (!input.lexicalRanks) {
    scored
      .filter((item) => item.keywordScore > 0)
      .sort((left, right) => right.keywordScore - left.keywordScore)
      .forEach((item, index) => { item.lexicalRank = index + 1; });
  }
  scored
    .filter((item) => item.vectorScore > 0)
    .sort((left, right) => right.vectorScore - left.vectorScore)
    .forEach((item, index) => { item.semanticRank = index + 1; });

  return scored
    .map((item) => ({
      ...item,
      fusedScore:
        (item.lexicalRank ? 1 / (RRF_K + item.lexicalRank) : 0) +
        (item.semanticRank ? 1 / (RRF_K + item.semanticRank) : 0) +
        item.keywordScore * 0.003
    }))
    .filter((item) => item.fusedScore > 0)
    .sort((left, right) => right.fusedScore - left.fusedScore)
    .slice(0, input.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT);
}

export function rankLegacyCandidates<T extends RankableKnowledge>(input: {
  query: string;
  queryVector: number[];
  queryEmbeddingModel: string;
  candidates: T[];
}) {
  const terms = tokenizeKnowledgeQuery(input.query);
  return input.candidates
    .map((row) => {
      const vectorScore = row.embeddingModel === input.queryEmbeddingModel &&
        row.embedding.length === input.queryVector.length
        ? Math.max(0, cosineSimilarity(input.queryVector, row.embedding))
        : 0;
      const keywordScore = calculateKeywordScore(row, terms);
      return { row, vectorScore, keywordScore, score: vectorScore * 0.65 + keywordScore * 0.35 };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.row.id.localeCompare(right.row.id));
}

export function calculateKeywordScore(
  row: Pick<RankableKnowledge, "titleZh" | "titleEn" | "summaryZh" | "summaryEn" | "contentZh" | "contentEn" | "keywords">,
  terms: string[]
) {
  if (!terms.length) return 0;
  const title = normalize(`${row.titleZh} ${row.titleEn} ${row.keywords.join(" ")}`);
  const body = normalize(`${row.summaryZh} ${row.summaryEn} ${row.contentZh} ${row.contentEn}`);
  const matchedWeight = terms.reduce((score, term) => {
    if (title.includes(term)) return score + 2;
    if (body.includes(term)) return score + 1;
    return score;
  }, 0);
  return matchedWeight / (terms.length * 2);
}

export function buildEmbeddingText(row: {
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  contentZh: string;
  contentEn: string;
  keywords: string[];
}) {
  return [
    row.titleZh,
    row.titleEn,
    row.summaryZh,
    row.summaryEn,
    row.contentZh,
    row.contentEn,
    ...row.keywords
  ].join("\n");
}

export function tokenizeKnowledgeQuery(value: string) {
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
