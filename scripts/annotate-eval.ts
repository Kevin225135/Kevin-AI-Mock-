import { z } from "zod";
import { prisma } from "../src/lib/repositories/prisma-client";

const inputSchema = z.object({
  sampleKey: z.string().min(8),
  annotator: z.string().regex(/^ann-[a-z0-9_-]{2,40}$/i),
  role: z.enum(["PRIMARY", "SECONDARY", "ARBITRATOR"]),
  totalScore: z.coerce.number().int().min(0).max(100),
  starCompleteness: z.coerce.number().int().min(1).max(5),
  logicStructure: z.coerce.number().int().min(1).max(5),
  contentDepth: z.coerce.number().int().min(1).max(5),
  communication: z.coerce.number().int().min(1).max(5),
  shouldFollowUp: z.enum(["DEEPEN", "CHALLENGE", "NEXT", "STOP", "NONE"]),
  evidenceRefs: z.string().transform((value) =>
    value.split(",").map((item) => item.trim()).filter(Boolean)
  ).refine((items) => items.length > 0, "At least one evidence reference is required."),
  notes: z.string().max(1000).optional()
});

async function main() {
  const [
    sampleKey,
    annotator,
    role,
    totalScore,
    starCompleteness,
    logicStructure,
    contentDepth,
    communication,
    shouldFollowUp,
    evidenceRefs,
    ...notes
  ] = process.argv.slice(2);
  const input = inputSchema.safeParse({
    sampleKey,
    annotator,
    role,
    totalScore,
    starCompleteness,
    logicStructure,
    contentDepth,
    communication,
    shouldFollowUp,
    evidenceRefs,
    notes: notes.join(" ") || undefined
  });
  if (!input.success) {
    console.error(input.error.flatten());
    console.error(
      "Usage: npm run eval:annotate -- <sampleKey> <ann-alias> <PRIMARY|SECONDARY|ARBITRATOR> " +
      "<0-100> <star1-5> <logic1-5> <depth1-5> <communication1-5> " +
      "<DEEPEN|CHALLENGE|NEXT|STOP|NONE> <evidence-ref[,evidence-ref]> [notes]"
    );
    process.exit(1);
  }

  const sample = await prisma.evalSample.findUniqueOrThrow({
    where: { sampleKey: input.data.sampleKey },
    include: { datasetVersion: true }
  });
  if (sample.datasetVersion.status !== "FROZEN") {
    throw new Error("Annotations may only target a frozen dataset version.");
  }

  const existingAnnotations = await prisma.evalAnnotation.findMany({
    where: { sampleId: sample.id },
    orderBy: { createdAt: "asc" }
  });
  const existingForAnnotator = existingAnnotations.find(
    (annotation) => annotation.annotator === input.data.annotator
  );
  if (existingForAnnotator && existingForAnnotator.role !== input.data.role) {
    throw new Error("An annotator cannot change roles on the same sample.");
  }
  const conflictingRole = existingAnnotations.find(
    (annotation) => annotation.role === input.data.role &&
      annotation.annotator !== input.data.annotator
  );
  if (conflictingRole) {
    throw new Error(`Role ${input.data.role} is already assigned on this sample.`);
  }
  const existingArbitrator = existingAnnotations.find(
    (annotation) => annotation.role === "ARBITRATOR"
  );
  if (existingArbitrator && input.data.role !== "ARBITRATOR") {
    throw new Error("Primary annotations are locked after arbitration.");
  }
  if (input.data.role === "ARBITRATOR") {
    const primary = existingAnnotations.find((annotation) => annotation.role === "PRIMARY");
    const secondary = existingAnnotations.find((annotation) => annotation.role === "SECONDARY");
    if (!primary || !secondary) {
      throw new Error("Arbitration requires completed PRIMARY and SECONDARY annotations.");
    }
    if (compareAnnotations(primary, secondary).length === 0) {
      throw new Error("Arbitration is not allowed when the independent annotations agree.");
    }
  }

  await prisma.evalAnnotation.upsert({
    where: { sampleId_annotator: { sampleId: sample.id, annotator: input.data.annotator } },
    update: {
      role: input.data.role,
      rubricVersion: "v2-text-rubric-2",
      totalScore: input.data.totalScore,
      dimensions: {
        starCompleteness: input.data.starCompleteness,
        logicStructure: input.data.logicStructure,
        contentDepth: input.data.contentDepth,
        communication: input.data.communication
      },
      evidenceRefs: input.data.evidenceRefs,
      shouldFollowUp: input.data.shouldFollowUp === "NONE" ? null : input.data.shouldFollowUp,
      isBlind: true,
      notes: input.data.notes ?? null
    },
    create: {
      sampleId: sample.id,
      annotator: input.data.annotator,
      role: input.data.role,
      rubricVersion: "v2-text-rubric-2",
      totalScore: input.data.totalScore,
      dimensions: {
        starCompleteness: input.data.starCompleteness,
        logicStructure: input.data.logicStructure,
        contentDepth: input.data.contentDepth,
        communication: input.data.communication
      },
      evidenceRefs: input.data.evidenceRefs,
      shouldFollowUp: input.data.shouldFollowUp === "NONE" ? null : input.data.shouldFollowUp,
      isBlind: true,
      notes: input.data.notes ?? null
    }
  });

  const annotations = await prisma.evalAnnotation.findMany({
    where: { sampleId: sample.id },
    orderBy: { createdAt: "asc" }
  });
  const primary = annotations.find((annotation) => annotation.role === "PRIMARY");
  const secondary = annotations.find((annotation) => annotation.role === "SECONDARY");
  const arbitrator = annotations.find((annotation) => annotation.role === "ARBITRATOR");
  const arbitrationReasons = primary && secondary
    ? compareAnnotations(primary, secondary)
    : ["TWO_INDEPENDENT_ANNOTATIONS_REQUIRED"];
  const labelStatus = primary && secondary && arbitrator
    ? "ARBITRATED"
    : primary && secondary && arbitrationReasons.length === 0
      ? "DOUBLE_BLIND_COMPLETE"
      : "DOUBLE_BLIND_PENDING";
  await prisma.evalSample.update({ where: { id: sample.id }, data: { labelStatus } });

  console.log(JSON.stringify({
    sampleKey: sample.sampleKey,
    dataset: `${sample.datasetVersion.name}@${sample.datasetVersion.version}`,
    annotations: annotations.length,
    labelStatus,
    arbitrationRequired: Boolean(primary && secondary && arbitrationReasons.length > 0 && !arbitrator),
    arbitrationReasons
  }, null, 2));
}

function compareAnnotations(
  left: { totalScore: number; dimensions: unknown; shouldFollowUp: string | null },
  right: { totalScore: number; dimensions: unknown; shouldFollowUp: string | null }
) {
  const reasons: string[] = [];
  if (Math.abs(left.totalScore - right.totalScore) > 10) reasons.push("TOTAL_SCORE_SPREAD_GT_10");
  const leftDimensions = dimensionsSchema.safeParse(left.dimensions);
  const rightDimensions = dimensionsSchema.safeParse(right.dimensions);
  if (!leftDimensions.success || !rightDimensions.success) {
    reasons.push("DIMENSIONS_INVALID");
  } else {
    for (const dimension of Object.keys(leftDimensions.data) as Array<keyof typeof leftDimensions.data>) {
      if (Math.abs(leftDimensions.data[dimension] - rightDimensions.data[dimension]) > 1) {
        reasons.push(`DIMENSION_SPREAD_GT_1:${dimension}`);
      }
    }
  }
  if (left.shouldFollowUp !== right.shouldFollowUp) reasons.push("FOLLOW_UP_ACTION_DISAGREEMENT");
  return reasons;
}

const dimensionsSchema = z.object({
  starCompleteness: z.number().int().min(1).max(5),
  logicStructure: z.number().int().min(1).max(5),
  contentDepth: z.number().int().min(1).max(5),
  communication: z.number().int().min(1).max(5)
});

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
