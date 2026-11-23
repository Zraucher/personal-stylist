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

/** Percent off the store's own "was" price, or null when it is not a real sale. */
export function saleOff(list: number | null, price: number | null): number | null {
  if (list == null || price == null || !(list > 0) || price >= list) return null;
  const percent = Math.round(((list - price) / list) * 100);
  return percent >= 5 ? percent : null;
}

/** The lowest price we have seen, counting today's. */
export function lowestPrice(history: PricePoint[], current: number | null): number | null {
  const all = [...history.map((h) => h.price), ...(current != null ? [current] : [])];
  return all.length ? Math.min(...all) : null;
}

const money = (n: number) => `$${n % 1 ? n.toFixed(2) : n}`;

/**
 * Whether a fresh price reading is worth an alert, and the line to send.
 * Only news: the price is below yesterday's, and it hit the person's price, went on sale, or is meaningfully below where it started.
 */
export function priceNews(r: { name: string | null; before: number | null; first: number | null; target: number | null }, price: number | null, list: number | null): string | null {
  if (price == null || r.before == null || price >= r.before) return null;
  const name = (r.name ?? "A product").slice(0, 40);
  if (r.target != null && price <= r.target && r.before > r.target) return `${name} hit your price: ${money(price)}`;
  const off = saleOff(list, price);
  const drop = priceDrop(r.first, price);
  if (off && (!drop || off >= drop.percent)) return `${name} is on sale: ${money(price)}, was ${money(list!)}`;
  return drop ? `${name} is ${money(price)} (down ${drop.percent}%)` : null;
}
