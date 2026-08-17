import { createTraceRunId } from "@/lib/observability/trace";
import { hashTraceIdentifier } from "@/lib/observability/redaction";
import { withTimeoutFallback } from "@/lib/ai/runtime-guard";
import { prisma } from "@/lib/repositories/prisma-client";
import type { CurrentUser, Difficulty, InterviewModule } from "@/lib/domain/types";
import { retrieveInterviewPatterns } from "./interview-pattern-service";

export async function retrieveCandidateEvidence(input: {
  actor: Pick<CurrentUser, "id">;
  query: string;
  limit?: number;
}) {
  const rows = await prisma.memoryItem.findMany({
    where: {
      userId: input.actor.id,
      type: "FACT",
      status: "CONFIRMED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  const terms = tokenize(input.query);
  return rows
    .map((row) => {
      const value = row.value as Record<string, unknown>;
      const claim = typeof value.claim === "string" ? value.claim : JSON.stringify(value);
      const normalized = tokenize(claim);
      const lexical = terms.length
        ? terms.filter((term) => normalized.includes(term)).length / terms.length
        : 0;
      return {
        id: row.id,
        sourceRef: row.sourceRef,
        claim,
        confidence: row.confidence,
        score: Math.round((lexical * 0.7 + row.confidence * 0.3) * 1000) / 1000
      };
    })
    .filter((row) => !terms.length || row.score > row.confidence * 0.3)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.min(Math.max(input.limit ?? 5, 1), 20));
}

export async function getTrainingMemory(input: { actor: Pick<CurrentUser, "id">; limit?: number }) {
  const rows = await prisma.memoryItem.findMany({
    where: {
      userId: input.actor.id,
      type: { in: ["WEAKNESS", "TRAINING_STATE"] },
      status: "CONFIRMED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    },
    orderBy: { updatedAt: "desc" },
    take: Math.min(Math.max(input.limit ?? 10, 1), 30)
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    sourceRef: row.sourceRef,
    value: row.value,
    confidence: row.confidence,
    updatedAt: row.updatedAt.toISOString()
  }));
}

export async function retrieveDualDomain(input: {
  actor: CurrentUser;
  query: string;
  module?: InterviewModule;
  difficulty?: Difficulty;
  company?: string;
  targetRole?: string;
  competency?: string;
  projectKeyword?: string;
  limit?: number;
  runtime?: {
    timeoutMs?: number;
    candidateRetriever?: typeof retrieveCandidateEvidence;
    patternRetriever?: typeof retrieveInterviewPatterns;
  };
}) {
  const startedAt = performance.now();
  const filters = {
    module: input.module,
    difficulty: input.difficulty,
    company: input.company,
    targetRole: input.targetRole,
    competency: input.competency,
    projectKeyword: input.projectKeyword
  };
  const timeoutMs = input.runtime?.timeoutMs ?? retrievalTimeoutMs();
  const candidateRetriever = input.runtime?.candidateRetriever ?? retrieveCandidateEvidence;
  const patternRetriever = input.runtime?.patternRetriever ?? retrieveInterviewPatterns;
  const [candidateResult, knowledgeResult] = await Promise.all([
    withTimeoutFallback({
      operation: () =>
        candidateRetriever({
          actor: input.actor,
          query: input.query,
          limit: input.limit
        }),
      fallback: () => [],
      timeoutMs
    }),
    withTimeoutFallback({
      operation: () =>
        patternRetriever({
          query: input.query,
          ...filters,
          limit: input.limit
        }),
      fallback: () => ({
        candidates: 0,
        excludedUnsafe: 0,
        selected: [],
        degraded: true,
        degradationReason: "INTERVIEW_PATTERN_ZERO_RECALL"
      }),
      timeoutMs
    })
  ]);
  const candidateEvidence = candidateResult.value;
  const interviewKnowledge = knowledgeResult.value;
  const traceId = createTraceRunId();
  const degradationReasons = [
    ...(candidateResult.degraded
      ? [`USER_EVIDENCE_${candidateResult.reason}`]
      : candidateEvidence.length
        ? []
        : ["USER_EVIDENCE_ZERO_RECALL"]),
    ...(knowledgeResult.degraded
      ? [`INTERVIEW_PATTERN_${knowledgeResult.reason}`]
      : interviewKnowledge.degradationReason
        ? [interviewKnowledge.degradationReason]
        : [])
  ];
  const trace = await prisma.ragRetrievalTrace.create({
    data: {
      userId: input.actor.id,
      phase: "DUAL_DOMAIN_RETRIEVAL",
      query: `[HASHED:${hashTraceIdentifier(input.query)}]`,
      keywords: tokenize(input.query)
        .slice(0, 30)
        .map((term) => hashTraceIdentifier(term)),
      candidates: {
        filters,
        candidateEvidence: candidateEvidence.map((item) => ({
          id: item.id,
          score: item.score,
          sourceRef: item.sourceRef
        })),
        interviewKnowledge: interviewKnowledge.selected.map((item) => ({
          id: item.id,
          score: item.score,
          rightsStatus: item.rightsStatus
        })),
        excludedUnsafe: interviewKnowledge.excludedUnsafe
      },
      selected: {
        traceId,
        evidenceRefs: candidateEvidence.map((item) => item.id),
        patternRefs: interviewKnowledge.selected.map((item) => item.id),
        degradationReasons
      },
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt))
    }
  });

  return {
    traceId: trace.id,
    filters,
    candidateEvidence,
    interviewKnowledge: interviewKnowledge.selected,
    selectedRefs: [
      ...candidateEvidence.map((item) => `memory:${item.id}`),
      ...interviewKnowledge.selected.map((item) => `pattern:${item.id}`)
    ],
    degraded: degradationReasons.length > 0,
    degradationReasons,
    latencyMs: trace.latencyMs
  };
}

function retrievalTimeoutMs() {
  const value = Number(process.env.RAG_RETRIEVAL_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : 1500;
}

function tokenize(value: string) {
  return [
    ...(value.toLowerCase().match(/[a-z0-9][a-z0-9.+#/-]*/g) ?? []),
    ...(value.normalize("NFKC").match(/[\u3400-\u9fff]{2}/g) ?? [])
  ];
}
