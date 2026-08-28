import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import {
  deleteMemoryItem,
  updateMemoryItem
} from "@/lib/domain/memory-service";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { updateMemorySchema } from "@/lib/validation/users";

type RouteContext = { params: Promise<{ memoryId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const { memoryId } = await context.params;
    const parsed = updateMemorySchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const memory = await updateMemoryItem(memoryId, actor, parsed.data);
    return NextResponse.json({ memory });
  } catch (error) {
    return jsonError(error, "Failed to update memory.");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const { memoryId } = await context.params;
    await deleteMemoryItem(memoryId, actor);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return jsonError(error, "Failed to delete memory.");
  }
}
