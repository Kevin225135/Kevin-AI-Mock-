import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { getProfile, updateProfile } from "@/lib/domain/user-service";
import { updateProfileSchema } from "@/lib/validation/users";

export async function GET(request: Request) {
  try {
    const actor = await requireAuth(request);
    const user = await getProfile(actor.id);
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error, "Failed to load profile.");
  }
}

export async function PATCH(request: Request) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const payload = await request.json().catch(() => null);
    const parsed = updateProfileSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await updateProfile(actor.id, parsed.data);
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error, "Failed to update profile.");
  }
}
