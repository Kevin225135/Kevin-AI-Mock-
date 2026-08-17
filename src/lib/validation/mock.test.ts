import assert from "node:assert/strict";
import test from "node:test";
import { createSessionSchema } from "./mock";

const baseSession = {
  module: "CV_RELATED",
  targetRole: "Software Engineer",
  difficulty: "MEDIUM",
  resumeId: "resume-1"
};

test("accepts up to ten questions for a mock session", () => {
  const parsed = createSessionSchema.parse({ ...baseSession, questionCount: 10 });
  assert.equal(parsed.questionCount, 10);
});

test("rejects more than ten questions for a mock session", () => {
  assert.equal(
    createSessionSchema.safeParse({ ...baseSession, questionCount: 11 }).success,
    false
  );
});

test("rejects a session without any questions", () => {
  assert.equal(
    createSessionSchema.safeParse({ ...baseSession, questionCount: 0 }).success,
    false
  );
});
