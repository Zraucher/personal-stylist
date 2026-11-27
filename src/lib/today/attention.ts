// What is waiting on the person, for the Today hub. Pure, so Node runs it in scripts/test-today.mjs.

export type AttentionThumb = { src: string | null; product: boolean; category?: string | null; subcategory?: string | null };
/** `mark` is the short figure shown in place of a photo: a step number, a count or an arrow. */
export type AttentionItem = { id: string; title: string; meta: string; href: string; thumb: AttentionThumb | null; mark: string };

type Step = { id: string; label: string; href: string; done: boolean };
type Watched = { name: string | null; price: number | string | null; first_price: number | string | null; image_url: string | null };
type Piece = { name: string | null; src: string | null; category?: string | null; subcategory?: string | null };

/** A drop worth a line: at least $1 and 3% under the first price we saw. The rule Today has always used for its drop count. */
export function isDrop(price: number | string | null, first: number | string | null): boolean {
  if (price == null || first == null) return false;
  const p = Number(price);
  const f = Number(first);
  return f - p >= 1 && p <= f * 0.97;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** Setup first (the picks depend on it), then people waiting, then money, then closet chores, then tomorrow. */
export function attentionItems(x: {
  steps: Step[];
  newVotes: number;
  watched: Watched[];
  sourced: { count: number; first: Piece | null };
  toReview: { count: number; first: Piece | null };
  tomorrowOpen: boolean;
}): AttentionItem[] {
  const out: AttentionItem[] = [];
  const left = x.steps.filter((s) => !s.done);
  left.forEach((s, i) =>
    out.push({ id: `setup-${s.id}`, title: s.label, meta: `Get set up · ${x.steps.length - left.length + i + 1} of ${x.steps.length}`, href: s.href, thumb: null, mark: `${x.steps.length - left.length + i + 1}/${x.steps.length}` })
  );
  if (x.newVotes > 0) out.push({ id: "votes", title: `${plural(x.newVotes, "new vote")} from friends`, meta: "See what they said", href: "/opinions", thumb: null, mark: String(x.newVotes) });

  const drops = x.watched
    .filter((w) => isDrop(w.price, w.first_price))
    .sort((a, b) => Number(b.first_price) - Number(b.price) - (Number(a.first_price) - Number(a.price)));
  if (drops.length) {
    const top = drops[0];
    const off = Number(top.first_price) - Number(top.price);
    out.push({
      id: "drops",
      title: `${top.name ?? "A product you watch"} is ${money(off)} less`,
      meta: drops.length > 1 ? `Now ${money(Number(top.price))} · ${plural(drops.length - 1, "more price drop")}` : `Now ${money(Number(top.price))}`,
      href: "/wishlist",
      thumb: { src: top.image_url, product: true },
      mark: "$",
    });
  }
  if (x.sourced.count > 0) {
    const f = x.sourced.first;
    out.push({ id: "sourced", title: `${plural(x.sourced.count, "photo")} we found to check`, meta: f?.name ? `Starting with ${f.name}` : "Do they match your pieces?", href: "/closet/sourced", thumb: f ? { src: f.src, product: true, category: f.category, subcategory: f.subcategory } : null, mark: String(x.sourced.count) });
  }
  if (x.toReview.count > 0) {
    const f = x.toReview.first;
    out.push({ id: "review", title: `${plural(x.toReview.count, "piece")} to review`, meta: "Keep or cut, one at a time", href: "/closet/review", thumb: f ? { src: f.src, product: false, category: f.category, subcategory: f.subcategory } : null, mark: String(x.toReview.count) });
  }
  if (x.tomorrowOpen) out.push({ id: "tomorrow", title: "Tomorrow isn't planned yet", meta: "Plan it with the forecast", href: "/plan", thumb: null, mark: "→" });
  return out;
}
