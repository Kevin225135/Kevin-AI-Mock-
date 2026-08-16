import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { createMockSession, listMockSessions } from "@/lib/domain/mock-service";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { createSessionSchema } from "@/lib/validation/mock";

export async function GET(request: Request) {
  try {
    const actor = await requireAuth(request);
    const sessions = await listMockSessions(actor);
    return NextResponse.json({ sessions });
  } catch (error) {
    return jsonError(error, "Failed to load sessions.");
  }
}

export async function POST(request: Request) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const payload = await request.json().catch(() => null);
    const parsed = createSessionSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await createMockSession(parsed.data, actor);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to create session.");
  }
}
