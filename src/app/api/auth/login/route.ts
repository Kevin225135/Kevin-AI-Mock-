import { NextResponse } from "next/server";
import { loginUser } from "@/lib/auth/auth-service";
import { setAuthCookies } from "@/lib/auth/cookies";
import { assertRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { loginSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  try {
    assertSafeOrigin(request);
    const payload = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ipAddress = getClientIp(request);
    assertRateLimit({
      key: `login:${ipAddress}:${parsed.data.email.toLowerCase()}`,
      limit: 8,
      windowMs: 15 * 60 * 1000
    });

    const result = await loginUser({
      ...parsed.data,
      meta: {
        ipAddress,
        userAgent: request.headers.get("user-agent") ?? undefined
      }
    });
    const response = NextResponse.json({ user: result.user });
    setAuthCookies(response, result.tokens);
    return response;
  } catch (error) {
    return jsonError(error, "Failed to log in.");
  }
}
