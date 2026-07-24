/**
 * THULUTH service worker — hand-rolled, no build-time dependency.
 *
 * Design constraints (see PROJECT_OVERVIEW.md §3):
 *   - Reads are realtime Firestore over the client SDK (cross-origin websocket/
 *     long-poll to *.googleapis.com etc). The SW MUST NOT touch those.
 *   - Writes are Server Actions (same-origin POST) — never GET, so never cached.
 *   - `/api/*` (session cookie handoff) must always hit the network.
 *
 * So the SW only ever handles **same-origin GET** requests, and even then leaves
 * anything under /api alone. Cross-origin (Firebase, fonts CDN) is passed straight
 * through untouched.
 *
 * Bump CACHE_VERSION to invalidate every cache and trigger the update flow.
 */
const CACHE_VERSION = 'v1';
const CACHE = `thuluth-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// Minimal app shell precached on install so a cold offline launch still renders.
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
];

const ASSET_RE = /\.(?:png|svg|jpg|jpeg|webp|gif|ico|woff2?|ttf|otf)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // addAll is atomic-ish; tolerate a single 404 without failing the install.
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      // Do NOT skipWaiting here: on an update we want the new SW to wait so the
      // app can surface an "update available" prompt. First install (no previous
      // controller) still activates immediately — there is nothing to wait behind.
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// The update flow: the page posts SKIP_WAITING, we activate, the page reloads.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return; // Server Actions, session POSTs — untouched
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase / cross-origin — untouched
  if (url.pathname.startsWith('/api/')) return; // session route — always network

  // Full-page navigations: network-first, fall back to the offline shell.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  // Immutable, content-hashed build output + static media/icons: fast + fresh.
  if (url.pathname.startsWith('/_next/static/') || ASSET_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Everything else same-origin GET (incl. RSC payloads): prefer network, fall
  // back to cache when offline. Never returns undefined.
  event.respondWith(networkFirst(req));
});

async function networkFirstNavigation(req) {
  try {
    return await fetch(req);
  } catch {
    const cached = await caches.match(OFFLINE_URL, { ignoreSearch: true });
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network || new Response('', { status: 504 });
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    return cached || new Response('', { status: 504, statusText: 'Offline' });
  }
}
