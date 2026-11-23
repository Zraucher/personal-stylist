// Background removal: node --test scripts/test-cutout.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { cutout, originalOf, photoFiles } from "../src/lib/closet/cutout.ts";

// A 40x40 off-white sheet with a soft shadow gradient, and a navy 16x20 "shirt" in the middle.
function photo() {
  const w = 40, h = 40, px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, shirt = x >= 12 && x < 28 && y >= 10 && y < 30, shade = Math.round(y * 0.8);
      px.set(shirt ? [30, 40, 90, 255] : [240 - shade, 236 - shade, 228 - shade, 255], i);
    }
  return { px, w, h };
}

test("the sheet goes, the shirt stays", () => {
  const { px, w, h } = photo();
  const r = cutout(px, w, h);
  assert.equal(px[3], 0, "corner is transparent");
  assert.equal(px[(20 * w + 20) * 4 + 3], 255, "middle of the shirt is solid");
  assert.deepEqual(r.box, { x: 12, y: 10, w: 16, h: 20 });
  assert.ok(Math.abs(r.removed - (1600 - 320) / 1600) < 0.001);
});

test("a garment touching the edge isn't eaten from there", () => {
  const { px, w, h } = photo();
  for (let y = 10; y < 30; y++) for (let x = 0; x < 12; x++) px.set([30, 40, 90, 255], (y * w + x) * 4); // sleeve to the left edge
  cutout(px, w, h);
  assert.equal(px[(20 * w + 0) * 4 + 3] > 0, true);
});

test("cut-out paths keep the original", () => {
  assert.equal(originalOf("u/a.jpg.cutout.webp"), "u/a.jpg");
  assert.equal(originalOf("u/a.jpg"), null);
  assert.deepEqual(photoFiles("u/a.jpg.cutout.png"), ["u/a.jpg.cutout.png", "u/a.jpg"]);
  assert.deepEqual(photoFiles("u/a.jpg"), ["u/a.jpg"]);
  assert.deepEqual(photoFiles(null), []);
});
