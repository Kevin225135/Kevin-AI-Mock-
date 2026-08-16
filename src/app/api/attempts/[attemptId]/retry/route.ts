import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { retryAnswerAttempt } from "@/lib/domain/mock-service";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import {
  idempotencyKeySchema,
  retryAnswerSchema
} from "@/lib/validation/mock";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const { attemptId } = await context.params;
    const payload = await request.json().catch(() => null);
    const parsed = retryAnswerSchema.safeParse(payload);
    const idempotencyKey = idempotencyKeySchema.safeParse(
      request.headers.get("Idempotency-Key")
    );

    if (!parsed.success || !idempotencyKey.success) {
      return NextResponse.json(
        {
          error: "Invalid retry request.",
          issues: {
            body: parsed.success ? undefined : parsed.error.flatten(),
            idempotencyKey: idempotencyKey.success
              ? undefined
              : "A valid Idempotency-Key header is required."
          }
        },
        { status: 400 }
      );
    }

    const result = await retryAnswerAttempt(
      attemptId,
      { ...parsed.data, idempotencyKey: idempotencyKey.data },
      actor
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to retry answer.");
  }
}

