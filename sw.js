// Offline support. Serves the saved copy instantly (works with no signal),
// then quietly fetches a fresh copy for next time. After you deploy an
// update, it shows up the second time she opens the app.
const CACHE = 'feed-tracker-v2';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope)) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    // 'no-cache' = always ask the server, so a new deploy is picked up.
    const fresh = fetch(req.url, { cache: 'no-cache' })
      .then(res => { if (res.ok && !new URL(req.url).search) cache.put(req, res.clone()); return res; })
      .catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    return (await fresh) || new Response('Offline', { status: 503 });
  }));
});
