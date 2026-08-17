import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { questionBank } from "../src/lib/data/questions";
import { defaultRubricVersion } from "../src/lib/data/rubrics";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  await Promise.all(
    [
      { code: "FREE", name: "Free", monthlySessionLimit: 3 },
      { code: "PRO", name: "Pro", monthlySessionLimit: 50 },
      { code: "ADMIN", name: "Admin", monthlySessionLimit: null }
    ].map((plan) =>
      prisma.usagePlan.upsert({
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

  const rubric = await prisma.rubricVersion.upsert({
    where: { code: defaultRubricVersion.code },
    update: {
      version: defaultRubricVersion.version,
      title: defaultRubricVersion.title,
      dimensions: defaultRubricVersion.dimensions,
      isActive: true
    },
    create: {
      code: defaultRubricVersion.code,
      version: defaultRubricVersion.version,
      title: defaultRubricVersion.title,
      dimensions: defaultRubricVersion.dimensions,
      isActive: true
    }
  });

  for (const question of questionBank) {
    await prisma.questionBank.upsert({
      where: { externalId: question.id },
      update: {
        module: question.module,
        targetRole: question.targetRole,
        difficulty: question.difficulty,
        prompt: question.prompt,
        expectation: question.expectation,
        rubricVersionId: rubric.id
      },
      create: {
        externalId: question.id,
        module: question.module,
        targetRole: question.targetRole,
        difficulty: question.difficulty,
        prompt: question.prompt,
        expectation: question.expectation,
        rubricVersionId: rubric.id
      }
    });
  }

  const seenPatternHashes = new Set<string>();
  for (const question of questionBank) {
    const dedupeHash = createHash("sha256")
      .update(
        question.prompt
          .normalize("NFKC")
          .toLowerCase()
          .replace(/[\p{P}\p{S}\s]+/gu, "")
      )
      .digest("hex");
    if (seenPatternHashes.has(dedupeHash)) continue;
    seenPatternHashes.add(dedupeHash);
    const patternExternalId = `pattern-${question.id}`;
    const existingByHash = await prisma.interviewPattern.findUnique({
      where: { dedupeHash },
      select: { id: true, externalId: true }
    });
    if (existingByHash && existingByHash.externalId !== patternExternalId) {
      const duplicateAudit = await prisma.interviewPatternIngestion.findFirst({
        where: {
          patternId: existingByHash.id,
          externalId: patternExternalId,
          outcome: "DUPLICATE"
        },
        select: { id: true }
      });
      if (!duplicateAudit) {
        await prisma.interviewPatternIngestion.create({
          data: {
            patternId: existingByHash.id,
            externalId: patternExternalId,
            dedupeHash,
            outcome: "DUPLICATE",
            reasons: ["DUPLICATE_HASH"],
            sourceTitle: "AI Mock internal question bank",
            sourceUrl: "internal://question-bank",
            collectionMethod: "INTERNAL_CURATED",
            rightsStatus: "INTERNAL"
          }
        });
      }
      continue;
    }
    const seededPattern = await prisma.interviewPattern.upsert({
      where: { externalId: patternExternalId },
      update: {
        question: question.prompt,
        answerGuidance: question.expectation,
        module: question.module,
        difficulty: question.difficulty,
        roleTags: [question.targetRole],
        competencyTags: question.keywords?.length
          ? question.keywords
          : [question.module.toLowerCase()],
        sourceTitle: "AI Mock internal question bank",
        sourceUrl: "internal://question-bank",
        collectionMethod: "INTERNAL_CURATED",
        rightsStatus: "INTERNAL",
        dedupeHash,
        qualityStatus: "APPROVED",
        qualityScore: 0.9,
        qualityReasons: [],
        lastReviewedAt: new Date(),
        isPublished: true
      },
      create: {
        externalId: patternExternalId,
        question: question.prompt,
        answerGuidance: question.expectation,
        module: question.module,
        difficulty: question.difficulty,
        roleTags: [question.targetRole],
        competencyTags: question.keywords?.length
          ? question.keywords
          : [question.module.toLowerCase()],
        projectKeywords: [],
        companyTags: [],
        sourceTitle: "AI Mock internal question bank",
        sourceUrl: "internal://question-bank",
        collectionMethod: "INTERNAL_CURATED",
        rightsStatus: "INTERNAL",
        dedupeHash,
        qualityStatus: "APPROVED",
        qualityScore: 0.9,
        qualityReasons: [],
        lastReviewedAt: new Date(),
        isPublished: true
      }
    });
    const existingIngestion = await prisma.interviewPatternIngestion.findFirst({
      where: {
        patternId: seededPattern.id,
        externalId: seededPattern.externalId,
        outcome: "ACCEPTED"
      },
      select: { id: true }
    });
    if (!existingIngestion) {
      await prisma.interviewPatternIngestion.create({
        data: {
          patternId: seededPattern.id,
          externalId: seededPattern.externalId,
          dedupeHash,
          outcome: "ACCEPTED",
          reasons: [],
          sourceTitle: "AI Mock internal question bank",
          sourceUrl: "internal://question-bank",
          collectionMethod: "INTERNAL_CURATED",
          rightsStatus: "INTERNAL"
        }
      });
    }
  }

  const demoPasswordHash = await hashPassword("demo-password-change-me");

  await prisma.user.upsert({
    where: { email: "demo@ai-mock.local" },
    update: {
      name: "Demo User",
      targetRole: "Product Manager",
      planCode: "FREE",
      role: "USER",
      status: "ACTIVE"
    },
    create: {
      email: "demo@ai-mock.local",
      name: "Demo User",
      targetRole: "Product Manager",
      passwordHash: demoPasswordHash,
      planCode: "FREE",
      role: "USER",
      status: "ACTIVE"
    }
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const adminPasswordHash = await hashPassword(adminPassword);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: "Admin",
        role: "ADMIN",
        status: "ACTIVE",
        planCode: "ADMIN",
        passwordHash: adminPasswordHash
      },
      create: {
        email: adminEmail,
        name: "Admin",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        status: "ACTIVE",
        planCode: "ADMIN"
      }
    });
  }

  if ((await prisma.evalSample.count()) === 0) {
    const demoSamples = [
      {
        module: "BEHAVIORAL" as const,
        targetRole: "Product Manager",
        question: "Tell me about a conflict you resolved.",
        answer:
          "背景是工程和业务对上线范围有冲突。我的任务是保证核心价值按时交付。我先用用户影响和开发成本排优先级，组织双方确认最小范围，并把其余需求放入下一迭代。最终按期上线，核心流程转化率提升 12%。复盘后我建立了统一的优先级模板。",
        humanScore: 88,
        notes: "High-quality STAR answer",
        category: "BASIC"
      },
      {
        module: "BEHAVIORAL" as const,
        targetRole: "Product Manager",
        question: "Tell me about a conflict you resolved.",
        answer: "我们有一些分歧，我积极沟通，最后大家达成了一致，项目也顺利完成了。",
        humanScore: 42,
        notes: "Vague answer without evidence",
        category: "BASIC"
      },
      {
        module: "TECHNICAL" as const,
        targetRole: "Software Engineer",
        question: "How would you design an API rate limiter?",
        answer:
          "I would use a token bucket per tenant in Redis, with atomic Lua scripts for distributed consistency. Free and enterprise plans receive different refill rates. I would define fail-open or fail-closed behavior by endpoint risk, emit saturation metrics, and load test burst traffic before rollout.",
        humanScore: 90,
        notes: "Strong technical depth",
        category: "BASIC"
      },
      {
        module: "MARKET" as const,
        targetRole: "Investment Banking Analyst",
        question: "How can rates affect M&A?",
        answer:
          "利率下降可能降低融资成本并改善估值，但影响取决于信用利差、行业现金流和买卖双方估值预期。我会分别观察杠杆收购融资、战略买家资产负债表和监管环境。",
        humanScore: 82,
        notes: "Balanced market view",
        category: "BASIC"
      }
    ];
    const versionedDemoSamples = demoSamples.map((sample, index) => {
      const contentHash = createHash("sha256")
        .update(JSON.stringify({ ...sample, index }))
        .digest("hex");
      return {
        ...sample,
        sampleKey: `demo-${contentHash.slice(0, 24)}`,
        split: index < 2 ? "TRAIN" as const : index === 2 ? "VALIDATION" as const : "TEST" as const,
        sourceType: "LEGACY_CURATED_REFERENCE" as const,
        labelStatus: "REFERENCE_ONLY" as const,
        contentHash
      };
    });
    const datasetHash = createHash("sha256")
      .update(versionedDemoSamples.map((sample) => sample.contentHash).sort().join(""))
      .digest("hex");
    const datasetMetadata = {
      name: "ai-mock-demo-seed",
      version: "1.0.0",
      description: "Four curated reference samples for a fresh local database.",
      rubricCode: "v1_text_mock_rubric",
      rubricVersion: 2,
      status: "FROZEN" as const,
      sampleCount: versionedDemoSamples.length,
      contentHash: datasetHash,
      frozenAt: new Date()
    };
    const dataset = await prisma.evalDatasetVersion.upsert({
      where: {
        name_version: {
          name: datasetMetadata.name,
          version: datasetMetadata.version
        }
      },
      update: datasetMetadata,
      create: {
        ...datasetMetadata
      }
    });
    await prisma.evalSample.createMany({
      data: versionedDemoSamples.map((sample) => ({ ...sample, datasetVersionId: dataset.id }))
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
