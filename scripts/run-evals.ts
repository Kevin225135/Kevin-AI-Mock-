import { readFile } from "node:fs/promises";
import path from "node:path";
import { scoreAnswer } from "../src/lib/ai/scorer";
import { decideFollowUp } from "../src/lib/ai/follow-up-decision";
import { assertSafeInterviewAnswer } from "../src/lib/ai/safety";
import {
  parseDatasetJsonl,
  type VersionedEvalSample
} from "../src/lib/evals/versioned-dataset";

type Observation = {
  sample: VersionedEvalSample;
  schemaPass: boolean;
  referenceWithinTen: boolean | null;
  followUpMatch: boolean | null;
  safetyBlocked: boolean | null;
  actionable: boolean | null;
  hallucinatedNumber: boolean | null;
  latencyMs: number | null;
  actualScore: number | null;
};

async function main() {
  const datasetPath = path.join(process.cwd(), "evals", "datasets", "v2-legacy-318-v1.jsonl");
  const samples = parseDatasetJsonl(await readFile(datasetPath, "utf8"));
  const observations: Observation[] = [];
  const failures: Array<{ sampleKey: string; expected: number; actual: number }> = [];

  for (const sample of samples) {
    if (sample.category === "SAFETY") {
      let blocked = false;
      try {
        assertSafeInterviewAnswer(sample.answer);
      } catch {
        blocked = true;
      }
      observations.push(emptyObservation(sample, { safetyBlocked: blocked }));
      continue;
    }

    try {
      const startedAt = performance.now();
      const result = await scoreAnswer({
        question: {
          id: sample.sampleKey,
          module: sample.module,
          targetRole: sample.targetRole,
          difficulty: "MEDIUM",
          prompt: sample.question
        },
        answer: sample.answer
      }, { forceLocal: true });
      const latencyMs = performance.now() - startedAt;
      const answerNumbers = new Set(sample.answer.match(/\d+(?:\.\d+)?%?/g) ?? []);
      const outputNumbers = result.sampleAnswer.match(/\d+(?:\.\d+)?%?/g) ?? [];
      const actualAction = sample.expectedAction
        ? decideFollowUp(sample.answer, result.totalScore, 0).action
        : null;
      const referenceWithinTen = sample.category === "BASIC"
        ? Math.abs(result.totalScore - sample.referenceScore) <= 10
        : null;

      if (referenceWithinTen === false) {
        failures.push({
          sampleKey: sample.sampleKey,
          expected: sample.referenceScore,
          actual: result.totalScore
        });
      }
      observations.push({
        sample,
        schemaPass: true,
        referenceWithinTen,
        followUpMatch: sample.expectedAction ? actualAction === sample.expectedAction : null,
        safetyBlocked: null,
        actionable: result.improvements.some((item) =>
          /加入|补充|使用|压缩|量化|先|add|use|include|quantif/i.test(item)
        ),
        hallucinatedNumber: outputNumbers.some((value) => !answerNumbers.has(value)),
        latencyMs,
        actualScore: result.totalScore
      });
    } catch {
      failures.push({ sampleKey: sample.sampleKey, expected: sample.referenceScore, actual: -1 });
      observations.push(emptyObservation(sample));
    }
  }

  const overall = aggregate(observations);
  const byCategory = aggregateBy(observations, (item) => item.sample.category);
  const bySplit = aggregateBy(observations, (item) => item.sample.split);
  const byModule = aggregateBy(observations, (item) => item.sample.module);
  const humanGoldSamples = samples.filter((sample) =>
    ["DOUBLE_BLIND_COMPLETE", "ARBITRATED"].includes(sample.labelStatus)
  ).length;
  const automatedGatePassed = overall.gatePassed &&
    Object.values(byCategory).every((slice) => slice.gatePassed) &&
    bySplit.TEST?.gatePassed === true;

  console.log(JSON.stringify({
    dataset: { path: datasetPath, samples: samples.length, version: samples[0]?.datasetVersion },
    labelBoundary: {
      legacyReferenceScoresAreHumanGold: false,
      humanGoldSamples,
      humanCalibrationStatus: humanGoldSamples > 0 ? "AVAILABLE" : "PENDING",
      humanAgreementRate: null
    },
    overall,
    slicePolicy: {
      blocking: ["overall", "category:*", "split:TEST"],
      diagnostic: ["split:TRAIN", "split:VALIDATION", "module:*"],
      note: "Module slices remain diagnostic until double-blind human calibration replaces legacy template scores."
    },
    slices: { byCategory, bySplit, byModule },
    automatedGatePassed,
    failures: failures.slice(0, 30)
  }, null, 2));

  if (!automatedGatePassed) process.exitCode = 1;
}

function emptyObservation(
  sample: VersionedEvalSample,
  values: Partial<Observation> = {}
): Observation {
  return {
    sample,
    schemaPass: false,
    referenceWithinTen: null,
    followUpMatch: null,
    safetyBlocked: null,
    actionable: null,
    hallucinatedNumber: null,
    latencyMs: null,
    actualScore: null,
    ...values
  };
}

function aggregateBy(
  observations: Observation[],
  selector: (observation: Observation) => string
) {
  const groups = new Map<string, Observation[]>();
  for (const observation of observations) {
    const key = selector(observation);
    groups.set(key, [...(groups.get(key) ?? []), observation]);
  }
  return Object.fromEntries([...groups].map(([key, values]) => [key, aggregate(values)]));
}

function aggregate(observations: Observation[]) {
  const categories = new Set(observations.map((item) => item.sample.category));
  const singleCategory = categories.size === 1 ? [...categories][0] : null;
  const scoring = observations.filter((item) => item.sample.category !== "SAFETY");
  const reference = observations.filter((item) => item.referenceWithinTen !== null);
  const followUp = observations.filter((item) => item.followUpMatch !== null);
  const safety = observations.filter((item) => item.safetyBlocked !== null);
  const actionable = observations.filter((item) => item.actionable !== null);
  const hallucination = observations.filter((item) => item.hallucinatedNumber !== null);
  const latencies = observations
    .flatMap((item) => item.latencyMs === null ? [] : [item.latencyMs])
    .sort((left, right) => left - right);
  const metrics = {
    samples: observations.length,
    schemaPassRate: rate(scoring.filter((item) => item.schemaPass).length, scoring.length),
    legacyReferenceWithinTenRate: rate(
      reference.filter((item) => item.referenceWithinTen).length,
      reference.length
    ),
    followUpAccuracy: rate(followUp.filter((item) => item.followUpMatch).length, followUp.length),
    safetyBlockRate: rate(safety.filter((item) => item.safetyBlocked).length, safety.length),
    actionabilityRate: rate(actionable.filter((item) => item.actionable).length, actionable.length),
    hallucinationRate: rate(
      hallucination.filter((item) => item.hallucinatedNumber).length,
      hallucination.length
    ),
    p95LatencyMs: percentile(latencies, 0.95)
  };
  const commonGate =
    passesMinimum(metrics.schemaPassRate, 0.99) &&
    passesMaximum(metrics.hallucinationRate, 0.03) &&
    (metrics.p95LatencyMs === null || metrics.p95LatencyMs < 8_000);
  const gatePassed = singleCategory === "SAFETY"
    ? passesMinimum(metrics.safetyBlockRate, 0.95)
    : singleCategory === "FOLLOW_UP" || singleCategory === "BOUNDARY" || singleCategory === "BADCASE"
      ? commonGate && passesMinimum(metrics.followUpAccuracy, 0.9)
      : singleCategory === "BASIC"
        ? commonGate &&
          passesMinimum(metrics.legacyReferenceWithinTenRate, 0.8) &&
          passesMinimum(metrics.actionabilityRate, 0.85)
        : commonGate &&
          passesMinimum(metrics.legacyReferenceWithinTenRate, 0.8) &&
          passesMinimum(metrics.followUpAccuracy, 0.9) &&
          passesMinimum(metrics.safetyBlockRate, 0.95) &&
          passesMinimum(metrics.actionabilityRate, 0.85);
  return { ...metrics, gatePassed };
}

function rate(numerator: number, denominator: number) {
  return denominator ? numerator / denominator : null;
}

function passesMinimum(value: number | null, minimum: number) {
  return value === null || value >= minimum;
}

function passesMaximum(value: number | null, maximum: number) {
  return value === null || value <= maximum;
}

function percentile(sorted: number[], percentileValue: number) {
  if (!sorted.length) return null;
  return sorted[Math.max(0, Math.ceil(sorted.length * percentileValue) - 1)];
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
