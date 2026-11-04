// ∑ Calc Service Worker — Cache-first for offline support
// 只用這個前綴辨認「自己的」快取。同一個 origin 上還有別的 App（見 EXCLUDED_PATH_PREFIXES），
// activate 清舊快取時只能動這個前綴底下的，否則會把它們的離線快取一起刪掉。
const CACHE_PREFIX = 'sigma-calc-';
const CACHE_NAME = CACHE_PREFIX + 'v3.11.3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/pro-config.js',
  '/js/license-api.js',
  '/js/pro-manager.js',
  '/js/paypal-integration.js',
  '/js/pro-ui.js'
];

// Bypass cache for Cloudflare Worker license API (always go network-first)
const NETWORK_FIRST_HOSTS = ['workers.dev', 'exchangerate', 'paypal'];

// 同源上的獨立子路徑 App（各有自己的 SW）。本 SW 的 scope 是 '/'，不排除的話會在它們
// 自己的 SW 註冊前攔截並快取它們的檔案。新增子路徑專案時加進這裡，結尾要帶 '/'。
const EXCLUDED_PATH_PREFIXES = ['/super-calculator/'];

// Install: pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean our own old caches only (never other same-origin apps' caches)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for same-origin, network-first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 子路徑 App：不 respondWith，交給瀏覽器（或該 App 自己的 SW）處理
  if (url.origin === location.origin &&
      EXCLUDED_PATH_PREFIXES.some(prefix => url.pathname.startsWith(prefix))) {
    return;
  }

  // Network-first for external APIs (exchange rate, PayPal, Cloudflare Worker)
  if (NETWORK_FIRST_HOSTS.some(host => url.hostname.includes(host))) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        // 只有 GET 有快取可回退；非冪等請求（POST 等）離線就回乾淨的 network error。
        // 關鍵：caches.match 未命中會 resolve 成 undefined，直接回傳會讓
        // respondWith(undefined) 丟 TypeError，把單純的網路失敗變成看不懂的 SW 錯誤。
        if (event.request.method === 'GET') {
          const cached = await caches.match(event.request);
          if (cached) return cached;
        }
        return Response.error();
      })
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
