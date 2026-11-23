import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loadStyleContext } from "@/lib/profile/context";
import { candidateFields } from "@/lib/retail/candidate";
import { cleanLink } from "@/lib/retail/link";
import { PageSeen, withPage } from "@/lib/retail/page";
import { safeUrl, scrapeProduct } from "@/lib/retail/scrape";

export const maxDuration = 60;

const Body = z.object({ link: z.string().max(4000), page: PageSeen.optional() });

/** Save a product link from any store. The link is kept even when the page can't be read. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", detail: "You're signed out. Sign in again to save this." }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const url = parsed.success ? cleanLink(parsed.data.link) : null;
  if (!url || !safeUrl(url)) return NextResponse.json({ error: "bad_request", detail: "That doesn't look like a store link. Paste the product page's address." }, { status: 400 });

  const mine = () => supabase.from("wishlist_candidates").select("*").eq("user_id", user.id).eq("url", url).is("wishlist_id", null).maybeSingle();
  const { data: existing } = await mine();
  if (existing) {
    if (existing.state !== "saved") await supabase.from("wishlist_candidates").update({ state: "saved" }).eq("id", existing.id).eq("user_id", user.id);
    return NextResponse.json({ candidate: { ...existing, state: "saved" }, already: true, read: !!existing.name });
  }

  const product = withPage(url, await scrapeProduct(url).catch(() => null), parsed.success ? parsed.data.page : undefined);
  const fields = product
    ? await candidateFields(product, await loadStyleContext(supabase, user.id))
    : { name: null, brand: new URL(url).hostname.replace(/^www\./, ""), price: null };
  const { data: row, error } = await supabase
    .from("wishlist_candidates")
    // Keyed by the link the person saved, so saving it twice finds the same row.
    .insert({ ...fields, url, user_id: user.id, wishlist_id: null, state: "saved", watch: fields.price != null, first_price: fields.price, price_checked_at: fields.price != null ? new Date().toISOString() : null })
    .select("*")
    .single();
  if (error) {
    // Two saves of the same link at once: the unique index kept one.
    const { data: raced } = await mine();
    if (raced) return NextResponse.json({ candidate: raced, already: true, read: !!raced.name });
    return NextResponse.json({ error: "save_failed", detail: "Couldn't save that. Try again." }, { status: 500 });
  }
  return NextResponse.json({ candidate: row, already: false, read: !!product });
}
