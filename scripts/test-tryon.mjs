import { test } from "node:test";
import assert from "node:assert/strict";
import { tryOnPath, tryOnSteps } from "../src/lib/tryon/steps.ts";

const p = (id, category, image_path = `${id}.jpg`, subcategory = null) => ({ id, category, subcategory, image_path });

test("bottom, then top, then jacket; shoes and bags skipped", () => {
  const s = tryOnSteps([p("shoe", "shoes"), p("coat", "outerwear"), p("tee", "top"), p("jeans", "bottom"), p("bag", "bag")]);
  assert.deepEqual(s, [
    { path: "jeans.jpg", category: "bottoms" },
    { path: "tee.jpg", category: "tops" },
    { path: "coat.jpg", category: "tops" },
  ]);
});

test("a dress replaces top and bottom; pieces without photos are left out", () => {
  assert.deepEqual(tryOnSteps([p("tee", "top"), p("dress", "dress"), p("coat", "outerwear", null)]), [{ path: "dress.jpg", category: "one-pieces" }]);
  assert.deepEqual(tryOnSteps([p("shoe", "shoes")]), []);
});

test("cache path is stable, per user, and changes with the pieces", () => {
  const a = tryOnSteps([p("tee", "top")]);
  const b = tryOnSteps([p("jeans", "bottom")]);
  assert.equal(tryOnPath("u1", "u1/profile/x.jpg", a), tryOnPath("u1", "u1/profile/x.jpg", a));
  assert.notEqual(tryOnPath("u1", "u1/profile/x.jpg", a), tryOnPath("u1", "u1/profile/x.jpg", b));
  assert.ok(tryOnPath("u1", "u1/profile/x.jpg", a).startsWith("u1/tryon/"));
});
