import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { AiError, aiAvailable, blobToImage } from "@/lib/ai/claude";
import { tagImage } from "@/lib/ai/tag";
import { loadStyleContext } from "@/lib/profile/context";
import { runScorecard } from "@/lib/scorecard/run";
import { deltaE, lexiconHex } from "@/lib/scorecard/rules";
import { fetchImage, scrapeProduct, ScrapeError, safeUrl } from "@/lib/retail/scrape";
import { retailerName, strategyFor } from "@/lib/retail/strategies";

export const maxDuration = 90;

const Body = z.union([
  z.object({ haulId: z.string().uuid(), url: z.string().min(8).max(2000) }),
  z.object({ haulId: z.string().uuid(), imagePath: z.string().min(8).max(400), name: z.string().max(160).optional() }),
]);

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

/** Review one product for a haul: scrape (or take a screenshot), verify color from the image, score, save. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", detail: "Send a product link or a screenshot." }, { status: 400 });
  const body = parsed.data;

  const { data: haul } = await supabase.from("hauls").select("id, retailer").eq("id", body.haulId).eq("user_id", user.id).maybeSingle();
  if (!haul) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!aiAvailable()) return NextResponse.json({ error: "unavailable", detail: "Reviews need the Anthropic key in Vercel." }, { status: 503 });

  let imagePath: string;
  let product: Awaited<ReturnType<typeof scrapeProduct>> | null = null;
  let url: string | null = null;

  if ("url" in body) {
    const u = safeUrl(body.url);
    if (!u) return NextResponse.json({ error: "bad_url", detail: "Use a full https product link." }, { status: 400 });
    url = u.toString();
    try {
      product = await scrapeProduct(url);
    } catch (e) {
      const msg = e instanceof ScrapeError ? e.message : "Could not read that page.";
      const tip = strategyFor(u).tip;
      const { data: row } = await supabase
        .from("haul_items")
        .insert({
          haul_id: haul.id,
          user_id: user.id,
          name: u.hostname.replace(/^www\./, "") + u.pathname.slice(0, 60),
          url,
          verdict: "provisional",
          headline: `Provisional: ${msg}${tip ? ` ${tip}` : ""}`,
          scrape_status: e instanceof ScrapeError ? e.code : "failed",
        })
        .select("*")
        .single();
      return NextResponse.json({ item: row, warning: msg });
    }
    const img = product.imageUrl ? await fetchImage(product.imageUrl) : null;
    if (!img) {
      const { data: row } = await supabase
        .from("haul_items")
        .insert({
          haul_id: haul.id,
          user_id: user.id,
          name: product.name ?? url,
          url,
          brand: product.brand,
          price: product.price,
          currency: product.currency,
          stated_colorway: product.colorway,
          source_image_url: product.imageUrl,
          verdict: "provisional",
          headline: "Provisional: the product photo would not download. Upload a screenshot to finish the review.",
          scrape_status: "no_image",
          scrape_source: product.source,
        })
        .select("*")
        .single();
      return NextResponse.json({ item: row, warning: "No photo" });
    }
    imagePath = `${user.id}/hauls/${crypto.randomUUID()}.${EXT[img.type] ?? "jpg"}`;
    const { error: upErr } = await supabase.storage.from(CLOSET_BUCKET).upload(imagePath, img.bytes, { contentType: img.type });
    if (upErr) return NextResponse.json({ error: "save_failed", detail: upErr.message }, { status: 500 });
  } else {
    if (!body.imagePath.startsWith(`${user.id}/hauls/`)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    imagePath = body.imagePath;
  }

  const { data: blob } = await supabase.storage.from(CLOSET_BUCKET).download(imagePath);
  if (!blob) return NextResponse.json({ error: "image_not_found" }, { status: 404 });
  const image = await blobToImage(blob);

  try {
    const hint = product ? [product.name, product.colorway && `listed color "${product.colorway}"`, product.material && `material ${product.material}`].filter(Boolean).join("; ") : "name" in body ? body.name : undefined;
    const tags = await tagImage(image, { hint: hint || undefined });

    // "Mauve French Paisley" turned out bright pink: compare the listed color with the photo.
    let mismatch: string | null = null;
    const listed = product?.colorway ? lexiconHex(product.colorway) : null;
    const seen = tags.colors[0]?.hex && /^#[0-9a-f]{6}$/i.test(tags.colors[0].hex) ? tags.colors[0].hex : null;
    if (product?.colorway && listed && seen && deltaE(listed, seen) > 25) {
      mismatch = `Listed as "${product.colorway}", but the photo reads ${tags.colors[0].name}.`;
    }

    const ctx = await loadStyleContext(supabase, user.id);
    const material = product?.material ?? tags.material;
    const result = await runScorecard(
      ctx,
      { name: tags.name, subcategory: tags.subcategory, colors: tags.colors, pattern: tags.pattern, material, construction: tags.construction },
      image,
      {
        owned: false,
        tailoring: { needed: false, note: null },
        extraText: product ? `Retailer: ${url ? retailerName(new URL(url)) : haul.retailer ?? "unknown"}${product.price != null ? `, price ${product.price}${product.currency ? ` ${product.currency}` : ""}` : ""}.${mismatch ? ` ${mismatch}` : ""}` : undefined,
      }
    );

    const { data: row, error } = await supabase
      .from("haul_items")
      .insert({
        haul_id: haul.id,
        user_id: user.id,
        name: product?.name ?? tags.name,
        url,
        image_path: imagePath,
        source_image_url: product?.imageUrl ?? null,
        brand: product?.brand ?? null,
        price: product?.price ?? null,
        currency: product?.currency ?? null,
        stated_colorway: product?.colorway ?? null,
        verified_colors: tags.colors,
        category: tags.category,
        subcategory: tags.subcategory,
        material,
        pattern: tags.pattern,
        construction: tags.construction,
        scores: result.scores,
        verdict: result.verdict,
        headline: mismatch ? `${result.headline} ${mismatch}` : result.headline,
        reasoning: tags.notes,
        tailoring_needed: result.tailoringNote,
        color_mismatch: mismatch,
        scrape_status: product ? "ok" : "screenshot",
        scrape_source: product?.source ?? "screenshot",
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: "save_failed", detail: error.message }, { status: 500 });
    return NextResponse.json({ item: row });
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ error: e.code, detail: e.message }, { status: e.code === "rate_limited" ? 429 : 502 });
    throw e;
  }
}
