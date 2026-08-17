import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { buildReport } from "./report";
import type { CurrentUser } from "./types";

test(
  "persists a confirmed weakness and completes it through an equivalent cross-session retest",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async () => {
    const [{ prisma }, { prismaDataStore }, training, mockService] = await Promise.all([
      import("@/lib/repositories/prisma-client"),
      import("@/lib/repositories/prisma-store"),
      import("./training-service"),
      import("./mock-service")
    ]);
    const suffix = randomUUID();
    const plan = await prisma.usagePlan.findFirst({ where: { isActive: true } });
    const rubric = await prisma.rubricVersion.findFirst({ where: { isActive: true } });
    assert.ok(plan);
    assert.ok(rubric);

    const user = await prisma.user.create({
      data: {
        email: `v2-training-${suffix}@example.test`,
        name: "V2 training test",
        passwordHash: "not-used-in-domain-test",
        planCode: plan.code,
        privacyAcceptedAt: new Date()
      }
    });
    const question = await prisma.questionBank.create({
      data: {
        externalId: `v2-training-source-${suffix}`,
        module: "BEHAVIORAL",
        targetRole: "Product Manager",
        difficulty: "MEDIUM",
        prompt: "请介绍一次你在关键约束下推动产品决策的经历。",
        rubricVersionId: rubric.id
      }
    });
    const sourceSession = await prisma.mockSession.create({
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
    const sourceAnswer = await prisma.answer.create({
      data: {
        sessionId: sourceSession.id,
        questionId: question.id,
        content: "我参与了一次产品决策，但回答没有明确说明个人行动、量化结果和关键取舍。"
      }
    });
    await prisma.aiScore.create({
      data: {
        sessionId: sourceSession.id,
        answerId: sourceAnswer.id,
        rubricVersionId: rubric.id,
        starCompleteness: 2,
        logicStructure: 3,
        contentDepth: 1,
        communication: 3,
        totalScore: 45,
        deductions: ["缺少量化结果和关键取舍。"],
        improvements: ["补充指标、取舍和验证方法。"],
        sampleAnswer: "先说明结论，再完整说明行动、指标、取舍和最终结果。",
        reasoning: "回答缺少可验证的深度证据。",
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

    try {
      const snapshot = await prismaDataStore.getSession(sourceSession.id);
      assert.ok(snapshot);
      const report = await prismaDataStore.saveReport(buildReport(snapshot));
      await training.syncSessionWeaknesses(snapshot, report);

      const proposed = await training.listSessionWeaknesses(sourceSession.id, actor);
      assert.ok(proposed);
      assert.equal(proposed.length, 3);
      assert.equal(proposed[0].status, "PROPOSED");
      assert.equal(
        await training.listSessionWeaknesses(sourceSession.id, {
          ...actor,
          id: "different-user",
          email: "different@example.test"
        }),
        null
      );

      const selected = proposed.find(
        (weakness) => weakness.dimension === "CONTENT_DEPTH"
      );
      assert.ok(selected);
      await assert.rejects(
        () =>
          training.updateWeakness(
            selected.id,
            { action: "IGNORE" },
            { ...actor, id: "different-user", email: "different@example.test" }
          ),
        /Weakness not found/
      );

      const confirmed = await training.updateWeakness(
        selected.id,
        {
          action: "CONFIRM",
          dueAt: new Date(Date.now() + 60_000).toISOString()
        },
        actor
      );
      assert.equal(confirmed.status, "CONFIRMED");
      assert.ok(confirmed.latestTrainingTask);
      assert.notEqual(
        confirmed.latestTrainingTask.equivalentQuestion.prompt,
        question.prompt
      );

      await prisma.trainingTask.update({
        where: { id: confirmed.latestTrainingTask.id },
        data: { dueAt: new Date(Date.now() - 1_000) }
      });
      const due = await training.findDueRetest({
        userId: user.id,
        module: "BEHAVIORAL",
        targetRole: "Product Manager",
        difficulty: "MEDIUM"
      });
      assert.ok(due);

      const createdRetest = await mockService.createMockSession(
        {
          module: "BEHAVIORAL",
          targetRole: "Product Manager",
          difficulty: "MEDIUM",
          questionCount: 1
        },
        actor
      );
      const retestSession = createdRetest.session;
      assert.equal(createdRetest.currentQuestion?.id, due.question.id);
      const answered = await prismaDataStore.saveAnswer(retestSession.id, {
        questionId: due.question.id,
        content: "我的结论是该方案提升转化率 12%。我说明了实验设计、资源取舍和两周后的验证结果。"
      });
      const retestAnswer = answered.answers[0];
      assert.equal(retestAnswer.attemptKind, "RETEST");
      const score = await prismaDataStore.saveScore(
        retestSession.id,
        retestAnswer.id,
        {
          dimensions: {
            starCompleteness: 3,
            logicStructure: 4,
            contentDepth: 3,
            communication: 4
          },
          totalScore: 72,
          deductions: ["验证周期仍可说明得更清楚。"],
          improvements: ["补充长期指标。"],
          sampleAnswer: "先说明量化结果，再说明实验、取舍、短期和长期验证过程。",
          reasoning: "已经补充关键深度证据，但尚未稳定达到通过阈值。"
        },
        rubric.id
      );
      await training.completeRetestTrainingTask({
        sessionId: retestSession.id,
        questionId: due.question.id,
        answerId: retestAnswer.id,
        dimensions: score.dimensions
      });

      const completed = await prisma.weakness.findUniqueOrThrow({
        where: { id: selected.id },
        include: { trainingTasks: true }
      });
      assert.equal(completed.status, "IMPROVING");
      assert.equal(completed.latestScore, 3);
      assert.equal(completed.trainingTasks[0].status, "COMPLETED");
      assert.equal(completed.trainingTasks[0].retestAnswerId, retestAnswer.id);
    } finally {
      const equivalentIds = (
        await prisma.trainingTask.findMany({
          where: { userId: user.id },
          select: { equivalentQuestionId: true }
        })
      ).map((task) => task.equivalentQuestionId);
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.questionBank.deleteMany({
        where: { id: { in: [question.id, ...equivalentIds] } }
      });
      await prisma.$disconnect();
    }
  }
);
