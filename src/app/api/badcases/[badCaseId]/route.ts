import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/auth-service";
import { canAccessOwnedResource } from "@/lib/auth/permissions";
import { assertSafeOrigin } from "@/lib/http/security";
import { jsonError } from "@/lib/http/errors";
import { prisma } from "@/lib/repositories/prisma-client";

const schema = z
  .object({
    status: z.enum(["OPEN", "REGRESSION_ADDED", "RESOLVED"]),
    rootCauseLabel: z
      .enum([
        "INTENT",
        "RETRIEVAL",
        "DECISION",
        "TOOL",
        "SCORE",
        "OUTPUT",
        "SECURITY",
        "UX"
      ])
      .optional(),
    regressionRef: z.string().trim().min(3).max(300).optional()
  })
  .refine(
    (value) =>
      value.status !== "REGRESSION_ADDED" || Boolean(value.regressionRef),
    { message: "REGRESSION_ADDED requires regressionRef." }
  );

type Context = { params: Promise<{ badCaseId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const { badCaseId } = await context.params;
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid bad-case update.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const current = await prisma.badCase.findUnique({
      where: { id: badCaseId }
    });
    if (!current || !canAccessOwnedResource(actor, current.userId)) {
      return NextResponse.json({ error: "Bad case not found." }, { status: 404 });
    }
    const badCase = await prisma.badCase.update({
      where: { id: badCaseId },
      data: parsed.data
    });
    return NextResponse.json({ badCase });
  } catch (error) {
    return jsonError(error, "Failed to update bad case.");
  }
}
