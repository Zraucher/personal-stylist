import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SnapshotItem = { name: string; subcategory: string | null; colors: Array<{ name: string; hex?: string }>; image_path: string | null };
export type OpinionSnapshot = {
  title: string;
  occasion?: string | null;
  items?: SnapshotItem[];
  // finds
  brand?: string | null;
  image_url?: string | null;
  price?: number | null;
  currency?: string | null;
  store?: string | null;
  url?: string | null;
  palette_status?: string | null;
};

export const TOKEN_RE = /^[A-Za-z0-9_-]{10,40}$/;
export const newToken = () => randomBytes(12).toString("base64url"); // 16 chars

/** What friends see, frozen at the moment of asking, so later edits don't change the question. */
export async function buildSnapshot(
  supabase: SupabaseClient,
  userId: string,
  target: { kind: "outfit"; outfitId: string } | { kind: "find"; candidateId: string }
): Promise<OpinionSnapshot | null> {
  if (target.kind === "outfit") {
    const { data: o } = await supabase.from("outfits").select("id, name, occasion, item_ids").eq("id", target.outfitId).eq("user_id", userId).maybeSingle();
    if (!o) return null;
    const ids = (o.item_ids as string[]) ?? [];
    const { data: rows } = ids.length ? await supabase.from("closet_items").select("id, name, subcategory, colors, image_path").in("id", ids).eq("user_id", userId) : { data: [] };
    const byId = new Map((rows ?? []).map((r) => [r.id as string, r]));
    const items: SnapshotItem[] = ids
      .map((id) => byId.get(id))
      .filter((r): r is NonNullable<typeof r> => !!r)
      .map((r) => ({
        name: ((r.name as string | null) ?? (r.subcategory as string | null) ?? "Piece").slice(0, 80),
        subcategory: (r.subcategory as string | null) ?? null,
        colors: Array.isArray(r.colors) ? (r.colors as SnapshotItem["colors"]).slice(0, 3) : [],
        image_path: (r.image_path as string | null) ?? null,
      }));
    if (!items.length) return null;
    return { title: ((o.name as string | null) ?? "This outfit").slice(0, 80), occasion: (o.occasion as string | null) ?? null, items };
  }
  const { data: c } = await supabase.from("wishlist_candidates").select("id, name, brand, image_url, price, currency, url, palette_status").eq("id", target.candidateId).eq("user_id", userId).maybeSingle();
  if (!c) return null;
  let store: string | null = null;
  try {
    store = new URL(c.url as string).hostname.replace(/^www\./, "");
  } catch {
    store = null;
  }
  const img = (c.image_url as string | null) ?? null;
  return {
    title: ((c.name as string | null) ?? "This find").slice(0, 100),
    brand: (c.brand as string | null) ?? null,
    image_url: img && /^https:\/\//.test(img) ? img : null,
    price: c.price != null ? Number(c.price) : null,
    currency: (c.currency as string | null) ?? null,
    store,
    url: (c.url as string | null) ?? null,
    palette_status: (c.palette_status as string | null) ?? null,
  };
}

export function siteOrigin(headersList: Headers): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "www.myvallette.com";
  const proto = headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
