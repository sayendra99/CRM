// Offline-capable service worker. NETWORK-FIRST for same-origin GETs so code
// changes always show when you're online; falls back to cache when offline.
const CACHE = 'barbon-crm-v2';
const CORE = [
  './', './index.html', './css/app.css', './manifest.webmanifest', './assets/icon.svg',
  './js/main.js', './js/dom.js', './js/store.js', './js/storage.js', './js/seed.js',
  './js/logic.js', './js/util.js', './js/quotes.js', './js/notify.js',
  './vendor/preact.module.js', './vendor/hooks.module.js', './vendor/htm.module.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req))
  );
});
