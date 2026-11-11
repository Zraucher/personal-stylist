// Run: node --test scripts/test-composition.mjs   (Node 22.18+ strips the types)
import test from "node:test";
import assert from "node:assert/strict";
import { checkOutfit, structurePoints, softPoints } from "../src/lib/outfit/composition.ts";

const valColor = {
  confidence: "high",
  best_colors: ["warm taupe", "camel", "greige", "soft ivory", "terracotta", "muted rust", "warm sand", "sage", "olive", "muted teal", "slate", "ochre", "soft gold", "dusty peach"],
  avoid_colors: ["bright or saturated tones", "stark white", "true black", "icy cool tones"],
};
const valStyle = {
  dislikes: ["ruffles", "polka dots", "peplums"],
  fabrics_avoid: [{ name: "linen", strength: "hard" }, { name: "polyester", strength: "hard" }],
  fabrics_preferred: [{ name: "silk", strength: "soft" }],
  silhouettes_avoid: [],
  silhouettes_preferred: ["wide-leg pants"],
};

let n = 0;
const piece = (o) => ({
  id: `i${++n}`, name: null, subcategory: null, category: null, colors: [], pattern: null, material: null,
  construction: [], formality: null, warmth: null, verdict: null, ...o,
});
const get = (c, id) => c.checks.find((x) => x.id === id);

// A buttoned-up outfit: the plan's acceptance case.
const dressShirt = piece({ name: "White dress shirt", category: "top", subcategory: "dress shirt", construction: ["collar", "button-front"], colors: [{ name: "soft ivory" }], formality: 4 });
const blazer = piece({ name: "Navy blazer", category: "outerwear", subcategory: "blazer", colors: [{ name: "navy" }], formality: 4 });
const pleated = piece({ name: "Pleated trousers", category: "bottom", subcategory: "trousers", construction: ["pleats"], colors: [{ name: "charcoal" }], formality: 4 });
const oxfords = piece({ name: "Oxfords", category: "shoes", subcategory: "dress shoes", colors: [{ name: "brown" }], formality: 4 });

test("structure and softness points", () => {
  assert.equal(structurePoints(dressShirt), 3);
  assert.equal(structurePoints(piece({ subcategory: "tee" })), 0);
  assert.ok(softPoints(piece({ subcategory: "tee", construction: ["relaxed"] })) >= 2);
});

test("buttoned-up outfit: counterbalance fires and the outfit needs rework", () => {
  const c = checkOutfit([dressShirt, blazer, pleated, oxfords], valColor, valStyle);
  assert.equal(get(c, "counterbalance").status, "fail");
  assert.match(get(c, "counterbalance").reason, /buttoned-up/i);
  assert.ok(get(c, "counterbalance").fix);
  assert.equal(c.overall, "rework");
});

test("swapping in a relaxed knit fixes the counterbalance", () => {
  const knit = piece({ name: "Cable knit sweater", category: "top", subcategory: "sweater", construction: ["cable knit", "relaxed"], colors: [{ name: "soft ivory" }], formality: 3 });
  const c = checkOutfit([knit, blazer, pleated, oxfords], valColor, valStyle);
  assert.equal(get(c, "counterbalance").status, "good");
});

test("contrast: fitted on fitted is flagged, fitted with relaxed is praised", () => {
  const slimTop = piece({ category: "top", subcategory: "henley", construction: ["slim"], colors: [{ name: "olive" }] });
  const slimBottom = piece({ category: "bottom", subcategory: "trousers", construction: ["slim"], colors: [{ name: "camel" }] });
  const wide = piece({ category: "bottom", subcategory: "wide-leg pants", construction: ["wide-leg", "high-waisted"], colors: [{ name: "camel" }] });
  assert.equal(get(checkOutfit([slimTop, slimBottom], valColor, valStyle), "contrast").status, "caution");
  assert.equal(get(checkOutfit([slimTop, wide], valColor, valStyle), "contrast").status, "good");
});

test("contrast: relaxed on relaxed needs a defined waist", () => {
  const tee = piece({ category: "top", subcategory: "tee", construction: ["relaxed"], colors: [{ name: "olive" }] });
  const baggy = piece({ category: "bottom", subcategory: "joggers", construction: ["relaxed"], colors: [{ name: "camel" }] });
  assert.equal(get(checkOutfit([tee, baggy], valColor, valStyle), "contrast").status, "caution");
});

test("contrast: two patterns collide, one pattern is fine", () => {
  const stripeTop = piece({ category: "top", subcategory: "tee", pattern: "stripe", colors: [{ name: "navy" }] });
  const plaidBottom = piece({ category: "bottom", subcategory: "trousers", pattern: "plaid", colors: [{ name: "camel" }] });
  const solidBottom = piece({ category: "bottom", subcategory: "trousers", pattern: "solid", colors: [{ name: "camel" }] });
  assert.equal(get(checkOutfit([stripeTop, plaidBottom], valColor, valStyle), "contrast").status, "caution");
  assert.equal(get(checkOutfit([stripeTop, solidBottom], valColor, valStyle), "contrast").status, "good");
});

test("palette: true black near the face fails for Val, far from the face only flags", () => {
  const blackTop = piece({ category: "top", subcategory: "tee", colors: [{ name: "black", hex: "#121212" }] });
  const blackPants = piece({ category: "bottom", subcategory: "trousers", colors: [{ name: "black", hex: "#121212" }] });
  const camelTop = piece({ category: "top", subcategory: "tee", colors: [{ name: "camel" }] });
  assert.equal(get(checkOutfit([blackTop, piece({ category: "bottom", colors: [{ name: "camel" }] })], valColor, valStyle), "palette").status, "fail");
  assert.equal(get(checkOutfit([camelTop, blackPants], valColor, valStyle), "palette").status, "caution");
});

test("palette: too many accent colors", () => {
  const items = [
    piece({ category: "top", subcategory: "tee", colors: [{ name: "terracotta" }] }),
    piece({ category: "bottom", subcategory: "trousers", colors: [{ name: "sage" }] }),
    piece({ category: "outerwear", subcategory: "jacket", colors: [{ name: "plum" }] }),
  ];
  const c = checkOutfit(items, null, null);
  assert.equal(get(c, "palette").status, "caution");
  assert.match(get(c, "palette").reason, /accent/);
});

test("your rules: a hard fabric avoid fails the outfit", () => {
  const linen = piece({ name: "Linen shirt", category: "top", subcategory: "button-up shirt", material: "linen", colors: [{ name: "olive" }] });
  const c = checkOutfit([linen, piece({ category: "bottom", colors: [{ name: "camel" }] })], valColor, valStyle);
  assert.equal(get(c, "personal").status, "fail");
  assert.equal(c.overall, "rework");
});

test("level: shorts with a wool coat flag warmth, black tie with sneakers flags formality", () => {
  const shorts = piece({ category: "bottom", subcategory: "shorts", warmth: 1, formality: 2, colors: [{ name: "camel" }] });
  const sweater = piece({ category: "top", subcategory: "sweater", warmth: 5, formality: 2, colors: [{ name: "olive" }] });
  assert.equal(get(checkOutfit([sweater, shorts], valColor, valStyle), "level").status, "caution");
  const suit = piece({ category: "dress", subcategory: "suit", formality: 5, colors: [{ name: "navy" }] });
  const slides = piece({ category: "shoes", subcategory: "slides", formality: 1, colors: [{ name: "camel" }] });
  assert.equal(get(checkOutfit([suit, slides], valColor, valStyle), "level").status, "caution");
});

test("incomplete outfits say what is missing", () => {
  const c = checkOutfit([piece({ category: "top", subcategory: "tee" })], valColor, valStyle);
  assert.equal(c.overall, "incomplete");
  assert.match(c.headline, /bottom/);
  assert.equal(c.checks.length, 1);
});

test("a balanced in-palette outfit is strong", () => {
  const tee = piece({ category: "top", subcategory: "tee", construction: ["relaxed", "crew neck"], colors: [{ name: "soft ivory" }], formality: 2, warmth: 2 });
  const wide = piece({ category: "bottom", subcategory: "wide-leg pants", construction: ["wide-leg", "high-waisted"], colors: [{ name: "camel" }], formality: 2, warmth: 3 });
  const flats = piece({ category: "shoes", subcategory: "flats", colors: [{ name: "taupe" }], formality: 2, warmth: 2 });
  const c = checkOutfit([tee, wide, flats], valColor, valStyle);
  assert.equal(c.overall, "strong", JSON.stringify(c.checks.filter((x) => x.status !== "good")));
});

test("scorecard cut verdict is noted", () => {
  const tee = piece({ category: "top", subcategory: "tee", construction: ["crew neck"], colors: [{ name: "soft ivory" }], verdict: "cut" });
  const wide = piece({ category: "bottom", subcategory: "wide-leg pants", construction: ["wide-leg"], colors: [{ name: "camel" }] });
  const c = checkOutfit([tee, wide], valColor, valStyle);
  assert.equal(get(c, "verdicts").status, "caution");
});
