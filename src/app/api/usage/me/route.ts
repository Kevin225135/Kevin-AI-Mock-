import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { getCurrentUsageSnapshot } from "@/lib/domain/usage-service";
import { jsonError } from "@/lib/http/errors";

export async function GET(request: Request) {
  try {
    const actor = await requireAuth(request);
    const usage = await getCurrentUsageSnapshot(actor.id);
    return NextResponse.json({ usage });
  } catch (error) {
    return jsonError(error, "Failed to load usage.");
  }
}
