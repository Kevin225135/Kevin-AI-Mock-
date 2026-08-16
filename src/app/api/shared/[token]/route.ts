import { NextResponse } from "next/server";
import { prisma } from "@/lib/repositories/prisma-client";

type Context = { params: Promise<{ token: string }> };

export async function GET(_: Request, context: Context) {
  const { token } = await context.params;
  const report = await prisma.report.findFirst({
    where: {
      shareToken: token,
      isPublic: true,
      shareExpiresAt: { gt: new Date() }
    }
  });
  if (!report) {
    return NextResponse.json(
      { error: "分享报告不存在、已撤销或已过期。" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(
    {
      report: {
        summary: report.summary,
        averageScore: report.averageScore,
        dimensionAverages: report.dimensionAverages,
        questionFeedback: report.questionFeedback,
        nextPracticePlan: report.nextPracticePlan,
        createdAt: report.createdAt.toISOString()
      }
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
