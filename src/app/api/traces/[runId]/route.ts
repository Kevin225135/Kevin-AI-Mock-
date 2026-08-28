import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { getTraceReplay } from "@/lib/observability/trace-store";
import { jsonError } from "@/lib/http/errors";

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireAuth(request);
    const { runId } = await context.params;
    const trace = await getTraceReplay(runId, actor);
    if (!trace) {
      return NextResponse.json({ error: "Trace not found." }, { status: 404 });
    }
    return NextResponse.json(
      { trace },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return jsonError(error, "Failed to replay trace.");
  }
}
