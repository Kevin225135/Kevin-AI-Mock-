ALTER TABLE "question_bank"
ADD COLUMN "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "retrieval_context" JSONB;

CREATE TABLE "rag_retrieval_traces" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "resume_id" TEXT,
  "session_id" TEXT,
  "phase" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "keywords" TEXT[] NOT NULL,
  "candidates" JSONB NOT NULL,
  "selected" JSONB NOT NULL,
  "latency_ms" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rag_retrieval_traces_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rag_retrieval_traces_user_id_created_at_idx"
ON "rag_retrieval_traces"("user_id", "created_at");

CREATE INDEX "rag_retrieval_traces_resume_id_created_at_idx"
ON "rag_retrieval_traces"("resume_id", "created_at");

CREATE INDEX "rag_retrieval_traces_session_id_created_at_idx"
ON "rag_retrieval_traces"("session_id", "created_at");
