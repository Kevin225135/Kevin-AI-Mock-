import { Queue } from "bullmq";
import { getRedisConnectionOptions } from "./redis-options";

export type ScoringJobData = {
  sessionId: string;
  answerId: string;
  questionId: string;
};

type ScoringJobName = "score-answer";

export async function enqueueScoringJob(data: ScoringJobData) {
  if (!process.env.REDIS_URL) {
    return {
      mode: "inline" as const,
      jobId: null
    };
  }

  const queue = new Queue<ScoringJobData, unknown, ScoringJobName>(
    "ai-scoring",
    {
      connection: getRedisConnectionOptions(process.env.REDIS_URL)
    }
  );
  const job = await queue.add("score-answer", data, {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 1000
    },
    removeOnComplete: 100,
    removeOnFail: 500
  });

  return {
    mode: "queued" as const,
    jobId: job.id ?? null
  };
}
