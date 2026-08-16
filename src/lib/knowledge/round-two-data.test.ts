import assert from "node:assert/strict";
import test from "node:test";
import { investmentBanking400, roundTwoKnowledge } from "./round-two-data";

test("builds exactly 400 unique bilingual investment-banking questions", () => {
  assert.equal(investmentBanking400.length, 400);
  assert.equal(new Set(investmentBanking400.map((item) => item.slug)).size, 400);
  assert.ok(investmentBanking400.every((item) =>
    item.titleZh && item.titleEn && item.summaryZh && item.summaryEn && item.sourceUrl
  ));
});

test("round-two knowledge covers required market and AI collections", () => {
  const categories = new Set(roundTwoKnowledge.map((item) => item.category));
  for (const category of [
    "A/H股·上市规则",
    "A/H股·市场动态",
    "AI产品·全流程",
    "AI产品·数据集",
    "AI基础知识",
    "Vibe Coding实操"
  ]) {
    assert.ok(categories.has(category), `missing ${category}`);
  }
});
