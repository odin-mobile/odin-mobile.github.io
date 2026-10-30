/* ══════════════════════════════════════════════════════════════
   ODIN MOBILE — l'appli (lecture, plus deux actions a distance)

   Lecture : etat.chiffre.json, sur ce meme site. Unique ecriture (2026-10-26) : un ordre
   chiffre depose dans la boite du PC (ordre-odin.js) : lancer une ronde, cocher une tache ;
   depuis le 2026-10-29, mettre un agent en pause ou le reprendre, et enregistrer une decision
   (accord ou refus) sur un resultat de Relais a relire — le PC n'applique jamais rien.
   La phrase secrete est demandee une fois et gardee sur ce telephone.
   Tout texte venant de l'etat passe par textContent : jamais d'HTML.
   Les autres boutons changent ce qu'on REGARDE (ecran, filtre, scene)
   ou oublient la phrase.
   ══════════════════════════════════════════════════════════════ */

import { dechiffrer, PhraseIncorrecte } from './crypto-odin.js';
import { envoyerOrdre, envoyerRonde, numero } from './ordre-odin.js';
import { creerScenes } from './scenes.js';
import { POLES } from './chambre-poles.js';

const CLE_PHRASE = 'odin-mobile.phrase';
const CLE_VUE = 'odin-mobile.vue';
const CLE_THEME = 'odin-mobile.theme';
const CLE_ATTENTE = 'odin-mobile.cases-attente';   // cases cochees ici, pas encore appliquees par le PC
const CLE_FAITES = 'odin-mobile.cases-faites';     // cases cochees ici et appliquees (7 jours, pour annuler)
const CASE_GARDE_MS = 7 * 24 * 3600 * 1000;
const CLE_ORDRES = 'odin-mobile.ordres-attente';    // ordres « pause » et « relais » pas encore traites par le PC
const CLE_REPONSES = 'odin-mobile.ordres-reponses'; // leur sort (refus du PC compris), 7 jours
// Memes ages maximum que le PC : pause 2 h, reprise 24 h (2026-10-30), decision de Relais 7 jours.
const GARDE_ORDRE_MS = { pause: 2 * 3600 * 1000, reprise: 24 * 3600 * 1000, relais: CASE_GARDE_MS };
const garde = o => GARDE_ORDRE_MS[o.ordre === 'pause' && o.actif ? 'reprise' : o.ordre] || 0;
const VUES = ['command', 'agents', 'nexus', 'synthese', 'skills'];
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
  diagnostiqueur: 'DI', chroniqueur: 'CH', plume: 'PL', passerelle: 'PM', relaischatgpt: 'RC', 'agent-office': 'AO',
  // 2026-10-29 : agents construits depuis le 26.10, memes sigles qu'ODIN (REAL_META de odin.js).
  notaire: 'NO', vigile: 'VV', canari: 'CN', vitrines: 'GV', sources: 'SR', tisseur: 'TS',
};
const sig = a => SIG[a.id] || String(a.nom || '?').slice(0, 2).toUpperCase();
const LIB_VERDICT = { SAIN: 'SAIN', ATTENTION: 'ATTENTION', ALERTE: 'ALERTE', PAUSE: 'EN PAUSE', VU: 'VU', INCONNU: 'SANS ÉTAT' };
const libVerdict = v => LIB_VERDICT[v] || 'SANS ÉTAT';
const verdictSur = v => (LIB_VERDICT[v] ? v : 'INCONNU');
const LIB_RYTHME = { horaire: 'planifié', declenche: 'déclenché par le Métronome', sur_demande: 'sur demande', direct: 'en direct' };
/* Agent Office (numero 0) : le pont Claude Code, pas un « Agent N » ; pas de ronde, allume ou eteint. */
const estPont = a => a.numero === 0;
const libNumero = a => (estPont(a) ? 'pont' : `n°${a.numero}`);
const libPont = a => (a.verdict === 'PAUSE' ? 'éteint sur le PC · s’ouvre à la demande' : 'allumé sur le PC');
const GRAVE = new Set(['ALERTE', 'ATTENTION']);
const coulVerdict = v => `var(--v-${verdictSur(v).toLowerCase()})`;
const IAS = [
  { id: 'claude', nom: 'Claude', col: 'var(--ia-claude)', titre: 'Le cerveau',
    taches: 'Dialogue écrit et vocal · pilote l’app (écrans, statuts, musique, agents) · colonne Claude de l’Arène' },
  { id: 'gemini', nom: 'Gemini', col: 'var(--ia-gemini)', titre: 'Le veilleur',
    taches: 'Résumés des News · recherche Google dans l’Arène · remplaçant pendant les pauses (Relais, via l’abonnement AI Pro)' },
  { id: 'chatgpt', nom: 'ChatGPT', col: 'var(--ia-chatgpt)', titre: 'Le second avis',
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
let cibleSk = 'toutes', chercheSk = '';
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
  resoudreCases();
  resoudreOrdres();
  rendreCommand(); rendreAgents(); rendreNexus(); rendreSynthese(); rendreSkills();
  renvoyerCases();
  renvoyerOrdres();
  if (!scenes) {
    scenes = creerScenes($('scene'), $('scene-lecture'), { ouvrirAgent: ouvrirFiche });
    scenes.theme(document.documentElement.dataset.theme);
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
  // Les jauges datent de la derniere ronde du Gardien des Quotas (toutes les 3 h) : on dit de quand.
  const mq = $('quotas-mesure'), ageQ = Date.now() - new Date(br.quotas_mesure);
  mq.hidden = !br.quotas_mesure || isNaN(ageQ);
  mq.textContent = `Mesuré ${depuis(br.quotas_mesure)}${ageQ > 3600 * 1000 ? ' · peut avoir changé depuis' : ''}`;
  mq.classList.toggle('ancien', ageQ > 3600 * 1000);
  $('jauges').replaceChildren(...br.jauges.map(jauge));
}

function dateFr(iso) {
  const [y, m, d] = String(iso || '').split('-');
  return d ? `${d}.${m}.${y}` : '';
}

function jauge(j) {
  const NS = 'http://www.w3.org/2000/svg';
  const col = { ok: 'var(--c-beam)', info: 'var(--c-a4)', attention: 'var(--c-flag)', alerte: 'var(--c-halt)' }[j.niveau] || 'var(--c-beam)';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 42 42'); svg.setAttribute('class', 'anneau'); svg.setAttribute('aria-hidden', 'true');
  const cercle = (cls, dash) => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', '21'); c.setAttribute('cy', '21'); c.setAttribute('r', '17');
    c.setAttribute('fill', 'none'); c.setAttribute('stroke-width', '3.5');
    if (cls) c.setAttribute('class', cls);
    if (dash != null) {
      c.style.stroke = col; c.setAttribute('stroke-linecap', 'round');
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
  g.style.color = coulVerdict(v);
  g.style.borderColor = coulVerdict(v);
  const corps = el('div', 'ca-corps');
  const ligne = el('div', 'ca-ligne');
  const nom = el('span', 'ca-nom', a.nom);
  if (a.ia) nom.append(el('span', 'puce-ia', 'IA'));
  ligne.append(nom, el('span', `pastille v-${v}`, libVerdict(v)));
  corps.append(ligne);
  if (a.desc) corps.append(el('div', 'ca-desc', a.desc));   // mini-phrase, venue de l'etat chiffre
  corps.append(el('div', 'ca-info', `${libNumero(a)} · ${POLES[a.pole] || POLES.autres} · ${LIB_RYTHME[a.rythme] || a.rythme}`),
    el('div', 'ca-info', estPont(a) ? libPont(a) : `ronde ${depuis(a.ronde)}`));
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
    ['À traiter', 'var(--c-flag)', vus.filter(a => GRAVE.has(a.verdict))],
    ['En service', 'var(--c-seal)', vus.filter(a => !GRAVE.has(a.verdict) && a.verdict !== 'PAUSE')],
    ['En pause', 'var(--v-pause)', vus.filter(a => a.verdict === 'PAUSE')],
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
    d.style.borderColor = `color-mix(in srgb, ${i.col} 55%, transparent)`;
    const tete = el('div', 'modele-tete');
    const n = el('span', null, `${i.nom.toUpperCase()} · ${nx.modeles[i.id] || '—'}`);
    n.style.color = i.col;
    // Meme base que la legende et la Triade (30 jours) : un seul pourcentage par IA sur l'ecran.
    tete.append(n, el('span', null, `${Math.round(100 * somme30(i.id) / total30)} % · 30 j`));
    d.append(tete, el('div', 'modele-sous', `${nombre(nx.totaux[i.id])} jetons cumulés depuis le début · IA connectée`));
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
  rendreCases();
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

/* ═════════ Competences (fiches AI/Competences, lecture seule) ═════════ */
const LIB_CIBLE = { claude: 'CLAUDE', gemini: 'GEMINI', both: 'LES DEUX', other: 'AUTRE' };
// La pastille d'etat suit l'emoji de la fiche ; son texte = le debut du statut, sans date ni precision.
const CLASSE_STATUT = { '🟢': 'st-ok', '🟡': 'st-test', '⏸': 'st-pause', '⛔': 'st-stop', '🔵': 'st-info' };
const sansAccents = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function statutCourt(s) {
  const m = /^(\p{Extended_Pictographic})\uFE0F?\s*(.*)$/u.exec(String(s || '').trim());
  const emoji = m ? m[1] : '', reste = m ? m[2] : String(s || '');
  const tete = reste.split(/\s+[—–-]\s+/)[0].replace(/\s*\([^)]*\)/g, '').trim();
  return { cls: CLASSE_STATUT[emoji] || 'st-autre', texte: tete || 'Sans statut' };
}

// « Claude » montre aussi les competences faites pour les deux IA (idem pour « Gemini »).
const garderCible = c => cibleSk === 'toutes' || c.cible === cibleSk || (cibleSk !== 'both' && c.cible === 'both');

function carteSkill(c) {
  const d = el('details', 'sk');
  const tete = el('summary', 'sk-tete');
  const st = statutCourt(c.statut);
  const cible = LIB_CIBLE[c.cible] ? c.cible : 'other';
  const pastilles = el('div', 'sk-pastilles');
  pastilles.append(el('span', `pastille ia-${cible}`, LIB_CIBLE[cible]), el('span', `pastille ${st.cls}`, st.texte));
  // Le vrai nom (celui qui lance la competence) en tete ; le titre lisible dessous.
  tete.append(el('div', 'sk-nom', c.id), el('div', 'sk-titre', c.nom), pastilles);
  const corps = el('div', 'sk-corps');
  corps.append(c.resume ? el('p', 'sk-resume', c.resume) : el('p', 'sk-resume vide', 'Pas de résumé « En une ligne » dans la fiche.'));
  const infos = el('dl', 'sk-infos');
  for (const [lib, val] of [['IA', c.ia], ['Où elle vit', c.ou], ['Statut', c.statut]]) {
    infos.append(el('dt', null, lib), el('dd', null, val || '—'));
  }
  corps.append(infos);
  d.append(tete, corps);
  return d;
}

function rendreSkills() {
  const tout = E.competences || [];
  const n = k => tout.filter(c => c.cible === k).length;
  $('sk-sous').textContent = tout.length
    ? `${tout.length} compétences · ${n('claude')} Claude · ${n('gemini')} Gemini · ${n('both')} les deux`
    : 'Fiches du dossier AI/Compétences';
  $('sk-n-toutes').textContent = tout.length;
  $('sk-n-claude').textContent = n('claude') + n('both');
  $('sk-n-gemini').textContent = n('gemini') + n('both');
  $('sk-n-both').textContent = n('both');
  const q = sansAccents(chercheSk.trim());
  const vus = tout.filter(c => garderCible(c)
    && (!q || sansAccents(`${c.id} ${c.nom} ${c.resume} ${c.ia} ${c.ou} ${c.statut}`).includes(q)));
  $('sk-liste').replaceChildren(...(vus.length ? vus.map(carteSkill)
    : [el('p', 'vide', !tout.length
      ? 'Les compétences arrivent avec la prochaine publication d’ODIN (toutes les 30 minutes).'
      : 'Aucune compétence ne correspond.')]));
}

/* ═════════ Cases a cocher depuis le telephone (2026-10-26) ═════════
   Cocher = un ordre chiffre « case » dans la boite du PC. La case reste « en attente du PC »
   (et l'ordre est renvoye a chaque ouverture, ntfy ne gardant un message que 12 h) jusqu'a ce
   qu'un etat publie APRES l'ordre montre la case cochee (elle quitte la liste des cases ouvertes). */
const liste = k => { try { const v = JSON.parse(memoire.lire(k) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const garder = (k, v) => memoire.ecrire(k, JSON.stringify(v));

function resoudreCases() {
  if (!E?.synthese) return;
  const ouvertes = new Set(E.synthese.cases.map(c => c.ref));
  const publie = Date.parse(E.genere), maintenant = Date.now();
  let attente = liste(CLE_ATTENTE), faites = liste(CLE_FAITES);
  const reste = [];
  for (const a of attente) {
    const applique = publie > Date.parse(a.emis) && (a.fait ? !ouvertes.has(a.ref) : ouvertes.has(a.ref));
    if (applique) {
      faites = faites.filter(f => f.ref !== a.ref);
      if (a.fait) faites.push({ ref: a.ref, texte: a.texte, projet: a.projet, quand: E.genere });
    } else if (maintenant - Date.parse(a.emis) < CASE_GARDE_MS) reste.push(a);
  }
  garder(CLE_ATTENTE, reste);
  garder(CLE_FAITES, faites.filter(f => maintenant - Date.parse(f.quand) < CASE_GARDE_MS && !ouvertes.has(f.ref)));
}

let renvoiFait = false;
async function renvoyerCases() {
  // Une fois par ouverture : les ordres en attente repartent (meme numero, le PC n'applique qu'une fois).
  const phrase = memoire.lire(CLE_PHRASE);
  if (renvoiFait || !phrase || !E?.boite || !navigator.onLine) return;
  renvoiFait = true;
  for (const a of liste(CLE_ATTENTE)) {
    try { await envoyerOrdre(E.boite, { ordre: 'case', ref: a.ref, fait: a.fait, id: a.id, emis: a.emis }, phrase); }
    catch { /* reessai a la prochaine ouverture */ }
  }
}

async function basculerCase(c, fait) {
  const phrase = memoire.lire(CLE_PHRASE);
  if (!phrase || !E?.boite) return;
  let attente = liste(CLE_ATTENTE);
  const avant = attente.find(a => a.ref === c.ref);
  attente = attente.filter(a => a.ref !== c.ref);
  // Numero et date fixes des maintenant : un renvoi reste le MEME ordre pour le PC.
  const o = { ordre: 'case', ref: c.ref, fait, id: numero(), emis: new Date().toISOString() };
  try {
    await envoyerOrdre(E.boite, o, phrase);
  } catch {
    renvoiFait = false;          // pas de reseau : l'ordre attend ici et repartira
  }
  // Annuler avant que le PC ait applique : il suffit d'oublier l'attente (l'ordre « decocher »
  // part quand meme, au cas ou le premier aurait deja ete lu).
  if (!(avant && avant.fait && !fait)) {
    attente.push({ ref: c.ref, fait, texte: c.texte, projet: c.projet, id: o.id, emis: o.emis });
  }
  if (!fait) garder(CLE_FAITES, liste(CLE_FAITES).filter(f => f.ref !== c.ref));
  garder(CLE_ATTENTE, attente);
  rendreCases();
}

function ligneCase(c, coche, note, fait) {
  const li = el('li', `case${coche ? ' coche' : ''}${note ? ' attente' : ''}`);
  const b = el('button', 'case-btn');
  b.type = 'button';
  b.setAttribute('aria-pressed', String(coche));
  b.append(el('span', 'case-boite', coche ? '☑' : '☐'), el('span', 'case-texte', c.texte));
  b.addEventListener('click', () => basculerCase(c, fait));
  li.append(b, el('span', 'cs-proj', note || `${c.projet}${c.jour ? ` · ${dateFr(c.jour)}` : ''}`));
  return li;
}

function rendreCases() {
  const s = E.synthese, attente = liste(CLE_ATTENTE), faites = liste(CLE_FAITES);
  const enAttente = ref => attente.find(a => a.ref === ref);
  const peut = !!E.boite;
  const lignes = s.cases.map(c => {
    const a = enAttente(c.ref);
    if (!peut) { const li = el('li', 'case', c.texte); li.append(el('span', 'cs-proj', `${c.projet} · ${dateFr(c.jour)}`)); return li; }
    return a?.fait ? ligneCase(c, true, 'Cochée ici · en attente du PC', false) : ligneCase(c, false, '', true);
  });
  $('sy-cases').replaceChildren(...(lignes.length ? lignes : [el('li', null, 'Aucune case ouverte.')]));
  // Cochees depuis ce telephone : deja appliquees (annulables 7 jours) ou decochage en attente.
  const recentes = [
    ...faites.filter(f => !enAttente(f.ref)).map(f => ligneCase(f, true, `Cochée depuis le téléphone · ${f.projet}`, false)),
    ...attente.filter(a => !a.fait && !s.cases.some(c => c.ref === a.ref))
      .map(a => ligneCase(a, false, 'Décochée ici · en attente du PC', true)),
  ];
  $('sy-faites').replaceChildren(...recentes);
  $('sy-faites-bloc').hidden = !recentes.length;
}

/* ═════════ Actualiser : recharger tout de suite, et demander au PC un etat frais ═════════ */
$('actualiser').addEventListener('click', async () => {
  const b = $('actualiser');
  if (b.disabled) return;
  b.disabled = true;
  b.classList.add('tourne');
  await rafraichir();
  const phrase = memoire.lire(CLE_PHRASE);
  const p = E?.agents.find(a => a.id === 'passerelle');
  let demande = false;
  if (phrase && E?.boite && p?.lancable) {
    try { await envoyerRonde(E.boite, 'passerelle', phrase); demande = true; } catch { /* hors ligne : on garde l'etat charge */ }
  }
  $('etat-date').textContent = demande ? 'demandé au PC…' : $('etat-date').textContent;
  setTimeout(() => { b.disabled = false; b.classList.remove('tourne'); }, demande ? 60_000 : 1500);
  if (demande) { setTimeout(rafraichir, 45_000); setTimeout(rafraichir, 90_000); }
});

/* ═════════ Rafraichir sans repasser par l'ecran du verrou (apres un ordre) ═════════ */
async function rafraichir() {
  const phrase = memoire.lire(CLE_PHRASE);
  if (!phrase) return;
  try {
    const { paquet, depuisCache } = await chargerPaquet();
    E = await dechiffrer(paquet, phrase);
    afficher(depuisCache);
    if ($('fiche').open && ficheId) ouvrirFiche(ficheId);
  } catch { /* on garde ce qui est affiche */ }
}

/* ═════════ Lancer une ronde depuis la fiche ═════════ */
let ficheId = null, armeIa = null;
// Ce que consomme une ronde (champ « paiement » de l'etat ; un etat ancien sans ce champ = cle par prudence).
const COUTS = {
  'abo-gemini': { bouton: ' · utilise ton quota Gemini Pro', moteur: ' · abo Gemini Pro' },
  'abo-chatgpt': { bouton: ' · utilise ton quota ChatGPT gratuit', moteur: ' · ChatGPT gratuit' },
  cle: { bouton: ' · coûte des jetons (clé API)', moteur: ' · clé API' },
};
const cout = a => (!a.ia ? '' : COUTS[a.paiement] ? a.paiement : 'cle');
function preparerLancer(a) {
  const b = $('fi-lancer'), m = $('fi-lancer-msg');
  const possible = !!(a.lancable && E?.boite);
  $('fi-action').hidden = !possible;
  if (!possible) return;
  armeIa = null;
  b.disabled = false;
  b.textContent = `Lancer une ronde${COUTS[cout(a)]?.bouton || ''}`;
  b.classList.toggle('cout', cout(a) === 'cle');
  m.textContent = 'Le PC la lance s’il est allumé et connecté.';
  m.className = 'mono fiche-note';
}
$('fi-lancer').addEventListener('click', async () => {
  const a = E?.agents.find(x => x.id === ficheId);
  const phrase = memoire.lire(CLE_PHRASE);
  const b = $('fi-lancer'), m = $('fi-lancer-msg');
  if (!a || !phrase) return;
  if (cout(a) === 'cle' && armeIa !== a.id) {   // cle d'API (payante) : un second appui confirme
    armeIa = a.id;
    b.textContent = 'Confirmer · coûte des jetons (clé API)';
    m.textContent = 'Appuie encore pour confirmer.';
    return;
  }
  armeIa = null;
  b.disabled = true;
  m.textContent = 'Chiffrement et envoi…';
  try {
    await envoyerRonde(E.boite, a.id, phrase);
    b.textContent = 'Ordre envoyé ✓';
    m.textContent = 'Ordre envoyé. Si le PC est allumé, le verdict arrive ici dans 1 à 2 minutes.';
    m.className = 'mono fiche-note ok';
    setTimeout(rafraichir, 75_000);
    setTimeout(rafraichir, 150_000);
  } catch (err) {
    b.disabled = false;
    m.textContent = err instanceof TypeError ? 'Pas de réseau : ordre non envoyé.' : `Ordre non envoyé : ${err.message}`;
    m.className = 'mono fiche-note erreur';
  }
});

/* ═════════ Ordres « pause » et « relais » (2026-10-29) ═════════
   Comme une case : l'ordre reste « en attente du PC » (et repart a chaque ouverture, meme numero)
   jusqu'a ce que l'etat publie donne son sort (champ « reponses ») ou qu'il soit trop ancien. */
function resoudreOrdres() {
  if (!E) return;
  const sorts = new Map((E.reponses || []).map(r => [r.id, r]));
  const maintenant = Date.now();
  let reponses = liste(CLE_REPONSES).filter(r => maintenant - Date.parse(r.quand) < CASE_GARDE_MS);
  const reste = [];
  for (const o of liste(CLE_ORDRES)) {
    const s = sorts.get(o.id);
    if (s) reponses = [...reponses.filter(r => r.id !== o.id), { ...o, resultat: s.resultat, motif: s.motif, quand: E.genere }];
    else if (maintenant - Date.parse(o.emis) < garde(o)) reste.push(o);
    else reponses.push({ ...o, resultat: 'expiré', motif: 'le PC ne l’a pas reçu à temps (éteint ?)', quand: new Date().toISOString() });
  }
  garder(CLE_ORDRES, reste);
  garder(CLE_REPONSES, reponses.slice(-40));
}

let renvoiOrdresFait = false;
async function renvoyerOrdres() {
  const phrase = memoire.lire(CLE_PHRASE);
  if (renvoiOrdresFait || !phrase || !E?.boite || !navigator.onLine) return;
  renvoiOrdresFait = true;
  for (const o of liste(CLE_ORDRES)) {
    try { await envoyerOrdre(E.boite, o, phrase); } catch { /* reessai a la prochaine ouverture */ }
  }
}

/** Envoie un ordre et le garde « en attente du PC ». Rend un message d'erreur, ou '' si parti. */
async function envoyerSuivi(o) {
  const phrase = memoire.lire(CLE_PHRASE);
  if (!phrase || !E?.boite) return 'Phrase ou boîte absente.';
  const complet = { ...o, id: numero(), emis: new Date().toISOString() };
  let erreur = '';
  try { await envoyerOrdre(E.boite, complet, phrase); }
  catch (err) { erreur = err instanceof TypeError ? 'Pas de réseau : l’ordre repartira à la prochaine ouverture.' : `Ordre non envoyé : ${err.message}`; }
  if (!erreur || erreur.startsWith('Pas de réseau')) {
    garder(CLE_ORDRES, [...liste(CLE_ORDRES), complet]);
    if (erreur) renvoiOrdresFait = false;
  }
  setTimeout(rafraichir, 60_000);
  setTimeout(rafraichir, 120_000);
  return erreur;
}

const enAttenteDe = test => liste(CLE_ORDRES).find(test);
const dernierSort = test => liste(CLE_REPONSES).filter(test).sort((a, b) => Date.parse(b.emis) - Date.parse(a.emis))[0];
const REFUS = new Set(['refusé', 'échec', 'expiré']);

/* ── Pause / reprise d'un agent ── */
let armePause = null;
function preparerPause(a) {
  const zone = $('fi-pause-zone'), b = $('fi-pause'), m = $('fi-pause-msg');
  zone.hidden = !(a.pausable && E?.boite);
  if (zone.hidden) return;
  const attente = enAttenteDe(o => o.ordre === 'pause' && o.agent === a.id);
  const sort = dernierSort(o => o.ordre === 'pause' && o.agent === a.id);
  b.classList.toggle('reprendre', a.pause);
  b.classList.toggle('arme', armePause === a.id);
  m.className = 'mono fiche-note';
  if (attente) {
    b.disabled = true;
    b.textContent = attente.actif ? 'Reprise en attente du PC…' : 'Pause en attente du PC…';
    m.textContent = 'Ordre envoyé. Si le PC est allumé, l’état change ici dans 1 à 2 minutes.';
    return;
  }
  b.disabled = false;
  if (armePause === a.id) {
    b.textContent = 'Confirmer · la surveillance s’arrête';
    m.textContent = `${a.nom} est un agent de surveillance : appuie encore pour confirmer la pause.`;
    return;
  }
  b.textContent = a.pause ? 'Reprendre' : 'Mettre en pause';
  if (sort && REFUS.has(sort.resultat) && Date.now() - Date.parse(sort.emis) < 24 * 3600 * 1000) {
    m.textContent = `Dernier ordre refusé par le PC : ${sort.motif || sort.resultat}.`;
    m.className = 'mono fiche-note erreur';
  } else {
    m.textContent = a.pause ? 'Agent en pause : sa tâche Windows est désactivée.'
      : 'Désactive sa tâche Windows (comme l’interrupteur d’ODIN). La reprise est toujours possible.';
  }
}
$('fi-pause').addEventListener('click', async () => {
  const a = E?.agents.find(x => x.id === ficheId);
  if (!a || !a.pausable) return;
  if (a.securite && !a.pause && armePause !== a.id) {   // surveillance : un second appui confirme
    armePause = a.id;
    preparerPause(a);
    return;
  }
  armePause = null;
  $('fi-pause').disabled = true;
  const erreur = await envoyerSuivi({ ordre: 'pause', agent: a.id, actif: a.pause });
  preparerPause(a);
  if (erreur) { $('fi-pause-msg').textContent = erreur; $('fi-pause-msg').className = 'mono fiche-note erreur'; }
});

/* ── Resultats de Relais a relire : decision « accord » ou « refus », jamais rien d'applique ── */
const RELAIS_DE = { relais: 'gemini', relaischatgpt: 'chatgpt' };
const LIB_MOTEUR = { gemini: 'Gemini', chatgpt: 'ChatGPT' };
const LIB_DECISION = { accord: 'Accord pour relecture', refus: 'Refus' };
let armeRelais = null;      // « moteur/tache/decision » arme par un premier appui
let erreurRelais = null;    // { cle, texte } : dernier envoi impossible, affiche sous le resultat

function rendreRelais(a) {
  const moteur = RELAIS_DE[a.id];
  const bloc = $('fi-relais');
  const res = moteur ? (E.relais || []).filter(r => r.moteur === moteur) : [];
  bloc.hidden = !moteur;
  if (!moteur) return;
  $('fi-relais-nb').textContent = `· ${res.length}`;
  $('fi-relais-liste').replaceChildren(...(res.length ? res.map(r => ligneRelais(r)) : [el('li', 'vide', 'Aucun résultat en attente de relecture.')]));
}

function ligneRelais(r) {
  const cle = `${r.moteur}/${r.tache}`;
  const attente = enAttenteDe(o => o.ordre === 'relais' && `${o.moteur}/${o.tache}` === cle);
  const sort = dernierSort(o => o.ordre === 'relais' && `${o.moteur}/${o.tache}` === cle);
  const decision = r.decision || '';
  const li = el('li', `relais-item${decision ? ` d-${decision}` : ''}`);
  const f = r.fichiers, l = r.lignes;
  li.append(el('div', 'relais-titre', r.titre),
    el('div', 'mono relais-meta', `${LIB_MOTEUR[r.moteur]} · ${dateCourte(r.date)} · ${nombre(l)} ligne${l > 1 ? 's' : ''} · ${f} fichier${f > 1 ? 's' : ''}`));
  if (decision) {
    li.append(el('div', `relais-decision d-${decision}`, `Décision enregistrée : ${LIB_DECISION[decision]}`));
    return li;
  }
  if (attente) {
    li.append(el('div', 'relais-decision d-attente', `${LIB_DECISION[attente.decision]} · envoyé, en attente du PC`));
    return li;
  }
  if (sort && REFUS.has(sort.resultat)) li.append(el('div', 'mono fiche-note erreur', `Refusé par le PC : ${sort.motif || sort.resultat}.`));
  if (erreurRelais?.cle === cle) li.append(el('div', 'mono fiche-note erreur', erreurRelais.texte));
  if (!E.boite) return li;
  const boutons = el('div', 'relais-boutons');
  for (const d of ['accord', 'refus']) {
    const arme = armeRelais === `${cle}/${d}`;
    const b = el('button', `lancer ${d}${arme ? ' arme' : ''}`, arme ? `Confirmer · ${LIB_DECISION[d].toLowerCase()}` : LIB_DECISION[d]);
    b.type = 'button';
    b.addEventListener('click', async () => {
      if (armeRelais !== `${cle}/${d}`) { armeRelais = `${cle}/${d}`; ouvrirFiche(ficheId); return; }   // second appui
      armeRelais = null;
      b.disabled = true;
      const erreur = await envoyerSuivi({ ordre: 'relais', tache: r.tache, moteur: r.moteur, decision: d });
      erreurRelais = erreur ? { cle, texte: erreur } : null;
      ouvrirFiche(ficheId);
    });
    boutons.append(b);
  }
  li.append(boutons);
  return li;
}

/* ═════════ Fiche agent ═════════ */
function ouvrirFiche(id) {
  const a = E?.agents.find(x => x.id === id);
  if (!a) return;
  const v = verdictSur(a.verdict);
  if (ficheId !== id || !$('fiche').open) { preparerLancer(a); armePause = null; armeRelais = null; }
  ficheId = id;
  preparerPause(a);
  rendreRelais(a);
  const g = $('fi-sig');
  g.textContent = sig(a); g.style.color = coulVerdict(v); g.style.borderColor = coulVerdict(v);
  $('fi-nom').textContent = a.nom;
  $('fi-sous').textContent = `${estPont(a) ? 'PONT CLAUDE CODE' : `AGENT N°${a.numero}`} · ${libVerdict(v)}`;
  $('fi-desc').textContent = a.desc || '';
  $('fi-desc').hidden = !a.desc;
  $('fi-ronde').textContent = estPont(a) ? libPont(a) : a.ronde ? dateCourte(a.ronde) : 'jamais';
  $('fi-rythme').textContent = LIB_RYTHME[a.rythme] || a.rythme;
  $('fi-moteur').textContent = a.ia ? `avec IA${COUTS[cout(a)]?.moteur || ''}` : 'code seul, sans IA';
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
  if (!VUES.includes(vue)) vue = 'command';
  for (const v of VUES) $(`vue-${v}`).hidden = v !== vue;
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
document.querySelectorAll('.filtre[data-filtre]').forEach(b => b.addEventListener('click', () => {
  filtre = b.dataset.filtre;
  document.querySelectorAll('.filtre[data-filtre]').forEach(x => {
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

document.querySelectorAll('.filtre[data-cible]').forEach(b => b.addEventListener('click', () => {
  cibleSk = b.dataset.cible;
  document.querySelectorAll('.filtre[data-cible]').forEach(x => {
    x.classList.toggle('actif', x === b); x.setAttribute('aria-pressed', String(x === b));
  });
  if (E) rendreSkills();
}));
$('sk-cherche').addEventListener('input', e => { chercheSk = e.target.value; if (E) rendreSkills(); });

/* ═════════ Theme (propre a ce telephone ; theme.js l'a deja pose au chargement) ═════════ */
const THEMES = { neon: '#090016', white: '#f5f7ff', tokyo: '#0b0c0e' };   // couleur de la barre du systeme
function appliquerTheme(id) {
  if (!THEMES[id]) id = 'neon';
  document.documentElement.dataset.theme = id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES[id]);
  document.querySelectorAll('.theme-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeId === id)));
  scenes?.theme(id);
  return id;
}
appliquerTheme(document.documentElement.dataset.theme);
document.querySelectorAll('.theme-btn').forEach(b => b.addEventListener('click', () => {
  memoire.ecrire(CLE_THEME, appliquerTheme(b.dataset.themeId));
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
