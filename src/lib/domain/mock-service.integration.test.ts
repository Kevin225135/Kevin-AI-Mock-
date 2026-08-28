import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { CurrentUser } from "./types";

test(
  "runs the scored retry and report comparison vertical slice",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async () => {
    const [{ prisma }, { retryAnswerAttempt }, { getTraceReplay }] = await Promise.all([
      import("@/lib/repositories/prisma-client"),
      import("./mock-service"),
      import("@/lib/observability/trace-store")
    ]);
    const suffix = randomUUID();
    const plan = await prisma.usagePlan.findFirst({
      where: { isActive: true }
    });
    const rubric = await prisma.rubricVersion.findFirst({
      where: { isActive: true }
    });
    assert.ok(plan, "Database fixture needs an active usage plan.");
    assert.ok(rubric, "Database fixture needs an active rubric.");

    const user = await prisma.user.create({
      data: {
        email: `v2-retry-${suffix}@example.test`,
        name: "V2 retry test",
        passwordHash: "not-used-in-domain-test",
        planCode: plan.code,
        privacyAcceptedAt: new Date()
      }
    });
    const question = await prisma.questionBank.create({
      data: {
        externalId: `v2-retry-${suffix}`,
        module: "BEHAVIORAL",
        targetRole: "Product Manager",
        difficulty: "MEDIUM",
        prompt: "请介绍一次你推动产品指标改善的经历。",
        rubricVersionId: rubric.id
      }
    });
    const session = await prisma.mockSession.create({
      data: {
        userId: user.id,
        module: "BEHAVIORAL",
        targetRole: "Product Manager",
        difficulty: "MEDIUM",
        status: "COMPLETED",
        questionCount: 1,
        currentQuestionIndex: 0,
        selectedQuestionIds: [question.id]
      }
    });
    const initial = await prisma.answer.create({
      data: {
        sessionId: session.id,
        questionId: question.id,
        content: "我参与了产品改版，也做了一些分析，但当时没有整理完整的结果数据。"
      }
    });
    await prisma.aiScore.create({
      data: {
        sessionId: session.id,
        answerId: initial.id,
        rubricVersionId: rubric.id,
        starCompleteness: 2,
        logicStructure: 2,
        contentDepth: 2,
        communication: 3,
        totalScore: 45,
        deductions: ["结果证据不足"],
        improvements: ["补充量化结果", "先说结论并明确逻辑结构"],
        sampleAnswer: "先给结论，再说明个人行动和结果。",
        reasoning: "缺少量化证据。",
        rawJson: {}
      }
    });
    const actor: CurrentUser = {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      role: "USER",
      status: "ACTIVE",
      planCode: plan.code
    };
    const idempotencyKey = `test:${randomUUID()}`;

    try {
      await assert.rejects(
        () =>
          retryAnswerAttempt(
            initial.id,
            {
              content: "这个越权用户不应能够为其他人的回答创建重答记录。",
              idempotencyKey: `test:${randomUUID()}`
            },
            { ...actor, id: "another-user-id", email: "other@example.test" }
          ),
        (error: unknown) => error instanceof Error && error.message === "Answer attempt not found."
      );
      assert.equal(await prisma.answer.count({ where: { sessionId: session.id } }), 1);

      const result = await retryAnswerAttempt(
        initial.id,
        {
          content:
            "我的结论是改版后注册转化率提升了 18%。我主导漏斗分析、实验设计和上线复盘，并说明了速度与样本量的取舍。",
          idempotencyKey
        },
        actor
      );

      assert.equal(result.attempt.attemptNo, 2);
      assert.equal(result.attempt.parentAnswerId, initial.id);
      assert.equal(result.comparison.rubricVersionId, rubric.id);
      assert.equal(result.report.questionFeedback[0].latestAttemptId, result.attempt.id);
      const trace = await getTraceReplay(result.runId, actor);
      assert.ok(trace);
      assert.equal(trace.status, "COMPLETED");
      assert.deepEqual(
        trace.steps.map((step) => step.kind),
        ["MODEL", "SCORE"]
      );
      assert.ok(trace.usage.inputTokens > 0);
      const eventCounts = await prisma.event.groupBy({
        by: ["name"],
        where: {
          userId: user.id,
          name: {
            in: ["retry_started", "retry_completed", "feedback_adopted"]
          }
        },
        _count: true
      });
      assert.equal(eventCounts.find((event) => event.name === "retry_started")?._count, 1);
      assert.equal(eventCounts.find((event) => event.name === "retry_completed")?._count, 1);
      assert.equal(eventCounts.find((event) => event.name === "feedback_adopted")?._count, 1);

      const repeated = await retryAnswerAttempt(
        initial.id,
        {
          content: "该内容不会覆盖已完成的幂等请求，因为服务应返回第一次创建的 Attempt。",
          idempotencyKey
        },
        actor
      );
      assert.equal(repeated.attempt.id, result.attempt.id);
      assert.equal(await prisma.answer.count({ where: { sessionId: session.id } }), 2);
      const unchanged = await prisma.answer.findUniqueOrThrow({
        where: { id: initial.id }
      });
      assert.equal(
        unchanged.content,
        "我参与了产品改版，也做了一些分析，但当时没有整理完整的结果数据。"
      );
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.questionBank.delete({ where: { id: question.id } });
      await prisma.$disconnect();
    }
  }
);
