export type FollowUpDecision = "DEEPEN" | "CLARIFY" | "CLOSE";

export function decideFollowUp(answer: string, totalScore: number, round: number): FollowUpDecision {
  if (round >= 2 || (totalScore >= 85 && answer.length >= 260)) return "CLOSE";
  if (answer.length < 60 || !/(我|I|we|团队|项目)/i.test(answer)) return "CLARIFY";
  return "DEEPEN";
}

export function buildFollowUpDecisionPrompt(input: {
  question: string;
  answer: string;
  round: number;
}) {
  return [
    "You are a bounded interview follow-up agent.",
    "Choose exactly one decision: DEEPEN, CLARIFY, or CLOSE.",
    "DEEPEN when the answer contains a result or decision but lacks personal action or evidence.",
    "CLARIFY when it is vague, off-topic, or missing necessary context.",
    "CLOSE when it is complete or round >= 2. Never exceed two follow-ups.",
    `Question: ${input.question}`,
    `Answer: ${input.answer}`,
    `Current round: ${input.round}`,
    "Return JSON only: { decision, reason, followUpQuestion }. The question must not repeat known information."
  ].join("\n");
}
