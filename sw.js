const CACHE_NAME = 'leavetrack-v4';
const ASSETS = [
  './',
  './index.html',
  // Query strings must match the tags in index.html — the cache is keyed on the
  // full URL, so './app.js' would never serve a request for './app.js?v=4'.
  './style.css?v=4',
  './i18n.js?v=4',
  './app.js?v=4',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
