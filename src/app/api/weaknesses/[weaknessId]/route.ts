import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { updateWeakness } from "@/lib/domain/training-service";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { weaknessActionSchema } from "@/lib/validation/mock";

type RouteContext = {
  params: Promise<{ weaknessId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const { weaknessId } = await context.params;
    const payload = await request.json().catch(() => null);
    const parsed = weaknessActionSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const weakness = await updateWeakness(weaknessId, parsed.data, actor);
    return NextResponse.json({ weakness });
  } catch (error) {
    return jsonError(error, "Failed to update weakness.");
  }
}
