import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { getMockSession } from "@/lib/domain/mock-service";
import { prisma } from "@/lib/repositories/prisma-client";
import { assertSafeOrigin } from "@/lib/http/security";
import { jsonError } from "@/lib/http/errors";
type Context = { params: Promise<{ sessionId: string }> };
export async function POST(request: Request, context: Context) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const { sessionId } = await context.params;
    if (!(await getMockSession(sessionId, actor))) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const report = await prisma.report.update({ where: { sessionId }, data: { isPublic: true, shareToken: randomUUID() } });
    return NextResponse.json({ path: `/shared/${report.shareToken}` });
  } catch (error) { return jsonError(error, "创建分享链接失败。"); }
}
