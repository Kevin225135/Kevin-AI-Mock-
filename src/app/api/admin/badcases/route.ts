import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/repositories/prisma-client";
import { jsonError } from "@/lib/http/errors";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const events = await prisma.event.findMany({ where: { name: "badcase_report" }, orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json({ badcases: events.map((event) => ({ id: event.id, sessionId: event.sessionId, userId: event.userId, payload: event.payload, createdAt: event.createdAt.toISOString() })) });
  } catch (error) { return jsonError(error, "加载 Badcase 失败。"); }
}
