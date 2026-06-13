import { dimensionLabels, scoreDimensions } from "./constants";
import type {
  DimensionScores,
  MockSession,
  Report,
  ReportQuestionFeedback
} from "./types";

export function buildReport(session: MockSession): Omit<Report, "id" | "createdAt"> {
  const feedback: ReportQuestionFeedback[] = session.questions.map((question) => {
    const answer = session.answers.find(
      (candidate) => candidate.questionId === question.id
    );
    const score = answer
      ? session.scores.find((candidate) => candidate.answerId === answer.id)
      : undefined;

    return {
      questionId: question.id,
      prompt: question.prompt,
      answer: answer?.content ?? "",
      totalScore: score?.totalScore ?? 0,
      dimensions: score?.dimensions ?? emptyDimensions(),
      deductions: score?.deductions ?? ["未生成评分。"],
      improvements: score?.improvements ?? ["重新提交答案后再生成复盘。"],
      sampleAnswer: score?.sampleAnswer ?? ""
    };
  });

  const averageScore = round(
    feedback.reduce((sum, item) => sum + item.totalScore, 0) /
      Math.max(feedback.length, 1)
  );
  const dimensionAverages = scoreDimensions.reduce((accumulator, dimension) => {
    accumulator[dimension] = round(
      feedback.reduce((sum, item) => sum + item.dimensions[dimension], 0) /
        Math.max(feedback.length, 1)
    );
    return accumulator;
  }, emptyDimensions());

  return {
    sessionId: session.id,
    summary: buildSummary(averageScore, dimensionAverages),
    averageScore,
    dimensionAverages,
    questionFeedback: feedback,
    nextPracticePlan: buildPracticePlan(dimensionAverages)
  };
}

function buildSummary(averageScore: number, dimensions: DimensionScores) {
  const weakest = findWeakestDimension(dimensions);
  const strongest = findStrongestDimension(dimensions);
  const band =
    averageScore >= 85 ? "已经具备较强面试竞争力" : averageScore >= 70 ? "基础可用，但还需要打磨" : "需要先补齐回答骨架";

  return `${band}。当前优势是${dimensionLabels[strongest]}，下一轮优先提升${dimensionLabels[weakest]}。`;
}

function buildPracticePlan(dimensions: DimensionScores) {
  const weakest = findWeakestDimension(dimensions);
  const plans: Record<keyof DimensionScores, string> = {
    starCompleteness:
      "下一次练习每题先写出 S/T/A/R 四个短句，再合并成 90 秒答案。",
    logicStructure:
      "下一次练习强制使用“结论 -> 依据 -> 行动 -> 结果”的四段结构。",
    contentDepth:
      "下一次练习至少加入一个数字、一个取舍和一个复盘点。",
    communication:
      "下一次练习把答案压缩到 180-260 字，删除和岗位能力无关的信息。"
  };

  return [
    plans[weakest],
    "复盘时标记每个扣分点是否可行动，只保留能在下一轮练习中验证的改进项。",
    "完成 3 场同模块练习后再对比分数趋势，避免单题波动误导判断。"
  ];
}

function findWeakestDimension(dimensions: DimensionScores) {
  return scoreDimensions
    .map((dimension) => [dimension, dimensions[dimension]] as const)
    .sort((a, b) => a[1] - b[1])[0][0];
}

function findStrongestDimension(dimensions: DimensionScores) {
  return scoreDimensions
    .map((dimension) => [dimension, dimensions[dimension]] as const)
    .sort((a, b) => b[1] - a[1])[0][0];
}

function emptyDimensions(): DimensionScores {
  return {
    starCompleteness: 0,
    logicStructure: 0,
    contentDepth: 0,
    communication: 0
  };
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
