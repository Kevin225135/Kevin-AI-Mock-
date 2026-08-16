import { dimensionLabels, scoreDimensions } from "./constants";
import { DomainError } from "./errors";
import type { AiScore, AnswerRecord, AttemptComparison } from "./types";

type ComparisonInput = {
  sourceAttempt: AnswerRecord;
  sourceScore: AiScore;
  retryAttempt: AnswerRecord;
  retryScore: AiScore;
};

const actionSignals: Array<{
  suggestion: RegExp;
  answer: RegExp;
}> = [
  {
    suggestion: /数字|量化|指标|数据|metric|kpi|result/i,
    answer: /\d+(?:\.\d+)?(?:%|倍|个|人|天|周|月|年|bp|bps|万|亿)?/i
  },
  {
    suggestion: /结论|先说|观点|structure|逻辑|层次/i,
    answer: /^(?:我的结论|结论是|核心观点|首先|第一|in short|my conclusion)/i
  },
  {
    suggestion: /取舍|权衡|风险|边界|trade.?off|risk/i,
    answer: /取舍|权衡|风险|边界|代价|trade.?off|risk|however|但是/i
  },
  {
    suggestion: /复盘|反思|下次|learn|reflection/i,
    answer: /复盘|反思|学到|下次|改进|learn|reflection|next time/i
  },
  {
    suggestion: /个人|本人|我做|ownership|contribution/i,
    answer: /我负责|我主导|我的职责|我推动|i (?:led|owned|built|drove)/i
  }
];

export function compareAnswerAttempts(input: ComparisonInput): AttemptComparison {
  const sourceRubric = input.sourceScore.rubricVersionId;
  const retryRubric = input.retryScore.rubricVersionId;

  if (!sourceRubric || !retryRubric || sourceRubric !== retryRubric) {
    throw new DomainError(
      "两次回答的 Rubric 版本不同或不可追溯，不能直接比较。",
      "RUBRIC_VERSION_MISMATCH",
      409
    );
  }

  const dimensionDeltas = scoreDimensions.map((dimension) => ({
    dimension,
    before: input.sourceScore.dimensions[dimension],
    after: input.retryScore.dimensions[dimension],
    delta:
      input.retryScore.dimensions[dimension] -
      input.sourceScore.dimensions[dimension]
  }));
  const improvedDimensions = dimensionDeltas
    .filter((item) => item.delta > 0)
    .map((item) => item.dimension);
  const { adopted, unverified } = assessSuggestedActions(
    input.sourceScore.improvements,
    input.retryAttempt.content
  );

  return {
    sourceAttempt: input.sourceAttempt,
    retryAttempt: input.retryAttempt,
    rubricVersionId: sourceRubric,
    beforeTotal: input.sourceScore.totalScore,
    afterTotal: input.retryScore.totalScore,
    totalDelta: input.retryScore.totalScore - input.sourceScore.totalScore,
    dimensionDeltas,
    improvedDimensions,
    adoptedActions: adopted,
    unverifiedActions: unverified,
    remainingActions: input.retryScore.improvements
  };
}

export function describeImprovedDimensions(comparison: AttemptComparison) {
  return comparison.improvedDimensions.map(
    (dimension) => dimensionLabels[dimension]
  );
}

function assessSuggestedActions(suggestions: string[], answer: string) {
  const adopted: string[] = [];
  const unverified: string[] = [];

  for (const suggestion of suggestions) {
    const relevantSignals = actionSignals.filter((signal) =>
      signal.suggestion.test(suggestion)
    );
    if (
      relevantSignals.length > 0 &&
      relevantSignals.some((signal) => signal.answer.test(answer.trim()))
    ) {
      adopted.push(suggestion);
    } else {
      unverified.push(suggestion);
    }
  }

  return { adopted, unverified };
}

