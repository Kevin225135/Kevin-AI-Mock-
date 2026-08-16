import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { submitMockAnswer } from "@/lib/domain/mock-service";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { submitAnswerSchema } from "@/lib/validation/mock";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const { sessionId } = await context.params;
    const payload = await request.json().catch(() => null);
    const parsed = submitAnswerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await submitMockAnswer(sessionId, parsed.data, actor);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error, "Failed to submit answer.");
  }
}
