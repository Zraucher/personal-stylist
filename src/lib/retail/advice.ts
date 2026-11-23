import "server-only";
import { z } from "zod";
import { MODELS, aiAvailable, structured } from "@/lib/ai/claude";
import { describeStyle, type StyleContext } from "@/lib/profile/context";
import { priceDrop, saleOff } from "./price";
import { sizingSignal } from "./sizing";

// "Should I buy it?": fit for this person, what reviewers say (sizing first), and whether the price is good.

const AdviceSchema = z.object({
  verdict: z.enum(["buy", "wait", "skip"]),
  headline: z.string(),
  fit: z.string(),
  sizing: z.enum(["size_up", "size_down", "true_to_size", "mixed", "unknown"]),
  sizingNote: z.string(),
  price: z.string(),
  pros: z.array(z.string()).max(3),
  cons: z.array(z.string()).max(3),
});
export type Advice = z.infer<typeof AdviceSchema> & { reviewsRead: number };

export type AdviceInput = {
  name: string | null;
  brand: string | null;
  description: string | null;
  price: number | null;
  listPrice: number | null;
  firstPrice: number | null;
  lowest: number | null;
  targetPrice: number | null;
  paletteStatus: string | null;
  paletteReason: string | null;
  rating: number | null;
  reviewCount: number | null;
  /** The person's own sizing notes and measurements, as text. */
  sizeNotes: string | null;
  reviews: string[];
};

const money = (n: number) => `$${n.toFixed(2)}`;

function priceFacts(p: AdviceInput): string {
  if (p.price == null) return "We couldn't read a price.";
  const off = saleOff(p.listPrice, p.price);
  const drop = priceDrop(p.firstPrice, p.price);
  return [
    off ? `${money(p.price)}, ${off}% off the store's ${money(p.listPrice!)}.` : `${money(p.price)}, not marked down.`,
    drop ? `Down ${drop.percent}% since you saved it.` : "",
    p.lowest != null && p.price <= p.lowest ? "The lowest we've seen." : p.lowest != null ? `We've seen it at ${money(p.lowest)}.` : "",
    p.targetPrice != null ? (p.price <= p.targetPrice ? "At or under your price." : `Your price is ${money(p.targetPrice)}.`) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Rules only: used when the model is unavailable or fails. */
function fallback(p: AdviceInput): Advice {
  const s = sizingSignal(p.reviews);
  const out = p.paletteStatus === "fail";
  const unsure = p.paletteStatus === "caution" || (p.rating != null && p.rating < 3.5);
  const deal = !!saleOff(p.listPrice, p.price) || !!priceDrop(p.firstPrice, p.price);
  const verdict = out ? "skip" : unsure || !deal ? "wait" : "buy";
  return {
    verdict,
    headline: out ? "Outside your palette, so we'd pass." : verdict === "buy" ? "In your colors and marked down." : unsure ? "Not a clear yes yet." : "A fit for your colors. The price hasn't moved yet.",
    fit: p.paletteReason ?? "We couldn't check the color against your palette.",
    sizing: s.sizing,
    sizingNote:
      s.sizing === "unknown"
        ? "We didn't find enough reviews that mention sizing."
        : `Sizing remarks in the reviews: ${s.small} say it runs small, ${s.large} large, ${s.trueToSize} true to size.`,
    price: priceFacts(p),
    pros: [],
    cons: [],
    reviewsRead: p.reviews.length,
  };
}

const SYSTEM = `You help one person decide whether a product they are shopping for is worth buying.
Speak as "we". Plain words, short sentences, no hype. Never mention AI, models or how you work.
Judge three things: does it fit this person's colors and style; what do the customer reviews say, sizing first; is the price good right now.
Use only the reviews given. Never invent a review, a rating or a number. If the reviews don't cover sizing, set sizing to "unknown" and say we didn't find sizing remarks.
sizing: "size_up" when reviewers say it runs small, "size_down" when it runs large, "true_to_size", "mixed" when they disagree.
sizingNote: one sentence, with what reviewers said, and the person's own sizing notes when they matter.
verdict: "buy" only when it suits them and the price is fair or marked down; "wait" when it suits them but the price is high or the reviews are thin or mixed; "skip" when it doesn't suit them or reviewers report real quality problems.
headline, fit and price are one sentence each. pros and cons come from the reviews, a few words each; leave them empty with no reviews.`;

export async function buildAdvice(p: AdviceInput, ctx: StyleContext): Promise<Advice> {
  if (!aiAvailable()) return fallback(p);
  const hint = sizingSignal(p.reviews);
  const text = [
    `Product: ${[p.brand, p.name].filter(Boolean).join(" ") || "unnamed"}`,
    p.description ? `Store description: ${p.description}` : "",
    `Price facts: ${priceFacts(p)}`,
    `Color check against their palette: ${p.paletteStatus ?? "not checked"}. ${p.paletteReason ?? ""}`,
    p.rating != null ? `Store rating: ${p.rating} from ${p.reviewCount ?? "an unknown number of"} reviews.` : "No store rating found.",
    `Sizing remarks counted in the reviews: ${hint.small} run small, ${hint.large} run large, ${hint.trueToSize} true to size.`,
    `About the person:\n${describeStyle(ctx)}`,
    p.sizeNotes ? `Their sizing notes: ${p.sizeNotes}` : "",
    p.reviews.length ? `Customer reviews (${p.reviews.length}):\n${p.reviews.map((r, i) => `${i + 1}. ${r}`).join("\n")}` : "No customer reviews found.",
  ]
    .filter(Boolean)
    .join("\n\n");
  try {
    const a = await structured({ schema: AdviceSchema, system: SYSTEM, text, model: MODELS.fast, maxTokens: 1200 });
    return { ...a, reviewsRead: p.reviews.length };
  } catch {
    return fallback(p);
  }
}

/** Review remarks from around the web. Needs the search key; returns nothing without it. */
export async function webReviews(name: string | null, brand: string | null): Promise<string[]> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key || !name) return [];
  try {
    const r = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query: `${brand ?? ""} ${name} reviews sizing fit`.trim(), limit: 6 }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return [];
    const b = (await r.json()) as { data?: Array<{ description?: string }> };
    return (b.data ?? []).map((d) => d.description?.trim().slice(0, 400) ?? "").filter((t) => t.length > 40);
  } catch {
    return [];
  }
}
