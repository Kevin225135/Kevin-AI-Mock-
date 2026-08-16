import { maskTracePayload } from "@/lib/observability/redaction";

declare global {
  var __aiMockTelemetryStarted: boolean | undefined;
}

export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    globalThis.__aiMockTelemetryStarted ||
    process.env.LANGFUSE_TRACE_ENABLED !== "true" ||
    !process.env.LANGFUSE_PUBLIC_KEY ||
    !process.env.LANGFUSE_SECRET_KEY
  ) {
    return;
  }

  const [{ NodeSDK }, { LangfuseSpanProcessor }] = await Promise.all([
    import("@opentelemetry/sdk-node"),
    import("@langfuse/otel")
  ]);
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

