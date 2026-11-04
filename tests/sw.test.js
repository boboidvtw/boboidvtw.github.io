// sw.js 的同源共存行為：主站 SW 的 scope 是 '/'，同一個 origin 上還有子路徑 App
// （例：/super-calculator/ 的 Workbox SW）。這裡守兩件事：
//   1. activate 只清自己（sigma-calc-*）的舊快取，不碰別的 App 的快取
//   2. fetch 不攔截子路徑 App 的請求（不呼叫 respondWith）
// 與 extract.js 同理：每次執行時讀真正上線的 ../sw.js，不放副本。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SW_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const ORIGIN = 'https://boboidvtw.github.io';

function loadSw(existingCacheKeys = []) {
  const listeners = {};
  const deleted = [];
  const caches = {
    keys: async () => [...existingCacheKeys],
    delete: async k => { deleted.push(k); return true; },
    open: async () => ({ addAll: async () => {}, put: async () => {} }),
    match: async () => undefined,
  };
  const self = {
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting: () => {},
    clients: { claim: () => {} },
  };
  const context = vm.createContext({
    self, caches, URL, Promise, Response: { error: () => 'network-error' },
    location: { origin: ORIGIN },
    fetch: async () => ({ ok: true, clone() { return this; } }),
  });
  vm.runInContext(SW_SOURCE, context, { filename: 'sw.js' });
  const cacheName = vm.runInContext('CACHE_NAME', context);
  return { listeners, deleted, cacheName };
}

async function runActivate(keys) {
  const sw = loadSw(keys);
  let pending;
  sw.listeners.activate({ waitUntil: p => { pending = p; } });
  await pending;
  return sw;
}

function runFetch(url) {
  const sw = loadSw();
  let responded = false;
  sw.listeners.fetch({
    request: { url, method: 'GET' },
    respondWith: () => { responded = true; },
  });
  return responded;
}

test('activate 刪掉自己的舊版快取', async () => {
  const { cacheName } = loadSw();
  const { deleted } = await runActivate([cacheName, 'sigma-calc-v3.11.1', 'sigma-calc-v3.9.0']);
  assert.deepEqual(deleted.sort(), ['sigma-calc-v3.11.1', 'sigma-calc-v3.9.0']);
});

test('activate 不刪目前版本與同源其他 App 的快取', async () => {
  const { cacheName } = loadSw();
  const foreign = [
    'workbox-precache-v2-https://boboidvtw.github.io/super-calculator/',
    'exchange-rates',
    'workbox-runtime-https://boboidvtw.github.io/super-calculator/',
  ];
  const { deleted } = await runActivate([cacheName, ...foreign]);
  assert.deepEqual(deleted, []);
});

test('fetch 不攔截 /super-calculator/ 底下的請求', () => {
  assert.equal(runFetch(`${ORIGIN}/super-calculator/`), false);
  assert.equal(runFetch(`${ORIGIN}/super-calculator/assets/index-abc.js`), false);
});

test('fetch 仍攔截主站自己的同源請求', () => {
  assert.equal(runFetch(`${ORIGIN}/`), true);
  assert.equal(runFetch(`${ORIGIN}/js/pro-ui.js`), true);
  // 只排除整段路徑前綴，不誤傷名稱相近的檔案
  assert.equal(runFetch(`${ORIGIN}/super-calculator.html`), true);
});
