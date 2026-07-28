import assert from "node:assert/strict";
import test from "node:test";
import { decideFollowUp } from "./follow-up-decision";

test("clarifies vague answers", () => {
  assert.equal(decideFollowUp("我们沟通后完成了项目。", 40, 0), "CLARIFY");
});

test("deepens answers with evidence gaps", () => {
  assert.equal(
    decideFollowUp("我负责重新设计整个流程，先协调产品、工程和业务团队确认范围，再按周跟进实施并同步风险。最终转化率提升了 12%，项目按时完成交付，团队也复用了这套流程，但我还没有说明指标如何计算和验证。", 72, 0),
    "DEEPEN"
  );
});

test("stops after two rounds", () => {
  assert.equal(decideFollowUp("简短回答", 20, 2), "CLOSE");
});
