import { prisma } from "../src/lib/repositories/prisma-client";
async function main() {
const [sampleId, annotator, scoreText, followUp, ...notes] = process.argv.slice(2);
const totalScore = Number(scoreText);
if (!sampleId || !annotator || !Number.isInteger(totalScore) || totalScore < 0 || totalScore > 100) {
  console.error("Usage: npm run eval:annotate -- <sampleId> <annotator> <0-100> [DEEPEN|CLARIFY|CLOSE] [notes]");
  process.exit(1);
}
await prisma.evalAnnotation.upsert({
  where: { sampleId_annotator: { sampleId, annotator } },
  update: { totalScore, shouldFollowUp: followUp || null, notes: notes.join(" ") || null },
  create: { sampleId, annotator, totalScore, shouldFollowUp: followUp || null, notes: notes.join(" ") || null }
});
const annotations = await prisma.evalAnnotation.findMany({ where: { sampleId } });
const spread = Math.max(...annotations.map((a) => a.totalScore)) - Math.min(...annotations.map((a) => a.totalScore));
console.log({ annotations: annotations.length, spread, arbitrationRequired: annotations.length >= 2 && spread > 20 });
await prisma.$disconnect();
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
