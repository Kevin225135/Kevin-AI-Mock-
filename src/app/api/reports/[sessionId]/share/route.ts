import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { getMockSession } from "@/lib/domain/mock-service";
import { prisma } from "@/lib/repositories/prisma-client";
import { assertSafeOrigin } from "@/lib/http/security";
import { jsonError } from "@/lib/http/errors";

type Context = { params: Promise<{ sessionId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const actor = await requireAuth(request);
    const { sessionId } = await context.params;
    if (!(await getMockSession(sessionId, actor))) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    const report = await prisma.report.findUnique({ where: { sessionId } });
    const active = Boolean(
      report?.isPublic &&
        report.shareToken &&
        report.shareExpiresAt &&
        report.shareExpiresAt > new Date()
    );
    return NextResponse.json({
      active,
      path: active ? `/shared/${report!.shareToken}` : null,
      expiresAt: active ? report!.shareExpiresAt!.toISOString() : null
    });
  } catch (error) {
    return jsonError(error, "加载分享状态失败。");
  }
}

export async function POST(request: Request, context: Context) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const { sessionId } = await context.params;
    if (!(await getMockSession(sessionId, actor))) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    const shareExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const report = await prisma.report.update({
      where: { sessionId },
      data: {
        isPublic: true,
        shareToken: randomUUID(),
        shareExpiresAt
      }
    });
    return NextResponse.json({
      path: `/shared/${report.shareToken}`,
      expiresAt: shareExpiresAt.toISOString()
    });
  } catch (error) {
    return jsonError(error, "创建分享链接失败。");
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const { sessionId } = await context.params;
    if (!(await getMockSession(sessionId, actor))) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }
    await prisma.report.update({
      where: { sessionId },
      data: { isPublic: false, shareToken: null, shareExpiresAt: null }
    });
    return NextResponse.json({ active: false });
  } catch (error) {
    return jsonError(error, "撤销分享链接失败。");
  }
}
