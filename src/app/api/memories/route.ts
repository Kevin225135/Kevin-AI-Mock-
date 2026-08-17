import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { createUserMemory, listMemoryItems } from "@/lib/domain/memory-service";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { createMemorySchema } from "@/lib/validation/users";

export async function GET(request: Request) {
  try {
    const actor = await requireAuth(request);
    const memories = await listMemoryItems(actor);
    return NextResponse.json(
      { memories },
      {
        headers: { "Cache-Control": "private, no-store" }
      }
    );
  } catch (error) {
    return jsonError(error, "Failed to load memories.");
  }
}

export async function POST(request: Request) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const parsed = createMemorySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const memory = await createUserMemory(actor, parsed.data);
    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to create memory.");
  }
}
