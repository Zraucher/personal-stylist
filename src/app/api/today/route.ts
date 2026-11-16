import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loadRecommendation, recommend } from "@/lib/today/recommend";

export const maxDuration = 60;

const Body = z.object({
  occasion: z.enum(["office", "casual", "dinner", "event", "active", "travel"]),
  hours: z.array(z.enum(["morning", "midday", "evening"])).max(3),
  indoorCold: z.boolean(),
  dayOffset: z.number().int().min(0).max(1).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    const id = await recommend(supabase, user.id, { kind: "today", ...parsed.data });
    const view = await loadRecommendation(supabase, user.id, id);
    return NextResponse.json({ recommendation: view });
  } catch (e) {
    return NextResponse.json({ error: "failed", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
