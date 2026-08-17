import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { listSessionWeaknesses } from "@/lib/domain/training-service";
import { jsonError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireAuth(request);
    const { sessionId } = await context.params;
    const weaknesses = await listSessionWeaknesses(sessionId, actor);
    if (!weaknesses) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    return NextResponse.json(
      { weaknesses },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return jsonError(error, "Failed to load weaknesses.");
  }
}
