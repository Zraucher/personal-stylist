// Price watch helpers: node --test scripts/test-price.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { appendPrice, priceCheckDue, priceDrop } from "../src/lib/retail/price.ts";
import { searchColors } from "../src/lib/retail/synonyms.ts";

test("a drop counts only when it is real money", () => {
  assert.deepEqual(priceDrop(100, 80), { amount: 20, percent: 20 });
  assert.equal(priceDrop(100, 99.5), null, "under a dollar is noise");
  assert.equal(priceDrop(100, 110), null);
  assert.equal(priceDrop(null, 50), null);
});

test("history skips repeats and stays short", () => {
  let h = appendPrice([], 50, "a");
  h = appendPrice(h, 50, "b");
  assert.equal(h.length, 1);
  for (let i = 0; i < 40; i++) h = appendPrice(h, 60 + i, String(i));
  assert.equal(h.length, 30);
});

test("checks are due after 12 hours", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");
  assert.ok(priceCheckDue(null, now));
  assert.ok(!priceCheckDue("2026-11-16T06:00:00Z", now));
  assert.ok(priceCheckDue("2026-11-15T20:00:00Z", now));
});

test("search colors use one word per color family", () => {
  const out = searchColors(["black", "onyx", "midnight black", "deep navy (Total Eclipse)", "white"], 3);
  assert.deepEqual(out, ["black", "deep navy", "white"]);
});
