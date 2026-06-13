import { NextResponse } from "next/server";
import { getMockSession } from "@/lib/domain/mock-service";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const result = await getMockSession(sessionId);

  if (!result) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
