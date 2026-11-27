import { test } from "node:test";
import assert from "node:assert/strict";
import { aalOf, gate, mfaPending, MFA_PATH, passkeyErrorMessage, passwordProblem } from "../src/lib/auth-rules.ts";

const jwt = (payload) => `x.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.y`;

test("aal claim is read from the token; junk gives null", () => {
  assert.equal(aalOf(jwt({ aal: "aal2" })), "aal2");
  assert.equal(aalOf(jwt({ sub: "u" })), null);
  assert.equal(aalOf("nope"), null);
  assert.equal(aalOf(undefined), null);
});

test("mfa is pending only with a verified factor on an aal1 session", () => {
  assert.equal(mfaPending([{ status: "verified", factor_type: "totp" }], "aal1"), true);
  assert.equal(mfaPending([{ status: "verified", factor_type: "totp" }], null), true);
  assert.equal(mfaPending([{ status: "verified", factor_type: "totp" }], "aal2"), false);
  assert.equal(mfaPending([{ status: "unverified", factor_type: "totp" }], "aal1"), false);
  assert.equal(mfaPending([{ status: "verified", factor_type: "webauthn" }], "aal1"), false);
  assert.equal(mfaPending(undefined, "aal1"), false);
});

test("gate: signed out goes to /login from app routes and the verify page", () => {
  assert.equal(gate("/today", false, false), "/login");
  assert.equal(gate("/api/today", false, false), "/login");
  assert.equal(gate(MFA_PATH, false, false), "/login");
  assert.equal(gate("/login", false, false), null);
  assert.equal(gate("/", false, false), null);
});

test("gate: aal1 with a factor reaches only public pages and the verify step", () => {
  assert.equal(gate("/today", true, true), MFA_PATH);
  assert.equal(gate("/profile", true, true), MFA_PATH);
  assert.equal(gate("/api/wishlist/save", true, true), MFA_PATH);
  assert.equal(gate("/login", true, true), MFA_PATH);
  assert.equal(gate(MFA_PATH, true, true), null);
  assert.equal(gate("/auth/signout", true, true), null);
  assert.equal(gate("/privacy", true, true), null);
});

test("gate: fully signed in skips the login and verify pages", () => {
  assert.equal(gate("/login", true, false), "/today");
  assert.equal(gate(MFA_PATH, true, false), "/today");
  assert.equal(gate("/today", true, false), null);
});

test("password rules: 8 to 72 characters, confirm must match", () => {
  assert.match(passwordProblem("short", "short"), /at least 8/);
  assert.match(passwordProblem("x".repeat(73), "x".repeat(73)), /72/);
  assert.match(passwordProblem("longenough", "longenougH"), /don't match/);
  assert.equal(passwordProblem("longenough", "longenough"), null);
});

test("passkey errors map to friendly words", () => {
  assert.match(passkeyErrorMessage({ code: "passkey_disabled" }, "sign in"), /aren't turned on/);
  assert.match(passkeyErrorMessage({ code: "ERROR_CEREMONY_ABORTED" }, "add"), /cancelled/);
  assert.match(passkeyErrorMessage({ code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", cause: { name: "NotAllowedError" } }, "sign in"), /cancelled/);
  assert.match(passkeyErrorMessage({ message: "boom" }, "sign in"), /couldn't sign you in/);
});
