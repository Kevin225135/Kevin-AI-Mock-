import { prisma } from "../src/lib/repositories/prisma-client";
import { EMBEDDING_MODEL, embedText } from "../src/lib/knowledge/embedding";
import { knowledgeSeeds } from "../src/lib/knowledge/seed-data";

async function main() {
  for (const item of knowledgeSeeds) {
    const embedding = embedText([
      item.titleZh, item.titleEn, item.summaryZh, item.summaryEn,
      item.contentZh, item.contentEn, ...item.keywords
    ].join(" "));
    const data = { ...item, embedding, embeddingModel: EMBEDDING_MODEL };
    await prisma.knowledgeEntry.upsert({
      where: { slug: item.slug },
      create: data,
      update: data
    });
  }
  console.log(`Seeded ${knowledgeSeeds.length} bilingual knowledge entries.`);
}

main().finally(() => prisma.$disconnect());
