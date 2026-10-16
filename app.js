/* ══════════════════════════════════════════════════════════════
   ODIN MOBILE — l'appli (lecture seule)

   Un seul appel reseau : etat.chiffre.json, sur ce meme site.
   La phrase secrete est demandee une fois et gardee sur ce telephone.
   Tout texte venant de l'etat passe par textContent : jamais d'HTML.
   Les seuls boutons changent ce qu'on REGARDE (ecran, filtre, scene)
   ou oublient la phrase. Aucun ne parle a ODIN.
   ══════════════════════════════════════════════════════════════ */

import { dechiffrer, PhraseIncorrecte } from './crypto-odin.js';
import { creerScenes, COUL_VERDICT } from './scenes.js';
import { POLES } from './chambre-poles.js';

const CLE_PHRASE = 'odin-mobile.phrase';
const CLE_VUE = 'odin-mobile.vue';
const ANCIEN_MS = 2 * 3600 * 1000;
const $ = id => document.getElementById(id);

/* ── Stockage local : peut etre refuse (navigation privee) — l'appli marche quand meme ── */
const memoire = {
  lire(k) { try { return localStorage.getItem(k); } catch { return null; } },
  ecrire(k, v) { try { localStorage.setItem(k, v); } catch { /* sans memoire : la phrase sera redemandee */ } },
  oublier(k) { try { localStorage.removeItem(k); } catch { /* rien */ } },
};

/** Un element avec son texte (textContent, jamais innerHTML). */
function el(tag, cls, texte) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texte != null) e.textContent = String(texte);
  return e;
}

/* ═════════ Libelles ═════════ */
const SIG = {
  sentinelle: 'SO', archiviste: 'AR', gardien: 'GC', concierge: 'CP', guetteur: 'GS', veilleur: 'VP',
  heraut: 'HÉ', relais: 'RG', metronome: 'MÉ', vigie: 'VA', quotas: 'GQ', trieur: 'TO', analyste: 'AC',
  passeur: 'PD', cenacle: 'CÉ', eclaireur: 'ÉE', banc: 'BE', relecteur: 'RE', scribe: 'SC',
  diagnostiqueur: 'DI', chroniqueur: 'CH', plume: 'PL', passerelle: 'PM',
};
const sig = a => SIG[a.id] || String(a.nom || '?').slice(0, 2).toUpperCase();
const LIB_VERDICT = { SAIN: 'SAIN', ATTENTION: 'ATTENTION', ALERTE: 'ALERTE', PAUSE: 'EN PAUSE', VU: 'VU', INCONNU: 'SANS ÉTAT' };
const libVerdict = v => LIB_VERDICT[v] || 'SANS ÉTAT';
const verdictSur = v => (LIB_VERDICT[v] ? v : 'INCONNU');
const LIB_RYTHME = { horaire: 'planifié', declenche: 'déclenché par le Métronome', sur_demande: 'sur demande' };
const GRAVE = new Set(['ALERTE', 'ATTENTION']);
const IAS = [
  { id: 'claude', nom: 'Claude', col: '#D97757', titre: 'Le cerveau',
    taches: 'Dialogue écrit et vocal · pilote l’app (écrans, statuts, musique, agents) · colonne Claude de l’Arène' },
  { id: 'gemini', nom: 'Gemini', col: '#5B8CFF', titre: 'Le veilleur',
    taches: 'Résumés des News · recherche Google dans l’Arène · remplaçant pendant les pauses (Relais, via l’abonnement AI Pro)' },
  { id: 'chatgpt', nom: 'ChatGPT', col: '#19C39C', titre: 'Le second avis',
    taches: 'Deuxième avis sur les réponses du cerveau · briefing du matin (Héraut) · voix d’ODIN (Onyx)' },
];
const ORDRE_ACTIVITE = ['En cours', 'À lancer', 'Bloqué', 'En pause', 'En sommeil', 'Terminé', 'Inconnu'];

const nombre = n => new Intl.NumberFormat('fr-BE').format(n || 0);
function dateCourte(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  const p = x => String(x).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} à ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function depuis(iso) {
  const d = new Date(iso);
  if (!iso || isNaN(d)) return 'jamais';
  const m = Math.round((Date.now() - d) / 60000);
  if (m < 2) return 'à l’instant';
  if (m < 60) return `il y a ${m} min`;
  if (m < 48 * 60) return `il y a ${Math.round(m / 60)} h`;
  return `il y a ${Math.round(m / 1440)} j`;
}

/* ═════════ Etat de l'appli ═════════ */
let E = null;                        // l'etat dechiffre
let filtre = 'tous';
let scenes = null;

/* ═════════ Chargement ═════════ */
async function chargerPaquet() {
  const r = await fetch('etat.chiffre.json', { cache: 'no-cache', credentials: 'omit' });
  if (!r.ok) throw new Error(`état introuvable (${r.status})`);
  return { paquet: await r.json(), depuisCache: r.headers.get('x-odin-cache') === '1' };
}

async function ouvrir(phrase, { nouvelle = false } = {}) {
  const msg = $('verrou-msg');
  msg.className = 'verrou-msg ok';
  msg.textContent = 'Déchiffrement de l’état…';
  if (!nouvelle) { $('form-phrase').hidden = true; montrerVerrou(); }   // retour : pas de champ, juste l'attente
  try {
    const { paquet, depuisCache } = await chargerPaquet();
    E = await dechiffrer(paquet, phrase);
    if (nouvelle) memoire.ecrire(CLE_PHRASE, phrase);
    afficher(depuisCache);
    return true;
  } catch (err) {
    msg.className = 'verrou-msg';
    $('form-phrase').hidden = false;
    msg.textContent = err instanceof PhraseIncorrecte ? 'Phrase incorrecte.'
      : err instanceof TypeError ? 'Site injoignable et aucun état en mémoire : réessaie avec du réseau.'
      : `Impossible de lire l’état : ${err.message}`;
    montrerVerrou();
    return false;
  }
}

function montrerVerrou() {
  $('appli').hidden = true;
  if (!$('verrou-msg').textContent.startsWith('Déchiffrement')) $('form-phrase').hidden = false;
  $('verrou').hidden = false;
  scenes?.actif(false);
}

/* ═════════ Rendu ═════════ */
function afficher(depuisCache) {
  $('verrou').hidden = true;
  $('appli').hidden = false;
  const age = Date.now() - new Date(E.genere);
  $('etat-date').textContent = `État au ${dateCourte(E.genere)}`;
  $('badge-reseau').hidden = !(depuisCache || !navigator.onLine);
  const b = $('bandeau-ancien');
  b.hidden = !(age > ANCIEN_MS);
  b.textContent = `État ancien : ODIN n’a rien publié de nouveau depuis ${depuis(E.genere).replace('il y a ', '')}. Le PC est peut-être éteint.`;
  rendreCommand(); rendreAgents(); rendreNexus(); rendreSynthese();
  if (!scenes) {
    scenes = creerScenes($('scene'), $('scene-lecture'), { ouvrirAgent: ouvrirFiche });
  }
  scenes.charger(E, { sig, libVerdict });
  allerA(memoire.lire(CLE_VUE) || 'command', false);
}

function rendreCommand() {
  const br = E.briefing, c = br.compteurs;
  const h = new Date().getHours();
  $('br-salut').textContent = h >= 5 && h < 18 ? 'BONJOUR' : 'BONSOIR';
  const v = $('br-verdict');
  v.className = `pastille v-${verdictSur(br.verdict)}`;
  v.textContent = libVerdict(br.verdict);
  const r = $('br-resume');
  r.replaceChildren(el('b', null, `${c.agents} agents`), ` en service · `,
    el('b', null, `${c.attention + c.alertes} à traiter`), ` · ${c.pause} en pause · ${c.avec_ia} avec IA · `,
    el('b', null, `${E.synthese.stats.projets} projets`), ' suivis.');
  // Le titre du ton du jour et la phrase qui suit, sans couper une phrase.
  let premiere = '';
  for (const ph of (br.news.ton || '').split(/(?<=[.!?])\s/)) {
    if (premiere && premiere.length + ph.length > 260) {
      if (premiere.split(/[.!?]/).filter(Boolean).length < 2) {   // seulement le titre : on coupe la suite au mot
        premiere += ' ' + ph.slice(0, 260 - premiere.length).replace(/\s+\S*$/, '') + '…';
      }
      break;
    }
    premiere = `${premiere} ${ph}`.trim();
  }
  $('br-news').textContent = premiere ? `Ton du jour (${dateFr(br.news.date)}) — ${premiere}` : '';
  $('br-news').hidden = !premiere;

  const liste = $('liste-traiter');
  $('nb-traiter').textContent = `${br.a_traiter.length} signal${br.a_traiter.length > 1 ? 'aux' : ''}`;
  liste.replaceChildren(...(br.a_traiter.length ? br.a_traiter.map(t => {
    const a = E.agents.find(x => x.id === t.id) || t;
    const btn = el('button', 'signal');
    const tete = el('div', 'signal-tete');
    tete.append(el('span', null, `N°${t.numero} · ${String(t.nom).toUpperCase()}`),
      el('span', `pastille v-${verdictSur(t.verdict)}`, libVerdict(t.verdict)));
    btn.append(tete, el('div', 'signal-texte', (a.alertes && a.alertes[0]) || 'Voir la fiche de l’agent'));
    btn.addEventListener('click', () => ouvrirFiche(t.id));
    return btn;
  }) : [el('p', 'vide', 'Rien à traiter : tous les agents sont sains ou déjà vus.')]));

  $('depenses').textContent = br.depenses_api_mois ? `API ce mois : ${br.depenses_api_mois}` : '';
  $('jauges').replaceChildren(...br.jauges.map(jauge));
}

function dateFr(iso) {
  const [y, m, d] = String(iso || '').split('-');
  return d ? `${d}.${m}.${y}` : '';
}

function jauge(j) {
  const NS = 'http://www.w3.org/2000/svg';
  const col = { ok: '#00f0ff', info: '#ffb300', attention: '#ff2bd6', alerte: '#ff1f4f' }[j.niveau] || '#00f0ff';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 42 42'); svg.setAttribute('class', 'anneau'); svg.setAttribute('aria-hidden', 'true');
  const cercle = (cls, dash) => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', '21'); c.setAttribute('cy', '21'); c.setAttribute('r', '17');
    c.setAttribute('fill', 'none'); c.setAttribute('stroke-width', '3.5');
    if (cls) c.setAttribute('class', cls);
    if (dash != null) {
      c.setAttribute('stroke', col); c.setAttribute('stroke-linecap', 'round');
      c.setAttribute('stroke-dasharray', `${(dash * 106.8 / 100).toFixed(1)} 106.8`);
      c.setAttribute('transform', 'rotate(-90 21 21)');
    }
    return c;
  };
  const txt = document.createElementNS(NS, 'text');
  txt.setAttribute('x', '21'); txt.setAttribute('y', '24.5'); txt.setAttribute('text-anchor', 'middle');
  txt.textContent = `${j.pct}%`;
  svg.append(cercle('fond'), cercle(null, Math.max(0, Math.min(100, j.pct))), txt);
  const d = el('div', 'jauge');
  const meta = el('div', 'jauge-meta');
  meta.append(el('div', 'jauge-lib', j.libelle), el('div', 'jauge-val', j.texte || `${j.pct} %`));
  d.append(svg, meta);
  d.setAttribute('aria-label', `${j.libelle} : ${j.texte || j.pct + ' %'}`);
  return d;
}

function carteAgent(a) {
  const v = verdictSur(a.verdict);
  const btn = el('button', `carte-agent${GRAVE.has(v) ? ' grave' : ''}${v === 'PAUSE' ? ' pause' : ''}`);
  const g = el('div', 'glyphe', sig(a));
  g.style.color = COUL_VERDICT[v];
  g.style.borderColor = COUL_VERDICT[v];
  const corps = el('div', 'ca-corps');
  const ligne = el('div', 'ca-ligne');
  const nom = el('span', 'ca-nom', a.nom);
  if (a.ia) nom.append(el('span', 'puce-ia', 'IA'));
  ligne.append(nom, el('span', `pastille v-${v}`, libVerdict(v)));
  corps.append(ligne, el('div', 'ca-info', `n°${a.numero} · ${POLES[a.pole] || POLES.autres} · ${LIB_RYTHME[a.rythme] || a.rythme}`),
    el('div', 'ca-info', `ronde ${depuis(a.ronde)}`));
  if (GRAVE.has(v) && a.alertes[0]) corps.append(el('div', 'ca-alerte', a.alertes[0]));
  btn.append(g, corps);
  btn.addEventListener('click', () => ouvrirFiche(a.id));
  return btn;
}

function rendreAgents() {
  const tous = E.agents;
  const traiter = tous.filter(a => GRAVE.has(a.verdict));
  $('f-tous').textContent = tous.length; $('f-traiter').textContent = traiter.length;
  $('f-ia').textContent = tous.filter(a => a.ia).length; $('f-sans').textContent = tous.filter(a => !a.ia).length;
  $('nav-nb').textContent = tous.length;
  const vus = tous.filter(a => filtre === 'tous' || (filtre === 'traiter' && GRAVE.has(a.verdict))
    || (filtre === 'ia' && a.ia) || (filtre === 'sans' && !a.ia));
  const groupes = [
    ['À traiter', '#ff2bd6', vus.filter(a => GRAVE.has(a.verdict))],
    ['En service', '#9dff3c', vus.filter(a => !GRAVE.has(a.verdict) && a.verdict !== 'PAUSE')],
    ['En pause', '#8a93a8', vus.filter(a => a.verdict === 'PAUSE')],
  ].filter(g => g[2].length);
  $('groupes-agents').replaceChildren(...groupes.flatMap(([titre, col, liste]) => {
    const t = el('div', 'groupe-titre', titre);
    t.style.color = col;
    t.append(el('span', 'nb', liste.length));
    const grille = el('div', 'grille-agents');
    grille.append(...liste.map(carteAgent));
    return [t, grille];
  }));
}

function rendreNexus() {
  const nx = E.nexus, jours = nx.jours;
  const somme30 = k => jours.reduce((s, j) => s + j[k], 0);
  const total30 = IAS.reduce((s, i) => s + somme30(i.id), 0) || 1;
  const totalTout = IAS.reduce((s, i) => s + (nx.totaux[i.id] || 0), 0);
  $('nx-sous').textContent = `${IAS.length} IA connectées · ${nombre(totalTout)} jetons comptés par ODIN`;
  const barres = $('nx-barres');
  barres.replaceChildren(...jours.map(j => {
    const t = j.claude + j.gemini + j.chatgpt;
    const b = el('button', `jour${t ? '' : ' vide-j'}`);
    b.setAttribute('aria-label', `${dateFr(j.date)} : ${nombre(t)} jetons`);
    if (t) {
      for (const ia of [...IAS].reverse()) {
        const s = el('span');
        s.style.height = `${(100 * j[ia.id] / t).toFixed(1)}%`;
        s.style.background = ia.col;
        b.append(s);
      }
    }
    b.addEventListener('click', () => {
      barres.querySelectorAll('.choisi').forEach(x => x.classList.remove('choisi'));
      b.classList.add('choisi');
      $('nx-jour').textContent = t
        ? `${dateFr(j.date)} — ` + IAS.map(i => `${i.nom} ${Math.round(100 * j[i.id] / t)} % (${nombre(j[i.id])})`).join(' · ')
        : `${dateFr(j.date)} — aucun jeton compté ce jour-là.`;
    });
    return b;
  }));
  const axe = [0, 7, 14, 21, 29].map(i => el('span', null, dateFr(jours[i]?.date).slice(0, 5)));
  $('nx-axe').replaceChildren(...axe);
  $('nx-legende').replaceChildren(...IAS.map(i => {
    const s = el('span', null, `${i.nom} ${Math.round(100 * somme30(i.id) / total30)} %`);
    const carre = el('i'); carre.style.background = i.col;
    s.prepend(carre);
    return s;
  }));
  $('nx-modeles').replaceChildren(...IAS.map(i => {
    const d = el('div', 'modele');
    d.style.borderColor = i.col + '88';
    const tete = el('div', 'modele-tete');
    const n = el('span', null, `${i.nom.toUpperCase()} · ${nx.modeles[i.id] || '—'}`);
    n.style.color = i.col;
    tete.append(n, el('span', null, `${totalTout ? Math.round(100 * (nx.totaux[i.id] || 0) / totalTout) : 0} %`));
    d.append(tete, el('div', 'modele-sous', `${nombre(nx.totaux[i.id])} jetons cumulés · IA connectée`));
    return d;
  }));
  $('nx-roles').replaceChildren(...IAS.map(i => {
    const d = el('div', 'role');
    d.style.borderLeftColor = i.col;
    const tete = el('div', 'role-tete');
    const t = el('span', null, i.titre); t.style.color = i.col;
    tete.append(el('span', null, i.nom.toUpperCase()), t);
    d.append(tete, el('p', null, i.taches));
    return d;
  }), el('p', 'mono compte', 'Ensemble — l’Arène : une question, les 3 répondent côte à côte. Le Cénacle les fait délibérer.'));
}

function rendreSynthese() {
  const s = E.synthese, st = s.stats;
  $('sy-sous').textContent = `${st.projets} projets · ${st.liens} liens · ${st.liens_projets} entre projets`;
  const tuile = (lib, val, cls) => {
    const d = el('div', 'tuile');
    d.append(el('div', 't-lib', lib), el('div', `t-val ${cls || ''}`, val));
    return d;
  };
  const pct = st.sessions ? Math.round(100 * st.sessions_liees / st.sessions) : 0;
  $('sy-tuiles').replaceChildren(tuile('PROJETS', st.projets, 'cyan'), tuile('SESSIONS', st.sessions),
    tuile('SESSIONS LIÉES', `${pct} %`, 'lime'), tuile('LIENS ENTRE PROJETS', st.liens_projets, 'rose'));
  const max = Math.max(1, ...s.par_statut.map(x => x.nombre));
  $('sy-statuts').replaceChildren(...s.par_statut.map(x => {
    const l = el('div', 'statut-ligne');
    const barre = el('div', 'statut-barre'), plein = el('span');
    plein.style.width = `${(100 * x.nombre / max).toFixed(0)}%`;
    barre.append(plein);
    l.append(el('span', null, x.statut), barre, el('span', 'mono', x.nombre));
    return l;
  }));
  $('sy-nbcases').textContent = `${s.cases.length} sur ${s.cases_total}`;
  $('sy-cases').replaceChildren(...(s.cases.length ? s.cases.map(c => {
    const li = el('li', null, c.texte);
    li.append(el('span', 'cs-proj', `${c.projet} · ${dateFr(c.jour)}`));
    return li;
  }) : [el('li', null, 'Aucune case ouverte.')]));
  const n = E.briefing.news;
  $('sy-news-date').textContent = dateFr(n.date);
  $('sy-news-titre').textContent = n.titre || 'Pas de Daily News récente';
  $('sy-news-ton').textContent = n.ton || '';
  const projets = [...s.projets].sort((a, b) => ORDRE_ACTIVITE.indexOf(a.activite) - ORDRE_ACTIVITE.indexOf(b.activite)
    || a.nom.localeCompare(b.nom, 'fr'));
  $('sy-nbprojets').textContent = projets.length;
  $('sy-projets').replaceChildren(...projets.map(p => {
    const li = el('li');
    li.append(el('span', null, p.nom), el('span', null, p.statut || p.activite));
    return li;
  }));
}

/* ═════════ Fiche agent ═════════ */
function ouvrirFiche(id) {
  const a = E?.agents.find(x => x.id === id);
  if (!a) return;
  const v = verdictSur(a.verdict);
  const g = $('fi-sig');
  g.textContent = sig(a); g.style.color = COUL_VERDICT[v]; g.style.borderColor = COUL_VERDICT[v];
  $('fi-nom').textContent = a.nom;
  $('fi-sous').textContent = `AGENT N°${a.numero} · ${libVerdict(v)} · LECTURE SEULE`;
  $('fi-ronde').textContent = a.ronde ? dateCourte(a.ronde) : 'jamais';
  $('fi-rythme').textContent = LIB_RYTHME[a.rythme] || a.rythme;
  $('fi-moteur').textContent = a.ia ? 'avec IA' : 'code seul, sans IA';
  $('fi-moteur').className = `t-val ${a.ia ? 'cyan' : ''}`;
  $('fi-pole').textContent = POLES[a.pole] || POLES.autres;
  $('fi-alertes').replaceChildren(...(a.alertes.length ? a.alertes.map(t => el('li', null, t))
    : [el('li', null, 'Aucun constat grave à la dernière ronde.')]));
  const d = $('fiche');
  if (!d.open) d.showModal();
}
$('fi-fermer').addEventListener('click', () => $('fiche').close());
$('fiche').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

/* ═════════ Navigation (locale) ═════════ */
function allerA(vue, defiler = true) {
  if (!['command', 'agents', 'nexus', 'synthese'].includes(vue)) vue = 'command';
  for (const v of ['command', 'agents', 'nexus', 'synthese']) $(`vue-${v}`).hidden = v !== vue;
  document.querySelectorAll('.nav-btn').forEach(b => {
    const oui = b.dataset.vue === vue;
    b.classList.toggle('actif', oui);
    oui ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
  });
  memoire.ecrire(CLE_VUE, vue);
  scenes?.actif(vue === 'command');
  if (defiler) window.scrollTo(0, 0);
}
document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => allerA(b.dataset.vue)));
document.querySelectorAll('.filtre').forEach(b => b.addEventListener('click', () => {
  filtre = b.dataset.filtre;
  document.querySelectorAll('.filtre').forEach(x => {
    x.classList.toggle('actif', x === b); x.setAttribute('aria-pressed', String(x === b));
  });
  rendreAgents();
}));
document.querySelectorAll('.onglet').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.onglet').forEach(x => {
    x.classList.toggle('actif', x === b); x.setAttribute('aria-selected', String(x === b));
  });
  scenes?.mode(b.dataset.scene);
}));

/* ═════════ Verrou et « Oublier la phrase » ═════════ */
$('form-phrase').addEventListener('submit', async e => {
  e.preventDefault();
  const champ = $('phrase'), bouton = e.submitter || e.target.querySelector('button');
  bouton.disabled = true;
  const ok = await ouvrir(champ.value, { nouvelle: true });
  bouton.disabled = false;
  if (ok) champ.value = '';
});
$('oublier').addEventListener('click', () => {
  memoire.oublier(CLE_PHRASE);
  E = null;
  $('verrou-msg').textContent = 'Phrase oubliée sur ce téléphone.';
  $('verrou-msg').className = 'verrou-msg ok';
  montrerVerrou();
});

/* ═════════ Demarrage ═════════ */
if ('serviceWorker' in navigator) {
  // Une nouvelle version de l'appli prend la main : on recharge UNE fois pour l'afficher tout de suite.
  const avait = !!navigator.serviceWorker.controller;
  let recharge = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (avait && !recharge) { recharge = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => { /* sans cache : l'appli marche en ligne */ });
}
(async () => {
  try { await document.fonts?.ready; } catch { /* polices de secours */ }
  const phrase = memoire.lire(CLE_PHRASE);
  if (phrase) await ouvrir(phrase);
  else montrerVerrou();
})();
