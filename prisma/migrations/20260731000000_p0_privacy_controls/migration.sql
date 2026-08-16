ALTER TABLE "users"
ADD COLUMN "privacy_accepted_at" TIMESTAMP(3);

ALTER TABLE "resumes"
ADD COLUMN "privacy_accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "retention_expires_at" TIMESTAMP(3);

UPDATE "resumes"
SET "retention_expires_at" = "created_at" + INTERVAL '365 days'
WHERE "retention_expires_at" IS NULL;

ALTER TABLE "reports"
ADD COLUMN "share_expires_at" TIMESTAMP(3);
