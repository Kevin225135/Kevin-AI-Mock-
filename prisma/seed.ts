import { PrismaClient } from "@prisma/client";
import { questionBank } from "../src/lib/data/questions";
import { defaultRubricVersion } from "../src/lib/data/rubrics";

const prisma = new PrismaClient();

async function main() {
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

  await prisma.user.upsert({
    where: { email: "demo@ai-mock.local" },
    update: { name: "Demo User", targetRole: "Product Manager" },
    create: {
      email: "demo@ai-mock.local",
      name: "Demo User",
      targetRole: "Product Manager"
    }
  });
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
