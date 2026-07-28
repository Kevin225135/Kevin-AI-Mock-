import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/auth-service";
import { RateLimitError } from "@/lib/auth/rate-limit";
import { QuotaExceededError } from "@/lib/domain/usage-service";
import { captureServerError } from "@/lib/monitoring/errors";
import { UnsafeAnswerError } from "@/lib/ai/safety";

export function jsonError(error: unknown, fallback = "Request failed.") {
  if (!(error instanceof AuthError) && !(error instanceof RateLimitError)) {
    captureServerError(error, { fallback });
  }
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof RateLimitError) {
    return NextResponse.json({ error: error.message }, { status: 429 });
  }
  if (error instanceof QuotaExceededError) {
    return NextResponse.json(
      { error: error.message, code: "QUOTA_EXCEEDED" },
      { status: 402 }
    );
  }
  if (error instanceof UnsafeAnswerError) {
    return NextResponse.json({ error: error.message, code: "UNSAFE_ANSWER" }, { status: 422 });
  }
  if (isDatabaseUnavailable(error)) {
    return NextResponse.json(
      {
        error: "数据库服务暂时不可用，请启动 PostgreSQL 后重试。",
        code: "DATABASE_UNAVAILABLE"
      },
      { status: 503 }
    );
  }
  if (error instanceof Error) {
    const isNotFound = error.message.toLowerCase().includes("not found");
    return NextResponse.json(
      { error: isNotFound ? error.message : fallback },
      { status: isNotFound ? 404 : 400 }
    );
  }

  return NextResponse.json({ error: fallback }, { status: 500 });
}

function isDatabaseUnavailable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as { code?: unknown; message?: unknown };
  const message = typeof candidate.message === "string" ? candidate.message : "";
  return (
    candidate.code === "P1001" ||
    candidate.code === "P1002" ||
    /can't reach database server|database server.*not running/i.test(message)
  );
}
