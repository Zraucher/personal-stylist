import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { cleanLink } from "@/lib/retail/link";
import { safeUrl } from "@/lib/retail/scrape";
import { parseMoonsiftUrl } from "@/lib/moonsift/parse";
import { MAX_ITEMS, MoonsiftError, getCollection, listItems, listPublicCollections, userUid } from "@/lib/moonsift/fetch";

export const maxDuration = 60;

const Body = z.object({ link: z.string().max(2000), import: z.array(z.string().regex(/^[\w.-]{1,64}$/)).max(50).optional() });
const BAD_LINK = "That isn't a Moonsift collection or profile link. Paste one like moonsift.com/collection/name/… or moonsift.com/@name.";

/**
 * Preview a Moonsift link (a collection, or a profile's public collections), or import the chosen collections
 * into saved products. Items land like hand-saved links, tagged with their collection; prices and palette checks run
 * lazily from the wishlist page (/api/wishlist/prices, /api/wishlist/palette).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", detail: "You're signed out. Sign in again to import." }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const link = parsed.success ? parseMoonsiftUrl(parsed.data.link) : null;
  if (!parsed.success || !link) return NextResponse.json({ error: "bad_request", detail: BAD_LINK }, { status: 400 });

  try {
    const uid = await userUid(link.username);
    const wanted = parsed.data.import;

    if (!wanted) {
      if (link.kind === "profile") {
        const collections = await listPublicCollections(uid);
        return NextResponse.json({ kind: "profile", username: link.username, collections });
      }
      const c = await getCollection(uid, link.collectionId);
      const items = await listItems(uid, c.id);
      return NextResponse.json({
        kind: "collection",
        username: link.username,
        collections: [{ ...c, count: items.length, thumbs: items.slice(0, 8).map((i) => ({ imageUrl: i.imageUrl, name: i.name })) }],
      });
    }

    // A collection link imports only itself; a profile link imports the public collections picked from it.
    const ids = link.kind === "collection" ? [link.collectionId] : [...new Set(wanted)];
    if (!ids.length) return NextResponse.json({ error: "bad_request", detail: "Pick at least one collection." }, { status: 400 });
    const items = [];
    for (const id of ids) {
      if (items.length >= MAX_ITEMS) break;
      const c = await getCollection(uid, id);
      const source = `Moonsift · ${c.name}`.slice(0, 200);
      items.push(...(await listItems(uid, c.id, MAX_ITEMS - items.length)).map((it) => ({ ...it, source })));
    }

    // shortcut: reads up to 1000 existing rows (PostgREST default), page it if wishlists grow past that.
    const { data: mine } = await supabase.from("wishlist_candidates").select("url").eq("user_id", user.id);
    const seen = new Set((mine ?? []).map((r) => r.url as string));
    let skipped = 0;
    let failed = 0;
    const rows = [];
    for (const it of items) {
      const url = cleanLink(it.url);
      if (!url || !safeUrl(url)) {
        failed++;
        continue;
      }
      if (seen.has(url)) {
        skipped++;
        continue;
      }
      seen.add(url);
      rows.push({
        user_id: user.id,
        wishlist_id: null,
        url,
        name: it.name,
        brand: it.brand,
        image_url: it.imageUrl,
        price: it.price,
        currency: it.currency,
        state: "saved",
        source: it.source,
        // Palette status stays null so /api/wishlist/palette checks the photo when the wishlist opens.
        // Moonsift's price may be stale: watch it and leave it due, so the wishlist re-reads the store on open.
        watch: it.price != null,
        first_price: it.price,
        price_checked_at: null,
      });
    }

    let imported = 0;
    if (rows.length) {
      const { error } = await supabase.from("wishlist_candidates").insert(rows);
      if (!error) imported = rows.length;
      else {
        // One bad row (or a save racing the import) fails the batch; retry singly so the rest still land.
        for (const r of rows) {
          const { error: e } = await supabase.from("wishlist_candidates").insert(r);
          if (e) failed++;
          else imported++;
        }
      }
    }
    return NextResponse.json({ imported, skipped, failed, capped: items.length >= MAX_ITEMS });
  } catch (e) {
    if (e instanceof MoonsiftError) return NextResponse.json({ error: e.code, detail: e.message }, { status: e.code === "not_found" ? 404 : e.code === "private" ? 403 : 502 });
    return NextResponse.json({ error: "import_failed", detail: "Couldn't import from Moonsift. Try again." }, { status: 500 });
  }
}
