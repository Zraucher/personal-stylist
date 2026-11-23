// Pure: where each piece of an outfit sits in a mockup. Plain Node can test it.
// Boxes are percentages of a 4:5 canvas.

export type MockupMode = "flatlay" | "ghost";
export type Slot = "outer" | "top" | "dress" | "bottom" | "shoes" | "bag" | "extra";
export type Box = { x: number; y: number; w: number; h: number; rotate: number; z: number };
type Piece = { category?: string | null; subcategory?: string | null };

const BOTTOM_WORDS = /legging|short|pant|jogger|skirt|trunk|bikini/;

export function slotOf(p: Piece): Slot {
  const c = p.category ?? "";
  if (c === "outerwear") return "outer";
  if (c === "top") return "top";
  if (c === "dress") return "dress";
  if (c === "bottom") return "bottom";
  if (c === "shoes") return "shoes";
  if (c === "bag") return "bag";
  if (c === "activewear" || c === "swim") return BOTTOM_WORDS.test(p.subcategory ?? "") ? "bottom" : "top";
  return "extra";
}

// Flat lay: pieces side by side on a board, like a stylist's layout photo.
const FLAT: Record<Exclude<Slot, "extra">, Box> = {
  top: { x: 4, y: 3, w: 46, h: 42, rotate: -3, z: 2 },
  outer: { x: 50, y: 2, w: 47, h: 44, rotate: 3, z: 1 },
  dress: { x: 4, y: 3, w: 48, h: 74, rotate: -2, z: 2 },
  bottom: { x: 8, y: 45, w: 42, h: 52, rotate: 2, z: 1 },
  bag: { x: 55, y: 47, w: 36, h: 26, rotate: -4, z: 2 },
  shoes: { x: 54, y: 72, w: 40, h: 25, rotate: 5, z: 3 },
};
const FLAT_EXTRA: Box[] = [
  { x: 76, y: 44, w: 20, h: 18, rotate: 8, z: 4 },
  { x: 40, y: 38, w: 18, h: 16, rotate: -6, z: 4 },
  { x: 2, y: 80, w: 18, h: 16, rotate: 6, z: 4 },
];

// Ghost model: stacked as if worn by an invisible body. The jacket sits behind the top so both show.
const GHOST: Record<Exclude<Slot, "extra">, Box> = {
  outer: { x: 16, y: 4, w: 68, h: 52, rotate: 0, z: 1 },
  top: { x: 25, y: 6, w: 50, h: 40, rotate: 0, z: 3 },
  dress: { x: 21, y: 6, w: 58, h: 74, rotate: 0, z: 3 },
  bottom: { x: 27, y: 39, w: 46, h: 49, rotate: 0, z: 2 },
  shoes: { x: 28, y: 83, w: 44, h: 17, rotate: 0, z: 4 },
  bag: { x: 72, y: 44, w: 26, h: 24, rotate: 0, z: 4 },
};
const GHOST_EXTRA: Box[] = [
  { x: 2, y: 6, w: 20, h: 16, rotate: 0, z: 4 },
  { x: 2, y: 26, w: 20, h: 16, rotate: 0, z: 4 },
  { x: 78, y: 6, w: 20, h: 16, rotate: 0, z: 4 },
];

/**
 * A box per piece, in the order given. A second piece for a taken slot spills to the free
 * "outer" spot when it's a top, otherwise to the small extra spots. Pieces past the last spot are left out.
 */
export function layout(pieces: Piece[], mode: MockupMode): Array<Box | null> {
  const main = mode === "ghost" ? GHOST : FLAT;
  const extras = [...(mode === "ghost" ? GHOST_EXTRA : FLAT_EXTRA)];
  const taken = new Set<Slot>();
  const slots = pieces.map(slotOf);
  // A dress fills the top and bottom spots.
  if (slots.includes("dress")) ["top", "bottom"].forEach((s) => taken.add(s as Slot));
  return slots.map((s) => {
    let slot: Slot | null = s !== "extra" && !taken.has(s) ? s : null;
    // A second top (or a top over a dress) becomes the layer when the outfit has no jacket.
    if (!slot && s === "top" && !taken.has("outer") && !slots.includes("outer")) slot = "outer";
    if (!slot) return extras.shift() ?? null;
    taken.add(slot);
    const box = main[slot as Exclude<Slot, "extra">];
    return slot === "outer" && s === "top" && mode === "ghost" ? { ...box, z: 1 } : box;
  });
}
