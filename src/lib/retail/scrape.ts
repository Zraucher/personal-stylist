import "server-only";
import { strategyFor } from "./strategies";

// Product page scraping. Providers are tried in order until one returns a usable page:
//   1. Scrapling service  (SCRAPLING_URL, optional SCRAPLING_TOKEN)  - primary
//   2. Firecrawl          (FIRECRAWL_API_KEY)                         - backup
//   3. Plain fetch                                                     - always available
// Shopify stores also expose /products/<handle>.js, which is tried first when it applies.

export type ScrapedProduct = {
  url: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  colorway: string | null;
  material: string | null;
  description: string | null;
  source: "shopify" | "scrapling" | "firecrawl" | "fetch";
};

export class ScrapeError extends Error {
  code: "bad_url" | "blocked" | "not_product" | "failed";
  constructor(code: ScrapeError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

/** Only plain public https hosts. No IP literals, ports or local names. */
export function safeUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || /^[\d.]+$/.test(h) || h.includes(":")) return null;
  if (h === "localhost" || /\.(local|internal|localhost|lan|home)$/.test(h)) return null;
  return u;
}

// ---------------------------------------------------------------------------
// HTML parsing: JSON-LD Product first, then Open Graph and product meta tags.
// ---------------------------------------------------------------------------
type Json = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const first = <T,>(v: T | T[] | undefined | null): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/gi, "/")
    .replace(/&nbsp;/g, " ");
}

function meta(html: string, key: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${key.replace(/[.:]/g, "\\$&")}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  const c = tag.match(/content=["']([^"']*)["']/i)?.[1];
  return c ? decode(c).trim() || null : null;
}

function findProduct(node: unknown): Json | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const p = findProduct(n);
      if (p) return p;
    }
    return null;
  }
  const o = node as Json;
  const t = o["@type"];
  if (t === "Product" || (Array.isArray(t) && t.includes("Product")) || t === "ProductGroup") return o;
  if (o["@graph"]) return findProduct(o["@graph"]);
  return null;
}

export function parseProductHtml(html: string, url: string): Omit<ScrapedProduct, "source"> {
  let product: Json | null = null;
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      product = findProduct(JSON.parse(m[1].trim()));
      if (product) break;
    } catch {
      /* ignore malformed blocks */
    }
  }
  const offer = product ? (first(product.offers as Json | Json[]) as Json | undefined) : undefined;
  const variant = product?.hasVariant ? (first(product.hasVariant as Json | Json[]) as Json | undefined) : undefined;
  const variantOffer = variant ? (first(variant.offers as Json | Json[]) as Json | undefined) : undefined;
  const image = product ? first(product.image as unknown) : undefined;
  const imageUrl =
    (typeof image === "string" ? image : str((image as Json | undefined)?.url)) ?? meta(html, "og:image") ?? meta(html, "og:image:secure_url") ?? meta(html, "twitter:image");
  const priceRaw = offer?.price ?? offer?.lowPrice ?? variantOffer?.price ?? meta(html, "product:price:amount") ?? meta(html, "og:price:amount");
  const price = priceRaw != null && !Number.isNaN(Number(priceRaw)) ? Number(priceRaw) : null;
  const brand = product?.brand;
  const title = str(product?.name) ?? meta(html, "og:title") ?? decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim() ?? null;
  let abs: string | null = null;
  if (imageUrl) {
    try {
      abs = new URL(imageUrl, url).toString();
    } catch {
      abs = null;
    }
  }
  return {
    url,
    name: title || null,
    brand: str(typeof brand === "string" ? brand : (brand as Json | undefined)?.name) ?? meta(html, "og:brand") ?? meta(html, "product:brand"),
    imageUrl: abs,
    price,
    currency: str(offer?.priceCurrency) ?? str(variantOffer?.priceCurrency) ?? meta(html, "product:price:currency") ?? meta(html, "og:price:currency"),
    colorway: str(product?.color) ?? str(variant?.color) ?? meta(html, "product:color"),
    material: str(product?.material),
    description: (str(product?.description) ?? meta(html, "og:description"))?.slice(0, 600) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
async function viaShopify(u: URL): Promise<ScrapedProduct | null> {
  const m = u.pathname.match(/\/products\/([^/?#]+)/);
  if (!m) return null;
  try {
    const r = await fetch(`${u.origin}/products/${m[1]}.js`, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("json")) return null;
    const p = (await r.json()) as { title?: string; vendor?: string; featured_image?: string; images?: string[]; price?: number; variants?: Array<{ id: number; option1?: string; title?: string; featured_image?: { src?: string } | null; price?: number }>; options?: Array<{ name: string } | string>; description?: string };
    const variantId = u.searchParams.get("variant");
    const v = p.variants?.find((x) => String(x.id) === variantId) ?? p.variants?.[0];
    const optionNames = (p.options ?? []).map((o) => (typeof o === "string" ? o : o.name).toLowerCase());
    const colorIdx = optionNames.findIndex((n) => /colou?r/.test(n));
    const img = v?.featured_image?.src ?? p.featured_image ?? p.images?.[0] ?? null;
    return {
      url: u.toString(),
      name: p.title ?? null,
      brand: p.vendor ?? null,
      imageUrl: img ? (img.startsWith("//") ? `https:${img}` : img) : null,
      price: typeof (v?.price ?? p.price) === "number" ? (v?.price ?? p.price)! / 100 : null,
      currency: null,
      colorway: colorIdx === 0 ? v?.option1 ?? null : colorIdx > 0 ? v?.title?.split(" / ")[colorIdx] ?? null : null,
      material: null,
      description: p.description ? p.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600) : null,
      source: "shopify",
    };
  } catch {
    return null;
  }
}

async function viaScrapling(u: URL): Promise<string | null> {
  const base = process.env.SCRAPLING_URL;
  if (!base) return null;
  try {
    const r = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.SCRAPLING_TOKEN ? { Authorization: `Bearer ${process.env.SCRAPLING_TOKEN}` } : {}) },
      body: JSON.stringify({ url: u.toString() }),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) return null;
    const type = r.headers.get("content-type") ?? "";
    if (type.includes("json")) {
      const b = (await r.json()) as { html?: string; content?: string; body?: string };
      return b.html ?? b.content ?? b.body ?? null;
    }
    return await r.text();
  } catch {
    return null;
  }
}

async function viaFirecrawl(u: URL): Promise<string | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ url: u.toString(), formats: ["rawHtml"], onlyMainContent: false }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) return null;
    const b = (await r.json()) as { data?: { rawHtml?: string; html?: string } };
    return b.data?.rawHtml ?? b.data?.html ?? null;
  } catch {
    return null;
  }
}

async function viaFetch(u: URL): Promise<string | null> {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" }, signal: AbortSignal.timeout(12000) });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

/** Scrape one product page through the provider chain. */
export async function scrapeProduct(raw: string): Promise<ScrapedProduct> {
  const u = safeUrl(raw);
  if (!u) throw new ScrapeError("bad_url", "Use a full https product link.");
  const strategy = strategyFor(u);

  if (strategy.tryShopify) {
    const s = await viaShopify(u);
    if (s?.imageUrl) return s;
  }
  const order: Array<["scrapling" | "firecrawl" | "fetch", (u: URL) => Promise<string | null>]> = strategy.needsBrowser
    ? [["scrapling", viaScrapling], ["firecrawl", viaFirecrawl], ["fetch", viaFetch]]
    : [["fetch", viaFetch], ["scrapling", viaScrapling], ["firecrawl", viaFirecrawl]];
  let sawPage = false;
  for (const [source, fn] of order) {
    const html = await fn(u);
    if (!html || html.length < 500) continue;
    sawPage = true;
    const parsed = parseProductHtml(html, u.toString());
    if (parsed.imageUrl) return { ...parsed, source };
  }
  throw new ScrapeError(
    sawPage ? "not_product" : "blocked",
    sawPage
      ? "The page loaded but no product photo was found. Upload a screenshot instead."
      : `${strategy.label ?? u.hostname} did not let the page load. Upload a screenshot instead.`
  );
}

/** Download a product image (capped) for tagging and storage. */
export async function fetchImage(url: string): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  const u = safeUrl(url);
  if (!u) return null;
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "image/jpeg,image/png,image/webp,image/*" }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    let type = (r.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (type === "image/jpg" || type === "image/pjpeg") type = "image/jpeg";
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type)) return null;
    const bytes = await r.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024) return null;
    return { bytes, type };
  } catch {
    return null;
  }
}
