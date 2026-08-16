import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@/lib/domain/types";

export type AccessTokenPayload = {
  sub: string;
  sid: string;
  email: string;
  role: UserRole;
  permissions: string[];
  tokenVersion: number;
  iat: number;
  exp: number;
};

export class JwtError extends Error {
  constructor(message = "Invalid token.") {
    super(message);
    this.name = "JwtError";
  }
}

export function getAccessTokenTtlSeconds() {
  const minutes = Number(process.env.AUTH_ACCESS_TOKEN_TTL_MINUTES ?? 15);
  return Math.max(1, minutes) * 60;
}

export function signAccessToken(
  payload: Omit<AccessTokenPayload, "iat" | "exp">
) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt({
    ...payload,
    iat: now,
    exp: now + getAccessTokenTtlSeconds()
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = verifyJwt(token);

  if (
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string" ||
    typeof payload.email !== "string" ||
    (payload.role !== "USER" && payload.role !== "ADMIN") ||
    !Array.isArray(payload.permissions) ||
    typeof payload.tokenVersion !== "number" ||
    typeof payload.exp !== "number"
  ) {
    throw new JwtError("Malformed token payload.");
  }

  return payload as AccessTokenPayload;
}

function signJwt(payload: Record<string, unknown>) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = encodeJson(header);
  const encodedPayload = encodeJson(payload);
  const signature = sign(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJwt(token: string): Record<string, unknown> {
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new JwtError();
  }

  const expected = sign(`${encodedHeader}.${encodedPayload}`);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new JwtError();
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) {
    throw new JwtError("Token expired.");
  }

  return payload;
}

function encodeJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function sign(value: string) {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_JWT_SECRET must be set to at least 32 characters.");
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}
