/* ══════════════════════════════════════════════════════════════
   ODIN — CHAMBRE DES AGENTS v3 : LES PLACES PAR POLES (2026-10-11)

   Calcul pur (aucune 3D, aucun DOM) : odin-bureau3d.js l'utilise pour
   placer les orbes, et tools/test_chambre_poles.py le teste avec node.

   Schema « Eventail », choisi par Amir le 2026-10-11 :
     · Atelier du code a gauche, PC & vie perso a droite, chacun sur
       tous les gradins ;
     · au centre, face a la camera : le PILOTAGE au premier rang (le
       plus proche d'ODIN ; sur deux rangs s'il deborde), le Vault &
       idees juste derriere lui ;
     · « Autres » (pole absent ou inconnu) au bout, a droite.
   Tout vient du champ "pole" du registre : un nouvel agent prend sa
   place dans son secteur sans toucher a ce fichier.

   Les largeurs de secteur sont calculees pour que l'ecart minimal
   entre deux orbes soit le plus grand possible. Si 3 gradins ne
   suffisent plus (ecart < ESPACE_MIN, vers 26 agents), un 4e gradin
   s'ajoute tout seul.
   ══════════════════════════════════════════════════════════════ */

export const POLES = {
  pilotage: 'PILOTAGE',
  code: 'ATELIER DU CODE',
  vault: 'VAULT & IDÉES',
  pc: 'PC & VIE PERSO',
  autres: 'AUTRES',
};
/* Noms courts : utilises seulement quand le secteur est trop etroit pour le nom entier. */
export const POLES_COURTS = {
  pilotage: 'PILOTAGE',
  code: 'CODE',
  vault: 'VAULT',
  pc: 'PC & PERSO',
  autres: 'AUTRES',
};

/* Deux salles possibles. r : rayon du gradin ; h : hauteur ; demi : demi-profondeur d'une marche. */
export const SALLE_3 = { gradins: [{ r: 12, h: 0 }, { r: 17.5, h: 2.4 }, { r: 23, h: 4.8 }], demi: 2.75 };
export const SALLE_4 = { gradins: [{ r: 12, h: 0 }, { r: 16.4, h: 2.4 }, { r: 20.8, h: 4.8 }, { r: 25.2, h: 7.2 }], demi: 2.2 };

export const HEMI_SPAN = 190 * Math.PI / 180;   // un peu plus qu'un demi-cercle
export const HEMI_MILIEU = -Math.PI / 2;        // le fond de la salle (-z), face a la camera
export const ECART_SECTEURS = 3 * Math.PI / 180; // le couloir ou passe le filet lumineux
export const ESPACE_MIN = 5;                     // en dessous, on passe a 4 gradins

/** Le pole d'un agent : un des quatre connus, sinon « autres ». */
export function poleDe(a) {
  const p = a?.pole;
  return typeof p === 'string' && p !== 'autres' && Object.hasOwn(POLES, p) ? p : 'autres';
}

/* Nombre de places d'un gradin sur un angle donne, a l'ecart S. */
function capacites(gradins, tiers, th, S) {
  return tiers.map(t => Math.floor(gradins[t].r * th / S + 1e-9));
}

/* Le plus petit angle ou chaque rangee du secteur tient a l'ecart S (Infinity si impossible). */
function angleMini(gradins, rangees, S) {
  let th = 0;
  for (const { tiers, agents } of rangees) {
    if (!agents.length) continue;
    const somme = x => capacites(gradins, tiers, x, S).reduce((s, c) => s + c, 0);
    if (somme(HEMI_SPAN) < agents.length) return Infinity;
    let lo = 0, hi = HEMI_SPAN;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (somme(m) >= agents.length) hi = m; else lo = m; }
    th = Math.max(th, hi);
  }
  return th;
}

/* Les secteurs, de gauche a droite vu de la camera (angle croissant = x croissant). */
function secteursDe(agents, nbGradins, rangsPilotage = 1) {
  const par = { pilotage: [], code: [], vault: [], pc: [], autres: [] };
  const ordre = (x, y) => (x.numero ?? 999) - (y.numero ?? 999) || String(x.id).localeCompare(String(y.id));
  agents.slice().sort(ordre).forEach(a => par[poleDe(a)].push(a));
  const tous = [...Array(nbGradins).keys()];
  const centre = par.pilotage.length
    ? [{ pole: 'pilotage', tiers: tous.slice(0, rangsPilotage), agents: par.pilotage },
       { pole: 'vault', tiers: tous.slice(rangsPilotage), agents: par.vault }]
    : [{ pole: 'vault', tiers: tous, agents: par.vault }];
  return [
    { cle: 'code', rangees: [{ pole: 'code', tiers: tous, agents: par.code }] },
    { cle: 'centre', rangees: centre },
    { cle: 'pc', rangees: [{ pole: 'pc', tiers: tous, agents: par.pc }] },
    { cle: 'autres', rangees: [{ pole: 'autres', tiers: tous, agents: par.autres }] },
  ].map(s => ({ ...s, rangees: s.rangees.filter(r => r.agents.length) }))
   .filter(s => s.rangees.length);
}

/* Le plus grand ecart possible pour une salle donnee (recherche par dichotomie). */
function meilleurEcart(salle, secteurs) {
  const libre = HEMI_SPAN - ECART_SECTEURS * Math.max(0, secteurs.length - 1);
  const total = S => secteurs.reduce((s, x) => s + angleMini(salle.gradins, x.rangees, S), 0);
  let lo = 0.5, hi = 14;
  for (let i = 0; i < 40; i++) { const S = (lo + hi) / 2; if (total(S) <= libre) lo = S; else hi = S; }
  return lo;
}

/**
 * Les places de la salle pour une liste d'agents du registre.
 * Retour : { salle, ecart, places: Map(id -> {x, z, h, angle, dist, gradin, pole}),
 *            secteurs: [{cle, a0, a1, rangees: [{pole, tiers}]}], filets: [angle] }
 */
export function disposer(agents) {
  const liste = (agents ?? []).filter(a => a && a.id != null);
  /* Du plus simple au plus ample : 3 gradins, pilotage sur 1 rang ; puis pilotage sur 2 rangs
     (le Vault recule d'un rang) ; puis 4 gradins. On garde le premier essai lisible, sinon le meilleur. */
  let salle = null, secteurs = null, S = -1;
  for (const [sa, rp] of [[SALLE_3, 1], [SALLE_3, 2], [SALLE_4, 1], [SALLE_4, 2]]) {
    const sec = secteursDe(liste, sa.gradins.length, rp), e = meilleurEcart(sa, sec);
    if (e > S + 0.05) { salle = sa; secteurs = sec; S = e; }
    if (S >= ESPACE_MIN) break;
  }
  const { gradins } = salle;
  secteurs.forEach(s => { s.besoin = angleMini(gradins, s.rangees, S); });
  const libre = HEMI_SPAN - ECART_SECTEURS * Math.max(0, secteurs.length - 1);
  const somme = secteurs.reduce((x, s) => x + s.besoin, 0) || 1;

  const places = new Map(), filets = [], sortie = [];
  let a0 = HEMI_MILIEU - HEMI_SPAN / 2;
  secteurs.forEach((s, i) => {
    const th = s.besoin * libre / somme;
    for (const { pole, tiers, agents: ag } of s.rangees) {
      /* Repartition sur les gradins : proportionnelle a la place de chacun, jamais au-dela. */
      const cap = capacites(gradins, tiers, th, S);
      const C = cap.reduce((x, y) => x + y, 0) || 1;
      const parts = cap.map(c => Math.min(c, Math.floor(ag.length * c / C)));
      let reste = ag.length - parts.reduce((x, y) => x + y, 0);
      const fr = cap.map((c, k) => [ag.length * c / C - parts[k], k]).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
      for (let k = 0, garde = 0; reste > 0 && garde < 1000; k++, garde++) {
        const t = fr[k % fr.length][1];
        if (parts[t] < cap[t] || garde >= fr.length * 50) { parts[t]++; reste--; }
      }
      let n = 0;
      tiers.forEach((t, k) => {
        for (let j = 0; j < parts[k]; j++) {
          const ang = a0 + (j + 0.5) * th / parts[k], g = gradins[t];
          places.set(ag[n++].id, { x: Math.cos(ang) * g.r, z: Math.sin(ang) * g.r, h: g.h, angle: ang, dist: g.r, gradin: t, pole });
        }
      });
    }
    sortie.push({ cle: s.cle, a0, a1: a0 + th, rangees: s.rangees.map(r => ({ pole: r.pole, tiers: r.tiers })) });
    a0 += th;
    if (i < secteurs.length - 1) { filets.push(a0 + ECART_SECTEURS / 2); a0 += ECART_SECTEURS; }
  });
  return { salle, ecart: S, places, secteurs: sortie, filets };
}
