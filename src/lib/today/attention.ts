// What's waiting on the person, for the Today hub. Pure: the page does the queries.

export type AttentionItem = { id: "drops" | "votes" | "sourced" | "review"; count: number; title: string; meta: string; href: string };

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** A watched price counts as dropped when it fell at least $1 and at least 3%. */
export function priceDrops(watched: Array<{ price: unknown; first_price: unknown }>): number {
  return watched.filter((c) => c.price != null && c.first_price != null && Number(c.first_price) - Number(c.price) >= 1 && Number(c.price) <= Number(c.first_price) * 0.97).length;
}

/** Votes that arrived after the person last opened each second opinion. */
export function newVoteCount(asks: Array<{ id: string; seen_at: string | null; created_at: string }>, votes: Array<{ opinion_id: string; created_at: string }>): number {
  const seen = new Map(asks.map((a) => [a.id, a.seen_at ?? a.created_at]));
  return votes.filter((v) => v.created_at > (seen.get(v.opinion_id) ?? "")).length;
}

/** Pieces with a photo the person hasn't agreed or disagreed with yet. */
export function unreviewedCount(withPhoto: string[], answered: string[]): number {
  const done = new Set(answered);
  return withPhoto.filter((id) => !done.has(id)).length;
}

/**
 * Rows for "Needs you", most time-sensitive first: prices and friends move on without you,
 * closet upkeep can wait. Zero counts are dropped, so an empty list means all clear.
 */
export function attentionItems(c: { drops: number; newVotes: number; sourced: number; toReview: number }): AttentionItem[] {
  const rows: AttentionItem[] = [
    { id: "drops", count: c.drops, title: `See ${c.drops} price ${s(c.drops, "drop", "drops")}`, meta: "Products you watch got cheaper", href: "/wishlist" },
    { id: "votes", count: c.newVotes, title: `Read ${c.newVotes} new ${s(c.newVotes, "vote", "votes")}`, meta: "Friends answered your second opinions", href: "/opinions" },
    { id: "sourced", count: c.sourced, title: `Check ${c.sourced} ${s(c.sourced, "photo", "photos")} we found`, meta: "Product photos for pieces without one", href: "/closet/sourced" },
    { id: "review", count: c.toReview, title: `Review ${c.toReview} ${s(c.toReview, "piece", "pieces")}`, meta: "Check our verdicts, sharpen your picks", href: "/closet/review" },
  ];
  return rows.filter((r) => r.count > 0);
}

/** The seven dates starting at `today` (YYYY-MM-DD), for the week strip. */
export function weekDates(today: string): string[] {
  const start = Date.parse(`${today}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => new Date(start + i * 86400000).toISOString().slice(0, 10));
}
