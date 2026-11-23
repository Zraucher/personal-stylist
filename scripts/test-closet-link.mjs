// Closet from a store link, and mockup layout: node --test scripts/test-closet-link.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { guessCategory } from "../src/lib/closet/guess.ts";
import { layout, slotOf } from "../src/lib/outfit/mockup.ts";

test("category from a product name", () => {
  assert.deepEqual(guessCategory("Men's Wool Runner - Natural Grey"), { category: "shoes", subcategory: "sneakers" });
  assert.deepEqual(guessCategory("Relaxed Denim Jacket"), { category: "outerwear", subcategory: "denim jacket" });
  assert.deepEqual(guessCategory("Linen Midi Dress"), { category: "dress", subcategory: "midi dress" });
  assert.equal(guessCategory("Oxford Dress Shirt")?.subcategory, "dress shirt");
  assert.equal(guessCategory("High Rise Straight Jeans")?.category, "bottom");
  assert.equal(guessCategory("Gift card"), null);
  assert.equal(guessCategory(""), null);
});

test("every piece gets its own spot", () => {
  const look = [{ category: "top" }, { category: "bottom" }, { category: "shoes" }, { category: "outerwear" }];
  for (const mode of ["flatlay", "ghost"]) {
    const boxes = layout(look, mode);
    assert.ok(boxes.every(Boolean), mode);
    assert.equal(new Set(boxes.map((b) => `${b.x},${b.y}`)).size, 4, `${mode}: no two pieces on one spot`);
  }
  const ghost = layout(look, "ghost");
  assert.ok(ghost[0].z > ghost[3].z, "the top sits over the jacket on a ghost model");
});

test("second top becomes the layer, a dress takes top and bottom", () => {
  const two = layout([{ category: "top" }, { category: "top" }, { category: "bottom" }], "ghost");
  assert.ok(two[1].w > two[0].w, "the second top is the wider layer");
  const dress = layout([{ category: "dress" }, { category: "bottom" }, { category: "shoes" }], "flatlay");
  assert.ok(dress[0].h > 60 && dress[1].w < 25, "a bottom with a dress goes to a small spot");
  assert.equal(slotOf({ category: "activewear", subcategory: "leggings" }), "bottom");
  assert.equal(layout(Array.from({ length: 12 }, () => ({ category: "jewelry" })), "flatlay").filter(Boolean).length, 3);
});
