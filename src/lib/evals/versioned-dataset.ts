import { createHash } from "node:crypto";
import { z } from "zod";

export const DATASET_NAME = "ai-mock-v2-legacy";
export const DATASET_VERSION = "1.0.0";
export const DATASET_SCHEMA_VERSION = 1 as const;
export const EXPECTED_LEGACY_SAMPLE_COUNT = 318;

export const evalSplitSchema = z.enum(["TRAIN", "VALIDATION", "TEST"]);
export const evalSourceTypeSchema = z.enum([
  "LEGACY_SYNTHETIC",
  "LEGACY_CURATED_REFERENCE",
  "HUMAN_GOLD",
  "PRODUCTION_BAD_CASE"
]);
export const evalLabelStatusSchema = z.enum([
  "REFERENCE_ONLY",
  "DOUBLE_BLIND_PENDING",
  "DOUBLE_BLIND_COMPLETE",
  "ARBITRATED"
]);
export const evalActionSchema = z.enum(["DEEPEN", "CHALLENGE", "NEXT", "STOP"]);

export const versionedEvalSampleSchema = z.object({
  schemaVersion: z.literal(DATASET_SCHEMA_VERSION),
  datasetName: z.literal(DATASET_NAME),
  datasetVersion: z.literal(DATASET_VERSION),
  sampleKey: z.string().min(8),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  split: evalSplitSchema,
  sourceType: evalSourceTypeSchema,
  labelStatus: evalLabelStatusSchema,
  module: z.enum(["BEHAVIORAL", "CV_RELATED", "TECHNICAL", "MARKET"]),
  targetRole: z.string().min(1),
  category: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  referenceScore: z.number().int().min(0).max(100),
  expectedAction: evalActionSchema.nullable(),
  notes: z.string().nullable()
});

export type VersionedEvalSample = z.infer<typeof versionedEvalSampleSchema>;

export type DatasetManifest = {
  schemaVersion: typeof DATASET_SCHEMA_VERSION;
  name: typeof DATASET_NAME;
  version: typeof DATASET_VERSION;
  status: "FROZEN";
  frozenAt: string;
  rubric: { code: string; version: number };
  sampleCount: number;
  contentHash: string;
  labelPolicy: string;
  quality: {
    duplicateContentRows: number;
    crossSplitDuplicateGroups: number;
    humanGoldRows: number;
  };
  counts: {
    bySplit: Record<string, number>;
    byCategory: Record<string, number>;
    byModule: Record<string, number>;
    bySourceType: Record<string, number>;
    byLabelStatus: Record<string, number>;
    bySplitCategory: Record<string, number>;
  };
};

type DatabaseEvalSample = {
  sampleKey: string;
  split: string;
  sourceType: string;
  labelStatus: string;
  module: string;
  targetRole: string;
  category: string;
  question: string;
  answer: string;
  humanScore: number;
  expectedFollowUp: string | null;
  notes: string | null;
};

export function toVersionedEvalSample(row: DatabaseEvalSample): VersionedEvalSample {
  const body: Omit<VersionedEvalSample, "contentHash"> = {
    schemaVersion: DATASET_SCHEMA_VERSION,
    datasetName: DATASET_NAME,
    datasetVersion: DATASET_VERSION,
    sampleKey: row.sampleKey,
    split: evalSplitSchema.parse(row.split),
    sourceType: evalSourceTypeSchema.parse(row.sourceType),
    labelStatus: evalLabelStatusSchema.parse(row.labelStatus),
    module: versionedEvalSampleSchema.shape.module.parse(row.module),
    targetRole: row.targetRole,
    category: row.category,
    question: row.question,
    answer: row.answer,
    referenceScore: row.humanScore,
    expectedAction: normalizeExpectedAction(row.expectedFollowUp),
    notes: row.notes
  };

  return versionedEvalSampleSchema.parse({
    ...body,
    contentHash: hashSampleContent(body)
  });
}

export function buildDatasetManifest(
  samples: VersionedEvalSample[],
  frozenAt: string
): DatasetManifest {
  const sorted = [...samples].sort((left, right) => left.sampleKey.localeCompare(right.sampleKey));
  return {
    schemaVersion: DATASET_SCHEMA_VERSION,
    name: DATASET_NAME,
    version: DATASET_VERSION,
    status: "FROZEN",
    frozenAt,
    rubric: { code: "v1_text_mock_rubric", version: 2 },
    sampleCount: sorted.length,
    contentHash: hashCanonical(sorted),
    labelPolicy:
      "referenceScore is a legacy regression target; only DOUBLE_BLIND_COMPLETE or ARBITRATED annotations are human Gold",
    quality: {
      duplicateContentRows: sorted.length - new Set(sorted.map((sample) => sample.contentHash)).size,
      crossSplitDuplicateGroups: countCrossSplitDuplicateGroups(sorted),
      humanGoldRows: sorted.filter((sample) => sample.sourceType === "HUMAN_GOLD").length
    },
    counts: {
      bySplit: countBy(sorted, (sample) => sample.split),
      byCategory: countBy(sorted, (sample) => sample.category),
      byModule: countBy(sorted, (sample) => sample.module),
      bySourceType: countBy(sorted, (sample) => sample.sourceType),
      byLabelStatus: countBy(sorted, (sample) => sample.labelStatus),
      bySplitCategory: countBy(sorted, (sample) => `${sample.split}:${sample.category}`)
    }
  };
}

export function verifyFrozenDataset(
  samples: VersionedEvalSample[],
  manifest: DatasetManifest,
  expectedCount = EXPECTED_LEGACY_SAMPLE_COUNT
) {
  const errors: string[] = [];
  const keys = new Set<string>();

  for (const candidate of samples) {
    const sample = versionedEvalSampleSchema.parse(candidate);
    const { contentHash, ...body } = sample;
    if (hashSampleContent(body) !== contentHash) errors.push(`CONTENT_HASH_MISMATCH:${sample.sampleKey}`);
    if (keys.has(sample.sampleKey)) errors.push(`DUPLICATE_SAMPLE_KEY:${sample.sampleKey}`);
    keys.add(sample.sampleKey);
  }

  const rebuilt = buildDatasetManifest(samples, manifest.frozenAt);
  if (samples.length !== expectedCount) errors.push(`EXPECTED_${expectedCount}_SAMPLES_GOT_${samples.length}`);
  if (manifest.sampleCount !== samples.length) errors.push("MANIFEST_SAMPLE_COUNT_MISMATCH");
  if (manifest.contentHash !== rebuilt.contentHash) errors.push("MANIFEST_CONTENT_HASH_MISMATCH");
  if (rebuilt.quality.crossSplitDuplicateGroups > 0) {
    errors.push(`CROSS_SPLIT_DUPLICATE_GROUPS:${rebuilt.quality.crossSplitDuplicateGroups}`);
  }
  for (const split of evalSplitSchema.options) {
    if (!samples.some((sample) => sample.split === split)) errors.push(`EMPTY_SPLIT:${split}`);
  }
  for (const category of ["BASIC", "BOUNDARY", "FOLLOW_UP", "BADCASE", "SAFETY"]) {
    if (!samples.some((sample) => sample.category === category)) errors.push(`EMPTY_CATEGORY:${category}`);
    for (const split of evalSplitSchema.options) {
      if (!samples.some((sample) => sample.category === category && sample.split === split)) {
        errors.push(`EMPTY_SPLIT_CATEGORY:${split}:${category}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, manifest: rebuilt };
}

export function parseDatasetJsonl(value: string) {
  return value
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return versionedEvalSampleSchema.parse(JSON.parse(line));
      } catch (error) {
        throw new Error(`Invalid dataset row ${index + 1}: ${String(error)}`);
      }
    });
}

export function hashCanonical(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function hashSampleContent(value: Omit<VersionedEvalSample, "contentHash">) {
  return hashCanonical({
    module: value.module,
    targetRole: value.targetRole,
    category: value.category,
    question: value.question,
    answer: value.answer,
    referenceScore: value.referenceScore,
    expectedAction: value.expectedAction,
    notes: value.notes
  });
}

export function assignStratifiedSplits(samples: VersionedEvalSample[]) {
  const byCategory = new Map<string, Map<string, VersionedEvalSample[]>>();
  for (const sample of samples) {
    const groups = byCategory.get(sample.category) ?? new Map<string, VersionedEvalSample[]>();
    groups.set(sample.contentHash, [...(groups.get(sample.contentHash) ?? []), sample]);
    byCategory.set(sample.category, groups);
  }
  const assignments = new Map<string, VersionedEvalSample["split"]>();
  for (const groups of byCategory.values()) {
    const ordered = [...groups.keys()].sort();
    let trainingGroups = Math.max(1, Math.floor(ordered.length * 0.7));
    const validationGroups = Math.max(1, Math.floor(ordered.length * 0.15));
    if (trainingGroups + validationGroups >= ordered.length) {
      trainingGroups = Math.max(1, ordered.length - validationGroups - 1);
    }
    ordered.forEach((contentHash, index) => {
      assignments.set(
        contentHash,
        index < trainingGroups ? "TRAIN" :
          index < trainingGroups + validationGroups ? "VALIDATION" : "TEST"
      );
    });
  }
  return samples.map((sample) => ({ ...sample, split: assignments.get(sample.contentHash)! }));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeExpectedAction(value: string | null) {
  if (!value) return null;
  if (value === "CLARIFY") return "CHALLENGE" as const;
  if (value === "CLOSE") return "STOP" as const;
  return evalActionSchema.parse(value);
}

function countBy<T>(values: T[], selector: (value: T) => string) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = selector(value);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function countCrossSplitDuplicateGroups(samples: VersionedEvalSample[]) {
  const groups = new Map<string, Set<string>>();
  for (const sample of samples) {
    const splits = groups.get(sample.contentHash) ?? new Set<string>();
    splits.add(sample.split);
    groups.set(sample.contentHash, splits);
  }
  return [...groups.values()].filter((splits) => splits.size > 1).length;
}
