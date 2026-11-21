import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signedImageUrls } from "@/lib/closet/images";
import { loadStyleContext } from "@/lib/profile/context";
import { loadCloset } from "@/lib/today/recommend";
import type { ClosetPiece, Occasion } from "@/lib/today/candidates";
import { geocode, localDate, statedWeather, type WeatherSummary } from "@/lib/today/weather";
import { dayCandidates, forecastDays, homeCoords, typicalDays } from "./server";
import { daysBetween, packingList, planSequence, ROLE_LABEL, tripExtras, tripLooks, type Role, type TripOptions } from "./sequence";

export type StoredLook = { key: string; date: string; occasion: Occasion; label: string; item_ids: string[]; weather: WeatherSummary | null };

export type TripInput = { name: string | null; destination: string; start: string; end: string; options: TripOptions };

async function tripWeather(lat: number | null, lon: number | null, dates: string[], today: string, place: string): Promise<{ source: string; days: WeatherSummary[] }> {
  const horizon = localDate(null, 15);
  if (lat != null && lon != null) {
    if (dates[dates.length - 1] <= horizon && dates[0] >= today) {
      const days = await forecastDays(lat, lon, dates, place);
      if (days.some((d) => d.source === "forecast")) return { source: "forecast", days };
    }
    const typical = await typicalDays(lat, lon, dates, place);
    if (typical) return { source: "typical", days: typical };
  }
  return { source: "default", days: dates.map((d) => statedWeather(d, null, ["morning", "midday", "evening"], place)) };
}

function chooseLooks(closet: ClosetPiece[], looks: ReturnType<typeof tripLooks>, weatherByDate: Map<string, WeatherSummary>, ctx: Awaited<ReturnType<typeof loadStyleContext>>, fixed?: Array<string[] | null>, exclude?: Map<number, string[]>) {
  const cands = looks.map((l, i) => (fixed?.[i] ? [] : dayCandidates(closet, weatherByDate.get(l.date)!, l.occasion, ctx, exclude?.get(i) ?? [])));
  const picks = planSequence(cands, { capsule: true, fixed, maxStatementRepeats: looks.length > 8 ? 2 : 1 });
  return looks.map((l, i) => (fixed?.[i] ? fixed[i]! : picks[i] >= 0 ? cands[i][picks[i]].items.map((p) => p.id) : []));
}

/** Plan a trip: weather for each day, a look for each slot, and the extras worth packing. */
export async function createTrip(supabase: SupabaseClient, userId: string, input: TripInput): Promise<{ id?: string; error?: string }> {
  const ctx = await loadStyleContext(supabase, userId);
  const { tz } = await homeCoords(supabase, userId, ctx);
  const today = localDate(tz);
  const dates = daysBetween(input.start, input.end);
  if (!dates.length || dates.length > 14) return { error: "Trips can be up to 14 days." };
  const geo = await geocode(input.destination);
  const { source, days } = await tripWeather(geo?.latitude ?? null, geo?.longitude ?? null, dates, today, input.destination);
  const weatherByDate = new Map(days.map((w) => [w.date, w]));
  const closet = await loadCloset(supabase, userId);
  const slots = tripLooks(input.start, input.end, input.options);
  const chosen = chooseLooks(closet, slots, weatherByDate, ctx);
  const looks: StoredLook[] = slots.map((l, i) => ({ ...l, item_ids: chosen[i], weather: weatherByDate.get(l.date) ?? null }));
  const extras = tripExtras(dates.length - 1, days).map((label) => ({ label }));

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: userId,
      name: input.name,
      destination: input.destination,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      start_date: input.start,
      end_date: input.end,
      options: input.options,
      weather_source: source,
      looks,
      extras,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Could not save the trip." };
  return { id: data.id as string };
}

/** Try a different look for one slot, keeping the rest of the trip as is. */
export async function swapTripLook(supabase: SupabaseClient, userId: string, tripId: string, key: string): Promise<{ error?: string }> {
  const { data: t } = await supabase.from("trips").select("looks").eq("id", tripId).eq("user_id", userId).maybeSingle();
  if (!t) return { error: "Trip not found." };
  const looks = (t.looks as StoredLook[]) ?? [];
  const i = looks.findIndex((l) => l.key === key);
  if (i < 0) return { error: "Look not found." };
  const [ctx, closet] = await Promise.all([loadStyleContext(supabase, userId), loadCloset(supabase, userId)]);
  const weatherByDate = new Map(looks.map((l) => [l.date, l.weather ?? statedWeather(l.date, null, ["morning", "midday", "evening"], null)]));
  const fixed = looks.map((l, k) => (k === i ? null : l.item_ids));
  const next = chooseLooks(closet, looks, weatherByDate, ctx, fixed, new Map([[i, looks[i].item_ids]]));
  if (!next[i].length) return { error: "That's the only look your closet makes for this one." };
  looks[i] = { ...looks[i], item_ids: next[i] };
  await supabase.from("trips").update({ looks }).eq("id", tripId).eq("user_id", userId);
  return {};
}

export type TripPiece = { id: string; name: string; subcategory: string | null; url: string | null; hex: string | null };
export type TripView = {
  id: string;
  title: string;
  destination: string;
  start: string;
  end: string;
  weatherSource: string | null;
  looks: Array<StoredLook & { pieces: TripPiece[] }>;
  packing: Array<{ role: Role; label: string; items: Array<TripPiece & { looks: number }> }>;
  extras: string[];
  packed: string[];
};

export async function loadTrip(supabase: SupabaseClient, userId: string, tripId: string): Promise<TripView | null> {
  const { data: t } = await supabase.from("trips").select("*").eq("id", tripId).eq("user_id", userId).maybeSingle();
  if (!t) return null;
  const looks = (t.looks as StoredLook[]) ?? [];
  const ids = [...new Set(looks.flatMap((l) => l.item_ids))];
  const { data: rows } = ids.length ? await supabase.from("closet_items").select("id, name, category, subcategory, colors, image_path").in("id", ids) : { data: [] };
  const urls = await signedImageUrls(supabase, (rows ?? []).map((r) => r.image_path as string | null));
  const byId = new Map(
    (rows ?? []).map((r) => [
      r.id as string,
      {
        id: r.id as string,
        name: ((r.name as string | null) ?? (r.subcategory as string | null) ?? "Piece") as string,
        subcategory: (r.subcategory as string | null) ?? null,
        category: (r.category as string | null) ?? null,
        url: r.image_path ? urls[r.image_path as string] ?? null : null,
        hex: (Array.isArray(r.colors) ? (r.colors as Array<{ hex?: string }>)[0]?.hex : null) ?? null,
      },
    ])
  );
  const list = packingList(looks, byId);
  const groups = new Map<Role, Array<TripPiece & { looks: number }>>();
  for (const e of list) {
    const p = byId.get(e.id)!;
    const arr = groups.get(e.role) ?? [];
    arr.push({ id: p.id, name: p.name, subcategory: p.subcategory, url: p.url, hex: p.hex, looks: e.looks });
    groups.set(e.role, arr);
  }
  return {
    id: t.id as string,
    title: ((t.name as string | null) ?? (t.destination as string)) as string,
    destination: t.destination as string,
    start: t.start_date as string,
    end: t.end_date as string,
    weatherSource: (t.weather_source as string | null) ?? null,
    looks: looks.map((l) => ({ ...l, pieces: l.item_ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p) })),
    packing: [...groups.entries()].map(([role, items]) => ({ role, label: ROLE_LABEL[role], items })),
    extras: ((t.extras as Array<{ label: string }>) ?? []).map((e) => e.label),
    packed: (t.packed as string[]) ?? [],
  };
}
