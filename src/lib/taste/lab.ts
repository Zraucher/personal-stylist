// Outfit Lab helpers: which row a piece belongs to, and which closet pieces could replace one.
// Pure; imports with .ts so plain Node can run the tests.

import { isBottom, isDress, isLayer, isShoe, isTop, type ClosetPiece } from "../today/candidates.ts";
import { checkOutfit, type Overall } from "../outfit/composition.ts";
import type { ScoreColorProfile, ScoreStyle } from "../scorecard/rules.ts";
import { tasteScore, type Taste } from "./profile.ts";
import type { PieceSlot } from "./reasons.ts";

/** Top (outer layer included), Bottom or Dress, Footwear, Accessories (bags, jewelry, belts, hats, extras). */
export function slotOf(p: ClosetPiece): PieceSlot {
  if (isShoe(p)) return "footwear";
  if (isBottom(p) || isDress(p)) return "bottom";
  if (isTop(p) || isLayer(p)) return "top";
  return "accessories";
}

/** Narrower than the slot: a swap keeps the kind, so a layer is replaced by a layer. */
function kind(p: ClosetPiece): string {
  if (isShoe(p)) return "shoe";
  if (isDress(p)) return "dress";
  if (isBottom(p)) return "bottom";
  if (isLayer(p)) return "layer";
  if (isTop(p)) return "top";
  return `other:${(p.category ?? "").toLowerCase()}`;
}

export type SlotGroup = { slot: PieceSlot; label: string; pieces: ClosetPiece[] };
const ORDER: PieceSlot[] = ["top", "bottom", "footwear", "accessories"];
const LABEL: Record<PieceSlot, string> = { top: "Top", bottom: "Bottom", footwear: "Footwear", accessories: "Accessories" };

/** Rows for an outfit, in order, leaving out rows it has no piece for. Core pieces come before layers. */
export function groupSlots(items: ClosetPiece[]): SlotGroup[] {
  return ORDER.map((slot) => {
    const pieces = items.filter((p) => slotOf(p) === slot).sort((a, b) => Number(isLayer(a)) - Number(isLayer(b)));
    const label = slot === "bottom" && pieces.length && pieces.every(isDress) ? "Dress" : LABEL[slot];
    return { slot, label, pieces };
  }).filter((g) => g.pieces.length > 0);
}

/** Order-free key for a set of pieces, to avoid showing a combination twice. */
export const comboKey = (ids: string[]) => [...ids].sort().join(",");

const POINTS: Record<Overall, number> = { strong: 3, workable: 2, rework: 0, incomplete: 0 };

/**
 * Closet pieces that could stand in for `target`, best first: same kind, not already in the
 * outfit, wearable, ranked by the composition check with the rest and then by taste.
 */
export function rankReplacements(
  outfit: ClosetPiece[],
  target: ClosetPiece,
  closet: ClosetPiece[],
  palette: ScoreColorProfile,
  style: ScoreStyle,
  opts: { taste?: Taste; limit?: number } = {}
): ClosetPiece[] {
  const k = kind(target);
  const rest = outfit.filter((p) => p.id !== target.id);
  return closet
    .filter((p) => kind(p) === k && !outfit.some((o) => o.id === p.id) && (!p.status || p.status === "available") && p.verdict !== "cut")
    .map((p) => {
      const items = [...rest, p];
      const score = POINTS[checkOutfit(items, palette, style).overall] * 10 + (opts.taste ? tasteScore(items, opts.taste) : 0) + (p.affinity ?? 0);
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit ?? 6)
    .map((x) => x.p);
}
