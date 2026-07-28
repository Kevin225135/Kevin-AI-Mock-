import type { InterviewModule } from "@/lib/domain/types";

export type CompetencyKeyword = {
  id: string;
  label: string;
  roles: string[];
  modules: InterviewModule[];
  aliases: string[];
  expectedSignals: string[];
  questionFocus: string;
};

const common: CompetencyKeyword[] = [
  {
    id: "leadership",
    label: "领导力与协作",
    roles: ["*"],
    modules: ["BEHAVIORAL", "CV_RELATED"],
    aliases: ["leadership", "led", "managed", "mentored", "stakeholder", "领导", "带领", "管理", "协调", "跨部门", "干系人"],
    expectedSignals: ["个人职责", "关键行动", "利益相关方", "冲突或阻力", "可量化结果"],
    questionFocus: "你如何推动不同角色达成一致，以及哪些结果能证明你的影响"
  },
  {
    id: "problem-solving",
    label: "问题分析与解决",
    roles: ["*"],
    modules: ["BEHAVIORAL", "CV_RELATED", "TECHNICAL"],
    aliases: ["analysis", "analyzed", "diagnosed", "root cause", "problem solving", "分析", "诊断", "根因", "解决问题", "拆解"],
    expectedSignals: ["问题背景", "分析方法", "关键假设", "决策依据", "验证结果"],
    questionFocus: "你如何定位根因、比较方案并验证最终判断"
  },
  {
    id: "impact",
    label: "结果与业务影响",
    roles: ["*"],
    modules: ["BEHAVIORAL", "CV_RELATED", "MARKET"],
    aliases: ["impact", "improved", "increased", "reduced", "saved", "grew", "提升", "增长", "降低", "节省", "结果", "影响"],
    expectedSignals: ["基准值", "量化结果", "指标口径", "个人贡献", "结果验证"],
    questionFocus: "这项成果如何衡量、如何归因，以及你的个人贡献是什么"
  },
];

const roleSpecific: CompetencyKeyword[] = [
  {
    id: "pm-discovery-metrics",
    label: "用户洞察与产品指标",
    roles: ["Product Manager"],
    modules: ["CV_RELATED", "TECHNICAL"],
    aliases: ["product", "roadmap", "user research", "experiment", "a/b", "conversion", "retention", "产品", "用户研究", "路线图", "实验", "转化率", "留存"],
    expectedSignals: ["用户问题", "数据或研究证据", "方案取舍", "核心指标", "实验验证"],
    questionFocus: "你如何从用户证据形成产品判断，并用指标验证方案"
  },
  {
    id: "swe-system-quality",
    label: "系统设计与工程质量",
    roles: ["Software Engineer"],
    modules: ["CV_RELATED", "TECHNICAL"],
    aliases: ["architecture", "distributed", "api", "database", "latency", "scalability", "reliability", "testing", "架构", "分布式", "接口", "数据库", "延迟", "扩展性", "可靠性", "测试"],
    expectedSignals: ["技术约束", "方案比较", "关键实现", "性能或可靠性指标", "故障与复盘"],
    questionFocus: "你如何在性能、可靠性和复杂度之间做技术取舍"
  },
  {
    id: "consulting-structured-analysis",
    label: "结构化分析与商业判断",
    roles: ["Strategy Consultant"],
    modules: ["CV_RELATED", "TECHNICAL", "MARKET"],
    aliases: ["strategy", "market sizing", "profitability", "framework", "benchmark", "client", "战略", "市场规模", "盈利", "框架", "对标", "客户"],
    expectedSignals: ["问题拆解", "假设", "分析数据", "洞察", "客户影响"],
    questionFocus: "你如何结构化拆解问题，并把分析转化成可执行建议"
  },
  {
    id: "ib-valuation-deal",
    label: "估值、建模与交易执行",
    roles: ["Investment Banking Analyst"],
    modules: ["CV_RELATED", "TECHNICAL", "MARKET"],
    aliases: ["valuation", "dcf", "comps", "transaction", "m&a", "financial model", "ebitda", "估值", "建模", "并购", "交易", "可比公司", "现金流"],
    expectedSignals: ["交易或分析背景", "建模方法", "关键假设", "敏感性或风险", "结论与影响"],
    questionFocus: "你如何选择关键假设、检查模型，并把结果用于交易判断"
  }
];

export const competencyKeywordLibrary = [...common, ...roleSpecific];

export const keywordResearchSources = [
  "O*NET Content Model: skills, knowledge, tasks and work activities",
  "ESCO occupation-skill taxonomy and multilingual skill labels",
  "ACL 2025 multilingual skill extraction with ESCO alignment"
];

export function competenciesForRole(targetRole: string) {
  const normalized = targetRole.trim().toLowerCase();
  return competencyKeywordLibrary.filter((item) =>
    item.roles.includes("*") ||
    item.roles.some((role) => normalized.includes(role.toLowerCase()))
  );
}

export function extractTaxonomyKeywords(text: string) {
  const normalized = text.toLowerCase();
  return [...new Set(
    competencyKeywordLibrary.flatMap((competency) =>
      competency.aliases.filter((alias) => normalized.includes(alias.toLowerCase()))
    )
  )];
}
