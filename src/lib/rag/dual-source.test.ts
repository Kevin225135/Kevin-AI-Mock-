import assert from "node:assert/strict";
import test from "node:test";
import { applyQuestionRefinements, shouldSearchWeb } from "./dual-source";
import type { RagQuestionCandidate } from "./retriever";

test("routes time-sensitive and market queries to web search", () => {
  assert.equal(shouldSearchWeb("最近港股IPO市场情况"), true);
  assert.equal(shouldSearchWeb("latest AI model news"), true);
  assert.equal(shouldSearchWeb("DCF的基本公式是什么"), false);
  assert.equal(shouldSearchWeb("2026年参与AI产品实习项目"), false);
});

test("falls back to the original prompt when LLM refinements collide", () => {
  const candidates = [candidate("原问题一", "leadership"), candidate("原问题二", "impact")];
  const refined = applyQuestionRefinements(candidates, [
    { index: 0, prompt: "重复问题" },
    { index: 1, prompt: "重复问题" }
  ]);
  assert.deepEqual(refined.map((item) => item.prompt), ["重复问题", "原问题二"]);
});

function candidate(prompt: string, competencyId: string): RagQuestionCandidate {
  return {
    prompt,
    expectation: "提供证据",
    keywords: [],
    score: 1,
    context: {
      competencyId,
      competencyLabel: competencyId,
      evidence: [{
        text: "简历证据",
        source: "resume-line",
        matchedKeywords: [],
        confirmationStatus: "UNCONFIRMED"
      }],
      expectedSignals: ["个人职责"],
      researchSources: []
    }
  };
}
