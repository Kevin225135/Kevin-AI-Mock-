import { prisma } from "@/lib/repositories/prisma-client";
import {
  adjustUserQuota,
  getCurrentUsageSnapshot,
  getShanghaiMonthlyWindow
} from "./usage-service";
import type { CurrentUser, UserRole, UserStatus } from "./types";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { AuthError } from "@/lib/auth/auth-service";

export type AdminUserRow = CurrentUser & {
  createdAt: string;
  lastLoginAt?: string;
  usage: Awaited<ReturnType<typeof getCurrentUsageSnapshot>>;
};

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found.");
  }
  return mapCurrentUser(user);
}

export async function updateProfile(
  userId: string,
  input: { name?: string; targetRole?: string }
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      targetRole: input.targetRole
    }
  });

  return mapCurrentUser(user);
}

export async function changePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string }
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new AuthError("Current password is incorrect.", 400);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(input.newPassword),
        tokenVersion: { increment: 1 }
      }
    }),
    prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  ]);
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return Promise.all(
    users.map(async (user) => ({
      ...mapCurrentUser(user),
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
      usage: await getCurrentUsageSnapshot(user.id)
    }))
  );
}

export async function updateUserAsAdmin(
  userId: string,
  input: {
    name?: string | null;
    targetRole?: string | null;
    role?: UserRole;
    status?: UserStatus;
    planCode?: string;
  }
) {
  const previous = await prisma.user.findUnique({ where: { id: userId } });
  if (!previous) {
    throw new Error("User not found.");
  }

  const invalidatesTokens =
    (input.role && input.role !== previous.role) ||
    (input.status && input.status !== previous.status);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      targetRole: input.targetRole,
      role: input.role,
      status: input.status,
      planCode: input.planCode,
      tokenVersion: invalidatesTokens ? { increment: 1 } : undefined
    }
  });

  if (invalidatesTokens) {
    await prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  if (input.planCode || input.role) {
    const plan = await prisma.usagePlan.findUnique({
      where: { code: user.planCode }
    });
    const { periodStart } = getShanghaiMonthlyWindow();

    await prisma.usagePeriod.updateMany({
      where: { userId, periodStart },
      data: {
        planCode: user.planCode,
        sessionLimit: user.role === "ADMIN" ? null : (plan?.monthlySessionLimit ?? 0)
      }
    });
  }

  return mapCurrentUser(user);
}

export async function adjustUserQuotaAsAdmin(input: {
  userId: string;
  delta: number;
  reason?: string;
  adminUserId: string;
}) {
  return adjustUserQuota(input);
}

function mapCurrentUser(user: {
  id: string;
  email: string;
  name: string | null;
  targetRole: string | null;
  role: UserRole;
  status: UserStatus;
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
