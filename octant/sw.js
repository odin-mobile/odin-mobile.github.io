/* OCTANT a déménagé (ODIN 5.15.1) — service worker d'AUTODESTRUCTION, à l'ancienne adresse de celui d'OCTANT v1.
   Chez ceux qui avaient installé l'ancien, le navigateur trouve ce fichier changé et l'installe : il efface les caches
   « octant-* », se désinscrit, puis recharge les pages ouvertes, qui affichent alors « OCTANT a déménagé ».
   Il ne sert aucun fichier et ne garde rien. Nouvelle adresse : https://amirgallardo-png.github.io/octant/ */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k.startsWith('octant-')).map(k => caches.delete(k)));
    await self.registration.unregister();
    const pages = await self.clients.matchAll({ type: 'window' });
    for (const c of pages) { try { c.navigate(c.url); } catch { /* rien */ } }
  })());
});
