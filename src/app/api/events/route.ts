import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { canAccessOwnedResource } from "@/lib/auth/permissions";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { getDataStore } from "@/lib/repositories";
import { eventSchema } from "@/lib/validation/mock";
import { maskTracePayload } from "@/lib/observability/redaction";

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

    const actor = await requireAuth(request);
    const store = await getDataStore();
    if (parsed.data.sessionId) {
      const session = await store.getSession(parsed.data.sessionId);
      if (!session || !canAccessOwnedResource(actor, session.userId)) {
        return NextResponse.json({ error: "Session not found." }, { status: 404 });
      }
    }
    await store.trackEvent({
      ...parsed.data,
      userId: actor.id,
      payload: parsed.data.payload
        ? (maskTracePayload(parsed.data.payload) as Record<string, unknown>)
        : undefined
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    return jsonError(error, "Failed to track event.");
  }
}
