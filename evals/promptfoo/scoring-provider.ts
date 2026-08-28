import { assertSafeInterviewAnswer } from "../../src/lib/ai/safety";
import { scoreAnswer } from "../../src/lib/ai/scorer";
import type {
  Difficulty,
  InterviewModule,
  Question
} from "../../src/lib/domain/types";

type ProviderContext = {
  vars?: Record<string, unknown>;
};

export default class LocalScoringProvider {
  id() {
    return "ai-mock-local-scorer";
  }

  async callApi(prompt: string, context?: ProviderContext) {
    const vars = context?.vars ?? {};
    const answer = String(vars.answer ?? prompt);
    assertSafeInterviewAnswer(answer);
    const question: Question = {
      id: "promptfoo-eval-question",
      module: String(vars.module ?? "BEHAVIORAL") as InterviewModule,
      targetRole: String(vars.targetRole ?? "Product Manager"),
      difficulty: String(vars.difficulty ?? "MEDIUM") as Difficulty,
      prompt: String(vars.question ?? "请回答面试问题。"),
      expectation: String(vars.expectation ?? "给出可验证、结构清楚的回答。")
    };
    const previousProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "local";
    try {
      const result = await scoreAnswer({ question, answer });
      return { output: JSON.stringify(result) };
    } finally {
      if (previousProvider === undefined) {
        delete process.env.AI_PROVIDER;
      } else {
        process.env.AI_PROVIDER = previousProvider;
      }
    }
  }
}

