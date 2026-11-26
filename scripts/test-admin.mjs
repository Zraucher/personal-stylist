import { test } from "node:test";
import assert from "node:assert/strict";
import { isAdmin } from "../src/lib/admin.ts";

test("admin allowlist: case-insensitive, trimmed, empty means nobody", () => {
  assert.equal(isAdmin("Z@x.com", " a@x.com, z@X.com "), true);
  assert.equal(isAdmin("b@x.com", "a@x.com,z@x.com"), false);
  assert.equal(isAdmin("a@x.com", ""), false);
  assert.equal(isAdmin("a@x.com", undefined), false);
  assert.equal(isAdmin(null, "a@x.com"), false);
});
