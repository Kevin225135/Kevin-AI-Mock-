import { PrismaClient } from "@prisma/client";
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
