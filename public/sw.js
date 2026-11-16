/*
 * Built Daily service worker. Kept small and dependency-free on purpose.
 *
 * - Pages: network first. A page you've opened before still loads offline
 *   (the app shell; your data comes from Firestore's offline cache).
 *   A page you've never opened shows /offline.html.
 * - Hashed build assets (/_next/static) and icons: cache first; they never change.
 * - Everything else (API routes, Firestore, auth, Sentry): straight to the network.
 *
 * Bump VERSION to drop old caches when this file's strategy changes.
 */
const VERSION = "v1";
const STATIC_CACHE = `built-daily-static-${VERSION}`;
const PAGE_CACHE = `built-daily-pages-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const MAX_PAGES = 40;

const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("built-daily-") && key !== STATIC_CACHE && key !== PAGE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

async function trimPages() {
  const cache = await caches.open(PAGE_CACHE);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_PAGES)).map((key) => cache.delete(key)));
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    // Never cache a redirect: replaying one for a navigation fails in some browsers.
    if (response.ok && response.type === "basic" && !response.redirected) {
      await cache.put(request, response.clone());
      void trimPages();
    }
    return response;
  } catch {
    // Same path with any query string (e.g. /workout?e=…) before giving up.
    const cached = (await cache.match(request)) ?? (await cache.match(request, { ignoreSearch: true }));
    return cached ?? (await caches.match(OFFLINE_URL));
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});
