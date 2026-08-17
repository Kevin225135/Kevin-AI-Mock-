import assert from "node:assert/strict";
import test from "node:test";
import { hashTraceIdentifier, maskTracePayload, sanitizeTraceMetadata } from "./redaction";

test("redacts sensitive trace fields and hashes long payloads", () => {
  const masked = maskTracePayload({
    answer: "private answer",
    nested: { resumeContent: "private resume", status: "ok" },
    longValue: "x".repeat(500)
  }) as Record<string, unknown>;

  assert.equal(masked.answer, "[REDACTED]");
  assert.deepEqual(masked.nested, {
    resumeContent: "[REDACTED]",
    status: "ok"
  });
  assert.match(String(masked.longValue), /^\[HASHED:[a-f0-9]{16}\]$/);
});

test("keeps trace metadata bounded and hashes user identifiers deterministically", () => {
  assert.deepEqual(
    sanitizeTraceMetadata({
      runId: "run-1",
      promptText: "do not export",
      promptVersion: "score-v1",
      inputTokens: 120
    }),
    {
      runId: "run-1",
      promptText: "[REDACTED]",
      promptVersion: "score-v1",
      inputTokens: "120"
    }
  );
  assert.equal(hashTraceIdentifier("user-1"), hashTraceIdentifier("user-1"));
  assert.notEqual(hashTraceIdentifier("user-1"), hashTraceIdentifier("user-2"));
});

test("redacts inline contact data and bearer tokens even in short strings", () => {
  const masked = maskTracePayload({
    note: "contact me at user@example.com or 13812345678",
    authHeader: "Bearer abcdefghijklmnop"
  }) as Record<string, string>;
  assert.equal(masked.note, "contact me at [REDACTED_EMAIL] or [REDACTED_PHONE]");
  assert.equal(masked.authHeader, "[REDACTED]");
});

test("keeps replay identifiers and metric names while hiding raw content", () => {
  assert.deepEqual(
    maskTracePayload({
      answer: "private",
      answerId: "attempt-1",
      resumeId: "resume-1",
      contentDepth: 4,
      inputTokens: 200,
      promptVersion: "score-v1"
    }),
    {
      answer: "[REDACTED]",
      answerId: "attempt-1",
      resumeId: "resume-1",
      contentDepth: 4,
      inputTokens: 200,
      promptVersion: "score-v1"
    }
  );
});
