import { NextResponse } from "next/server";
import {
  getRefreshTokenFromRequest,
  logoutUser
} from "@/lib/auth/auth-service";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";

export async function POST(request: Request) {
  try {
    assertSafeOrigin(request);
    await logoutUser(getRefreshTokenFromRequest(request));
    const response = NextResponse.json({ ok: true });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    return jsonError(error, "Failed to log out.");
  }
}
