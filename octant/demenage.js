/* OCTANT a déménagé (ODIN 5.15.1) : désinscrit l'ancien service worker d'OCTANT (portée /octant/) et efface ses caches.
   N'enregistre rien. Ne touche pas au service worker d'ODIN Mobile (portée racine). */
(async () => {
  try {
    if ('serviceWorker' in navigator) {
      for (const r of await navigator.serviceWorker.getRegistrations()) {
        if (new URL(r.scope).pathname.startsWith('/octant/')) await r.unregister();
      }
    }
    if (self.caches) for (const k of await caches.keys()) if (k.startsWith('octant-')) await caches.delete(k);
  } catch { /* rien : la page reste lisible */ }
})();
