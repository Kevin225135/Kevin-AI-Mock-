import type { Prisma, UsagePeriod, User } from "@prisma/client";
import { prisma } from "@/lib/repositories/prisma-client";

export const defaultUsagePlans = [
  { code: "FREE", name: "Free", monthlySessionLimit: 3 },
  { code: "PRO", name: "Pro", monthlySessionLimit: 50 },
  { code: "ADMIN", name: "Admin", monthlySessionLimit: null }
] as const;

export class QuotaExceededError extends Error {
  constructor() {
    super("Monthly mock quota exceeded.");
    this.name = "QuotaExceededError";
  }
}

export type UsageSnapshot = {
  planCode: string;
  periodStart: string;
  periodEnd: string;
  baseLimit: number | null;
  extraSessions: number;
  effectiveLimit: number | null;
  sessionsUsed: number;
  remaining: number | null;
};

type DbClient = Prisma.TransactionClient | typeof prisma;

export function getShanghaiMonthlyWindow(now = new Date()) {
  const shanghaiOffsetMs = 8 * 60 * 60 * 1000;
  const shanghaiNow = new Date(now.getTime() + shanghaiOffsetMs);
  const startUtc =
    Date.UTC(shanghaiNow.getUTCFullYear(), shanghaiNow.getUTCMonth(), 1) -
    shanghaiOffsetMs;
  const endUtc =
    Date.UTC(shanghaiNow.getUTCFullYear(), shanghaiNow.getUTCMonth() + 1, 1) -
    shanghaiOffsetMs;

  return {
    periodStart: new Date(startUtc),
    periodEnd: new Date(endUtc)
  };
}

export async function ensureDefaultUsagePlans(client: DbClient = prisma) {
  await Promise.all(
    defaultUsagePlans.map((plan) =>
      client.usagePlan.upsert({
        where: { code: plan.code },
        update: {
          name: plan.name,
          monthlySessionLimit: plan.monthlySessionLimit,
          isActive: true
        },
        create: {
          code: plan.code,
          name: plan.name,
          monthlySessionLimit: plan.monthlySessionLimit,
          isActive: true
        }
      })
    )
  );
}

export async function getCurrentUsageSnapshot(
  userId: string
): Promise<UsageSnapshot> {
  const period = await ensureCurrentUsagePeriod(prisma, userId);
  return mapUsageSnapshot(period);
}

export async function consumeSessionQuota(
  client: Prisma.TransactionClient,
  userId: string,
  sessionId: string
) {
  const period = await ensureCurrentUsagePeriod(client, userId);
  const effectiveLimit =
    period.sessionLimit === null
      ? null
      : period.sessionLimit + period.extraSessions;

  if (effectiveLimit === null) {
    await client.usagePeriod.update({
      where: { id: period.id },
      data: { sessionsUsed: { increment: 1 } }
    });
  } else {
    const result = await client.usagePeriod.updateMany({
      where: {
        id: period.id,
        sessionsUsed: { lt: effectiveLimit }
      },
      data: { sessionsUsed: { increment: 1 } }
    });

    if (result.count === 0) {
      throw new QuotaExceededError();
    }
  }

  const updated = await client.usagePeriod.findUniqueOrThrow({
    where: { id: period.id }
  });

  await client.usageLedger.create({
    data: {
      userId,
      periodId: updated.id,
      sessionId,
      type: "DEBIT",
      delta: -1,
      balanceAfter: getRemaining(updated),
      reason: "mock_session_created"
    }
  });
}

export async function adjustUserQuota(input: {
  userId: string;
  delta: number;
  reason?: string;
  adminUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const period = await ensureCurrentUsagePeriod(tx, input.userId);
    const updated = await tx.usagePeriod.update({
      where: { id: period.id },
      data: { extraSessions: { increment: input.delta } }
    });

    await tx.usageLedger.create({
      data: {
        userId: input.userId,
        periodId: updated.id,
        type: "ADJUSTMENT",
        delta: input.delta,
        balanceAfter: getRemaining(updated),
        reason: input.reason ?? "admin_adjustment",
        metadata: { adminUserId: input.adminUserId }
      }
    });

    return mapUsageSnapshot(updated);
  });
}

export async function ensureCurrentUsagePeriod(
  client: DbClient,
  userId: string
) {
  const user = await client.user.findUnique({
    where: { id: userId },
    include: { plan: true }
  });

  if (!user) {
    throw new Error("User not found.");
  }

  return ensureUsagePeriodForUser(client, user);
}

async function ensureUsagePeriodForUser(
  client: DbClient,
  user: User & { plan: { code: string; monthlySessionLimit: number | null } }
) {
  const { periodStart, periodEnd } = getShanghaiMonthlyWindow();

  return client.usagePeriod.upsert({
    where: {
      userId_periodStart: {
        userId: user.id,
        periodStart
      }
    },
    update: {},
    create: {
      userId: user.id,
      planCode: user.plan.code,
      periodStart,
      periodEnd,
      sessionLimit: user.role === "ADMIN" ? null : user.plan.monthlySessionLimit,
      extraSessions: 0,
      sessionsUsed: 0
    }
  });
}

function mapUsageSnapshot(period: UsagePeriod): UsageSnapshot {
  const effectiveLimit =
    period.sessionLimit === null
      ? null
      : Math.max(0, period.sessionLimit + period.extraSessions);

  return {
    planCode: period.planCode,
    periodStart: period.periodStart.toISOString(),
    periodEnd: period.periodEnd.toISOString(),
    baseLimit: period.sessionLimit,
    extraSessions: period.extraSessions,
    effectiveLimit,
    sessionsUsed: period.sessionsUsed,
    remaining:
      effectiveLimit === null
        ? null
        : Math.max(0, effectiveLimit - period.sessionsUsed)
  };
}

function getRemaining(period: UsagePeriod) {
  if (period.sessionLimit === null) {
    return null;
  }

  return Math.max(0, period.sessionLimit + period.extraSessions - period.sessionsUsed);
}
