import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AiError, MODELS, aiAvailable, structured } from "@/lib/ai/claude";
import { describeStyle, loadStyleContext } from "@/lib/profile/context";
import { signedImageUrls } from "@/lib/closet/images";
import { buildCandidates, OCCASIONS, outfitName, seasonFor, type Candidate, type ClosetPiece, type Occasion } from "./candidates";
import { forecast, geocode, localDate, statedWeather, summarize, type HourWindow, type WeatherSummary } from "./weather";
import { cleanHeadline } from "@/lib/verdict";

const list = (xs: unknown): string[] => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string") : []);

/** Where the browser says the person is (already rounded on the device). */
export const HereSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).nullish();

export type RecommendInput = {
  kind: "today" | "ask";
  occasion: Occasion;
  hours: HourWindow[];
  indoorCold: boolean;
  dayOffset?: number;
  here?: { latitude: number; longitude: number } | null;
  tempOverride?: number | null;
  band?: [number, number];
  exclude?: string[];
  mustInclude?: string[];
  prompt?: string | null;
  extraContext?: string | null;
};

export type PickView = {
  outfitId: string;
  name: string;
  why: string;
  headline: string;
  overall: string;
  items: Array<{ id: string; name: string; category: string | null; subcategory: string | null; url: string | null; colors: Array<{ name: string; hex?: string }> }>;
};

export type RecommendationView = {
  id: string;
  kind: "today" | "ask";
  occasion: string | null;
  prompt: string | null;
  createdAt: string;
  weather: WeatherSummary | null;
  missing: string[];
  relaxed: boolean;
  closetSize: number;
  note: string | null;
  chosenOutfitId: string | null;
  picks: PickView[];
};

const PickSchema = z.object({
  picks: z
    .array(z.object({ index: z.number().int().describe("Candidate number from the list."), name: z.string().describe("Two to four words naming the look, e.g. 'Polished steakhouse night' or 'Easy golf morning'. No piece names."), why: z.string().describe("One short sentence: why this works today, naming a piece.") }))
    .describe("Up to three different candidates, best first."),
  note: z.string().nullable().describe("One short sentence if something about the day or the closet is worth flagging, else null."),
});

/** Load closet pieces with their latest verdicts, ready for the candidate engine. */
export async function loadCloset(supabase: SupabaseClient, userId: string): Promise<ClosetPiece[]> {
  const [{ data: rows }, { data: cards }] = await Promise.all([
    supabase.from("closet_items").select("*").eq("user_id", userId).neq("status", "gone"),
    supabase.from("scorecards").select("item_id, verdict").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  const verdicts = new Map<string, "keep" | "cut" | "provisional">();
  for (const c of cards ?? []) if (!verdicts.has(c.item_id as string)) verdicts.set(c.item_id as string, c.verdict as "keep" | "cut" | "provisional");
  return (rows ?? []).map((r) => ({
    id: r.id as string,
    name: (r.name as string | null) ?? null,
    subcategory: (r.subcategory as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    colors: Array.isArray(r.colors) ? (r.colors as ClosetPiece["colors"]) : [],
    pattern: (r.pattern as string | null) ?? null,
    material: (r.material as string | null) ?? null,
    construction: list(r.construction),
    formality: (r.formality as number | null) ?? null,
    warmth: (r.warmth as number | null) ?? null,
    verdict: verdicts.get(r.id as string) ?? null,
    status: (r.status as string | null) ?? null,
    seasons: list(r.seasons),
    lastWorn: (r.last_worn as string | null) ?? null,
    affinity: Number(r.affinity ?? 0),
    imagePath: (r.image_path as string | null) ?? null,
  })) as ClosetPiece[];
}

async function weatherFor(supabase: SupabaseClient, userId: string, ctx: Awaited<ReturnType<typeof loadStyleContext>>, input: RecommendInput) {
  if (input.here && input.tempOverride == null) {
    const h = await forecast(input.here.latitude, input.here.longitude);
    // The forecast runs in the place's own time from local midnight, 24 hours a day, so its dates are that place's dates.
    const date = h?.time[(input.dayOffset ?? 0) * 24]?.slice(0, 10);
    const s = h && date ? summarize(h, date, input.hours, "your location") : null;
    if (s) return s;
  }
  let { latitude, longitude } = ctx;
  let timezone: string | null = null;
  const { data: prof } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle();
  timezone = (prof?.timezone as string | null) ?? null;
  if ((latitude == null || longitude == null) && ctx.location) {
    const g = await geocode(ctx.location);
    if (g) {
      latitude = g.latitude;
      longitude = g.longitude;
      timezone = g.timezone;
      await supabase.from("profiles").update({ latitude, longitude, timezone }).eq("id", userId);
    }
  }
  const date = localDate(timezone, input.dayOffset ?? 0);
  if (input.tempOverride != null) return statedWeather(date, input.tempOverride, input.hours, ctx.location);
  if (latitude != null && longitude != null) {
    const h = await forecast(latitude, longitude);
    const s = h ? summarize(h, date, input.hours, ctx.location) : null;
    if (s) return s;
  }
  return statedWeather(date, null, input.hours, ctx.location);
}

function describeCandidate(c: Candidate, i: number): string {
  const parts = c.items.map((p) => `${p.name ?? p.subcategory ?? "piece"} (${[p.subcategory, p.colors.map((x) => x.name).join("/"), p.formality ? `formality ${p.formality}` : ""].filter(Boolean).join(", ")})`);
  return `[${i}] ${parts.join(" + ")}. Check: ${c.composition.headline}`;
}

/** Build, pick and save a recommendation. Returns its id. */
export async function recommend(supabase: SupabaseClient, userId: string, input: RecommendInput): Promise<string> {
  const ctx = await loadStyleContext(supabase, userId);
  const weather = await weatherFor(supabase, userId, ctx, input);
  const closet = await loadCloset(supabase, userId);
  const occ = OCCASIONS.find((o) => o.id === input.occasion) ?? OCCASIONS[1];

  // A stated or assumed temperature is not a forecast: don't let it overwrite the saved day.
  const { data: day } = weather.source !== "forecast" ? { data: null } : await supabase
    .from("day_profiles")
    .upsert(
      {
        user_id: userId,
        date: weather.date,
        weather,
        uv_index: weather.uvMax,
        indoor_cold_flag: input.indoorCold,
        formality_band: `${(input.band ?? occ.band)[0]}-${(input.band ?? occ.band)[1]}`,
      },
      { onConflict: "user_id,date" }
    )
    .select("id")
    .single();

  const result = buildCandidates(
    closet,
    {
      feelsMin: weather.feelsMin,
      feelsMax: weather.feelsMax,
      season: seasonFor(new Date(`${weather.date}T12:00:00`)),
      indoorCold: input.indoorCold,
      rainLikely: weather.rainMax >= 50,
    },
    { occasion: input.occasion, band: input.band, exclude: input.exclude, mustInclude: input.mustInclude, today: weather.date },
    ctx.scoreColor,
    ctx.scoreStyle
  );

  let picks: Array<{ c: Candidate; why: string; name?: string }> = [];
  let note: string | null = null;
  if (result.candidates.length) {
    if (aiAvailable()) {
      try {
        const answer = await structured({
          schema: PickSchema,
          model: MODELS.fast,
          maxTokens: 1500,
          system: `You are ${ctx.name}'s personal stylist choosing what to wear from outfits their own closet already makes. The candidates passed a composition check in code. Pick the three best and most different, and write one short, concrete line each. Never invent pieces.\n\n${describeStyle(ctx)}`,
          text: [
            input.prompt ? `Their request: "${input.prompt}"` : `Occasion: ${occ.label}.`,
            `Weather for the hours outside (${weather.hours.join(", ")}): feels like ${weather.feelsMin} to ${weather.feelsMax}°F, rain chance ${weather.rainMax}%, UV ${weather.uvMax}${input.indoorCold ? ", and indoor air will be cold" : ""}.${weather.source === "default" ? " (No forecast; assume a mild day.)" : ""}`,
            input.extraContext ?? "",
            result.relaxed ? "Nothing in the closet fully fits the day, so these are the closest options. Say plainly what is off (too casual, too light) in the line." : "",
            "Candidates:",
            ...result.candidates.map(describeCandidate),
          ]
            .filter(Boolean)
            .join("\n"),
        });
        const seen = new Set<number>();
        for (const p of answer.picks) {
          if (p.index < 0 || p.index >= result.candidates.length || seen.has(p.index)) continue;
          seen.add(p.index);
          picks.push({ c: result.candidates[p.index], why: p.why, name: p.name.trim().slice(0, 60) || undefined });
          if (picks.length === 3) break;
        }
        note = answer.note;
      } catch (e) {
        if (!(e instanceof AiError)) throw e;
      }
    }
    if (!picks.length) picks = result.candidates.slice(0, 3).map((c) => ({ c, why: c.composition.headline }));
  }

  const outfitIds: string[] = [];
  for (const p of picks) {
    const name = p.name ?? outfitName(p.c.items);
    const { data: o } = await supabase
      .from("outfits")
      .insert({
        user_id: userId,
        item_ids: p.c.items.map((i) => i.id),
        occasion: input.prompt ? input.prompt.slice(0, 120) : occ.label,
        source: "generated",
        name: name.slice(0, 120),
        composition: p.c.composition,
        composition_notes: p.why,
      })
      .select("id")
      .single();
    outfitIds.push((o?.id as string) ?? "");
  }

  const { data: rec, error } = await supabase
    .from("recommendations")
    .insert({
      user_id: userId,
      day_profile_id: day?.id ?? null,
      kind: input.kind,
      occasion: occ.id,
      prompt: input.prompt ?? null,
      constraints: { hours: input.hours, indoorCold: input.indoorCold, band: input.band ?? occ.band, exclude: input.exclude ?? [], missing: result.missing, relaxed: !!result.relaxed, closetSize: closet.length, note, weather },
      candidates: picks.map((p, i) => ({
        outfit_id: outfitIds[i],
        item_ids: p.c.items.map((x) => x.id),
        score: Math.round(p.c.score * 10) / 10,
        overall: p.c.composition.overall,
        headline: p.c.composition.headline,
        why: p.why,
      })),
    })
    .select("id")
    .single();
  if (error || !rec) throw new Error(error?.message ?? "Could not save the recommendation");
  return rec.id as string;
}

/** Read a saved recommendation back with item names and photo links. */
export async function loadRecommendation(supabase: SupabaseClient, userId: string, id: string): Promise<RecommendationView | null> {
  const { data: rec } = await supabase.from("recommendations").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!rec) return null;
  const cands = (Array.isArray(rec.candidates) ? rec.candidates : []) as Array<{ outfit_id: string; item_ids: string[]; overall: string; headline: string; why: string }>;
  const ids = [...new Set(cands.flatMap((c) => c.item_ids ?? []))];
  const { data: rows } = ids.length
    ? await supabase.from("closet_items").select("id, name, category, subcategory, colors, image_path").in("id", ids)
    : { data: [] as Array<Record<string, unknown>> };
  const byId = new Map((rows ?? []).map((r) => [r.id as string, r]));
  const urls = await signedImageUrls(supabase, (rows ?? []).map((r) => r.image_path as string | null));
  const cons = (rec.constraints ?? {}) as { missing?: string[]; relaxed?: boolean; closetSize?: number; note?: string | null; weather?: WeatherSummary };
  const { data: outfits } = cands.length ? await supabase.from("outfits").select("id, name").in("id", cands.map((c) => c.outfit_id)) : { data: [] as Array<Record<string, unknown>> };
  const names = new Map((outfits ?? []).map((o) => [o.id as string, (o.name as string) ?? "Outfit"]));
  return {
    id: rec.id as string,
    kind: (rec.kind as "today" | "ask") ?? "today",
    occasion: (rec.occasion as string | null) ?? null,
    prompt: (rec.prompt as string | null) ?? null,
    createdAt: rec.created_at as string,
    weather: cons.weather ?? null,
    missing: cons.missing ?? [],
    relaxed: !!cons.relaxed,
    closetSize: cons.closetSize ?? 99,
    note: cons.note ?? null,
    chosenOutfitId: (rec.chosen_outfit_id as string | null) ?? null,
    picks: cands.map((c) => ({
      outfitId: c.outfit_id,
      name: names.get(c.outfit_id) ?? "Outfit",
      why: c.why,
      headline: cleanHeadline(c.headline),
      overall: c.overall,
      items: (c.item_ids ?? [])
        .map((iid) => byId.get(iid))
        .filter((r): r is Record<string, unknown> => !!r)
        .map((r) => ({
          id: r.id as string,
          name: (r.name as string) ?? "Piece",
          category: (r.category as string | null) ?? null,
          subcategory: (r.subcategory as string | null) ?? null,
          url: r.image_path ? urls[r.image_path as string] ?? null : null,
          colors: Array.isArray(r.colors) ? (r.colors as Array<{ name: string; hex?: string }>) : [],
        })),
    })),
  };
}
