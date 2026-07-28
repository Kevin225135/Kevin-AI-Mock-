export function captureServerError(error: unknown, context?: Record<string, unknown>) {
  const normalized = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack?.slice(0, 4000) }
    : { name: "UnknownError", message: String(error) };
  console.error(JSON.stringify({ level: "error", timestamp: new Date().toISOString(), ...normalized, context }));

  const webhook = process.env.ERROR_WEBHOOK_URL;
  if (webhook) {
    void fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timestamp: new Date().toISOString(), ...normalized, context }),
      signal: AbortSignal.timeout(3000)
    }).catch(() => undefined);
  }
}
