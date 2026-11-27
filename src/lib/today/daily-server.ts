import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { dayCandidates, loadWeekState } from "@/lib/plan/server";
import { outfitName, type Occasion } from "./candidates";
import { dailyOccasion, dailyReason, dayType, type DayType } from "./daily";
import { localDate, type WeatherSummary } from "./weather";

export type DailyOutfit = {
  id: string;
  date: string;
  dayType: DayType;
  occasion: Occasion;
  itemIds: string[];
  name: string;
  reason: string;
  weather: WeatherSummary | null;
  notifiedAt: string | null;
};

const COLS = "id, date, day_type, occasion, item_ids, name, reason, weather, notified_at";
const view = (r: Record<string, unknown>): DailyOutfit => ({
  id: r.id as string,
  date: r.date as string,
  dayType: r.day_type as DayType,
  occasion: r.occasion as Occasion,
  itemIds: (r.item_ids as string[]) ?? [],
  name: r.name as string,
  reason: (r.reason as string | null) ?? "",
  weather: (r.weather as WeatherSummary | null) ?? null,
  notifiedAt: (r.notified_at as string | null) ?? null,
});

/**
 * Today's one pick for a person, made and saved the first time anyone asks (the home page or the
 * 6:30 job). Null when the closet can't make an outfit yet. Runs as the service role, so the caller
 * must already know `userId` is the signed-in person (or be the cron job).
 */
export async function ensureDailyOutfit(userId: string): Promise<DailyOutfit | null> {
  const admin = createAdminClient();
  // The cheap check first: most calls find today's row already made.
  const { data: prof } = await admin.from("profiles").select("timezone").eq("id", userId).maybeSingle();
  const today = localDate((prof?.timezone as string | null) ?? null);
  const { data: existing } = await admin.from("daily_outfits").select(COLS).eq("user_id", userId).eq("date", today).maybeSingle();
  if (existing) return view(existing);

  // loadStyleContext's principles read is unscoped under the service role; only the score rules are used here.
  const s = await loadWeekState(admin, userId);

  const weather = s.weather[0] ?? null;
  if (!weather) return null;
  const occasion = dailyOccasion(s.today, s.history);
  const cands = dayCandidates(s.closet, weather, occasion, s.ctx);
  if (!cands.length) return null;
  // Don't hand out the same outfit two days running: skip sets picked in the last week when there's another.
  const { data: recent } = await admin.from("daily_outfits").select("item_ids").eq("user_id", userId).lt("date", s.today).order("date", { ascending: false }).limit(7);
  const key = (ids: string[]) => [...ids].sort().join(",");
  const used = new Set((recent ?? []).map((r) => key((r.item_ids as string[]) ?? [])));
  const pick = cands.find((c) => !used.has(key(c.items.map((i) => i.id)))) ?? cands[0];

  const row = {
    user_id: userId,
    date: s.today,
    day_type: dayType(s.today),
    occasion,
    item_ids: pick.items.map((i) => i.id),
    name: outfitName(pick.items).slice(0, 120),
    reason: dailyReason(s.today, occasion, weather),
    weather,
  };
  // Two callers at once (page + cron): the unique (user_id, date) keeps the first, and both read it back.
  await admin.from("daily_outfits").upsert(row, { onConflict: "user_id,date", ignoreDuplicates: true });
  const { data: saved } = await admin.from("daily_outfits").select(COLS).eq("user_id", userId).eq("date", s.today).maybeSingle();
  return saved ? view(saved) : null;
}

/** Claim the day's notification. True for exactly one caller, so a rerun in the same hour sends nothing. */
export async function claimDailyNotification(id: string): Promise<boolean> {
  const { data } = await createAdminClient().from("daily_outfits").update({ notified_at: new Date().toISOString() }).eq("id", id).is("notified_at", null).select("id");
  return !!data?.length;
}

/**
 * A photo URL the phone can load without signing in: a 24-hour signed link to the outfit's main
 * garment (a top or dress first), or a retailer photo when no piece has its own.
 */
export async function previewImage(itemIds: string[]): Promise<string | undefined> {
  if (!itemIds.length) return undefined;
  const admin = createAdminClient();
  const { data: rows } = await admin.from("closet_items").select("id, category, image_path, source_image_url").in("id", itemIds);
  const rank = (c: unknown) => (c === "top" || c === "dress" ? 0 : c === "outerwear" ? 1 : 2);
  const ordered = [...(rows ?? [])].sort((a, b) => rank(a.category) - rank(b.category));
  const own = ordered.find((r) => r.image_path);
  if (own) {
    const { data } = await admin.storage.from(CLOSET_BUCKET).createSignedUrl(own.image_path as string, 60 * 60 * 24);
    if (data?.signedUrl) return data.signedUrl;
  }
  const retail = ordered.find((r) => typeof r.source_image_url === "string" && (r.source_image_url as string).startsWith("https://"));
  return (retail?.source_image_url as string | undefined) ?? undefined;
}
