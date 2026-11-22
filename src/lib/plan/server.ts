import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signedImageUrls } from "@/lib/closet/images";
import { loadStyleContext, type StyleContext } from "@/lib/profile/context";
import { loadCloset } from "@/lib/today/recommend";
import { buildCandidates, outfitName, seasonFor, OCCASIONS, type Candidate, type ClosetPiece, type DayConditions, type Occasion } from "@/lib/today/candidates";
import { forecast, geocode, localDate, statedWeather, summarize, type Hourly, type WeatherSummary } from "@/lib/today/weather";
import { planSequence } from "./sequence";
import { cleanHeadline } from "@/lib/verdict";

export const OCCASION_IDS = OCCASIONS.map((o) => o.id) as [Occasion, ...Occasion[]];
const ALL_HOURS = ["morning", "midday", "evening"] as const;

export function conditionsFor(w: WeatherSummary, indoorCold = false): DayConditions {
  return { feelsMin: w.feelsMin, feelsMax: w.feelsMax, season: seasonFor(new Date(`${w.date}T12:00:00`)), indoorCold, rainLikely: w.rainMax >= 50 };
}

/** Candidates for one day, best first. */
export function dayCandidates(closet: ClosetPiece[], w: WeatherSummary, occasion: Occasion, ctx: StyleContext, exclude: string[] = []): Candidate[] {
  const r = buildCandidates(closet, conditionsFor(w), { occasion, today: w.date }, ctx.scoreColor, ctx.scoreStyle, { limit: 10 });
  if (!exclude.length) return r.candidates;
  const key = (ids: string[]) => [...ids].sort().join(",");
  const banned = new Set([key(exclude)]);
  return r.candidates.filter((c) => !banned.has(key(c.items.map((i) => i.id))));
}

/** Where the person lives, geocoding the profile city once if needed. */
export async function homeCoords(supabase: SupabaseClient, userId: string, ctx: StyleContext): Promise<{ lat: number | null; lon: number | null; tz: string | null }> {
  const { data: prof } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle();
  let tz = (prof?.timezone as string | null) ?? null;
  let lat = ctx.latitude;
  let lon = ctx.longitude;
  if ((lat == null || lon == null) && ctx.location) {
    const g = await geocode(ctx.location);
    if (g) {
      lat = g.latitude;
      lon = g.longitude;
      tz = g.timezone;
      await supabase.from("profiles").update({ latitude: lat, longitude: lon, timezone: tz }).eq("id", userId);
    }
  }
  return { lat, lon, tz };
}

function fromHourly(h: Hourly | null, dates: string[], place: string | null): WeatherSummary[] {
  return dates.map((d) => (h ? summarize(h, d, [...ALL_HOURS], place) : null) ?? statedWeather(d, null, [...ALL_HOURS], place));
}

export async function forecastDays(lat: number | null, lon: number | null, dates: string[], place: string | null): Promise<WeatherSummary[]> {
  const h = lat != null && lon != null ? await forecast(lat, lon, 16) : null;
  return fromHourly(h, dates, place);
}

const shiftYear = (d: string, years: number) => `${Number(d.slice(0, 4)) + years}${d.slice(4)}`.replace(/-02-29$/, "-02-28");

/** Last year's weather for the same dates: the best free guess for trips beyond the forecast. */
export async function typicalDays(lat: number, lon: number, dates: string[], place: string | null): Promise<WeatherSummary[] | null> {
  const start = shiftYear(dates[0], -1);
  const end = shiftYear(dates[dates.length - 1], -1);
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}` +
    `&hourly=temperature_2m,apparent_temperature,precipitation,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000), next: { revalidate: 86400 } });
    if (!r.ok) return null;
    const body = (await r.json()) as { hourly?: { time: string[]; temperature_2m: number[]; apparent_temperature: number[]; precipitation: number[]; wind_speed_10m: number[] } };
    const h = body.hourly;
    if (!h?.time?.length) return null;
    const month = Number(dates[0].slice(5, 7));
    const sunny = Math.abs(lat) < 40 && month >= 4 && month <= 9;
    // The archive has rain amounts, not chances: turn wet hours into a rough chance.
    const wetHours = new Map<string, number>();
    h.time.forEach((t, i) => {
      if ((h.precipitation[i] ?? 0) >= 0.3) wetHours.set(t.slice(0, 10), (wetHours.get(t.slice(0, 10)) ?? 0) + 1);
    });
    const hourly: Hourly = {
      time: h.time.map((t) => shiftYear(t.slice(0, 10), 1) + t.slice(10)),
      temperature_2m: h.temperature_2m,
      apparent_temperature: h.apparent_temperature,
      precipitation_probability: h.time.map((t) => {
        const n = wetHours.get(t.slice(0, 10)) ?? 0;
        return n >= 3 ? 70 : n >= 1 ? 35 : 5;
      }),
      uv_index: h.time.map(() => (sunny ? 8 : 4)),
      wind_speed_10m: h.wind_speed_10m,
    };
    return fromHourly(hourly, dates, place).map((w) => ({ ...w, source: "stated" as const }));
  } catch {
    return null;
  }
}

/** Default occasion for a date: what the person chose on the same weekday lately, else office on weekdays. */
export function defaultOccasion(date: string, history: Array<{ date: string; occasion: string }>): Occasion {
  const dow = new Date(`${date}T12:00:00`).getDay();
  const same = history.filter((h) => new Date(`${h.date}T12:00:00`).getDay() === dow).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (same && (OCCASION_IDS as string[]).includes(same.occasion)) return same.occasion as Occasion;
  return dow === 0 || dow === 6 ? "casual" : "office";
}

export type PlanItemView = { id: string; name: string; subcategory: string | null; url: string | null; colors: Array<{ name: string; hex?: string }> };
export type PlanDayView = {
  date: string;
  weather: WeatherSummary;
  occasion: Occasion;
  planned: boolean;
  worn: boolean;
  outfit: { id: string; name: string; headline: string | null; overall: string | null; items: PlanItemView[] } | null;
};
export type WeekView = { today: string; days: PlanDayView[]; closetSize: number; place: string | null };

export type WeekState = {
  ctx: StyleContext;
  closet: ClosetPiece[];
  dates: string[];
  weather: WeatherSummary[];
  plans: Map<string, { id: string; occasion: string; outfit_id: string | null; worn: boolean }>;
  outfits: Map<string, { id: string; item_ids: string[]; name: string | null; composition: { headline?: string; overall?: string } | null }>;
  history: Array<{ date: string; occasion: string }>;
  today: string;
};

/** Everything needed to show or change the next seven days. */
export async function loadWeekState(supabase: SupabaseClient, userId: string): Promise<WeekState> {
  const ctx = await loadStyleContext(supabase, userId);
  const { lat, lon, tz } = await homeCoords(supabase, userId, ctx);
  const today = localDate(tz);
  const dates = Array.from({ length: 7 }, (_, i) => localDate(tz, i));
  const back = localDate(tz, -42);
  const [closet, weather, { data: planRows }] = await Promise.all([
    loadCloset(supabase, userId),
    forecastDays(lat, lon, dates, ctx.location),
    supabase.from("plans").select("id, date, occasion, outfit_id, worn").eq("user_id", userId).gte("date", back).lte("date", dates[6]),
  ]);
  const plans = new Map<string, { id: string; occasion: string; outfit_id: string | null; worn: boolean }>();
  const history: Array<{ date: string; occasion: string }> = [];
  for (const p of planRows ?? []) {
    const row = { id: p.id as string, occasion: p.occasion as string, outfit_id: (p.outfit_id as string | null) ?? null, worn: !!p.worn };
    if ((p.date as string) >= today) plans.set(p.date as string, row);
    history.push({ date: p.date as string, occasion: p.occasion as string });
  }
  const outfitIds = [...plans.values()].map((p) => p.outfit_id).filter((x): x is string => !!x);
  const { data: outfitRows } = outfitIds.length ? await supabase.from("outfits").select("id, item_ids, name, composition").in("id", outfitIds) : { data: [] };
  const outfits = new Map((outfitRows ?? []).map((o) => [o.id as string, { id: o.id as string, item_ids: (o.item_ids as string[]) ?? [], name: (o.name as string | null) ?? null, composition: (o.composition as { headline?: string; overall?: string } | null) ?? null }]));
  return { ctx, closet, dates, weather, plans, outfits, history, today };
}

export async function weekView(supabase: SupabaseClient, s: WeekState): Promise<WeekView> {
  const byId = new Map(s.closet.map((p) => [p.id, p]));
  const urls = await signedImageUrls(supabase, s.closet.map((p) => (p as ClosetPiece & { imagePath?: string | null }).imagePath ?? null));
  const days: PlanDayView[] = s.dates.map((date, i) => {
    const plan = s.plans.get(date);
    const o = plan?.outfit_id ? s.outfits.get(plan.outfit_id) : undefined;
    return {
      date,
      weather: s.weather[i],
      occasion: ((plan?.occasion as Occasion | undefined) ?? defaultOccasion(date, s.history)) as Occasion,
      planned: !!plan,
      worn: !!plan?.worn,
      outfit: o
        ? {
            id: o.id,
            name: o.name ?? "Outfit",
            headline: o.composition?.headline ? cleanHeadline(o.composition.headline) : null,
            overall: o.composition?.overall ?? null,
            items: o.item_ids
              .map((id) => byId.get(id))
              .filter((p): p is ClosetPiece => !!p)
              .map((p) => {
                const path = (p as ClosetPiece & { imagePath?: string | null }).imagePath ?? null;
                return { id: p.id, name: p.name ?? p.subcategory ?? "Piece", subcategory: p.subcategory, url: path ? urls[path] ?? null : null, colors: p.colors };
              }),
          }
        : null,
    };
  });
  return { today: s.today, days, closetSize: s.closet.length, place: s.ctx.location };
}

/** Save a candidate as a planner outfit and point the day's plan at it. Removes the outfit it replaces. */
export async function savePlanDay(supabase: SupabaseClient, userId: string, s: WeekState, date: string, occasion: Occasion, c: Candidate | null): Promise<void> {
  const prior = s.plans.get(date);
  let outfitId: string | null = null;
  if (c) {
    const occ = OCCASIONS.find((o) => o.id === occasion);
    const { data: o } = await supabase
      .from("outfits")
      .insert({
        user_id: userId,
        item_ids: c.items.map((i) => i.id),
        occasion: `Plan · ${occ?.label ?? occasion}`,
        source: "generated",
        origin: "plan",
        name: outfitName(c.items).slice(0, 120),
        composition: c.composition,
        composition_notes: c.composition.headline,
      })
      .select("id, item_ids, name, composition")
      .single();
    outfitId = (o?.id as string) ?? null;
    if (o) s.outfits.set(outfitId!, { id: outfitId!, item_ids: c.items.map((i) => i.id), name: o.name as string, composition: c.composition });
  }
  const w = s.weather[s.dates.indexOf(date)];
  const { data: row } = await supabase
    .from("plans")
    .upsert({ user_id: userId, date, occasion, outfit_id: outfitId, weather: w ?? null, worn: false, updated_at: new Date().toISOString() }, { onConflict: "user_id,date" })
    .select("id")
    .single();
  s.plans.set(date, { id: (row?.id as string) ?? prior?.id ?? "", occasion, outfit_id: outfitId, worn: false });
  if (prior?.outfit_id && prior.outfit_id !== outfitId) await removePlanOutfit(supabase, userId, prior.outfit_id);
}

/** Drop a planner outfit nobody else points at (not shared for votes). */
export async function removePlanOutfit(supabase: SupabaseClient, userId: string, outfitId: string): Promise<void> {
  const { count } = await supabase.from("second_opinions").select("id", { count: "exact", head: true }).eq("outfit_id", outfitId);
  if (count) return;
  await supabase.from("outfits").delete().eq("id", outfitId).eq("user_id", userId).eq("origin", "plan");
}

/** Fill open days (or every unworn day with `replan`), spreading pieces across the week. */
export async function fillWeek(supabase: SupabaseClient, userId: string, s: WeekState, opts: { replan?: boolean; only?: string[] } = {}): Promise<number> {
  const open = s.dates.map((d) => {
    if (opts.only) return opts.only.includes(d);
    const p = s.plans.get(d);
    return !p || (!p.outfit_id && !p.worn) || (!!opts.replan && !p.worn);
  });
  const occasions = s.dates.map((d) => ((s.plans.get(d)?.occasion as Occasion | undefined) ?? defaultOccasion(d, s.history)) as Occasion);
  const fixed = s.dates.map((d, i) => {
    if (open[i]) return null;
    const p = s.plans.get(d);
    const o = p?.outfit_id ? s.outfits.get(p.outfit_id) : undefined;
    return o?.item_ids ?? [];
  });
  const days = s.dates.map((d, i) => (open[i] ? dayCandidates(s.closet, s.weather[i], occasions[i], s.ctx) : []));
  const picks = planSequence(days, { fixed });
  let filled = 0;
  for (let i = 0; i < s.dates.length; i++) {
    if (!open[i]) continue;
    const c = picks[i] >= 0 ? days[i][picks[i]] : null;
    await savePlanDay(supabase, userId, s, s.dates[i], occasions[i], c);
    if (c) filled++;
  }
  return filled;
}
