// Session 9: the retailer playbook as code. Each entry says how a site's product
// pages behave, so the scraper picks the right path first.

export type Strategy = {
  label?: string;
  /** The site is a Shopify store: /products/<handle>.js returns clean JSON. */
  tryShopify?: boolean;
  /** Pages render with JavaScript; go straight to the browser-based providers. */
  needsBrowser?: boolean;
  /** A note shown when scraping fails. */
  tip?: string;
  /** Related site worth checking for markdowns. */
  markdownsAt?: string;
};

const PLAYBOOK: Record<string, Strategy> = {
  "revolve.com": { label: "Revolve", tip: "Direct page fetch usually works." },
  "lagence.com": { label: "L'Agence", needsBrowser: true, tip: "Pages render with JavaScript. If it fails, search the product name plus colorway, or check Nordstrom Rack.", markdownsAt: "nordstromrack.com" },
  "azazie.com": { label: "Azazie", needsBrowser: true, tip: "Product images often fail to load; a screenshot works best." },
  "nordstromrack.com": { label: "Nordstrom Rack", needsBrowser: true, tip: "Often carries L'Agence markdowns." },
  "nordstrom.com": { label: "Nordstrom", needsBrowser: true },
  "amazon.com": { label: "Amazon", needsBrowser: true, tip: "Amazon blocks most scrapers; a screenshot is the reliable route." },
  "joahbrown.com": { label: "Joah Brown", tryShopify: true },
  "vuoriclothing.com": { label: "Vuori", tryShopify: true },
  "travismathew.com": { label: "TravisMathew", tryShopify: true },
  "badbirdiegolf.com": { label: "Bad Birdie", tryShopify: true },
  "comfrt.com": { label: "Comfrt", tryShopify: true },
  "rhoback.com": { label: "Rhoback", tryShopify: true },
  "twillory.com": { label: "Twillory", tryShopify: true },
  "redvanly.com": { label: "Redvanly", tryShopify: true },
  "goodamerican.com": { label: "Good American", tryShopify: true },
  "skims.com": { label: "SKIMS", needsBrowser: true },
};

export function strategyFor(u: URL): Strategy {
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const hit = Object.entries(PLAYBOOK).find(([d]) => host === d || host.endsWith(`.${d}`));
  if (hit) return { tryShopify: false, ...hit[1] };
  // Unknown stores: any /products/<handle> path is probably Shopify, so try that first.
  return { tryShopify: /\/products\/[^/]+/.test(u.pathname) };
}

export function retailerName(u: URL): string {
  return strategyFor(u).label ?? u.hostname.replace(/^www\./, "");
}
