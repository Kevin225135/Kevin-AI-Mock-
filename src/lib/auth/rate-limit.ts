type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  constructor() {
    super("Too many attempts. Please try again later.");
    this.name = "RateLimitError";
  }
}

export function assertRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const bucket = buckets.get(input.key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs
    });
    return;
  }

  if (bucket.count >= input.limit) {
    throw new RateLimitError();
  }

  bucket.count += 1;
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
