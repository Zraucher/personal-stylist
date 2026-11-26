// Run: node --test scripts/test-setup.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { setupSteps } from "../src/lib/profile/setup.ts";

test("a new person has all three steps open", () => {
  const s = setupSteps({ location: null, closetSize: 0, hasPalette: false });
  assert.deepEqual(s.map((x) => x.done), [false, false, false]);
});
test("steps close as the profile fills in", () => {
  const s = setupSteps({ location: " Las Vegas ", closetSize: 8, hasPalette: true });
  assert.ok(s.every((x) => x.done));
  assert.equal(setupSteps({ location: "  ", closetSize: 7, hasPalette: false }).filter((x) => x.done).length, 0);
});
