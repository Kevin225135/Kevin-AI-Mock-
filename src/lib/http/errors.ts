import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/auth-service";
import { RateLimitError } from "@/lib/auth/rate-limit";
import { QuotaExceededError } from "@/lib/domain/usage-service";

export function jsonError(error: unknown, fallback = "Request failed.") {
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
  if (error instanceof Error) {
    const status = error.message.toLowerCase().includes("not found") ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ error: fallback }, { status: 500 });
}
