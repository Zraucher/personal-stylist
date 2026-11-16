// Price watch helpers. Pure; imports nothing server-only so plain Node can test them.

export type PricePoint = { at: string; price: number };

/** How much a watched item has dropped from the price it had when watched, or null. */
export function priceDrop(first: number | null, current: number | null): { amount: number; percent: number } | null {
  if (first == null || current == null || !(first > 0) || current >= first) return null;
  const amount = Math.round((first - current) * 100) / 100;
  const percent = Math.round((amount / first) * 100);
  return amount >= 1 && percent >= 3 ? { amount, percent } : null;
}

/** Append a reading, skipping repeats of the last price, and keep the latest 30. */
export function appendPrice(history: PricePoint[], price: number, at: string): PricePoint[] {
  const last = history[history.length - 1];
  if (last && last.price === price) return history;
  return [...history, { at, price }].slice(-30);
}

/** Due for a re-check: never checked, or checked more than `hours` ago. */
export function priceCheckDue(checkedAt: string | null, now: number, hours = 12): boolean {
  if (!checkedAt) return true;
  const t = Date.parse(checkedAt);
  return !Number.isFinite(t) || now - t > hours * 3600 * 1000;
}
