import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { getAnswerAttemptComparison } from "@/lib/domain/mock-service";
import { jsonError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireAuth(request);
    const { attemptId } = await context.params;
    const comparison = await getAnswerAttemptComparison(attemptId, actor);
    return NextResponse.json(
      { comparison },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return jsonError(error, "Failed to compare answer attempts.");
  }
}

