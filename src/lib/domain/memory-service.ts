import { randomUUID } from "node:crypto";
import { canAccessOwnedResource } from "@/lib/auth/permissions";
import { DomainError } from "./errors";
import { prisma } from "@/lib/repositories/prisma-client";
import type { CurrentUser, MemoryItem, MemoryItemStatus, MemoryItemType } from "./types";

type MemoryValue = Record<string, unknown>;

export async function listMemoryItems(
  actor: CurrentUser,
  filter: { type?: MemoryItemType } = {}
): Promise<MemoryItem[]> {
  const rows = await prisma.memoryItem.findMany({
    where: {
      userId: actor.id,
      ...(filter.type ? { type: filter.type } : {}),
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    },
    orderBy: { updatedAt: "desc" }
  });
  return rows.map(mapMemoryItem);
}

export async function createUserMemory(
  actor: CurrentUser,
  input: {
    type: Extract<MemoryItemType, "FACT" | "PREFERENCE">;
    value: MemoryValue;
    expiresAt?: string;
  }
) {
  assertMemoryValue(input.value);
  const row = await prisma.memoryItem.create({
    data: {
      userId: actor.id,
      type: input.type,
      status: "CONFIRMED",
      value: input.value as any,
      sourceRef: `user:${randomUUID()}`,
      confidence: 1,
      expiresAt: input.expiresAt ? parseExpiry(input.expiresAt) : null
    }
  });
  return mapMemoryItem(row);
}

export async function updateMemoryItem(
  memoryId: string,
  actor: CurrentUser,
  input:
    | { action: "CONFIRM" }
    | { action: "REJECT" }
    | { action: "UPDATE"; value: MemoryValue; expiresAt?: string | null }
) {
  const row = await prisma.memoryItem.findUnique({ where: { id: memoryId } });
  if (!row || !canAccessOwnedResource(actor, row.userId)) {
    throw new DomainError("Memory not found.", "MEMORY_NOT_FOUND", 404);
  }
  if (row.type === "WEAKNESS" || row.type === "TRAINING_STATE") {
    throw new DomainError("训练状态只能通过训练 Workflow 更新。", "MEMORY_WORKFLOW_OWNED", 409);
  }
  if (input.action === "UPDATE") {
    assertMemoryValue(input.value);
    const updated = await prisma.memoryItem.update({
      where: { id: memoryId },
      data: {
        value: input.value as any,
        status: "CONFIRMED",
        confidence: 1,
        expiresAt:
          input.expiresAt === undefined
            ? undefined
            : input.expiresAt
              ? parseExpiry(input.expiresAt)
              : null,
        version: { increment: 1 }
      }
    });
    return mapMemoryItem(updated);
  }

  const status: MemoryItemStatus = input.action === "CONFIRM" ? "CONFIRMED" : "REJECTED";
  const updated = await prisma.memoryItem.update({
    where: { id: memoryId },
    data: {
      status,
      confidence: status === "CONFIRMED" ? 1 : row.confidence,
      version: { increment: 1 }
    }
  });
  return mapMemoryItem(updated);
}

export async function deleteMemoryItem(memoryId: string, actor: CurrentUser) {
  const row = await prisma.memoryItem.findUnique({ where: { id: memoryId } });
  if (!row || !canAccessOwnedResource(actor, row.userId)) {
    throw new DomainError("Memory not found.", "MEMORY_NOT_FOUND", 404);
  }
  if (row.type === "WEAKNESS" || row.type === "TRAINING_STATE") {
    await prisma.memoryItem.update({
      where: { id: memoryId },
      data: {
        status: "REJECTED",
        value: { deletedByUser: true },
        confidence: 0,
        expiresAt: new Date(0),
        version: { increment: 1 }
      }
    });
    return;
  }
  await prisma.memoryItem.delete({ where: { id: memoryId } });
}

export async function proposeResumeMemories(input: {
  userId: string;
  resumeId: string;
  skills: string[];
  projects: Array<{ name: string; description: string }>;
}) {
  const proposals = [
    ...(input.skills.length
      ? [
          {
            sourceRef: `resume:${input.resumeId}:skills`,
            value: {
              claim: `候选人材料列出的技能：${input.skills.slice(0, 12).join("、")}`,
              ownership: "USER_PROVIDED"
            },
            confidence: 0.75
          }
        ]
      : []),
    ...input.projects.slice(0, 8).map((project, index) => ({
      sourceRef: `resume:${input.resumeId}:project:${index}`,
      value: {
        claim: `${project.name}：${project.description}`,
        ownership: "UNCONFIRMED"
      },
      confidence: 0.7
    }))
  ];
  await Promise.all(
    proposals.map((proposal) =>
      prisma.memoryItem.upsert({
        where: {
          userId_type_sourceRef: {
            userId: input.userId,
            type: "FACT",
            sourceRef: proposal.sourceRef
          }
        },
        update: { value: proposal.value, confidence: proposal.confidence },
        create: {
          userId: input.userId,
          type: "FACT",
          status: "PROPOSED",
          sourceRef: proposal.sourceRef,
          value: proposal.value,
          confidence: proposal.confidence
        }
      })
    )
  );
}

export async function upsertWorkflowMemory(input: {
  userId: string;
  type: Extract<MemoryItemType, "WEAKNESS" | "TRAINING_STATE">;
  sourceRef: string;
  value: MemoryValue;
  status: MemoryItemStatus;
  confidence?: number;
  expiresAt?: Date | null;
}) {
  assertMemoryValue(input.value);
  return prisma.$transaction(async (tx) => {
    const unique = {
      userId: input.userId,
      type: input.type,
      sourceRef: input.sourceRef
    };
    const existing = await tx.memoryItem.findUnique({
      where: { userId_type_sourceRef: unique }
    });
    if (existing?.status === "REJECTED" && existing.expiresAt && existing.expiresAt <= new Date()) {
      return existing;
    }
    return tx.memoryItem.upsert({
      where: { userId_type_sourceRef: unique },
      update: {
        value: input.value as any,
        status: input.status,
        confidence: input.confidence ?? 1,
        expiresAt: input.expiresAt,
        version: { increment: 1 }
      },
      create: {
        ...unique,
        value: input.value as any,
        status: input.status,
        confidence: input.confidence ?? 1,
        expiresAt: input.expiresAt
      }
    });
  });
}

function assertMemoryValue(value: MemoryValue) {
  const serialized = JSON.stringify(value);
  if (Object.keys(value).length === 0 || serialized.length > 4000) {
    throw new DomainError("Memory 内容必须在 1～4000 字符内。", "INVALID_MEMORY_VALUE", 400);
  }
}

function parseExpiry(value: string) {
  const expiresAt = new Date(value);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    throw new DomainError("Memory 过期时间无效。", "INVALID_MEMORY_EXPIRY", 400);
  }
  return expiresAt;
}

function mapMemoryItem(row: any): MemoryItem {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    value: row.value,
    sourceRef: row.sourceRef,
    confidence: row.confidence,
    expiresAt: row.expiresAt?.toISOString(),
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
