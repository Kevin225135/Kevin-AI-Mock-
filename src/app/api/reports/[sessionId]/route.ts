import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { getReport } from "@/lib/domain/mock-service";
import { jsonError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const actor = await requireAuth(_request);
    const { sessionId } = await context.params;
    const report = await getReport(sessionId, actor);

    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    return jsonError(error, "Failed to load report.");
  }
}
