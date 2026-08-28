import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

import { maskTracePayload } from "@/lib/observability/redaction";

declare global {
  var __aiMockTelemetryStarted: boolean | undefined;
}

export function registerNodeTelemetry() {
  if (
    globalThis.__aiMockTelemetryStarted ||
    process.env.LANGFUSE_TRACE_ENABLED !== "true" ||
    !process.env.LANGFUSE_PUBLIC_KEY ||
    !process.env.LANGFUSE_SECRET_KEY
  ) {
    return;
  }

  const sdk = new NodeSDK({
    spanProcessors: [
      new LangfuseSpanProcessor({
        mask: ({ data }) => maskTracePayload(data)
      })
    ]
  });
  sdk.start();
  globalThis.__aiMockTelemetryStarted = true;
}
