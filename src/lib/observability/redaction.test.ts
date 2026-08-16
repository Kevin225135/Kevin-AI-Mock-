import assert from "node:assert/strict";
import test from "node:test";
import {
  hashTraceIdentifier,
  maskTracePayload,
  sanitizeTraceMetadata
} from "./redaction";

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
    sanitizeTraceMetadata({ runId: "run-1", promptText: "do not export" }),
    { runId: "run-1", promptText: "[REDACTED]" }
  );
  assert.equal(hashTraceIdentifier("user-1"), hashTraceIdentifier("user-1"));
  assert.notEqual(hashTraceIdentifier("user-1"), hashTraceIdentifier("user-2"));
});

