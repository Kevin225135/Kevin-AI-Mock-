import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/repositories/prisma-client";
import { jsonError } from "@/lib/http/errors";

export async function GET(request: Request) {
  try {
    const actor = await requireAuth(request);
    const sessions = await prisma.mockSession.findMany({
      where: { userId: actor.id, status: "COMPLETED" }, orderBy: { createdAt: "asc" },
      include: { scores: true, report: true }, take: 30
    });
    const trend = sessions.filter((s) => s.report).map((s) => ({
      id: s.id, date: s.createdAt.toISOString(), module: s.module,
      score: s.report!.averageScore, dimensions: s.report!.dimensionAverages
    }));
    const allScores = sessions.flatMap((s) => s.scores);
    const dimensions = {
      starCompleteness: average(allScores.map((s) => s.starCompleteness)),
      logicStructure: average(allScores.map((s) => s.logicStructure)),
      contentDepth: average(allScores.map((s) => s.contentDepth)),
      communication: average(allScores.map((s) => s.communication))
    };
    const weakest = Object.entries(dimensions).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
    return NextResponse.json({ trend, dimensions, recommendation: weakest ? recommendation(weakest) : "完成一场 Mock 后生成建议。" });
  } catch (error) { return jsonError(error, "加载进步数据失败。"); }
}
function average(values: number[]) { return values.length ? Math.round(values.reduce((a,b) => a+b,0) / values.length * 10) / 10 : 0; }
function recommendation(key: string) {
  const map: Record<string,string> = { starCompleteness: "下一场优先练习 Behavioral，并强制使用 STAR 四段结构。", logicStructure: "下一场先说结论，再用三点证据展开。", contentDepth: "下一场每题至少加入一个数字、一个取舍和一个复盘。", communication: "下一场把每个回答控制在 90 秒内，删除无关铺垫。" };
  return map[key] ?? "继续保持稳定练习。";
}
