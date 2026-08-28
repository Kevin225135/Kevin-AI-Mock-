import { defaultRubricVersion } from "@/lib/data/rubrics";
import type { Question } from "@/lib/domain/types";
import { getModuleRubric } from "./module-rubric";

export function buildScoringPrompt(input: {
  question: Question;
  answer: string;
}) {
  const moduleRubric = getModuleRubric(input.question.module);
  return [
    "You are an interview coach. Score the answer using the rubric.",
    "Return JSON only. Do not include markdown.",
    `Rubric: ${JSON.stringify(defaultRubricVersion.dimensions)}`,
    `Module-specific weights: ${JSON.stringify(moduleRubric.weights)}`,
    `The starCompleteness field means "${moduleRubric.completenessLabel}" for this module: ${moduleRubric.completenessCriteria}.`,
    `Content-depth criteria for this module: ${moduleRubric.depthCriteria}.`,
    `Role: ${input.question.targetRole}`,
    `Module: ${input.question.module}`,
    `Question: ${input.question.prompt}`,
    `Answer: ${input.answer}`,
    "JSON shape: { dimensions: { starCompleteness, logicStructure, contentDepth, communication }, totalScore, deductions, improvements, sampleAnswer, reasoning }",
    "Rules: dimensions must be integers from 1 to 5. Calculate totalScore with the module-specific weights and return an integer from 0 to 100. Do not penalize technical or market answers for not using STAR. deductions and improvements must be arrays of strings, not a single string. sampleAnswer and reasoning must be strings."
  ].join("\n\n");
}
