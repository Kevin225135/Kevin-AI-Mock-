ALTER TABLE "mock_sessions" DROP CONSTRAINT "mock_sessions_user_id_fkey";
ALTER TABLE "mock_sessions" ADD CONSTRAINT "mock_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
