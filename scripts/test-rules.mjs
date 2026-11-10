// Run: node --test scripts/test-rules.mjs   (Node 22.18+ strips the types from rules.ts)
import test from "node:test";
import assert from "node:assert/strict";
import { scoreRules, decideVerdict, untestableDislikes, lexiconHex } from "../src/lib/scorecard/rules.ts";

// Seeded profiles, copied from supabase/migrations/0003_seed_data.sql
const valColor = {
  confidence: "high",
  best_colors: ["warm taupe", "camel", "greige", "soft ivory", "terracotta", "muted rust", "warm sand", "sage", "olive", "muted teal", "slate", "ochre", "soft gold", "dusty peach"],
  avoid_colors: ["bright or saturated tones", "stark white", "true black", "icy cool tones", "acidic or cool-reading colors such as saturated chartreuse"],
};
const valStyle = {
  dislikes: ["ruffles", "polka dots", "tiered hems", "ruching", "smocking", "peplums", "scalloped hems", "elasticated or gathered waists", "overly preppy looks", "girly or sweet looks", "costumey or chaotic execution", "column silhouettes without contrast"],
  fabrics_avoid: [{ name: "linen", strength: "hard" }, { name: "polyester", strength: "hard" }, { name: "itchy wool", strength: "hard" }, { name: "stretch denim", note: "preference, revisit situationally", strength: "soft" }],
  fabrics_preferred: [{ name: "silk", strength: "soft" }, { name: "viscose", strength: "soft" }, { name: "soft cotton", strength: "soft" }, { name: "cashmere", strength: "soft" }, { name: "silky textures", strength: "soft" }, { name: "stiff structured denim", strength: "soft" }],
  silhouettes_avoid: ["column silhouettes without contrast", "peplum", "tiered"],
  silhouettes_preferred: ["high-waisted bottoms", "wide-leg pants", "defined-waist shapes", "fitted ribbed tanks", "loose or oversized tees", "cropped tops", "fitted long-sleeves"],
};
const zackColor = { confidence: "low", best_colors: ["black", "onyx", "midnight black", "heathered black", "deep navy (Total Eclipse)", "white", "blue"], avoid_colors: [] };
const zackStyle = {
  dislikes: ["stiff or heavy fabrics", "overly structured tailoring", "running-shoe styling with casual wear"],
  fabrics_avoid: [{ name: "heavy or stiff fabrics", strength: "soft" }],
  fabrics_preferred: [{ name: "stretch", strength: "soft" }, { name: "performance knit", strength: "soft" }, { name: "lightweight", strength: "soft" }, { name: "non-iron cotton", strength: "soft" }],
  silhouettes_avoid: [],
  silhouettes_preferred: ["modern knit polo cut", "slim-straight stretch trousers", "lightweight hoodie as a mid-layer"],
};

const item = (o) => ({ name: null, subcategory: null, colors: [], pattern: null, material: null, construction: [], ...o });

test("lexicon resolves seed names", () => {
  assert.ok(lexiconHex("deep navy (Total Eclipse)"));
  assert.ok(lexiconHex("heathered black"));
  assert.ok(lexiconHex("muted rust"));
  assert.equal(lexiconHex("nonsense"), null);
});

test("Val: olive silk cami passes everything", () => {
  const r = scoreRules(item({ name: "Silk cami", colors: [{ name: "olive", hex: "#6b705c" }], material: "silk" }), valColor, valStyle);
  assert.equal(r.palette.status, "good");
  assert.equal(r.fabric.status, "good");
  assert.equal(r.silhouette.status, "ok");
});

test("Val: true black and stark white are on her avoid list", () => {
  const black = scoreRules(item({ colors: [{ name: "black", hex: "#121212" }] }), valColor, valStyle);
  const white = scoreRules(item({ colors: [{ name: "white", hex: "#f5f5f0" }] }), valColor, valStyle);
  assert.equal(black.palette.status, "fail");
  assert.equal(white.palette.status, "fail");
  const ivory = scoreRules(item({ colors: [{ name: "soft ivory" }] }), valColor, valStyle);
  assert.notEqual(ivory.palette.status, "fail");
});

test("Val: a saturated red fails the saturated-tones rule", () => {
  const r = scoreRules(item({ colors: [{ name: "bright red", hex: "#d4162a" }] }), valColor, valStyle);
  assert.equal(r.palette.status, "fail");
});

test("Val: linen and polyester are hard fabric fails, stretch denim is a caution", () => {
  assert.equal(scoreRules(item({ material: "linen blend" }), valColor, valStyle).fabric.hard, true);
  assert.equal(scoreRules(item({ material: "polyester" }), valColor, valStyle).fabric.status, "fail");
  assert.equal(scoreRules(item({ material: "stretch denim" }), valColor, valStyle).fabric.status, "caution");
  assert.equal(scoreRules(item({ material: "rigid denim" }), valColor, valStyle).fabric.status, "good");
  assert.equal(scoreRules(item({ material: "merino wool" }), valColor, valStyle).fabric.status, "ok");
  assert.equal(scoreRules(item({ material: "scratchy wool" }), valColor, valStyle).fabric.status, "fail");
});

test("Val: dislikes fire from construction tags and text", () => {
  assert.equal(scoreRules(item({ construction: ["ruffles"] }), valColor, valStyle).silhouette.status, "fail");
  assert.equal(scoreRules(item({ construction: ["tiered hem"] }), valColor, valStyle).silhouette.status, "fail");
  assert.equal(scoreRules(item({ name: "Polka dot blouse" }), valColor, valStyle).silhouette.status, "fail");
  assert.equal(scoreRules(item({ pattern: "polka dot" }), valColor, valStyle).silhouette.status, "fail");
  assert.equal(scoreRules(item({ construction: ["wide-leg", "high-waisted"], subcategory: "wide-leg pants" }), valColor, valStyle).silhouette.status, "good");
});

test("untestable dislikes are handed to the vibe layer", () => {
  const u = untestableDislikes(valStyle);
  assert.ok(u.includes("overly preppy looks"));
  assert.ok(!u.includes("ruffles"));
});

test("Zack: black performance polo is good on palette and fabric", () => {
  const r = scoreRules(item({ name: "Performance polo", colors: [{ name: "black" }], material: "performance knit", construction: ["polo collar"] }), zackColor, zackStyle);
  assert.equal(r.palette.status, "good");
  assert.equal(r.fabric.status, "good");
  assert.equal(r.silhouette.status, "good");
});

test("Zack: heavy canvas jacket is a soft caution, off-palette orange stays ok at low confidence", () => {
  assert.equal(scoreRules(item({ material: "heavy canvas" }), zackColor, zackStyle).fabric.status, "caution");
  assert.equal(scoreRules(item({ colors: [{ name: "orange" }] }), zackColor, zackStyle).palette.status, "ok");
});

test("no colors means palette unknown", () => {
  assert.equal(scoreRules(item({}), valColor, valStyle).palette.status, "unknown");
});

const rulesOk = scoreRules(item({ colors: [{ name: "olive" }], material: "silk" }), valColor, valStyle);
const rulesHard = scoreRules(item({ colors: [{ name: "olive" }], material: "linen" }), valColor, valStyle);

test("verdict: no photo is always provisional", () => {
  assert.equal(decideVerdict(rulesOk, { rating: "strong", reason: "" }, { hasImage: false }).verdict, "provisional");
});

test("verdict: unclear photo is provisional", () => {
  assert.equal(decideVerdict(rulesOk, { rating: "strong", reason: "" }, { hasImage: true, photoUnclear: true }).verdict, "provisional");
});

test("verdict: vibe fail cuts even when every rule passes (the collared-dress case)", () => {
  assert.equal(decideVerdict(rulesOk, { rating: "fail", reason: "" }, { hasImage: true }).verdict, "cut");
});

test("verdict: a hard rule break stands unless the vibe is strong", () => {
  assert.equal(decideVerdict(rulesHard, { rating: "ok", reason: "" }, { hasImage: true }).verdict, "cut");
  assert.equal(decideVerdict(rulesHard, { rating: "strong", reason: "" }, { hasImage: true }).verdict, "keep");
});

test("verdict: clean pass keeps", () => {
  assert.equal(decideVerdict(rulesOk, { rating: "ok", reason: "" }, { hasImage: true }).verdict, "keep");
});
