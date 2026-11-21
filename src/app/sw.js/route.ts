// The service worker, served from the site root so it can control every page.
// Network first for pages (so content is always fresh online), with the last good copy
// replayed when offline. Static build files are cached forever (their names change per build).

const VERSION = "v2";

const SW = `
const VERSION = ${JSON.stringify(VERSION)};
const STATIC = "valette-static-" + VERSION;
const PAGES = "valette-pages-" + VERSION;
const IMAGES = "valette-images-" + VERSION;
const OFFLINE = "/offline";
const CACHED_PAGES = /^\\/(today|plan|closet|outfits|gaps|profile|wishlist|hauls|opinions)(\\/|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll([OFFLINE, "/icon.svg"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("valette-") && !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const clearPrivate = () => Promise.all([caches.delete(PAGES), caches.delete(IMAGES)]);

self.addEventListener("message", (event) => {
  if (event.data === "clear-private") event.waitUntil(clearPrivate());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Signing out wipes what this device kept of the account.
  // Signing out (or arriving at sign-in) wipes what this device kept of the account,
  // and stops notifications for it on this device.
  if (req.method === "POST" && url.origin === location.origin && url.pathname === "/auth/signout") {
    event.waitUntil(Promise.all([clearPrivate(), self.registration.pushManager.getSubscription().then((s) => s && s.unsubscribe()).catch(() => {})]));
    return;
  }
  if (req.mode === "navigate" && url.origin === location.origin && (url.pathname === "/login" || url.pathname.startsWith("/auth/"))) {
    event.waitUntil(clearPrivate());
    return;
  }
  if (req.method !== "GET") return;

  // Private closet photos: signed links change, so match on the path and keep the latest copy.
  if (url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/sign/")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok || res.type === "opaque") {
            const copy = res.clone();
            caches.open(IMAGES).then((c) => c.put(url.origin + url.pathname, copy));
          }
          return res;
        })
        .catch(() => caches.open(IMAGES).then((c) => c.match(url.origin + url.pathname)).then((r) => r || Response.error()))
    );
    return;
  }

  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then((c) =>
        c.match(req).then((hit) => hit || fetch(req).then((res) => (res.ok && c.put(req, res.clone()), res)))
      )
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected && CACHED_PAGES.test(url.pathname)) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(url.pathname + url.search, copy));
          }
          return res;
        })
        .catch(() =>
          caches.open(PAGES)
            .then((c) => c.match(url.pathname + url.search))
            .then((hit) => hit || caches.match(OFFLINE))
            .then((r) => r || new Response("You're offline.", { status: 503, headers: { "content-type": "text/plain" } }))
        )
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "valette", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "valette";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/pwa-icon/192",
      badge: "/pwa-icon/192",
      tag: data.tag || undefined,
      data: { url: data.url || "/today" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/today", location.origin);
  if (target.origin !== location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === location.origin && "focus" in w) {
          w.navigate(target.href);
          return w.focus();
        }
      }
      return self.clients.openWindow(target.href);
    })
  );
});
`;

export function GET() {
  return new Response(SW, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-cache, no-store, must-revalidate",
      "service-worker-allowed": "/",
    },
  });
}
