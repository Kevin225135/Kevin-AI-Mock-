import assert from "node:assert/strict";
import test from "node:test";
import { analyzeAnswerGaps, retrieveResumeQuestions } from "./retriever";

test("retrieves role-specific resume questions with evidence", () => {
  const result = retrieveResumeQuestions({
    resume: {
      rawText: "负责消息系统 API 和数据库架构，将 P95 延迟从 900ms 降低到 220ms。",
      companies: ["Example Technology"],
      roles: ["Software Engineer"],
      skills: ["API", "database"],
      projects: [{ name: "消息系统", description: "设计 API 架构并优化延迟", technologies: ["API"] }]
    },
    targetRole: "Software Engineer",
    difficulty: "HARD",
    limit: 3
  });
  assert.ok(result.selected.length > 0);
  assert.equal(result.selected[0].context.evidence.length > 0, true);
  assert.ok(result.selected.some((item) => item.context.competencyId === "swe-system-quality"));
});

test("answer retrieval asks for a missing validation method", () => {
  const analysis = analyzeAnswerGaps({
    answer: "我负责设计缓存方案并推动上线，最终接口延迟降低了 40%。",
    question: "请说明这次性能优化。",
    round: 0,
    context: {
      competencyId: "impact",
      competencyLabel: "结果与业务影响",
      evidence: [{ text: "接口延迟降低 40%", source: "project", matchedKeywords: ["降低"] }],
      expectedSignals: ["个人职责", "量化结果", "结果验证"],
      researchSources: []
    }
  });
  assert.equal(analysis.decision, "DEEPEN");
  assert.ok(analysis.missingSignals.includes("结果验证"));
  assert.match(analysis.followUpQuestion ?? "", /验证|计算/);
});

test("answer retrieval closes after two rounds", () => {
  assert.equal(analyzeAnswerGaps({
    answer: "任意回答", question: "问题", round: 2
  }).decision, "CLOSE");
});
