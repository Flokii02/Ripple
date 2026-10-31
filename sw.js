// Service worker: saját fájlok – hálózat először, offline esetén a gyorsítótár.
// A CDN-könyvtárak (Supabase, Leaflet) és a betűtípusok verziózottak, ezért gyorsítótárból jönnek,
// így az app net nélkül is elindul (pl. a vízparton a fogás mentéséhez).
const CACHE = 'ripple-v14';
const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const CORE = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/config.js', 'js/i18n.js', 'js/ui.js', 'js/weather.js', 'js/bite.js',
  'js/seasons.js', 'js/offline.js', 'js/catchcard.js', 'js/install.js', 'js/vendor/suncalc.js', 'js/pages/log.js', 'js/pages/home.js', 'js/pages/spots.js',
  'manifest.webmanifest', 'assets/brand/ripple-icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (CDN.includes(url.hostname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    })));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
