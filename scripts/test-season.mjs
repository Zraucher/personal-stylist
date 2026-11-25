// Run: node --test scripts/test-season.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { colorSeason, SEASON_NAMES, SKINS, UNDERTONES, HAIRS, EYES } from "../src/lib/profile/season.ts";
import { lexiconHex } from "../src/lib/scorecard/rules.ts";

test("classic looks land in their textbook seasons", () => {
  assert.equal(colorSeason({ skin: "fair", undertone: "unsure", hair: "black", eyes: "blue" }).label, "Bright Winter");
  assert.equal(colorSeason({ skin: "light", undertone: "warm", hair: "golden-blonde", eyes: "green" }).label, "Light Spring");
  assert.equal(colorSeason({ skin: "fair", undertone: "cool", hair: "ash-blonde", eyes: "blue" }).label, "Light Summer");
  assert.equal(colorSeason({ skin: "medium", undertone: "warm", hair: "red", eyes: "hazel" }).label, "Warm Autumn");
  assert.equal(colorSeason({ skin: "deep", undertone: "cool", hair: "black", eyes: "dark-brown" }).label, "Deep Winter");
  assert.equal(colorSeason({ skin: "tan", undertone: "warm", hair: "dark-brown", eyes: "dark-brown" }).label, "Deep Autumn");
  assert.equal(colorSeason({ skin: "light", undertone: "neutral", hair: "light-brown", eyes: "hazel" }).label, "Soft Autumn");
});

test("every combination gives a season whose colors the scorecard can draw", () => {
  const seen = new Set();
  for (const s of SKINS) for (const u of UNDERTONES) for (const h of HAIRS) for (const e of EYES) {
    const r = colorSeason({ skin: s.id, undertone: u.id, hair: h.id, eyes: e.id });
    assert.ok(SEASON_NAMES.includes(r.label), r.label);
    seen.add(r.label);
    for (const c of [...r.best, ...r.avoid]) assert.ok(lexiconHex(c), `${r.label}: ${c} not in lexicon`);
    assert.equal(r.best.filter((c) => r.avoid.includes(c)).length, 0);
  }
  assert.equal(seen.size, 12, [...seen].join(", "));
});
