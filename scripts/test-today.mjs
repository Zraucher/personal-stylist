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

test("a light polo works on a cool evening when a layer goes over it", () => {
  const cool = { feelsMin: 48, feelsMax: 51, season: "fall" };
  const warmBottom = piece({ name: "Golf pants", category: "bottom", subcategory: "golf pants", formality: 2, warmth: 3 });
  const r = buildCandidates([polo, warmBottom, sneakers, hoodie], cool, { occasion: "casual", today: "2026-11-16" }, palette, style);
  assert.ok(r.candidates.some((c) => c.items.includes(polo) && c.items.includes(hoodie)));
});

test("when nothing passes the strict rules, the closest outfits come back marked relaxed", () => {
  // Office wants dress level 3-4; only casual pieces exist.
  const r = buildCandidates([tee, shorts, sneakers], hot, { occasion: "dinner", today: "2026-11-16" }, palette, style);
  assert.ok(r.relaxed, "should fall back to relaxed picks");
  assert.ok(r.candidates.length > 0);
  assert.ok(r.missing.length > 0, "the strict missing list is kept");
  const strict = buildCandidates(closet, hot, { occasion: "casual", today: "2026-11-16" }, palette, style);
  assert.ok(!strict.relaxed);
});

test("picks differ by at least two pieces when the closet allows it", () => {
  const tee2 = piece({ name: "Navy tee", category: "top", subcategory: "tee", colors: [{ name: "navy" }], warmth: 1 });
  const shorts2 = piece({ name: "Black shorts", category: "bottom", subcategory: "shorts", warmth: 1 });
  const sneakers2 = piece({ name: "Black sneakers", category: "shoes", subcategory: "sneakers", warmth: null });
  const r = buildCandidates([tee, tee2, shorts, shorts2, sneakers, sneakers2], hot, { occasion: "casual", today: "2026-11-16" }, palette, style);
  const [a, b] = r.candidates;
  const shared = a.items.filter((x) => b.items.includes(x)).length;
  assert.ok(a.items.length - shared >= 2, "first two picks should differ by two or more pieces");
});

import { outfitName } from "../src/lib/today/candidates.ts";

test("outfit names are short and readable", () => {
  assert.equal(outfitName([polo, trousers, sneakers]), "Polo, trousers and sneakers");
  assert.equal(outfitName([tee]), "Tee");
});

test("localHour reads the person's clock, Pacific by default", async () => {
  const { localHour } = await import("../src/lib/time.ts");
  const t = Date.UTC(2026, 0, 15, 15, 17); // 15:17 UTC in January
  assert.equal(localHour("America/New_York", t), 10);
  assert.equal(localHour(null, t), 7);
  assert.equal(localHour("Asia/Kolkata", t), 20);
  assert.equal(localHour("Not/AZone", t), 15);
});

test("fallback outfit names: AI names win, errors and timeouts keep the plain names", async () => {
  const { nameFallbackOutfits } = await import("../src/lib/today/names.ts");
  const plain = ["Polo and trousers", "Tee and jeans"];
  const desc = ["a", "b"];
  assert.deepEqual(await nameFallbackOutfits(plain, desc, async () => ["Easy golf morning", " "]), ["Easy golf morning", "Tee and jeans"]);
  assert.deepEqual(await nameFallbackOutfits(plain, desc, async () => { throw new Error("boom"); }), plain);
  assert.deepEqual(await nameFallbackOutfits(plain, desc, () => new Promise(() => {}), 20), plain);
});

test("Needs you: zero counts drop out, price drops lead, plurals read right", async () => {
  const { attentionItems, priceDrops, newVoteCount, unreviewedCount, weekDates } = await import("../src/lib/today/attention.ts");
  assert.deepEqual(attentionItems({ drops: 0, newVotes: 0, sourced: 0, toReview: 0 }), []);
  const rows = attentionItems({ drops: 1, newVotes: 2, sourced: 0, toReview: 3 });
  assert.deepEqual(rows.map((r) => r.id), ["drops", "votes", "review"]);
  assert.equal(rows[0].title, "See 1 price drop");
  assert.equal(rows[2].title, "Review 3 pieces");
  // $1 and 3% both required: 50 cents off or 1% off isn't a drop.
  assert.equal(priceDrops([{ price: 90, first_price: 100 }, { price: 9.5, first_price: 10 }, { price: 99, first_price: 100 }, { price: null, first_price: 100 }]), 1);
  const asks = [{ id: "a", seen_at: "2026-11-20T00:00:00Z", created_at: "2026-11-01T00:00:00Z" }];
  assert.equal(newVoteCount(asks, [{ opinion_id: "a", created_at: "2026-11-19T00:00:00Z" }, { opinion_id: "a", created_at: "2026-11-21T00:00:00Z" }]), 1);
  assert.equal(unreviewedCount(["a", "b", "c"], ["b", "x"]), 2);
  const w = weekDates("2026-12-29");
  assert.equal(w.length, 7);
  assert.equal(w[6], "2027-01-04");
});
