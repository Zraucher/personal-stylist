import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scrapeProduct } from "@/lib/retail/scrape";
import { appendPrice, priceCheckDue, type PricePoint } from "@/lib/retail/price";

export const maxDuration = 60;

/** Re-check prices of watched wishlist finds that are due (at most 6 per call). */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", detail: "You're signed out. Sign in again to save this." }, { status: 401 });

  const { data: rows } = await supabase
    .from("wishlist_candidates")
    .select("id, url, price, first_price, price_checked_at, price_history")
    .eq("user_id", user.id)
    .eq("watch", true);
  const now = Date.now();
  const due = (rows ?? []).filter((r) => priceCheckDue(r.price_checked_at as string | null, now)).slice(0, 6);

  const results = await Promise.allSettled(due.map((r) => scrapeProduct(r.url as string)));
  const updated: Array<{ id: string; price: number | null; firstPrice: number | null; history: PricePoint[] }> = [];
  for (let i = 0; i < due.length; i++) {
    const r = due[i];
    const res = results[i];
    const at = new Date().toISOString();
    const price = res.status === "fulfilled" ? res.value.price : null;
    const history = (Array.isArray(r.price_history) ? r.price_history : []) as PricePoint[];
    const next = price != null ? appendPrice(history, price, at) : history;
    const patch: Record<string, unknown> = { price_checked_at: at, price_history: next };
    if (price != null) patch.price = price;
    await supabase.from("wishlist_candidates").update(patch).eq("id", r.id).eq("user_id", user.id);
    updated.push({ id: r.id as string, price: price ?? (r.price as number | null), firstPrice: (r.first_price as number | null) ?? null, history: next });
  }
  return NextResponse.json({ checked: due.length, updated });
}
