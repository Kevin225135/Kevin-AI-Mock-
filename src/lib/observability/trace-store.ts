import type { TraceRunStatus, TraceStepKind, TraceStepStatus } from "@prisma/client";
import { canAccessOwnedResource } from "@/lib/auth/permissions";
import { prisma } from "@/lib/repositories/prisma-client";
import type { CurrentUser } from "@/lib/domain/types";
import { maskTracePayload } from "./redaction";

export async function createPersistentTraceRun(input: {
  runId: string;
  userId?: string;
  sessionId?: string;
  attemptId?: string;
  name: string;
  workflowVersion: string;
  promptVersion?: string;
  model?: string;
  inputRefs: Record<string, unknown>;
}) {
  return prisma.traceRun.create({
    data: {
      ...input,
      inputRefs: maskTracePayload(input.inputRefs) as any
    }
  });
}

export async function recordTraceStep(input: {
  runId: string;
  sequence: number;
  kind: TraceStepKind;
  name: string;
  status?: TraceStepStatus;
  inputSummary?: unknown;
  outputSummary?: unknown;
  latencyMs?: number;
  errorCode?: string;
}) {
  const run = await prisma.traceRun.findUnique({
    where: { runId: input.runId },
    select: { id: true }
  });
  if (!run) return null;
  return prisma.traceStep.upsert({
    where: {
      traceRunId_sequence: {
        traceRunId: run.id,
        sequence: input.sequence
      }
    },
    update: {},
    create: {
      traceRunId: run.id,
      sequence: input.sequence,
      kind: input.kind,
      name: input.name,
      status: input.status ?? "OK",
      inputSummary:
        input.inputSummary === undefined
          ? undefined
          : (maskTracePayload(input.inputSummary) as any),
      outputSummary:
        input.outputSummary === undefined
          ? undefined
          : (maskTracePayload(input.outputSummary) as any),
      latencyMs: Math.max(0, Math.round(input.latencyMs ?? 0)),
      errorCode: input.errorCode
    }
  });
}

export async function completePersistentTraceRun(input: {
  runId: string;
  status: TraceRunStatus;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  latencyMs: number;
  fallbackReason?: string;
  errorType?: string;
  finalState: string;
}) {
  return prisma.traceRun.update({
    where: { runId: input.runId },
    data: {
      status: input.status,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      estimatedCostUsd: input.estimatedCostUsd,
      latencyMs: Math.max(0, Math.round(input.latencyMs)),
      fallbackReason: input.fallbackReason,
      errorType: input.errorType,
      finalState: input.finalState,
      completedAt: new Date()
    }
  });
}

export async function getTraceReplay(runId: string, actor: CurrentUser) {
  const run = await prisma.traceRun.findUnique({
    where: { runId },
    include: {
      steps: { orderBy: { sequence: "asc" } },
      badCases: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!run || !run.userId || !canAccessOwnedResource(actor, run.userId)) {
    return null;
  }
  return {
    runId: run.runId,
    sessionId: run.sessionId ?? undefined,
    attemptId: run.attemptId ?? undefined,
    name: run.name,
    workflowVersion: run.workflowVersion,
    promptVersion: run.promptVersion ?? undefined,
    model: run.model ?? undefined,
    status: run.status,
    inputRefs: run.inputRefs,
    usage: {
      inputTokens: run.inputTokens,
      outputTokens: run.outputTokens,
      estimatedCostUsd: run.estimatedCostUsd,
      latencyMs: run.latencyMs ?? 0
    },
    fallbackReason: run.fallbackReason ?? undefined,
    errorType: run.errorType ?? undefined,
    finalState: run.finalState ?? undefined,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString(),
    badCases: run.badCases.map((badCase) => ({
      id: badCase.id,
      type: badCase.type,
      status: badCase.status,
      severity: badCase.severity,
      rootCauseLabel: badCase.rootCauseLabel ?? undefined,
      regressionRef: badCase.regressionRef ?? undefined,
      createdAt: badCase.createdAt.toISOString()
    })),
    steps: run.steps.map((step) => ({
      sequence: step.sequence,
      kind: step.kind,
      name: step.name,
      status: step.status,
      inputSummary: step.inputSummary,
      outputSummary: step.outputSummary,
      latencyMs: step.latencyMs,
      errorCode: step.errorCode ?? undefined,
      createdAt: step.createdAt.toISOString()
    }))
  };
}
