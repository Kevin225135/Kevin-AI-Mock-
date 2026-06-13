import type { Difficulty, InterviewModule, ScoreDimension } from "./types";

export const moduleOptions: Array<{
  value: InterviewModule;
  label: string;
  description: string;
}> = [
  {
    value: "BEHAVIORAL",
    label: "Behavioral",
    description: "行为面试、领导力、冲突处理、失败复盘"
  },
  {
    value: "CV_RELATED",
    label: "CV-related",
    description: "简历深挖、项目经历、岗位动机"
  },
  {
    value: "TECHNICAL",
    label: "Technical",
    description: "岗位硬技能、分析框架、专业概念"
  },
  {
    value: "MARKET",
    label: "Market",
    description: "市场观点、行业趋势、商业判断"
  }
];

export const roleOptions = [
  "Investment Banking Analyst",
  "Strategy Consultant",
  "Product Manager",
  "Software Engineer"
] as const;

export const difficultyOptions: Array<{
  value: Difficulty;
  label: string;
}> = [
  { value: "EASY", label: "基础" },
  { value: "MEDIUM", label: "标准" },
  { value: "HARD", label: "挑战" }
];

export const dimensionLabels: Record<ScoreDimension, string> = {
  starCompleteness: "STAR 完整度",
  logicStructure: "逻辑结构",
  contentDepth: "内容深度",
  communication: "表达清晰度"
};

export const scoreDimensions = Object.keys(
  dimensionLabels
) as ScoreDimension[];
