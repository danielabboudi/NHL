/* NHL Model service worker.
   Strategy: NETWORK-FIRST for navigations (the dashboard updates weekly — a
   stale cached page is worse than a spinner), falling back to the last
   cached copy offline. CACHE-FIRST for same-origin static assets (icons,
   manifest). Cross-origin (Plotly CDN, Google Fonts) is left to the browser's
   normal HTTP cache. Bump VERSION when the shell strategy changes. */
const VERSION = "nhl-model-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;   // CDN: browser cache

  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((resp) => {
          const copy = resp.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return resp;
        })
    )
  );
});
