import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth-service";
import { updateUserAsAdmin } from "@/lib/domain/user-service";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { adminUpdateUserSchema } from "@/lib/validation/admin";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSafeOrigin(request);
    await requireAdmin(request);
    const { userId } = await context.params;
    const payload = await request.json().catch(() => null);
    const parsed = adminUpdateUserSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await updateUserAsAdmin(userId, parsed.data);
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error, "Failed to update user.");
  }
}
