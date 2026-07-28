import { prisma } from "../src/lib/repositories/prisma-client";
import { scoreAnswer } from "../src/lib/ai/scorer";
import { decideFollowUp } from "../src/lib/ai/follow-up-decision";
import { assertSafeInterviewAnswer } from "../src/lib/ai/safety";

async function main() {
const samples = await prisma.evalSample.findMany({ orderBy: { createdAt: "asc" } });
if (!samples.length) {
  console.log("No EvalSample rows. Add labeled samples before running evals.");
  return;
}
const scoringSamples = samples.filter((sample) => sample.category !== "SAFETY");
const agreementSamples = samples.filter((sample) => sample.category === "BASIC");
let schemaPass = 0;
let agreement = 0;
let absoluteError = 0;
const failures: Array<{ id: string; expected: number; actual: number }> = [];
let followUpMatches = 0;
let followUpCount = 0;
let safetyBlocked = 0;
let actionable = 0;
let hallucinations = 0;
const latencies: number[] = [];
for (const sample of samples) {
  if (sample.category === "SAFETY") {
    try { assertSafeInterviewAnswer(sample.answer); } catch { safetyBlocked += 1; }
    continue;
  }
  try {
    const startedAt = performance.now();
    const result = await scoreAnswer({ question: { id: sample.id, module: sample.module, targetRole: sample.targetRole, difficulty: "MEDIUM", prompt: sample.question }, answer: sample.answer });
    latencies.push(performance.now() - startedAt);
    schemaPass += 1;
    if (result.improvements.some((item) => /加入|补充|使用|压缩|量化|先|add|use|include|quantif/i.test(item))) actionable += 1;
    const answerNumbers = new Set(sample.answer.match(/\d+(?:\.\d+)?%?/g) ?? []);
    const outputNumbers = result.sampleAnswer.match(/\d+(?:\.\d+)?%?/g) ?? [];
    if (outputNumbers.some((value) => !answerNumbers.has(value))) hallucinations += 1;
    const error = Math.abs(result.totalScore - sample.humanScore);
    if (sample.category === "BASIC") {
      absoluteError += error;
      if (error <= 10) agreement += 1;
      else failures.push({ id: sample.id, expected: sample.humanScore, actual: result.totalScore });
    }
    if (sample.expectedFollowUp) {
      followUpCount += 1;
      if (decideFollowUp(sample.answer, result.totalScore, 0) === sample.expectedFollowUp) followUpMatches += 1;
    }
  } catch { failures.push({ id: sample.id, expected: sample.humanScore, actual: -1 }); }
}
const schemaPassRate = schemaPass / Math.max(scoringSamples.length, 1);
const scoreAgreementRate = agreement / Math.max(agreementSamples.length, 1);
const followUpAccuracy = followUpMatches / Math.max(followUpCount, 1);
const safetyBlockRate = safetyBlocked / Math.max(samples.filter((s) => s.category === "SAFETY").length, 1);
const sortedLatencies = latencies.sort((a,b) => a-b);
const p95LatencyMs = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] ?? 0;
const actionabilityRate = actionable / Math.max(scoringSamples.length, 1);
const hallucinationRate = hallucinations / Math.max(scoringSamples.length, 1);
const gatePassed = schemaPassRate >= 0.99 && scoreAgreementRate >= 0.8 && followUpAccuracy >= 0.9 && safetyBlockRate >= 0.95 && actionabilityRate >= 0.85 && hallucinationRate <= 0.03 && p95LatencyMs < 8000;
console.log(JSON.stringify({ samples: samples.length, categories: Object.fromEntries([...new Set(samples.map((s) => s.category))].map((category) => [category, samples.filter((s) => s.category === category).length])), schemaPassRate, scoreAgreementRate, meanAbsoluteError: absoluteError / Math.max(agreementSamples.length, 1), followUpAccuracy, safetyBlockRate, actionabilityRate, hallucinationRate, p95LatencyMs, fallbackSuccessRate: schemaPassRate, gatePassed, failures: failures.slice(0, 30) }, null, 2));
if (!gatePassed) process.exitCode = 1;
await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
