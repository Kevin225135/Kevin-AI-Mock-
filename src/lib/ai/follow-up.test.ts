import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFollowUpDecisionPrompt,
  decideFollowUp,
  guardFollowUpDecision
} from "./follow-up-decision";

test("challenges vague or off-topic answers with an enum reason", () => {
  assert.deepEqual(decideFollowUp("我们沟通了一下。", 40, 0), {
    action: "CHALLENGE",
    reasonCode: "OFF_TOPIC",
    confidence: 0.94,
    tool: "none",
    evidenceRefs: [],
    fallbackUsed: false
  });
});

test("deepens answers whose metric lacks validation", () => {
  const result = decideFollowUp(
    "我负责重新设计产品流程并推进实施，最终注册转化率提升了 12%，团队按时完成交付。",
    72,
    0
  );
  assert.equal(result.action, "DEEPEN");
  assert.equal(result.reasonCode, "METRIC_UNCLEAR");
  assert.equal(result.tool, "retrieve_candidate_evidence");
});

test("stops deterministically after two rounds", () => {
  const result = decideFollowUp("简短回答", 20, 2);
  assert.equal(result.action, "STOP");
  assert.equal(result.reasonCode, "COMPLETE");
  assert.equal(result.confidence, 1);
});

test("decision prompt exposes read tools but no state mutation tool", () => {
  const prompt = buildFollowUpDecisionPrompt({
    question: "question",
    answer: "answer",
    round: 0
  });
  assert.match(prompt, /retrieve_candidate_evidence/);
  assert.doesNotMatch(prompt, /update_training_state/);
});

test("falls back deterministically for low-confidence or invalid agent output", () => {
  const result = guardFollowUpDecision({
    candidate: {
      action: "DELETE_MEMORY",
      reasonCode: "COMPLETE",
      confidence: 0.2,
      tool: "update_training_state",
      evidenceRefs: []
    },
    answer:
      "我主导产品实验并重新设计了用户流程，最终转化率提升 12%，但还没有补充基线、对照组和验证方法。",
    totalScore: 60,
    round: 0
  });
  assert.equal(result.action, "DEEPEN");
  assert.equal(result.fallbackUsed, true);
  assert.ok(
    [
      "retrieve_candidate_evidence",
      "retrieve_interview_patterns",
      "get_training_memory",
      "none"
    ].includes(result.tool)
  );
});

test("accepts a high-confidence snake-case agent contract", () => {
  const result = guardFollowUpDecision({
    candidate: {
      decision: "CHALLENGE",
      reason_code: "VAGUE_OWNERSHIP",
      confidence: 0.91,
      tool: "retrieve_candidate_evidence",
      evidence_refs: ["memory:fact-1"]
    },
    answer: "团队完成了产品上线。",
    totalScore: 55,
    round: 0
  });
  assert.equal(result.action, "CHALLENGE");
  assert.equal(result.reasonCode, "VAGUE_OWNERSHIP");
  assert.deepEqual(result.evidenceRefs, ["memory:fact-1"]);
  assert.equal(result.fallbackUsed, false);
});
