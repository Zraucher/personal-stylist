// Outfit of the day: what kind of day it is, which occasion that means, and the one-line why.
// Pure; imports with .ts so plain Node can run the tests (scripts/test-daily.mjs).

import { OCCASIONS, type Occasion } from "./candidates.ts";

export type DayType = "work" | "weekend" | "holiday";

const ymd = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
const dow = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** The nth (1-based) weekday of a month, or the last one when n is -1. */
function nthWeekday(y: number, m: number, weekday: number, n: number): string {
  if (n === -1) {
    const last = new Date(Date.UTC(y, m, 0));
    return ymd(y, m, last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7));
  }
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  return ymd(y, m, 1 + ((weekday - first + 7) % 7) + (n - 1) * 7);
}

/** A Saturday holiday is observed the Friday before, a Sunday one the Monday after. */
function observed(date: string): string {
  const d = dow(date);
  const t = new Date(`${date}T12:00:00Z`);
  if (d === 6) t.setUTCDate(t.getUTCDate() - 1);
  else if (d === 0) t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

/** US federal holidays for a year: date -> name. Both the actual and the observed date count. */
export function usHolidays(year: number): Map<string, string> {
  const out = new Map<string, string>();
  const fixed: Array<[number, number, string]> = [
    [1, 1, "New Year's Day"],
    [6, 19, "Juneteenth"],
    [7, 4, "Independence Day"],
    [11, 11, "Veterans Day"],
    [12, 25, "Christmas Day"],
  ];
  for (const [m, d, name] of fixed) {
    const actual = ymd(year, m, d);
    out.set(actual, name);
    out.set(observed(actual), name);
  }
  out.set(nthWeekday(year, 1, 1, 3), "Martin Luther King Jr. Day");
  out.set(nthWeekday(year, 2, 1, 3), "Presidents' Day");
  out.set(nthWeekday(year, 5, 1, -1), "Memorial Day");
  out.set(nthWeekday(year, 9, 1, 1), "Labor Day");
  out.set(nthWeekday(year, 10, 1, 2), "Columbus Day");
  out.set(nthWeekday(year, 11, 4, 4), "Thanksgiving");
  return out;
}

/** The holiday on a date, if any. Checks next year too: New Year's on a Saturday is observed Dec 31. */
export function holidayOn(date: string): string | null {
  const y = Number(date.slice(0, 4));
  return usHolidays(y).get(date) ?? (date.endsWith("-12-31") ? usHolidays(y + 1).get(date) ?? null : null);
}

export function dayType(date: string): DayType {
  if (holidayOn(date)) return "holiday";
  const d = dow(date);
  return d === 0 || d === 6 ? "weekend" : "work";
}

const VALID = new Set<string>(OCCASIONS.map((o) => o.id));

/**
 * The occasion for the day. Work days use what the person has planned most on work days
 * lately (their own say), else office. Weekends use what they chose on the same weekday lately,
 * else casual. Holidays are casual.
 */
export function dailyOccasion(date: string, history: Array<{ date: string; occasion: string }>): Occasion {
  const type = dayType(date);
  if (type === "holiday") return "casual";
  const valid = history.filter((h) => VALID.has(h.occasion) && h.date < date).sort((a, b) => (a.date < b.date ? 1 : -1));
  if (type === "weekend") return (valid.find((h) => dow(h.date) === dow(date))?.occasion as Occasion | undefined) ?? "casual";
  const work = valid.filter((h) => dayType(h.date) === "work");
  if (!work.length) return "office";
  const counts = new Map<string, number>();
  for (const h of work) counts.set(h.occasion, (counts.get(h.occasion) ?? 0) + 1);
  // Most planned wins; ties go to the most recent (work is newest first).
  return work.reduce((best, h) => ((counts.get(h.occasion) ?? 0) > (counts.get(best) ?? 0) ? h.occasion : best), work[0].occasion) as Occasion;
}

const PHRASE: Record<Occasion, string> = {
  office: "office smart casual",
  casual: "easy casual",
  dinner: "dinner-ready",
  event: "dressed up",
  active: "active and easy",
  travel: "travel comfort",
};

type Weather = { source: string; feelsMax: number; rainMax: number } | null;

/** "Friday, 64° and dry: office smart casual". The temperature shows only for a real forecast. */
export function dailyReason(date: string, occasion: Occasion, weather: Weather): string {
  const holiday = holidayOn(date);
  const day = holiday ?? new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const sky = weather && weather.source === "forecast" ? `, ${Math.round(weather.feelsMax)}° and ${weather.rainMax >= 50 ? "rain likely" : weather.rainMax >= 30 ? "a chance of rain" : "dry"}` : "";
  return `${day}${sky}: ${holiday && occasion === "casual" ? "relaxed holiday casual" : PHRASE[occasion]}`;
}

/** The morning push goes out in the 6 o'clock hour (the job runs at :30), once a day. */
export const MORNING_HOUR = 6;
export const morningDue = (localHour: number, notifiedAt: string | null | undefined): boolean => localHour === MORNING_HOUR && !notifiedAt;
