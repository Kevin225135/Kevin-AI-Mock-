import { defaultRubricVersion } from "@/lib/data/rubrics";
import type { Question } from "@/lib/domain/types";

export function buildScoringPrompt(input: {
  question: Question;
  answer: string;
}) {
  return [
    "You are an interview coach. Score the answer using the rubric.",
    "Return JSON only. Do not include markdown.",
    `Rubric: ${JSON.stringify(defaultRubricVersion.dimensions)}`,
    `Role: ${input.question.targetRole}`,
    `Module: ${input.question.module}`,
    `Question: ${input.question.prompt}`,
    `Answer: ${input.answer}`,
    "JSON shape: { dimensions: { starCompleteness, logicStructure, contentDepth, communication }, totalScore, deductions, improvements, sampleAnswer, reasoning }",
    "Rules: dimensions must be integers from 1 to 5. totalScore must be an integer from 0 to 100. deductions and improvements must be arrays of strings, not a single string. sampleAnswer and reasoning must be strings."
  ].join("\n\n");
}
