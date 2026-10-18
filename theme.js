/* ══════════════════════════════════════════════════════════════
   ODIN MOBILE — le theme, pose AVANT le premier affichage
   (script classique, non differe : pas d'eclair de la mauvaise couleur).
   Neon (defaut) · Clair (« ODIN White ») · Tokyo (« Dark Tokyo Cyberpunk »).
   app.js le change ensuite au toucher d'une pastille.
   ══════════════════════════════════════════════════════════════ */
(function () {
  var COULEUR_BARRE = { neon: '#090016', white: '#f5f7ff', tokyo: '#040008' };
  var t = null;
  try { t = localStorage.getItem('odin-mobile.theme'); } catch (e) { /* sans memoire : neon */ }
  if (!COULEUR_BARRE[t]) t = 'neon';
  document.documentElement.setAttribute('data-theme', t);
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', COULEUR_BARRE[t]);
})();
