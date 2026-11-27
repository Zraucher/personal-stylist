// Run: node --test scripts/test-taste.mjs   (Node 22.18+ strips the types)
import test from "node:test";
import assert from "node:assert/strict";
import { buildCandidates } from "../src/lib/today/candidates.ts";
import { buildTaste, pairKey, tasteScore } from "../src/lib/taste/profile.ts";
import { reasonOptions, REASON_IDS } from "../src/lib/taste/reasons.ts";
import { comboKey, groupSlots, rankReplacements, slotOf } from "../src/lib/taste/lab.ts";

const palette = { best_colors: ["black", "navy", "white", "olive"], avoid_colors: [], confidence: null };
const style = { dislikes: [], fabrics_preferred: [], fabrics_avoid: [], silhouettes_preferred: [], silhouettes_avoid: [] };
let n = 0;
const piece = (o) => ({
  id: `p${++n}`, name: null, subcategory: null, category: null, colors: [{ name: "black" }], pattern: null, material: null,
  construction: [], formality: 2, warmth: 2, verdict: null, status: "available", seasons: ["all"], lastWorn: null, affinity: 0, ...o,
});

const tee = piece({ name: "Black tee", category: "top", subcategory: "tee", warmth: 1 });
const polo = piece({ name: "Navy polo", category: "top", subcategory: "polo", colors: [{ name: "navy" }], formality: 2 });
const henley = piece({ name: "Olive henley", category: "top", subcategory: "henley", colors: [{ name: "olive" }] });
const shorts = piece({ name: "Shorts", category: "bottom", subcategory: "shorts", colors: [{ name: "navy" }], warmth: 1 });
const chinos = piece({ name: "Chinos", category: "bottom", subcategory: "chinos", colors: [{ name: "white" }] });
const sneakers = piece({ name: "Sneakers", category: "shoes", subcategory: "sneakers", colors: [{ name: "white" }], warmth: null });
const loafers = piece({ name: "Loafers", category: "shoes", subcategory: "loafers", colors: [{ name: "black" }], warmth: null });
const jacket = piece({ name: "Jacket", category: "outerwear", subcategory: "jacket", warmth: 3 });
const belt = piece({ name: "Belt", category: "accessory", subcategory: "belt" });
const dress = piece({ name: "Dress", category: "dress", subcategory: "midi dress" });
const closet = [tee, polo, henley, shorts, chinos, sneakers, loafers];
const day = { feelsMin: 70, feelsMax: 80, season: "summer" };
const cons = { occasion: "casual", today: "2026-07-01" };
const ids = (c) => c.items.map((p) => p.id).sort().join(",");

test("reason options fit the rating and the row", () => {
  const love = reasonOptions("love", "outfit").map((r) => r.id);
  assert.ok(love.includes("great_combo") && !love.includes("color"));
  const notTop = reasonOptions("not", "top").map((r) => r.id);
  assert.ok(notTop.includes("fit") && notTop.includes("clashes") && notTop.includes("occasion") && !notTop.includes("great_colors"));
  const meh = reasonOptions("neutral", "outfit", ["top", "bottom"]).map((r) => r.id);
  assert.equal(meh[0], "not_exciting");
  assert.ok(meh.includes("bottom_off"), "neutral because the bottoms don't go");
  assert.ok(!meh.includes("shoes_off"), "no part reason for a row the outfit lacks");
  for (const rating of ["love", "neutral", "not"]) for (const slot of ["outfit", "top", "bottom", "footwear", "accessories"]) for (const r of reasonOptions(rating, slot)) assert.ok(REASON_IDS.has(r.id));
});

test("taste weights: loved pieces and pairings up, not-for-me down, gaps and reasons counted", () => {
  const t = buildTaste(
    [
      { itemIds: [polo.id, chinos.id, loafers.id], rating: "love", reasons: ["great_combo"], slots: [] },
      {
        itemIds: [tee.id, shorts.id, sneakers.id],
        rating: "neutral",
        reasons: ["bottom_off"],
        slots: [{ slot: "bottom", rating: "not", reasons: ["clashes"], itemIds: [shorts.id], noMatch: true }],
      },
    ],
    closet
  );
  assert.equal(t.ratings, 2);
  assert.ok(t.items[polo.id] > 0 && t.items[shorts.id] < -1);
  assert.ok(t.pairs[pairKey(polo.id, chinos.id)] === 1);
  assert.ok(t.pairs[pairKey(shorts.id, tee.id)] < 0);
  assert.ok(t.colors.navy < t.colors.white, "navy shorts disliked, white chinos loved");
  assert.ok(t.subcategories.shorts < 0 && t.subcategories.loafers > 0);
  assert.equal(t.reasons["bottom.clashes"], 1);
  assert.equal(t.reasons["outfit.bottom_off"], 1);
  assert.equal(t.gaps.bottom, 1);
  assert.ok(tasteScore([polo, chinos, loafers], t) > 0 && tasteScore([tee, shorts, sneakers], t) < 0);
});

test("replacement picks count as mild likes that pair with the rest", () => {
  const t = buildTaste([{ itemIds: [tee.id, shorts.id, sneakers.id], rating: "neutral", reasons: [], slots: [{ slot: "top", rating: "not", reasons: [], itemIds: [tee.id], replacementId: henley.id }] }], closet);
  assert.ok(t.items[henley.id] > 0);
  assert.ok(t.pairs[pairKey(henley.id, shorts.id)] > 0);
  assert.ok(t.items[tee.id] < 0);
});

test("no taste or an empty taste leaves buildCandidates unchanged", () => {
  const base = buildCandidates(closet, day, cons, palette, style);
  const empty = buildCandidates(closet, day, cons, palette, style, { taste: buildTaste([], closet) });
  const none = buildCandidates(closet, day, cons, palette, style, { taste: undefined });
  assert.deepEqual(empty.candidates.map(ids), base.candidates.map(ids));
  assert.deepEqual(empty.candidates.map((c) => c.score), base.candidates.map((c) => c.score));
  assert.deepEqual(none.candidates.map(ids), base.candidates.map(ids));
});

test("loved outfits rank first and not-for-me pieces drop", () => {
  const base = buildCandidates(closet, day, cons, palette, style);
  const loved = [henley.id, shorts.id, loafers.id];
  const t = buildTaste([{ itemIds: loved, rating: "love", reasons: [], slots: [] }, { itemIds: [tee.id, chinos.id, sneakers.id], rating: "not", reasons: [], slots: [{ slot: "top", rating: "not", reasons: [], itemIds: [tee.id] }] }], closet);
  const after = buildCandidates(closet, day, cons, palette, style, { taste: t });
  assert.equal(ids(after.candidates[0]), [...loved].sort().join(","));
  const firstTee = (res) => res.candidates.findIndex((c) => c.items.some((p) => p.id === tee.id));
  const b = firstTee(base);
  const a = firstTee(after);
  assert.ok(a === -1 || a > b, `tee should rank lower (${b} -> ${a})`);
});

test("lab rows: slots, dress label, layers with the top, accessories", () => {
  assert.equal(slotOf(jacket), "top");
  assert.equal(slotOf(belt), "accessories");
  assert.equal(slotOf(dress), "bottom");
  const g = groupSlots([jacket, tee, chinos, sneakers, belt]);
  assert.deepEqual(g.map((x) => x.slot), ["top", "bottom", "footwear", "accessories"]);
  assert.equal(g[0].pieces[0].id, tee.id, "core top before its layer");
  assert.equal(groupSlots([dress, sneakers])[0].label, "Dress");
  assert.deepEqual(groupSlots([tee, chinos]).map((x) => x.slot), ["top", "bottom"], "no footwear row without shoes");
  assert.equal(comboKey(["b", "a"]), comboKey(["a", "b"]));
});

test("replacements keep the kind, skip pieces in the outfit, and follow taste", () => {
  const outfit = [tee, shorts, sneakers];
  const r = rankReplacements(outfit, tee, [...closet, jacket], palette, style);
  assert.ok(r.length >= 2 && r.every((p) => p.category === "top" && p.id !== tee.id));
  const t = buildTaste([{ itemIds: [henley.id], rating: "love", reasons: [], slots: [{ slot: "top", rating: "love", reasons: [], itemIds: [henley.id] }] }], closet);
  assert.equal(rankReplacements(outfit, tee, closet, palette, style, { taste: t })[0].id, henley.id);
});
