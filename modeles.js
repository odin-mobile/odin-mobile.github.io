/* ══════════════════════════════════════════════════════════════
   ODIN MOBILE — vue « Modèles » : quel modèle pour ma tâche ? (ODIN 5.13, 2026-11-21)

   Même logique que l'écran Benchmarks du PC après le 5.12.1 (odin ARCHITECTURE-FRONT §23-§24) :
   AUCUN score composite, valeurs BRUTES dans leur unité, un protocole de référence par benchmark,
   colonnes « au plafond » signalées, préréglage = un choix de colonnes (jamais un score),
   cartes-raccourcis calculées par l'Observatoire avec leur règle écrite, nouveautés peu mesurées
   visibles avec la nature de chaque chiffre, prix d'une tâche type.

   Données : modeles.chiffre.json (version compacte v2 + glossaire), déchiffré par app.js.
   1re moitié : logique PURE (aucun DOM), testée sous Node (tests/modeles-essai.mjs).
   2e moitié : affichage ; tout texte venu des données passe par textContent, jamais d'HTML.
   ══════════════════════════════════════════════════════════════ */

export const ANCIEN_JOURS = 10;          // même seuil que le PC : bandeau « ancien » au-delà
export const VISIBLES_MAX = 6;           // six préréglages au plus en pastilles, les autres sous « Plus de tâches »
export const BASE = '_base';             // la vue d'ensemble (tableau de base du PC)

/* Natures (liste fermée de l'Observatoire). Forme ET couleur : lisible sans les couleurs. */
const NATURES = {
  i: { sym: '●', lib: 'mesure indépendante' },
  h: { sym: '◑', lib: 'préférence humaine' },
  e: { sym: '◐', lib: 'annonce de l’éditeur' },
  g: { sym: '○', lib: 'agrégateur, à confirmer' },
};
export const nature = code => ({ code: NATURES[code] ? code : 'g', ...(NATURES[code] || NATURES.g) });
export const LEGENDE = ['i', 'h', 'e'].map(nature);

const nombre = (v, min, max) => new Intl.NumberFormat('fr-BE', { minimumFractionDigits: min, maximumFractionDigits: max }).format(v);

/** Une valeur brute dans son unité (jamais convertie, jamais ramenée sur 100). */
export function formatValeur(v, u) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '';
  if (u === '%') return `${nombre(v, 0, 1)} %`;
  if (u === 'elo') return `${nombre(v, 0, 0)} Elo`;
  if (u === '$') return `${nombre(v, v < 0.1 ? 3 : 2, v < 0.1 ? 3 : 2)} $`;
  if (u === 'indice' || u === 'score') return nombre(v, 0, 1);
  if (u === 's') return `${nombre(v, 0, 1)} s`;
  if (u === 'jetons/s') return `${nombre(v, 0, 0)} jetons/s`;
  return `${nombre(v, 0, 2)}${u ? ` ${u}` : ''}`;
}

export function dateFr(iso) {
  const [y, m, d] = String(iso || '').slice(0, 10).split('-');
  return d ? `${d}.${m}.${y}` : '';
}

/** Âge du relevé en jours entiers (dates locales), ou null. */
export function ageJours(releve, maintenant = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(releve || ''));
  if (!m) return null;
  const r = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const a = Date.UTC(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  return Math.max(0, Math.round((a - r) / 86400000));
}

/** Le bandeau du haut : date du relevé, « ancien » au-delà de 10 jours, hors ligne avec la date. */
export function bandeau(M, { horsLigne = false, maintenant = new Date() } = {}) {
  const age = ageJours(M?.releve, maintenant);
  const date = dateFr(M?.releve);
  const ilya = age == null ? '' : age === 0 ? 'aujourd’hui' : age === 1 ? 'il y a 1 jour' : `il y a ${age} jours`;
  const ancien = age != null && age > ANCIEN_JOURS;
  const lignes = [date ? `Relevé du ${date} · ${ilya}` : 'Date du relevé inconnue'];
  if (ancien) lignes.push(`Relevé ancien : l’Observatoire relève chaque semaine, rien de neuf depuis ${age} jours. Les chiffres ont pu changer.`);
  if (horsLigne) lignes.push(`Hors ligne : dernière version reçue${date ? ` (relevé du ${date})` : ''}.`);
  const pannes = (M?.sources || []).filter(s => s.etat === 'panne').map(s => s.id);
  if (pannes.length) lignes.push(`Source en panne au dernier relevé : ${pannes.join(', ')}.`);
  return { lignes, ancien, horsLigne, age };
}

const remplir = (t, vals) => String(t || '').replace(/\{(\w+)\}/g, (_, k) => vals[k] ?? '');

/** Le protocole de référence d'une colonne, en clair. */
export function reference(M, e) {
  const ref = String(e?.ref || '');
  const [code, niv] = ref.split(':');
  return remplir((M.references || {})[code] || '', { niv: niv || '' });
}

const entete = (M, b) => (M.entetes || {})[b] || { n: b, u: '', s: 'haut', ref: '', o: '', pl: 0, nat: 'g', p1: null };

function cellule(M, i, b) {
  const k = (M.benchs || []).indexOf(b);
  if (k < 0) return undefined;
  return (M.cellules?.[i] || {})[String(k)];
}

/** Ce qu'une case affiche (aucun calcul agrégé : la valeur, son niveau, son rang, sa nature). */
export function caseVM(M, i, b) {
  const e = entete(M, b), mod = (M.modeles || [])[i] || {};
  const c = cellule(M, i, b);
  if (b === 'prix') {
    if (!Array.isArray(c) || c[0] == null) return { col: b, vide: true, texte: M.vides?.x || 'pas de prix officiel relu' };
    const [v, pe, ps, rang] = c;
    return { col: b, valeur: formatValeur(v, '$'), sous: `${formatValeur(pe, '')} / ${formatValeur(ps, '')} $ par million de jetons`,
             nat: nature(e.nat || 'e'), natLib: 'prix officiel publié par l’éditeur', rang: rang || null,
             premier: !e.pl && rang === 1, egal: false, nonClasse: false, niveau: '' };
  }
  const editeur = Array.isArray(c) && c[7] != null ? { valeur: formatValeur(c[7], e.u), nat: nature('e') } : null;
  if (!Array.isArray(c) || c[0] == null) {
    const code = Array.isArray(c) ? c[6] : null;
    const texte = code && M.vides?.[code] ? remplir(M.vides[code], { o: e.o || 'la source', ds: dateFr(mod.ds) || '?' })
      : 'pas de valeur relevée pour ce modèle';
    return { col: b, vide: true, texte, editeur };
  }
  const [v, nat, niv, cmp, rang, egal1] = c;
  const classe = cmp === 1;
  return { col: b, valeur: formatValeur(v, e.u), nat: nature(nat || e.nat), natLib: nature(nat || e.nat).lib, niveau: niv || '',
           nonClasse: !classe, rang: classe && !e.pl ? (rang || null) : null,
           premier: classe && !e.pl && rang === 1, egal: classe && !e.pl && egal1 === 1 && rang !== 1, editeur };
}

/** Les préréglages : six visibles au plus, les autres (et la vue d'ensemble) sous « Plus de tâches ». */
export function listePrereglages(M) {
  const tous = (M.prereglages || []).map(p => ({ id: p.id, nom: p.n, vis: p.vis === 1 }));
  const visibles = tous.filter(p => p.vis).slice(0, VISIBLES_MAX);
  const autres = [{ id: BASE, nom: 'Vue d’ensemble (tableau de base)' }, ...tous.filter(p => !visibles.includes(p))];
  return { visibles, autres };
}

function prereglage(M, id) {
  if (id === BASE) {
    return { id: BASE, n: 'Vue d’ensemble', cols: M.colonnes || [], lignes: M.lignes || [], cartes: [], msg: '',
             manque: [], deb: '', src: '', base: true };
  }
  const ps = M.prereglages || [];
  return ps.find(p => p.id === id) || ps.find(p => p.vis === 1) || ps[0] || null;
}

/** Cartes-raccourcis : celles de l'Observatoire ; deux cartes du même modèle sont fusionnées (jamais deux identiques). */
export function cartes(p) {
  const out = [];
  for (const c of p.cartes || []) {
    const d = out.find(x => x.m === c.m);
    if (d) { d.etiquettes.push(...(c.et || [])); d.regles.push(...(c.r || [])); continue; }
    out.push({ m: c.m, modele: c.n, etiquettes: [...(c.et || [])], regles: [...(c.r || [])], egal: [...(c.egal || [])],
               cout: typeof c.t === 'number' ? formatValeur(c.t, '$') : '' });
  }
  return out;
}

/** La vue d'un préréglage : colonnes, lignes, cartes, nouveautés peu mesurées. */
export function vuePrereglage(M, id) {
  const p = prereglage(M, id);
  if (!p) return null;
  const ordre = M.ordre || [];
  const idx = x => (typeof x === 'number' ? x : ordre.indexOf(x));
  const colonnes = (p.cols || []).map(b => {
    const e = entete(M, b);
    return { id: b, nom: e.n, unite: e.u, sens: e.s, plafond: !!e.pl, reference: reference(M, e), origine: e.o, nat: nature(e.nat) };
  });
  const lignes = (p.lignes || []).map(idx).filter(i => i >= 0 && i < ordre.length).map(i => {
    const mod = (M.modeles || [])[i] || {};
    return { i, id: ordre[i], nom: mod.n || ordre[i], labo: mod.lab || 'autres', nouveau: mod.nv === 1, ds: mod.ds || '',
             cases: (p.cols || []).map(b => caseVM(M, i, b)) };
  });
  // Nouveautés peu mesurées : sorties depuis moins de 45 jours, avec au moins une case vide hors prix.
  const nouveautes = lignes.filter(l => l.nouveau && l.cases.some(c => c.vide && c.col !== 'prix')).map(l => ({
    id: l.id, nom: l.nom, ds: l.ds,
    valeurs: (M.benchs || []).map(b => ({ b, nom: entete(M, b).n, c: caseVM(M, l.i, b) }))
      .filter(x => !x.c.vide || x.c.editeur),
    vides: l.cases.filter(c => c.vide && c.col !== 'prix').map(c => ({ b: c.col, nom: entete(M, c.col).n, texte: c.texte })),
  }));
  return { id: p.id, nom: p.n, base: !!p.base, colonnes, lignes, cartes: cartes(p), nouveautes,
           message: p.msg || '', uneSource: p.src || '', manque: p.manque || [], debloquer: p.deb || '' };
}

/** La fiche « Ce que ce benchmark compare » d'une colonne (toujours une fiche, même pour le prix). */
export function fiche(M, b) {
  const e = entete(M, b);
  const g = (M.glossaire || []).find(x => x.id === b);
  const base = { id: b, nom: e.n || g?.n || b, reference: reference(M, e), plafond: !!e.pl, origine: e.o || '',
                 unite: e.u || g?.u || '', sens: (e.s || g?.s) === 'bas' ? 'plus c’est bas, mieux c’est' : 'plus c’est haut, mieux c’est',
                 nat: nature(e.nat || g?.nat) };
  if (b === 'prix') {
    const [entree, sortie] = M.tache || [10000, 2000];
    return { ...base, compare: 'Combien coûte une même tâche type chez chaque modèle, au prix public de l’éditeur.',
             exemple: `Une tâche type = lire ${formatValeur(entree, '')} jetons (≈ ${formatValeur(Math.round(entree * 0.75), '')} mots) et en écrire ${formatValeur(sortie, '')}.`,
             utile: ['choisir à qualité égale', 'gros volumes'],
             limites: 'Prix par million de jetons publié par l’éditeur ; un abonnement (Claude Pro, Google AI Pro) n’est pas compté ici.' };
  }
  return { ...base, compare: g?.c || 'Pas encore de fiche pour ce benchmark dans l’Observatoire.', exemple: g?.ex || '',
           utile: g?.ut || [], limites: g?.lim || '', manque: !g };
}

/** Les benchmarks à comprendre (bas de la vue) : ceux qui ont une fiche, colonnes du préréglage d'abord. */
export function aComprendre(M, vue) {
  const vus = new Set();
  const ids = [...(vue?.colonnes || []).map(c => c.id).filter(b => b !== 'prix'), ...(M.glossaire || []).map(g => g.id)];
  return ids.filter(b => !vus.has(b) && vus.add(b)).map(b => ({ id: b, nom: entete(M, b).n || b, nat: nature(entete(M, b).nat) }));
}

/* ═══════════════════════════ AFFICHAGE ═══════════════════════════ */

function el(tag, cls, texte) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texte != null) e.textContent = String(texte);
  return e;
}
const vh = t => el('span', 'vh', t);              // texte pour le lecteur d'écran seulement

function pastilleNature(n) {
  const s = el('span', `md-nat nat-${n.code}`, n.sym);
  s.setAttribute('aria-hidden', 'true');
  s.title = n.lib;
  return [s, vh(` (${n.lib})`)];
}

const CLE_PRESET = 'odin-mobile.modeles.prereglage';
let prefs = null;

/** Point d'entrée : (re)dessine la vue. etat = { M, horsLigne, chargement, erreur }. */
export function rendreModeles(racine, etat, memoire) {
  prefs = memoire;
  const bandeauEl = racine.querySelector('#md-bandeau');
  const corps = racine.querySelector('#md-corps');
  const M = etat?.M;
  if (!M) {
    bandeauEl.replaceChildren();
    bandeauEl.hidden = true;
    corps.replaceChildren(el('div', 'plaque md-vide', etat?.erreur
      || (etat?.chargement ? 'Déchiffrement des benchmarks…'
        : 'Les benchmarks arrivent avec la prochaine publication d’ODIN (la Passerelle les envoie dès que l’Observatoire a un relevé).')));
    return;
  }
  const bd = bandeau(M, { horsLigne: !!etat.horsLigne });
  bandeauEl.hidden = false;
  bandeauEl.className = `md-bandeau${bd.ancien ? ' ancien' : ''}${bd.horsLigne ? ' hors-ligne' : ''}`;
  bandeauEl.replaceChildren(...bd.lignes.map((l, k) => el('div', k ? 'md-bandeau-note' : 'md-bandeau-date', l)));

  const { visibles, autres } = listePrereglages(M);
  let choisi = memoire?.lire(CLE_PRESET) || visibles[0]?.id || BASE;
  if (![...visibles, ...autres].some(p => p.id === choisi)) choisi = visibles[0]?.id || BASE;
  const vue = vuePrereglage(M, choisi);

  // (a) les tâches
  const taches = el('div', 'plaque md-taches');
  const tete = el('div', 'plaque-tete');
  tete.append(el('span', 'plaque-titre', 'Ta tâche prévue'), el('span', 'compte mono', vue?.nom || ''));
  const pills = el('div', 'filtres md-pills');
  pills.setAttribute('role', 'group');
  pills.setAttribute('aria-label', 'Choisir la tâche prévue');
  const bouton = (p, cls) => {
    const b = el('button', `filtre ${cls || ''}${p.id === choisi ? ' actif' : ''}`, p.nom);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(p.id === choisi));
    b.addEventListener('click', () => { memoire?.ecrire(CLE_PRESET, p.id); rendreModeles(racine, etat, memoire); racine.querySelector('.md-tableau-zone')?.scrollTo?.(0, 0); });
    return b;
  };
  pills.append(...visibles.map(p => bouton(p)));
  const plus = el('details', 'md-plus');
  if (autres.some(p => p.id === choisi)) plus.open = true;
  const resume = el('summary', 'filtre md-plus-t', 'Plus de tâches');
  const liste = el('div', 'md-plus-liste');
  liste.append(...autres.map(p => bouton(p)));
  plus.append(resume, liste);
  taches.append(tete, pills, plus);

  const blocs = [taches];
  if (vue) blocs.push(...blocsVue(M, vue));
  corps.replaceChildren(...blocs);
}

function blocsVue(M, vue) {
  const out = [];
  // (b) le tableau
  const t = el('div', 'plaque md-tab');
  const tete = el('div', 'plaque-tete');
  tete.append(el('span', 'plaque-titre', vue.base ? 'Vue d’ensemble' : `Pour : ${vue.nom}`),
    el('span', 'compte mono', `${vue.lignes.length} modèles · ${vue.colonnes.length} colonnes`));
  t.append(tete);
  t.append(el('p', 'md-aide', 'Valeurs brutes, dans leur unité, au protocole de référence de chaque colonne. Touche le nom d’une colonne pour savoir ce qu’elle compare.'));
  if (vue.message) t.append(el('p', 'md-note attention', vue.message));
  const zone = el('div', 'md-tableau-zone');
  zone.tabIndex = 0;
  zone.setAttribute('role', 'region');
  zone.setAttribute('aria-label', `Tableau des modèles pour ${vue.nom}, défile vers la droite`);
  const table = el('table', 'md-table');
  table.append(el('caption', 'vh', `Modèles de tête pour ${vue.nom} : valeurs brutes, rang et nature de chaque chiffre`));
  const thead = el('thead'), tr = el('tr');
  const coin = el('th', 'md-coin', 'Modèle');
  coin.scope = 'col';
  tr.append(coin);
  for (const c of vue.colonnes) {
    const th = el('th', `md-col${c.plafond ? ' plafond' : ''}`);
    th.scope = 'col';
    const b = el('button', 'md-col-b');
    b.type = 'button';
    b.append(el('span', 'md-col-n', c.nom), el('span', 'md-col-u mono', c.id === 'prix' ? 'tâche type' : c.unite === '%' ? '%' : c.unite));
    if (c.plafond) b.append(el('span', 'md-tag plafond', 'au plafond'));
    b.setAttribute('aria-label', `${c.nom} : ce que ce benchmark compare`);
    b.dataset.bench = c.id;
    b.addEventListener('click', () => ouvrirFiche(M, c.id));
    th.append(b);
    tr.append(th);
  }
  thead.append(tr);
  const tbody = el('tbody');
  for (const l of vue.lignes) {
    const r = el('tr');
    r.dataset.modele = l.id;
    const nom = el('th', `md-nom lab-${['claude', 'gemini', 'chatgpt'].includes(l.labo) ? l.labo : 'autres'}`);
    nom.scope = 'row';
    nom.append(el('span', 'md-nom-t', l.nom));
    if (l.nouveau) nom.append(el('span', 'md-tag nouveau', 'nouveau'));
    r.append(nom);
    l.cases.forEach(c => r.append(caseTd(c)));
    tbody.append(r);
  }
  table.append(thead, tbody);
  zone.append(table);
  t.append(zone);
  const plafonds = vue.colonnes.filter(c => c.plafond);
  if (plafonds.length) t.append(el('p', 'md-note', `${plafonds.map(c => c.nom).join(', ')} : tous au plafond, ne départage plus (${M.plafond || 'règle de l’Observatoire'}).`));
  const leg = el('p', 'md-legende mono');
  for (const n of LEGENDE) { const s = el('span', null); s.append(el('span', `md-nat nat-${n.code}`, n.sym), ` ${n.lib}`); leg.append(s); }
  leg.append(el('span', null, '★ n° 1 de la colonne · = 1er : à égalité avec le premier · « non classé » : mesuré à un autre niveau'));
  t.append(leg);
  for (const m of vue.manque) t.append(el('p', 'md-note', `Peu mesuré : ${m}`));
  if (vue.uneSource) t.append(el('p', 'md-note', vue.uneSource));
  if (vue.debloquer) t.append(el('p', 'md-note', vue.debloquer));
  out.push(t);

  // (c) les raccourcis
  const cs = vue.cartes;
  if (!vue.base) {
    const rac = el('div', 'plaque md-cartes');
    const rt = el('div', 'plaque-tete');
    rt.append(el('span', 'plaque-titre', 'Les raccourcis'), el('span', 'compte mono', 'règle écrite sur chaque carte'));
    rac.append(rt);
    if (!cs.length) rac.append(el('p', 'vide', vue.message || 'Aucune colonne ne départage les modèles pour cette tâche : lis le tableau.'));
    for (const c of cs) {
      const d = el('article', 'md-carte');
      d.append(el('div', 'md-carte-et', c.etiquettes.join(' · ')), el('div', 'md-carte-m', c.modele));
      const ul = el('ul', 'md-carte-r');
      c.regles.forEach((x, k) => {
        const li = el('li');
        if (c.etiquettes.length > 1 && c.etiquettes[k]) li.append(el('b', null, `${c.etiquettes[k]} : `));
        li.append(x);
        ul.append(li);
      });
      d.append(ul);
      if (c.egal.length) d.append(el('p', 'md-carte-eg', `À égalité : ${c.egal.join(', ')}`));
      if (c.cout) d.append(el('p', 'md-carte-cout mono', `${c.cout} la tâche type (${formatValeur((M.tache || [10000])[0], '')} jetons lus, ${formatValeur((M.tache || [0, 2000])[1], '')} écrits)`));
      rac.append(d);
    }
    rac.append(el('p', 'md-note', M.avertissement || 'À vérifier sur ta vraie tâche.'));
    out.push(rac);
  }

  // (d) nouveautés peu mesurées
  if (vue.nouveautes.length) {
    const nv = el('div', 'plaque md-nouveautes');
    const nt = el('div', 'plaque-tete');
    nt.append(el('span', 'plaque-titre', 'Nouveautés peu mesurées'), el('span', 'compte mono', `${vue.nouveautes.length} · moins de 45 jours`));
    nv.append(nt);
    for (const n of vue.nouveautes) {
      const d = el('article', 'md-nv');
      d.append(el('div', 'md-nv-n', n.nom), el('div', 'md-nv-ds mono', n.ds ? `sorti le ${dateFr(n.ds)}` : 'date de sortie inconnue'));
      const ul = el('ul', 'md-nv-l');
      for (const x of n.valeurs) {
        const li = el('li');
        if (!x.c.vide) {
          li.append(el('span', 'md-nv-b', x.nom), ' ', el('b', null, x.c.valeur), x.c.niveau ? el('span', 'md-niv mono', ` ${x.c.niveau}`) : '', ' ', ...pastilleNature(x.c.nat));
          if (x.c.premier) li.append(el('span', 'md-rang', ' ★ n° 1'));
          else if (x.c.egal) li.append(el('span', 'md-rang', ' = 1er'));
          else if (x.c.rang) li.append(el('span', 'md-rang', ` n° ${x.c.rang}`));
          else if (x.c.nonClasse) li.append(el('span', 'md-rang', ' non classé'));
        }
        if (x.c.editeur) {
          if (!x.c.vide) li.append(' · ');
          else li.append(el('span', 'md-nv-b', x.nom), ' ');
          li.append('annonce ', el('b', null, x.c.editeur.valeur), ' ', ...pastilleNature(x.c.editeur.nat), el('span', 'md-rang', ' jamais classée'));
        }
        ul.append(li);
      }
      for (const x of n.vides) ul.append(el('li', 'md-nv-vide', `${x.nom} : ${x.texte}`));
      d.append(ul);
      nv.append(d);
    }
    out.push(nv);
  }

  // (e) comprendre les benchmarks
  const gl = el('div', 'plaque md-glossaire');
  const gt = el('div', 'plaque-tete');
  gt.append(el('span', 'plaque-titre', 'Comprendre les benchmarks'), el('span', 'compte mono', 'touche pour la fiche'));
  gl.append(gt);
  const ul = el('ul', 'md-gl-l');
  for (const g of aComprendre(M, vue)) {
    const li = el('li');
    const b = el('button', 'md-gl-b');
    b.type = 'button';
    b.dataset.bench = g.id;
    b.append(el('span', `md-nat nat-${g.nat.code}`, g.nat.sym), ` ${g.nom}`, el('span', 'md-gl-fl', '›'));
    b.addEventListener('click', () => ouvrirFiche(M, g.id));
    li.append(b);
    ul.append(li);
  }
  gl.append(ul, el('p', 'md-note', M.regle_lignes ? `Modèles affichés : ${M.regle_lignes}.` : ''));
  out.push(gl);
  return out;
}

function caseTd(c) {
  const td = el('td', `md-case${c.premier ? ' premier' : ''}${c.egal ? ' egal' : ''}${c.vide ? ' vide' : ''}${c.nonClasse ? ' non-classe' : ''}`);
  if (c.vide) {
    td.append(el('span', 'md-vide-t', c.texte));
    if (c.editeur) td.append(annonce(c.editeur));
    return td;
  }
  const v = el('span', 'md-v');
  v.append(el('b', null, c.valeur), ' ', ...pastilleNature(c.nat));
  td.append(v);
  const bas = [];
  if (c.premier) bas.push('★ n° 1');
  else if (c.egal) bas.push('= 1er');
  else if (c.rang) bas.push(`n° ${c.rang}`);
  if (c.niveau) bas.push(c.niveau);
  if (c.nonClasse) bas.push('non classé');
  if (c.sous) td.append(el('span', 'md-sous mono', c.sous));
  if (bas.length) td.append(el('span', 'md-rang mono', bas.join(' · ')));
  if (c.editeur) td.append(annonce(c.editeur));
  return td;
}

/** « annonce 65,4 % ◐ » : la valeur publiée par l'éditeur, en un seul bloc, jamais classée. */
function annonce(e) {
  const s = el('span', 'md-edi', 'annonce ');
  s.append(el('b', 'md-edi-v', e.valeur), ' ', ...pastilleNature(e.nat));
  return s;
}

/** Ouvre la feuille « Ce que ce benchmark compare ». */
export function ouvrirFiche(M, b) {
  const d = document.getElementById('feuille-bench');
  if (!d) return;
  const f = fiche(M, b);
  document.getElementById('fb-nom').textContent = f.nom;
  const sous = document.getElementById('fb-sous');
  sous.replaceChildren(...pastilleNature(f.nat), ` ${f.nat.lib}`);
  const corps = document.getElementById('fb-corps');
  const bloc = (titre, texte) => {
    if (!texte || (Array.isArray(texte) && !texte.length)) return null;
    const s = el('section', 'fb-bloc');
    s.append(el('div', 't-lib', titre), el('p', null, Array.isArray(texte) ? texte.join(' · ') : texte));
    return s;
  };
  corps.replaceChildren(...[
    bloc('CE QUE CE BENCHMARK COMPARE', f.compare),
    bloc('EXEMPLE', f.exemple),
    bloc('UTILE POUR', f.utile),
    bloc('LIMITES', f.limites),
    bloc('PROTOCOLE DE RÉFÉRENCE', f.reference),
    f.plafond ? bloc('AU PLAFOND', 'Les meilleurs modèles sont tous au maximum : cette colonne ne départage plus.') : null,
    bloc('LECTURE', `${f.unite ? `Unité : ${f.unite} · ` : ''}${f.sens}`),
    bloc('SOURCE', f.origine),
  ].filter(Boolean));
  if (!d.open) d.showModal();
  document.getElementById('fb-fermer')?.focus();
}
