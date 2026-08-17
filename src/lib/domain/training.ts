import type {
  DimensionScores,
  InterviewModule,
  Report,
  ScoreDimension,
  WeaknessDimension,
  WeaknessSeverity,
  WeaknessStatus
} from "./types";

export type WeaknessCandidate = {
  dimension: WeaknessDimension;
  title: string;
  sourceAnswerId: string;
  evidenceRef: string;
  evidenceSummary: string;
  severity: WeaknessSeverity;
  baselineScore: number;
};

const dimensionConfig: Record<
  ScoreDimension,
  { dimension: WeaknessDimension; title: string }
> = {
  starCompleteness: {
    dimension: "STAR_COMPLETENESS",
    title: "回答完整度"
  },
  logicStructure: {
    dimension: "LOGIC_STRUCTURE",
    title: "逻辑结构"
  },
  contentDepth: {
    dimension: "CONTENT_DEPTH",
    title: "内容深度"
  },
  communication: {
    dimension: "COMMUNICATION",
    title: "沟通表达"
  }
};

export const scoreDimensionByWeakness: Record<WeaknessDimension, ScoreDimension> = {
  STAR_COMPLETENESS: "starCompleteness",
  LOGIC_STRUCTURE: "logicStructure",
  CONTENT_DEPTH: "contentDepth",
  COMMUNICATION: "communication"
};

export function deriveWeaknessCandidates(report: Report): WeaknessCandidate[] {
  return (Object.keys(dimensionConfig) as ScoreDimension[])
    .filter((dimension) => report.dimensionAverages[dimension] < 4)
    .sort(
      (left, right) =>
        report.dimensionAverages[left] - report.dimensionAverages[right]
    )
    .slice(0, 3)
    .map((scoreDimension) => {
      const source = [...report.questionFeedback].sort(
        (left, right) =>
          left.dimensions[scoreDimension] - right.dimensions[scoreDimension]
      )[0];
      const baselineScore = source?.dimensions[scoreDimension] ?? 0;
      const deduction = source?.deductions[0] ?? "该维度低于稳定通过标准。";
      const improvement =
        source?.improvements[0] ?? "请在下一次练习中验证该维度。";
      const config = dimensionConfig[scoreDimension];

      return {
        dimension: config.dimension,
        title: config.title,
        sourceAnswerId: source?.latestAttemptId ?? "",
        evidenceRef: `answer:${source?.latestAttemptId ?? "missing"}`,
        evidenceSummary: `扣分依据：${deduction}；改进建议：${improvement}`,
        severity: severityForScore(baselineScore),
        baselineScore
      };
    })
    .filter((candidate) => Boolean(candidate.sourceAnswerId));
}

export function buildEquivalentRetestPrompt(input: {
  module: InterviewModule;
  targetRole: string;
  dimension: WeaknessDimension;
  originalPrompt: string;
}) {
  const focus: Record<WeaknessDimension, string> = {
    STAR_COMPLETENESS: "完整交代背景、个人任务、关键行动和可验证结果",
    LOGIC_STRUCTURE: "先给结论，再按依据、行动和结果展开",
    CONTENT_DEPTH: "补充量化证据、关键取舍和验证方法",
    COMMUNICATION: "在 90 秒内清晰、简洁地表达核心信息"
  };
  const scenario: Record<InterviewModule, string> = {
    BEHAVIORAL: "请换一个不同于上一题的真实经历",
    CV_RELATED: "请从简历中选择另一个可核验的项目或经历",
    TECHNICAL: "请把原问题放到一个约束条件不同的新场景中",
    MARKET: "请换一个相邻市场、公司或时间窗口"
  };

  return `${scenario[input.module]}，围绕 ${input.targetRole} 的同一项核心能力回答。重点做到：${focus[input.dimension]}。能力锚点：${input.originalPrompt}`;
}

export function evaluateRetestOutcome(
  baselineScore: number,
  latestScore: number
): Extract<WeaknessStatus, "NOT_IMPROVED" | "IMPROVING" | "PASSED"> {
  if (latestScore >= 4 && latestScore > baselineScore) {
    return "PASSED";
  }
  if (latestScore > baselineScore) {
    return "IMPROVING";
  }
  return "NOT_IMPROVED";
}

export function getRetestScore(
  dimensions: DimensionScores,
  dimension: WeaknessDimension
) {
  return dimensions[scoreDimensionByWeakness[dimension]];
}

function severityForScore(score: number): WeaknessSeverity {
  if (score <= 2) return "HIGH";
  if (score <= 3) return "MEDIUM";
  return "LOW";
}
