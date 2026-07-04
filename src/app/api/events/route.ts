import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth-service";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { getDataStore } from "@/lib/repositories";
import { eventSchema } from "@/lib/validation/mock";

export async function POST(request: Request) {
  try {
    assertSafeOrigin(request);
    const payload = await request.json().catch(() => null);
    const parsed = eventSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const actor = await getCurrentUser(request);
    const store = await getDataStore();
    await store.trackEvent({
      ...parsed.data,
      userId: actor?.id
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    return jsonError(error, "Failed to track event.");
  }
}
