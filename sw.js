// ∑ Calc Service Worker — Cache-first for offline support
const CACHE_NAME = 'sigma-calc-v3.1.1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for same-origin, network-first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for exchange rate API
  if (url.hostname.includes('exchangerate') || url.hostname.includes('paypal') || url.hostname.includes('googlesyndication')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for same-origin assets
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
