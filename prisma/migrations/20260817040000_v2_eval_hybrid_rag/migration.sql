CREATE TYPE "EvalDatasetStatus" AS ENUM ('DRAFT', 'FROZEN', 'RETIRED');
CREATE TYPE "EvalSplit" AS ENUM ('TRAIN', 'VALIDATION', 'TEST');
CREATE TYPE "EvalSourceType" AS ENUM ('LEGACY_SYNTHETIC', 'LEGACY_CURATED_REFERENCE', 'HUMAN_GOLD', 'PRODUCTION_BAD_CASE');
CREATE TYPE "EvalLabelStatus" AS ENUM ('REFERENCE_ONLY', 'DOUBLE_BLIND_PENDING', 'DOUBLE_BLIND_COMPLETE', 'ARBITRATED');
CREATE TYPE "EvalAnnotationRole" AS ENUM ('PRIMARY', 'SECONDARY', 'ARBITRATOR');

CREATE TABLE "eval_dataset_versions" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "description" TEXT,
  "rubric_code" TEXT NOT NULL,
  "rubric_version" INTEGER NOT NULL,
  "status" "EvalDatasetStatus" NOT NULL DEFAULT 'DRAFT',
  "sample_count" INTEGER NOT NULL DEFAULT 0,
  "content_hash" TEXT NOT NULL,
  "frozen_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "eval_dataset_versions_pkey" PRIMARY KEY ("id")
);

INSERT INTO "eval_dataset_versions" (
  "id", "name", "version", "description", "rubric_code", "rubric_version",
  "status", "sample_count", "content_hash", "created_at", "updated_at"
) VALUES (
  'eval-dataset-v2-legacy-v1',
  'ai-mock-v2-legacy',
  '1.0.0',
  'Historical generated and curated reference samples. Reference scores are not human Gold labels.',
  'v1_text_mock_rubric',
  2,
  'DRAFT',
  0,
  'pending',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

ALTER TABLE "eval_samples"
  ADD COLUMN "dataset_version_id" TEXT,
  ADD COLUMN "sample_key" TEXT,
  ADD COLUMN "split" "EvalSplit",
  ADD COLUMN "source_type" "EvalSourceType",
  ADD COLUMN "label_status" "EvalLabelStatus" NOT NULL DEFAULT 'REFERENCE_ONLY',
  ADD COLUMN "content_hash" TEXT;

UPDATE "eval_samples"
SET
  "dataset_version_id" = 'eval-dataset-v2-legacy-v1',
  "sample_key" = 'legacy-' || substr(md5(
    "id" || '|' || "module"::text || '|' || "target_role" || '|' ||
    "question" || '|' || "answer" || '|' || "category"
  ), 1, 24),
  "split" = CASE
    WHEN get_byte(decode(md5("id"), 'hex'), 0) < 179 THEN 'TRAIN'::"EvalSplit"
    WHEN get_byte(decode(md5("id"), 'hex'), 0) < 217 THEN 'VALIDATION'::"EvalSplit"
    ELSE 'TEST'::"EvalSplit"
  END,
  "source_type" = CASE
    WHEN "notes" LIKE 'generated:%' THEN 'LEGACY_SYNTHETIC'::"EvalSourceType"
    ELSE 'LEGACY_CURATED_REFERENCE'::"EvalSourceType"
  END,
  "content_hash" = md5(
    "module"::text || '|' || "target_role" || '|' || "question" || '|' ||
    "answer" || '|' || "human_score"::text || '|' || "category" || '|' ||
    coalesce("expected_follow_up", '')
  );

UPDATE "eval_dataset_versions"
SET
  "sample_count" = summary.sample_count,
  "content_hash" = summary.content_hash,
  "status" = 'DRAFT'::"EvalDatasetStatus",
  "frozen_at" = NULL,
  "updated_at" = CURRENT_TIMESTAMP
FROM (
  SELECT
    count(*)::integer AS sample_count,
    coalesce(md5(string_agg("content_hash", '' ORDER BY "sample_key")), md5('')) AS content_hash
  FROM "eval_samples"
  WHERE "dataset_version_id" = 'eval-dataset-v2-legacy-v1'
) AS summary
WHERE "id" = 'eval-dataset-v2-legacy-v1';

ALTER TABLE "eval_samples"
  ALTER COLUMN "dataset_version_id" SET NOT NULL,
  ALTER COLUMN "sample_key" SET NOT NULL,
  ALTER COLUMN "split" SET NOT NULL,
  ALTER COLUMN "source_type" SET NOT NULL,
  ALTER COLUMN "content_hash" SET NOT NULL;

ALTER TABLE "eval_annotations"
  ADD COLUMN "role" "EvalAnnotationRole" NOT NULL DEFAULT 'PRIMARY',
  ADD COLUMN "rubric_version" TEXT NOT NULL DEFAULT 'v2-text-rubric-2',
  ADD COLUMN "evidence_refs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "is_blind" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- These columns and indexes were already shipped on the original main branch in
-- 20260729030000_hybrid_rag_quality. The V2 branch was developed from an
-- unrelated history, so keep this migration safe for both upgrade paths.
ALTER TABLE "knowledge_entries"
  ADD COLUMN IF NOT EXISTS "source_authority" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_verified_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "eval_dataset_versions_name_version_key"
  ON "eval_dataset_versions"("name", "version");
CREATE INDEX "eval_dataset_versions_status_frozen_at_idx"
  ON "eval_dataset_versions"("status", "frozen_at");
CREATE UNIQUE INDEX "eval_samples_sample_key_key" ON "eval_samples"("sample_key");
CREATE INDEX "eval_samples_dataset_version_id_split_category_idx"
  ON "eval_samples"("dataset_version_id", "split", "category");
CREATE INDEX "eval_samples_source_type_label_status_idx"
  ON "eval_samples"("source_type", "label_status");
CREATE INDEX IF NOT EXISTS "knowledge_entries_is_published_source_authority_idx"
  ON "knowledge_entries"("is_published", "source_authority");
CREATE INDEX IF NOT EXISTS "knowledge_entries_expires_at_idx"
  ON "knowledge_entries"("expires_at");

ALTER TABLE "eval_samples"
  ADD CONSTRAINT "eval_samples_dataset_version_id_fkey"
  FOREIGN KEY ("dataset_version_id") REFERENCES "eval_dataset_versions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
