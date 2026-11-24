import { test } from "node:test";
import assert from "node:assert/strict";
import { priceAlertEmail, unsubscribeSig, validUnsubscribe } from "../src/lib/email/alerts.ts";

test("alert email escapes product names and counts alerts", () => {
  const m = priceAlertEmail(["<b>Coat</b> is $80", "Boots hit your price"], "https://x.test", "https://x.test/u?a=1&b=2");
  assert.equal(m.subject, "2 price alerts");
  assert.ok(!m.html.includes("<b>Coat"));
  assert.ok(m.html.includes("a=1&#38;b=2"));
  assert.equal(priceAlertEmail(["one"], "s", "u").subject, "Price alert");
});

test("unsubscribe signature only matches its own user and secret", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  const sig = unsubscribeSig(id, "k");
  assert.ok(validUnsubscribe(id, sig, "k"));
  assert.ok(!validUnsubscribe(id, sig, "other"));
  assert.ok(!validUnsubscribe("22222222-2222-2222-2222-222222222222", sig, "k"));
  assert.ok(!validUnsubscribe(id, "short", "k"));
});
