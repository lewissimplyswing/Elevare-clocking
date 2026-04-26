/* ─── Elevare Clocking · sw.js ────────────────────────────────────────────── */
const CACHE_NAME = 'elevare-v2';
const ASSETS = [
  '/Elevare-clocking/',
  '/Elevare-clocking/index.html',
  '/Elevare-clocking/style.css',
  '/Elevare-clocking/app.js',
  '/Elevare-clocking/manifest.json',
  '/Elevare-clocking/icon-192.png',
  '/Elevare-clocking/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Don't cache Firebase API calls
  if (event.request.url.includes('firestore') ||
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic.com/firebasejs')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        if (!resp || resp.status !== 200 || resp.type === 'opaque') return resp;
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return resp;
      }).catch(() => caches.match('/Elevare-clocking/index.html'));
    })
  );
});
