import assert from "node:assert/strict";
import test from "node:test";
import { getModuleRubric } from "./module-rubric";

test("module rubric weights sum to one", () => {
  for (const interviewModule of ["BEHAVIORAL", "CV_RELATED", "TECHNICAL", "MARKET"] as const) {
    const total = Object.values(getModuleRubric(interviewModule).weights).reduce(
      (sum, value) => sum + value,
      0
    );
    assert.ok(Math.abs(total - 1) < 0.0001);
  }
});

test("technical and market modules prioritize depth over STAR", () => {
  for (const interviewModule of ["TECHNICAL", "MARKET"] as const) {
    const weights = getModuleRubric(interviewModule).weights;
    assert.ok(weights.contentDepth > weights.starCompleteness);
    assert.ok(weights.logicStructure > weights.starCompleteness);
  }
});
