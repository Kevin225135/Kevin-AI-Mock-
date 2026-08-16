import { NextResponse } from "next/server";
import {
  getRefreshTokenFromRequest,
  refreshAuthSession
} from "@/lib/auth/auth-service";
import { setAuthCookies } from "@/lib/auth/cookies";
import { getClientIp } from "@/lib/auth/rate-limit";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";

export async function POST(request: Request) {
  try {
    assertSafeOrigin(request);
    const refreshToken = getRefreshTokenFromRequest(request);
    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token missing." }, { status: 401 });
    }

    const result = await refreshAuthSession(refreshToken, {
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined
    });
    const response = NextResponse.json({ user: result.user });
    setAuthCookies(response, result.tokens);
    return response;
  } catch (error) {
    return jsonError(error, "Failed to refresh session.");
  }
}
