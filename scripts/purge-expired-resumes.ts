import { prisma } from "../src/lib/repositories/prisma-client";
import { purgeExpiredResumes } from "../src/lib/resume/resume-service";

async function main() {
  const deleted = await purgeExpiredResumes();
  console.log(`Purged ${deleted} expired resume records and their linked training data.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
