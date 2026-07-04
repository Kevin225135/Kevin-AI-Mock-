import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { getMockSession } from "@/lib/domain/mock-service";
import { jsonError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const actor = await requireAuth(_request);
    const { sessionId } = await context.params;
    const result = await getMockSession(sessionId, actor);

    if (!result) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error, "Failed to load session.");
  }
}
