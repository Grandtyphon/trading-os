// Trading OS Service Worker — offline-first caching.
// Caches the app shell so journal/backtest/analytics work fully offline.
// Update flow: a new version installs in the "waiting" state; the page shows
// an update toast and posts SKIP_WAITING when the user accepts.
const CACHE_VERSION = "tos-v5";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/icon-maskable.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  // NOTE: no skipWaiting here — updates wait for the user to accept them via
  // the in-app toast (first install activates naturally when nothing waits).
});

// the page asks the waiting worker to take over when the user taps "به‌روزرسانی"
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only handle GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache the mentor API or cross-origin / analytics
  if (url.pathname.startsWith("/api/")) return;

  // For same-origin navigation requests: network-first, fallback to cache (offline support)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // For static assets (Next.js chunks, fonts, images): stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(request, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
