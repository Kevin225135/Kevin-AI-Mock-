-- V2 keeps the first answer immutable and appends retries as versioned attempts.
CREATE TYPE "AnswerAttemptKind" AS ENUM ('INITIAL', 'RETRY', 'RETEST');

ALTER TABLE "answers"
  ADD COLUMN "attempt_no" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "attempt_kind" "AnswerAttemptKind" NOT NULL DEFAULT 'INITIAL',
  ADD COLUMN "parent_answer_id" TEXT,
  ADD COLUMN "idempotency_key" TEXT;

-- Existing scores used the rubric attached to their question but did not persist
-- that reference. Backfill it before comparisons are enabled.
UPDATE "ai_scores" AS score
SET "rubric_version_id" = question."rubric_version_id"
FROM "answers" AS answer
JOIN "question_bank" AS question ON question."id" = answer."question_id"
WHERE score."answer_id" = answer."id"
  AND score."rubric_version_id" IS NULL;

DROP INDEX "answers_session_id_question_id_follow_up_round_key";

CREATE UNIQUE INDEX "answers_session_id_question_id_follow_up_round_attempt_no_key"
  ON "answers"("session_id", "question_id", "follow_up_round", "attempt_no");
CREATE UNIQUE INDEX "answers_idempotency_key_key"
  ON "answers"("idempotency_key");
CREATE INDEX "answers_parent_answer_id_attempt_no_idx"
  ON "answers"("parent_answer_id", "attempt_no");

ALTER TABLE "answers"
  ADD CONSTRAINT "answers_parent_answer_id_fkey"
  FOREIGN KEY ("parent_answer_id") REFERENCES "answers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

