import { Worker } from "bullmq";
import type { ScoringJobData } from "@/lib/queue/scoring-queue";
import { getRedisConnectionOptions } from "@/lib/queue/redis-options";
import { processQueuedScoring } from "@/lib/domain/mock-service";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is required to run the scoring worker.");
}

const connection = getRedisConnectionOptions(redisUrl);

type ScoringJobName = "score-answer";

const worker = new Worker<ScoringJobData, unknown, ScoringJobName>(
  "ai-scoring",
  async (job) => {
    const result = await processQueuedScoring(job.data);
    return { ok: true, completed: result.completed, sessionId: result.session.id };
  },
  { connection }
);

worker.on("completed", (job) => {
  console.info(`Scoring job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Scoring job failed: ${job?.id}`, error);
});
