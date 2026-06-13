import type { ConnectionOptions } from "bullmq";

export function getRedisConnectionOptions(redisUrl: string): ConnectionOptions {
  const parsed = new URL(redisUrl);
  const db = parsed.pathname.replace("/", "");

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username
      ? decodeURIComponent(parsed.username)
      : undefined,
    password: parsed.password
      ? decodeURIComponent(parsed.password)
      : undefined,
    db: db ? Number(db) : undefined,
    maxRetriesPerRequest: null
  };
}
