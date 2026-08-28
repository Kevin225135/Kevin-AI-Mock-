import { prisma } from "../src/lib/repositories/prisma-client";
import { embedDocuments } from "../src/lib/knowledge/embedding-provider";
import { buildEmbeddingText } from "../src/lib/knowledge/knowledge-service";
import { inferSourceAuthority } from "../src/lib/knowledge/source-quality";
import { knowledgeSeeds } from "../src/lib/knowledge/seed-data";
import { investmentBanking400, roundTwoKnowledge } from "../src/lib/knowledge/round-two-data";
import { summerRecruitKnowledge } from "../src/lib/knowledge/summer-recruit-data";

async function main() {
  const allEntries = [
    ...knowledgeSeeds,
    ...investmentBanking400,
    ...roundTwoKnowledge,
    ...summerRecruitKnowledge
  ];
  const embeddingResult = await embedDocuments(allEntries.map(buildEmbeddingText));
  const verifiedAt = new Date();
  for (const [index, item] of allEntries.entries()) {
    const data = {
      ...item,
      embedding: embeddingResult.vectors[index],
      embeddingModel: embeddingResult.model,
      sourceAuthority: inferSourceAuthority(item.sourceUrl),
      lastVerifiedAt: verifiedAt
    };
    await prisma.knowledgeEntry.upsert({
      where: { slug: item.slug },
      create: data,
      update: data
    });
  }
  console.log(
    `Seeded ${allEntries.length} bilingual knowledge entries with ${embeddingResult.model}` +
    ` (${embeddingResult.degraded ? "local fallback" : "semantic embeddings"}; ` +
    `${investmentBanking400.length} original investment-banking questions; ` +
    `${summerRecruitKnowledge.length} privacy-screened local entries).`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
