import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { HereSchema, loadRecommendation, recommend } from "@/lib/today/recommend";

export const maxDuration = 60;

const Body = z.object({
  occasion: z.enum(["office", "casual", "dinner", "event", "active", "travel"]),
  hours: z.array(z.enum(["morning", "midday", "evening"])).max(3),
  indoorCold: z.boolean(),
  dayOffset: z.number().int().min(0).max(1).optional(),
  // Where the browser says the person is right now; used for this forecast only, never stored.
  here: HereSchema,
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", detail: "You're signed out. Sign in again to save this." }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", detail: "Pick where you're going and try again." }, { status: 400 });

  try {
    const id = await recommend(supabase, user.id, { kind: "today", ...parsed.data });
    const view = await loadRecommendation(supabase, user.id, id);
    return NextResponse.json({ recommendation: view });
  } catch (e) {
    console.error("today: recommend failed", e);
    return NextResponse.json({ error: "failed", detail: "Couldn't pick outfits just now. Try again in a minute." }, { status: 500 });
  }
}
