import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loadStyleContext } from "@/lib/profile/context";
import { candidateFields } from "@/lib/retail/candidate";
import { scrapeProduct } from "@/lib/retail/scrape";
import { searchProducts } from "@/lib/retail/search";
import { searchColors } from "@/lib/retail/synonyms";

export const maxDuration = 120;

const Body = z.object({ wishlistId: z.string().uuid() });

/** Words worth searching from a free-text preference ("Tooled or textured leather..."). */
function keywords(text: string | null): string {
  const stop = new Set(["or", "and", "the", "a", "an", "with", "for", "to", "of", "no", "both", "styles", "style", "preference", "none", "found", "needed", "only"]);
  return (text ?? "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w))
    .slice(0, 4)
    .join(" ");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", detail: "You're signed out. Sign in again to save this." }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", detail: "Couldn't search for that wish. Refresh the page and try again." }, { status: 400 });

  const { data: wish } = await supabase.from("wishlist").select("*").eq("id", parsed.data.wishlistId).eq("user_id", user.id).maybeSingle();
  if (!wish) return NextResponse.json({ error: "not_found", detail: "That wish isn't here anymore. Refresh the page." }, { status: 404 });

  const ctx = await loadStyleContext(supabase, user.id);
  const what = ((wish.title as string | null) || (wish.category as string)).replace(/^tier \d\s*/i, "");
  const gender = ctx.presentation === "mens" ? "men's" : ctx.presentation === "womens" ? "women's" : "";
  const wanted = Array.isArray(wish.colors) && wish.colors.length ? (wish.colors as string[]) : ctx.scoreColor?.best_colors ?? [];
  const colors = searchColors(wanted, 3);
  const kw = keywords(wish.preferences as string | null);
  const brands = ctx.lovedBrands.slice(0, 2);

  // A handful of queries: color synonyms, then loved brands. Capped so a run stays cheap.
  const queries = [
    ...colors.map((c) => `${gender} ${c} ${what} ${kw}`.replace(/\s+/g, " ").trim()),
    ...brands.map((b) => `${b} ${gender} ${what}`.replace(/\s+/g, " ").trim()),
  ].slice(0, 5);

  const { hits, provider } = await searchProducts(queries, 10);
  const scraped = await Promise.allSettled(hits.slice(0, 8).map((h) => scrapeProduct(h.url)));
  const products = scraped.flatMap((r) => (r.status === "fulfilled" && r.value.imageUrl ? [r.value] : [])).slice(0, 6);

  const saved: Array<Record<string, unknown>> = [];
  for (const p of products) {
    const { data: row } = await supabase
      .from("wishlist_candidates")
      .upsert(
        {
          ...(await candidateFields(p, ctx)),
          user_id: user.id,
          wishlist_id: wish.id,
        },
        { onConflict: "wishlist_id,url" }
      )
      .select("*")
      .single();
    if (row) saved.push(row);
  }
  await supabase.from("wishlist").update({ last_searched_at: new Date().toISOString() }).eq("id", wish.id).eq("user_id", user.id);

  return NextResponse.json({
    candidates: saved,
    queries,
    provider,
    found: hits.length,
    note: hits.length === 0 ? "We didn't find any product pages. Add a color or brand to the wish and try again." : saved.length === 0 ? "We found stores but couldn't read their pages. Try a different color or brand." : null,
  });
}
