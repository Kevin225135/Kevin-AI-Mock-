import assert from "node:assert/strict";
import test from "node:test";
import { estimateModelUsage, evaluateRuntimeBudget, withTimeoutFallback } from "./runtime-guard";

test("blocks model calls that exceed token or cost budgets", () => {
  const blocked = evaluateRuntimeBudget({
    inputText: "x".repeat(1000),
    budget: {
      maxInputTokens: 100,
      maxEstimatedCostUsd: 1,
      inputCostPerMillionUsd: 1,
      outputCostPerMillionUsd: 1
    }
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "INPUT_TOKEN_LIMIT");

  const usage = estimateModelUsage({ inputText: "x".repeat(400) });
  assert.equal(usage.inputTokens, 100);
});

test("returns a deterministic fallback on timeout", async () => {
  const result = await withTimeoutFallback({
    operation: () => new Promise<string>(() => undefined),
    fallback: () => "fallback",
    timeoutMs: 5
  });
  assert.deepEqual(result, {
    value: "fallback",
    degraded: true,
    reason: "TIMEOUT"
  });
});
