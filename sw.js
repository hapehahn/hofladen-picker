// Hofladen-Picker – Offline-Unterstützung
// Eigene Dateien: erst Netz (damit Updates sofort ankommen), ohne Netz aus dem Speicher.
// Fremde Dateien (Schriften, Barcode-Erkennung): aus dem Speicher, sonst Netz.
const CACHE = 'hofladen-v3.5.4';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './barcode-polyfill.js', './produkte.csv', './anleitung.pdf', './installation.pdf', './produktliste.pdf', './alltag.pdf'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    const key = url.origin + url.pathname;          // ?t=… beim CSV-Abruf ignorieren
    e.respondWith(
      // no-cache: immer beim Server nachfragen (GitHub hält Seiten sonst bis zu 10 Min. zwischengespeichert)
      fetch(new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' })).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
        return res;
      }).catch(() =>
        caches.match(key).then(r => r || (req.mode === 'navigate'
          ? caches.match('./').then(x => x || caches.match('./index.html'))
          : Response.error()))
      )
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
