import { AuthError } from "@/lib/auth/auth-service";

export function assertSafeOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return;
  }

  const host = request.headers.get("host");
  if (!host) {
    throw new AuthError("Missing Host header.", 400);
  }

  const originUrl = new URL(origin);
  if (originUrl.host !== host) {
    throw new AuthError("Cross-origin write rejected.", 403);
  }
}
