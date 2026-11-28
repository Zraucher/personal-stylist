import { MODELS, aiAvailable } from "@/lib/ai/claude";
import { tagImage } from "@/lib/ai/tag";
import type { loadStyleContext } from "@/lib/profile/context";
import { scorePalette } from "@/lib/scorecard/rules";
import { fetchImage, type ScrapedProduct } from "./scrape";

/** Photo colors read (falls back to the listed color), then checked against the palette. */
export async function paletteFields(p: { name: string | null; imageUrl: string | null; colorway?: string | null }, ctx: Awaited<ReturnType<typeof loadStyleContext>>) {
  let colors: Array<{ name: string; hex?: string }> = p.colorway ? [{ name: p.colorway }] : [];
  const img = aiAvailable() && p.imageUrl ? await fetchImage(p.imageUrl) : null;
  if (img) {
    try {
      const t = await tagImage(
        { data: Buffer.from(img.bytes).toString("base64"), mediaType: img.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif" },
        { model: MODELS.bulk, hint: p.name ?? undefined }
      );
      colors = t.colors;
    } catch {
      /* keep the listed color */
    }
  }
  const palette = scorePalette({ name: p.name, subcategory: null, colors, pattern: null, material: null, construction: [] }, ctx.scoreColor);
  return { colors, palette_status: palette.status, palette_reason: palette.reason };
}

/** The wishlist_candidates columns for a scraped product: photo colors read, then checked against the palette. */
export async function candidateFields(p: ScrapedProduct, ctx: Awaited<ReturnType<typeof loadStyleContext>>) {
  const pal = await paletteFields(p, ctx);
  return { url: p.url, name: p.name, brand: p.brand, image_url: p.imageUrl, price: p.price, currency: p.currency, ...pal, list_price: p.listPrice ?? null, rating: p.rating ?? null, review_count: p.reviewCount ?? null };
}
