/* Fabulous Future Me offline studio shell.
 * Caches the app shell, built assets, and Vite dev modules (same-origin GET only).
 * Never caches API calls, uploads, signed URLs, or cross-origin requests. */
const CACHE = 'ffm-shell-v1';
const SCOPE = new URL(self.registration.scope);
const SHELL_URL = SCOPE.pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add(new Request(SHELL_URL, { cache: 'reload' })).catch(() => undefined)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

function skippable(url, request) {
  if (request.method !== 'GET') return true;
  if (url.origin !== self.location.origin) return true;
  if (url.pathname.includes('/api/')) return true;
  if (url.pathname.includes('/@vite/client') || url.pathname.includes('__vite_ping')) return true;
  if (url.searchParams.has('token') || url.searchParams.has('X-Amz-Signature') || url.searchParams.has('signature')) return true;
  if (request.headers.get('range')) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (skippable(url, request)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(SHELL_URL, copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (await cache.match(SHELL_URL)) || (await cache.match(request)) || new Response('<h1>Offline</h1><p>Your studio will open once you reconnect.</p>', { headers: { 'Content-Type': 'text/html' } });
        }),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((res) => {
          if (res.ok && res.type === 'basic') cache.put(request, res.clone());
          return res;
        })
        .catch(() => cached || Response.error());
      return cached || network;
    }),
  );
});

/* The page posts every same-origin asset it loaded (route modules, CSS, fonts) so they are precached. */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'precache' || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        data.urls.map((u) => {
          try {
            const url = new URL(u, self.location.href);
            const req = new Request(url.href);
            if (skippable(url, req)) return undefined;
            return cache.match(req).then((hit) => hit || fetch(req).then((res) => (res.ok ? cache.put(req, res) : undefined)).catch(() => undefined));
          } catch (e) {
            return undefined;
          }
        }),
      ),
    ),
  );
});
