// Planning several days at once: pick one candidate outfit per day so tops don't repeat,
// nothing is worn two days running, and (for trips) pieces get reused so the bag stays small.
// Pure; imports with .ts so plain Node can run the tests.

import { isBottom, isDress, isLayer, isShoe, isTop, type Candidate, type ClosetPiece, type Occasion } from "../today/candidates.ts";

export type Role = "top" | "bottom" | "dress" | "layer" | "shoes" | "other";
export const ROLE_ORDER: Role[] = ["top", "dress", "bottom", "layer", "shoes", "other"];
export const ROLE_LABEL: Record<Role, string> = { top: "Tops", dress: "Dresses", bottom: "Bottoms", layer: "Layers", shoes: "Shoes", other: "Other" };

export function roleOf(p: Pick<ClosetPiece, "category" | "subcategory">): Role {
  const x = p as ClosetPiece;
  if (isLayer(x)) return "layer";
  if (isTop(x)) return "top";
  if (isBottom(x)) return "bottom";
  if (isDress(x)) return "dress";
  if (isShoe(x)) return "shoes";
  return "other";
}

/** Tops and dresses are what people notice; they should not repeat often. */
const isStatement = (p: ClosetPiece) => isTop(p) || isDress(p);

/** Pieces that eat suitcase space: coats, heavy knits, boots. */
export const isBulky = (p: Pick<ClosetPiece, "category" | "subcategory" | "warmth">) =>
  /coat|parka|puffer|boot|shearling|down/.test((p.subcategory ?? "").toLowerCase()) || (isLayer(p as ClosetPiece) && (p.warmth ?? 0) >= 4);

/** Most trips need no more than this many pairs of shoes. */
export const MAX_TRIP_SHOES = 3;

export type SequenceOptions = {
  /** Trips: reward reusing bottoms, shoes and layers already in the bag. */
  capsule?: boolean;
  /** Item ids already planned for a day (kept as is); null when the day is open. */
  fixed?: Array<string[] | null>;
  /** How many times one top or dress may appear across the plan. */
  maxStatementRepeats?: number;
};

/**
 * Choose one candidate per open day, in date order. Returns the chosen index per day,
 * or -1 when a day is fixed or has no candidates.
 */
export function planSequence(days: Candidate[][], opts: SequenceOptions = {}): number[] {
  const n = days.length;
  const chosen: Array<string[] | null> = Array.from({ length: n }, (_, i) => opts.fixed?.[i] ?? null);
  const pieceRole = new Map<string, boolean>(); // id -> is statement piece
  for (const d of days) for (const c of d) for (const p of c.items) pieceRole.set(p.id, isStatement(p));
  const maxRepeats = opts.maxStatementRepeats ?? (opts.capsule ? 2 : 1);
  const out: number[] = Array(n).fill(-1);

  const shoeIds = new Set<string>();
  for (const d of days) for (const c of d) for (const p of c.items) if (isShoe(p)) shoeIds.add(p.id);

  for (let i = 0; i < n; i++) {
    if (chosen[i] || !days[i].length) continue;
    const usage = new Map<string, number>();
    chosen.forEach((ids, j) => {
      if (j !== i && ids) for (const id of ids) usage.set(id, (usage.get(id) ?? 0) + 1);
    });
    const shoesPacked = [...usage.keys()].filter((id) => shoeIds.has(id)).length;
    const adjacent = new Set([...(chosen[i - 1] ?? []), ...(chosen[i + 1] ?? [])]);

    let best = -1;
    let bestScore = -Infinity;
    days[i].forEach((c, k) => {
      let s = c.score - k * 0.5; // keep the engine's own ranking as a tiebreak
      for (const p of c.items) {
        const used = usage.get(p.id) ?? 0;
        const statement = pieceRole.get(p.id) ?? false;
        if (adjacent.has(p.id)) s -= statement ? 40 : isShoe(p) ? 2 : 8;
        if (statement && used) s -= used >= maxRepeats ? 60 : 25;
        if (opts.capsule && !statement) {
          s += used ? 6 : -4;
          // Shoes and bulky pieces cost the most space: reuse them hard, add new ones reluctantly.
          if (isShoe(p)) s += used ? 6 : shoesPacked >= MAX_TRIP_SHOES ? -30 : -4;
          if (isBulky(p)) s += used ? 4 : -10;
        }
      }
      if (s > bestScore) {
        bestScore = s;
        best = k;
      }
    });
    out[i] = best;
    if (best >= 0) chosen[i] = days[i][best].items.map((p) => p.id);
  }
  return out;
}

export type PackingEntry = { id: string; role: Role; looks: number };

/** Every piece the looks use, grouped by role, with how many looks each appears in. */
export function packingList(looks: Array<{ item_ids: string[] }>, pieces: Map<string, Pick<ClosetPiece, "category" | "subcategory">>): PackingEntry[] {
  const count = new Map<string, number>();
  for (const l of looks) for (const id of new Set(l.item_ids)) count.set(id, (count.get(id) ?? 0) + 1);
  return [...count.entries()]
    .filter(([id]) => pieces.has(id))
    .map(([id, looks]) => ({ id, looks, role: roleOf(pieces.get(id)!) }))
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || b.looks - a.looks);
}

export type DressCode = "casual" | "smart" | "cocktail" | "formal" | "black-tie";
export const DRESS_CODES: Array<{ id: DressCode; label: string; band: [number, number]; occasion: Occasion }> = [
  { id: "casual", label: "Casual", band: [1, 3], occasion: "casual" },
  { id: "smart", label: "Smart casual", band: [3, 4], occasion: "dinner" },
  { id: "cocktail", label: "Cocktail", band: [4, 4], occasion: "event" },
  { id: "formal", label: "Formal", band: [4, 5], occasion: "event" },
  { id: "black-tie", label: "Black tie", band: [5, 5], occasion: "event" },
];
/** Something the person already knows they're doing on the trip. */
export type TripEvent = { date: string; when: "day" | "evening"; name: string; dress: DressCode; vibe: string | null };

/** `event` is the old one-dressy-event switch; `events` replaces it. */
export type TripOptions = { daytime: Occasion; nights: boolean; event: boolean; events?: TripEvent[] };
export type TripLook = { key: string; date: string; occasion: Occasion; label: string; band?: [number, number]; vibe?: string | null };

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 21; d = addDays(d, 1)) out.push(d);
  return out;
}

function eventLook(e: TripEvent, key: string): TripLook {
  const code = DRESS_CODES.find((d) => d.id === e.dress) ?? DRESS_CODES[0];
  return { key, date: e.date, occasion: code.occasion, band: code.band, vibe: e.vibe, label: [e.name, code.label, e.vibe].filter(Boolean).join(" · ") };
}

/**
 * The looks a trip needs: travel days at each end, a daytime look between, and evenings out if asked.
 * A planned event takes the place of that day's daytime or dinner look; a second one in the same slot adds a look.
 */
export function tripLooks(start: string, end: string, o: TripOptions): TripLook[] {
  const dates = daysBetween(start, end);
  const looks: TripLook[] = [];
  const events = o.events ?? [];
  const eventDay = dates.length > 2 ? dates[Math.floor(dates.length / 2)] : dates[dates.length - 1];
  dates.forEach((date, i) => {
    const day = events.filter((e) => e.date === date && e.when === "day");
    const eve = events.filter((e) => e.date === date && e.when === "evening");
    const travel = dates.length > 1 && (i === 0 || i === dates.length - 1);
    if (day.length) day.forEach((e, k) => looks.push(eventLook(e, k ? `${date}-day${k}` : `${date}-day`)));
    else looks.push(travel ? { key: `${date}-day`, date, occasion: "travel", label: "Travel day" } : { key: `${date}-day`, date, occasion: o.daytime, label: "Daytime" });
    const last = i === dates.length - 1 && dates.length > 1;
    if (eve.length) eve.forEach((e, k) => looks.push(eventLook(e, k ? `${date}-night${k}` : `${date}-night`)));
    else if (o.event && !events.length && date === eventDay) looks.push({ key: `${date}-event`, date, occasion: "event", label: "Event" });
    else if (o.nights && !last) looks.push({ key: `${date}-night`, date, occasion: "dinner", label: "Dinner" });
  });
  return looks;
}

// Common trip aesthetics, spelled out as words that show up in piece names, fabrics and colors.
const VIBE_HINTS: Record<string, string[]> = {
  beach: ["linen", "white", "sandal", "straw", "cotton", "slide", "swim"],
  resort: ["linen", "silk", "sandal", "white", "print", "straw"],
  tropical: ["linen", "floral", "print", "sandal", "bright"],
  western: ["denim", "boot", "suede", "leather", "fringe", "plaid"],
  cowboy: ["denim", "boot", "suede", "leather", "fringe", "plaid"],
  boho: ["floral", "crochet", "lace", "maxi", "suede", "fringe"],
  glam: ["sequin", "satin", "silk", "metallic", "velvet", "heel"],
  minimal: ["black", "white", "cream", "grey", "gray", "tailored"],
  preppy: ["polo", "oxford", "stripe", "loafer", "chino", "navy"],
  sporty: ["sneaker", "jersey", "track", "legging", "athletic"],
  edgy: ["leather", "black", "boot", "moto"],
  romantic: ["lace", "floral", "silk", "ruffle", "pink"],
  ski: ["knit", "wool", "fleece", "boot", "puffer"],
};
const STOP = new Set(["and", "the", "with", "for", "all", "very", "wear", "vibe", "look", "style", "theme", "dress", "code"]);

/** The words a vibe like "all white, beachy" asks for. */
export function vibeWords(vibe: string | null | undefined): string[] {
  const words = (vibe ?? "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !STOP.has(w));
  const out = new Set<string>();
  for (const w of words) {
    out.add(w);
    const root = w.replace(/y$/, "");
    for (const h of VIBE_HINTS[w] ?? VIBE_HINTS[root] ?? []) out.add(h);
  }
  return [...out];
}

/** How many pieces of an outfit match the vibe's words, by name, fabric, pattern or color. */
export function vibeHits(items: ClosetPiece[], words: string[]): number {
  if (!words.length) return 0;
  return items.filter((p) => {
    const text = [p.name, p.subcategory, p.material, p.pattern, ...(p.colors ?? []).map((c) => c.name), ...(p.construction ?? [])].join(" ").toLowerCase();
    return words.some((w) => text.includes(w));
  }).length;
}

export type PackPiece = Pick<ClosetPiece, "category" | "subcategory" | "warmth"> & { name: string };

/** Short packing advice from the finished plan. */
export function packingTips(looks: Array<{ item_ids: string[]; occasion: Occasion }>, pieces: Map<string, PackPiece>): string[] {
  const list = packingList(looks, pieces);
  if (!list.length) return [];
  const tips = [`${list.length} piece${list.length === 1 ? "" : "s"} make ${looks.length} look${looks.length === 1 ? "" : "s"}.`];
  const shoes = list.filter((e) => e.role === "shoes");
  if (shoes.length) tips.push(`${shoes.length} pair${shoes.length === 1 ? "" : "s"} of shoes cover${shoes.length === 1 ? "s" : ""} every look.`);
  const star = list.filter((e) => e.role !== "top" && e.role !== "dress" && e.looks >= 3).sort((a, b) => b.looks - a.looks)[0];
  if (star) tips.push(`Hardest-working piece: ${pieces.get(star.id)!.name}, in ${star.looks} looks.`);
  const bulky = list.filter((e) => isBulky(pieces.get(e.id)!)).map((e) => pieces.get(e.id)!.name);
  if (bulky.length && looks.some((l) => l.occasion === "travel")) tips.push(`Wear the bulkiest pieces on travel days so they stay out of the bag: ${bulky.slice(0, 3).join(", ")}.`);
  return tips;
}

/** The non-closet things worth a reminder, from trip length and weather. */
export function tripExtras(nights: number, weather: Array<{ uvMax: number; rainMax: number; feelsMin: number }>): string[] {
  const n = Math.max(1, nights + 1);
  const out = [`Underwear × ${n}`, `Socks × ${n}`, "Sleepwear", "Toiletries", "Phone charger"];
  if (weather.some((w) => w.uvMax >= 6)) out.push("Sunglasses and sunscreen");
  if (weather.some((w) => w.rainMax >= 50)) out.push("Umbrella or rain shell");
  if (weather.some((w) => w.feelsMin < 45)) out.push("Gloves and a warm hat");
  return out;
}
