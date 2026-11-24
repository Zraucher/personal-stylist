// Run: node --test scripts/test-plan.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { daysBetween, packingList, planSequence, roleOf, tripExtras, tripLooks } from "../src/lib/plan/sequence.ts";
import { computeInsights } from "../src/lib/insights/compute.ts";
import { firstName, tally } from "../src/lib/opinions/tally.ts";

const p = (id, category, subcategory) => ({ id, name: id, category, subcategory, colors: [{ name: "navy" }] });
const t1 = p("t1", "top", "tee"), t2 = p("t2", "top", "polo"), t3 = p("t3", "top", "oxford");
const b1 = p("b1", "bottom", "chinos"), b2 = p("b2", "bottom", "jeans");
const s1 = p("s1", "shoes", "sneakers"), s2 = p("s2", "shoes", "loafers");
const c = (items, score = 40) => ({ items, score, composition: { overall: "strong", headline: "", checks: [] }, layered: false });

test("roles come from category and subcategory", () => {
  assert.equal(roleOf(t1), "top");
  assert.equal(roleOf(p("j", "top", "jacket")), "layer");
  assert.equal(roleOf(s1), "shoes");
});

test("a week plan does not repeat a top when it has a choice", () => {
  const day = [c([t1, b1, s1], 45), c([t2, b1, s1], 44), c([t3, b2, s2], 43)];
  const picks = planSequence([day, day, day]);
  const tops = picks.map((i) => day[i].items[0].id);
  assert.equal(new Set(tops).size, 3);
});

test("fixed days stay and steer their neighbours", () => {
  const day = [c([t1, b1, s1], 45), c([t2, b2, s1], 40)];
  const picks = planSequence([day, day], { fixed: [["t1", "b1", "s1"], null] });
  assert.equal(picks[0], -1);
  assert.equal(day[picks[1]].items[0].id, "t2");
});

test("capsule mode prefers reusing bottoms already packed", () => {
  const day1 = [c([t1, b1, s1], 45)];
  const day2 = [c([t2, b2, s2], 45), c([t2, b1, s1], 43)];
  const picks = planSequence([day1, day2], { capsule: true });
  assert.deepEqual(day2[picks[1]].items.map((x) => x.id), ["t2", "b1", "s1"]);
});

test("packing list counts looks per piece and groups by role", () => {
  const pieces = new Map([t1, t2, b1, s1].map((x) => [x.id, x]));
  const list = packingList([{ item_ids: ["t1", "b1", "s1"] }, { item_ids: ["t2", "b1", "s1"] }], pieces);
  assert.deepEqual(list.map((e) => e.id), ["t1", "t2", "b1", "s1"]);
  assert.equal(list.find((e) => e.id === "b1").looks, 2);
});

test("trip looks: travel at both ends, dinners, one event", () => {
  const looks = tripLooks("2026-12-01", "2026-12-04", { daytime: "casual", nights: true, event: true });
  assert.equal(daysBetween("2026-12-01", "2026-12-04").length, 4);
  assert.equal(looks[0].occasion, "travel");
  assert.equal(looks[looks.length - 1].occasion, "travel");
  assert.equal(looks.filter((l) => l.occasion === "event").length, 1);
  assert.ok(!looks.some((l) => l.date === "2026-12-04" && l.label === "Dinner"));
  assert.ok(tripExtras(3, [{ uvMax: 8, rainMax: 60, feelsMin: 70 }]).includes("Umbrella or rain shell"));
});

test("insights: cost per wear, sleepers and balance", () => {
  const items = [
    { ...t1, price: 40, status: "available", createdAt: "2026-01-01", verdict: "keep" },
    { ...t2, price: 120, status: "available", createdAt: "2026-01-01", verdict: null },
    { ...t3, price: null, status: "available", createdAt: "2026-01-01", verdict: "cut" },
    { ...p("t4", "top", "tee"), price: null, status: "available", createdAt: "2026-01-01", verdict: null },
    { ...b1, price: 80, status: "available", createdAt: "2026-11-10", verdict: null },
    { ...s1, price: null, status: "gone", createdAt: "2026-01-01", verdict: null },
  ];
  const wears = [
    { itemId: "t1", wornOn: "2026-11-20" },
    { itemId: "t1", wornOn: "2026-11-10" },
    { itemId: "t2", wornOn: "2026-06-01" },
    { itemId: "s1", wornOn: "2026-11-20" },
  ];
  const r = computeInsights(items, wears, "2026-11-21", { best_colors: ["navy"], avoid_colors: [], confidence: "high" });
  assert.equal(r.active, 5);
  assert.equal(r.wearsLast30, 2);
  assert.equal(r.bestValue[0].id, "t1");
  assert.equal(r.bestValue[0].cpw, 20);
  assert.ok(r.worstValue.some((x) => x.id === "b1"));
  assert.ok(r.sleepers.some((x) => x.id === "t2" && x.days > 60));
  assert.ok(r.sleepers.some((x) => x.id === "t4" && x.days === null));
  assert.ok(!r.sleepers.some((x) => x.id === "t3"), "cut pieces are not sleepers");
  assert.ok(!r.sleepers.some((x) => x.id === "b1"), "new pieces are not sleepers");
  assert.match(r.balanceHint ?? "", /bottom/);
  assert.equal(r.palette.in, 5);
  assert.equal(r.verdicts.works, 1);
});

test("vote tally and public first names", () => {
  assert.equal(tally([]).summary, "No votes yet");
  assert.equal(tally([{ verdict: "works" }, { verdict: "works" }]).summary, "Everyone says works on you");
  const t = tally([{ verdict: "works" }, { verdict: "not" }, { verdict: "works" }]);
  assert.equal(t.leading, "works");
  assert.match(t.summary, /2 of 3/);
  assert.equal(tally([{ verdict: "works" }, { verdict: "not" }]).leading, null);
  assert.equal(firstName("Zack Raucher"), "Zack");
  assert.equal(firstName("zack@example.com"), "your friend");
});

test("trip events replace the slot's look and carry their dress code and style", async () => {
  const { tripLooks: tl } = await import("../src/lib/plan/sequence.ts");
  const looks = tl("2026-12-01", "2026-12-03", {
    daytime: "casual",
    nights: true,
    event: false,
    events: [
      { date: "2026-12-02", when: "evening", name: "Wedding", dress: "black-tie", vibe: null },
      { date: "2026-12-02", when: "day", name: "Ranch tour", dress: "casual", vibe: "western" },
    ],
  });
  const wed = looks.find((l) => l.key === "2026-12-02-night");
  assert.deepEqual([wed.occasion, wed.band, wed.label], ["event", [5, 5], "Wedding · Black tie"]);
  assert.equal(looks.find((l) => l.key === "2026-12-02-day").vibe, "western");
  assert.equal(looks.filter((l) => l.label === "Dinner").length, 1); // only the first night still gets a plain dinner
});

test("vibe words expand common aesthetics and match pieces", async () => {
  const { vibeWords, vibeHits } = await import("../src/lib/plan/sequence.ts");
  const w = vibeWords("Beachy, all white");
  assert.ok(w.includes("linen") && w.includes("white") && !w.includes("all"));
  assert.equal(vibeHits([p("x", "top", "linen shirt"), t1, { ...b1, colors: [{ name: "white" }] }], w), 2);
});

test("capsule trips reuse shoes and skip a second bulky coat", () => {
  const coat1 = p("c1", "outerwear", "wool coat"), coat2 = p("c2", "outerwear", "puffer coat");
  const day1 = [c([t1, b1, s1, coat1], 45)];
  const day2 = [c([t2, b2, s2, coat2], 46), c([t2, b2, s1, coat1], 44)];
  const picks = planSequence([day1, day2], { capsule: true });
  assert.deepEqual(day2[picks[1]].items.map((x) => x.id), ["t2", "b2", "s1", "c1"]);
});

test("packing tips count pieces, shoes and suggest wearing bulk on travel days", async () => {
  const { packingTips } = await import("../src/lib/plan/sequence.ts");
  const coat = p("c1", "outerwear", "wool coat");
  const pieces = new Map([t1, t2, b1, s1, coat].map((x) => [x.id, x]));
  const tips = packingTips(
    [
      { item_ids: ["t1", "b1", "s1", "c1"], occasion: "travel" },
      { item_ids: ["t2", "b1", "s1"], occasion: "casual" },
      { item_ids: ["t1", "b1", "s1"], occasion: "dinner" },
    ],
    pieces
  );
  assert.equal(tips[0], "5 pieces make 3 looks.");
  assert.ok(tips.includes("1 pair of shoes covers every look."));
  assert.ok(tips.some((t) => t.includes("wool coat") || t.includes("c1")));
});
