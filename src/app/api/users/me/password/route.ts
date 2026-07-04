import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { changePassword } from "@/lib/domain/user-service";
import { changePasswordSchema } from "@/lib/validation/users";

export async function PATCH(request: Request) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const payload = await request.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await changePassword(actor.id, parsed.data);
    const response = NextResponse.json({ ok: true });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    return jsonError(error, "Failed to change password.");
  }
}
