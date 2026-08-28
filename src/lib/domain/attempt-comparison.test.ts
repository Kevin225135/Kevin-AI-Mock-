import assert from "node:assert/strict";
import test from "node:test";
import { compareAnswerAttempts } from "./attempt-comparison";
import type { AiScore, AnswerRecord } from "./types";

const sourceAttempt: AnswerRecord = {
  id: "answer-1",
  sessionId: "session-1",
  questionId: "question-1",
  content: "我参与了项目，但结果还没有详细说明。",
  followUpRound: 0,
  attemptNo: 1,
  attemptKind: "INITIAL",
  submittedAt: "2026-08-17T00:00:00.000Z"
};

const sourceScore = score("score-1", "answer-1", 60, [2, 3, 3, 4]);

test("compares retry attempts only under the same rubric version", () => {
  const retryAttempt: AnswerRecord = {
    ...sourceAttempt,
    id: "answer-2",
    content: "我的结论是转化率提升了 18%。我主导实验设计，并说明了方案取舍。",
    attemptNo: 2,
    attemptKind: "RETRY",
    parentAnswerId: sourceAttempt.id
  };
  const retryScore = score("score-2", "answer-2", 78, [4, 4, 4, 4]);

  const comparison = compareAnswerAttempts({
    sourceAttempt,
    sourceScore,
    retryAttempt,
    retryScore
  });

  assert.equal(comparison.totalDelta, 18);
  assert.deepEqual(comparison.dimensionDeltas.map((item) => item.delta), [2, 1, 1, 0]);
  assert.equal(comparison.adoptedActions.length, 2);
});

test("rejects comparisons when rubric versions differ", () => {
  const retryAttempt: AnswerRecord = {
    ...sourceAttempt,
    id: "answer-2",
    attemptNo: 2,
    attemptKind: "RETRY",
    parentAnswerId: sourceAttempt.id
  };
  const retryScore = {
    ...score("score-2", "answer-2", 70, [3, 3, 4, 4]),
    rubricVersionId: "rubric-2"
  };

  assert.throws(
    () => compareAnswerAttempts({ sourceAttempt, sourceScore, retryAttempt, retryScore }),
    (error: unknown) =>
      error instanceof Error && error.message.includes("Rubric 版本")
  );
});

function score(
  id: string,
  answerId: string,
  totalScore: number,
  dimensions: [number, number, number, number]
): AiScore {
  return {
    id,
    sessionId: "session-1",
    answerId,
    rubricVersionId: "rubric-1",
    dimensions: {
      starCompleteness: dimensions[0],
      logicStructure: dimensions[1],
      contentDepth: dimensions[2],
      communication: dimensions[3]
    },
    totalScore,
    deductions: [],
    improvements: ["补充量化结果", "先说结论并明确逻辑结构"],
    sampleAnswer: "sample",
    reasoning: "reasoning",
    rawJson: {},
    createdAt: "2026-08-17T00:00:00.000Z"
  };
}

