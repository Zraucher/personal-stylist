import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeProduct } from "@/lib/retail/scrape";
import { appendPrice, priceCheckDue, priceNews, type PricePoint } from "@/lib/retail/price";
import { pushConfigured, pushToUser } from "@/lib/push/send";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { priceAlertEmail, unsubscribeSig } from "@/lib/email/alerts";

export const maxDuration = 300;

// Daily job (Vercel Cron, around 7am Pacific): re-check watched prices for everyone and send
// price-drop notifications. The morning outfit goes out hourly from /api/cron/morning, at 7am local time. Vercel sends CRON_SECRET as a bearer token.

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}


export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const started = Date.now();

  // 1. Prices: everything watched and due, oldest check first, bounded per run.
  const { data: watched } = await admin
    .from("wishlist_candidates")
    .select("id, user_id, url, name, price, first_price, target_price, price_checked_at, price_history")
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
      const listPrice = res.status === "fulfilled" ? res.value.listPrice ?? null : null;
      if (price != null) {
        patch.price = price;
        patch.list_price = listPrice;
      }
      await admin.from("wishlist_candidates").update(patch).eq("id", r.id);
      const num = (v: unknown) => (v != null ? Number(v) : null);
      const news = priceNews({ name: r.name as string | null, before: num(r.price), first: num(r.first_price), target: num(r.target_price) }, price, listPrice);
      if (news) {
        const list = drops.get(r.user_id as string) ?? [];
        list.push(news);
        drops.set(r.user_id as string, list);
      }
    }
  }

  // Price drops also go by email to everyone who hasn't turned that off.
  let emails = 0;
  if (emailConfigured() && process.env.CRON_SECRET && drops.size) {
    const site = "https://www.myvalette.com";
    const { data: people } = await admin.from("profiles").select("id, email").in("id", [...drops.keys()]).eq("email_alerts", true);
    for (const p of people ?? []) {
      if (!p.email) continue;
      const unsub = `${site}/api/alerts/unsubscribe?u=${p.id}&s=${unsubscribeSig(p.id as string, process.env.CRON_SECRET)}`;
      const mail = priceAlertEmail(drops.get(p.id as string) ?? [], site, unsub);
      const headers = { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
      if (await sendEmail({ to: p.email as string, ...mail, headers })) emails++;
    }
  }

  let pushes = 0;
  if (pushConfigured()) {
    for (const [userId, lines] of drops) {
      pushes += await pushToUser(userId, "prices", {
        title: lines.length === 1 ? "Price alert" : `${lines.length} price alerts`,
        body: lines.slice(0, 3).join(" · "),
        url: "/wishlist",
        tag: "prices",
      });
    }
  }

  return NextResponse.json({ checked: due.length, dropUsers: drops.size, pushes, emails });
}
