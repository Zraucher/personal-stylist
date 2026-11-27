// Taste profile: turn a person's Outfit Lab ratings into weights the outfit engine ranks by.
// Pure; imports with .ts so plain Node can run the tests.

import type { PieceSlot, TasteRating } from "./reasons.ts";

export type RatedSlot = {
  slot: PieceSlot;
  rating: TasteRating;
  reasons: string[];
  itemIds: string[];
  replacementId?: string | null;
  noMatch?: boolean;
};
export type RatedOutfit = { itemIds: string[]; rating: TasteRating; reasons: string[]; slots: RatedSlot[] };
export type TastePiece = { id: string; category: string | null; subcategory: string | null; colors: Array<{ name: string }> };

/** Weights in [-2, 2] for pieces and pairings, [-1, 1] (averages) for attributes. */
export type Taste = {
  ratings: number;
  items: Record<string, number>;
  pairs: Record<string, number>;
  colors: Record<string, number>;
  categories: Record<string, number>;
  subcategories: Record<string, number>;
  /** "<slot>.<reason>" -> times chosen. */
  reasons: Record<string, number>;
  /** slot -> times "I don't have anything that works here". */
  gaps: Record<string, number>;
};

export const RATING_VALUE: Record<TasteRating, number> = { love: 1, neutral: -0.25, not: -1 };

export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const clamp = (x: number, m: number) => Math.max(-m, Math.min(m, x));
const bump = (o: Record<string, number>, k: string, v: number) => {
  o[k] = (o[k] ?? 0) + v;
};
const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().trim();

export function buildTaste(rated: RatedOutfit[], pieces: TastePiece[]): Taste {
  const byId = new Map(pieces.map((p) => [p.id, p]));
  const items: Record<string, number> = {};
  const pairs: Record<string, number> = {};
  const reasons: Record<string, number> = {};
  const gaps: Record<string, number> = {};
  const colors: Record<string, [number, number]> = {};
  const categories: Record<string, [number, number]> = {};
  const subcategories: Record<string, [number, number]> = {};
  const add = (o: Record<string, [number, number]>, k: string | null | undefined, v: number) => {
    const key = norm(k);
    if (!key) return;
    const cur = (o[key] ??= [0, 0]);
    cur[0] += v;
    cur[1] += 1;
  };
  const credit = (id: string, v: number) => {
    bump(items, id, v);
    const p = byId.get(id);
    if (!p) return;
    for (const c of p.colors) add(colors, c.name, v);
    add(categories, p.category, v);
    add(subcategories, p.subcategory, v);
  };

  for (const r of rated) {
    const overall = RATING_VALUE[r.rating];
    // The whole-outfit rating counts half on each piece and fully on each pairing.
    for (const id of r.itemIds) credit(id, overall * 0.5);
    for (let i = 0; i < r.itemIds.length; i++) for (let j = i + 1; j < r.itemIds.length; j++) bump(pairs, pairKey(r.itemIds[i], r.itemIds[j]), overall);
    for (const x of r.reasons) bump(reasons, `outfit.${x}`, 1);

    for (const s of r.slots) {
      const v = RATING_VALUE[s.rating];
      const rest = r.itemIds.filter((id) => !s.itemIds.includes(id));
      for (const id of s.itemIds) {
        credit(id, v);
        for (const o of rest) bump(pairs, pairKey(id, o), v * 0.5);
      }
      for (const x of s.reasons) bump(reasons, `${s.slot}.${x}`, 1);
      if (s.noMatch) bump(gaps, s.slot, 1);
      if (s.replacementId) {
        // The piece they would rather wear here: a mild like, and it pairs with the rest.
        credit(s.replacementId, 0.5);
        for (const o of rest) bump(pairs, pairKey(s.replacementId, o), 0.5);
      }
    }
  }

  const avg = (o: Record<string, [number, number]>) => Object.fromEntries(Object.entries(o).map(([k, [s, n]]) => [k, clamp(s / n, 1)]));
  const cap = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, clamp(v, 2)]));
  return { ratings: rated.length, items: cap(items), pairs: cap(pairs), colors: avg(colors), categories: avg(categories), subcategories: avg(subcategories), reasons, gaps };
}

/**
 * Ranking adjustment for an outfit. Rated pieces and pairings dominate; attribute averages
 * nudge pieces that were never rated. For scale: strong vs workable composition is 10 points,
 * so a loved pairing (+6) or a "not for me" piece (-4 to -8) can reorder outfits.
 */
export function tasteScore(items: TastePiece[], taste: Taste): number {
  let s = 0;
  for (const p of items) {
    s += (taste.items[p.id] ?? 0) * 4;
    const cols = p.colors.map((c) => taste.colors[norm(c.name)] ?? 0);
    if (cols.length) s += cols.reduce((a, b) => a + b, 0) / cols.length;
    s += taste.subcategories[norm(p.subcategory)] ?? 0;
  }
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) s += (taste.pairs[pairKey(items[i].id, items[j].id)] ?? 0) * 3;
  return s;
}
