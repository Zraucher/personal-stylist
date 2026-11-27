// Run: node --test scripts/test-daily.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { dailyOccasion, dailyReason, dayType, holidayOn, morningDue, usHolidays } from "../src/lib/today/daily.ts";

test("floating holidays land on the right weekday", () => {
  const h = usHolidays(2026);
  assert.equal(h.get("2026-01-19"), "Martin Luther King Jr. Day");
  assert.equal(h.get("2026-02-16"), "Presidents' Day");
  assert.equal(h.get("2026-05-25"), "Memorial Day");
  assert.equal(h.get("2026-09-07"), "Labor Day");
  assert.equal(h.get("2026-10-12"), "Columbus Day");
  assert.equal(h.get("2026-11-26"), "Thanksgiving");
  assert.equal(usHolidays(2025).get("2025-11-27"), "Thanksgiving");
  assert.equal(usHolidays(2024).get("2024-05-27"), "Memorial Day");
});

test("fixed holidays move to the observed weekday", () => {
  // July 4 2026 is a Saturday: observed Friday the 3rd; the day itself still counts.
  assert.equal(holidayOn("2026-07-03"), "Independence Day");
  assert.equal(dayType("2026-07-04"), "holiday");
  // Juneteenth 2027 is a Saturday -> Friday 18th; Christmas 2027 is a Saturday -> Friday 24th.
  assert.equal(holidayOn("2027-06-18"), "Juneteenth");
  assert.equal(holidayOn("2027-12-24"), "Christmas Day");
  // Nov 11 2029 is a Sunday -> Monday the 12th.
  assert.equal(holidayOn("2029-11-12"), "Veterans Day");
  // New Year's 2028 is a Saturday: observed Dec 31 2027.
  assert.equal(holidayOn("2027-12-31"), "New Year's Day");
  assert.equal(holidayOn("2026-12-31"), null);
});

test("day type: holiday beats weekend beats work", () => {
  assert.equal(dayType("2026-11-27"), "work"); // Friday after Thanksgiving is not federal
  assert.equal(dayType("2026-11-28"), "weekend");
  assert.equal(dayType("2026-11-26"), "holiday");
  assert.equal(dayType("2026-12-07"), "work");
});

test("occasion mapping uses the person's own work-day plans", () => {
  assert.equal(dailyOccasion("2026-12-07", []), "office");
  assert.equal(dailyOccasion("2026-12-05", []), "casual");
  assert.equal(dailyOccasion("2026-11-26", [{ date: "2026-11-19", occasion: "office" }]), "casual");
  const history = [
    { date: "2026-11-30", occasion: "casual" },
    { date: "2026-12-01", occasion: "casual" },
    { date: "2026-12-02", occasion: "office" },
    { date: "2026-11-28", occasion: "active" }, // a Saturday
  ];
  assert.equal(dailyOccasion("2026-12-07", history), "casual");
  assert.equal(dailyOccasion("2026-12-05", history), "active");
  assert.equal(dailyOccasion("2026-12-06", history), "casual");
  // Ties go to the most recent; unknown occasions are ignored.
  assert.equal(dailyOccasion("2026-12-07", [{ date: "2026-12-01", occasion: "office" }, { date: "2026-12-02", occasion: "dinner" }, { date: "2026-12-03", occasion: "nope" }]), "dinner");
});

test("reason line", () => {
  assert.equal(dailyReason("2026-12-04", "office", { source: "forecast", feelsMax: 63.6, rainMax: 10 }), "Friday, 64° and dry: office smart casual");
  assert.equal(dailyReason("2026-12-05", "casual", { source: "forecast", feelsMax: 50, rainMax: 60 }), "Saturday, 50° and rain likely: easy casual");
  assert.equal(dailyReason("2026-11-26", "casual", { source: "default", feelsMax: 70, rainMax: 0 }), "Thanksgiving: relaxed holiday casual");
});

test("morning push goes out once, in the 6 o'clock hour", () => {
  assert.equal(morningDue(6, null), true);
  assert.equal(morningDue(7, null), false);
  assert.equal(morningDue(5, null), false);
  assert.equal(morningDue(6, "2026-12-04T14:30:00Z"), false);
});
