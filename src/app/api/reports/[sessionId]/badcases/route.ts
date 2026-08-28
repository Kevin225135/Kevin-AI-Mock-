import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/auth-service";
import { getMockSession } from "@/lib/domain/mock-service";
import { getDataStore } from "@/lib/repositories";
import { analyticsEvents } from "@/lib/analytics/events";
import { assertSafeOrigin } from "@/lib/http/security";
import { jsonError } from "@/lib/http/errors";
import { prisma } from "@/lib/repositories/prisma-client";

const schema = z.object({
  questionId: z.string().min(1).optional(),
  type: z.enum(["SCORING", "HALLUCINATION", "SUGGESTION", "OTHER"]),
  comment: z.string().min(3).max(1000)
});
type Context = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const { sessionId } = await context.params;
    if (!(await getMockSession(sessionId, actor))) {
      return NextResponse.json(
        { error: "Report not found." },
        { status: 404 }
      );
    }
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "请填写问题描述。" },
        { status: 400 }
      );
    }
    const store = await getDataStore();
    const traceRun = await prisma.traceRun.findFirst({
      where: { sessionId, userId: actor.id },
      orderBy: { startedAt: "desc" },
      select: { id: true, runId: true }
    });
    const severity = parsed.data.type === "HALLUCINATION" ? "P0" : "P1";
    const badCase = await prisma.badCase.create({
      data: {
        userId: actor.id,
        sessionId,
        traceRunId: traceRun?.id,
        questionId: parsed.data.questionId,
        type: parsed.data.type,
        severity,
        comment: parsed.data.comment
      }
    });
    await store.trackEvent({
      name: analyticsEvents.badcaseReport,
      sessionId,
      userId: actor.id,
      payload: {
        badCaseId: badCase.id,
        traceRunId: traceRun?.runId,
        type: badCase.type,
        status: badCase.status,
        severity
      }
    });
    return NextResponse.json({
      ok: true,
      badCaseId: badCase.id,
      traceRunId: traceRun?.runId
    });
  } catch (error) {
    return jsonError(error, "提交问题失败。");
  }
}
