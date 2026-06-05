const CACHE_VERSION = "timetable-offline-v2026-06-05-1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const VOTES_CACHE = `${CACHE_VERSION}-votes`;
const MAX_RUNTIME_ENTRIES = 90;
const MAX_IMAGE_ENTRIES = 40;

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon.png",
  "/apple-icon.png",
  "/og-image.png",
  "/images/rock-am-ring-bg.png",
  "/images/stagetopia-bg.png",
  "/images/southside-bg.png",
  "/images/highfield-bg.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("timetable-offline-") && !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === "/api/votes") {
    event.respondWith(networkFirst(request, VOTES_CACHE));
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(navigationHandler(request));
    return;
  }

  if (isBuildAsset(url)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE, MAX_RUNTIME_ENTRIES));
    return;
  }

  if (isImageRequest(request, url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, MAX_RUNTIME_ENTRIES));
    return;
  }

  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

function isNavigationRequest(request) {
  return request.mode === "navigate" || request.headers.get("accept")?.includes("text/html");
}

function isBuildAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image");
}

function isImageRequest(request, url) {
  return request.destination === "image" || /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(url.pathname);
}

function isStaticAsset(url) {
  return /\.(css|js|mjs|json|txt|webmanifest|woff2?)$/i.test(url.pathname);
}

async function navigationHandler(request) {
  try {
    const fresh = await fetch(request);
    if (isCacheable(fresh)) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put("/", fresh.clone());
    }
    return fresh;
  } catch {
    return (await caches.match(request)) || (await caches.match("/")) || offlineResponse();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (isCacheable(fresh)) await cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return (await cache.match(request)) || (await caches.match(request)) || offlineJsonResponse();
  }
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const fresh = await fetch(request);
  if (isCacheable(fresh)) {
    await cache.put(request, fresh.clone());
    await trimCache(cacheName, maxEntries);
  }
  return fresh;
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const freshPromise = fetch(request)
    .then(async (fresh) => {
      if (isCacheable(fresh)) {
        await cache.put(request, fresh.clone());
        await trimCache(cacheName, maxEntries);
      }
      return fresh;
    })
    .catch(() => undefined);

  return cached || (await freshPromise) || offlineResponse();
}

function isCacheable(response) {
  return response && response.ok && (response.type === "basic" || response.type === "default");
}

async function trimCache(cacheName, maxEntries = 80) {
  if (!maxEntries) return;
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map((key) => cache.delete(key)));
}

function offlineJsonResponse() {
  return new Response("{}", {
    status: 200,
    headers: { "Content-Type": "application/json", "X-Timetable-Offline": "1" }
  });
}

function offlineResponse() {
  return new Response("Timetable ist offline verfügbar. Öffne die App einmal online, dann bleibt der Zeitplan lokal nutzbar.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
