CREATE TYPE "TraceRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'DEGRADED');
CREATE TYPE "TraceStepKind" AS ENUM ('INPUT', 'RETRIEVAL', 'DECISION', 'TOOL', 'MODEL', 'SCORE', 'OUTPUT');
CREATE TYPE "TraceStepStatus" AS ENUM ('OK', 'ERROR', 'FALLBACK');
CREATE TYPE "MemoryItemType" AS ENUM ('FACT', 'PREFERENCE', 'WEAKNESS', 'TRAINING_STATE', 'TEMPORARY');
CREATE TYPE "MemoryItemStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'REJECTED');
CREATE TYPE "PatternRightsStatus" AS ENUM ('INTERNAL', 'LICENSED', 'PUBLIC_DOMAIN', 'PERMISSION_GRANTED', 'RESTRICTED', 'UNKNOWN');
CREATE TYPE "PatternQualityStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "PatternIngestionOutcome" AS ENUM ('ACCEPTED', 'REJECTED', 'DUPLICATE', 'UPDATED');

CREATE TABLE "memory_items" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" "MemoryItemType" NOT NULL,
  "status" "MemoryItemStatus" NOT NULL DEFAULT 'PROPOSED',
  "value" JSONB NOT NULL,
  "source_ref" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "expires_at" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "memory_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interview_patterns" (
  "id" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer_guidance" TEXT,
  "module" "InterviewModule" NOT NULL,
  "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
  "company_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "role_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "competency_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "project_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "source_title" TEXT NOT NULL,
  "source_url" TEXT,
  "collection_method" TEXT NOT NULL,
  "rights_status" "PatternRightsStatus" NOT NULL,
  "dedupe_hash" TEXT NOT NULL,
  "quality_status" "PatternQualityStatus" NOT NULL DEFAULT 'DRAFT',
  "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quality_reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "source_updated_at" TIMESTAMP(3),
  "last_reviewed_at" TIMESTAMP(3),
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "interview_patterns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interview_pattern_ingestions" (
  "id" TEXT NOT NULL,
  "pattern_id" TEXT,
  "external_id" TEXT NOT NULL,
  "dedupe_hash" TEXT NOT NULL,
  "outcome" "PatternIngestionOutcome" NOT NULL,
  "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "source_title" TEXT NOT NULL,
  "source_url" TEXT,
  "collection_method" TEXT NOT NULL,
  "rights_status" "PatternRightsStatus" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interview_pattern_ingestions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trace_runs" (
  "id" TEXT NOT NULL,
  "run_id" TEXT NOT NULL,
  "user_id" TEXT,
  "session_id" TEXT,
  "attempt_id" TEXT,
  "name" TEXT NOT NULL,
  "workflow_version" TEXT NOT NULL,
  "prompt_version" TEXT,
  "model" TEXT,
  "status" "TraceRunStatus" NOT NULL DEFAULT 'RUNNING',
  "input_refs" JSONB NOT NULL,
  "input_tokens" INTEGER NOT NULL DEFAULT 0,
  "output_tokens" INTEGER NOT NULL DEFAULT 0,
  "estimated_cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "latency_ms" INTEGER,
  "fallback_reason" TEXT,
  "error_type" TEXT,
  "final_state" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "trace_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trace_steps" (
  "id" TEXT NOT NULL,
  "trace_run_id" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "kind" "TraceStepKind" NOT NULL,
  "name" TEXT NOT NULL,
  "status" "TraceStepStatus" NOT NULL DEFAULT 'OK',
  "input_summary" JSONB,
  "output_summary" JSONB,
  "latency_ms" INTEGER NOT NULL DEFAULT 0,
  "error_code" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trace_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "memory_items_user_id_type_source_ref_key" ON "memory_items"("user_id", "type", "source_ref");
CREATE INDEX "memory_items_user_id_type_status_updated_at_idx" ON "memory_items"("user_id", "type", "status", "updated_at");
CREATE INDEX "memory_items_expires_at_idx" ON "memory_items"("expires_at");
CREATE UNIQUE INDEX "interview_patterns_external_id_key" ON "interview_patterns"("external_id");
CREATE UNIQUE INDEX "interview_patterns_dedupe_hash_key" ON "interview_patterns"("dedupe_hash");
CREATE INDEX "interview_patterns_module_difficulty_quality_status_is_published_idx" ON "interview_patterns"("module", "difficulty", "quality_status", "is_published");
CREATE INDEX "interview_patterns_rights_status_quality_status_idx" ON "interview_patterns"("rights_status", "quality_status");
CREATE INDEX "interview_pattern_ingestions_outcome_created_at_idx" ON "interview_pattern_ingestions"("outcome", "created_at");
CREATE INDEX "interview_pattern_ingestions_dedupe_hash_created_at_idx" ON "interview_pattern_ingestions"("dedupe_hash", "created_at");
CREATE INDEX "interview_pattern_ingestions_pattern_id_created_at_idx" ON "interview_pattern_ingestions"("pattern_id", "created_at");
CREATE UNIQUE INDEX "trace_runs_run_id_key" ON "trace_runs"("run_id");
CREATE INDEX "trace_runs_user_id_started_at_idx" ON "trace_runs"("user_id", "started_at");
CREATE INDEX "trace_runs_session_id_started_at_idx" ON "trace_runs"("session_id", "started_at");
CREATE INDEX "trace_runs_status_started_at_idx" ON "trace_runs"("status", "started_at");
CREATE UNIQUE INDEX "trace_steps_trace_run_id_sequence_key" ON "trace_steps"("trace_run_id", "sequence");
CREATE INDEX "trace_steps_trace_run_id_kind_idx" ON "trace_steps"("trace_run_id", "kind");

ALTER TABLE "memory_items" ADD CONSTRAINT "memory_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interview_pattern_ingestions" ADD CONSTRAINT "interview_pattern_ingestions_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "interview_patterns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trace_runs" ADD CONSTRAINT "trace_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trace_runs" ADD CONSTRAINT "trace_runs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "mock_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trace_steps" ADD CONSTRAINT "trace_steps_trace_run_id_fkey" FOREIGN KEY ("trace_run_id") REFERENCES "trace_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
