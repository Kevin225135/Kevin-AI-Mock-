import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/repositories/prisma-client";
import {
  buildDatasetManifest,
  assignStratifiedSplits,
  DATASET_NAME,
  DATASET_VERSION,
  EXPECTED_LEGACY_SAMPLE_COUNT,
  toVersionedEvalSample,
  verifyFrozenDataset
} from "../src/lib/evals/versioned-dataset";

const outputDirectory = path.join(process.cwd(), "evals", "datasets");
const datasetPath = path.join(outputDirectory, "v2-legacy-318-v1.jsonl");
const manifestPath = path.join(outputDirectory, "v2-legacy-318-v1.manifest.json");

async function main() {
  const dataset = await prisma.evalDatasetVersion.findUniqueOrThrow({
    where: { name_version: { name: DATASET_NAME, version: DATASET_VERSION } },
    include: { samples: { orderBy: { sampleKey: "asc" } } }
  });
  if (dataset.samples.length !== EXPECTED_LEGACY_SAMPLE_COUNT) {
    throw new Error(
      `Refusing to freeze ${dataset.samples.length} rows; expected ${EXPECTED_LEGACY_SAMPLE_COUNT}.`
    );
  }

  const samples = assignStratifiedSplits(dataset.samples.map(toVersionedEvalSample));
  const frozenAt = (dataset.frozenAt ?? new Date()).toISOString();
  const manifest = buildDatasetManifest(samples, frozenAt);
  const verification = verifyFrozenDataset(samples, manifest);
  if (!verification.valid) throw new Error(verification.errors.join("\n"));

  if (dataset.status === "FROZEN" && dataset.contentHash !== manifest.contentHash) {
    throw new Error(
      `Frozen dataset hash changed: stored=${dataset.contentHash} current=${manifest.contentHash}`
    );
  }

  if (dataset.status !== "FROZEN") {
    await prisma.$transaction([
      ...samples.map((sample) =>
        prisma.evalSample.update({
          where: { sampleKey: sample.sampleKey },
          data: { contentHash: sample.contentHash, split: sample.split }
        })
      ),
      prisma.evalDatasetVersion.update({
        where: { id: dataset.id },
        data: {
          status: "FROZEN",
          sampleCount: samples.length,
          contentHash: manifest.contentHash,
          frozenAt: new Date(frozenAt)
        }
      })
    ]);
  }

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(datasetPath, `${samples.map((sample) => JSON.stringify(sample)).join("\n")}\n`, "utf8");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ datasetPath, manifestPath, ...manifest }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
