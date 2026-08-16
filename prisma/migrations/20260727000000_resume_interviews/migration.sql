CREATE TABLE "resumes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "raw_text" TEXT NOT NULL,
  "summary" TEXT,
  "companies" TEXT[] NOT NULL,
  "roles" TEXT[] NOT NULL,
  "skills" TEXT[] NOT NULL,
  "projects" JSONB NOT NULL,
  "education" JSONB NOT NULL,
  "parse_status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "resumes_user_id_created_at_idx" ON "resumes"("user_id", "created_at");
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mock_sessions" ADD COLUMN "resume_id" TEXT;
ALTER TABLE "mock_sessions" ADD CONSTRAINT "mock_sessions_resume_id_fkey"
  FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
