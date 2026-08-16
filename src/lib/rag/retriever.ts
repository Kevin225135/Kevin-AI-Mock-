import type { Difficulty, RagQuestionContext, ResumeProject } from "@/lib/domain/types";
import {
  competenciesForRole,
  keywordResearchSources,
  type CompetencyKeyword
} from "./keyword-library";

type ResumeDocument = {
  rawText: string;
  companies: string[];
  roles: string[];
  skills: string[];
  projects: ResumeProject[];
};

export type RagQuestionCandidate = {
  prompt: string;
  expectation: string;
  keywords: string[];
  context: RagQuestionContext;
  score: number;
};

export type AnswerGapAnalysis = {
  decision: "DEEPEN" | "CLARIFY" | "CLOSE";
  matchedKeywords: string[];
  coveredSignals: string[];
  missingSignals: string[];
  followUpQuestion?: string;
};

export function retrieveResumeQuestions(input: {
  resume: ResumeDocument;
  targetRole: string;
  difficulty: Difficulty;
  limit: number;
}) {
  const startedAt = performance.now();
  const evidence = buildEvidence(input.resume);
  const competencies = competenciesForRole(input.targetRole);
  const candidates = competencies
    .map((competency) => rankCompetency(competency, evidence, input.targetRole, input.difficulty))
    .filter((candidate) => candidate.context.evidence.length > 0)
    .sort((a, b) => b.score - a.score);

  const selected = diversify(candidates, input.limit);
  return {
    candidates,
    selected,
    latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
    query: `${input.targetRole} resume interview competencies`,
    keywords: [...new Set(selected.flatMap((item) => item.keywords))]
  };
}

export function analyzeAnswerGaps(input: {
  answer: string;
  question: string;
  context?: RagQuestionContext;
  round: number;
}): AnswerGapAnalysis {
  if (input.round >= 2) {
    return { decision: "CLOSE", matchedKeywords: [], coveredSignals: [], missingSignals: [] };
  }

  const text = normalize(input.answer);
  const hasConcreteSignal =
    /\d+(?:\.\d+)?[%x]?|\d+\s*(人|天|周|月|元|万|秒|ms)|负责|主导|设计|实现|分析|led|built|implemented/i
      .test(input.answer);
  if (input.answer.trim().length < 50 && !hasConcreteSignal) {
    return {
      decision: "CLARIFY",
      matchedKeywords: [],
      coveredSignals: [],
      missingSignals: ["问题背景", "个人职责", "关键行动"],
      followUpQuestion: `请先聚焦“${clip(input.question, 70)}”，说明当时的背景、你的具体职责和需要解决的核心问题。`
    };
  }

  const signals = input.context?.expectedSignals ?? [
    "问题背景", "个人职责", "关键行动", "决策依据", "可量化结果"
  ];
  const coverage = signals.map((signal) => ({
    signal,
    covered: signalCovered(signal, text)
  }));
  const coveredSignals = coverage.filter((item) => item.covered).map((item) => item.signal);
  const missingSignals = coverage.filter((item) => !item.covered).map((item) => item.signal);
  const matchedKeywords = (input.context?.evidence ?? [])
    .flatMap((item) => item.matchedKeywords)
    .filter((keyword) => includesAlias(text, keyword));

  if (!missingSignals.length || (missingSignals.length === 1 && input.answer.length >= 260)) {
    return { decision: "CLOSE", matchedKeywords, coveredSignals, missingSignals };
  }

  const primaryGap = missingSignals[0];
  const competency = input.context?.competencyLabel ?? "这项能力";
  return {
    decision: "DEEPEN",
    matchedKeywords: [...new Set(matchedKeywords)],
    coveredSignals,
    missingSignals,
    followUpQuestion: buildGapQuestion(primaryGap, competency, input.context)
  };
}

function rankCompetency(
  competency: CompetencyKeyword,
  evidence: ReturnType<typeof buildEvidence>,
  targetRole: string,
  difficulty: Difficulty
): RagQuestionCandidate {
  const keywordMatched = evidence
    .map((item) => {
      const matchedKeywords = competency.aliases.filter((alias) =>
        includesAlias(normalize(item.text), alias)
      );
      return { ...item, matchedKeywords };
    })
    .filter((item) => item.matchedKeywords.length > 0)
    .sort((a, b) =>
      b.matchedKeywords.length - a.matchedKeywords.length ||
      evidencePriority(b.source) - evidencePriority(a.source)
    )
    .slice(0, 3);
  const matched = keywordMatched.length > 0
    ? keywordMatched
    : evidence.slice(0, 1).map((item) => ({ ...item, matchedKeywords: [] as string[] }));
  const anchor = matched[0]?.text ?? "";
  const keywords = [...new Set(matched.flatMap((item) => item.matchedKeywords))];
  const roleBonus = competency.roles.includes("*") ? 0 : 3;
  const projectBonus = matched.some((item) => item.source === "project") ? 2 : 0;
  const score = keywords.length * 3 + matched.length + roleBonus + projectBonus;
  const difficultyInstruction =
    difficulty === "HARD" ? "请重点说明最困难的取舍和反事实方案。" :
    difficulty === "EASY" ? "请先清楚交代背景、职责、行动和结果。" :
    "请说明关键行动、决策依据和最终结果。";

  return {
    prompt: `你的简历提到“${clip(anchor, 110)}”。围绕${competency.label}，${competency.questionFocus}？${difficultyInstruction}`,
    expectation: `回答应覆盖：${competency.expectedSignals.join("、")}。问题仅依据简历证据生成，不得补写不存在的经历。`,
    keywords,
    context: {
      competencyId: competency.id,
      competencyLabel: competency.label,
      evidence: matched.map(({ text, source, matchedKeywords }) => ({ text, source, matchedKeywords })),
      expectedSignals: competency.expectedSignals,
      researchSources: keywordResearchSources
    },
    score
  };
}

function buildEvidence(resume: ResumeDocument) {
  return [
    ...resume.projects.flatMap((project) => [
      { text: `${project.name}: ${project.description}`, source: "project" },
      ...project.technologies.map((technology) => ({ text: `${project.name}: ${technology}`, source: "project-skill" }))
    ]),
    ...resume.skills.map((skill) => ({ text: skill, source: "skill" })),
    ...resume.roles.map((role) => ({ text: role, source: "role" })),
    ...resume.companies.map((company) => ({ text: company, source: "company" })),
    ...resume.rawText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length >= 20)
      .slice(0, 80).map((text) => ({ text, source: "resume-line" }))
  ];
}

function diversify(candidates: RagQuestionCandidate[], limit: number) {
  const selected: RagQuestionCandidate[] = [];
  const competencies = new Set<string>();
  for (const candidate of candidates) {
    if (!competencies.has(candidate.context.competencyId)) {
      selected.push(candidate);
      competencies.add(candidate.context.competencyId);
    }
    if (selected.length >= limit) break;
  }
  return selected;
}

function signalCovered(signal: string, text: string) {
  if (/结果验证|实验验证/.test(signal)) {
    return /验证|口径|对照|排除|归因|validated|control group|attribution/i.test(text);
  }
  if (/量化结果|基准值|核心指标|性能或可靠性指标/.test(signal)) {
    return /\d+(?:\.\d+)?[%x]?|\d+\s*(人|天|周|月|元|万|秒|ms)/i.test(text);
  }
  const patterns: Array<[RegExp, string[]]> = [
    [/个人|职责|贡献|行动|实现|设计|负责|主导|led|built|implemented|owned/i, ["个人职责", "个人贡献", "关键行动", "关键实现"]],
    [/\d+(?:\.\d+)?[%x]?|\d+\s*(人|天|周|月|元|万|秒|ms)/i, ["量化结果", "基准值", "核心指标", "性能或可靠性指标", "结果验证"]],
    [/因为|依据|数据|调研|分析|验证|假设|because|data|research|validated/i, ["决策依据", "数据或研究证据", "分析数据", "验证结果", "实验验证", "关键假设"]],
    [/取舍|权衡|替代|风险|trade.?off|alternative|risk|sensitivity/i, ["方案取舍", "方案比较", "敏感性或风险", "故障与复盘"]],
    [/背景|当时|问题|目标|客户|用户|context|situation|goal/i, ["问题背景", "交易或分析背景", "用户问题"]],
    [/结果|影响|提升|降低|增长|完成|impact|result|increased|reduced/i, ["结论与影响", "客户影响", "可量化结果"]],
    [/冲突|阻力|协调|沟通|stakeholder|conflict/i, ["利益相关方", "冲突或阻力"]],
    [/复盘|反思|下次|learned|retrospective/i, ["故障与复盘"]]
  ];
  return patterns.some(([pattern, labels]) => labels.some((label) => signal.includes(label)) && pattern.test(text));
}

function buildGapQuestion(gap: string, competency: string, context?: RagQuestionContext) {
  const anchor = context?.evidence[0]?.text;
  const prefix = anchor ? `继续围绕“${clip(anchor, 70)}”` : "继续围绕刚才的经历";
  const prompts: Record<string, string> = {
    "可量化结果": "最终结果是什么？请给出基准值、变化幅度和统计口径。",
    "量化结果": "最终结果是什么？请给出基准值、变化幅度和统计口径。",
    "结果验证": "这个结果如何计算和验证？如何排除其他因素的影响？",
    "指标口径": "这个指标的定义、数据来源和计算口径是什么？",
    "个人职责": "请区分团队成果和个人贡献：哪个关键行动或决策由你负责？",
    "个人贡献": "请区分团队成果和个人贡献：哪个关键行动或决策由你负责？",
    "关键行动": "你具体采取了哪三步行动？其中最关键的一步是什么？",
    "决策依据": "你比较过哪些替代方案？最终选择的依据是什么？",
    "方案取舍": "当时最困难的取舍是什么？为什么没有选择另一个方案？",
    "实验验证": "你如何设计验证方法，并判断结果足以支持结论？"
  };
  return `${prefix}，针对${competency}，${prompts[gap] ?? `请补充“${gap}”，并说明它如何支持你的结论。`}`;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function evidencePriority(source: string) {
  return source === "project" ? 4 :
    source === "resume-line" ? 3 :
    source === "role" ? 2 :
    source === "skill" || source === "project-skill" ? 1 : 0;
}

function includesAlias(text: string, alias: string) {
  return text.includes(normalize(alias));
}

function clip(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`;
}
