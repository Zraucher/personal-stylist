import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeProduct } from "@/lib/retail/scrape";
import { appendPrice, priceCheckDue, priceDrop, type PricePoint } from "@/lib/retail/price";
import { localDate } from "@/lib/today/weather";
import { pushConfigured, pushToUser } from "@/lib/push/send";

export const maxDuration = 300;

// Daily job (Vercel Cron, around 7am Pacific): re-check watched prices for everyone and send
// the morning outfit and price-drop notifications. Vercel sends CRON_SECRET as a bearer token.

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

const money = (n: number) => `$${n % 1 ? n.toFixed(2) : n}`;

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const started = Date.now();

  // 1. Prices: everything watched and due, oldest check first, bounded per run.
  const { data: watched } = await admin
    .from("wishlist_candidates")
    .select("id, user_id, url, name, price, first_price, price_checked_at, price_history")
    .eq("watch", true)
    .order("price_checked_at", { ascending: true, nullsFirst: true })
    .limit(200);
  const due = (watched ?? []).filter((r) => priceCheckDue(r.price_checked_at as string | null, Date.now(), 20)).slice(0, 40);
  const drops = new Map<string, string[]>();
  for (let i = 0; i < due.length; i += 5) {
    if (Date.now() - started > 200_000) break;
    const batch = due.slice(i, i + 5);
    const results = await Promise.allSettled(batch.map((r) => scrapeProduct(r.url as string)));
    for (let k = 0; k < batch.length; k++) {
      const r = batch[k];
      const res = results[k];
      const at = new Date().toISOString();
      const price = res.status === "fulfilled" ? res.value.price : null;
      const history = (Array.isArray(r.price_history) ? r.price_history : []) as PricePoint[];
      const patch: Record<string, unknown> = { price_checked_at: at, price_history: price != null ? appendPrice(history, price, at) : history };
      if (price != null) patch.price = price;
      await admin.from("wishlist_candidates").update(patch).eq("id", r.id);
      const before = r.price != null ? Number(r.price) : null;
      const drop = priceDrop(r.first_price != null ? Number(r.first_price) : null, price);
      // Only news: the price is below where it was yesterday, and meaningfully below where it started.
      if (drop && before != null && price != null && price < before) {
        const list = drops.get(r.user_id as string) ?? [];
        list.push(`${((r.name as string | null) ?? "A find").slice(0, 40)} is ${money(price)} (down ${drop.percent}%)`);
        drops.set(r.user_id as string, list);
      }
    }
  }

  let pushes = 0;
  if (pushConfigured()) {
    for (const [userId, lines] of drops) {
      pushes += await pushToUser(userId, "prices", {
        title: lines.length === 1 ? "Price drop" : `${lines.length} price drops`,
        body: lines.slice(0, 3).join(" · "),
        url: "/wishlist",
        tag: "prices",
      });
    }

    // 2. Morning outfit for everyone with notifications on.
    const { data: subs } = await admin.from("push_subscriptions").select("user_id");
    const users = [...new Set((subs ?? []).map((s) => s.user_id as string))];
    const morning = async (userId: string): Promise<number> => {
      const { data: prof } = await admin.from("profiles").select("timezone, name").eq("id", userId).maybeSingle();
      const today = localDate((prof?.timezone as string | null) ?? null);
      const { data: plan } = await admin.from("plans").select("outfit_id, weather, worn").eq("user_id", userId).eq("date", today).maybeSingle();
      let title = "What are you wearing today?";
      let body = "Three outfits for today's weather are one tap away.";
      if (plan?.outfit_id && !plan.worn) {
        const { data: o } = await admin.from("outfits").select("name").eq("id", plan.outfit_id).maybeSingle();
        const w = plan.weather as { feelsMin?: number; feelsMax?: number; rainMax?: number; source?: string } | null;
        title = `Today: ${((o?.name as string | null) ?? "your planned outfit").slice(0, 60)}`;
        body = w && w.source === "forecast" ? `Feels ${w.feelsMin}–${w.feelsMax}°${(w.rainMax ?? 0) >= 40 ? `, ${w.rainMax}% chance of rain` : ""}. Tap to see it.` : "Planned and ready. Tap to see it.";
      }
      return pushToUser(userId, "morning", { title, body, url: "/today", tag: "morning" });
    };
    for (let i = 0; i < users.length; i += 10) {
      if (Date.now() - started > 270_000) break;
      const sent = await Promise.allSettled(users.slice(i, i + 10).map(morning));
      for (const r of sent) if (r.status === "fulfilled") pushes += r.value;
    }
  }

  return NextResponse.json({ checked: due.length, dropUsers: drops.size, pushes });
}
