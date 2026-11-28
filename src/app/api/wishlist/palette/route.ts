import { NextResponse } from "next/server";
import { aiAvailable } from "@/lib/ai/claude";
import { loadStyleContext } from "@/lib/profile/context";
import { paletteFields } from "@/lib/retail/candidate";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;
const BATCH = 4;

/** Palette-check saved products that arrived without one (Moonsift imports), a few photos per call. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", detail: "You're signed out. Sign in again." }, { status: 401 });
  // Without the photo reader every item would score "unknown" and never be re-read, so wait for the key instead.
  if (!aiAvailable()) return NextResponse.json({ updated: [], remaining: 0 });

  const { data: rows, count } = await supabase
    .from("wishlist_candidates")
    .select("id, name, image_url", { count: "exact" })
    .eq("user_id", user.id)
    .is("palette_status", null)
    .not("image_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(BATCH);
  if (!rows?.length) return NextResponse.json({ updated: [], remaining: 0 });

  const ctx = await loadStyleContext(supabase, user.id);
  const results = await Promise.allSettled(rows.map((r) => paletteFields({ name: r.name as string | null, imageUrl: r.image_url as string }, ctx)));
  const updated = [];
  for (let i = 0; i < rows.length; i++) {
    const res = results[i];
    // A failed read still gets a status so the item isn't retried forever.
    const f = res.status === "fulfilled" ? res.value : { colors: [], palette_status: "unknown", palette_reason: "Couldn't read this photo's colors." };
    const { error } = await supabase.from("wishlist_candidates").update(f).eq("id", rows[i].id).eq("user_id", user.id);
    if (!error) updated.push({ id: rows[i].id as string, ...f });
  }
  return NextResponse.json({ updated, remaining: Math.max(0, (count ?? 0) - updated.length) });
}
