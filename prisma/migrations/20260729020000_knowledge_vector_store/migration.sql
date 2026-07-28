CREATE TABLE "knowledge_entries" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title_zh" TEXT NOT NULL,
  "title_en" TEXT NOT NULL,
  "summary_zh" TEXT NOT NULL,
  "summary_en" TEXT NOT NULL,
  "content_zh" TEXT NOT NULL,
  "content_en" TEXT NOT NULL,
  "keywords" TEXT[] NOT NULL,
  "competencies" TEXT[] NOT NULL,
  "source_title" TEXT NOT NULL,
  "source_url" TEXT NOT NULL,
  "research_round" INTEGER NOT NULL,
  "embedding_model" TEXT NOT NULL,
  "embedding" DOUBLE PRECISION[] NOT NULL,
  "search_vector" tsvector NOT NULL DEFAULT ''::tsvector,
  "is_published" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "knowledge_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "knowledge_entries_slug_key" ON "knowledge_entries"("slug");
CREATE INDEX "knowledge_entries_domain_category_idx" ON "knowledge_entries"("domain", "category");
CREATE INDEX "knowledge_entries_is_published_updated_at_idx" ON "knowledge_entries"("is_published", "updated_at");
CREATE INDEX "knowledge_entries_search_vector_idx" ON "knowledge_entries" USING GIN ("search_vector");

CREATE FUNCTION knowledge_entries_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."search_vector" :=
    setweight(to_tsvector('simple', coalesce(NEW."title_zh", '') || ' ' || coalesce(NEW."title_en", '')), 'A') ||
    setweight(to_tsvector('simple', array_to_string(NEW."keywords", ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."summary_zh", '') || ' ' || coalesce(NEW."summary_en", '') || ' ' || coalesce(NEW."content_zh", '') || ' ' || coalesce(NEW."content_en", '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_entries_search_vector_trigger
BEFORE INSERT OR UPDATE OF "title_zh", "title_en", "keywords", "summary_zh", "summary_en", "content_zh", "content_en"
ON "knowledge_entries"
FOR EACH ROW EXECUTE FUNCTION knowledge_entries_search_vector_update();
