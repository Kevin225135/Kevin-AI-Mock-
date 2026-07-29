export const EMBEDDING_MODEL = "local-bilingual-hash-v1";
export const EMBEDDING_DIMENSIONS = 384;

export function embedText(value: string) {
  const vector = Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  for (const token of tokenize(value)) {
    const hash = fnv1a(token);
    vector[hash % EMBEDDING_DIMENSIONS] += (hash & 1) === 0 ? 1 : -1;
  }
  const norm = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0));
  return norm ? vector.map((item) => item / norm) : vector;
}

export function normalizeVector(vector: number[]) {
  const norm = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0));
  return norm ? vector.map((item) => item / norm) : vector;
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length !== right.length || left.length === 0) return 0;
  return left.reduce((sum, item, index) => sum + item * right[index], 0);
}

function tokenize(value: string) {
  const normalized = value.toLowerCase().normalize("NFKC");
  const words = normalized.match(/[a-z0-9][a-z0-9.+#/-]*/g) ?? [];
  const chineseRuns = normalized.match(/[\u3400-\u9fff]+/g) ?? [];
  const chinese = chineseRuns.flatMap((run) => {
    if (run.length === 1) return [run];
    return Array.from({ length: run.length - 1 }, (_, index) => run.slice(index, index + 2));
  });
  return [...words, ...chinese];
}

function fnv1a(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
