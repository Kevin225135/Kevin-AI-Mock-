import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/auth-service";
import { analyticsEvents } from "@/lib/analytics/events";
import { getDataStore } from "@/lib/repositories";
import { getMockSession } from "@/lib/domain/mock-service";
import { assertSafeOrigin } from "@/lib/http/security";
import { jsonError } from "@/lib/http/errors";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional()
});

type Context = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const { sessionId } = await context.params;
    if (!(await getMockSession(sessionId, actor))) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "请选择 1-5 星评分。" }, { status: 400 });
    }
    const store = await getDataStore();
    await store.trackEvent({
      name: analyticsEvents.reportFeedbackSubmit,
      sessionId,
      userId: actor.id,
      payload: parsed.data
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, "提交反馈失败。");
  }
}
