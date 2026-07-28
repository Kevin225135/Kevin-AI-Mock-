import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/repositories/prisma-client";
import { jsonError } from "@/lib/http/errors";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const events = await prisma.event.findMany({
      where: { createdAt: { gte: since } },
      select: { name: true, payload: true, createdAt: true }
    });
    const count = (name: string) => events.filter((event) => event.name === name).length;
    const starts = count("mock_start");
    const completes = count("mock_complete");
    const reportViews = count("report_view");
    const feedback = events
      .filter((event) => event.name === "report_feedback_submit")
      .map((event) => Number((event.payload as { rating?: unknown } | null)?.rating))
      .filter(Number.isFinite);
    const scores = events
      .filter((event) => event.name === "score_generated")
      .map((event) => Number((event.payload as { totalScore?: unknown } | null)?.totalScore))
      .filter(Number.isFinite);

    return NextResponse.json({
      metrics: {
        starts,
        completes,
        reportViews,
        sevenDayReturns: count("seven_day_return"),
        completionRate: starts ? Math.round((completes / starts) * 1000) / 10 : 0,
        reportViewRate: completes ? Math.round((reportViews / completes) * 1000) / 10 : 0,
        averageFeedback: feedback.length
          ? Math.round((feedback.reduce((a, b) => a + b, 0) / feedback.length) * 10) / 10
          : null,
        averageScore: scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null,
        feedbackCount: feedback.length
      }
    });
  } catch (error) {
    return jsonError(error, "加载数据看板失败。");
  }
}
