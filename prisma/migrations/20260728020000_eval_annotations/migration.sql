CREATE TABLE "eval_annotations" (
  "id" TEXT NOT NULL,
  "sample_id" TEXT NOT NULL,
  "annotator" TEXT NOT NULL,
  "total_score" INTEGER NOT NULL,
  "dimensions" JSONB,
  "should_follow_up" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eval_annotations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eval_annotations_sample_id_annotator_key" ON "eval_annotations"("sample_id", "annotator");
CREATE INDEX "eval_annotations_sample_id_created_at_idx" ON "eval_annotations"("sample_id", "created_at");
ALTER TABLE "eval_annotations" ADD CONSTRAINT "eval_annotations_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "eval_samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
