const APP = "https://www.myvalette.com";
const out = document.getElementById("out");

// Page text only ever goes in through textContent, never as HTML.
const el = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};
const link = (text, href) => {
  const a = el("a", text, "btn");
  a.href = href;
  a.target = "_blank";
  return a;
};
const show = (...nodes) => out.replaceChildren(...nodes);

/** Runs inside the product page: what the store says about the product, and the reviews on screen. */
function readPage() {
  const clip = (s, n) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : "") || null;
  // shortcut: reads 1,299.00 style prices; a store that writes 1.299,00 comes out wrong and the server's own reading wins when it has one.
  const num = (v) => {
    const x = parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(x) && x > 0 ? x : null;
  };
  const meta = (k) => document.querySelector(`meta[property="${k}"], meta[name="${k}"]`)?.content ?? null;
  let p = null;
  const walk = (o) => {
    if (!o || typeof o !== "object" || p) return;
    if (Array.isArray(o)) return o.forEach(walk);
    const types = [].concat(o["@type"] ?? []);
    if (types.includes("Product") || types.includes("ProductGroup")) p = o;
    else walk(o["@graph"]);
  };
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      walk(JSON.parse(s.textContent));
    } catch {}
  }
  const offer = [].concat(p?.offers ?? [])[0] ?? {};
  const image = [].concat(p?.image ?? [])[0];
  const rating = num(p?.aggregateRating?.ratingValue);
  const count = parseInt(p?.aggregateRating?.reviewCount ?? p?.aggregateRating?.ratingCount, 10);
  const seen = [
    ...[].concat(p?.review ?? []).map((r) => r?.reviewBody ?? r?.description),
    ...[...document.querySelectorAll('[itemprop="reviewBody"], [data-hook="review-body"], [class*="review-text" i], [class*="review-body" i], [class*="review-content" i], [class*="reviewText" i]')].map((e) => e.innerText),
  ]
    .map((t) => clip(t, 500))
    .filter((t, i, all) => t && t.length > 15 && all.indexOf(t) === i)
    .slice(0, 30);
  return {
    link: location.href,
    page: {
      name: clip(p?.name ?? meta("og:title") ?? document.title, 300),
      brand: clip(typeof p?.brand === "string" ? p.brand : p?.brand?.name, 300),
      image: clip(typeof image === "string" ? image : (image?.url ?? meta("og:image")), 2000),
      price: num(offer.price ?? offer.lowPrice ?? meta("product:price:amount")),
      currency: clip(offer.priceCurrency ?? meta("product:price:currency"), 10),
      listPrice: num(meta("product:original_price:amount")),
      rating: rating != null && rating <= 5 ? rating : null,
      reviewCount: Number.isInteger(count) && count >= 0 ? count : null,
    },
    reviews: seen,
  };
}

const post = (path, body) => fetch(APP + path, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const LABEL = { buy: "✓ worth buying", wait: "◐ wait", skip: "✕ skip it" };
const SIZE = { size_up: "Size up", size_down: "Size down", true_to_size: "True to size", mixed: "Sizing is mixed" };
const line = (label, text) => {
  const p = el("p");
  p.append(el("b", `${label}. `), text);
  return p;
};

const button = (text, onClick, cls = "btn") => {
  const b = el("button", text, cls);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
};

/** Signed out, unreachable or refused: a message instead of the result. Null when the response is good. */
async function problem(res, fallbackLink) {
  if (!res) return [el("p", "Couldn't reach valette. Check your connection and try again.")];
  // Signed out: the app redirects every request to /login.
  if (res.status === 401 || res.redirected) return [el("p", "Sign in to valette, then click this again on the product page."), link("Sign in", `${APP}/login`)];
  if (res.ok) return null;
  const body = await res.json().catch(() => ({}));
  return [el("p", body.detail || "Couldn't save that. Try again."), link("Open valette", fallbackLink)];
}

async function toList(data) {
  show(el("p", "Saving it to your shopping list…"));
  const res = await post("/api/wishlist/save", { link: data.link, page: data.page }).catch(() => null);
  const bad = await problem(res, `${APP}/save?url=${encodeURIComponent(data.link)}`);
  if (bad) return show(...bad);
  const body = await res.json().catch(() => ({}));
  const c = body.candidate;
  const head = [
    el("h1", c.name || "Saved"),
    el("p", [body.already ? "Already on your shopping list" : "On your shopping list", c.price != null ? `$${Number(c.price).toFixed(2)}` : null, c.watch ? "watching the price" : null].filter(Boolean).join(" · "), "muted"),
  ];
  const open = link("Open in valette", `${APP}/wishlist#saved`);
  show(...head, el("p", "Reading reviews…", "muted"), open);

  const adv = await post("/api/wishlist/advise", { id: c.id, reviews: data.reviews }).catch(() => null);
  const a = adv?.ok && !adv.redirected ? (await adv.json().catch(() => ({}))).candidate?.advice : null;
  if (!a) return show(...head, el("p", "We couldn't review it just now. Ask again from your saved products.", "muted"), open);
  show(
    ...head,
    el("span", LABEL[a.verdict], `chip ${a.verdict}`),
    el("p", a.headline),
    line(SIZE[a.sizing] ?? "Sizing", a.sizingNote),
    line("Price", a.price),
    open
  );
}

async function toCloset(data) {
  show(el("p", "Adding it to your closet…"));
  const res = await post("/api/closet/import", { link: data.link, page: data.page }).catch(() => null);
  const bad = await problem(res, `${APP}/save?to=closet&url=${encodeURIComponent(data.link)}`);
  if (bad) return show(...bad);
  const { item, already } = await res.json().catch(() => ({}));
  show(
    el("h1", item?.name || "Added"),
    el("p", [already ? "Already in your closet" : "Added to your closet", item?.price != null ? `$${Number(item.price).toFixed(2)}` : null].filter(Boolean).join(" · "), "muted"),
    el("p", "Check its color and type in valette, then it shows up in your outfits."),
    link("Check the details", `${APP}/closet/${item?.id ?? ""}`)
  );
}

async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let data;
  try {
    [{ result: data }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readPage });
  } catch {
    return show(el("p", "Open a product page in a store, then click this again."));
  }
  show(
    el("h1", data.page.name || "This product"),
    el("p", "Add it to", "muted"),
    el("div", null, "choices"),
  );
  out.querySelector(".choices").append(
    button("Shopping list", () => toList(data)),
    button("My closet (I bought it)", () => toCloset(data), "btn quiet")
  );
}

main().catch(() => show(el("p", "Something went wrong. Try again.")));
