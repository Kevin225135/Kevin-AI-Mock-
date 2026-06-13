import { buildScoringPrompt } from "./prompt";
import { parseAiScore, type AiScoreResult } from "./score-schema";
import type { Question } from "@/lib/domain/types";

type ScoreAnswerInput = {
  question: Question;
  answer: string;
};

const starSignals = [
  /situation|context|background|背景|情境|情况/i,
  /task|goal|objective|目标|任务/i,
  /action|did|built|led|分析|推进|采取|行动/i,
  /result|impact|outcome|结果|影响|提升|降低|增长/i
];

const logicSignals = [
  /first|second|third|首先|其次|最后|第一|第二|第三/i,
  /because|therefore|so that|因此|所以|原因|结论/i,
  /trade.?off|priority|权衡|优先级|取舍/i
];

const depthSignals = [
  /\d+%|\d+x|\$\d+|\d+bp|\d+ 个|\d+ 人|\d+ 天|\d+ 周|\d+ 月/i,
  /metric|data|kpi|指标|数据|量化|用户|收入|成本/i,
  /learned|reflection|next time|复盘|反思|下次/i
];

const communicationPenaltySignals = [
  /stuff|things|something|whatever|很多很多|大概就是|反正/i
];

export async function scoreAnswer(input: ScoreAnswerInput): Promise<AiScoreResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw =
        process.env.AI_PROVIDER && process.env.AI_PROVIDER !== "local"
          ? await scoreWithProvider(input)
          : scoreWithLocalRubric(input);

      return parseAiScore(raw);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function scoreWithProvider(input: ScoreAnswerInput) {
  if (!process.env.AI_API_BASE_URL || !process.env.AI_API_KEY) {
    return scoreWithLocalRubric(input);
  }

  const response = await fetch(`${process.env.AI_API_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "mock-interview-rubric",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: buildScoringPrompt(input)
        }
      ]
    })
  });

  if (!response.ok) {
    return scoreWithLocalRubric(input);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    return scoreWithLocalRubric(input);
  }

  return JSON.parse(content);
}

function scoreWithLocalRubric(input: ScoreAnswerInput): AiScoreResult {
  const answer = input.answer.trim();
  const length = answer.length;
  const wordishCount = answer.split(/\s+/).filter(Boolean).length;
  const density = Math.max(length, wordishCount * 6);

  const starCompleteness = clampScore(
    1 + countMatches(answer, starSignals) + lengthBonus(density, [220, 480])
  );
  const logicStructure = clampScore(
    1 + countMatches(answer, logicSignals) + lengthBonus(density, [180, 420])
  );
  const contentDepth = clampScore(
    1 + countMatches(answer, depthSignals) + lengthBonus(density, [280, 620])
  );
  const communication = clampScore(
    2 +
      lengthBonus(density, [160, 360]) +
      (communicationPenaltySignals.some((signal) => signal.test(answer)) ? -1 : 1)
  );

  const dimensions = {
    starCompleteness,
    logicStructure,
    contentDepth,
    communication
  };
  const totalScore = Math.round(
    (starCompleteness * 0.28 +
      logicStructure * 0.24 +
      contentDepth * 0.28 +
      communication * 0.2) *
      20
  );

  return {
    dimensions,
    totalScore,
    deductions: buildDeductions(dimensions, input.question.module),
    improvements: buildImprovements(dimensions),
    sampleAnswer: buildSampleAnswer(input.question),
    reasoning: buildReasoning(dimensions, totalScore)
  };
}

function countMatches(text: string, signals: RegExp[]) {
  return signals.reduce((count, signal) => count + (signal.test(text) ? 1 : 0), 0);
}

function lengthBonus(size: number, thresholds: [number, number]) {
  if (size >= thresholds[1]) {
    return 2;
  }
  if (size >= thresholds[0]) {
    return 1;
  }
  return 0;
}

function clampScore(value: number) {
  return Math.max(1, Math.min(5, value));
}

function buildDeductions(
  dimensions: AiScoreResult["dimensions"],
  module: Question["module"]
) {
  const deductions: string[] = [];

  if (dimensions.starCompleteness < 4) {
    deductions.push("STAR 链路不够完整，结果和个人行动需要更明确。");
  }
  if (dimensions.logicStructure < 4) {
    deductions.push("回答结构还不稳定，建议先给结论，再分层展开证据。");
  }
  if (dimensions.contentDepth < 4) {
    deductions.push("内容深度偏浅，需要补充数据、权衡或复盘来证明能力。");
  }
  if (dimensions.communication < 4) {
    deductions.push("表达可以更短更准，减少铺垫，把面试官最关心的信息前置。");
  }
  if (module === "MARKET" && dimensions.contentDepth < 5) {
    deductions.push("市场判断需要边界条件，避免只给单向观点。");
  }

  return deductions.length > 0
    ? deductions
    : ["回答已经覆盖关键点，主要扣分来自例证还可以更具体。"];
}

function buildImprovements(dimensions: AiScoreResult["dimensions"]) {
  const improvements: string[] = [];

  if (dimensions.starCompleteness < 4) {
    improvements.push("用 1 句话交代背景和任务，用 2-3 句话讲自己的行动，最后量化结果。");
  }
  if (dimensions.logicStructure < 4) {
    improvements.push("开头先给一句总论，再用“判断依据 / 行动 / 结果”三段回答。");
  }
  if (dimensions.contentDepth < 4) {
    improvements.push("至少加入一个数字、一个取舍和一个复盘点，让答案从经历描述变成能力证明。");
  }
  if (dimensions.communication < 4) {
    improvements.push("把答案压缩到 90 秒以内，删除和岗位能力无关的细枝末节。");
  }

  return improvements.length > 0
    ? improvements
    : ["下一轮重点提升故事的岗位相关性，把成功经验明确映射到目标岗位。"];
}

function buildSampleAnswer(question: Question) {
  return [
    `For this ${question.targetRole} question, I would answer with a clear situation, task, action, and result.`,
    "In my previous project, the key challenge was that the team had limited time and incomplete information.",
    "I clarified the decision criteria, split the work into owners, validated the riskiest assumption first, and kept stakeholders updated with short written checkpoints.",
    "The result was a measurable improvement in output quality and a reusable process for the next project.",
    "The lesson I would carry into this role is to combine structured thinking with fast, visible execution."
  ].join(" ");
}

function buildReasoning(
  dimensions: AiScoreResult["dimensions"],
  totalScore: number
) {
  return `本次评分为 ${totalScore}。STAR、逻辑、深度和表达四项共同决定总分，当前最需要关注的是 ${findWeakestDimension(
    dimensions
  )}。`;
}

function findWeakestDimension(dimensions: AiScoreResult["dimensions"]) {
  const entries = Object.entries(dimensions) as Array<
    [keyof AiScoreResult["dimensions"], number]
  >;
  return entries.sort((a, b) => a[1] - b[1])[0][0];
}
