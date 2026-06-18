const CACHE_VERSION = "timetable-offline-v2026-06-18-1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const VOTES_CACHE = `${CACHE_VERSION}-votes`;
const POST_QUEUE_DB = "timetable-offline-db";
const POST_QUEUE_STORE = "vote-posts";
const MAX_RUNTIME_ENTRIES = 180;
const MAX_IMAGE_ENTRIES = 80;

const APP_SHELL = [
  "/",
  "/api/votes",
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
      .then(() => notifyClients({ type: "OFFLINE_READY" }))
      .then(() => replayQueuedVotePosts())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "SYNC_VOTES") event.waitUntil(replayQueuedVotePosts());
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-votes") event.waitUntil(replayQueuedVotePosts());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.method === "POST" && url.pathname === "/api/votes") {
    event.respondWith(votePostHandler(request));
    return;
  }

  if (request.method !== "GET") return;

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

async function votePostHandler(request) {
  const body = await request.clone().text();
  try {
    const fresh = await fetch(request);
    if (!fresh.ok) throw new Error(`Vote POST failed: ${fresh.status}`);
    await cacheVotesResponse(fresh.clone());
    return fresh;
  } catch {
    const payload = parseVoteBody(body);
    if (!payload) return offlineJsonResponse();
    const queuedVote = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, payload, createdAt: Date.now() };
    await addQueuedVotePost(queuedVote);
    await self.registration.sync?.register("sync-votes").catch(() => undefined);
    const cachedVotes = await readCachedVotes();
    const nextVotes = togglePerson(cachedVotes, payload.actId, payload.name);
    await writeCachedVotes(nextVotes);
    return new Response(JSON.stringify(nextVotes), {
      status: 202,
      headers: { "Content-Type": "application/json", "X-Timetable-Offline-Queued": "1" }
    });
  }
}

function parseVoteBody(body) {
  try {
    const payload = JSON.parse(body);
    if (!payload.actId || !payload.name?.trim()) return null;
    return { actId: String(payload.actId), name: String(payload.name).trim().slice(0, 40) };
  } catch {
    return null;
  }
}

async function replayQueuedVotePosts() {
  const queuedVotes = await getQueuedVotePosts();
  for (const queuedVote of queuedVotes) {
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queuedVote.payload)
      });
      if (!response.ok) throw new Error(`Vote replay failed: ${response.status}`);
      await cacheVotesResponse(response.clone());
      await deleteQueuedVotePost(queuedVote.id);
    } catch {
      return;
    }
  }
  await notifyClients({ type: "VOTES_SYNCED" });
}

async function cacheVotesResponse(response) {
  if (!isCacheable(response)) return;
  const cache = await caches.open(VOTES_CACHE);
  await cache.put("/api/votes", response);
}

async function readCachedVotes() {
  const cached = await caches.match("/api/votes");
  if (!cached) return {};
  try {
    return await cached.json();
  } catch {
    return {};
  }
}

async function writeCachedVotes(votes) {
  const cache = await caches.open(VOTES_CACHE);
  await cache.put("/api/votes", new Response(JSON.stringify(votes), { headers: { "Content-Type": "application/json" } }));
}

function togglePerson(votes, actId, name) {
  const current = new Set(votes[actId] ?? []);
  if (current.has(name)) current.delete(name);
  else current.add(name);
  return {
    ...votes,
    [actId]: Array.from(current).sort((a, b) => a.localeCompare(b, "de"))
  };
}

function openVoteQueueDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(POST_QUEUE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(POST_QUEUE_STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withVoteStore(mode, callback) {
  const db = await openVoteQueueDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(POST_QUEUE_STORE, mode);
    const store = transaction.objectStore(POST_QUEUE_STORE);
    const result = callback(store);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => db.close());
}

async function addQueuedVotePost(queuedVote) {
  return withVoteStore("readwrite", (store) => store.put(queuedVote));
}

async function deleteQueuedVotePost(id) {
  return withVoteStore("readwrite", (store) => store.delete(id));
}

async function getQueuedVotePosts() {
  const request = await withVoteStore("readonly", (store) => store.getAll());
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result.sort((a, b) => a.createdAt - b.createdAt));
    request.onerror = () => reject(request.error);
  });
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

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
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
