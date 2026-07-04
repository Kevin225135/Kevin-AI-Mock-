import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { jsonError } from "@/lib/http/errors";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error, "Failed to load user.");
  }
}
