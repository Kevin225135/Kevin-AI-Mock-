import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { listResumes, uploadResume } from "@/lib/resume/resume-service";
import { ResumeParseError } from "@/lib/resume/parser";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireAuth(request);
    return NextResponse.json({ resumes: await listResumes(actor) });
  } catch (error) {
    return jsonError(error, "Failed to load resumes.");
  }
}

export async function POST(request: Request) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const form = await request.formData();
    const file = form.get("file");
    if (form.get("privacyAccepted") !== "true") {
      return NextResponse.json(
        { error: "请先同意简历数据处理和保留说明。" },
        { status: 400 }
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Resume file is required." }, { status: 400 });
    }
    return NextResponse.json({ resume: await uploadResume(file, actor) }, { status: 201 });
  } catch (error) {
    if (error instanceof ResumeParseError) {
      return NextResponse.json(
        { error: error.message, code: "RESUME_PARSE_FAILED" },
        { status: 422 }
      );
    }
    return jsonError(error, "Failed to parse resume.");
  }
}
