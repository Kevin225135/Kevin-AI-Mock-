import assert from "node:assert/strict";
import test from "node:test";
import { scoreAnswer } from "./scorer";

test("credits counter-evidence and invalidation conditions in market answers", async () => {
  const previousProvider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "local";
  try {
    const score = await scoreAnswer({
      question: {
        id: "market-regression",
        module: "MARKET",
        targetRole: "Product Manager",
        difficulty: "MEDIUM",
        prompt: "你如何判断生成式 AI 面试产品的市场机会？"
      },
      answer:
        "我的观点是需求存在但留存是关键约束。依据是求职高频且反馈稀缺，传导机制是更短反馈周期提升练习频次；反方因素包括免费内容和低付费意愿。若7日复测率低于目标或重答后无改善，我会判定当前闭环未被验证。"
    });

    assert.ok(score.dimensions.logicStructure >= 4);
    assert.ok(score.dimensions.contentDepth >= 4);
  } finally {
    if (previousProvider === undefined) {
      delete process.env.AI_PROVIDER;
    } else {
      process.env.AI_PROVIDER = previousProvider;
    }
  }
});

