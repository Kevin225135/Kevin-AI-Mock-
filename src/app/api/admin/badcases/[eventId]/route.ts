import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/auth-service";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { prisma } from "@/lib/repositories/prisma-client";

type Context = { params: Promise<{ eventId: string }> };

const schema = z.object({
  status: z.enum(["OPEN", "RESOLVED"]),
  resolution: z.string().trim().max(500).optional()
});

export async function PATCH(request: Request, context: Context) {
  try {
    assertSafeOrigin(request);
    await requireAdmin(request);
    const { eventId } = await context.params;
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "请求内容无效。" }, { status: 400 });
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, name: "badcase_report" }
    });
    if (!event) {
      return NextResponse.json({ error: "Badcase 不存在。" }, { status: 404 });
    }

    const previous =
      event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
        ? event.payload
        : {};
    const payload = {
      ...previous,
      ...parsed.data,
      resolvedAt: parsed.data.status === "RESOLVED" ? new Date().toISOString() : null
    };
    await prisma.event.update({ where: { id: eventId }, data: { payload } });
    return NextResponse.json({ id: eventId, payload });
  } catch (error) {
    return jsonError(error, "更新 Badcase 失败。");
  }
}
