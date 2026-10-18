/* ══════════════════════════════════════════════════════════════
   ODIN MOBILE — les 4 scenes 3D (canvas 2D, aucune bibliotheque)

   1. SPHÈRE  : ODIN au centre, chaque agent en orbite (couleur = verdict)
   2. CHAMBRE : la Chambre des agents d'ODIN en miniature — memes places
                par poles (chambre-poles.js, copie exacte d'ODIN)
   3. TRIADE  : Claude, Gemini, ChatGPT, taille = part des jetons 30 j
   4. GALAXIE : les projets du vault et leurs liens

   Fluidite (telephone) :
   · chaque orbe est un SPRITE pre-dessine une fois par couleur
     (les degrades radiaux recalcules a chaque image coutaient cher) ;
   · les traits d'une meme couleur partent en UN seul trace ;
   · animation au temps reel (dt), pas a l'image : meme vitesse a 60 ou 120 Hz ;
   · la boucle s'arrete quand l'ecran est cache, la scene hors champ,
     ou un autre onglet ouvert ; prefers-reduced-motion = image fixe,
     redessinee seulement quand on la touche.
   Tous les textes viennent de l'etat dechiffre ; ils sont dessines
   sur le canvas (fillText), jamais injectes en HTML.
   ══════════════════════════════════════════════════════════════ */

import { disposer, POLES_COURTS } from './chambre-poles.js';

/* ── Les palettes des 3 themes (memes teintes que app.css ; maquette Argon pour Clair et Tokyo).
      noyau = le milieu du coeur d'ODIN, fondOrbe = le bord sombre de chaque orbe. ── */
const PALETTES = {
  neon: { beam: '#00f0ff', flag: '#ff2bd6', halt: '#ff1f4f', seal: '#9dff3c', a2: '#b026ff', a4: '#ffb300',
          ink1: '#ddffff', ink2: '#d6c2ff', ink3: '#a58bdd', pause: '#6b7388',
          claude: '#D97757', gemini: '#5B8CFF', chatgpt: '#19C39C', odin: '#e8ffff', noyau: '#26084e', fondOrbe: '#0a0418' },
  white: { beam: '#0284c7', flag: '#e11d48', halt: '#dc2626', seal: '#059669', a2: '#4f46e5', a4: '#d97706',
           ink1: '#0f172a', ink2: '#334155', ink3: '#64748b', pause: '#94a3b8',
           claude: '#ea580c', gemini: '#4f46e5', chatgpt: '#059669', odin: '#0f172a', noyau: '#bae6fd', fondOrbe: '#1e293b' },
  tokyo: { beam: '#00f0ff', flag: '#ff007f', halt: '#ff3b30', seal: '#fcee0a', a2: '#ff007f', a4: '#ff9500',
           ink1: '#fff0f8', ink2: '#f5b8d8', ink3: '#b98aa9', pause: '#8a7a90',
           claude: '#D97757', gemini: '#5B8CFF', chatgpt: '#19C39C', odin: '#fcee0a', noyau: '#180226', fondOrbe: '#06000c' },
};
const COUL = {}, COUL_VERDICT = {}, COUL_POLE = {}, COUL_ACTIVITE = {};
/** Change de palette (les objets sont modifies sur place : les fonctions de dessin les relisent). */
function palette(nom) {
  Object.assign(COUL, PALETTES[nom] || PALETTES.neon);
  Object.assign(COUL_VERDICT, { SAIN: COUL.seal, ATTENTION: COUL.flag, ALERTE: COUL.halt, PAUSE: COUL.pause, VU: COUL.a4, INCONNU: COUL.ink3 });
  Object.assign(COUL_POLE, { pilotage: COUL.beam, code: COUL.a2, vault: COUL.flag, pc: COUL.a4, autres: COUL.ink3 });
  Object.assign(COUL_ACTIVITE, { 'En cours': COUL.beam, 'À lancer': COUL.flag, 'En pause': COUL.a4, 'En sommeil': COUL.ink3,
                                 'Bloqué': COUL.halt, 'Terminé': COUL.a2, Inconnu: COUL.ink3 });
  SPRITES.clear();
}
/** '#rrggbb' + opacite -> 'rgba(r,g,b,a)'. */
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const HERO = '"Orbitron", "Saira", sans-serif';
const GRAVE = new Set(['ALERTE', 'ATTENTION']);

/* ── Sprites : une orbe lumineuse pre-dessinee par couleur ── */
const SPRITES = new Map();
palette('neon');
const S_TAILLE = 128, S_RAYON = S_TAILLE / 5.2;      // le halo s'etend a 2,6 rayons
function sprite(col) {
  if (SPRITES.has(col)) return SPRITES.get(col);
  const c = document.createElement('canvas');
  c.width = c.height = S_TAILLE;
  const g = c.getContext('2d'), m = S_TAILLE / 2, r = S_RAYON;
  const halo = g.createRadialGradient(m, m, r * 0.2, m, m, m);
  halo.addColorStop(0, col + 'aa'); halo.addColorStop(0.4, col + '40'); halo.addColorStop(1, col + '00');
  g.fillStyle = halo; g.fillRect(0, 0, S_TAILLE, S_TAILLE);
  const boule = g.createRadialGradient(m - r * 0.35, m - r * 0.35, r * 0.08, m, m, r);
  boule.addColorStop(0, '#ffffff'); boule.addColorStop(0.5, col); boule.addColorStop(1, COUL.fondOrbe);
  g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.fillStyle = boule; g.fill();
  SPRITES.set(col, c);
  return c;
}

export function creerScenes(canvas, lecture, { ouvrirAgent }) {
  const ctx = canvas.getContext('2d');
  const reduit = matchMedia('(prefers-reduced-motion: reduce)');
  let W = 300, H = 300, dpr = 1;
  let mode = 'sphere', etat = null, cache = {};
  let yaw = 0.5, pitch = 0.3, vYaw = 0, t = 0, dernier = 0, boucle = 0;
  let actif = true, enChamp = true, glisse = null, cibles = [];

  /* ── Etoiles (fixes, tracees en 3 lots de couleur) ── */
  const ETOILES = Array.from({ length: 150 }, (_, i) => ({
    a: (i / 150) * Math.PI * 10, d: 60 + (i * 2.3) % 300, y: ((i % 19) - 9) * 15, lot: i % 3,
  }));

  /* ── Projection : rotation (lacet, tangage) puis perspective ── */
  let cy = 1, sy = 0, cp = 1, sp = 0, fov = 300;
  function preparer() {
    cy = Math.cos(yaw); sy = Math.sin(yaw); cp = Math.cos(pitch); sp = Math.sin(pitch);
    fov = Math.min(W, H * 1.25) * 1.02;
  }
  function proj(x, y, z) {
    const rx = x * cy - z * sy, rz = z * cy + x * sy;
    const ry = y * cp - rz * sp, prof = rz * cp + y * sp;
    const k = fov / Math.max(160, 480 + prof);
    return { x: W / 2 + rx * k, y: H * 0.5 + ry * k, k, prof };
  }

  function orbe(p, rayon, col) {
    const r = Math.max(2.4, rayon * p.k), s = r * 5.2;
    ctx.drawImage(sprite(col), p.x - s / 2, p.y - s / 2, s, s);
    return r;
  }
  function etiquette(txt, x, y, col, taille = 10, police = MONO) {
    ctx.font = `600 ${taille}px ${police}`;
    ctx.fillStyle = col;
    ctx.fillText(txt, x, y);
  }
  function etoiles() {
    const lots = [rgba(COUL.beam, .55), rgba(COUL.flag, .45), rgba(COUL.ink2, .4)];
    for (let l = 0; l < 3; l++) {
      ctx.fillStyle = lots[l];
      ctx.beginPath();
      for (const e of ETOILES) {
        if (e.lot !== l) continue;
        const a = e.a + t * 0.02, p = proj(Math.cos(a) * e.d, e.y, Math.sin(a) * e.d);
        const s = l === 0 ? 1.6 : 1.1;
        ctx.rect(p.x, p.y, s, s);
      }
      ctx.fill();
    }
  }
  function anneau(rayon, inclin, col, larg, tirets) {
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const p = proj(Math.cos(a) * rayon, Math.sin(a) * rayon * inclin, Math.sin(a) * rayon);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.strokeStyle = col; ctx.lineWidth = larg; ctx.setLineDash(tirets || []); ctx.stroke(); ctx.setLineDash([]);
  }
  function coeurOdin(p, rayon) {
    const r = rayon * p.k;
    const g = ctx.createRadialGradient(p.x - r * 0.25, p.y - r * 0.25, r * 0.1, p.x, p.y, r);
    g.addColorStop(0, rgba(COUL.beam, .42)); g.addColorStop(0.55, rgba(COUL.noyau, .7)); g.addColorStop(1, rgba(COUL.beam, .85));
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = COUL.beam; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.textAlign = 'center';
    etiquette('ODIN', p.x, p.y + Math.max(6, r * 0.2), COUL.odin, Math.max(12, r * 0.5), HERO);
  }

  /* ═════════ 1. SPHÈRE ═════════ */
  function sphere() {
    const agents = etat.agents;
    [55, 90, 124].forEach((rb, i) => {
      ctx.beginPath();
      for (let k = 0; k <= 60; k++) {
        const a = (k / 60) * Math.PI * 2, p = proj(Math.cos(a) * rb, 118, Math.sin(a) * rb);
        k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
      ctx.strokeStyle = i % 2 ? rgba(COUL.flag, .3) : rgba(COUL.beam, .32); ctx.lineWidth = 1.2; ctx.stroke();
    });
    anneau(118, 0.35, rgba(COUL.seal, .55), 1.6);
    anneau(112, -0.45, rgba(COUL.beam, .5), 1.3);
    anneau(170, 0.18, rgba(COUL.a2, .32), 1, [5, 5]);
    const centre = proj(0, 0, 0), file = [];
    file.push({ prof: centre.prof, dessin: () => coeurOdin(centre, 54) });
    const n = Math.max(1, agents.length);
    ctx.beginPath();
    const pos = agents.map((a, i) => {
      const anneauN = i % 3, R = 132 + anneauN * 34, ang = (i / n) * Math.PI * 2 + t * (0.16 + (i % 4) * 0.03);
      const p = proj(Math.cos(ang) * R, ((i % 5) - 2) * 22 + Math.sin(t * 1.3 + i) * 10, Math.sin(ang) * R);
      ctx.moveTo(centre.x, centre.y); ctx.lineTo(p.x, p.y);
      return p;
    });
    ctx.strokeStyle = rgba(COUL.beam, .12); ctx.lineWidth = 1; ctx.stroke();
    agents.forEach((a, i) => {
      const p = pos[i], col = COUL_VERDICT[a.verdict] || COUL.ink3, f = (t * 0.5 + i * 0.13) % 1;
      ctx.fillStyle = col; ctx.fillRect(centre.x + (p.x - centre.x) * f - 1, centre.y + (p.y - centre.y) * f - 1, 2.4, 2.4);
      file.push({ prof: p.prof, dessin: () => {
        const r = orbe(p, GRAVE.has(a.verdict) ? 8.5 : a.ia ? 7.2 : 6, col);
        ctx.textAlign = 'center'; etiquette(cache.sig(a), p.x, p.y + r + 12, COUL.ink1, 10);
        cibles.push({ x: p.x, y: p.y, r: r + 12, agent: a,
                      texte: `N°${a.numero} · ${a.nom} — ${cache.libVerdict(a.verdict)}` });
      } });
    });
    file.sort((x, y) => y.prof - x.prof).forEach(o => o.dessin());
  }

  /* ═════════ 2. CHAMBRE DES AGENTS (miniature) ═════════ */
  function chambre() {
    const D = cache.chambre || (cache.chambre = disposer(etat.agents));
    const S = 7.6, SOL = 52, MILIEU = 8;                   // echelle (unite ODIN -> scene), sol, recentrage
    const Y = h => SOL - h * S;
    // ODIN : le fond de la salle est en -z ; on recentre la salle pour qu'elle remplisse le cadre.
    const P = (x, h, z) => proj(x * S, Y(h), -(z + MILIEU) * S);
    const { gradins, demi } = D.salle;
    /* Les gradins, secteur par secteur, teintes du pole */
    for (const sec of D.secteurs) {
      for (const rg of sec.rangees) {
        const col = COUL_POLE[rg.pole] || COUL.ink3;
        ctx.strokeStyle = col + '88'; ctx.lineWidth = 1.2; ctx.beginPath();
        for (const ti of rg.tiers) {
          const g = gradins[ti];
          for (const r of [g.r - demi, g.r + demi]) {
            for (let k = 0; k <= 18; k++) {
              const a = sec.a0 + (sec.a1 - sec.a0) * k / 18, p = P(Math.cos(a) * r, g.h, Math.sin(a) * r);
              k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
            }
          }
        }
        ctx.stroke();
      }
      /* Le nom de chaque pole : au-dela de son dernier gradin (le Pilotage, au premier rang, devant lui) */
      const am = (sec.a0 + sec.a1) / 2;
      sec.rangees.forEach((rg, n) => {
        const devant = sec.rangees.length > 1 && n === 0;
        const g = gradins[devant ? rg.tiers[0] : rg.tiers[rg.tiers.length - 1]];
        const r = devant ? g.r - demi - 0.6 : g.r + demi + 5.2;
        const pl = P(Math.cos(am) * r, g.h + (devant ? -0.4 : 2.4), Math.sin(am) * r);
        const nom = POLES_COURTS[rg.pole] || String(rg.pole).toUpperCase();
        ctx.font = `600 10px ${MONO}`;
        const demiL = ctx.measureText(nom).width / 2 + 6;          // jamais coupe par le bord du cadre
        ctx.textAlign = 'center';
        etiquette(nom, Math.max(demiL, Math.min(W - demiL, pl.x)), pl.y, COUL_POLE[rg.pole] || COUL.ink2, 10);
      });
    }
    /* Les filets lumineux entre secteurs */
    ctx.beginPath();
    for (const a of D.filets) {
      const p0 = P(Math.cos(a) * 8, 0, Math.sin(a) * 8), last = gradins[gradins.length - 1];
      const p1 = P(Math.cos(a) * (last.r + demi), last.h, Math.sin(a) * (last.r + demi));
      ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
    }
    ctx.strokeStyle = rgba(COUL.beam, .22); ctx.lineWidth = 1; ctx.stroke();
    /* ODIN au centre de la salle */
    const centre = P(0, 2.2, 0), file = [{ prof: centre.prof, dessin: () => coeurOdin(centre, 34) }];
    /* Faisceaux : seulement les agents a regarder, pulses selon la gravite */
    for (const a of etat.agents) {
      const pl = D.places.get(a.id);
      if (!pl || !GRAVE.has(a.verdict)) continue;
      const p = P(pl.x, pl.h + 1.6, pl.z), al = 0.25 + 0.2 * Math.sin(t * (a.verdict === 'ALERTE' ? 5 : 2.4));
      ctx.beginPath(); ctx.moveTo(centre.x, centre.y); ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = (COUL_VERDICT[a.verdict]) + Math.round(al * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = 1.4; ctx.stroke();
    }
    etat.agents.forEach((a, i) => {
      const pl = D.places.get(a.id);
      if (!pl) return;
      const col = COUL_VERDICT[a.verdict] || COUL.ink3;
      const flotte = a.verdict === 'PAUSE' ? 0 : Math.sin(t * 1.6 + i) * 0.25;
      const p = P(pl.x, pl.h + 1.6 + flotte, pl.z);
      file.push({ prof: p.prof, dessin: () => {
        /* Anneau d'etat au sol (comme dans la Chambre d'ODIN) */
        ctx.beginPath();
        for (let k = 0; k <= 20; k++) {
          const a2 = (k / 20) * Math.PI * 2, q = P(pl.x + Math.cos(a2) * 1.25, pl.h, pl.z + Math.sin(a2) * 1.25);
          k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        }
        ctx.strokeStyle = col; ctx.globalAlpha = a.verdict === 'PAUSE' ? 0.3 : 0.85; ctx.lineWidth = 1.4; ctx.stroke(); ctx.globalAlpha = 1;
        const r = orbe(p, a.ia ? 7.4 : 6.2, col);
        if (a.ia) {                                         // satellite : l'agent appelle une IA
          const sa = t * 2 + i, q = P(pl.x + Math.cos(sa) * 1.4, pl.h + 1.6 + flotte + 0.4, pl.z + Math.sin(sa) * 1.4);
          ctx.fillStyle = COUL.ink1; ctx.fillRect(q.x - 1.2, q.y - 1.2, 2.4, 2.4);
        }
        ctx.textAlign = 'center'; etiquette(cache.sig(a), p.x, p.y - r - 5, COUL.ink1, 9);
        cibles.push({ x: p.x, y: p.y, r: r + 12, agent: a,
                      texte: `N°${a.numero} · ${a.nom} — ${cache.libVerdict(a.verdict)}` });
      } });
    });
    file.sort((x, y) => y.prof - x.prof).forEach(o => o.dessin());
  }

  /* ═════════ 3. TRIADE IA ═════════ */
  function triade() {
    const nx = etat.nexus, tot = cache.parts;
    anneau(175, 0, rgba(COUL.beam, .32), 1.4);
    anneau(150, 0.12, rgba(COUL.claude, .25), 1, [4, 4]);
    const ias = [['claude', 'CLAUDE', COUL.claude, 0.18], ['gemini', 'GEMINI', COUL.gemini, 0.82], ['chatgpt', 'CHATGPT', COUL.chatgpt, 1.5]];
    const pts = ias.map(([id, nom, col, a0]) => {
      const a = Math.PI * a0 + t * 0.2, part = tot[id] || 0;
      return { id, nom, col, part, p: proj(Math.cos(a) * 140, id === 'chatgpt' ? -46 : id === 'gemini' ? 40 : 10, Math.sin(a) * 140),
               taille: 16 + Math.sqrt(part) * 2.6 };
    });
    for (let i = 0; i < 3; i++) {
      const a = pts[i], b = pts[(i + 1) % 3];
      ctx.beginPath(); ctx.moveTo(a.p.x, a.p.y); ctx.lineTo(b.p.x, b.p.y);
      ctx.strokeStyle = rgba(COUL.ink1, .2); ctx.lineWidth = 1.4; ctx.stroke();
      for (let k = 0; k < 3; k++) {
        const f = (t * 0.4 + k / 3 + i * 0.2) % 1;
        orbe({ x: a.p.x + (b.p.x - a.p.x) * f, y: a.p.y + (b.p.y - a.p.y) * f, k: 1 }, 2.6, a.col);
      }
    }
    const tries = pts.sort((x, y) => y.p.prof - x.p.prof);
    tries.forEach(o => { o.r = orbe(o.p, o.taille, o.col); });
    tries.forEach(o => {                                   // les noms apres les orbes : jamais caches
      const r = o.r;
      ctx.textAlign = 'center';
      etiquette(o.nom, o.p.x, o.p.y + r + 14, COUL.ink1, 11);
      etiquette(`${nx.modeles[o.id] || '—'} · ${o.part} %`, o.p.x, o.p.y + r + 27, o.col, 9.5);
      cibles.push({ x: o.p.x, y: o.p.y, r: r + 12,
                    texte: `${o.nom} · ${nx.modeles[o.id] || 'modèle inconnu'} — ${o.part} % des jetons sur 30 jours · IA connectée` });
    });
  }

  /* ═════════ 4. GALAXIE DU VAULT ═════════ */
  function galaxie() {
    const G = cache.galaxie || (cache.galaxie = (() => {
      /* Les projets vivants sur un anneau interieur (etiquettes lisibles), les termines en nuage autour. */
      const pr = etat.synthese.projets;
      const vivants = pr.filter(p => p.activite !== 'Terminé'), nv = Math.max(1, vivants.length);
      const finis = pr.length - vivants.length || 1;
      let iv = 0, ifn = 0;
      return pr.map(p => {
        const col = COUL_ACTIVITE[p.activite] || COUL.ink3;
        if (p.activite !== 'Terminé') {
          const a = (iv / nv) * Math.PI * 2, y = (iv++ % 2 ? -1 : 1) * 16;
          return { ...p, x: Math.cos(a) * 112, y: y * 0.5, z: Math.sin(a) * 112, col, vivant: true };
        }
        const i = ifn++, phi = Math.acos(1 - 2 * (i + 0.5) / finis), th = Math.PI * (1 + Math.sqrt(5)) * i, R = 150 + (i % 3) * 18;
        return { ...p, x: Math.cos(th) * Math.sin(phi) * R, y: Math.cos(phi) * R * 0.7, z: Math.sin(th) * Math.sin(phi) * R, col, vivant: false };
      });
    })());
    const pts = G.map(n => ({ n, p: proj(n.x, n.y, n.z) }));
    ctx.beginPath();
    for (const [a, b] of etat.synthese.liens) {
      if (!pts[a] || !pts[b]) continue;
      ctx.moveTo(pts[a].p.x, pts[a].p.y); ctx.lineTo(pts[b].p.x, pts[b].p.y);
    }
    ctx.strokeStyle = rgba(COUL.flag, .26); ctx.lineWidth = 0.9; ctx.stroke();
    const tries = pts.sort((x, y) => y.p.prof - x.p.prof);
    tries.forEach(o => { o.r = orbe(o.p, o.n.vivant ? 6.5 : 3.8, o.n.col); });
    ctx.textAlign = 'center';
    tries.forEach(({ n, p, r }) => {
      if (n.vivant) etiquette(n.nom.length > 20 ? n.nom.slice(0, 19) + '…' : n.nom, p.x, p.y + r + 12, COUL.ink1, 9.5);
      cibles.push({ x: p.x, y: p.y, r: r + 10, texte: `${n.nom} — ${n.statut || n.activite}` });
    });
  }

  const SCENES = { sphere, chambre, triade, galaxie };
  const LEGENDE = {
    sphere: () => `ODIN — ${etat.agents.length} agents · ${etat.briefing.compteurs.attention + etat.briefing.compteurs.alertes} à traiter · glisse pour tourner, touche une orbe`,
    chambre: () => `Chambre des agents — ${etat.agents.length} places, rangées par pôle · touche une orbe`,
    triade: () => `Triade IA — part des jetons sur 30 jours · touche une IA`,
    galaxie: () => `Galaxie du vault — ${etat.synthese.projets.length} projets, ${etat.synthese.liens.length} liens · en couleur : les projets vivants`,
  };

  /* ── Boucle ── */
  function image(now) {
    boucle = 0;
    const dt = Math.min(0.05, dernier ? (now - dernier) / 1000 : 0.016);
    dernier = now;
    const anime = !reduit.matches;
    if (anime) {
      t += dt;
      if (!glisse) {
        if (mode === 'chambre') yaw += (Math.sin(t * 0.18) * 0.28 - yaw) * Math.min(1, dt * 0.8) + vYaw * dt;
        else yaw += (0.12 + vYaw) * dt;
        vYaw *= Math.pow(0.04, dt);                         // inertie apres un glisser
      }
    }
    dessiner();
    if (anime && actif && enChamp && !document.hidden) boucle = requestAnimationFrame(image);
  }
  function dessiner() {
    if (!etat) return;
    preparer();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    cibles = [];
    etoiles();
    SCENES[mode]();
  }
  function relancer() {
    if (!boucle && etat) { dernier = 0; boucle = requestAnimationFrame(image); }
  }
  function arreter() { if (boucle) cancelAnimationFrame(boucle); boucle = 0; }

  function taille() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    W = Math.round(r.width); H = Math.round(r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    dessiner();
  }
  new ResizeObserver(taille).observe(canvas);
  new IntersectionObserver(e => { enChamp = e[0].isIntersecting; enChamp ? relancer() : arreter(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? arreter() : relancer()));
  reduit.addEventListener?.('change', () => { arreter(); relancer(); });

  /* ── Toucher : glisser = tourner, toucher court = ouvrir ── */
  canvas.addEventListener('pointerdown', e => {
    glisse = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, id: e.pointerId, temps: performance.now() };
    vYaw = 0;
  });
  canvas.addEventListener('pointermove', e => {
    if (!glisse || e.pointerId !== glisse.id) return;
    const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y;
    if (Math.abs(e.clientX - glisse.x0) > 6) canvas.setPointerCapture?.(e.pointerId);
    yaw += dx * 0.008;
    pitch = Math.max(-0.2, Math.min(0.85, pitch + dy * 0.005));
    vYaw = dx * 0.5;
    glisse.x = e.clientX; glisse.y = e.clientY;
    if (reduit.matches) dessiner();
  });
  const fin = e => {
    if (!glisse) return;
    const court = Math.hypot(e.clientX - glisse.x0, e.clientY - glisse.y0) < 8 && performance.now() - glisse.temps < 500;
    glisse = null;
    if (!court || e.type === 'pointercancel') return;
    const b = canvas.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    for (let i = cibles.length - 1; i >= 0; i--) {
      const c = cibles[i];
      if (Math.hypot(x - c.x, y - c.y) <= c.r) {
        lecture.textContent = c.texte;
        if (c.agent) ouvrirAgent(c.agent.id);
        return;
      }
    }
  };
  canvas.addEventListener('pointerup', fin);
  canvas.addEventListener('pointercancel', fin);

  return {
    charger(e, outils) {
      etat = e; cache = { ...outils };
      const tot = e.nexus.totaux, somme = (tot.claude + tot.gemini + tot.chatgpt) || 1;
      cache.parts = Object.fromEntries(['claude', 'gemini', 'chatgpt'].map(k => {
        const s = e.nexus.jours.reduce((x, j) => x + j[k], 0), s30 = e.nexus.jours.reduce((x, j) => x + j.claude + j.gemini + j.chatgpt, 0);
        return [k, Math.round(100 * (s30 ? s / s30 : tot[k] / somme))];
      }));
      lecture.textContent = LEGENDE[mode]();
      taille(); relancer();
    },
    mode(m) {
      if (!SCENES[m]) return;
      mode = m; vYaw = 0;
      if (m === 'chambre') { yaw = 0; pitch = 0.62; } else if (m === 'galaxie') { pitch = 0.95; } else { pitch = 0.3; }
      if (etat) lecture.textContent = LEGENDE[m]();
      dessiner(); relancer();
    },
    actif(oui) { actif = oui; oui ? (taille(), relancer()) : arreter(); },
    theme(nom) { palette(nom); delete cache.galaxie; dessiner(); },
  };
}
