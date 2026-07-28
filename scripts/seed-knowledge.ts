import { prisma } from "../src/lib/repositories/prisma-client";
import { EMBEDDING_MODEL, embedText } from "../src/lib/knowledge/embedding";
import { knowledgeSeeds } from "../src/lib/knowledge/seed-data";
import { investmentBanking400, roundTwoKnowledge } from "../src/lib/knowledge/round-two-data";

async function main() {
  const allEntries = [...knowledgeSeeds, ...investmentBanking400, ...roundTwoKnowledge];
  for (const item of allEntries) {
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
  console.log(`Seeded ${allEntries.length} bilingual knowledge entries (${investmentBanking400.length} original investment-banking questions).`);
}

main().finally(() => prisma.$disconnect());
