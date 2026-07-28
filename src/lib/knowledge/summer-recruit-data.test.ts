import assert from "node:assert/strict";
import test from "node:test";
import { summerRecruitKnowledge } from "./summer-recruit-data";

test("local knowledge is bilingual, traceable, and privacy-screened", () => {
  assert.ok(summerRecruitKnowledge.length >= 20);
  assert.equal(new Set(summerRecruitKnowledge.map((item) => item.slug)).size, summerRecruitKnowledge.length);
  assert.ok(summerRecruitKnowledge.every((item) =>
    item.titleZh && item.titleEn && item.contentZh && item.contentEn &&
    item.sourceUrl.startsWith("local-source://")
  ));
  const serialized = JSON.stringify(summerRecruitKnowledge);
  for (const forbidden of ["身份证", "银行回单", "学生卡", "@outlook.com"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
