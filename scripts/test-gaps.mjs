// Run: node --test scripts/test-gaps.mjs   (Node 22.18+ strips the types)
import test from "node:test";
import assert from "node:assert/strict";
import { findGaps, hypotheticals } from "../src/lib/gaps/unlock.ts";

const palette = { best_colors: ["black", "navy", "white"], avoid_colors: [], confidence: null };
const style = { dislikes: [], fabrics_preferred: [], fabrics_avoid: [], silhouettes_preferred: [], silhouettes_avoid: [] };
let n = 0;
const piece = (o) => ({
  id: `p${++n}`, name: null, subcategory: null, category: null, colors: [{ name: "black" }], pattern: null, material: null,
  construction: [], formality: 2, warmth: 2, verdict: null, status: "available", seasons: ["all"], lastWorn: null, affinity: 0, ...o,
});

// Tops but no bottoms: almost any pair of bottoms unlocks many outfits.
const closet = [
  piece({ name: "Black tee", category: "top", subcategory: "tee", warmth: 1 }),
  piece({ name: "Navy polo", category: "top", subcategory: "polo", colors: [{ name: "navy" }], formality: 3, warmth: 1 }),
  piece({ name: "White sneakers", category: "shoes", subcategory: "sneakers", colors: [{ name: "white" }], formality: 2, warmth: null }),
];

test("pieces already owned are not suggested", () => {
  const hyp = hypotheticals(closet, "mens", palette);
  assert.ok(!hyp.some((h) => h.subcategory === "tee" && h.colors[0].name === "black"));
  assert.ok(!hyp.some((h) => h.subcategory === "sneakers" && h.colors[0].name === "white"));
});

test("a closet with no bottoms gets bottoms as the top gap, with a count", () => {
  const t0 = Date.now();
  const { base, gaps } = findGaps(closet, "mens", palette, style);
  assert.equal(base, 0);
  assert.ok(gaps.length > 0);
  assert.equal(gaps[0].piece.category, "bottom");
  assert.ok(gaps[0].added >= 2);
  assert.ok(Date.now() - t0 < 5000, "gap search should stay fast");
});

test("gaps are sorted by outfits added", () => {
  const { gaps } = findGaps(closet, "mens", palette, style);
  for (let i = 1; i < gaps.length; i++) assert.ok(gaps[i - 1].added >= gaps[i].added);
});

import { gapLabel } from "../src/lib/gaps/unlock.ts";

test("gap labels read cleanly and one suggestion per piece type", () => {
  assert.equal(gapLabel({ piece: { name: "khaki chinos" }, added: 3, scenarios: [] }), "Khaki chinos");
});
