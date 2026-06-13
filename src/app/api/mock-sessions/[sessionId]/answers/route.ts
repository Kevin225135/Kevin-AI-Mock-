import { NextResponse } from "next/server";
import { submitMockAnswer } from "@/lib/domain/mock-service";
import { submitAnswerSchema } from "@/lib/validation/mock";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = submitAnswerSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await submitMockAnswer(sessionId, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit answer.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
