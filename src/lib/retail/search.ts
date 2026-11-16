import "server-only";

// Product search for sourcing. Firecrawl search when its key is set, otherwise
// DuckDuckGo's HTML results. Either way only product-looking links are kept.

export type SearchHit = { url: string; title: string };

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

const PRODUCTISH = /\/products?\/|\/p\/|\/dp\/|\/item\/|\/shop\/.+\/.+|product|-p-\d|\/\d{5,}/i;
const SKIP = /pinterest|reddit|youtube|facebook|instagram|tiktok|wikipedia|\.pdf$|blog|review|best-|top-\d/i;

async function viaFirecrawl(query: string, limit: number): Promise<SearchHit[] | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, limit }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const b = (await r.json()) as { data?: Array<{ url?: string; title?: string }> };
    return (b.data ?? []).filter((d) => d.url).map((d) => ({ url: d.url!, title: d.title ?? d.url! }));
  } catch {
    return null;
  }
}

async function viaDuckDuckGo(query: string): Promise<SearchHit[]> {
  try {
    const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return [];
    const html = await r.text();
    const hits: SearchHit[] = [];
    for (const m of html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      let href = m[1].replace(/&amp;/g, "&");
      const uddg = href.match(/[?&]uddg=([^&]+)/)?.[1];
      if (uddg) href = decodeURIComponent(uddg);
      if (href.startsWith("//")) href = `https:${href}`;
      hits.push({ url: href, title: m[2].replace(/<[^>]+>/g, "").trim() });
    }
    return hits;
  } catch {
    return [];
  }
}

/** Run several queries and return unique product-looking links, capped. */
export async function searchProducts(queries: string[], cap = 10): Promise<{ hits: SearchHit[]; provider: "firecrawl" | "duckduckgo" }> {
  const seen = new Set<string>();
  const hits: SearchHit[] = [];
  let provider: "firecrawl" | "duckduckgo" = process.env.FIRECRAWL_API_KEY ? "firecrawl" : "duckduckgo";
  for (const q of queries) {
    let got = provider === "firecrawl" ? await viaFirecrawl(q, 8) : null;
    if (!got) {
      provider = "duckduckgo";
      got = await viaDuckDuckGo(q);
    }
    for (const h of got) {
      let u: URL;
      try {
        u = new URL(h.url);
      } catch {
        continue;
      }
      if (u.protocol !== "https:" || SKIP.test(h.url) || !PRODUCTISH.test(u.pathname)) continue;
      const key = `${u.hostname}${u.pathname}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ url: `${u.origin}${u.pathname}${u.search}`, title: h.title });
      if (hits.length >= cap) return { hits, provider };
    }
  }
  return { hits, provider };
}
