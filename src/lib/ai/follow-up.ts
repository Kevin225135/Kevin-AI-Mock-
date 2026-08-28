import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/repositories/prisma-client";
import type { Difficulty, InterviewModule } from "@/lib/domain/types";
import type { FollowUpAction } from "./follow-up-decision";
export { decideFollowUp } from "./follow-up-decision";

export async function createFollowUpQuestion(input: {
  module: InterviewModule;
  targetRole: string;
  difficulty: Difficulty;
  originalPrompt: string;
  answer: string;
  round: number;
  decision: Extract<FollowUpAction, "DEEPEN" | "CHALLENGE">;
}) {
  const prompt =
    input.decision === "CHALLENGE"
      ? `请重新聚焦这道题，并补充必要背景：你的具体角色、目标和需要解决的核心问题是什么？`
      : buildDeepenPrompt(input.answer);
  const row = await prisma.questionBank.create({
    data: {
      externalId: `followup-${randomUUID()}`,
      module: input.module,
      targetRole: input.targetRole,
      difficulty: input.difficulty,
      prompt,
      expectation: `动态追问第 ${input.round + 1} 轮；必须紧扣原题“${input.originalPrompt.slice(0, 120)}”，不得重复已知信息。`
    }
  });
  return row.id;
}

function buildDeepenPrompt(answer: string) {
  if (
    /\d+[%x]?|\d+\s*(人|天|周|月|元|万)/i.test(answer) &&
    !/(因为|依据|验证|because|validated)/i.test(answer)
  )
    return "你提到了量化结果。这个结果如何计算和验证？你如何排除其他因素的影响？";
  if (!/(我|I)\s*(负责|主导|设计|实施|led|built|implemented)/i.test(answer))
    return "请区分团队成果和你的个人贡献：你具体做了什么，哪个决策由你负责？";
  return "当时最困难的取舍是什么？你考虑了哪些替代方案，为什么选择最终方案？";
}
