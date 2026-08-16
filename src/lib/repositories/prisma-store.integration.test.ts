import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test(
  "persists idempotent concurrent retries without overwriting the source",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async () => {
    const [{ prisma }, { prismaDataStore }] = await Promise.all([
      import("./prisma-client"),
      import("./prisma-store")
    ]);
    const source = await prisma.answer.findFirst({
      where: { score: { isNot: null } },
      orderBy: { submittedAt: "asc" }
    });
    assert.ok(source, "Database fixture needs at least one scored answer.");

    const createdIds: string[] = [];
    const firstKey = `test:${randomUUID()}`;
    const content = "我的结论是该项目提升了转化率，我负责实验设计并验证了核心指标。";

    try {
      const first = await prismaDataStore.createRetryAttempt(source.id, {
        content,
        idempotencyKey: firstKey
      });
      createdIds.push(first.id);
      const duplicate = await prismaDataStore.createRetryAttempt(source.id, {
        content,
        idempotencyKey: firstKey
      });
      assert.equal(duplicate.id, first.id);

      const concurrent = await Promise.all([
        prismaDataStore.createRetryAttempt(source.id, {
          content: `${content} 并发请求 A。`,
          idempotencyKey: `test:${randomUUID()}`
        }),
        prismaDataStore.createRetryAttempt(source.id, {
          content: `${content} 并发请求 B。`,
          idempotencyKey: `test:${randomUUID()}`
        })
      ]);
      createdIds.push(...concurrent.map((attempt) => attempt.id));

      assert.equal(new Set(concurrent.map((attempt) => attempt.attemptNo)).size, 2);
      const unchanged = await prisma.answer.findUniqueOrThrow({
        where: { id: source.id }
      });
      assert.equal(unchanged.content, source.content);
      assert.equal(unchanged.attemptNo, 1);
      assert.equal(unchanged.attemptKind, "INITIAL");
    } finally {
      if (createdIds.length > 0) {
        await prisma.answer.deleteMany({ where: { id: { in: createdIds } } });
      }
      await prisma.$disconnect();
    }
  }
);
