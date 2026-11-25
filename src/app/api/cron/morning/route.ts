import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDate } from "@/lib/today/weather";
import { localHour } from "@/lib/time";
import { pushConfigured, pushToUser } from "@/lib/push/send";

export const maxDuration = 300;

// Hourly (GitHub Actions, .github/workflows/morning.yml): the morning outfit notification for everyone whose
// clock reads 7am right now. Vercel's free plan only runs jobs daily, hence the outside caller and its own secret.
// shortcut: a run GitHub skips or delays past the hour means no morning push that day; track a sent-on date if that bites.
const SEND_AT = 7;

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
  const due = users.filter((u) => localHour(tz.get(u) ?? null) === SEND_AT);

  const morning = async (userId: string): Promise<number> => {
    const today = localDate(tz.get(userId) ?? null);
    const { data: plan } = await admin.from("plans").select("outfit_id, weather, worn").eq("user_id", userId).eq("date", today).maybeSingle();
    let title = "What are you wearing today?";
    let body = "Three outfits for today's weather are ready.";
    if (plan?.outfit_id && !plan.worn) {
      const { data: o } = await admin.from("outfits").select("name").eq("id", plan.outfit_id).maybeSingle();
      const w = plan.weather as { feelsMin?: number; feelsMax?: number; rainMax?: number; source?: string } | null;
      title = `Today: ${((o?.name as string | null) ?? "your planned outfit").slice(0, 60)}`;
      body = w && w.source === "forecast" ? `Feels ${w.feelsMin}–${w.feelsMax}°${(w.rainMax ?? 0) >= 40 ? `, ${w.rainMax}% chance of rain` : ""}. Tap to see it.` : "Planned and ready. Tap to see it.";
    }
    return pushToUser(userId, "morning", { title, body, url: "/today", tag: "morning" });
  };

  let pushes = 0;
  for (let i = 0; i < due.length; i += 10) {
    if (Date.now() - started > 270_000) break;
    const sent = await Promise.allSettled(due.slice(i, i + 10).map(morning));
    for (const r of sent) if (r.status === "fulfilled") pushes += r.value;
  }
  return NextResponse.json({ subscribed: users.length, due: due.length, pushes });
}
