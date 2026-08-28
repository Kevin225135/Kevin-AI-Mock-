-- Some pre-V2 question rows were created outside the seed path and therefore
-- never received a rubric reference. Bind only unversioned legacy rows to the
-- known default rubric, then make their existing scores traceable.
UPDATE "question_bank"
SET "rubric_version_id" = rubric."id"
FROM "rubric_versions" AS rubric
WHERE "question_bank"."rubric_version_id" IS NULL
  AND rubric."code" = 'v1_text_mock_rubric';

UPDATE "ai_scores" AS score
SET "rubric_version_id" = question."rubric_version_id"
FROM "answers" AS answer
JOIN "question_bank" AS question ON question."id" = answer."question_id"
WHERE score."answer_id" = answer."id"
  AND score."rubric_version_id" IS NULL
  AND question."rubric_version_id" IS NOT NULL;

