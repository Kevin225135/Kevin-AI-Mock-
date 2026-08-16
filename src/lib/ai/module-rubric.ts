import type { InterviewModule, ScoreDimension } from "@/lib/domain/types";

export type ModuleRubric = {
  weights: Record<ScoreDimension, number>;
  completenessLabel: string;
  completenessCriteria: string;
  depthCriteria: string;
};

const rubrics: Record<InterviewModule, ModuleRubric> = {
  BEHAVIORAL: {
    weights: {
      starCompleteness: 0.3,
      logicStructure: 0.25,
      contentDepth: 0.25,
      communication: 0.2
    },
    completenessLabel: "STAR 完整度",
    completenessCriteria: "背景、任务、个人行动、量化结果和复盘形成完整证据链",
    depthCriteria: "具体细节、个人贡献、取舍依据、可验证结果"
  },
  CV_RELATED: {
    weights: {
      starCompleteness: 0.3,
      logicStructure: 0.25,
      contentDepth: 0.25,
      communication: 0.2
    },
    completenessLabel: "经历证据完整度",
    completenessCriteria: "简历事实、个人贡献、结果证据和岗位关联完整且不编造",
    depthCriteria: "经历细节、所有权、指标口径、岗位能力映射"
  },
  TECHNICAL: {
    weights: {
      starCompleteness: 0.1,
      logicStructure: 0.25,
      contentDepth: 0.45,
      communication: 0.2
    },
    completenessLabel: "技术答案完整度",
    completenessCriteria: "覆盖核心概念、关键步骤、假设、风险和验证方法",
    depthCriteria: "技术准确性、边界条件、方案权衡、失败模式和验证"
  },
  MARKET: {
    weights: {
      starCompleteness: 0.1,
      logicStructure: 0.3,
      contentDepth: 0.4,
      communication: 0.2
    },
    completenessLabel: "观点证据完整度",
    completenessCriteria: "观点、事实依据、传导机制、反方因素和失效条件完整",
    depthCriteria: "市场事实、因果链、情景分析、边界条件和反证信号"
  }
};

export function getModuleRubric(module: InterviewModule) {
  return rubrics[module];
}
