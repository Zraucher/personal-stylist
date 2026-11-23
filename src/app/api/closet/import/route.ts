import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { aiAvailable, MODELS } from "@/lib/ai/claude";
import { tagImage, type GarmentTags } from "@/lib/ai/tag";
import { guessCategory } from "@/lib/closet/guess";
import { storeRemotePhoto } from "@/lib/closet/photo";
import { cleanLink } from "@/lib/retail/link";
import { PageSeen, withPage } from "@/lib/retail/page";
import { safeUrl, scrapeProduct } from "@/lib/retail/scrape";

export const maxDuration = 60;

const Body = z.object({ link: z.string().max(4000), page: PageSeen.optional() });

const ITEM = "id, name, brand, price, category, subcategory, image_path, source_image_url";

/** "I bought this": add a piece to the closet from its store link, with the store's photo and our tags. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", detail: "You're signed out. Sign in again to add this." }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const url = parsed.success ? cleanLink(parsed.data.link) : null;
  if (!url || !safeUrl(url)) return NextResponse.json({ error: "bad_request", detail: "That doesn't look like a store link. Paste the product page's address." }, { status: 400 });

  const { data: existing } = await supabase.from("closet_items").select(ITEM).eq("user_id", user.id).eq("source_page_url", url).neq("status", "gone").limit(1).maybeSingle();
  if (existing) return NextResponse.json({ item: existing, already: true });

  const product = withPage(url, await scrapeProduct(url).catch(() => null), parsed.success ? parsed.data.page : undefined);
  if (!product) return NextResponse.json({ error: "unreadable", detail: "We couldn't read that store's page. Add the piece with a photo instead." }, { status: 422 });
  // A dead product link often lands on a category page, which has a title but no price. Don't add that as a piece.
  if (product.price == null) return NextResponse.json({ error: "not_product", detail: "That page doesn't look like one product. Open the product itself and copy its link, or add the piece with a photo." }, { status: 422 });

  const photo = product.imageUrl ? await storeRemotePhoto(supabase, user.id, product.imageUrl) : null;
  const stored = photo && "path" in photo ? photo : null;
  let tags: GarmentTags | null = null;
  if (stored && aiAvailable()) {
    const hint = [product.brand, product.name, product.colorway && `color: ${product.colorway}`, product.material].filter(Boolean).join(" · ");
    tags = await tagImage({ data: Buffer.from(stored.bytes).toString("base64"), mediaType: stored.type }, { hint, model: MODELS.fast }).catch(() => null);
  }
  const guess = guessCategory(product.name);

  const { data: item, error } = await supabase
    .from("closet_items")
    .insert({
      user_id: user.id,
      name: (product.name ?? tags?.name ?? "New piece").slice(0, 120),
      category: tags?.category ?? guess?.category ?? null,
      subcategory: tags?.subcategory ?? guess?.subcategory ?? null,
      colors: tags?.colors ?? (product.colorway ? [{ name: product.colorway.slice(0, 40).toLowerCase() }] : []),
      pattern: tags?.pattern ?? null,
      material: tags?.material ?? product.material ?? null,
      construction: tags?.construction ?? [],
      formality: tags?.formality ?? null,
      warmth: tags?.warmth ?? null,
      seasons: tags?.seasons ?? [],
      brand: product.brand ?? null,
      price: product.price ?? null,
      image_path: stored?.path ?? null,
      source_page_url: url,
      // The photo didn't copy: offer it on the "photos we found" page instead of losing it.
      source_image_url: stored ? null : product.imageUrl,
      status: "available",
    })
    .select(ITEM)
    .single();
  if (error || !item) return NextResponse.json({ error: "save_failed", detail: "Couldn't add it to your closet. Try again." }, { status: 500 });

  // Bought it: stop watching its price on the shopping list.
  await supabase.from("wishlist_candidates").update({ watch: false }).eq("user_id", user.id).eq("url", url);
  revalidatePath("/closet");
  return NextResponse.json({ item, already: false, tagged: !!tags });
}
