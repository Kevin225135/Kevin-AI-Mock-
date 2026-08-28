import { randomUUID } from "node:crypto";
import {
  hashTraceIdentifier,
  sanitizeTraceMetadata
} from "./redaction";

export type TraceRunInput = {
  runId?: string;
  name: string;
  sessionId?: string;
  userId?: string;
  version: string;
  tags?: string[];
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export function createTraceRunId() {
  return randomUUID();
}

export async function runWithTrace<T>(
  input: TraceRunInput,
  operation: () => Promise<T>
): Promise<T> {
  if (!isLangfuseConfigured()) {
    return operation();
  }

  let tracing: typeof import("@langfuse/tracing");
  try {
    tracing = await import("@langfuse/tracing");
  } catch {
    return operation();
  }

  const runId = input.runId ?? createTraceRunId();
  const metadata = sanitizeTraceMetadata({
    runId,
    ...input.metadata
  });

  return tracing.propagateAttributes(
    {
      userId: input.userId ? hashTraceIdentifier(input.userId) : undefined,
      sessionId: input.sessionId,
      metadata,
      version: input.version,
      tags: input.tags,
      traceName: input.name,
      environment: normalizeEnvironment(
        process.env.LANGFUSE_TRACING_ENVIRONMENT ?? process.env.NODE_ENV
      )
    },
    () =>
      tracing.startActiveObservation(
        input.name,
        async (observation) => {
          observation.update({ metadata });
          try {
            const result = await operation();
            observation.update({ output: { status: "ok", runId } });
            return result;
          } catch (error) {
            observation.update({
              output: {
                status: "error",
                runId,
                errorType: error instanceof Error ? error.name : "UnknownError"
              }
            });
            throw error;
          }
        },
        { asType: "chain" }
      )
  );
}

function isLangfuseConfigured() {
  return Boolean(
    process.env.LANGFUSE_TRACE_ENABLED === "true" &&
      process.env.LANGFUSE_PUBLIC_KEY &&
      process.env.LANGFUSE_SECRET_KEY
  );
}

function normalizeEnvironment(value: string | undefined) {
  const normalized = (value ?? "development")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .slice(0, 40);
  return normalized.startsWith("langfuse") ? `app-${normalized}` : normalized;
}

