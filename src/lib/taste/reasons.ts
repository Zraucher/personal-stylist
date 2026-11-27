// Reason chips for Outfit Lab ratings. Ids are stored in the database and counted in the
// cross-user aggregate, so keep them stable; labels can change freely.

export type TasteRating = "love" | "neutral" | "not";
export type RowSlot = "outfit" | "top" | "bottom" | "footwear" | "accessories";
export type PieceSlot = Exclude<RowSlot, "outfit">;
export type Reason = { id: string; label: string };

export const RATINGS: Array<{ id: TasteRating; label: string }> = [
  { id: "love", label: "Love" },
  { id: "neutral", label: "Neutral" },
  { id: "not", label: "Not for me" },
];

const R = (id: string, label: string): Reason => ({ id, label });

const LOVE_OUTFIT = [R("great_colors", "Great colors"), R("great_combo", "Great combo"), R("my_style", "My style"), R("right_occasion", "Right for the occasion"), R("right_weather", "Right for the weather"), R("comfortable", "Comfortable")];
const LOVE_PIECE = [R("great_colors", "Great colors"), R("love_fit", "Love the fit"), R("my_style", "My style"), R("goes_with_rest", "Goes with the rest"), R("comfortable", "Comfortable"), R("great_texture", "Great fabric or texture")];
const OFF_COMMON = [R("color", "Color"), R("style", "Style"), R("occasion", "Occasion mismatch"), R("weather", "Weather mismatch"), R("too_formal", "Too formal"), R("too_casual", "Too casual"), R("comfort", "Comfort"), R("pattern", "Pattern or texture")];
const FIT = R("fit", "Fit");
const CLASHES = R("clashes", "Doesn't go with the rest");
// On the whole outfit, say which part is off ("Neutral because the bottoms don't go with the rest").
const PART_OFF: Record<PieceSlot, Reason> = {
  top: R("top_off", "The top doesn't go"),
  bottom: R("bottom_off", "The bottoms don't go"),
  footwear: R("shoes_off", "The shoes don't go"),
  accessories: R("accessories_off", "The extras don't go"),
};
const MEH = R("not_exciting", "Fine, not exciting");
const ALL_SLOTS: PieceSlot[] = ["top", "bottom", "footwear", "accessories"];

/** Reason chips for a rating on a row. `present` limits the outfit-level "part" reasons to rows the outfit has. */
export function reasonOptions(rating: TasteRating, slot: RowSlot, present: PieceSlot[] = ALL_SLOTS): Reason[] {
  if (rating === "love") return slot === "outfit" ? LOVE_OUTFIT : LOVE_PIECE;
  const lead = rating === "neutral" ? [MEH] : [];
  if (slot === "outfit") return [...lead, ...ALL_SLOTS.filter((s) => present.includes(s)).map((s) => PART_OFF[s]), ...OFF_COMMON];
  return [...lead, CLASHES, FIT, ...OFF_COMMON];
}

/** Every reason id that can be saved, for validation at the server boundary. */
export const REASON_IDS = new Set([...LOVE_OUTFIT, ...LOVE_PIECE, ...OFF_COMMON, FIT, CLASHES, ...Object.values(PART_OFF), MEH].map((r) => r.id));
