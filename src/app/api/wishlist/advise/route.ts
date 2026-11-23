import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loadStyleContext } from "@/lib/profile/context";
import { buildAdvice, webReviews } from "@/lib/retail/advice";
import { appendPrice, lowestPrice, type PricePoint } from "@/lib/retail/price";
import { scrapeProduct } from "@/lib/retail/scrape";

export const maxDuration = 60;

// `reviews` is review text the Chrome extension read off the open page (stores often load reviews with scripts we can't see).
const Body = z.object({ id: z.string().uuid(), reviews: z.array(z.string().max(600)).max(30).optional() });

const num = (v: unknown) => (v != null ? Number(v) : null);

/** "Should I buy it?" for one saved product: fresh price, reviews, sizing, and a verdict. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", detail: "You're signed out. Sign in again to save this." }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", detail: "Couldn't review that. Refresh the page and try again." }, { status: 400 });

  const { data: row } = await supabase.from("wishlist_candidates").select("*").eq("id", parsed.data.id).eq("user_id", user.id).maybeSingle();
  if (!row) return NextResponse.json({ error: "not_found", detail: "That product isn't here anymore. Refresh the page." }, { status: 404 });

  const [fresh, ctx, { data: m }] = await Promise.all([
    scrapeProduct(row.url as string).catch(() => null),
    loadStyleContext(supabase, user.id),
    supabase.from("measurements").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  const name = (row.name as string | null) ?? fresh?.name ?? null;
  const brand = (row.brand as string | null) ?? fresh?.brand ?? null;
  const reviews = [...(parsed.data.reviews ?? []), ...(fresh?.reviews ?? []), ...(await webReviews(name, brand))]
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter((t, i, all) => t.length > 15 && all.indexOf(t) === i)
    .slice(0, 30);

  const at = new Date().toISOString();
  const price = fresh?.price ?? num(row.price);
  const listPrice = fresh?.price != null ? fresh.listPrice ?? null : num(row.list_price);
  const history = (Array.isArray(row.price_history) ? row.price_history : []) as PricePoint[];
  const rating = fresh?.rating ?? num(row.rating);
  const reviewCount = fresh?.reviewCount ?? num(row.review_count);
  const sizeNotes = m
    ? Object.entries(m)
        .filter(([k, v]) => v != null && v !== "" && !["user_id", "updated_at"].includes(k))
        .map(([k, v]) => `${k.replace(/_in$/, " (in)").replace(/_/g, " ")}: ${v}`)
        .join("; ")
    : "";

  const advice = await buildAdvice(
    {
      name,
      brand,
      description: fresh?.description ?? null,
      price,
      listPrice,
      firstPrice: num(row.first_price),
      lowest: lowestPrice(history, price),
      targetPrice: num(row.target_price),
      paletteStatus: (row.palette_status as string | null) ?? null,
      paletteReason: (row.palette_reason as string | null) ?? null,
      rating,
      reviewCount,
      sizeNotes: sizeNotes || null,
      reviews,
    },
    ctx
  );

  const patch: Record<string, unknown> = { advice, advised_at: at, rating, review_count: reviewCount };
  if (fresh?.price != null) Object.assign(patch, { price, list_price: listPrice, price_checked_at: at, price_history: appendPrice(history, fresh.price, at) });
  const { data: saved, error } = await supabase.from("wishlist_candidates").update(patch).eq("id", row.id).eq("user_id", user.id).select("*").single();
  if (error) return NextResponse.json({ error: "save_failed", detail: "Couldn't save the review. Try again." }, { status: 500 });
  return NextResponse.json({ candidate: saved });
}
