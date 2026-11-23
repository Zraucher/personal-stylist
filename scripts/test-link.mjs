import test from "node:test";
import assert from "node:assert/strict";
import { cleanLink } from "../src/lib/retail/link.ts";

test("pulls the link out of share text and drops trackers", () => {
  assert.equal(cleanLink(null, "Linen shirt https://shop.com/p/shirt?color=blue&utm_source=ig&fbclid=x#reviews."), "https://shop.com/p/shirt?color=blue");
});
test("accepts a bare domain paste and upgrades http", () => {
  assert.equal(cleanLink("shop.com/p/shirt"), "https://shop.com/p/shirt");
  assert.equal(cleanLink("http://shop.com/a"), "https://shop.com/a");
});
test("returns null when there is no link", () => {
  assert.equal(cleanLink("", "a nice shirt", undefined), null);
});
