/* ══════════════════════════════════════════════════════════════
   ODIN MOBILE — service worker
   · l'appli (coquille) : servie depuis le cache, mise a jour en fond a chaque lancement ;
   · etat.chiffre.json : le reseau d'abord, le dernier etat en cache si hors ligne
     (marque d'un en-tete x-odin-cache: 1 pour que l'appli affiche « HORS LIGNE »).
   Seule exception, hors service worker : les ordres chiffres (ronde, case, pause, relais : ordre-odin.js, POST ntfy.sh).
   ══════════════════════════════════════════════════════════════ */
const VERSION = 'odin-mobile-v14';  // v14 : installation avec fichiers frais (jamais le cache du navigateur) ; v13 : portrait de la fiche agent réduit ~17 % ; v12 : portraits des agents et rubriques par pole ; v11 : reprise valable 24 h ; v10 : pause/reprise et decisions de Relais, sigles des agents 27 a 32 (v9 : cout par agent (v8 : cases a cocher et Actualiser, v7 : lancer une ronde, v6 : Agent Office, v5 : Tokyo Night City, v4 : descriptions, v3 : themes)
const COQUILLE = ['./', 'index.html', 'app.css', 'app.js', 'theme.js', 'scenes.js', 'crypto-odin.js', 'ordre-odin.js', 'chambre-poles.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/saira.woff2', 'fonts/orbitron.woff2', 'fonts/plex-mono-400.woff2', 'fonts/plex-mono-500.woff2', 'fonts/plex-mono-600.woff2'];
// Portraits (miniatures) : au mieux, un echec n'empeche pas l'installation de l'appli.
const MINIS = ['portraits/agent-office-mini.jpg', 'portraits/analyste-mini.jpg', 'portraits/archiviste-mini.jpg', 'portraits/banc-mini.jpg', 'portraits/canari-mini.jpg', 'portraits/cenacle-mini.jpg', 'portraits/chroniqueur-mini.jpg', 'portraits/concierge-mini.jpg', 'portraits/diagnostiqueur-mini.jpg', 'portraits/eclaireur-mini.jpg', 'portraits/gardien-mini.jpg', 'portraits/guetteur-mini.jpg', 'portraits/heraut-mini.jpg', 'portraits/metronome-mini.jpg', 'portraits/notaire-mini.jpg', 'portraits/passerelle-mini.jpg', 'portraits/passeur-mini.jpg', 'portraits/plume-mini.jpg', 'portraits/quotas-mini.jpg', 'portraits/relais-mini.jpg', 'portraits/relaischatgpt-mini.jpg', 'portraits/relecteur-mini.jpg', 'portraits/scribe-mini.jpg', 'portraits/sentinelle-mini.jpg', 'portraits/sources-mini.jpg', 'portraits/tisseur-mini.jpg', 'portraits/trieur-mini.jpg', 'portraits/veilleur-mini.jpg', 'portraits/vigie-mini.jpg', 'portraits/vigile-mini.jpg', 'portraits/vitrines-mini.jpg'];
const ETAT = 'etat.chiffre.json';

self.addEventListener('install', e => {
  // L'etat aussi, des la premiere visite : l'appli doit marcher hors ligne tout de suite (au mieux).
  e.waitUntil(caches.open(VERSION)
    // cache: 'reload' : sans lui, la nouvelle version pouvait reprendre l'ANCIEN app.css gardé 10 min par le
    // cache du navigateur (GitHub Pages), et le téléphone affichait l'ancien style malgré la mise à jour.
    .then(c => c.addAll(COQUILLE.map(u => new Request(u, { cache: 'reload' }))).then(() => c.add(new Request(ETAT, { cache: 'no-store' })).catch(() => {}))
      .then(() => Promise.all(MINIS.map(u => c.add(u).catch(() => {})))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/' + ETAT)) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const r = await fetch(e.request, { cache: 'no-store' });
        if (r.ok) await cache.put(ETAT, r.clone());
        return r;
      } catch {
        const vieux = await cache.match(ETAT);
        if (!vieux) throw new Error('hors ligne');
        const h = new Headers(vieux.headers); h.set('x-odin-cache', '1');
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
