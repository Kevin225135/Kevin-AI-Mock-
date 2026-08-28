export type RuntimeBudget = {
  maxInputTokens: number;
  maxEstimatedCostUsd: number;
  inputCostPerMillionUsd: number;
  outputCostPerMillionUsd: number;
};

export type UsageEstimate = {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};

export function estimateModelUsage(input: {
  inputText: string;
  outputText?: string;
  budget?: Partial<RuntimeBudget>;
}): UsageEstimate {
  const budget = resolveRuntimeBudget(input.budget);
  const inputTokens = estimateTokens(input.inputText);
  const outputTokens = estimateTokens(input.outputText ?? "");
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * budget.inputCostPerMillionUsd +
    (outputTokens / 1_000_000) * budget.outputCostPerMillionUsd;
  return {
    inputTokens,
    outputTokens,
    estimatedCostUsd: Math.round(estimatedCostUsd * 1_000_000) / 1_000_000
  };
}

export function evaluateRuntimeBudget(input: {
  inputText: string;
  expectedOutputChars?: number;
  budget?: Partial<RuntimeBudget>;
}) {
  const budget = resolveRuntimeBudget(input.budget);
  const usage = estimateModelUsage({
    inputText: input.inputText,
    outputText: "x".repeat(input.expectedOutputChars ?? 2000),
    budget
  });
  if (usage.inputTokens > budget.maxInputTokens) {
    return {
      allowed: false as const,
      reason: "INPUT_TOKEN_LIMIT",
      usage,
      budget
    };
  }
  if (usage.estimatedCostUsd > budget.maxEstimatedCostUsd) {
    return { allowed: false as const, reason: "COST_LIMIT", usage, budget };
  }
  return { allowed: true as const, reason: null, usage, budget };
}

export async function withTimeoutFallback<T>(input: {
  operation: (signal: AbortSignal) => Promise<T>;
  fallback: () => T | Promise<T>;
  timeoutMs: number;
}): Promise<{
  value: T;
  degraded: boolean;
  reason?: "TIMEOUT" | "TOOL_ERROR";
}> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([
      input.operation(controller.signal),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => {
            controller.abort();
            reject(new Error("RUNTIME_TIMEOUT"));
          },
          Math.max(1, input.timeoutMs)
        );
      })
    ]);
    return { value, degraded: false };
  } catch (error) {
    const reason =
      error instanceof Error && error.message === "RUNTIME_TIMEOUT" ? "TIMEOUT" : "TOOL_ERROR";
    return { value: await input.fallback(), degraded: true, reason };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function resolveRuntimeBudget(override: Partial<RuntimeBudget> = {}): RuntimeBudget {
  return {
    maxInputTokens: override.maxInputTokens ?? positiveNumber("AI_MAX_INPUT_TOKENS", 16_000),
    maxEstimatedCostUsd:
      override.maxEstimatedCostUsd ?? positiveNumber("AI_RUN_COST_LIMIT_USD", 0.25),
    inputCostPerMillionUsd:
      override.inputCostPerMillionUsd ?? positiveNumber("AI_INPUT_COST_PER_MILLION_USD", 2),
    outputCostPerMillionUsd:
      override.outputCostPerMillionUsd ?? positiveNumber("AI_OUTPUT_COST_PER_MILLION_USD", 8)
  };
}

function estimateTokens(value: string) {
  return value ? Math.max(1, Math.ceil(value.length / 4)) : 0;
}

function positiveNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
