CREATE TYPE "WeaknessDimension" AS ENUM ('STAR_COMPLETENESS', 'LOGIC_STRUCTURE', 'CONTENT_DEPTH', 'COMMUNICATION');
CREATE TYPE "WeaknessSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "WeaknessStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'IGNORED', 'NOT_IMPROVED', 'IMPROVING', 'PASSED');
CREATE TYPE "TrainingTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "weaknesses" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "source_answer_id" TEXT NOT NULL,
  "dimension" "WeaknessDimension" NOT NULL,
  "title" TEXT NOT NULL,
  "evidence_ref" TEXT NOT NULL,
  "evidence_summary" TEXT NOT NULL,
  "severity" "WeaknessSeverity" NOT NULL,
  "status" "WeaknessStatus" NOT NULL DEFAULT 'PROPOSED',
  "baseline_score" INTEGER NOT NULL,
  "latest_score" INTEGER,
  "due_at" TIMESTAMP(3),
  "confirmed_at" TIMESTAMP(3),
  "ignored_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "weaknesses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "training_tasks" (
  "id" TEXT NOT NULL,
  "weakness_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "source_question_id" TEXT NOT NULL,
  "equivalent_question_id" TEXT NOT NULL,
  "status" "TrainingTaskStatus" NOT NULL DEFAULT 'PENDING',
  "due_at" TIMESTAMP(3) NOT NULL,
  "retest_session_id" TEXT,
  "retest_answer_id" TEXT,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "training_tasks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "weaknesses_session_id_dimension_key" ON "weaknesses"("session_id", "dimension");
CREATE INDEX "weaknesses_user_id_status_due_at_idx" ON "weaknesses"("user_id", "status", "due_at");
CREATE INDEX "training_tasks_user_id_status_due_at_idx" ON "training_tasks"("user_id", "status", "due_at");
CREATE INDEX "training_tasks_weakness_id_created_at_idx" ON "training_tasks"("weakness_id", "created_at");
CREATE INDEX "training_tasks_retest_session_id_equivalent_question_id_idx" ON "training_tasks"("retest_session_id", "equivalent_question_id");

ALTER TABLE "weaknesses" ADD CONSTRAINT "weaknesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "weaknesses" ADD CONSTRAINT "weaknesses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "mock_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "weaknesses" ADD CONSTRAINT "weaknesses_source_answer_id_fkey" FOREIGN KEY ("source_answer_id") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_tasks" ADD CONSTRAINT "training_tasks_weakness_id_fkey" FOREIGN KEY ("weakness_id") REFERENCES "weaknesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_tasks" ADD CONSTRAINT "training_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_tasks" ADD CONSTRAINT "training_tasks_source_question_id_fkey" FOREIGN KEY ("source_question_id") REFERENCES "question_bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "training_tasks" ADD CONSTRAINT "training_tasks_equivalent_question_id_fkey" FOREIGN KEY ("equivalent_question_id") REFERENCES "question_bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "training_tasks" ADD CONSTRAINT "training_tasks_retest_session_id_fkey" FOREIGN KEY ("retest_session_id") REFERENCES "mock_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "training_tasks" ADD CONSTRAINT "training_tasks_retest_answer_id_fkey" FOREIGN KEY ("retest_answer_id") REFERENCES "answers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
