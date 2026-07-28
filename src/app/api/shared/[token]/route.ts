import { NextResponse } from "next/server";
import { prisma } from "@/lib/repositories/prisma-client";
type Context = { params: Promise<{ token: string }> };
export async function GET(_: Request, context: Context) {
  const { token } = await context.params;
  const report = await prisma.report.findFirst({ where: { shareToken: token, isPublic: true } });
  if (!report) return NextResponse.json({ error: "分享报告不存在或已关闭。" }, { status: 404 });
  return NextResponse.json({ report: { summary: report.summary, averageScore: report.averageScore, dimensionAverages: report.dimensionAverages, questionFeedback: report.questionFeedback, nextPracticePlan: report.nextPracticePlan, createdAt: report.createdAt.toISOString() } });
}
