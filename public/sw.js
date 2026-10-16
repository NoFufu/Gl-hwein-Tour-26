// Offline-Cache für die Glühwein-Tour. Nur gleiche Herkunft, Karten-Kacheln bleiben außen vor.
const CACHE = 'gluehwein26-v11';
const TILES = 'gluehwein26-tiles';
const BASE = new URL('./', self.location).pathname; // '/' oder '/<Repo-Name>/'
const SHELL = [BASE, BASE + 'manifest.webmanifest', BASE + 'favicon-64.png', BASE + 'icon-192.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE && key !== TILES).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.hostname === 'tiles.openfreemap.org') {
    // Kartenkacheln: gespeicherte zuerst, im Hintergrund aktualisieren. So bleibt die Karte offline brauchbar.
    event.respondWith(
      caches.open(TILES).then(cache =>
        cache.match(request).then(hit => {
          const fresh = fetch(request).then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          }).catch(() => hit || Response.error());
          return hit || fresh;
        })
      )
    );
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/version.json')) return; // immer frisch vom Server

  if (request.mode === 'navigate') {
    // Seite: erst Netz, bei Fehler die zuletzt gespeicherte Startseite.
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(BASE, copy));
          return response;
        })
        .catch(() => caches.match(BASE))
    );
    return;
  }

  // Dateien (JS, CSS, Schrift, Bilder): aus dem Cache, im Hintergrund aktualisieren.
  event.respondWith(
    caches.match(request).then(cached => {
      const fresh = fetch(request)
        .then(response => {
          if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => cached || Response.error());
      return cached || fresh;
    })
  );
});
