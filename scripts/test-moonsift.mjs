import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeFields, decodeValue, mapItem, parseMoonsiftUrl, parsePrice, webUrl } from "../src/lib/moonsift/parse.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/moonsift-item.json", import.meta.url), "utf8"));

test("parses collection and profile links in any shape", () => {
  const col = { kind: "collection", username: "zack_raucher2025", collectionId: "YVJ4w0pNrzkbyf747ocM" };
  for (const s of ["https://www.moonsift.com/collection/zack_raucher2025/YVJ4w0pNrzkbyf747ocM", "moonsift.com/collection/zack_raucher2025/YVJ4w0pNrzkbyf747ocM/", "http://moonsift.com/collection/zack_raucher2025/YVJ4w0pNrzkbyf747ocM?ref=share#x", "  www.moonsift.com/collection/zack_raucher2025/YVJ4w0pNrzkbyf747ocM  "])
    assert.deepEqual(parseMoonsiftUrl(s), col, s);
  for (const s of ["https://www.moonsift.com/@zack_raucher2025", "moonsift.com/@zack_raucher2025/?tab=1"]) assert.deepEqual(parseMoonsiftUrl(s), { kind: "profile", username: "zack_raucher2025" }, s);
});

test("rejects other sites and other moonsift pages", () => {
  for (const s of ["https://evilmoonsift.com/@a", "https://moonsift.com.evil.io/@a", "https://example.com/collection/a/b", "https://www.moonsift.com/", "https://www.moonsift.com/collection/a", "javascript:alert(1)", "ftp://moonsift.com/@a", "", null])
    assert.equal(parseMoonsiftUrl(s), null, String(s));
});

test("decodes Firestore values", () => {
  assert.equal(decodeValue({ integerValue: "10" }), 10);
  assert.equal(decodeValue({ booleanValue: false }), false);
  assert.equal(decodeValue({ timestampValue: "2026-01-01T00:00:00Z" }), "2026-01-01T00:00:00Z");
  assert.equal(decodeValue({ nullValue: null }), null);
  assert.deepEqual(decodeValue({ arrayValue: {} }), []);
  assert.deepEqual(decodeFields({ m: { mapValue: { fields: { a: { arrayValue: { values: [{ stringValue: "x" }, { integerValue: "2" }] } } } } } }), { m: { a: ["x", 2] } });
});

test("parses Moonsift prices to the lowest amount", () => {
  assert.deepEqual(parsePrice("$US105"), { amount: 105, currency: "USD" });
  assert.deepEqual(parsePrice("$34 to $40"), { amount: 34, currency: "USD" });
  assert.deepEqual(parsePrice("Current price $24.99; 30% off; was $35.70"), { amount: 24.99, currency: "USD" });
  assert.deepEqual(parsePrice("£1,250.00"), { amount: 1250, currency: "GBP" });
  assert.deepEqual(parsePrice("€ 59"), { amount: 59, currency: "EUR" });
  assert.equal(parsePrice(""), null);
  assert.equal(parsePrice("30% off"), null);
  assert.equal(parsePrice(undefined), null);
});

test("only keeps http(s) links", () => {
  assert.equal(webUrl("javascript:alert(1)"), null);
  assert.equal(webUrl("data:image/png;base64,xx"), null);
  assert.equal(webUrl("shop.com/a"), "https://shop.com/a");
  assert.equal(webUrl("x".repeat(3000)), null);
});

test("maps a Moonsift item to wishlist columns", () => {
  assert.deepEqual(mapItem(decodeFields(fixture.fields)), {
    url: "https://shop.example/product/linen-shirt/?utm_source=moonsift",
    name: "Linen Shirt - SHOP",
    brand: "shop.example",
    imageUrl: "https://storage.googleapis.com/moonsift-web-product-images/moonimage_otLRZphoyyhZWccPImpE.jpg",
    price: 24.99,
    currency: "USD",
    createdAt: "2026-08-23T19:24:04.978Z",
  });
});

test("falls back to page_url and best image, drops items without a link", () => {
  const f = decodeFields(fixture.fields);
  const it = mapItem({ ...f, product_image: "../evil", scrape_data: { best_image: { sources: ["javascript:x"] }, best_price: "" } });
  assert.equal(it.url, "https://shop.example/product/linen-shirt/");
  assert.equal(it.imageUrl, "https://shop.example/img/a.jpg");
  assert.equal(it.price, null);
  assert.equal(mapItem({ page_url: "not a url", scrape_data: {} }), null);
});
