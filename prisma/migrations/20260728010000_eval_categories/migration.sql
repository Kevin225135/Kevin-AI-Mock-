ALTER TABLE "eval_samples" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'BASIC';
ALTER TABLE "eval_samples" ADD COLUMN "expected_follow_up" TEXT;
CREATE INDEX "eval_samples_category_idx" ON "eval_samples"("category");
