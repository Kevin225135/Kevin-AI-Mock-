import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/repositories";
import { eventSchema } from "@/lib/validation/mock";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const store = await getDataStore();
  await store.trackEvent(parsed.data);

  return NextResponse.json({ ok: true }, { status: 202 });
}
