// Candidate outfits for a day: filter the closet by availability, season, warmth and
// formality, assemble outfits from templates, keep the ones the composition check
// accepts, rank and diversify. Pure; imports with .ts so plain Node can run the tests.

import { checkOutfit, type Composition, type OutfitItem } from "../outfit/composition.ts";
import type { ScoreColorProfile, ScoreStyle } from "../scorecard/rules.ts";

export type ClosetPiece = OutfitItem & {
  status?: string | null;
  seasons?: string[];
  lastWorn?: string | null; // YYYY-MM-DD
  affinity?: number;
};

export type Occasion = "office" | "casual" | "dinner" | "event" | "active" | "travel";
export const OCCASIONS: Array<{ id: Occasion; label: string; band: [number, number] }> = [
  { id: "office", label: "Office", band: [3, 4] },
  { id: "casual", label: "Casual", band: [1, 3] },
  { id: "dinner", label: "Dinner out", band: [3, 4] },
  { id: "event", label: "Event", band: [4, 5] },
  { id: "active", label: "Golf or active", band: [1, 3] },
  { id: "travel", label: "Travel", band: [1, 3] },
];

export type DayConditions = {
  /** Feels-like range over the hours spent outside, in °F. */
  feelsMin: number;
  feelsMax: number;
  season: "spring" | "summer" | "fall" | "winter";
  indoorCold?: boolean;
  rainLikely?: boolean;
};

export type Constraints = {
  occasion: Occasion;
  /** Override the occasion's formality band. */
  band?: [number, number];
  /** Leave out pieces whose category or subcategory matches any of these words (e.g. "dress"). */
  exclude?: string[];
  /** Ids of pieces that must appear in every candidate. */
  mustInclude?: string[];
  today?: string; // YYYY-MM-DD, for recency
};

export type Candidate = {
  items: ClosetPiece[];
  composition: Composition;
  score: number;
  layered: boolean;
};

export type CandidateResult = { candidates: Candidate[]; missing: string[]; considered: number };

/** Target warmth (1 hot weather ... 5 cold) for a feels-like temperature. */
export function targetWarmth(feelsF: number): number {
  if (feelsF >= 88) return 1;
  if (feelsF >= 76) return 2;
  if (feelsF >= 62) return 3;
  if (feelsF >= 48) return 4;
  return 5;
}

export function seasonFor(date: Date): DayConditions["season"] {
  const m = date.getMonth();
  return m <= 1 || m === 11 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "fall";
}

const word = (s: string | null | undefined) => (s ?? "").toLowerCase();
/** "dresses" -> "dress", "jeans" stays "jeans", "shorts" stays "shorts", "shirts" -> "shirt". */
export function singular(s: string): string {
  const w = s.toLowerCase().trim();
  if (/^(jeans|shorts|pants|trousers|leggings|joggers|chinos|sweatpants|trunks|sunglasses|glasses|briefs|boxers)$/.test(w)) return w;
  if (/(ss|sh|ch|x)es$/.test(w)) return w.slice(0, -2);
  if (/ss$/.test(w)) return w;
  if (/s$/.test(w)) return w.slice(0, -1);
  return w;
}
const head = (s: string | null | undefined) => singular((s ?? "").trim().split(/\s+/).pop() ?? "");
const isLayer = (p: ClosetPiece) =>
  ["outerwear", "layer"].includes(word(p.category)) ||
  /hoodie|sweatshirt|quarter-zip|cardigan|overshirt|jacket|blazer|coat|vest/.test(word(p.subcategory)) && word(p.category) !== "bottom";
const isTop = (p: ClosetPiece) => word(p.category) === "top" && !isLayer(p) || (word(p.category) === "activewear" && /polo|top|tee|tank/.test(word(p.subcategory)));
const isBottom = (p: ClosetPiece) => word(p.category) === "bottom" || (word(p.category) === "activewear" && /short|legging|pant|jogger/.test(word(p.subcategory)));
const isDress = (p: ClosetPiece) => word(p.category) === "dress";
const isShoe = (p: ClosetPiece) => word(p.category) === "shoes";

function daysSince(date: string | null | undefined, today: string): number {
  if (!date) return 60;
  const ms = Date.parse(today) - Date.parse(date);
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 86400000)) : 60;
}

/** Can this piece be worn today? Unknown warmth or formality is allowed through. */
export function wearable(p: ClosetPiece, day: DayConditions, band: [number, number], role: "core" | "layer"): boolean {
  if (p.status && p.status !== "available") return false;
  if (p.verdict === "cut") return false;
  if (p.seasons && p.seasons.length && !p.seasons.includes("all") && !p.seasons.includes(day.season)) return false;
  if (p.formality != null && (p.formality < band[0] - (role === "layer" ? 1 : 0) || p.formality > band[1] + (isShoe(p) ? 1 : 0))) return false;
  if (p.warmth != null && role === "core") {
    // Core pieces suit the warmest hours; a layer covers the cool ones.
    const t = targetWarmth(day.feelsMax);
    if (Math.abs(p.warmth - t) > 1) return false;
  }
  return true;
}

function needsLayer(day: DayConditions): boolean {
  return day.feelsMin < 62 || !!day.indoorCold || day.feelsMax - day.feelsMin >= 20;
}

const OVERALL_POINTS: Record<Composition["overall"], number> = { strong: 3, workable: 2, rework: 0, incomplete: 0 };

function rankOne(items: ClosetPiece[], comp: Composition, band: [number, number], today: string): number {
  const mid = (band[0] + band[1]) / 2;
  let s = OVERALL_POINTS[comp.overall] * 10;
  for (const p of items) {
    s += (p.affinity ?? 0) * 2;
    s += Math.min(daysSince(p.lastWorn, today), 21) / 7; // up to +3 for pieces not worn lately
    if (p.formality != null) s -= Math.abs(p.formality - mid) * 0.5;
    if (p.verdict === "keep") s += 1;
  }
  return s;
}

/** Top `n` pieces by affinity then recency, so the combination count stays bounded. */
function shortlist(xs: ClosetPiece[], n: number, today: string): ClosetPiece[] {
  return [...xs]
    .sort((a, b) => (b.affinity ?? 0) - (a.affinity ?? 0) || daysSince(b.lastWorn, today) - daysSince(a.lastWorn, today))
    .slice(0, n);
}

export function buildCandidates(
  closet: ClosetPiece[],
  day: DayConditions,
  cons: Constraints,
  palette: ScoreColorProfile,
  style: ScoreStyle,
  opts: { limit?: number; perRole?: number; countOnly?: boolean } = {}
): CandidateResult {
  const today = cons.today ?? new Date().toISOString().slice(0, 10);
  const band = cons.band ?? OCCASIONS.find((o) => o.id === cons.occasion)?.band ?? [1, 5];
  const banned = (cons.exclude ?? []).map(singular).filter(Boolean);
  // Match the garment's head noun, so excluding "dress" drops a midi dress but keeps a dress shirt.
  const allowed = closet.filter((p) => !banned.some((w) => singular(p.category ?? "") === w || head(p.subcategory) === w || head(p.name) === w));
  const must = new Set(cons.mustInclude ?? []);
  const per = opts.perRole ?? 8;

  const pick = (pred: (p: ClosetPiece) => boolean, role: "core" | "layer") => {
    const all = allowed.filter((p) => pred(p) && wearable(p, day, band, role));
    const forced = all.filter((p) => must.has(p.id));
    return [...forced, ...shortlist(all.filter((p) => !must.has(p.id)), per - forced.length, today)];
  };
  const tops = pick(isTop, "core");
  const bottoms = pick(isBottom, "core");
  const dresses = pick(isDress, "core");
  const shoes = pick(isShoe, "core");
  const layers = pick(isLayer, "layer");

  const missing: string[] = [];
  if (!dresses.length && (!tops.length || !bottoms.length)) {
    if (!tops.length) missing.push(`a top for ${Math.round(day.feelsMax)}°F at this dress level`);
    if (!bottoms.length) missing.push(`bottoms for ${Math.round(day.feelsMax)}°F at this dress level`);
  }
  if (!shoes.length) missing.push("shoes that suit this occasion");
  const layer = needsLayer(day);
  if (layer && !layers.length) missing.push(day.indoorCold ? "a light layer for cold indoor air" : "a layer for the cooler hours");

  const bases: ClosetPiece[][] = [];
  for (const t of tops) for (const b of bottoms) bases.push([t, b]);
  for (const d of dresses) bases.push([d]);
  const shoeOpts: Array<ClosetPiece | null> = shoes.length ? shoes : [null];
  const layerOpts: Array<ClosetPiece | null> = layer && layers.length ? layers.slice(0, 4) : [null];

  const out: Candidate[] = [];
  let considered = 0;
  for (const base of bases) {
    for (const sh of shoeOpts) {
      for (const ly of layerOpts) {
        const items = [...base, ...(sh ? [sh] : []), ...(ly ? [ly] : [])];
        if (must.size && ![...must].every((id) => items.some((i) => i.id === id))) continue;
        considered++;
        if (considered > 4000) break;
        const comp = checkOutfit(items, palette, style);
        if (comp.overall === "rework" || (comp.overall === "incomplete" && shoes.length)) continue;
        out.push({ items, composition: comp, score: rankOne(items, comp, band, today), layered: !!ly });
      }
    }
  }
  if (opts.countOnly) return { candidates: out, missing, considered };

  // Diversify: best first, then at most two candidates per top or dress.
  out.sort((a, b) => b.score - a.score);
  const limit = opts.limit ?? 12;
  const used = new Map<string, number>();
  const picked: Candidate[] = [];
  for (const c of out) {
    const key = c.items[0].id;
    if ((used.get(key) ?? 0) >= 2) continue;
    used.set(key, (used.get(key) ?? 0) + 1);
    picked.push(c);
    if (picked.length >= limit) break;
  }
  return { candidates: picked, missing, considered };
}
