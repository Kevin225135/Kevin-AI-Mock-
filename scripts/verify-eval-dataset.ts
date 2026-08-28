import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  type DatasetManifest,
  parseDatasetJsonl,
  verifyFrozenDataset
} from "../src/lib/evals/versioned-dataset";

async function main() {
  const directory = path.join(process.cwd(), "evals", "datasets");
  const [jsonl, manifestText] = await Promise.all([
    readFile(path.join(directory, "v2-legacy-318-v1.jsonl"), "utf8"),
    readFile(path.join(directory, "v2-legacy-318-v1.manifest.json"), "utf8")
  ]);
  const samples = parseDatasetJsonl(jsonl);
  const manifest = JSON.parse(manifestText) as DatasetManifest;
  const result = verifyFrozenDataset(samples, manifest);
  console.log(JSON.stringify({
    valid: result.valid,
    errors: result.errors,
    sampleCount: samples.length,
    contentHash: result.manifest.contentHash,
    counts: result.manifest.counts,
    quality: result.manifest.quality
  }, null, 2));
  if (!result.valid) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
