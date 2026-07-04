import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth-service";
import { adjustUserQuotaAsAdmin } from "@/lib/domain/user-service";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { quotaAdjustmentSchema } from "@/lib/validation/admin";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSafeOrigin(request);
    const admin = await requireAdmin(request);
    const { userId } = await context.params;
    const payload = await request.json().catch(() => null);
    const parsed = quotaAdjustmentSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const usage = await adjustUserQuotaAsAdmin({
      userId,
      delta: parsed.data.delta,
      reason: parsed.data.reason,
      adminUserId: admin.id
    });
    return NextResponse.json({ usage });
  } catch (error) {
    return jsonError(error, "Failed to adjust quota.");
  }
}
