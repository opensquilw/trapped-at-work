const CACHE_NAME = 'leavetrack-v6';
const ASSETS = [
  './',
  './index.html',
  // Query strings must match the tags in index.html — the cache is keyed on the
  // full URL, so './app.js' would never serve a request for './app.js?v=6'.
  './style.css?v=6',
  './i18n.js?v=6',
  './app.js?v=6',
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

// Network-first for the app shell (page, scripts, styles) so an installed
// home-screen app picks up new versions on its next launch instead of serving
// a stale copy forever. Cache is the offline fallback, not the default source.
// Everything else (icons) stays cache-first — those are small and stable.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  const isShell = req.mode === 'navigate' ||
    ['document', 'script', 'style'].includes(req.destination);

  if (isShell) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
  } else {
    e.respondWith(caches.match(req).then(c => c || fetch(req)));
  }
});
