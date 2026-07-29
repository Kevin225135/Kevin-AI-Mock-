ALTER TABLE "knowledge_entries"
  ADD COLUMN "source_authority" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "published_at" TIMESTAMP(3),
  ADD COLUMN "expires_at" TIMESTAMP(3),
  ADD COLUMN "last_verified_at" TIMESTAMP(3);

CREATE INDEX "knowledge_entries_is_published_source_authority_idx"
  ON "knowledge_entries"("is_published", "source_authority");
CREATE INDEX "knowledge_entries_expires_at_idx"
  ON "knowledge_entries"("expires_at");
