CREATE TYPE "BadCaseType" AS ENUM ('SCORING', 'HALLUCINATION', 'SUGGESTION', 'OTHER');
CREATE TYPE "BadCaseStatus" AS ENUM ('OPEN', 'REGRESSION_ADDED', 'RESOLVED');

CREATE TABLE "bad_cases" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "trace_run_id" TEXT,
  "question_id" TEXT,
  "type" "BadCaseType" NOT NULL,
  "status" "BadCaseStatus" NOT NULL DEFAULT 'OPEN',
  "severity" TEXT NOT NULL,
  "comment" TEXT NOT NULL,
  "root_cause_label" TEXT,
  "regression_ref" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bad_cases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bad_cases_user_id_created_at_idx" ON "bad_cases"("user_id", "created_at");
CREATE INDEX "bad_cases_session_id_created_at_idx" ON "bad_cases"("session_id", "created_at");
CREATE INDEX "bad_cases_trace_run_id_status_idx" ON "bad_cases"("trace_run_id", "status");

ALTER TABLE "bad_cases" ADD CONSTRAINT "bad_cases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bad_cases" ADD CONSTRAINT "bad_cases_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "mock_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bad_cases" ADD CONSTRAINT "bad_cases_trace_run_id_fkey" FOREIGN KEY ("trace_run_id") REFERENCES "trace_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
