import { NextResponse } from "next/server";
import { createMockSession } from "@/lib/domain/mock-service";
import { createSessionSchema } from "@/lib/validation/mock";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = createSessionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await createMockSession(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create session." },
      { status: 500 }
    );
  }
}
