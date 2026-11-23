import type { Advice } from "@/lib/retail/advice";
import { lowestPrice, type PricePoint } from "@/lib/retail/price";
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
    listPrice: c.list_price != null ? Number(c.list_price) : null,
    targetPrice: c.target_price != null ? Number(c.target_price) : null,
    lowest: lowestPrice(Array.isArray(c.price_history) ? (c.price_history as PricePoint[]) : [], c.price != null ? Number(c.price) : null),
    advice: (c.advice as Advice | null) ?? null,
  };
}
