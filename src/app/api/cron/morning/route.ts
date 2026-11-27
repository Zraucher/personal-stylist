import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDate } from "@/lib/today/weather";
import { localHour } from "@/lib/time";
import { pushConfigured, pushToUser } from "@/lib/push/send";
import { morningDue } from "@/lib/today/daily";
import { claimDailyNotification, ensureDailyOutfit, previewImage } from "@/lib/today/daily-server";

export const maxDuration = 300;

// Hourly at :30 (GitHub Actions, .github/workflows/morning.yml): for everyone whose clock reads 6:30 right now,
// make the day's outfit (the same pick the home page shows) and send it. Vercel's free plan only runs jobs daily,
// hence the outside caller and its own secret. daily_outfits.notified_at keeps a rerun in the same hour silent.
// shortcut: a run GitHub skips or delays past the hour means no morning push that day.
const TITLE = "Today's recommended Outfit";

function authorized(req: NextRequest): boolean {
  const secret = process.env.MORNING_CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ pushes: 0 });
  const admin = createAdminClient();
  const started = Date.now();

  const { data: subs } = await admin.from("push_subscriptions").select("user_id");
  const users = [...new Set((subs ?? []).map((s) => s.user_id as string))];
  const { data: profs } = users.length ? await admin.from("profiles").select("id, timezone").in("id", users) : { data: [] };
  const tz = new Map((profs ?? []).map((p) => [p.id as string, (p.timezone as string | null) ?? null]));
  const due = users.filter((u) => morningDue(localHour(tz.get(u) ?? null), null));

  const morning = async (userId: string): Promise<number> => {
    const daily = await ensureDailyOutfit(userId);
    // No outfit means a closet too thin to pick from: nothing to recommend, so no push.
    if (!daily || !morningDue(localHour(tz.get(userId) ?? null), daily.notifiedAt)) return 0;
    if (!(await claimDailyNotification(daily.id))) return 0;

    // An outfit they planned themselves wins over our pick.
    const today = localDate(tz.get(userId) ?? null);
    const { data: plan } = await admin.from("plans").select("outfit_id, worn").eq("user_id", userId).eq("date", today).maybeSingle();
    let name = daily.name;
    let itemIds = daily.itemIds;
    if (plan?.outfit_id && !plan.worn) {
      const { data: o } = await admin.from("outfits").select("name, item_ids").eq("id", plan.outfit_id).maybeSingle();
      if (o) {
        name = (o.name as string | null) ?? name;
        itemIds = (o.item_ids as string[] | null) ?? itemIds;
      }
    }
    const image = await previewImage(itemIds).catch(() => undefined);
    return pushToUser(userId, "morning", { title: TITLE, body: name.slice(0, 120), url: "/today", tag: "morning", image });
  };

  let pushes = 0;
  for (let i = 0; i < due.length; i += 10) {
    if (Date.now() - started > 270_000) break;
    const sent = await Promise.allSettled(due.slice(i, i + 10).map(morning));
    for (const r of sent) {
      if (r.status === "fulfilled") pushes += r.value;
      else console.error("morning push failed", r.reason);
    }
  }
  return NextResponse.json({ subscribed: users.length, due: due.length, pushes });
}
