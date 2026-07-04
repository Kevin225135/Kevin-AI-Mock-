import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth/auth-service";
import { setAuthCookies } from "@/lib/auth/cookies";
import { assertRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { registerSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  try {
    assertSafeOrigin(request);
    const payload = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ipAddress = getClientIp(request);
    assertRateLimit({
      key: `register:${ipAddress}:${parsed.data.email.toLowerCase()}`,
      limit: 5,
      windowMs: 15 * 60 * 1000
    });

    const result = await registerUser({
      ...parsed.data,
      meta: {
        ipAddress,
        userAgent: request.headers.get("user-agent") ?? undefined
      }
    });
    const response = NextResponse.json({ user: result.user }, { status: 201 });
    setAuthCookies(response, result.tokens);
    return response;
  } catch (error) {
    return jsonError(error, "Failed to register.");
  }
}
