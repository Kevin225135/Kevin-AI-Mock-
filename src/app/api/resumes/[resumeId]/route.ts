import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { assertSafeOrigin } from "@/lib/http/security";
import { jsonError } from "@/lib/http/errors";
import { deleteOwnedResume } from "@/lib/resume/resume-service";

type Context = { params: Promise<{ resumeId: string }> };

export async function DELETE(request: Request, context: Context) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const { resumeId } = await context.params;
    const result = await deleteOwnedResume(resumeId, actor);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error, "删除简历失败。");
  }
}
