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

  for (let i = 0; i < n; i++) {
    if (chosen[i] || !days[i].length) continue;
    const usage = new Map<string, number>();
    chosen.forEach((ids, j) => {
      if (j !== i && ids) for (const id of ids) usage.set(id, (usage.get(id) ?? 0) + 1);
    });
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
        if (opts.capsule && !statement) s += used ? 6 : -4;
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

export type TripOptions = { daytime: Occasion; nights: boolean; event: boolean };
export type TripLook = { key: string; date: string; occasion: Occasion; label: string };

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

/** The looks a trip needs: travel days at each end, a daytime look between, and evenings out if asked. */
export function tripLooks(start: string, end: string, o: TripOptions): TripLook[] {
  const dates = daysBetween(start, end);
  const looks: TripLook[] = [];
  const eventDay = dates.length > 2 ? dates[Math.floor(dates.length / 2)] : dates[dates.length - 1];
  dates.forEach((date, i) => {
    const travel = dates.length > 1 && (i === 0 || i === dates.length - 1);
    looks.push(travel ? { key: `${date}-day`, date, occasion: "travel", label: "Travel day" } : { key: `${date}-day`, date, occasion: o.daytime, label: "Daytime" });
    const last = i === dates.length - 1 && dates.length > 1;
    if (o.event && date === eventDay) looks.push({ key: `${date}-event`, date, occasion: "event", label: "Event" });
    else if (o.nights && !last) looks.push({ key: `${date}-night`, date, occasion: "dinner", label: "Dinner" });
  });
  return looks;
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
