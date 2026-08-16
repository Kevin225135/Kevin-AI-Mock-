ALTER TABLE "rag_retrieval_traces"
ADD CONSTRAINT "rag_retrieval_traces_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rag_retrieval_traces"
ADD CONSTRAINT "rag_retrieval_traces_resume_id_fkey"
FOREIGN KEY ("resume_id") REFERENCES "resumes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rag_retrieval_traces"
ADD CONSTRAINT "rag_retrieval_traces_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "mock_sessions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
