// Run: node --test scripts/test-today.mjs   (Node 22.18+ strips the types)
import test from "node:test";
import assert from "node:assert/strict";
import { buildCandidates, targetWarmth, wearable } from "../src/lib/today/candidates.ts";

const palette = { best_colors: ["black", "navy", "white"], avoid_colors: [], confidence: null };
const style = { dislikes: [], fabrics_preferred: [], fabrics_avoid: [], silhouettes_preferred: [], silhouettes_avoid: [] };
let n = 0;
const piece = (o) => ({
  id: `p${++n}`, name: null, subcategory: null, category: null, colors: [{ name: "black" }], pattern: null, material: null,
  construction: [], formality: 2, warmth: 2, verdict: null, status: "available", seasons: ["all"], lastWorn: null, affinity: 0, ...o,
});

const tee = piece({ name: "Black tee", category: "top", subcategory: "tee", warmth: 1 });
const polo = piece({ name: "Navy polo", category: "top", subcategory: "polo", colors: [{ name: "navy" }], formality: 3, warmth: 2 });
const shirt = piece({ name: "White dress shirt", category: "top", subcategory: "dress shirt", colors: [{ name: "white" }], formality: 4, warmth: 2, construction: ["collar", "button-front"] });
const shorts = piece({ name: "Shorts", category: "bottom", subcategory: "shorts", colors: [{ name: "navy" }], formality: 2, warmth: 1 });
const trousers = piece({ name: "Trousers", category: "bottom", subcategory: "trousers", formality: 4, warmth: 3 });
const sneakers = piece({ name: "Sneakers", category: "shoes", subcategory: "sneakers", colors: [{ name: "white" }], formality: 2, warmth: null });
const hoodie = piece({ name: "Hoodie", category: "layer", subcategory: "hoodie", formality: 1, warmth: 3 });
const gone = piece({ name: "Old tee", category: "top", subcategory: "tee", status: "gone", warmth: 1 });
const closet = [tee, polo, shirt, shorts, trousers, sneakers, hoodie, gone];

const hot = { feelsMin: 85, feelsMax: 100, season: "summer" };
const mild = { feelsMin: 55, feelsMax: 70, season: "fall" };

test("warmth targets follow the temperature", () => {
  assert.equal(targetWarmth(100), 1);
  assert.equal(targetWarmth(70), 3);
  assert.equal(targetWarmth(30), 5);
});

test("unavailable and cut pieces are never offered", () => {
  assert.equal(wearable(gone, hot, [1, 3], "core"), false);
  assert.equal(wearable({ ...tee, verdict: "cut" }, hot, [1, 3], "core"), false);
});

test("a hot casual day uses hot-weather pieces and no layer", () => {
  const r = buildCandidates(closet, hot, { occasion: "casual", today: "2026-11-16" }, palette, style);
  assert.ok(r.candidates.length > 0);
  for (const c of r.candidates) {
    assert.ok(!c.items.includes(trousers), "warmth 3 trousers are too warm at 100°F");
    assert.ok(!c.items.includes(gone));
    assert.equal(c.layered, false);
  }
});

test("indoor cold adds a layer when one exists", () => {
  const r = buildCandidates(closet, { ...hot, indoorCold: true }, { occasion: "casual", today: "2026-11-16" }, palette, style);
  assert.ok(r.candidates.some((c) => c.layered));
});

test("office keeps pieces inside the formality band", () => {
  const r = buildCandidates(closet, mild, { occasion: "office", today: "2026-11-16" }, palette, style);
  for (const c of r.candidates) for (const p of c.items.filter((i) => i.category !== "shoes" && i.category !== "layer")) assert.ok(p.formality >= 3);
});

test("missing pieces are named instead of forcing a bad pick", () => {
  const r = buildCandidates([tee, shorts], hot, { occasion: "casual", today: "2026-11-16" }, palette, style);
  assert.ok(r.missing.some((m) => m.includes("shoes")));
});

test("exclusions and must-include are honored", () => {
  const r = buildCandidates(closet, hot, { occasion: "casual", exclude: ["shorts"], today: "2026-11-16" }, palette, style);
  for (const c of r.candidates) assert.ok(!c.items.includes(shorts));
  const m = buildCandidates(closet, hot, { occasion: "casual", mustInclude: [polo.id], today: "2026-11-16" }, palette, style);
  for (const c of m.candidates) assert.ok(c.items.includes(polo));
});

test("recently worn pieces rank lower", () => {
  const fresh = piece({ name: "Fresh tee", category: "top", subcategory: "tee", warmth: 1 });
  const worn = piece({ name: "Worn tee", category: "top", subcategory: "tee", warmth: 1, lastWorn: "2026-11-15" });
  const r = buildCandidates([fresh, worn, shorts, sneakers], hot, { occasion: "casual", today: "2026-11-16" }, palette, style);
  assert.equal(r.candidates[0].items[0], fresh);
});

import { singular } from "../src/lib/today/candidates.ts";

test("excluding a dress keeps dress shirts", () => {
  assert.equal(singular("dresses"), "dress");
  assert.equal(singular("dress"), "dress");
  assert.equal(singular("jeans"), "jeans");
  assert.equal(singular("shirts"), "shirt");
  const dressItem = piece({ name: "Black midi dress", category: "dress", subcategory: "midi dress", warmth: 1 });
  const r = buildCandidates([...closet, dressItem], hot, { occasion: "casual", exclude: ["dress"], today: "2026-11-16" }, palette, style);
  assert.ok(r.candidates.every((c) => !c.items.includes(dressItem)));
  const office = buildCandidates(closet, mild, { occasion: "office", exclude: ["dress"], today: "2026-11-16" }, palette, style);
  assert.ok(office.candidates.some((c) => c.items.includes(shirt)), "the dress shirt should survive a 'no dress' request");
});
