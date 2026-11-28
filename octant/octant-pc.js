/* ══════════════════════════════════════════════════════════════
   OCTANT (ODIN 5.15) — les DONNÉES DU PC, chiffrées.
   La Passerelle mobile (Agent 26) publie ../octant.chiffre.json (contrat octant/1, AES-256-GCM, PBKDF2) seulement
   quand le relevé de l'Observatoire change. Ce module :
     (a) demande la phrase secrète une fois et la garde sur le téléphone, sous la MÊME clé qu'ODIN Mobile (même site,
         même phrase : une seule saisie) ; déchiffre avec ../crypto-odin.js, sans rien d'autre ;
     (b) remplace la démo par la source « Agent PC » et affiche la pastille « Données du PC · relevé du JJ.MM » ;
     (c) hors ligne : le service worker (sw.js) rend le dernier fichier reçu ; les données déchiffrées ne sont JAMAIS
         écrites en clair dans le navigateur (elles sont relues du fichier chiffré à chaque ouverture) ;
     (f) ⟳ Actualiser : toucher la pastille, ou le bouton du bloc « Données du PC » (feuille « Plus »).
   Il s'appuie sur les fonctions du script d'origine (octant.js) : state, validatePayload, ingestPayload, dataChanged,
   toast, renderMoreSheet. Aucun autre site n'est contacté (CSP : connect-src 'self').
   ══════════════════════════════════════════════════════════════ */
import { dechiffrer, PhraseIncorrecte } from '../crypto-odin.js';

const CLE_PHRASE = 'odin-mobile.phrase';       // la même qu'ODIN Mobile (app.js)
const FICHIER = '../octant.chiffre.json';
const NOM_SOURCE = 'Agent PC';
const VIEUX_JOURS = 14;                         // au-delà : pastille orange « données anciennes »
const RETOUR_MS = 5 * 60 * 1000;                // au retour sur l'appli, relire si la dernière lecture a plus de 5 min
const AVERTISSEMENT = 'À vérifier sur ta vraie tâche : un classement ne remplace pas un essai.';

const memoire = {
  lire(k) { try { return localStorage.getItem(k); } catch { return null; } },
  ecrire(k, v) { try { localStorage.setItem(k, v); } catch { /* sans mémoire : la phrase sera redemandée */ } }
};
const $id = id => document.getElementById(id);
class Introuvable extends Error {}

let PC = null;          // { p: contrat octant/1, horsLigne, lu: horodatage }
let enCours = false;

/* ── dates : « relevé du 22.11 (il y a 6 jours) » ── */
function jourLocal(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function joursDepuis(iso) {
  const d = jourLocal(iso);
  if (!d) return NaN;
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((auj - d) / 86400000));
}
const jjmm = iso => { const d = jourLocal(iso); return d ? `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}` : '—'; };
const ilYa = n => !Number.isFinite(n) ? 'date inconnue' : n === 0 ? 'aujourd’hui' : n === 1 ? 'il y a 1 jour' : `il y a ${n} jours`;
const ilYaCourt = n => !Number.isFinite(n) ? '?' : n === 0 ? 'aujourd’hui' : `il y a ${n} j`;
const releveDe = p => p.releve || String(p.generatedAt || '').slice(0, 10);
const pcActif = () => typeof state === 'object' && state.sources.some(s => s.active && s.kind === 'agent' && s.name === NOM_SOURCE);

function phraseComplete() {
  if (!PC) return '';
  const n = joursDepuis(releveDe(PC.p));
  return `Données du PC · relevé du ${jjmm(releveDe(PC.p))} (${ilYa(n)})` + (PC.horsLigne ? ' · hors ligne : dernière version reçue' : '');
}

/* ── (b) la pastille (appelée par renderStatus à chaque rafraîchissement) ── */
window.octantPastille = function octantPastille() {
  const b = $id('pcBadge'), av = $id('pcAvert');
  if (!b) return;
  if (!PC || !pcActif()) { b.hidden = true; av.hidden = true; return; }
  const n = joursDepuis(releveDe(PC.p));
  b.hidden = false;
  b.classList.toggle('vieux', n > VIEUX_JOURS);
  $id('pcL1').textContent = PC.horsLigne ? 'PC · HORS LIGNE' : 'DONNÉES DU PC';
  $id('pcL2').textContent = `${jjmm(releveDe(PC.p))} · ${ilYaCourt(n)}`;     // court : la phrase entière est dans le titre
  const texte = phraseComplete() + (n > VIEUX_JOURS ? ' · données anciennes : le PC n’a rien publié depuis' : '');
  b.title = texte + ' — toucher pour actualiser';
  b.setAttribute('aria-label', texte + '. Toucher pour actualiser.');
  av.textContent = PC.p.avertissement || AVERTISSEMENT;
  av.hidden = false;
};
function pastilleCharge(oui) { const b = $id('pcBadge'); if (b) b.classList.toggle('charge', oui); }

/* ── (a) l'écran de la phrase ── */
function ouvrirVerrou(msg = '') {
  $id('pcMsg').textContent = msg;
  $id('pcVerrou').hidden = false;
  setTimeout(() => { try { $id('pcPhrase').focus(); } catch { /* rien */ } }, 50);
}
function fermerVerrou() { $id('pcVerrou').hidden = true; $id('pcPhrase').value = ''; $id('pcMsg').textContent = ''; }

/* ── lire le fichier du PC ── */
async function charger(phrase, { nouvelle = false, manuel = false } = {}) {
  if (enCours) return;
  enCours = true; pastilleCharge(true);
  try {
    let r;
    try { r = await fetch(FICHIER, { cache: 'no-cache', credentials: 'omit' }); } catch { throw new Introuvable('réseau'); }
    if (!r.ok) throw new Introuvable(`HTTP ${r.status}`);
    const horsLigne = r.headers.get('x-octant-cache') === '1' || !navigator.onLine;
    const p = await dechiffrer(await r.json(), phrase);
    const v = validatePayload(p);
    if (!v.ok || !p.source || p.source.kind !== 'agent') throw new Error('contenu inattendu');
    if (nouvelle) memoire.ecrire(CLE_PHRASE, phrase);
    PC = { p, horsLigne, lu: Date.now() };
    state.sources.forEach(s => { if (s.kind === 'demo') s.active = false; });     // la démo est mise de côté, pas supprimée
    const res = ingestPayload(p, { kind: 'agent', name: NOM_SOURCE });
    if (!res.ok) throw new Error(res.errors[0] || 'contenu refusé');
    fermerVerrou();
    dataChanged(manuel ? `Données du PC actualisées · relevé du ${jjmm(releveDe(p))}` : '');
  } finally {
    enCours = false; pastilleCharge(false);
  }
}

function repliDemo() {
  if (state.sources.some(s => s.active)) return;
  const d = state.sources.find(s => s.kind === 'demo');
  if (d) { d.active = true; rebuildData(); dataChanged(''); } else { loadDemo(); dataChanged(''); }
}

async function essayer(phrase, opts = {}) {
  try {
    await charger(phrase, opts);
    return true;
  } catch (e) {
    if (e instanceof PhraseIncorrecte) {
      ouvrirVerrou(opts.nouvelle ? 'Phrase incorrecte.' : 'La phrase enregistrée ne lit plus les données du PC : entre-la à nouveau.');
    } else if (e instanceof Introuvable) {
      const msg = 'Données du PC introuvables (pas encore publiées, ou hors ligne sans copie).';
      if (opts.nouvelle) $id('pcMsg').textContent = msg + ' Tu peux continuer avec la démo.';
      else { repliDemo(); toast(PC ? 'Hors ligne : la dernière version reçue reste affichée' : msg); }
    } else {
      const msg = 'Données du PC illisibles : rien n’a été chargé.';
      if (opts.nouvelle) $id('pcMsg').textContent = msg; else { repliDemo(); toast(msg); }
    }
    return false;
  }
}

function actualiser() {
  const phrase = memoire.lire(CLE_PHRASE);
  if (!phrase) { ouvrirVerrou(); return; }
  essayer(phrase, { manuel: true });
}

/* ── bloc « Données du PC » en tête de la feuille « Plus » ── */
const renderMoreOrigine = window.renderMoreSheet;
window.renderMoreSheet = function () {
  renderMoreOrigine();
  const corps = $id('sheet-more-body');
  const bloc = document.createElement('div');
  bloc.className = 'pc-bloc';
  const titre = document.createElement('div');
  const actions = document.createElement('div'); actions.className = 'pc-actions';
  const bouton = (texte, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = texte; b.addEventListener('click', fn); actions.append(b); };
  if (PC) {
    const o = PC.p.omis || {};
    titre.innerHTML = '<b>Données du PC</b>';
    titre.append(document.createTextNode(' · ' + phraseComplete().replace(/^Données du PC · /, '')));
    const regle = document.createElement('div'); regle.textContent = PC.p.regle || '';
    const omis = document.createElement('div'); omis.className = 'pc-omis';
    omis.textContent = `Non exportés (jamais mêlés au classement) : ${o.valeurs_non_comparables ?? 0} valeurs à un autre niveau, `
      + `${o.annonces_editeur ?? 0} annonces d’éditeur, ${o.cases_vides ?? 0} cases vides, `
      + `${o.benchmarks_peu_couverts ?? 0} benchmarks trop peu couverts (${o.valeurs_hors_selection ?? 0} valeurs).`;
    const av = document.createElement('div'); av.textContent = PC.p.avertissement || AVERTISSEMENT;
    bloc.append(titre, regle, omis, av);
    bouton('⟳ Actualiser', () => { closeSheet(); actualiser(); });
  } else {
    titre.innerHTML = '<b>Données du PC</b> · non chargées : la démo est affichée.';
    bloc.append(titre);
    bouton('Déverrouiller les données du PC', () => { closeSheet(); actualiser(); });
  }
  bloc.append(actions);
  corps.prepend(bloc);
};

/* ── démarrage ── */
$id('pcForm').addEventListener('submit', async e => {
  e.preventDefault();
  const champ = $id('pcPhrase'), btn = e.submitter || e.target.querySelector('button');
  const phrase = champ.value;
  if (phrase.length < 12) { $id('pcMsg').textContent = 'La phrase fait au moins 12 caractères.'; return; }
  btn.disabled = true; $id('pcMsg').textContent = 'Déchiffrement…';
  await essayer(phrase, { nouvelle: true });
  btn.disabled = false;
});
$id('pcDemo').addEventListener('click', () => { fermerVerrou(); repliDemo(); });
$id('pcBadge').addEventListener('click', actualiser);
document.addEventListener('visibilitychange', () => {
  const phrase = memoire.lire(CLE_PHRASE);
  if (document.visibilityState === 'visible' && PC && phrase && Date.now() - PC.lu > RETOUR_MS) essayer(phrase);
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => { /* sans cache : marche en ligne */ });

const phraseGardee = memoire.lire(CLE_PHRASE);
if (phraseGardee) essayer(phraseGardee);
else ouvrirVerrou();
