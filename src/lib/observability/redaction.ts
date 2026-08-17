import { createHash } from "node:crypto";

const credentialKey = /password|secret|api.?key|auth(?:orization)?(?:header)?|cookie/i;
const privateContentKey = /answer|content|resume|transcript|email|prompt/i;
const safeReferenceSuffix = /(?:id|ids|ref|refs|version|length|count|hash|score|depth)$/i;

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
        shouldRedactTraceField(key, value) ? "[REDACTED]" : sanitizeTraceString(String(value))
      ])
  );
}

export function maskTracePayload(data: unknown, depth = 0): unknown {
  if (
    data === null ||
    data === undefined ||
    typeof data === "number" ||
    typeof data === "boolean"
  ) {
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
        shouldRedactTraceField(key, value) ? "[REDACTED]" : maskTracePayload(value, depth + 1)
      ])
    );
  }
  return "[REDACTED_UNSUPPORTED]";
}

function sanitizeTraceString(value: string) {
  const redacted = value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/\b1[3-9]\d{9}\b/g, "[REDACTED_PHONE]")
    .replace(/\b(?:sk|pk|rk)-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_TOKEN]")
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED_TOKEN]");
  if (redacted.length <= 200) {
    return redacted;
  }
  return `[HASHED:${hashTraceIdentifier(redacted)}]`;
}

function shouldRedactTraceField(key: string, value: unknown) {
  if (credentialKey.test(key)) return true;
  if (/token/i.test(key)) return typeof value !== "number";
  if (!privateContentKey.test(key)) return false;
  return !safeReferenceSuffix.test(key);
}
