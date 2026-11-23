import type { CandidateView } from "./WishlistClient";

/** A wishlist_candidates row as the cards show it. */
export function toCandidateView(c: Record<string, unknown>): CandidateView {
  return {
    id: c.id as string,
    wishId: (c.wishlist_id as string | null) ?? null,
    url: c.url as string,
    name: (c.name as string | null) ?? null,
    brand: (c.brand as string | null) ?? null,
    imageUrl: (c.image_url as string | null) ?? null,
    price: c.price != null ? Number(c.price) : null,
    paletteStatus: (c.palette_status as string | null) ?? null,
    paletteReason: (c.palette_reason as string | null) ?? null,
    state: (c.state as string) ?? "new",
    colors: Array.isArray(c.colors) ? (c.colors as CandidateView["colors"]) : [],
    watch: !!c.watch,
    firstPrice: c.first_price != null ? Number(c.first_price) : null,
  };
}
