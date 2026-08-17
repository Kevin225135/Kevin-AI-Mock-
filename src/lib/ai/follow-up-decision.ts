export type FollowUpAction = "DEEPEN" | "CHALLENGE" | "NEXT" | "STOP";

export type FollowUpReasonCode =
  | "MISSING_EVIDENCE"
  | "VAGUE_OWNERSHIP"
  | "METRIC_UNCLEAR"
  | "OFF_TOPIC"
  | "COMPLETE";

export type FollowUpTool =
  | "retrieve_candidate_evidence"
  | "retrieve_interview_patterns"
  | "get_training_memory"
  | "none";

export type FollowUpDecision = {
  action: FollowUpAction;
  reasonCode: FollowUpReasonCode;
  confidence: number;
  tool: FollowUpTool;
  evidenceRefs: string[];
  fallbackUsed: boolean;
};

export function decideFollowUp(
  answer: string,
  totalScore: number,
  round: number
): FollowUpDecision {
  if (round >= 2) {
    return decision("STOP", "COMPLETE", 1);
  }

  const normalized = answer.trim();
  const hasOwnership =
    /(我|\bI\b)\s*(负责|主导|设计|实施|分析|推进|led|built|implemented|designed)/i.test(normalized);
  const hasMetric = /\d+(?:\.\d+)?[%x]?|\d+\s*(人|天|周|月|元|万|秒|ms)/i.test(normalized);
  const hasValidation = /(验证|口径|基线|对照|排除|归因|validated|baseline|control)/i.test(
    normalized
  );
  const appearsRelevant =
    /(项目|产品|用户|业务|系统|市场|团队|决策|问题|结果|project|product|user|business|system|market|team|result)/i.test(
      normalized
    );

  if (totalScore >= 85 && normalized.length >= 260) {
    return decision("STOP", "COMPLETE", 0.96);
  }
  if (normalized.length < 35 || !appearsRelevant) {
    return decision("CHALLENGE", "OFF_TOPIC", 0.94);
  }
  if (!hasOwnership) {
    return decision("CHALLENGE", "VAGUE_OWNERSHIP", 0.9, "retrieve_candidate_evidence");
  }
  if (hasMetric && !hasValidation) {
    return decision("DEEPEN", "METRIC_UNCLEAR", 0.9, "retrieve_candidate_evidence");
  }
  if (totalScore >= 75 && normalized.length >= 180) {
    return decision("NEXT", "COMPLETE", 0.84);
  }
  return decision("DEEPEN", "MISSING_EVIDENCE", 0.82, "retrieve_candidate_evidence");
}

export function guardFollowUpDecision(input: {
  candidate: unknown;
  answer: string;
  totalScore: number;
  round: number;
  minimumConfidence?: number;
}): FollowUpDecision {
  const fallback = () => ({
    ...decideFollowUp(input.answer, input.totalScore, input.round),
    fallbackUsed: true
  });
  if (!isRecord(input.candidate)) return fallback();
  const action = input.candidate.action ?? input.candidate.decision;
  const reasonCode = input.candidate.reasonCode ?? input.candidate.reason_code;
  const confidence = input.candidate.confidence;
  const tool = input.candidate.tool;
  const evidenceRefs = input.candidate.evidenceRefs ?? input.candidate.evidence_refs;
  if (
    !followUpActions.includes(action as FollowUpAction) ||
    !followUpReasons.includes(reasonCode as FollowUpReasonCode) ||
    !followUpTools.includes(tool as FollowUpTool) ||
    typeof confidence !== "number" ||
    confidence < (input.minimumConfidence ?? 0.65) ||
    confidence > 1 ||
    !Array.isArray(evidenceRefs) ||
    evidenceRefs.some((value) => typeof value !== "string")
  ) {
    return fallback();
  }
  if (input.round >= 2) {
    return { ...decision("STOP", "COMPLETE", 1), fallbackUsed: true };
  }
  return {
    action: action as FollowUpAction,
    reasonCode: reasonCode as FollowUpReasonCode,
    confidence,
    tool: tool as FollowUpTool,
    evidenceRefs: (evidenceRefs as string[]).slice(0, 20),
    fallbackUsed: false
  };
}

export function buildFollowUpDecisionPrompt(input: {
  question: string;
  answer: string;
  round: number;
}) {
  return [
    "You are a bounded interview follow-up agent.",
    "Choose exactly one action: DEEPEN, CHALLENGE, NEXT, or STOP.",
    "Choose one reason_code: MISSING_EVIDENCE, VAGUE_OWNERSHIP, METRIC_UNCLEAR, OFF_TOPIC, or COMPLETE.",
    "You may suggest only read tools: retrieve_candidate_evidence, retrieve_interview_patterns, get_training_memory, or none.",
    "Never suggest a state-changing tool. STOP when round >= 2.",
    `Question: ${input.question}`,
    `Answer: ${input.answer}`,
    `Current round: ${input.round}`,
    "Return JSON only: { decision, reason_code, evidence_refs, tool, next_question, confidence }."
  ].join("\n");
}

function decision(
  action: FollowUpAction,
  reasonCode: FollowUpReasonCode,
  confidence: number,
  tool: FollowUpTool = "none"
): FollowUpDecision {
  return {
    action,
    reasonCode,
    confidence,
    tool,
    evidenceRefs: [],
    fallbackUsed: false
  };
}

const followUpActions: FollowUpAction[] = ["DEEPEN", "CHALLENGE", "NEXT", "STOP"];
const followUpReasons: FollowUpReasonCode[] = [
  "MISSING_EVIDENCE",
  "VAGUE_OWNERSHIP",
  "METRIC_UNCLEAR",
  "OFF_TOPIC",
  "COMPLETE"
];
const followUpTools: FollowUpTool[] = [
  "retrieve_candidate_evidence",
  "retrieve_interview_patterns",
  "get_training_memory",
  "none"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
