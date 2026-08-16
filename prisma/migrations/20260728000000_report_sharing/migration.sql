ALTER TABLE "reports" ADD COLUMN "share_token" TEXT;
ALTER TABLE "reports" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "reports_share_token_key" ON "reports"("share_token");
