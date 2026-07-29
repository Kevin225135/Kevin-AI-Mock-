import {
  EMBEDDING_MODEL as LOCAL_EMBEDDING_MODEL,
  embedText,
  normalizeVector
} from "./embedding";

const DEFAULT_MODEL = "text-embedding-v4";
const DEFAULT_DIMENSIONS = 1024;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_TIMEOUT_MS = 12_000;

export type EmbeddingResult = {
  vectors: number[][];
  model: string;
  provider: "dashscope" | "local";
  degraded: boolean;
};

export async function embedDocuments(texts: string[]): Promise<EmbeddingResult> {
  if (!texts.length) {
    return {
      vectors: [],
      model: configuredModel(),
      provider: "dashscope",
      degraded: false
    };
  }

  if (!isRemoteEmbeddingEnabled()) {
    return localEmbedding(texts);
  }

  const batchSize = Math.min(
    Math.max(Number(process.env.EMBEDDING_BATCH_SIZE) || DEFAULT_BATCH_SIZE, 1),
    10
  );
  const vectors: number[][] = [];
  try {
    for (let index = 0; index < texts.length; index += batchSize) {
      const batch = texts.slice(index, index + batchSize).map(truncateEmbeddingInput);
      vectors.push(...await requestEmbeddings(batch));
    }
    return {
      vectors,
      model: configuredModel(),
      provider: "dashscope",
      degraded: false
    };
  } catch (error) {
    console.warn("[hybrid-rag] embedding provider unavailable; using local fallback", {
      message: error instanceof Error ? error.message : String(error)
    });
    return localEmbedding(texts);
  }
}

export async function embedQuery(text: string): Promise<EmbeddingResult> {
  return embedDocuments([text]);
}

export function isRemoteEmbeddingEnabled() {
  return process.env.EMBEDDING_PROVIDER !== "local" &&
    Boolean(process.env.EMBEDDING_API_KEY || process.env.AI_API_KEY);
}

function localEmbedding(texts: string[]): EmbeddingResult {
  return {
    vectors: texts.map(embedText),
    model: LOCAL_EMBEDDING_MODEL,
    provider: "local",
    degraded: true
  };
}

async function requestEmbeddings(input: string[]) {
  const response = await fetch(`${configuredBaseUrl()}/embeddings`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.EMBEDDING_API_KEY || process.env.AI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: configuredModel(),
      input,
      dimensions: configuredDimensions(),
      encoding_format: "float"
    }),
    signal: AbortSignal.timeout(
      Number(process.env.EMBEDDING_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS
    )
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Embedding API ${response.status}: ${detail}`);
  }

  const payload = await response.json() as {
    data?: Array<{ index?: number; embedding?: number[] }>;
  };
  const ordered = [...(payload.data ?? [])].sort(
    (left, right) => (left.index ?? 0) - (right.index ?? 0)
  );
  if (ordered.length !== input.length ||
      ordered.some((item) => !Array.isArray(item.embedding))) {
    throw new Error("Embedding API returned an invalid vector count.");
  }
  return ordered.map((item) => normalizeVector(item.embedding!));
}

function configuredBaseUrl() {
  return (process.env.EMBEDDING_API_BASE_URL ||
    process.env.AI_API_BASE_URL ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/+$/, "");
}

function configuredModel() {
  return process.env.EMBEDDING_MODEL || DEFAULT_MODEL;
}

function configuredDimensions() {
  return Math.max(
    Number(process.env.EMBEDDING_DIMENSIONS) || DEFAULT_DIMENSIONS,
    64
  );
}

function truncateEmbeddingInput(value: string) {
  return value.slice(0, 24_000);
}
