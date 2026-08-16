import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth-service";
import { listAdminUsers } from "@/lib/domain/user-service";
import { jsonError } from "@/lib/http/errors";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const users = await listAdminUsers();
    return NextResponse.json({ users });
  } catch (error) {
    return jsonError(error, "Failed to load users.");
  }
}
