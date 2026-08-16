import { createHash } from "node:crypto";

const sensitiveKey =
  /answer|content|resume|transcript|email|password|token|secret|api.?key|authorization|cookie|prompt/i;

export function hashTraceIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function sanitizeTraceMetadata(
  metadata: Record<string, string | number | boolean | null | undefined>
) {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [
        key,
        sensitiveKey.test(key)
          ? "[REDACTED]"
          : sanitizeTraceString(String(value))
      ])
  );
}

export function maskTracePayload(data: unknown, depth = 0): unknown {
  if (data === null || data === undefined || typeof data === "number" || typeof data === "boolean") {
    return data;
  }
  if (typeof data === "string") {
    return sanitizeTraceString(data);
  }
  if (depth >= 4) {
    return "[REDACTED_DEPTH_LIMIT]";
  }
  if (Array.isArray(data)) {
    return data.slice(0, 20).map((item) => maskTracePayload(item, depth + 1));
  }
  if (typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([key, value]) => [
        key,
        sensitiveKey.test(key)
          ? "[REDACTED]"
          : maskTracePayload(value, depth + 1)
      ])
    );
  }
  return "[REDACTED_UNSUPPORTED]";
}

function sanitizeTraceString(value: string) {
  if (value.length <= 200) {
    return value;
  }
  return `[HASHED:${hashTraceIdentifier(value)}]`;
}

