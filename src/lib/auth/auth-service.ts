import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/repositories/prisma-client";
import type { CurrentUser } from "@/lib/domain/types";
import { ensureDefaultUsagePlans } from "@/lib/domain/usage-service";
import {
  accessTokenCookie,
  getRefreshTokenMaxAge,
  readCookie,
  refreshTokenCookie
} from "./cookies";
import { signAccessToken, verifyAccessToken } from "./jwt";
import { getPermissions } from "./permissions";
import { hashPassword, verifyPassword } from "./password";

export class AuthError extends Error {
  status: number;

  constructor(message = "Authentication required.", status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export type AuthMeta = {
  userAgent?: string;
  ipAddress?: string;
};

export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
  targetRole?: string;
  meta?: AuthMeta;
}) {
  await ensureDefaultUsagePlans();
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const defaultPlan = process.env.DEFAULT_USER_PLAN ?? "FREE";

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: input.name,
        targetRole: input.targetRole,
        planCode: defaultPlan
      }
    });

    return createLoginResult(user, input.meta);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AuthError("Email is already registered.", 409);
    }
    throw error;
  }
}

export async function loginUser(input: {
  email: string;
  password: string;
  meta?: AuthMeta;
}) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(input.email) }
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AuthError("Invalid email or password.", 401);
  }
  if (user.status !== "ACTIVE") {
    throw new AuthError("This account has been suspended.", 403);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  return createLoginResult(user, input.meta);
}

export async function refreshAuthSession(refreshToken: string, meta?: AuthMeta) {
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const existing = await prisma.authSession.findUnique({
    where: { refreshTokenHash },
    include: { user: true }
  });

  if (
    !existing ||
    existing.revokedAt ||
    existing.expiresAt <= new Date() ||
    existing.user.status !== "ACTIVE"
  ) {
    throw new AuthError("Invalid refresh token.", 401);
  }

  const nextRefreshToken = makeRefreshToken();
  const expiresAt = getRefreshExpiry();
  const updated = await prisma.authSession.update({
    where: { id: existing.id },
    data: {
      refreshTokenHash: hashRefreshToken(nextRefreshToken),
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress
    },
    include: { user: true }
  });

  return {
    user: mapCurrentUser(updated.user),
    tokens: {
      accessToken: signAccessToken({
        sub: updated.user.id,
        sid: updated.id,
        email: updated.user.email,
        role: updated.user.role,
        permissions: getPermissions(updated.user.role),
        tokenVersion: updated.user.tokenVersion
      }),
      refreshToken: nextRefreshToken
    }
  };
}

export async function logoutUser(refreshToken?: string) {
  if (!refreshToken) {
    return;
  }

  await prisma.authSession.updateMany({
    where: {
      refreshTokenHash: hashRefreshToken(refreshToken),
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}

export async function getCurrentUser(request: Request): Promise<CurrentUser | null> {
  const token = readAccessToken(request);
  if (!token) {
    return null;
  }

  try {
    const payload = verifyAccessToken(token);
    const session = await prisma.authSession.findUnique({
      where: { id: payload.sid },
      include: { user: true }
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== "ACTIVE" ||
      session.user.tokenVersion !== payload.tokenVersion
    ) {
      return null;
    }

    return mapCurrentUser(session.user);
  } catch {
    return null;
  }
}

export async function requireAuth(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new AuthError();
  }
  return user;
}

export async function requireAdmin(request: Request) {
  const user = await requireAuth(request);
  if (user.role !== "ADMIN") {
    throw new AuthError("Admin permission required.", 403);
  }
  return user;
}

export function getRefreshTokenFromRequest(request: Request) {
  return readCookie(request, refreshTokenCookie);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readAccessToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  return readCookie(request, accessTokenCookie);
}

async function createLoginResult(
  user: {
    id: string;
    email: string;
    name: string | null;
    targetRole: string | null;
    role: "USER" | "ADMIN";
    status: "ACTIVE" | "SUSPENDED";
    tokenVersion: number;
    planCode: string;
  },
  meta?: AuthMeta
) {
  const refreshToken = makeRefreshToken();
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
      expiresAt: getRefreshExpiry()
    }
  });

  return {
    user: mapCurrentUser(user),
    tokens: {
      accessToken: signAccessToken({
        sub: user.id,
        sid: session.id,
        email: user.email,
        role: user.role,
        permissions: getPermissions(user.role),
        tokenVersion: user.tokenVersion
      }),
      refreshToken
    }
  };
}

function mapCurrentUser(user: {
  id: string;
  email: string;
  name: string | null;
  targetRole: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  planCode: string;
}): CurrentUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    targetRole: user.targetRole ?? undefined,
    role: user.role,
    status: user.status,
    planCode: user.planCode
  };
}

function makeRefreshToken() {
  return randomBytes(32).toString("base64url");
}

function hashRefreshToken(refreshToken: string) {
  return createHash("sha256").update(refreshToken).digest("hex");
}

function getRefreshExpiry() {
  return new Date(Date.now() + getRefreshTokenMaxAge() * 1000);
}
