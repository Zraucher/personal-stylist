// Sale alerts and review sizing: node --test scripts/test-shop.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { lowestPrice, priceNews, saleOff } from "../src/lib/retail/price.ts";
import { sizingSignal } from "../src/lib/retail/sizing.ts";

test("a sale needs a real markdown", () => {
  assert.equal(saleOff(100, 75), 25);
  assert.equal(saleOff(100, 97), null, "under 5% is noise");
  assert.equal(saleOff(null, 50), null);
  assert.equal(saleOff(80, 90), null);
});

test("lowest price counts history and today", () => {
  assert.equal(lowestPrice([{ at: "a", price: 90 }, { at: "b", price: 70 }], 80), 70);
  assert.equal(lowestPrice([], null), null);
});

test("alerts only on news", () => {
  const r = { name: "Linen shirt", before: 100, first: 100, target: 80 };
  assert.equal(priceNews(r, 100, null), null, "no change is not news");
  assert.equal(priceNews(r, 79, null), "Linen shirt hit your price: $79");
  assert.equal(priceNews({ ...r, before: 79 }, 78, null), "Linen shirt is $78 (down 22%)", "already under the target: a plain drop");
  assert.equal(priceNews({ ...r, target: null }, 70, 100), "Linen shirt is on sale: $70, was $100");
  assert.equal(priceNews({ ...r, target: null }, 90, null), "Linen shirt is $90 (down 10%)");
  assert.equal(priceNews({ ...r, target: null }, 99.5, null), null, "pennies are not news");
});

test("sizing from reviews", () => {
  assert.equal(sizingSignal(["Runs small, I sized up.", "Too tight in the shoulders, order a size up", "Love the color"]).sizing, "size_up");
  assert.equal(sizingSignal(["Runs large. Went a size down and it's perfect."]).sizing, "size_down");
  assert.equal(sizingSignal(["True to size.", "Fits perfectly, my usual size."]).sizing, "true_to_size");
  assert.equal(sizingSignal(["Runs small", "Runs large", "true to size"]).sizing, "mixed");
  assert.equal(sizingSignal(["Nice shirt", "runs small"]).sizing, "unknown", "one remark is not enough");
});
