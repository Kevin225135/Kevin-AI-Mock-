import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-service";
import { retrieveDualDomain } from "@/lib/rag/dual-domain-retrieval";
import { jsonError } from "@/lib/http/errors";
import { assertSafeOrigin } from "@/lib/http/security";
import { dualDomainRetrievalSchema } from "@/lib/validation/retrieval";

export async function POST(request: Request) {
  try {
    assertSafeOrigin(request);
    const actor = await requireAuth(request);
    const parsed = dualDomainRetrievalSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const retrieval = await retrieveDualDomain({ actor, ...parsed.data });
    return NextResponse.json({ retrieval });
  } catch (error) {
    return jsonError(error, "Failed to retrieve interview context.");
  }
}
