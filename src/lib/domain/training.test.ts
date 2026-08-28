import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEquivalentRetestPrompt,
  deriveWeaknessCandidates,
  evaluateRetestOutcome
} from "./training";
import type { Report } from "./types";

const report: Report = {
  id: "report-1",
  sessionId: "session-1",
  summary: "summary",
  averageScore: 60,
  dimensionAverages: {
    starCompleteness: 2,
    logicStructure: 3,
    contentDepth: 1,
    communication: 3
  },
  questionFeedback: [
    {
      questionId: "question-1",
      initialAttemptId: "answer-1",
      latestAttemptId: "answer-1",
      attemptNo: 1,
      attemptCount: 1,
      prompt: "请介绍一次产品决策。",
      answer: "answer",
      totalScore: 60,
      dimensions: {
        starCompleteness: 2,
        logicStructure: 3,
        contentDepth: 1,
        communication: 3
      },
      deductions: ["缺少量化证据"],
      improvements: ["补充指标和取舍"],
      sampleAnswer: "sample"
    }
  ],
  nextPracticePlan: [],
  createdAt: new Date().toISOString()
};

test("derives at most three evidence-backed weaknesses in score order", () => {
  const candidates = deriveWeaknessCandidates(report);
  assert.equal(candidates.length, 3);
  assert.equal(candidates[0].dimension, "CONTENT_DEPTH");
  assert.equal(candidates[0].sourceAnswerId, "answer-1");
  assert.match(candidates[0].evidenceSummary, /缺少量化证据/);
  assert.equal(candidates[0].severity, "HIGH");
});

test("builds a changed but anchored equivalent retest question", () => {
  const originalPrompt = "请介绍一次产品决策。";
  const prompt = buildEquivalentRetestPrompt({
    module: "BEHAVIORAL",
    targetRole: "Product Manager",
    dimension: "LOGIC_STRUCTURE",
    originalPrompt
  });
  assert.notEqual(prompt, originalPrompt);
  assert.match(prompt, /不同于上一题/);
  assert.match(prompt, /先给结论/);
  assert.match(prompt, /请介绍一次产品决策/);
});

test("updates retest outcome using deterministic score thresholds", () => {
  assert.equal(evaluateRetestOutcome(2, 2), "NOT_IMPROVED");
  assert.equal(evaluateRetestOutcome(2, 3), "IMPROVING");
  assert.equal(evaluateRetestOutcome(2, 4), "PASSED");
});
