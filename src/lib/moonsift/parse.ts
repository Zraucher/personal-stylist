// Pure: Moonsift links, Firestore REST values and Moonsift wishlist items, as Valette reads them.

export type MoonsiftLink = { kind: "collection"; username: string; collectionId: string } | { kind: "profile"; username: string };

const NAME = /^[\w.-]{1,64}$/;

/** A moonsift.com collection or profile link, with or without www/https, slashes or a query; null otherwise. */
export function parseMoonsiftUrl(raw: string | null | undefined): MoonsiftLink | null {
  const text = raw?.trim();
  if (!text || text.length > 2000) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol) || !/^(www\.)?moonsift\.com$/i.test(u.hostname)) return null;
  const parts = u.pathname.split("/").filter(Boolean).map((p) => decodeURIComponent(p));
  if (parts[0] === "collection" && parts.length === 3 && NAME.test(parts[1]) && NAME.test(parts[2])) return { kind: "collection", username: parts[1], collectionId: parts[2] };
  if (parts.length === 1 && parts[0].startsWith("@") && NAME.test(parts[0].slice(1))) return { kind: "profile", username: parts[0].slice(1) };
  return null;
}

type FsValue = Record<string, unknown>;

/** One Firestore REST value as plain JS (integers become numbers, timestamps stay ISO strings). */
export function decodeValue(v: FsValue | null | undefined): unknown {
  if (!v || typeof v !== "object") return null;
  if ("stringValue" in v) return String(v.stringValue);
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return !!v.booleanValue;
  if ("timestampValue" in v) return String(v.timestampValue);
  if ("nullValue" in v) return null;
  if ("mapValue" in v) return decodeFields((v.mapValue as { fields?: Record<string, FsValue> })?.fields);
  if ("arrayValue" in v) return ((v.arrayValue as { values?: FsValue[] })?.values ?? []).map(decodeValue);
  return null;
}

/** A Firestore document's `fields` as a plain object. */
export function decodeFields(fields: Record<string, FsValue> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields ?? {})) out[k] = decodeValue(v);
  return out;
}

const CURRENCY: Array<[RegExp, string]> = [
  [/US\$|\$US|USD|\$/i, "USD"],
  [/£|GBP/i, "GBP"],
  [/€|EUR/i, "EUR"],
];

/** Moonsift's free-text price ("$US105", "$34 to $40", "Current price $24.99; 30% off") as the lowest amount; null when none. */
export function parsePrice(raw: unknown): { amount: number; currency: string } | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const text = raw.slice(0, 300);
  // Only numbers next to a currency mark count, so "30% off" is never a price.
  const amounts = [...text.matchAll(/(?:US\$|\$US|\$|£|€|USD|GBP|EUR)\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi)]
    .map((m) => Number(m[1].replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!amounts.length) return null;
  const currency = CURRENCY.find(([re]) => re.test(text))?.[1] ?? "USD";
  return { amount: Math.min(...amounts), currency };
}

/** An http(s) URL (a bare "store.com/x" is upgraded to https), capped in length; null for anything else. */
export function webUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text || text.length > 2000) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(text) ? text : /^[\w-]+(\.[\w-]+)+(\/|$)/.test(text) ? `https://${text}` : text);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

const clip = (s: unknown, n: number) => (typeof s === "string" && s.trim() ? s.trim().replace(/\s+/g, " ").slice(0, n) : null);

export type MoonsiftItem = { url: string; name: string | null; brand: string | null; imageUrl: string | null; price: number | null; currency: string | null; createdAt: string | null };

/** A decoded Moonsift list document as wishlist columns; null when it has no usable product link. */
export function mapItem(f: Record<string, unknown>): MoonsiftItem | null {
  const s = (f.scrape_data && typeof f.scrape_data === "object" ? f.scrape_data : {}) as Record<string, unknown>;
  const url = webUrl(s.best_link) ?? webUrl(f.page_url);
  if (!url) return null;
  const pid = typeof f.product_image === "string" && /^moonimage_[\w-]{1,64}$/.test(f.product_image) ? f.product_image : null;
  const best = (s.best_image as { sources?: unknown[] } | null)?.sources?.[0];
  const imageUrl = (pid ? `https://storage.googleapis.com/moonsift-web-product-images/${pid}.jpg` : null) ?? webUrl(best) ?? webUrl(f.original_image);
  const price = parsePrice(s.best_price);
  const site = clip(s.site_uid, 100) ?? new URL(url).hostname;
  return {
    url,
    // Titles often end " - STORE"; keep them whole, just bounded.
    name: clip(s.best_description, 200),
    brand: site.replace(/^www\./, ""),
    imageUrl,
    price: price?.amount ?? null,
    currency: price?.currency ?? null,
    createdAt: typeof f.created_at === "string" ? f.created_at : null,
  };
}
