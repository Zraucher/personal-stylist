import { z } from "zod";
import { safeUrl, type ScrapedProduct } from "./scrape";

const text = z.string().trim().max(300).nullish();
const amount = z.number().positive().max(1_000_000).nullish();

/** What the Chrome extension read off the open product page. It fills in when the store blocks our reader. */
export const PageSeen = z.object({
  name: text,
  brand: text,
  image: z.string().max(2000).nullish(),
  price: amount,
  currency: text,
  listPrice: amount,
  rating: z.number().min(0).max(5).nullish(),
  reviewCount: z.number().int().min(0).nullish(),
});
export type PageSeen = z.infer<typeof PageSeen>;

/** Our own reading wins; the page data fills the gaps, or stands in when we couldn't read the page at all. */
export function withPage(url: string, scraped: ScrapedProduct | null, seen: PageSeen | undefined): ScrapedProduct | null {
  if (scraped)
    return {
      ...scraped,
      imageUrl: scraped.imageUrl ?? (seen?.image && safeUrl(seen.image) ? seen.image : null),
      price: scraped.price ?? seen?.price ?? null,
      listPrice: scraped.listPrice ?? seen?.listPrice ?? null,
      rating: scraped.rating ?? seen?.rating ?? null,
      reviewCount: scraped.reviewCount ?? seen?.reviewCount ?? null,
    };
  if (!seen?.name) return null;
  return {
    url,
    name: seen.name,
    brand: seen.brand ?? new URL(url).hostname.replace(/^www\./, ""),
    imageUrl: seen.image && safeUrl(seen.image) ? seen.image : null,
    price: seen.price ?? null,
    currency: seen.currency ?? null,
    colorway: null,
    material: null,
    description: null,
    listPrice: seen.listPrice ?? null,
    rating: seen.rating ?? null,
    reviewCount: seen.reviewCount ?? null,
    source: "browser",
  };
}
