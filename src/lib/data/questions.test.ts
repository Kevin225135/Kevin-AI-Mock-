import assert from "node:assert/strict";
import test from "node:test";
import { difficultyOptions, moduleOptions, roleOptions } from "../domain/constants";
import { questionBank } from "./questions";

test("covers every supported module, role and difficulty with at least four questions", () => {
  for (const moduleOption of moduleOptions) {
    for (const targetRole of roleOptions) {
      for (const difficulty of difficultyOptions) {
        const matches = questionBank.filter(
          (question) =>
            question.module === moduleOption.value &&
            question.targetRole === targetRole &&
            question.difficulty === difficulty.value
        );
        assert.ok(
          matches.length >= 4,
          `${moduleOption.value}/${targetRole}/${difficulty.value} only has ${matches.length} questions`
        );
      }
    }
  }
});

test("uses stable unique question identifiers", () => {
  assert.equal(new Set(questionBank.map((question) => question.id)).size, questionBank.length);
});
