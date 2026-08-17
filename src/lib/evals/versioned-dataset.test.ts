import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDatasetManifest,
  toVersionedEvalSample,
  verifyFrozenDataset
} from "./versioned-dataset";

const categories = ["BASIC", "BOUNDARY", "FOLLOW_UP", "BADCASE", "SAFETY"];
const splits = ["TRAIN", "VALIDATION", "TEST"];

function samples() {
  return categories.flatMap((category, categoryIndex) =>
    splits.map((split, splitIndex) => {
      const index = categoryIndex * splits.length + splitIndex;
      return toVersionedEvalSample({
        sampleKey: `sample-${index}`,
        split,
        sourceType: "LEGACY_SYNTHETIC",
        labelStatus: "REFERENCE_ONLY",
        module: "BEHAVIORAL",
        targetRole: "Product Manager",
        category,
        question: `Question ${index}`,
        answer: `Answer ${index}`,
        humanScore: Math.min(index * 5, 100),
        expectedFollowUp: category === "FOLLOW_UP" ? "CLARIFY" : null,
        notes: "generated:test"
      });
    })
  );
}

test("builds and verifies a content-addressed frozen dataset", () => {
  const rows = samples();
  const manifest = buildDatasetManifest(rows, "2026-08-17T00:00:00.000Z");
  const result = verifyFrozenDataset(rows, manifest, rows.length);
  assert.equal(result.valid, true);
  assert.equal(manifest.sampleCount, 15);
  assert.equal(rows.find((sample) => sample.category === "FOLLOW_UP")?.expectedAction, "CHALLENGE");
});

test("detects changed content after freezing", () => {
  const rows = samples();
  const manifest = buildDatasetManifest(rows, "2026-08-17T00:00:00.000Z");
  const tampered = rows.map((sample, index) =>
    index === 0 ? { ...sample, answer: "changed" } : sample
  );
  const result = verifyFrozenDataset(tampered, manifest, rows.length);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.startsWith("CONTENT_HASH_MISMATCH")));
});
