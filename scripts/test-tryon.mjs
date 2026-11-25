import { test } from "node:test";
import assert from "node:assert/strict";
import { tryOnPath, tryOnPrompt, tryOnSteps } from "../src/lib/tryon/steps.ts";

const p = (id, category, image_path = `${id}.jpg`, subcategory = null) => ({ id, category, subcategory, image_path });

test("the whole outfit goes in one call: shoes, bag and accessories too", () => {
  const s = tryOnSteps([p("shoe", "shoes"), p("coat", "outerwear"), p("tee", "top"), p("jeans", "bottom"), p("bag", "bag"), p("belt", "accessory"), p("hat", "accessory")]);
  assert.deepEqual(s.map((x) => x.slot), ["shoes", "outer", "top", "bottom", "bag", "extra", "extra"]);
});

test("a dress replaces top and bottom; one per slot; pieces without photos are left out", () => {
  assert.deepEqual(tryOnSteps([p("tee", "top"), p("dress", "dress"), p("jeans", "bottom"), p("coat", "outerwear", null)]), [{ path: "dress.jpg", slot: "dress" }]);
  assert.deepEqual(tryOnSteps([p("t1", "top"), p("t2", "top")]).map((x) => x.path), ["t1.jpg"]);
  assert.deepEqual(tryOnSteps([p("coat", "outerwear", null)]), []);
});

test("caps at 13 pieces (14 images with the body photo)", () => {
  assert.equal(tryOnSteps(Array.from({ length: 20 }, (_, i) => p(`x${i}`, "accessory"))).length, 13);
});

test("prompt numbers the images after the body photo", () => {
  const prompt = tryOnPrompt(tryOnSteps([p("jeans", "bottom"), p("shoe", "shoes")]));
  assert.match(prompt, /Image 1 is the person/);
  assert.match(prompt, /Image 2: the bottoms\. Image 3: the shoes\./);
});

test("cache path is stable, per user, and changes with the pieces", () => {
  const a = tryOnSteps([p("tee", "top")]);
  const b = tryOnSteps([p("jeans", "bottom")]);
  assert.equal(tryOnPath("u1", "u1/profile/x.jpg", a), tryOnPath("u1", "u1/profile/x.jpg", a));
  assert.notEqual(tryOnPath("u1", "u1/profile/x.jpg", a), tryOnPath("u1", "u1/profile/x.jpg", b));
  assert.ok(tryOnPath("u1", "u1/profile/x.jpg", a).startsWith("u1/tryon/"));
});

test("sends the original photo when the piece has our cut-out", () => {
  assert.deepEqual(tryOnSteps([p("tee", "top", "u/a.jpg.cutout.webp")]), [{ path: "u/a.jpg", slot: "top" }]);
});
