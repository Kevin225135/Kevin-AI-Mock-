-- CreateEnum
CREATE TYPE "InterviewModule" AS ENUM ('BEHAVIORAL', 'CV_RELATED', 'TECHNICAL', 'MARKET');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'SCORING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "UsageLedgerType" AS ENUM ('DEBIT', 'ADJUSTMENT', 'RESET');

-- CreateTable
CREATE TABLE "usage_plans" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthly_session_limit" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_plans_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "target_role" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "plan_code" TEXT NOT NULL DEFAULT 'FREE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_periods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_code" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "session_limit" INTEGER,
    "extra_sessions" INTEGER NOT NULL DEFAULT 0,
    "sessions_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period_id" TEXT,
    "session_id" TEXT,
    "type" "UsageLedgerType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balance_after" INTEGER,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubric_versions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "dimensions" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rubric_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bank" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "module" "InterviewModule" NOT NULL,
    "target_role" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "prompt" TEXT NOT NULL,
    "expectation" TEXT,
    "rubric_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module" "InterviewModule" NOT NULL,
    "target_role" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "status" "SessionStatus" NOT NULL DEFAULT 'CREATED',
    "question_count" INTEGER NOT NULL DEFAULT 3,
    "current_question_index" INTEGER NOT NULL DEFAULT 0,
    "selected_question_ids" TEXT[],
    "follow_up_round" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "follow_up_round" INTEGER NOT NULL DEFAULT 0,
    "audio_url" TEXT,
    "transcript" TEXT,
    "stt_status" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_scores" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "answer_id" TEXT NOT NULL,
    "rubric_version_id" TEXT,
    "star_completeness" INTEGER NOT NULL,
    "logic_structure" INTEGER NOT NULL,
    "content_depth" INTEGER NOT NULL,
    "communication" INTEGER NOT NULL,
    "total_score" INTEGER NOT NULL,
    "deductions" TEXT[],
    "improvements" TEXT[],
    "sample_answer" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "raw_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "average_score" DOUBLE PRECISION NOT NULL,
    "dimension_averages" JSONB NOT NULL,
    "question_feedback" JSONB NOT NULL,
    "next_practice_plan" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_samples" (
    "id" TEXT NOT NULL,
    "module" "InterviewModule" NOT NULL,
    "target_role" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "human_score" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_samples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_revoked_at_idx" ON "auth_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "usage_periods_user_id_period_start_key" ON "usage_periods"("user_id", "period_start");

-- CreateIndex
CREATE INDEX "usage_periods_user_id_period_end_idx" ON "usage_periods"("user_id", "period_end");

-- CreateIndex
CREATE INDEX "usage_ledger_user_id_created_at_idx" ON "usage_ledger"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "usage_ledger_period_id_created_at_idx" ON "usage_ledger"("period_id", "created_at");

-- CreateIndex
CREATE INDEX "usage_ledger_session_id_idx" ON "usage_ledger"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "rubric_versions_code_key" ON "rubric_versions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "question_bank_external_id_key" ON "question_bank"("external_id");

-- CreateIndex
CREATE INDEX "question_bank_module_target_role_difficulty_idx" ON "question_bank"("module", "target_role", "difficulty");

-- CreateIndex
CREATE INDEX "mock_sessions_user_id_status_idx" ON "mock_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "mock_sessions_module_target_role_idx" ON "mock_sessions"("module", "target_role");

-- CreateIndex
CREATE UNIQUE INDEX "answers_session_id_question_id_follow_up_round_key" ON "answers"("session_id", "question_id", "follow_up_round");

-- CreateIndex
CREATE INDEX "answers_session_id_submitted_at_idx" ON "answers"("session_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_scores_answer_id_key" ON "ai_scores"("answer_id");

-- CreateIndex
CREATE INDEX "ai_scores_session_id_total_score_idx" ON "ai_scores"("session_id", "total_score");

-- CreateIndex
CREATE UNIQUE INDEX "reports_session_id_key" ON "reports"("session_id");

-- CreateIndex
CREATE INDEX "events_name_created_at_idx" ON "events"("name", "created_at");

-- CreateIndex
CREATE INDEX "events_session_id_created_at_idx" ON "events"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "eval_samples_module_target_role_idx" ON "eval_samples"("module", "target_role");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_plan_code_fkey" FOREIGN KEY ("plan_code") REFERENCES "usage_plans"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_periods" ADD CONSTRAINT "usage_periods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_periods" ADD CONSTRAINT "usage_periods_plan_code_fkey" FOREIGN KEY ("plan_code") REFERENCES "usage_plans"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "usage_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_rubric_version_id_fkey" FOREIGN KEY ("rubric_version_id") REFERENCES "rubric_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_sessions" ADD CONSTRAINT "mock_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "mock_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question_bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_scores" ADD CONSTRAINT "ai_scores_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "mock_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_scores" ADD CONSTRAINT "ai_scores_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_scores" ADD CONSTRAINT "ai_scores_rubric_version_id_fkey" FOREIGN KEY ("rubric_version_id") REFERENCES "rubric_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "mock_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "mock_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
