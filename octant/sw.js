/* ══════════════════════════════════════════════════════════════
   OCTANT (ODIN 5.15) — service worker, portée /octant/ (le sien, distinct de celui d'ODIN Mobile).
   · l'appli (coquille) : servie depuis le cache, mise à jour en fond à chaque ouverture ;
   · ../octant.chiffre.json : le réseau d'abord, le dernier fichier reçu si hors ligne
     (en-tête x-octant-cache: 1, pour que la pastille dise « HORS LIGNE »).
   Même site seulement : toute autre adresse est ignorée (et bloquée par la CSP de la page).
   ══════════════════════════════════════════════════════════════ */
const VERSION = 'octant-v1';   // v1 : première version alimentée par le PC (ODIN 5.15)
const COQUILLE = ['./', 'index.html', 'octant.js', 'octant-pc.js', 'octant-pc.css', '../crypto-odin.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'vendor/three.min.js',
  'fonts/fonts.css', 'fonts/jetbrains-mono-latin.woff2', 'fonts/jetbrains-mono-latin-ext.woff2', 'fonts/manrope-latin.woff2',
  'fonts/manrope-latin-ext.woff2', 'fonts/unbounded-latin.woff2', 'fonts/unbounded-latin-ext.woff2'];
const DONNEES = '../octant.chiffre.json';
const DONNEES_FIN = '/octant.chiffre.json';

self.addEventListener('install', e => {
  // cache: 'reload' : jamais l'ancienne copie gardée par le cache du navigateur (même leçon qu'ODIN Mobile v14).
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(COQUILLE.map(u => new Request(u, { cache: 'reload' })))
      .then(() => c.add(new Request(DONNEES, { cache: 'no-store' })).catch(() => {})))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('octant-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith(DONNEES_FIN)) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cle = new URL(DONNEES, self.location.href).href;
      try {
        const r = await fetch(e.request, { cache: 'no-store' });
        if (r.ok) await cache.put(cle, r.clone());
        return r;
      } catch {
        const vieux = await cache.match(cle);
        if (!vieux) throw new Error('hors ligne');
        const h = new Headers(vieux.headers); h.set('x-octant-cache', '1');
        return new Response(await vieux.blob(), { status: 200, headers: h });
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const enCache = await cache.match(e.request, { ignoreSearch: true });
    const frais = fetch(e.request).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => null);
    return enCache || (await frais) || Response.error();
  })());
});
