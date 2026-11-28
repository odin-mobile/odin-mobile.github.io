/* OCTANT — script d'origine (dashboard-benchmarks-ia-2026-11-27.html), sorti de la page pour la CSP (script-src 'self'). Differences : _chantier/5.15/construire_octant.py (odin). */
'use strict';
// ===== CONFIG =====
// Everything a non-developer may want to change lives here.
const CONFIG = Object.freeze({
  appName: 'OCTANT',
  tagline: 'Observatoire des benchmarks IA',
  locale: 'fr-BE',
  currencySymbol: '$',
  schema: 'octant/1',                 // contract the PC agent must follow
  workspaceKind: 'octant-workspace',
  workspaceVersion: 1,
  defaultTheme: 'neural',
  blend: { input: 3, output: 1 },     // blended price = (3 × input + 1 × output) / 4
  minBenchmarks: 5,                   // a model is "tracked" from this many benchmarks…
  minCoverage: 0.85,                  // …and at least this share of all benchmarks
  conflictThreshold: 4,               // normalized points between two sources = conflict
  anomalyZ: 3.5,                      // robust z-score threshold for suspicious results
  compareDays: 30,                    // "previous period" window
  leadGap: { strong: 3, weak: 1 },    // status thresholds for the lead gap (points)
  progressGood: 0.8,                  // state-of-the-art progress considered healthy (pts / month)
  reliability: { good: 80, warn: 60 },
  forecastIndexThreshold: 80,
  forecastWindow: 12,                 // months used by the regression
  forecastHorizon: 24,                // months projected
  exportFileName: 'octant-espace',
  csvFileName: 'octant-classement',
  demoSeed: 20261127,
  maxSources: 12,
  storage: { theme: 'octant.theme', eco: 'octant.eco', workspace: 'octant.workspace' },
  three: {
    url: 'vendor/three.min.js',
    integrity: 'sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==',
    timeoutMs: 8000
  },
  particleDensity: { full: 1, eco: 0.45 },
  maxPixelRatio: 1.75
});

const THEMES = [
  { id: 'neural', name: 'Neural Noir', mode: 'dark', desc: 'Réseau neuronal · cyan & violet', meta: '#05060f',
    preview: 'radial-gradient(circle at 28% 30%,rgba(77,227,255,.55),transparent 45%),radial-gradient(circle at 75% 72%,rgba(155,107,255,.7),transparent 50%),#05060f' },
  { id: 'aurora', name: 'Quantum Aurora', mode: 'dark', desc: 'Champ quantique · menthe & magenta', meta: '#020d0d',
    preview: 'linear-gradient(160deg,transparent 40%,rgba(61,255,180,.55) 62%,transparent 72%),radial-gradient(circle at 80% 85%,rgba(255,79,216,.6),transparent 50%),#020d0d' },
  { id: 'cryo', name: 'Cryo Lab', mode: 'light', desc: 'Grille holographique · glace & acier', meta: '#eaf1f8',
    preview: 'repeating-linear-gradient(90deg,rgba(10,98,240,.18) 0 1px,transparent 1px 16px),repeating-linear-gradient(0deg,rgba(10,98,240,.18) 0 1px,transparent 1px 16px),linear-gradient(180deg,#f6f9fc,#d4e6fb)' },
  { id: 'silicon', name: 'Silicon Dawn', mode: 'light', desc: 'Circuits lumineux · ivoire & cuivre', meta: '#f5efe4',
    preview: 'linear-gradient(90deg,transparent 30%,rgba(224,86,11,.55) 30% 32%,transparent 32%),linear-gradient(0deg,transparent 55%,rgba(15,118,110,.45) 55% 57%,transparent 57%),radial-gradient(circle at 70% 30%,#ffd9bd,transparent 60%),#f5efe4' },
  { id: 'singularity', name: 'Singularité', mode: 'dark', desc: 'Noyau iridescent · identité OCTANT', meta: '#020104',
    preview: 'radial-gradient(circle at 50% 50%,#020104 18%,rgba(110,240,255,.7) 24%,rgba(200,182,255,.55) 34%,rgba(255,197,110,.35) 44%,transparent 60%),#020104' }
];

const SPACES = [
  { id: 'pulse', label: 'Pulse', icon: 'i-pulse', dock: true, eyebrow: '01 · Vue d’ensemble', title: 'Pulse', q: 'Qui mène aujourd’hui, et qu’est-ce qui a bougé ce mois-ci ?' },
  { id: 'arena', label: 'Arène', icon: 'i-arena', dock: true, eyebrow: '02 · Classements', title: 'Arène', q: 'Quel modèle est le meilleur sur chaque benchmark ?' },
  { id: 'duel', label: 'Duel', icon: 'i-duel', dock: true, eyebrow: '03 · Comparaison', title: 'Duel', q: 'Comment ces modèles se comparent-ils, axe par axe ?' },
  { id: 'frontier', label: 'Frontière', icon: 'i-frontier', dock: true, eyebrow: '04 · Coût × performance', title: 'Frontière', q: 'Qui offre le plus de performance pour chaque dollar dépensé ?' },
  { id: 'trajectory', label: 'Trajectoire', icon: 'i-traj', dock: false, eyebrow: '05 · Prévision', title: 'Trajectoire', q: 'À quel rythme progresse l’état de l’art, et quand le prochain seuil tombera-t-il ?' },
  { id: 'simulator', label: 'Simulateur', icon: 'i-sim', dock: false, eyebrow: '06 · Scénarios', title: 'Simulateur', q: 'Quel modèle est le meilleur pour mon usage à moi ?' },
  { id: 'flux', label: 'Flux', icon: 'i-flux', dock: false, eyebrow: '07 · Données & sources', title: 'Flux', q: 'D’où viennent les chiffres, et peut-on leur faire confiance ?' },
  { id: 'report', label: 'Rapport', icon: 'i-report', dock: false, eyebrow: '08 · Synthèse', title: 'Rapport', q: 'Que faut-il retenir cette semaine ?' }
];

const CATEGORIES = { code: 'Code', agents: 'Agents', science: 'Science', reasoning: 'Raisonnement', math: 'Maths', multimodal: 'Multimodal', preference: 'Préférence' };

const KPI_DEFS = {
  leader: { label: 'Leader', def: 'Indice Octant du modèle n°1 : moyenne de ses scores normalisés (0–100) sur tous les benchmarks disponibles, poids égaux.' },
  gap: { label: 'Écart de tête', def: 'Indice du n°1 moins indice du n°2. Au-delà de 3 points, l’avance est nette ; sous 1 point, c’est du coude à coude.' },
  value: { label: 'Meilleur perf/$', def: 'Indice Octant divisé par le prix mixte (3 parts d’entrée pour 1 part de sortie, en $ par million de tokens). Plus c’est haut, plus chaque dollar rapporte.' },
  records: { label: 'Records · 30 j', def: 'Nombre de benchmarks dont le meilleur score jamais mesuré a été battu au cours des 30 derniers jours.' },
  progress: { label: 'Rythme SOTA', def: 'Pente de la régression linéaire de l’indice du n°1 sur 12 mois, en points par mois. Mesure la vitesse de progression de l’état de l’art.' },
  tracked: { label: 'Modèles suivis', def: 'Nombre de modèles couvrant assez de benchmarks pour être comparables (au moins 85 % des benchmarks, minimum 5). Seuil requis pour entrer au classement.' }
};

const SCENARIO_PRESETS = [
  { id: 'balanced', name: 'Équilibré', preset: true, w: { code: 3, agents: 3, science: 3, reasoning: 3, math: 3, multimodal: 3, preference: 3, cost: 1, speed: 1 } },
  { id: 'agentic', name: 'Dev agentique', preset: true, w: { code: 5, agents: 5, science: 1, reasoning: 2, math: 1, multimodal: 1, preference: 2, cost: 2, speed: 2 } },
  { id: 'research', name: 'Recherche', preset: true, w: { code: 1, agents: 1, science: 5, reasoning: 5, math: 4, multimodal: 2, preference: 1, cost: 0, speed: 0 } },
  { id: 'budget', name: 'Budget serré', preset: true, w: { code: 2, agents: 2, science: 2, reasoning: 2, math: 2, multimodal: 2, preference: 2, cost: 5, speed: 3 } }
];

// ===== STATE =====
function defaultSettings() {
  return { arenaCat: 'all', arenaBench: 'index', hideSuperseded: true, duel: [], frontierAxis: 'price', trajBench: 'index', thresholds: {}, excludeSuspect: false };
}
const state = {
  theme: CONFIG.defaultTheme,
  eco: false,
  sources: [],          // { id, name, kind, receivedAt, active, payload }
  data: null,           // merged dataset built by DATA ENGINE
  space: 'pulse',
  settings: defaultSettings(),
  scenarios: SCENARIO_PRESETS.map(sc => ({ ...sc, w: { ...sc.w } })),
  activeScenario: 'balanced',
  compare: ['balanced', 'agentic', 'budget'],
  hidden: {},           // chartId -> [hidden series keys]
  logFilter: 'all',
  logLimit: 40,
  env: { three: 'pending', webgl: 'pending', fonts: 'pending', storage: true },
  persistedAt: null,
  exportedAt: null
};
let DATA_VERSION = 0;

// ===== UTILS =====
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ESC_MAP[c]); }
function str(v, max = 120) { return String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }
function num(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v.trim().replace(',', '.'));
  return NaN;
}
const NF_CACHE = {};
function nf(d) { return NF_CACHE[d] || (NF_CACHE[d] = new Intl.NumberFormat(CONFIG.locale, { minimumFractionDigits: d, maximumFractionDigits: d })); }
function fmt(v, d = 1) { return Number.isFinite(v) ? nf(d).format(v) : '—'; }
function fmtSigned(v, d = 1) {
  if (!Number.isFinite(v)) return '—';
  const r = Number(v.toFixed(d));
  return (r > 0 ? '+' : r < 0 ? '−' : '±') + nf(d).format(Math.abs(r));
}
function fmtPrice(v) { return Number.isFinite(v) ? CONFIG.currencySymbol + fmt(v, v < 10 ? 2 : 1) : '—'; }
function fmtScore(b, v) { return b && b.unit === 'Elo' ? fmt(v, 0) : fmt(v, 1); }
function unitOf(b) { return !b ? '' : b.unit === '%' ? '%' : ' ' + b.unit; }
function fmtCtx(k) { return !Number.isFinite(k) ? '—' : k >= 1000 ? fmt(k / 1000, k % 1000 ? 1 : 0) + ' M' : fmt(k, 0) + ' k'; }
const DAY = 86400000;
const DF = new Intl.DateTimeFormat(CONFIG.locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const DFS = new Intl.DateTimeFormat(CONFIG.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const MF = new Intl.DateTimeFormat(CONFIG.locale, { month: 'short', year: '2-digit', timeZone: 'UTC' });
const MLF = new Intl.DateTimeFormat(CONFIG.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const TF = new Intl.DateTimeFormat(CONFIG.locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
function fmtDate(t) { return Number.isFinite(t) ? DF.format(new Date(t)) : '—'; }
function fmtDay(t) { return Number.isFinite(t) ? DFS.format(new Date(t)) : '—'; }
function fmtMonth(t) { return Number.isFinite(t) ? MF.format(new Date(t)) : '—'; }
function fmtMonthLong(t) { return Number.isFinite(t) ? MLF.format(new Date(t)) : '—'; }
function fmtStamp(t) { return Number.isFinite(t) ? TF.format(new Date(t)) : '—'; }
function parseISO(s) {
  if (typeof s !== 'string') return NaN;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?[^]*)?$/.exec(s.trim());
  if (!m) return NaN;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return NaN;
  const t = Date.UTC(y, mo - 1, d, +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  return new Date(t).getUTCMonth() === mo - 1 ? t : NaN;
}
function isoDay(t) { return new Date(t).toISOString().slice(0, 10); }
function monthEndOf(y, m) { return Date.UTC(y, m + 1, 1) - 1; }
function addMonthsEnd(t, k) { const d = new Date(t); return monthEndOf(d.getUTCFullYear(), d.getUTCMonth() + k); }
function monthSeries(fromT, toT) {
  const f = new Date(fromT), t = new Date(toT);
  const y0 = f.getUTCFullYear(), m0 = f.getUTCMonth();
  const n = (t.getUTCFullYear() - y0) * 12 + t.getUTCMonth() - m0;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const y = y0 + Math.floor((m0 + i) / 12), m = (m0 + i) % 12;
    out.push({ i, y, m, start: Date.UTC(y, m, 1), end: Math.min(monthEndOf(y, m), toT) });
  }
  return out;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const sum = a => a.reduce((s, v) => s + v, 0);
const mean = a => a.length ? sum(a) / a.length : NaN;
function median(a) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y), h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function linreg(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const xb = mean(xs), yb = mean(ys);
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i] - xb) ** 2; sxy += (xs[i] - xb) * (ys[i] - yb); }
  if (sxx === 0) return null;
  const slope = sxy / sxx, intercept = yb - slope * xb;
  let sse = 0, sst = 0;
  for (let i = 0; i < n; i++) { const e = ys[i] - (intercept + slope * xs[i]); sse += e * e; sst += (ys[i] - yb) ** 2; }
  return { n, slope, intercept, xb, sxx, s: Math.sqrt(sse / (n - 2)), r2: sst > 0 ? 1 - sse / sst : 1, predict: x => intercept + slope * x };
}
function tCrit95(df) {
  const T = { 1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131, 16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086 };
  if (df <= 0) return NaN;
  if (T[df]) return T[df];
  return df < 30 ? 2.06 : df < 60 ? 2.01 : 1.98;
}
function niceTicks(min, max, count = 4) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) { min = 0; max = 1; }
  if (min === max) { min -= 1; max += 1; }
  const step0 = (max - min) / count, mag = 10 ** Math.floor(Math.log10(step0)), err = step0 / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
  return { ticks, lo, hi, step };
}
function debounce(fn, ms) { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; }
function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
function reduceMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { state.env.storage = false; return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { state.env.storage = false; return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* silent fallback */ } }
};
const FRAMED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
function download(name, content, mime) {
  if (FRAMED) {
    copyText(typeof content === 'string' ? content.replace(/^\uFEFF/, '') : String(content)).then(ok => toast(ok ? 'Aperçu en ligne : contenu copié dans le presse-papiers (téléchargement bloqué)' : 'Téléchargement bloqué dans l’aperçu : ouvrez le fichier HTML'));
    return;
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    ta.remove(); return ok;
  }
}
const SVGNS = 'http://www.w3.org/2000/svg';
function S(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c);
  return el;
}
function iconSvg(id, size = 18) { return `<svg width="${size}" height="${size}" aria-hidden="true"><use href="#${id}"/></svg>`; }
function todayStamp() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

// ===== DATA ENGINE =====
// --- Demo generator (seeded, deterministic). Scores are fictional. ---
function generateDemoPayload(seed) {
  const rng = mulberry32(seed);
  const gauss = () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const asOf = '2026-11-27T08:00:00Z', asOfT = parseISO(asOf);
  const vendors = [
    { id: 'aurelia', name: 'Aurelia', str: { code: .03, agents: .04, science: .01, reasoning: .02, math: 0, multimodal: -.01, preference: .02 } },
    { id: 'kestrel', name: 'Kestrel AI', str: { code: .04, agents: .02, science: 0, reasoning: 0, math: .02, multimodal: 0, preference: .03 } },
    { id: 'lumen', name: 'Lumen', str: { code: -.01, agents: 0, science: .03, reasoning: .03, math: .02, multimodal: .05, preference: .02 } },
    { id: 'vanta', name: 'Vanta', str: { code: .01, agents: .01, science: .01, reasoning: .01, math: .03, multimodal: .01, preference: 0 } },
    { id: 'orion', name: 'Orion Labs', str: { code: 0, agents: -.02, science: .01, reasoning: .02, math: .04, multimodal: 0, preference: -.01 } },
    { id: 'halcyon', name: 'Halcyon', str: { code: -.01, agents: -.02, science: 0, reasoning: -.01, math: 0, multimodal: .02, preference: .01 } },
    { id: 'meridian', name: 'Meridian', str: { code: .01, agents: .02, science: 0, reasoning: 0, math: -.01, multimodal: .01, preference: .02 } },
    { id: 'tessera', name: 'Tessera Collective', str: { code: .02, agents: 0, science: -.01, reasoning: -.01, math: .01, multimodal: -.01, preference: -.02 } }
  ];
  const V = Object.fromEntries(vendors.map(v => [v.id, v]));
  const B = [
    { id: 'swe', name: 'SWE-bench Verified', short: 'SWE-V', category: 'code', unit: '%', scaleMin: 0, scaleMax: 100, description: 'Résolution de vrais tickets GitHub sur des dépôts Python open source.', c: { lo: 10, hi: 92, d: .55, k: 6 } },
    { id: 'tbench', name: 'Terminal-Bench 2', short: 'T-Bench', category: 'agents', unit: '%', scaleMin: 0, scaleMax: 100, description: 'Tâches longues en ligne de commande, menées en autonomie.', c: { lo: 5, hi: 85, d: .68, k: 6 }, since: '2025-06-01' },
    { id: 'gpqa', name: 'GPQA Diamond', short: 'GPQA', category: 'science', unit: '%', scaleMin: 25, scaleMax: 100, description: 'Questions de niveau doctorat en physique, chimie et biologie (25 % = hasard).', c: { lo: 30, hi: 92, d: .4, k: 6 } },
    { id: 'hle', name: 'Humanity’s Last Exam', short: 'HLE', category: 'reasoning', unit: '%', scaleMin: 0, scaleMax: 100, description: 'Questions expertes multi-domaines conçues pour résister aux modèles.', c: { lo: 2, hi: 70, d: .95, k: 5 } },
    { id: 'aime', name: 'AIME 2025', short: 'AIME', category: 'math', unit: '%', scaleMin: 0, scaleMax: 100, description: 'Problèmes de compétition mathématique, sans outils.', c: { lo: 5, hi: 100, d: .45, k: 7 } },
    { id: 'arc', name: 'ARC-AGI-2', short: 'ARC-2', category: 'reasoning', unit: '%', scaleMin: 0, scaleMax: 100, description: 'Abstraction visuelle sur des puzzles jamais vus.', c: { lo: 0, hi: 85, d: 1.0, k: 5 } },
    { id: 'mmmu', name: 'MMMU-Pro', short: 'MMMU', category: 'multimodal', unit: '%', scaleMin: 10, scaleMax: 100, description: 'Raisonnement sur images, schémas et documents (10 % = hasard).', c: { lo: 30, hi: 88, d: .5, k: 5 } },
    { id: 'arena', name: 'Arena Elo', short: 'Elo', category: 'preference', unit: 'Elo', scaleMin: 1000, scaleMax: 1600, description: 'Préférence humaine mesurée en duels à l’aveugle.', c: { lo: 1150, hi: 1550, d: .5, k: 4 } }
  ];
  // id, name, vendor, family, release, tier, open, contextK, priceIn, priceOut, tokens/s, multimodal
  const M = [
    ['aurelia-prime-1', 'Aurelia Prime 1', 'aurelia', 'prime', '2024-12-10', 'flag', false, 200, 15, 75, 45, true],
    ['orion-deep-r1', 'Orion Deep R1', 'orion', 'deep', '2025-01-20', 'open', true, 128, 0.55, 2.2, 35, false],
    ['kestrel-k3', 'Kestrel K3', 'kestrel', 'k', '2025-01-22', 'flag', false, 128, 5, 15, 60, true],
    ['lumen-ultra-1', 'Lumen Ultra 1', 'lumen', 'ultra', '2025-02-27', 'flag', false, 1000, 2.5, 10, 90, true],
    ['vanta-x3', 'Vanta-X 3', 'vanta', 'x', '2025-04-09', 'flag', false, 256, 3, 15, 55, true],
    ['aurelia-prime-2', 'Aurelia Prime 2', 'aurelia', 'prime', '2025-06-18', 'flag', false, 200, 15, 75, 50, true],
    ['kestrel-k4', 'Kestrel K4', 'kestrel', 'k', '2025-08-07', 'flag', false, 400, 1.25, 10, 80, true],
    ['tessera-open-2', 'Tessera Open 2', 'tessera', 'open', '2025-09-10', 'open', true, 128, 0.2, 0.6, 120, false],
    ['lumen-ultra-1-5', 'Lumen Ultra 1.5', 'lumen', 'ultra', '2025-11-18', 'flag', false, 1000, 2, 12, 95, true],
    ['kestrel-k4-5', 'Kestrel K4.5', 'kestrel', 'k', '2026-02-12', 'flag', false, 400, 1.75, 14, 85, true],
    ['aurelia-prime-2-5', 'Aurelia Prime 2.5', 'aurelia', 'prime', '2026-03-05', 'flag', false, 500, 5, 25, 60, true],
    ['halcyon-4', 'Halcyon 4', 'halcyon', 'halcyon', '2026-05-06', 'open', true, 1000, 0.18, 0.6, 150, true],
    ['meridian-max', 'Meridian Max', 'meridian', 'max', '2026-06-24', 'flag', false, 256, 3, 15, 70, true],
    ['meridian-mini', 'Meridian Mini', 'meridian', 'mini', '2026-06-24', 'fast', false, 256, 0.25, 1, 210, true],
    ['vanta-x4', 'Vanta-X 4', 'vanta', 'x', '2026-07-15', 'flag', false, 2000, 3, 15, 65, true],
    ['orion-deep-r2', 'Orion Deep R2', 'orion', 'deep', '2026-08-20', 'open', true, 160, 0.4, 1.6, 45, false],
    ['kestrel-k5', 'Kestrel K5', 'kestrel', 'k', '2026-09-30', 'flag', false, 1000, 2, 14, 90, true],
    ['tessera-open-3', 'Tessera Open 3', 'tessera', 'open', '2026-10-08', 'open', true, 256, 0.3, 1.2, 130, true],
    ['aurelia-prime-3', 'Aurelia Prime 3', 'aurelia', 'prime', '2026-10-21', 'flag', false, 1000, 5, 25, 70, true],
    ['aurelia-swift-3', 'Aurelia Swift 3', 'aurelia', 'swift', '2026-10-21', 'fast', false, 1000, 0.8, 4, 190, true],
    ['lumen-ultra-2', 'Lumen Ultra 2', 'lumen', 'ultra', '2026-11-12', 'flag', false, 2000, 2.5, 15, 100, true],
    ['lumen-flash-2', 'Lumen Flash 2', 'lumen', 'flash', '2026-11-12', 'fast', false, 1000, 0.3, 2.5, 240, true]
  ];
  const origin = Date.UTC(2024, 10, 1);
  const tierOff = { flag: 0, fast: -0.13, open: -0.07 };
  const models = [], results = [];
  for (const [id, name, vendor, family, release, tier, open, ctx, pin, pout, speed, mm] of M) {
    models.push({ id, name, vendor, family, releaseDate: release, open, contextK: ctx, priceIn: pin, priceOut: pout, tokensPerSec: speed, multimodal: mm });
    const rt = parseISO(release);
    const base = 0.30 + 0.62 * ((rt - origin) / (30.44 * DAY)) / 24 + tierOff[tier] + gauss() * 0.012;
    for (const b of B) {
      if (b.id === 'mmmu' && !mm) continue;
      if (b.since && rt < parseISO(b.since)) continue;
      const c = base + (V[vendor].str[b.category] || 0) + gauss() * 0.008;
      const f = 1 / (1 + Math.exp(-b.c.k * (c - b.c.d)));
      const isElo = b.unit === 'Elo';
      let score = b.c.lo + (b.c.hi - b.c.lo) * f + gauss() * (isElo ? 5 : 0.7);
      score = isElo ? Math.round(score) : Math.round(clamp(score, b.scaleMin, b.scaleMax) * 10) / 10;
      if (b.id === 'arena') {
        const d = rt + Math.round(12 + rng() * 8) * DAY;
        if (d <= asOfT) results.push({ modelId: id, benchmarkId: b.id, score, date: isoDay(d), source: 'independent', verified: true });
        continue;
      }
      const d1 = rt + Math.round(2 + rng() * 6) * DAY;
      results.push({ modelId: id, benchmarkId: b.id, score, date: isoDay(d1), source: 'official', verified: false });
      if (rng() < 0.62) {
        const d2 = d1 + Math.round(9 + rng() * 16) * DAY;
        if (d2 <= asOfT) results.push({ modelId: id, benchmarkId: b.id, score: Math.round((score - Math.abs(gauss()) * 1.1) * 10) / 10, date: isoDay(d2), source: 'independent', verified: true });
      }
    }
  }
  // --- Deliberate anomalies, so the quality checks have something to show ---
  const drop = (m, b, src) => { for (let i = results.length - 1; i >= 0; i--) if (results[i].modelId === m && results[i].benchmarkId === b && results[i].source === src) results.splice(i, 1); };
  const off = (m, b) => results.find(r => r.modelId === m && r.benchmarkId === b && r.source === 'official');
  // 1. Self-reported outlier, never reproduced
  drop('vanta-x4', 'hle', 'independent');
  Object.assign(off('vanta-x4', 'hle'), { score: 52.8, note: 'Auto-déclaré, protocole non publié' });
  // 2. Conflict between official and independent measures
  drop('kestrel-k5', 'swe', 'independent');
  Object.assign(off('kestrel-k5', 'swe'), { score: 86.9 });
  results.push({ modelId: 'kestrel-k5', benchmarkId: 'swe', score: 79.4, date: '2026-10-21', source: 'independent', verified: true, note: 'Ré-évaluation indépendante' });
  // 3. Out-of-scale value
  drop('tessera-open-3', 'gpqa', 'independent');
  Object.assign(off('tessera-open-3', 'gpqa'), { score: 104.2 });
  // 4. Suspicious jump (possible contamination)
  drop('lumen-flash-2', 'arc', 'independent');
  Object.assign(off('lumen-flash-2', 'arc'), { score: 41.3, note: 'Score très supérieur au modèle phare' });
  // 5. Invalid date
  Object.assign(off('meridian-mini', 'hle'), { date: '2026-13-04' });
  return {
    schema: CONFIG.schema,
    generatedAt: asOf,
    source: { name: 'Démo OCTANT', agent: 'générateur intégré', kind: 'demo' },
    vendors: vendors.map(v => ({ id: v.id, name: v.name })),
    benchmarks: B.map(b => ({ id: b.id, name: b.name, short: b.short, category: b.category, unit: b.unit, scaleMin: b.scaleMin, scaleMax: b.scaleMax, higherIsBetter: true, description: b.description })),
    models,
    results
  };
}

const EXAMPLE_PAYLOAD = {
  schema: 'octant/1',
  generatedAt: '2026-11-27T08:00:00Z',
  source: { name: 'Agent PC', agent: 'claude-code', kind: 'agent' },
  vendors: [{ id: 'aurelia', name: 'Aurelia' }],
  benchmarks: [
    { id: 'swe', name: 'SWE-bench Verified', short: 'SWE-V', category: 'code', unit: '%', scaleMin: 0, scaleMax: 100, higherIsBetter: true, description: 'Tickets GitHub réels' },
    { id: 'gpqa', name: 'GPQA Diamond', short: 'GPQA', category: 'science', unit: '%', scaleMin: 25, scaleMax: 100, higherIsBetter: true, description: 'Science niveau doctorat' }
  ],
  models: [
    { id: 'aurelia-prime-3', name: 'Aurelia Prime 3', vendor: 'aurelia', family: 'prime', releaseDate: '2026-10-21', open: false, contextK: 1000, priceIn: 5, priceOut: 25, tokensPerSec: 70, multimodal: true }
  ],
  results: [
    { modelId: 'aurelia-prime-3', benchmarkId: 'swe', score: 84.1, date: '2026-10-25', source: 'official', verified: false },
    { modelId: 'aurelia-prime-3', benchmarkId: 'swe', score: 83.2, date: '2026-11-09', source: 'independent', verified: true },
    { modelId: 'aurelia-prime-3', benchmarkId: 'gpqa', score: 88.7, date: '2026-10-25', source: 'official', verified: false }
  ]
};

// --- Validation of an incoming payload (structure only; row-level checks go to the quality log) ---
function validatePayload(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return { ok: false, errors: ['Le contenu n’est pas un objet JSON.'] };
  const errors = [];
  if (p.schema !== CONFIG.schema) errors.push(`Schéma attendu « ${CONFIG.schema} », reçu « ${str(p.schema ?? 'absent', 40)} ».`);
  for (const k of ['models', 'benchmarks', 'results']) if (!Array.isArray(p[k])) errors.push(`Le tableau « ${k} » est manquant.`);
  if (errors.length) return { ok: false, errors };
  if (!p.models.length || !p.benchmarks.length) return { ok: false, errors: ['Aucun modèle ou aucun benchmark dans le fichier.'] };
  if (p.results.length > 200000) return { ok: false, errors: ['Plus de 200 000 résultats : fichier trop volumineux.'] };
  return { ok: true, errors: [] };
}

function normScore(b, v) {
  const n = clamp((v - b.scaleMin) / (b.scaleMax - b.scaleMin) * 100, 0, 100);
  return b.higherIsBetter ? n : 100 - n;
}
const recRank = r => (r.verified ? 2 : 0) + (r.source === 'independent' ? 1 : 0);
function pickBest(group, cutoff) {
  let best = null;
  for (const r of group) {
    if (r.t > cutoff) continue;
    if (!best || recRank(r) > recRank(best) || (recRank(r) === recRank(best) && r.t > best.t)) best = r;
  }
  return best;
}

// --- Merge all active sources into one dataset ---
function buildDataset(sources) {
  const active = sources.filter(x => x.active);
  const ds = {
    version: ++DATA_VERSION, asOf: NaN, vendors: new Map(), models: new Map(), benchmarks: new Map(), groups: new Map(),
    issues: [], conflictKeys: new Set(), resultCount: 0, validCount: 0, sourcesUsed: active.length,
    isDemo: active.length > 0 && active.every(x => x.kind === 'demo'), empty: true
  };
  if (!active.length) return ds;
  const issue = (type, src, path, row, msg, model, bench) => ds.issues.push({ type, src: src ? src.name : '—', path, row, msg, model: model || null, bench: bench || null });

  for (const src of active) {
    const p = src.payload, gen = parseISO(p.generatedAt);
    if (Number.isFinite(gen)) ds.asOf = Number.isFinite(ds.asOf) ? Math.max(ds.asOf, gen) : gen;
    (Array.isArray(p.vendors) ? p.vendors : []).forEach(v => {
      if (v && typeof v.id === 'string' && v.id.trim()) ds.vendors.set(str(v.id, 60), { id: str(v.id, 60), name: str(v.name || v.id, 60) });
    });
    p.benchmarks.forEach((b, i) => {
      if (!b || typeof b.id !== 'string' || !b.id.trim()) { issue('invalid', src, 'benchmarks', i, 'Benchmark sans identifiant.'); return; }
      const smin = num(b.scaleMin), smax = num(b.scaleMax);
      const bb = {
        id: str(b.id, 60), name: str(b.name || b.id, 80), short: str(b.short || b.name || b.id, 12),
        category: CATEGORIES[b.category] ? b.category : 'reasoning',
        unit: b.unit === 'Elo' ? 'Elo' : str(b.unit || '%', 8) || '%',
        scaleMin: Number.isFinite(smin) ? smin : 0, scaleMax: Number.isFinite(smax) ? smax : 100,
        higherIsBetter: b.higherIsBetter !== false, description: str(b.description || '', 220)
      };
      if (!(bb.scaleMax > bb.scaleMin)) { issue('invalid', src, 'benchmarks', i, `Échelle invalide pour ${bb.name} (min ≥ max).`, null, bb.id); return; }
      ds.benchmarks.set(bb.id, bb);
    });
    p.models.forEach((m, i) => {
      if (!m || typeof m.id !== 'string' || !m.id.trim()) { issue('invalid', src, 'models', i, 'Modèle sans identifiant.'); return; }
      const mm = {
        id: str(m.id, 80), name: str(m.name || m.id, 80), vendor: str(m.vendor || 'autre', 60), family: str(m.family || m.id, 60),
        release: parseISO(m.releaseDate), open: m.open === true ? true : m.open === false ? false : null, contextK: num(m.contextK), priceIn: num(m.priceIn), priceOut: num(m.priceOut),
        speed: num(m.tokensPerSec), multimodal: m.multimodal === true ? true : m.multimodal === false ? false : null
      };
      if (!Number.isFinite(mm.release)) issue('invalid', src, 'models', i, `Date de sortie invalide pour ${mm.name}.`, mm.id);
      ds.models.set(mm.id, mm);
      if (!ds.vendors.has(mm.vendor)) ds.vendors.set(mm.vendor, { id: mm.vendor, name: mm.vendor });
    });
  }
  for (const src of active) {
    src.payload.results.forEach((r, i) => {
      ds.resultCount++;
      if (!r || typeof r !== 'object') { issue('invalid', src, 'results', i, 'Ligne illisible.'); return; }
      const m = ds.models.get(r.modelId), b = ds.benchmarks.get(r.benchmarkId);
      if (!m || !b) { issue('invalid', src, 'results', i, `Référence inconnue : ${!m ? 'modèle « ' + str(r.modelId, 40) + ' »' : 'benchmark « ' + str(r.benchmarkId, 40) + ' »'}.`, m && m.id, b && b.id); return; }
      const score = num(r.score), t = parseISO(r.date);
      if (!Number.isFinite(score)) { issue('invalid', src, 'results', i, 'Score non numérique.', m.id, b.id); return; }
      if (score < b.scaleMin || score > b.scaleMax) { issue('invalid', src, 'results', i, `Score ${fmtScore(b, score)} hors de l’échelle ${fmt(b.scaleMin, 0)}–${fmt(b.scaleMax, 0)} : ignoré.`, m.id, b.id); return; }
      if (!Number.isFinite(t)) { issue('invalid', src, 'results', i, `Date « ${str(r.date, 20)} » invalide : résultat ignoré.`, m.id, b.id); return; }
      if (Number.isFinite(ds.asOf) && t > ds.asOf + DAY) { issue('invalid', src, 'results', i, 'Date postérieure à la génération des données : ignoré.', m.id, b.id); return; }
      const rec = { modelId: m.id, benchId: b.id, score, t, source: r.source === 'independent' ? 'independent' : 'official', verified: r.verified === true, note: str(r.note || '', 160), srcName: src.name, row: i };
      const key = m.id + '|' + b.id;
      if (!ds.groups.has(key)) ds.groups.set(key, []);
      ds.groups.get(key).push(rec);
      ds.validCount++;
    });
  }
  if (!Number.isFinite(ds.asOf)) { let mx = 0; ds.groups.forEach(g => g.forEach(r => { mx = Math.max(mx, r.t); })); ds.asOf = mx || Date.now(); }
  // Conflicts between sources for the same model × benchmark
  ds.groups.forEach((g, key) => {
    if (g.length < 2) return;
    const b = ds.benchmarks.get(g[0].benchId), m = ds.models.get(g[0].modelId);
    const ns = g.map(r => normScore(b, r.score)), spread = Math.max(...ns) - Math.min(...ns);
    if (spread > CONFIG.conflictThreshold) {
      ds.conflictKeys.add(key);
      const vals = g.map(r => `${fmtScore(b, r.score)}${unitOf(b)} (${r.source === 'independent' ? 'indépendant' : 'officiel'})`).join(' contre ');
      ds.issues.push({ type: 'conflict', src: [...new Set(g.map(r => r.srcName))].join(', '), path: 'results', row: g.map(r => r.row).join(', '), model: m.id, bench: b.id, msg: `Écart de ${fmt(spread, 1)} pts entre sources : ${vals}. La mesure vérifiée est retenue.` });
    }
  });
  // Missing values
  ds.models.forEach(m => ds.benchmarks.forEach(b => {
    if (!ds.groups.has(m.id + '|' + b.id)) ds.issues.push({ type: 'missing', src: '—', path: '—', row: '—', model: m.id, bench: b.id, msg: `Aucun résultat pour ${b.name}.` });
  }));
  // Superseded versions (same vendor + family, newer release exists)
  ds.models.forEach(m => {
    m.superseded = false;
    ds.models.forEach(o => { if (o !== m && o.vendor === m.vendor && o.family === m.family && o.release > m.release) m.superseded = true; });
  });
  let vi = 0;
  ds.vendors.forEach(v => { v.color = vi < 8 ? `var(--c${vi + 1})` : 'var(--c-other)'; vi++; });
  ds.empty = ds.validCount === 0;
  return ds;
}

function rebuildData() {
  state.data = buildDataset(state.sources);
  MEMO.clear();
}

function ingestPayload(payload, { kind = 'agent', name = 'Agent' } = {}) {
  const v = validatePayload(payload);
  if (!v.ok) return v;
  const srcName = str((payload.source && payload.source.name) || name, 60) || name;
  const existing = state.sources.findIndex(x => x.name === srcName && x.kind === kind);
  const src = { id: uid(), name: srcName, kind, receivedAt: Date.now(), active: true, payload };
  if (existing >= 0) state.sources.splice(existing, 1, src);
  else {
    state.sources.push(src);
    if (state.sources.length > CONFIG.maxSources) state.sources.shift();
  }
  rebuildData();
  return { ok: true, errors: [], results: payload.results.length, source: src };
}

// ===== ANALYTICS =====
// Pure functions: they read state.data and never touch the DOM. Each KPI has exactly one function.
const MEMO = new Map();
function cached(key, fn) {
  const k = (state.data ? state.data.version : 0) + '|' + (state.settings.excludeSuspect ? 1 : 0) + '|' + key;
  if (MEMO.has(k)) return MEMO.get(k);
  const v = fn();
  MEMO.set(k, v);
  return v;
}
const hasData = () => !!(state.data && !state.data.empty);
const asOf = () => state.data.asOf;
const prevCut = () => state.data.asOf - CONFIG.compareDays * DAY;
const bench = id => state.data.benchmarks.get(id);
const model = id => state.data.models.get(id);
const vendorOf = m => state.data.vendors.get(m.vendor) || { id: m.vendor, name: m.vendor, color: 'var(--c-other)' };
const benchList = () => [...state.data.benchmarks.values()];

function blendedPrice(m) {
  const { input, output } = CONFIG.blend;
  if (!Number.isFinite(m.priceIn) || !Number.isFinite(m.priceOut)) return NaN;
  return (input * m.priceIn + output * m.priceOut) / (input + output);
}
function perfPerDollar(index, m) { const p = blendedPrice(m); return p > 0 && Number.isFinite(index) ? index / p : NaN; }

function rawSnapshot(cutoff) {
  return cached('raw' + cutoff, () => {
    const out = new Map();
    state.data.groups.forEach((g, k) => { const r = pickBest(g, cutoff); if (r) out.set(k, r); });
    return out;
  });
}
function snapshot(cutoff) {
  return cached('snap' + cutoff, () => {
    const raw = rawSnapshot(cutoff);
    if (!state.settings.excludeSuspect) return raw;
    const sus = anomalies().keys, out = new Map();
    raw.forEach((r, k) => { if (!sus.has(k)) out.set(k, r); });
    return out;
  });
}

// Robust outlier detection: per benchmark, regress each model's score on its mean over the other
// benchmarks, then flag residuals whose robust z-score (median / MAD) exceeds CONFIG.anomalyZ.
function anomalies() {
  return cached('anom', () => {
    const ds = state.data, snap = rawSnapshot(ds.asOf), keys = new Set(), list = [];
    const per = new Map();
    snap.forEach(r => {
      if (!per.has(r.modelId)) per.set(r.modelId, new Map());
      per.get(r.modelId).set(r.benchId, normScore(bench(r.benchId), r.score));
    });
    ds.benchmarks.forEach(b => {
      const xs = [], ys = [], ids = [];
      per.forEach((mp, mid) => {
        if (!mp.has(b.id)) return;
        const others = [];
        mp.forEach((v, k) => { if (k !== b.id) others.push(v); });
        if (others.length < 3) return;
        xs.push(mean(others)); ys.push(mp.get(b.id)); ids.push(mid);
      });
      if (xs.length < 6) return;
      const fit = linreg(xs, ys);
      if (!fit) return;
      const res = ys.map((y, i) => y - fit.predict(xs[i]));
      const med = median(res), mad = median(res.map(v => Math.abs(v - med)));
      if (!(mad > 0)) return;
      res.forEach((e, i) => {
        const z = 0.6745 * (e - med) / mad;
        if (Math.abs(z) >= CONFIG.anomalyZ) {
          const key = ids[i] + '|' + b.id;
          keys.add(key);
          list.push({ key, modelId: ids[i], benchId: b.id, z, residual: e, rec: snap.get(key) });
        }
      });
    });
    list.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
    return { keys, list };
  });
}

function modelIndexFrom(snap, modelId, weights) {
  let sw = 0, sv = 0, n = 0;
  state.data.benchmarks.forEach(b => {
    const r = snap.get(modelId + '|' + b.id), w = weights ? (weights[b.id] || 0) : 1;
    if (!r || w <= 0) return;
    sv += w * normScore(b, r.score); sw += w; n++;
  });
  return { value: sw > 0 ? sv / sw : NaN, count: n };
}
function isCurrentAt(m, cutoff) {
  for (const o of state.data.models.values()) {
    if (o !== m && o.vendor === m.vendor && o.family === m.family && o.release > m.release && o.release <= cutoff) return false;
  }
  return true;
}
function minRequired() { return Math.max(CONFIG.minBenchmarks, Math.ceil(CONFIG.minCoverage * state.data.benchmarks.size)); }
// Official ranking at a given date: tracked models of the current generation get a rank.
function ranking(cutoff) {
  return cached('rank' + cutoff, () => {
    const snap = snapshot(cutoff), rows = [];
    state.data.models.forEach(m => {
      if (Number.isFinite(m.release) && m.release > cutoff) return;
      const { value, count } = modelIndexFrom(snap, m.id, null);
      if (!count) return;
      rows.push({ model: m, index: value, count, tracked: count >= minRequired(), current: isCurrentAt(m, cutoff) });
    });
    rows.sort((a, b) => ((b.tracked && b.current) - (a.tracked && a.current)) || (b.index - a.index));
    let r = 0;
    rows.forEach(x => { x.rank = x.tracked && x.current ? ++r : null; });
    return rows;
  });
}
const ranked = cutoff => ranking(cutoff).filter(r => r.rank);
function rowOf(modelId, cutoff = asOf()) { return ranking(cutoff).find(r => r.model.id === modelId) || null; }

// --- KPI functions (single source of truth) ---
function kpiLeader(cutoff) { const r = ranked(cutoff)[0]; return r ? { model: r.model, value: r.index } : { model: null, value: NaN }; }
function kpiGap(cutoff) { const r = ranked(cutoff); return r.length > 1 ? r[0].index - r[1].index : NaN; }
function kpiBestValue(cutoff) {
  let best = { model: null, value: NaN };
  ranked(cutoff).forEach(r => { const v = perfPerDollar(r.index, r.model); if (Number.isFinite(v) && !(v <= best.value)) best = { model: r.model, value: v }; });
  return best;
}
function kpiRecords(from, to) { return recordsBetween(from, to).length; }
function kpiProgress(cutoff) {
  const pts = monthsAxis().filter(mo => mo.end <= cutoff).slice(-CONFIG.forecastWindow)
    .map(mo => ({ x: mo.i, y: kpiLeader(mo.end).value })).filter(p => Number.isFinite(p.y));
  const fit = linreg(pts.map(p => p.x), pts.map(p => p.y));
  return fit ? fit.slope : NaN;
}
function kpiTracked(cutoff) { return ranking(cutoff).filter(r => r.tracked).length; }

function monthsAxis() {
  return cached('axis', () => {
    let mn = Infinity;
    state.data.groups.forEach(g => g.forEach(r => { if (r.t < mn) mn = r.t; }));
    const end = state.data.asOf, e = new Date(end);
    const floor = Date.UTC(e.getUTCFullYear(), e.getUTCMonth() - 35, 1);
    return monthSeries(Math.max(Number.isFinite(mn) ? mn : end, floor), end);
  });
}

// State of the art for one benchmark (raw unit) or for the index, at a given date.
function sota(benchId, cutoff) {
  return cached('sota' + benchId + cutoff, () => {
    if (benchId === 'index') { const l = kpiLeader(cutoff); return { value: l.value, norm: l.value, modelId: l.model && l.model.id, rec: null }; }
    const b = bench(benchId);
    let best = null;
    snapshot(cutoff).forEach(r => {
      if (r.benchId !== benchId) return;
      const n = normScore(b, r.score);
      if (!best || n > best.norm) best = { value: r.score, norm: n, modelId: r.modelId, rec: r };
    });
    return best || { value: NaN, norm: NaN, modelId: null, rec: null };
  });
}
function recordsBetween(from, to) {
  const out = [];
  benchList().forEach(b => {
    const s1 = sota(b.id, to), s0 = sota(b.id, from);
    if (Number.isFinite(s1.norm) && (!Number.isFinite(s0.norm) || s1.norm > s0.norm + 1e-9)) {
      out.push({ bench: b, value: s1.value, prev: s0.value, delta: Number.isFinite(s0.norm) ? s1.value - s0.value : NaN, deltaNorm: Number.isFinite(s0.norm) ? s1.norm - s0.norm : s1.norm, modelId: s1.modelId, rec: s1.rec });
    }
  });
  return out.sort((a, b) => b.deltaNorm - a.deltaNorm);
}

function kpis() {
  return cached('kpis', () => {
    const now = asOf(), prev = prevCut();
    const axis = monthsAxis().slice(-12);
    const L = kpiLeader(now), Lp = kpiLeader(prev);
    const G = kpiGap(now), Gp = kpiGap(prev);
    const V = kpiBestValue(now), Vp = kpiBestValue(prev);
    const Rc = kpiRecords(prev, now);
    const P = kpiProgress(now), Pp = kpiProgress(prev);
    const T = kpiTracked(now), Tp = kpiTracked(prev);
    const sp = fn => axis.map(mo => fn(mo));
    const status = {
      leader: L.value - Lp.value > 0 ? 'good' : L.value - Lp.value < 0 ? 'bad' : '',
      gap: G >= CONFIG.leadGap.strong ? 'good' : G < CONFIG.leadGap.weak ? 'warn' : '',
      value: V.value > Vp.value ? 'good' : '',
      records: Rc > 0 ? 'good' : 'warn',
      progress: P >= CONFIG.progressGood ? 'good' : P > 0 ? 'warn' : 'bad',
      tracked: ''
    };
    return [
      { id: 'leader', value: L.value, d: 1, unit: 'pts', sub: L.model ? L.model.name : '—', delta: L.value - Lp.value, status: status.leader, spark: sp(mo => kpiLeader(mo.end).value) },
      { id: 'gap', value: G, d: 1, unit: 'pts', sub: G >= CONFIG.leadGap.strong ? 'Avance nette' : G < CONFIG.leadGap.weak ? 'Coude à coude' : 'Avance courte', delta: G - Gp, status: status.gap, spark: sp(mo => kpiGap(mo.end)) },
      { id: 'value', value: V.value, d: 1, unit: 'pts/$', sub: V.model ? V.model.name : '—', delta: V.value - Vp.value, status: status.value, spark: sp(mo => kpiBestValue(mo.end).value) },
      { id: 'records', value: Rc, d: 0, unit: '/ ' + state.data.benchmarks.size, sub: Rc ? 'benchmarks battus' : 'aucun record', delta: NaN, status: status.records, spark: axis.map((mo, i) => i === 0 ? NaN : kpiRecords(axis[i - 1].end, mo.end)), bars: true },
      { id: 'progress', value: P, d: 2, unit: 'pts/mois', sub: 'sur 12 mois', delta: P - Pp, status: status.progress, spark: sp(mo => kpiProgress(mo.end)) },
      { id: 'tracked', value: T, d: 0, unit: 'modèles', sub: `${ranked(now).length} au classement actuel`, delta: T - Tp, status: status.tracked, spark: sp(mo => kpiTracked(mo.end)) }
    ];
  });
}

// --- Rank change over the comparison window ---
function rankDelta(modelId) {
  const now = rowOf(modelId, asOf()), before = rowOf(modelId, prevCut());
  if (!now || !now.rank) return { kind: 'none' };
  if (!before || !before.rank) return { kind: 'new' };
  return { kind: 'move', value: before.rank - now.rank };
}

// --- Vendor race: best index per vendor per month ---
function vendorRace() {
  return cached('race', () => {
    const axis = monthsAxis(), out = new Map();
    state.data.vendors.forEach(v => out.set(v.id, { vendor: v, points: [] }));
    axis.forEach(mo => {
      const best = new Map();
      ranking(mo.end).forEach(r => { if (!r.tracked) return; const cur = best.get(r.model.vendor); if (cur == null || r.index > cur) best.set(r.model.vendor, r.index); });
      out.forEach((s, id) => s.points.push({ x: mo.i, t: mo.end, y: best.has(id) ? best.get(id) : NaN }));
    });
    return [...out.values()].filter(s => s.points.some(p => Number.isFinite(p.y)))
      .sort((a, b) => (b.points[b.points.length - 1].y || 0) - (a.points[a.points.length - 1].y || 0));
  });
}
// --- Record events credited to vendors over the whole axis ---
function recordShare() {
  return cached('share', () => {
    const axis = monthsAxis(), count = new Map();
    for (let i = 1; i < axis.length; i++) {
      recordsBetween(axis[i - 1].end, axis[i].end).forEach(r => {
        const m = model(r.modelId); if (!m) return;
        count.set(m.vendor, (count.get(m.vendor) || 0) + 1);
      });
    }
    return [...count].map(([id, n]) => ({ vendor: state.data.vendors.get(id), n })).sort((a, b) => b.n - a.n);
  });
}
// --- Record history for a benchmark or the index ---
function recordHistory(benchId) {
  const out = [];
  let last = -Infinity;
  monthsAxis().forEach(mo => {
    const s = sota(benchId, mo.end);
    if (Number.isFinite(s.norm) && s.norm > last + 1e-9) {
      out.push({ t: mo.end, value: s.value, modelId: s.modelId, verified: s.rec ? s.rec.verified : true });
      last = s.norm;
    }
  });
  return out;
}

// --- Pareto frontier. axis 'price': cheaper is better; 'speed': faster is better ---
function paretoFrontier(points, axis) {
  const pts = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  const sorted = [...pts].sort((a, b) => axis === 'price' ? (a.x - b.x || b.y - a.y) : (b.x - a.x || b.y - a.y));
  const f = []; let best = -Infinity;
  for (const p of sorted) if (p.y > best + 1e-9) { f.push(p); best = p.y; }
  return f;
}
function frontierPoints(axis) {
  return cached('front' + axis, () => {
    const pts = ranked(asOf()).map(r => ({
      key: r.model.id, label: r.model.name, model: r.model, y: r.index,
      x: axis === 'price' ? blendedPrice(r.model) : r.model.speed,
      r: r.model.contextK, ppd: perfPerDollar(r.index, r.model), color: vendorOf(r.model).color
    }));
    const front = paretoFrontier(pts, axis);
    return { pts, front, frontKeys: new Set(front.map(p => p.key)) };
  });
}

// --- Forecast: linear regression of the state of the art + 95 % prediction band ---
function forecast(benchId, threshold) {
  return cached('fc' + benchId + '|' + threshold, () => {
    const series = monthsAxis().map(mo => ({ x: mo.i, t: mo.end, y: sota(benchId, mo.end).value })).filter(p => Number.isFinite(p.y));
    if (series.length < 4) return { series, fit: null };
    const win = series.slice(-CONFIG.forecastWindow);
    const fit = linreg(win.map(p => p.x), win.map(p => p.y));
    if (!fit) return { series, fit: null };
    const tc = tCrit95(fit.n - 2), last = series[series.length - 1], proj = [];
    for (let k = 0; k <= CONFIG.forecastHorizon; k++) {
      const x = last.x + k, y = fit.predict(x), se = fit.s * Math.sqrt(1 + 1 / fit.n + ((x - fit.xb) ** 2) / fit.sxx);
      proj.push({ x, t: addMonthsEnd(last.t, k), y, lo: y - tc * se, hi: y + tc * se });
    }
    const cross = key => proj.find(p => p[key] >= threshold) || null;
    return { series, win, fit, proj, threshold, already: last.y >= threshold, eta: cross('y'), early: cross('hi'), late: cross('lo') };
  });
}
function defaultThreshold(benchId) {
  if (benchId === 'index') return CONFIG.forecastIndexThreshold;
  const b = bench(benchId), cur = sota(benchId, asOf()).value;
  const step = b.unit === 'Elo' ? 50 : 10;
  return Math.min(b.scaleMax, Math.ceil(((Number.isFinite(cur) ? cur : b.scaleMin) + step) / step) * step);
}
function thresholdFor(benchId) { const t = state.settings.thresholds[benchId]; return Number.isFinite(t) ? t : defaultThreshold(benchId); }

// --- Reliability score per model and globally ---
function reliability() {
  return cached('rel', () => {
    const ds = state.data, snap = rawSnapshot(ds.asOf), an = anomalies(), per = new Map();
    ds.models.forEach(m => {
      let n = 0, unver = 0, conf = 0, sus = 0, miss = 0;
      ds.benchmarks.forEach(b => {
        const k = m.id + '|' + b.id, r = snap.get(k);
        if (!r) { miss++; return; }
        n++; if (!r.verified) unver++; if (ds.conflictKeys.has(k)) conf++; if (an.keys.has(k)) sus++;
      });
      per.set(m.id, { score: n ? clamp(100 - 30 * (unver / n) - 12 * conf - 18 * sus - 3 * miss, 0, 100) : 0, n, unver, conf, sus, miss });
    });
    const cur = ranked(ds.asOf).map(r => per.get(r.model.id).score);
    let verified = 0, total = 0;
    snap.forEach(r => { total++; if (r.verified) verified++; });
    return { per, global: mean(cur), verifiedShare: total ? verified / total * 100 : NaN, total };
  });
}
function relStatus(v) { return v >= CONFIG.reliability.good ? 'good' : v >= CONFIG.reliability.warn ? 'warn' : 'bad'; }

function qualityCounts() {
  return cached('qc', () => {
    const c = { invalid: 0, conflict: 0, missing: 0, suspect: anomalies().list.length };
    state.data.issues.forEach(i => { c[i.type] = (c[i.type] || 0) + 1; });
    return c;
  });
}
function qualityLog() {
  return cached('qlog', () => {
    const ds = state.data;
    const sus = anomalies().list.map(a => {
      const b = bench(a.benchId), r = a.rec;
      return { type: 'suspect', src: r ? r.srcName : '—', path: 'results', row: r ? r.row : '—', model: a.modelId, bench: a.benchId,
        msg: `Score de ${fmtScore(b, r.score)}${unitOf(b)} très éloigné du niveau attendu (z robuste ${fmtSigned(a.z, 1)}). ${r.verified ? '' : 'Non vérifié. '}${r.note ? '« ' + r.note + ' »' : ''}`.trim() };
    });
    const order = { invalid: 0, suspect: 1, conflict: 2, missing: 3 };
    return [...sus, ...ds.issues].sort((a, b) => order[a.type] - order[b.type]);
  });
}

// --- Personal scenario scoring (does not change the Octant index) ---
function scenarioScores(w) {
  const rows = ranked(asOf()), snap = snapshot(asOf());
  const perCat = {};
  benchList().forEach(b => { perCat[b.category] = (perCat[b.category] || 0) + 1; });
  const prices = rows.map(r => blendedPrice(r.model)).filter(v => v > 0), speeds = rows.map(r => r.model.speed).filter(Number.isFinite);
  const lpMin = Math.log(Math.min(...prices)), lpMax = Math.log(Math.max(...prices));
  const sMin = Math.min(...speeds), sMax = Math.max(...speeds);
  return rows.map(r => {
    let sw = 0, sv = 0;
    benchList().forEach(b => {
      const rec = snap.get(r.model.id + '|' + b.id), wb = (w[b.category] || 0) / perCat[b.category];
      if (!rec || wb <= 0) return;
      sv += wb * normScore(b, rec.score); sw += wb;
    });
    const p = blendedPrice(r.model);
    if (w.cost > 0 && p > 0 && lpMax > lpMin) { sv += w.cost * 100 * (1 - (Math.log(p) - lpMin) / (lpMax - lpMin)); sw += w.cost; }
    if (w.speed > 0 && Number.isFinite(r.model.speed) && sMax > sMin) { sv += w.speed * 100 * (r.model.speed - sMin) / (sMax - sMin); sw += w.speed; }
    return { model: r.model, score: sw > 0 ? sv / sw : NaN, index: r.index };
  }).filter(x => Number.isFinite(x.score)).sort((a, b) => b.score - a.score);
}
function activeScenario() { return state.scenarios.find(s => s.id === state.activeScenario) || state.scenarios[0]; }

// --- "Ce qui a bougé": generated sentences ranked by magnitude ---
function movers() {
  return cached('movers', () => {
    const now = asOf(), prev = prevCut(), out = [];
    const R = ranked(now), Rp = ranked(prev);
    const N = s => `<b>${esc(s)}</b>`, V = (v, d = 1) => `<span class="num">${esc(fmt(v, d))}</span>`;
    if (R.length) {
      const top = R[0], second = R[1], prevTop = Rp[0];
      if (prevTop && prevTop.model.id !== top.model.id) {
        out.push({ ico: '1', mag: 100, html: `${N(top.model.name)} prend la tête de l’indice Octant (${V(top.index)})${second ? `, devant ${N(second.model.name)} de ${V(top.index - second.index)} pt` : ''}. Il détrône ${N(prevTop.model.name)}.` });
      } else if (second) {
        out.push({ ico: '1', mag: 20 + (top.index - second.index) * 4, html: `${N(top.model.name)} conserve la tête de l’indice Octant (${V(top.index)}) avec ${V(top.index - second.index)} pt d’avance sur ${N(second.model.name)}.` });
      }
    }
    recordsBetween(prev, now).slice(0, 2).forEach(r => {
      const m = model(r.modelId);
      out.push({ ico: '★', mag: 40 + r.deltaNorm * 4, html: `Nouveau record sur ${N(r.bench.name)} : ${V(r.value, r.bench.unit === 'Elo' ? 0 : 1)}${esc(unitOf(r.bench))} par ${N(m ? m.name : '?')}${Number.isFinite(r.delta) ? `, ${esc(fmtSigned(r.delta, r.bench.unit === 'Elo' ? 0 : 1))} pts sur le précédent record` : ''}${r.rec && !r.rec.verified ? ' <span class="tag warn">non vérifié</span>' : ''}.` });
    });
    let climber = null;
    R.forEach(r => {
      const d = rankDelta(r.model.id);
      if (r.rank === 1 && Rp[0] && Rp[0].model.id !== r.model.id) return;
      if (d.kind === 'new' && r.rank <= 5) { const mag = 30 + (6 - r.rank) * 6; if (!climber || mag > climber.mag) climber = { mag, html: `${N(r.model.name)} entre directement à la ${ordinal(r.rank)} place du classement.` }; }
      if (d.kind === 'move' && d.value >= 2) { const mag = 20 + d.value * 6; if (!climber || mag > climber.mag) climber = { mag, html: `${N(r.model.name)} gagne ${V(d.value, 0)} places et pointe au ${ordinal(r.rank, true)} rang.` }; }
    });
    if (climber) out.push({ ico: '↑', ...climber });
    const bv = kpiBestValue(now);
    const top5 = R.slice(0, 5).map(r => perfPerDollar(r.index, r.model)).filter(Number.isFinite);
    if (bv.model && top5.length) {
      const ratio = bv.value / mean(top5);
      if (ratio > 1.2) out.push({ ico: '$', mag: 15 + ratio * 3, html: `${N(bv.model.name)} délivre ${V(ratio)}× plus d’indice par dollar que la moyenne du top 5.` });
    }
    const q = qualityCounts(), flagged = q.suspect + q.conflict;
    if (flagged) out.push({ ico: '!', mag: 25 + flagged * 6, html: `${V(q.suspect, 0)} résultat${q.suspect > 1 ? 's' : ''} suspect${q.suspect > 1 ? 's' : ''} et ${V(q.conflict, 0)} conflit${q.conflict > 1 ? 's' : ''} de sources à vérifier dans <b>Flux</b>.` });
    const p = kpiProgress(now);
    if (Number.isFinite(p)) out.push({ ico: '↗', mag: 10 + Math.abs(p) * 8, html: `L’état de l’art progresse de ${V(p, 2)} pt par mois sur les 12 derniers mois.` });
    return out.sort((a, b) => b.mag - a.mag).slice(0, 5);
  });
}
function ordinal(n, masc) { return `<span class="num">${n}</span><sup>${n === 1 ? (masc ? 'er' : 're') : 'e'}</sup>`; }
function plainText(html) { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); }

function duelVerdict(ids) {
  const snap = snapshot(asOf()), ms = ids.map(model).filter(Boolean), out = [];
  if (ms.length < 2) return out;
  const [a, b] = ms;
  let wa = 0, wb = 0, common = 0;
  benchList().forEach(bm => {
    const ra = snap.get(a.id + '|' + bm.id), rb = snap.get(b.id + '|' + bm.id);
    if (!ra || !rb) return;
    common++;
    const na = normScore(bm, ra.score), nb = normScore(bm, rb.score);
    if (na > nb) wa++; else if (nb > na) wb++;
  });
  if (common) {
    const lead = wa >= wb ? a : b, n = Math.max(wa, wb), other = lead === a ? b : a;
    out.push(`<b>${esc(lead.name)}</b> devance <b>${esc(other.name)}</b> sur <span class="num">${n}</span> des <span class="num">${common}</span> benchmarks communs.`);
  }
  const pa = blendedPrice(a), pb = blendedPrice(b);
  if (pa > 0 && pb > 0 && Math.abs(pa - pb) / Math.max(pa, pb) > 0.05) {
    const cheap = pa < pb ? a : b, ratio = Math.max(pa, pb) / Math.min(pa, pb);
    out.push(`<b>${esc(cheap.name)}</b> coûte <span class="num">${esc(fmt(ratio))}×</span> moins cher par token (prix mixte).`);
  }
  const fastest = [...ms].sort((x, y) => (y.speed || 0) - (x.speed || 0))[0];
  if (Number.isFinite(fastest.speed)) out.push(`<b>${esc(fastest.name)}</b> est le plus rapide : <span class="num">${esc(fmt(fastest.speed, 0))}</span> tokens/s.`);
  const vals = ms.map(m => ({ m, v: perfPerDollar((rowOf(m.id) || {}).index, m) })).filter(x => Number.isFinite(x.v)).sort((x, y) => y.v - x.v);
  if (vals.length) out.push(`Meilleur rapport indice/prix : <b>${esc(vals[0].m.name)}</b> (<span class="num">${esc(fmt(vals[0].v))}</span> pts/$).`);
  return out;
}

// ===== CHARTS =====
// Hand-drawn SVG charts. Every chart: aria-label, tooltip, clickable legend (when multi-series), data table.
const CHARTS = new Map();
function chartWidth(el) { const w = el.clientWidth || (el.parentElement && el.parentElement.clientWidth) || 340; return Math.max(260, Math.round(w)); }
function isHidden(id, key) { return (state.hidden[id] || []).includes(key); }
function toggleHidden(id, key) {
  const a = state.hidden[id] || (state.hidden[id] = []);
  const i = a.indexOf(key);
  if (i >= 0) a.splice(i, 1); else a.push(key);
  scheduleSave();
}
function renderLegend(id, items) {
  const el = document.getElementById('lg-' + id);
  if (!el) return;
  el.textContent = '';
  items.forEach(it => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(!isHidden(id, it.key)));
    b.setAttribute('aria-label', `${isHidden(id, it.key) ? 'Afficher' : 'Masquer'} la série ${it.label}`);
    const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = it.color;
    b.append(sw, document.createTextNode(it.label));
    b.addEventListener('click', () => { toggleHidden(id, it.key); const fn = CHARTS.get(id); if (fn) fn(); });
    el.append(b);
  });
}
function renderDataTable(id, headers, rows, numCols = []) {
  const el = document.getElementById('tbl-' + id);
  if (!el) return;
  el.textContent = '';
  const wrap = document.createElement('div'); wrap.className = 'table-wrap';
  const t = document.createElement('table'), th = document.createElement('thead'), tb = document.createElement('tbody'), tr = document.createElement('tr');
  headers.forEach((hd, i) => { const c = document.createElement('th'); c.scope = 'col'; c.textContent = hd; if (numCols.includes(i)) c.className = 'n'; tr.append(c); });
  th.append(tr);
  rows.forEach(r => { const row = document.createElement('tr'); r.forEach((v, i) => { const c = document.createElement('td'); c.textContent = v; if (numCols.includes(i)) c.className = 'n'; row.append(c); }); tb.append(row); });
  t.append(th, tb); wrap.append(t); el.append(wrap);
}
function setEmpty(el, title, text) { el.innerHTML = `<div class="empty"><b>${esc(title)}</b>${esc(text)}</div>`; }
function finishDraw(svg) { svg.querySelectorAll('.draw').forEach(p => { try { p.style.setProperty('--len', Math.ceil(p.getTotalLength()) + 1); } catch (e) { p.classList.remove('draw'); } }); }
function svgPoint(svg, evt, W) { const r = svg.getBoundingClientRect(); return { x: (evt.clientX - r.left) * W / r.width, y: (evt.clientY - r.top) * (svg.viewBox.baseVal.height / r.height) }; }

// --- Tooltip ---
function showTip(x, y, title, rows) {
  const el = $('#tooltip');
  el.textContent = '';
  const t = document.createElement('div'); t.className = 'tt-t'; t.textContent = title; el.append(t);
  rows.forEach(r => {
    const d = document.createElement('div'); d.className = 'tt-r';
    const l = document.createElement('span'); l.style.cssText = 'display:inline-flex;align-items:center;gap:6px';
    if (r.color) { const sw = document.createElement('i'); sw.className = 'vdot'; sw.style.background = r.color; l.append(sw); }
    l.append(document.createTextNode(r.label));
    const v = document.createElement('span'); v.textContent = r.value;
    d.append(l, v); el.append(d);
  });
  el.classList.add('on');
  const w = el.offsetWidth, h = el.offsetHeight;
  let left = x + 14, top = y - h - 14;
  if (left + w > innerWidth - 8) left = x - w - 14;
  if (left < 8) left = 8;
  if (top < 8) top = y + 18;
  el.style.left = left + 'px'; el.style.top = top + 'px';
}
function hideTip() { const el = $('#tooltip'); if (el) el.classList.remove('on'); }

// --- Sparkline (KPI cards) ---
function sparkline(values, color, bars) {
  const W = 100, H = 30, n = values.length;
  const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', width: '100%', height: 30, 'aria-hidden': 'true' });
  const vals = values.filter(Number.isFinite);
  if (vals.length < 2) return svg;
  if (bars) {
    const mx = Math.max(1, ...vals), bw = W / n * 0.56;
    values.forEach((v, i) => {
      if (!Number.isFinite(v)) return;
      const hgt = Math.max(1.5, v / mx * (H - 4));
      svg.append(S('rect', { x: (i + .5) / n * W - bw / 2, y: H - hgt, width: bw, height: hgt, rx: 1, style: `fill:${color};opacity:${i === n - 1 ? 1 : .45}` }));
    });
    return svg;
  }
  let mn = Math.min(...vals), mx = Math.max(...vals);
  if (mn === mx) { mn -= 1; mx += 1; }
  const X = i => i / (n - 1) * W, Y = v => H - 3 - (v - mn) / (mx - mn) * (H - 6);
  let d = '', first = null, last = null;
  values.forEach((v, i) => { if (!Number.isFinite(v)) return; d += (d ? 'L' : 'M') + X(i).toFixed(2) + ' ' + Y(v).toFixed(2); if (first == null) first = i; last = i; });
  const gid = 'sg' + uid();
  svg.append(S('defs', null, S('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, S('stop', { offset: 0, style: `stop-color:${color};stop-opacity:.35` }), S('stop', { offset: 1, style: `stop-color:${color};stop-opacity:0` }))));
  svg.append(S('path', { d: `${d}L${X(last).toFixed(2)} ${H}L${X(first).toFixed(2)} ${H}Z`, fill: `url(#${gid})` }));
  svg.append(S('path', { d, fill: 'none', style: `stroke:${color}`, 'stroke-width': 1.6, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  return svg;
}

// --- Line chart (time series, optional band, threshold, projection) ---
function lineChart(id, opt) {
  const host = document.getElementById('ch-' + id);
  if (!host) return;
  const render = () => {
    host.textContent = '';
    const series = opt.series.filter(sr => !isHidden(id, sr.key));
    const W = chartWidth(host), H = opt.height || 220, m = { t: 16, r: 18, b: 28, l: opt.left || 38 };
    const ys = [], xsAll = new Set();
    series.forEach(sr => sr.points.forEach(p => { if (Number.isFinite(p.y)) { ys.push(p.y); xsAll.add(p.x); } }));
    if (opt.band) opt.band.forEach(p => { ys.push(p.lo, p.hi); xsAll.add(p.x); });
    if (opt.hline) ys.push(opt.hline.y);
    if (!ys.length) { setEmpty(host, 'Aucune série visible', 'Réactivez une série dans la légende ci-dessous.'); return; }
    const xVals = [...xsAll].sort((a, b) => a - b);
    const x0 = opt.xDomain ? opt.xDomain[0] : xVals[0], x1 = opt.xDomain ? opt.xDomain[1] : xVals[xVals.length - 1];
    let y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (opt.yMin != null) y0 = Math.min(y0, opt.yMin);
    if (opt.yMax != null) y1 = Math.max(y1, opt.yMax);
    const pad = (y1 - y0) * 0.06 || 1;
    const nt = niceTicks(y0 - pad, y1 + pad, 4);
    const sx = x => m.l + (x - x0) / ((x1 - x0) || 1) * (W - m.l - m.r);
    const sy = y => m.t + (1 - (y - nt.lo) / ((nt.hi - nt.lo) || 1)) * (H - m.t - m.b);
    const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': opt.aria });
    const defs = S('defs');
    svg.append(defs);
    nt.ticks.forEach(t => {
      svg.append(S('line', { x1: m.l, x2: W - m.r, y1: sy(t), y2: sy(t), class: 'gridline' }));
      svg.append(S('text', { x: m.l - 6, y: sy(t) + 3, 'text-anchor': 'end', text: opt.yFmt ? opt.yFmt(t) : fmt(t, 0) }));
    });
    const ticks = opt.xTicks || (() => {
      const n = Math.min(W < 360 ? 4 : 5, xVals.length), out = [];
      for (let i = 0; i < n; i++) {
        const target = x0 + i * (x1 - x0) / Math.max(1, n - 1);
        let v = xVals[0]; xVals.forEach(q => { if (Math.abs(q - target) < Math.abs(v - target)) v = q; });
        if (!out.some(o => o.x === v)) out.push({ x: v, label: opt.xLabel ? opt.xLabel(v) : String(v) });
      }
      return out;
    })();
    ticks.forEach((tk, i) => svg.append(S('text', { x: sx(tk.x), y: H - 8, 'text-anchor': i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle', text: tk.label })));
    if (opt.band && opt.band.length > 1) {
      const top = opt.band.map((p, i) => (i ? 'L' : 'M') + sx(p.x).toFixed(1) + ' ' + sy(p.hi).toFixed(1)).join('');
      const bot = [...opt.band].reverse().map(p => 'L' + sx(p.x).toFixed(1) + ' ' + sy(p.lo).toFixed(1)).join('');
      svg.append(S('path', { d: top + bot + 'Z', class: 'fadein', style: `fill:${opt.bandColor || 'var(--accent)'};fill-opacity:.14` }));
      svg.append(S('path', { d: top, fill: 'none', style: `stroke:${opt.bandColor || 'var(--accent)'};stroke-opacity:.4`, 'stroke-dasharray': '2 3', 'stroke-width': 1 }));
      svg.append(S('path', { d: [...opt.band].map((p, i) => (i ? 'L' : 'M') + sx(p.x).toFixed(1) + ' ' + sy(p.lo).toFixed(1)).join(''), fill: 'none', style: `stroke:${opt.bandColor || 'var(--accent)'};stroke-opacity:.4`, 'stroke-dasharray': '2 3', 'stroke-width': 1 }));
    }
    if (opt.hline) {
      const yy = sy(opt.hline.y);
      svg.append(S('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, style: 'stroke:var(--warn)', 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }));
      svg.append(S('text', { x: W - m.r, y: yy - 5, 'text-anchor': 'end', style: 'fill:var(--warn);font-weight:600', text: opt.hline.label }));
    }
    if (opt.split != null) {
      const xx = sx(opt.split);
      svg.append(S('line', { x1: xx, x2: xx, y1: m.t, y2: H - m.b, style: 'stroke:var(--line-2)', 'stroke-dasharray': '3 3' }));
      svg.append(S('text', { x: xx + 4, y: m.t + 8, text: 'projection' }));
    }
    series.forEach(sr => {
      const pts = sr.points.filter(p => Number.isFinite(p.y));
      if (!pts.length) return;
      let d = '', prev = null;
      sr.points.forEach(p => {
        if (!Number.isFinite(p.y)) { prev = null; return; }
        const X = sx(p.x).toFixed(1), Y = sy(p.y).toFixed(1);
        if (!prev) d += `M${X} ${Y}`;
        else if (sr.step) d += `H${X}V${Y}`;
        else d += `L${X} ${Y}`;
        prev = p;
      });
      if (sr.area) {
        const gid = `g-${id}-${sr.key}`.replace(/[^\w-]/g, '');
        defs.append(S('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, S('stop', { offset: 0, style: `stop-color:${sr.color};stop-opacity:.30` }), S('stop', { offset: 1, style: `stop-color:${sr.color};stop-opacity:0` })));
        const f = pts[0], l = pts[pts.length - 1];
        svg.append(S('path', { d: `${d}L${sx(l.x).toFixed(1)} ${sy(nt.lo)}L${sx(f.x).toFixed(1)} ${sy(nt.lo)}Z`, fill: `url(#${gid})`, class: 'fadein' }));
      }
      if (sr.glow) svg.append(S('path', { d, fill: 'none', style: `stroke:${sr.color};opacity:.18`, 'stroke-width': 7, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      svg.append(S('path', { d, fill: 'none', class: sr.dashed ? 'fadein' : 'draw', style: `stroke:${sr.color}`, 'stroke-width': sr.width || 2, 'stroke-dasharray': sr.dashed ? '6 5' : null, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      if (!sr.noDot) {
        const l = pts[pts.length - 1];
        svg.append(S('circle', { cx: sx(l.x), cy: sy(l.y), r: 7, style: `fill:${sr.color};fill-opacity:.18`, class: 'pop' }));
        svg.append(S('circle', { cx: sx(l.x), cy: sy(l.y), r: 3.4, style: `fill:${sr.color}`, class: 'pop' }));
      }
    });
    (opt.markers || []).forEach(mk => {
      if (!Number.isFinite(mk.y)) return;
      svg.append(S('circle', { cx: sx(mk.x), cy: sy(mk.y), r: 9, style: `fill:none;stroke:${mk.color};stroke-opacity:.5`, class: 'pop' }));
      svg.append(S('circle', { cx: sx(mk.x), cy: sy(mk.y), r: 4, style: `fill:${mk.color}`, class: 'pop' }));
    });
    const cross = S('line', { y1: m.t, y2: H - m.b, style: 'stroke:var(--ink-3);opacity:0', 'stroke-width': 1 });
    svg.append(cross);
    const ov = S('rect', { x: m.l, y: 0, width: W - m.l - m.r, height: H, fill: 'transparent', style: 'cursor:crosshair;touch-action:pan-y' });
    const move = e => {
      const p = svgPoint(svg, e, W);
      const xv = x0 + (p.x - m.l) / (W - m.l - m.r) * (x1 - x0);
      let best = xVals[0];
      xVals.forEach(v => { if (Math.abs(v - xv) < Math.abs(best - xv)) best = v; });
      cross.setAttribute('x1', sx(best)); cross.setAttribute('x2', sx(best)); cross.style.opacity = '.55';
      const rows = [];
      series.forEach(sr => { const pt = sr.points.find(q => q.x === best); if (pt && Number.isFinite(pt.y)) rows.push({ color: sr.color, label: sr.label, value: (opt.tipFmt || opt.yFmt || (v => fmt(v, 1)))(pt.y) }); });
      if (opt.band) { const b = opt.band.find(q => q.x === best); if (b) rows.push({ label: 'Bande 95 %', value: `${(opt.tipFmt || opt.yFmt || (v => fmt(v, 1)))(b.lo)} – ${(opt.tipFmt || opt.yFmt || (v => fmt(v, 1)))(b.hi)}` }); }
      if (rows.length) showTip(e.clientX, e.clientY, opt.tipTitle ? opt.tipTitle(best) : String(best), rows.sort((a, b) => parseFloat(String(b.value).replace(/[^\d,-]/g, '').replace(',', '.')) - parseFloat(String(a.value).replace(/[^\d,-]/g, '').replace(',', '.'))));
    };
    ov.addEventListener('pointermove', move);
    ov.addEventListener('pointerdown', move);
    ov.addEventListener('pointerleave', () => { cross.style.opacity = '0'; hideTip(); });
    svg.append(ov);
    host.append(svg);
    finishDraw(svg);
  };
  const full = () => { render(); if (opt.legend) renderLegend(id, opt.series.map(sr => ({ key: sr.key, label: sr.label, color: sr.color }))); };
  CHARTS.set(id, full);
  full();
  if (opt.table) renderDataTable(id, opt.table.headers, opt.table.rows, opt.table.num);
}

// --- Podium (top 3) ---
function podiumChart(id, rows) {
  const host = document.getElementById('ch-' + id);
  if (!host) return;
  const render = () => {
    host.textContent = '';
    if (!rows.length) { setEmpty(host, 'Pas encore de classement', 'Chargez des données dans Flux.'); return; }
    const W = chartWidth(host), H = 176, colW = Math.min(110, W / 3 - 14), order = [1, 0, 2], heights = [118, 92, 74];
    const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Podium : ' + rows.map((r, i) => `${i + 1}. ${r.model.name} ${fmt(r.index)}`).join(', ') });
    const defs = S('defs'); svg.append(defs);
    order.forEach((ri, slot) => {
      const r = rows[ri];
      if (!r) return;
      const cx = W / 6 + slot * W / 3, x = cx - colW / 2, hgt = heights[ri], y = H - hgt, color = vendorOf(r.model).color;
      const gid = `pod-${id}-${ri}`;
      defs.append(S('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, S('stop', { offset: 0, style: `stop-color:${color};stop-opacity:.55` }), S('stop', { offset: 1, style: `stop-color:${color};stop-opacity:.02` })));
      const g = S('g', { class: 'growy', style: `animation-delay:${slot * 90}ms` });
      g.append(S('path', { d: `M${x} ${H}V${y + 12}Q${x} ${y} ${x + 12} ${y}H${x + colW - 12}Q${x + colW} ${y} ${x + colW} ${y + 12}V${H}Z`, fill: `url(#${gid})`, style: `stroke:${color};stroke-opacity:.35` }));
      g.append(S('line', { x1: x + 10, x2: x + colW - 10, y1: y + .5, y2: y + .5, style: `stroke:${color}`, 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
      g.append(S('text', { x: cx, y: y + 46, 'text-anchor': 'middle', style: `font-family:var(--font-display);font-size:${ri === 0 ? 34 : 26}px;font-weight:600;fill:${color};fill-opacity:.9`, text: String(ri + 1) }));
      svg.append(g);
      svg.append(S('text', { x: cx, y: y - 10, 'text-anchor': 'middle', class: 'pop', style: `font-size:${ri === 0 ? 15 : 13}px;font-weight:600;fill:var(--ink)`, text: fmt(r.index) }));
      if (ri === 0) svg.append(S('circle', { cx, cy: y - 34, r: 3, style: `fill:${color}`, class: 'pop' }));
    });
    host.append(svg);
    const names = document.createElement('div'); names.className = 'podium-names';
    order.forEach(ri => {
      const r = rows[ri], d = document.createElement('div');
      if (r) { d.textContent = r.model.name; const sm = document.createElement('small'); sm.textContent = vendorOf(r.model).name; d.append(sm); }
      names.append(d);
    });
    host.append(names);
  };
  CHARTS.set(id, render);
  render();
  renderDataTable(id, ['Rang', 'Modèle', 'Éditeur', 'Indice'], rows.map((r, i) => [String(i + 1), r.model.name, vendorOf(r.model).name, fmt(r.index)]), [0, 3]);
}

// --- Donut ---
function donutChart(id, { items, center, centerSub }) {
  const host = document.getElementById('ch-' + id);
  if (!host) return;
  const render = () => {
    host.textContent = '';
    const vis = items.filter(it => !isHidden(id, it.key) && it.value > 0);
    const total = sum(vis.map(it => it.value));
    const W = chartWidth(host), H = 196, cx = W / 2, cy = H / 2, r = 72, sw = 18, C = 2 * Math.PI * r;
    const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': items.map(it => `${it.label} ${it.value}`).join(', ') });
    svg.append(S('circle', { cx, cy, r, fill: 'none', style: 'stroke:var(--track)', 'stroke-width': sw }));
    let off = 0;
    vis.forEach((it, i) => {
      const len = it.value / total * C;
      const arc = S('circle', { cx, cy, r, fill: 'none', style: `stroke:${it.color};cursor:pointer`, 'stroke-width': sw, 'stroke-dasharray': `${Math.max(0, len - 2.5)} ${C}`, 'stroke-dashoffset': -off, transform: `rotate(-90 ${cx} ${cy})`, class: 'fadein', tabindex: 0, 'aria-label': `${it.label} : ${it.value}` });
      arc.style.animationDelay = i * 60 + 'ms';
      const tip = e => showTip(e.clientX || (e.target.getBoundingClientRect().left + 20), e.clientY || (e.target.getBoundingClientRect().top + 20), it.label, [{ color: it.color, label: 'Records', value: `${it.value} · ${fmt(it.value / total * 100, 0)} %` }]);
      arc.addEventListener('pointerdown', tip); arc.addEventListener('pointermove', tip); arc.addEventListener('pointerleave', hideTip);
      arc.addEventListener('focus', tip); arc.addEventListener('blur', hideTip);
      svg.append(arc);
      off += len;
    });
    svg.append(S('circle', { cx, cy, r: r - sw / 2 - 6, fill: 'none', style: 'stroke:var(--line)', 'stroke-dasharray': '2 4' }));
    svg.append(S('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', style: 'font-size:26px;font-weight:600;fill:var(--ink)', text: center(total) }));
    svg.append(S('text', { x: cx, y: cy + 22, 'text-anchor': 'middle', class: 'lbl', style: 'font-size:10.5px', text: centerSub }));
    host.append(svg);
  };
  const full = () => { render(); renderLegend(id, items.map(it => ({ key: it.key, label: `${it.label} · ${it.value}`, color: it.color }))); };
  CHARTS.set(id, full);
  full();
  renderDataTable(id, ['Éditeur', 'Records battus', 'Part'], items.map(it => [it.label, String(it.value), fmt(it.value / (sum(items.map(x => x.value)) || 1) * 100, 1) + ' %']), [1, 2]);
}

// --- Heatmap (models × benchmarks, normalized) ---
function heatmap(id, { rows, cols, cell, aria }) {
  const host = document.getElementById('ch-' + id);
  if (!host) return;
  const render = () => {
    host.textContent = '';
    if (!rows.length) { setEmpty(host, 'Aucun modèle', 'Aucun modèle ne correspond aux filtres.'); return; }
    const avail = chartWidth(host), labelW = 104, cw = Math.max(42, Math.floor((avail - labelW) / cols.length)), ch = 30, top = 26;
    const W = labelW + cw * cols.length, H = top + ch * rows.length + 4;
    const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': aria, style: `width:${W}px;max-width:none` });
    cols.forEach((c, j) => svg.append(S('text', { x: labelW + j * cw + cw / 2, y: 14, 'text-anchor': 'middle', class: 'lbl', style: 'font-size:9px', text: c.label.length > 8 ? c.label.slice(0, 7) + '…' : c.label })));
    rows.forEach((r, i) => {
      const y = top + i * ch;
      const lbl = r.label.length > 15 ? r.label.slice(0, 14) + '…' : r.label;
      svg.append(S('circle', { cx: 5, cy: y + ch / 2, r: 3.5, style: `fill:${r.color}` }));
      svg.append(S('text', { x: 14, y: y + ch / 2 + 3.5, class: 'lbl', style: 'font-size:11px', text: lbl }));
      cols.forEach((c, j) => {
        const v = cell(r.key, c.key), x = labelW + j * cw;
        const g = S('g', { class: 'fadein', style: `animation-delay:${(i * cols.length + j) * 6}ms;cursor:pointer` });
        if (!v) {
          g.append(S('rect', { x: x + 2, y: y + 2, width: cw - 4, height: ch - 4, rx: 7, fill: 'none', style: 'stroke:var(--line-2)', 'stroke-dasharray': '3 3' }));
          g.append(S('text', { x: x + cw / 2, y: y + ch / 2 + 3.5, 'text-anchor': 'middle', text: '—' }));
        } else {
          g.append(S('rect', { x: x + 2, y: y + 2, width: cw - 4, height: ch - 4, rx: 7, style: `fill:var(--heat-1);fill-opacity:${(0.06 + 0.86 * Math.pow(v.n / 100, 1.6)).toFixed(3)}` }));
          g.append(S('text', { x: x + cw / 2, y: y + ch / 2 + 3.5, 'text-anchor': 'middle', style: `font-size:10px;font-weight:600;fill:${v.n > 66 ? 'var(--on-accent)' : 'var(--ink-2)'}`, text: v.display }));
          if (v.flag) g.append(S('circle', { cx: x + cw - 7, cy: y + 7, r: 2.6, style: 'fill:var(--warn)' }));
        }
        const tip = e => showTip(e.clientX, e.clientY, `${r.label} · ${c.full}`, v ? [{ label: 'Score', value: v.raw }, { label: 'Normalisé', value: fmt(v.n, 0) + ' / 100' }, ...(v.flag ? [{ label: 'Attention', value: v.flag }] : [])] : [{ label: 'Score', value: 'non mesuré' }]);
        g.addEventListener('pointerdown', tip); g.addEventListener('pointermove', tip); g.addEventListener('pointerleave', hideTip);
        svg.append(g);
      });
    });
    host.append(svg);
  };
  CHARTS.set(id, render);
  render();
}

// --- Radar ---
function radarChart(id, { axes, series, aria }) {
  const host = document.getElementById('ch-' + id);
  if (!host) return;
  const render = () => {
    host.textContent = '';
    const vis = series.filter(sr => !isHidden(id, sr.key));
    const W = chartWidth(host), H = Math.min(W, 320), cx = W / 2, cy = H / 2 + 4, R = Math.min(W, H) / 2 - 42, n = axes.length;
    const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
    const P = (i, v) => [cx + Math.cos(ang(i)) * R * v / 100, cy + Math.sin(ang(i)) * R * v / 100];
    const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': aria });
    [25, 50, 75, 100].forEach(lv => {
      svg.append(S('polygon', { points: axes.map((_, i) => P(i, lv).map(v => v.toFixed(1)).join(',')).join(' '), fill: lv === 100 ? 'var(--chip)' : 'none', style: 'stroke:var(--grid)' }));
    });
    axes.forEach((a, i) => {
      const [x, y] = P(i, 100), [lx, ly] = P(i, 118), c = Math.cos(ang(i));
      svg.append(S('line', { x1: cx, y1: cy, x2: x, y2: y, style: 'stroke:var(--grid)' }));
      svg.append(S('text', { x: lx, y: ly + 3, 'text-anchor': Math.abs(c) < 0.2 ? 'middle' : c > 0 ? 'start' : 'end', class: 'lbl', style: 'font-size:10.5px', text: a.label }));
    });
    svg.append(S('text', { x: cx + 3, y: cy - R * .5 + 3, style: 'font-size:8.5px', text: '50' }));
    vis.forEach((sr, si) => {
      const pts = axes.map((a, i) => P(i, Number.isFinite(sr.values[a.key]) ? sr.values[a.key] : 0));
      const poly = S('polygon', { points: pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' '), style: `fill:${sr.color};fill-opacity:.13;stroke:${sr.color};transform-origin:${cx}px ${cy}px;animation:pop 520ms var(--ease) both;animation-delay:${si * 90}ms`, 'stroke-width': 2, 'stroke-linejoin': 'round' });
      svg.append(poly);
      axes.forEach((a, i) => {
        const v = sr.values[a.key];
        const [x, y] = pts[i];
        const dot = S('circle', { cx: x, cy: y, r: Number.isFinite(v) ? 3.4 : 2.4, style: `fill:${Number.isFinite(v) ? sr.color : 'var(--bg-2)'};stroke:${sr.color};cursor:pointer`, class: 'pop' });
        const tip = e => showTip(e.clientX, e.clientY, a.full || a.label, vis.map(s2 => ({ color: s2.color, label: s2.label, value: Number.isFinite(s2.values[a.key]) ? s2.raw[a.key] : 'non mesuré' })));
        dot.addEventListener('pointerdown', tip); dot.addEventListener('pointermove', tip); dot.addEventListener('pointerleave', hideTip);
        svg.append(dot);
      });
    });
    host.append(svg);
  };
  const full = () => { render(); renderLegend(id, series.map(sr => ({ key: sr.key, label: sr.label, color: sr.color }))); };
  CHARTS.set(id, full);
  full();
}

// --- Grouped horizontal bars (Duel) ---
function groupedBars(id, { groups, series, aria }) {
  const host = document.getElementById('ch-' + id);
  if (!host) return;
  const render = () => {
    host.textContent = '';
    const vis = series.filter(sr => !isHidden(id, sr.key));
    const W = chartWidth(host), barH = 9, gap = 4, labelH = 18, groupGap = 14, valW = 52;
    const gh = labelH + vis.length * (barH + gap) + groupGap;
    const H = groups.length * gh;
    const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': aria });
    groups.forEach((g, gi) => {
      const y0 = gi * gh;
      svg.append(S('text', { x: 0, y: y0 + 12, class: 'lbl-strong', style: 'font-size:12px', text: g.label }));
      if (g.sub) svg.append(S('text', { x: W, y: y0 + 12, 'text-anchor': 'end', style: 'font-size:9.5px', text: g.sub }));
      vis.forEach((sr, si) => {
        const v = g.values[sr.key], y = y0 + labelH + si * (barH + gap);
        svg.append(S('rect', { x: 0, y, width: W - valW, height: barH, rx: barH / 2, style: 'fill:var(--track)' }));
        if (v && Number.isFinite(v.n)) {
          const w = Math.max(barH, (W - valW) * v.n / 100);
          const r = S('rect', { x: 0, y, width: w, height: barH, rx: barH / 2, class: 'growx', style: `fill:${sr.color};animation-delay:${gi * 40 + si * 30}ms;cursor:pointer` });
          const tip = e => showTip(e.clientX, e.clientY, g.label, vis.map(s2 => ({ color: s2.color, label: s2.label, value: g.values[s2.key] ? g.values[s2.key].display : 'non mesuré' })));
          r.addEventListener('pointerdown', tip); r.addEventListener('pointermove', tip); r.addEventListener('pointerleave', hideTip);
          svg.append(r);
        }
        svg.append(S('text', { x: W, y: y + barH - 1, 'text-anchor': 'end', style: `font-size:10.5px;font-weight:600;fill:${v ? 'var(--ink)' : 'var(--ink-3)'}`, text: v ? v.display : '—' }));
      });
    });
    host.append(svg);
  };
  const full = () => { render(); renderLegend(id, series.map(sr => ({ key: sr.key, label: sr.label, color: sr.color }))); };
  CHARTS.set(id, full);
  full();
}

// --- Scatter with Pareto frontier ---
function scatterChart(id, { points, frontKeys, axis, aria }) {
  const host = document.getElementById('ch-' + id);
  if (!host) return;
  const render = () => {
    host.textContent = '';
    const vis = points.filter(p => !isHidden(id, p.model.vendor) && Number.isFinite(p.x) && Number.isFinite(p.y));
    if (!vis.length) { setEmpty(host, 'Aucun point visible', axis === 'price' ? 'Ajoutez des prix aux modèles ou réactivez un éditeur.' : 'Ajoutez des vitesses aux modèles ou réactivez un éditeur.'); return; }
    const W = chartWidth(host), H = 280, m = { t: 18, r: 18, b: 42, l: 40 };
    const log = axis === 'price';
    const xsr = vis.map(p => p.x);
    let xmin = Math.min(...xsr), xmax = Math.max(...xsr);
    let tx, xt;
    if (log) {
      xmin = Math.log10(xmin / 1.5); xmax = Math.log10(xmax * 1.5);
      tx = v => m.l + (Math.log10(v) - xmin) / (xmax - xmin) * (W - m.l - m.r);
      xt = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100].filter(v => Math.log10(v) >= xmin && Math.log10(v) <= xmax);
    } else {
      const nt = niceTicks(xmin * 0.9, xmax * 1.05, 4); xmin = nt.lo; xmax = nt.hi;
      tx = v => m.l + (v - xmin) / (xmax - xmin) * (W - m.l - m.r);
      xt = nt.ticks;
    }
    const yn = niceTicks(Math.min(...vis.map(p => p.y)) - 3, Math.max(...vis.map(p => p.y)) + 3, 4);
    const ty = v => m.t + (1 - (v - yn.lo) / (yn.hi - yn.lo)) * (H - m.t - m.b);
    const ctx = vis.map(p => p.r).filter(Number.isFinite), cmin = Math.min(...ctx), cmax = Math.max(...ctx);
    const rad = p => Number.isFinite(p.r) && cmax > cmin ? 5 + 7 * Math.sqrt((p.r - cmin) / (cmax - cmin)) : 7;
    const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': aria });
    yn.ticks.forEach(t => { svg.append(S('line', { x1: m.l, x2: W - m.r, y1: ty(t), y2: ty(t), class: 'gridline' })); svg.append(S('text', { x: m.l - 6, y: ty(t) + 3, 'text-anchor': 'end', text: fmt(t, 0) })); });
    xt.forEach(t => { svg.append(S('line', { y1: m.t, y2: H - m.b, x1: tx(t), x2: tx(t), class: 'gridline' })); svg.append(S('text', { x: tx(t), y: H - m.b + 14, 'text-anchor': 'middle', text: log ? '$' + fmt(t, t < 1 ? 1 : 0) : fmt(t, 0) })); });
    svg.append(S('text', { x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'lbl', style: 'font-size:10.5px', text: log ? 'Prix mixte ($ / M tokens, échelle log) →' : 'Vitesse (tokens / s) →' }));
    svg.append(S('text', { x: 12, y: m.t + (H - m.t - m.b) / 2, 'text-anchor': 'middle', class: 'lbl', style: 'font-size:10.5px', transform: `rotate(-90 12 ${m.t + (H - m.t - m.b) / 2})`, text: 'Indice Octant →' }));
    const front = vis.filter(p => frontKeys.has(p.key)).sort((a, b) => a.x - b.x);
    if (front.length > 1) {
      const d = front.map((p, i) => (i ? 'L' : 'M') + tx(p.x).toFixed(1) + ' ' + ty(p.y).toFixed(1)).join('');
      const zone = log ? `${d}L${tx(front[front.length - 1].x).toFixed(1)} ${m.t}L${tx(front[0].x).toFixed(1)} ${m.t}Z` : `${d}L${tx(front[front.length - 1].x).toFixed(1)} ${m.t}L${tx(front[0].x).toFixed(1)} ${m.t}Z`;
      svg.append(S('path', { d: zone, class: 'fadein', style: 'fill:var(--accent);fill-opacity:.06' }));
      svg.append(S('path', { d, fill: 'none', style: 'stroke:var(--accent);opacity:.25', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      svg.append(S('path', { d, fill: 'none', class: 'draw', style: 'stroke:var(--accent)', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    }
    const sorted = [...vis].sort((a, b) => rad(b) - rad(a));
    sorted.forEach((p, i) => {
      const x = tx(p.x), y = ty(p.y), r = rad(p), onF = frontKeys.has(p.key);
      const g = S('g', { class: 'pop', style: `animation-delay:${i * 25}ms;cursor:pointer`, tabindex: 0, role: 'button', 'aria-label': `${p.label}, indice ${fmt(p.y)}` });
      if (onF) g.append(S('circle', { cx: x, cy: y, r: r + 4, fill: 'none', style: 'stroke:var(--accent);opacity:.7', 'stroke-width': 1.2 }));
      g.append(S('circle', { cx: x, cy: y, r, style: `fill:${p.color};fill-opacity:${onF ? .95 : .55};stroke:var(--bg-2)`, 'stroke-width': 1.5 }));
      const tip = e => {
        const bb = g.getBoundingClientRect();
        showTip(e.clientX || bb.left + bb.width / 2, e.clientY || bb.top, p.label, [
          { color: p.color, label: 'Indice', value: fmt(p.y) },
          { label: 'Prix mixte', value: fmtPrice(blendedPrice(p.model)) },
          { label: 'Perf/$', value: fmt(p.ppd) + ' pts/$' },
          { label: 'Vitesse', value: Number.isFinite(p.model.speed) ? fmt(p.model.speed, 0) + ' tok/s' : '—' },
          { label: 'Contexte', value: fmtCtx(p.model.contextK) + ' tokens' },
          ...(onF ? [{ label: 'Statut', value: 'sur la frontière' }] : [])
        ]);
      };
      g.addEventListener('pointerdown', tip); g.addEventListener('pointermove', tip); g.addEventListener('pointerleave', hideTip);
      g.addEventListener('focus', tip); g.addEventListener('blur', hideTip);
      svg.append(g);
    });
    const boxes = vis.map(p => ({ x0: tx(p.x) - rad(p), x1: tx(p.x) + rad(p), y0: ty(p.y) - rad(p), y1: ty(p.y) + rad(p) }));
    const hit = b => boxes.some(o => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
    [...front].sort((a, b) => b.y - a.y).forEach(p => {
      const x = tx(p.x), y = ty(p.y), r = rad(p) + 5, w = p.label.length * 5.7 + 4, hgt = 12;
      const cands = [[x + r, y - 2, 'start'], [x - r, y - 2, 'end'], [x + r * .7, y - r - 2, 'start'], [x - r * .7, y - r - 2, 'end'], [x + r * .7, y + r + 8, 'start'], [x - r * .7, y + r + 8, 'end']];
      for (const [lx, ly, anchor] of cands) {
        const b = { x0: anchor === 'start' ? lx : lx - w, x1: anchor === 'start' ? lx + w : lx, y0: ly - hgt + 3, y1: ly + 3 };
        if (b.x0 < m.l || b.x1 > W - 2 || b.y0 < 2 || b.y1 > H - m.b) continue;
        if (hit(b)) continue;
        boxes.push(b);
        svg.append(S('text', { x: lx, y: ly, 'text-anchor': anchor, class: 'lbl-strong fadein', style: 'font-size:10px;paint-order:stroke;stroke:var(--bg-2);stroke-width:3px;stroke-opacity:.7', text: p.label }));
        break;
      }
    });
    host.append(svg);
    finishDraw(svg);
  };
  const vendors = [...new Map(points.map(p => [p.model.vendor, vendorOf(p.model)])).values()];
  const full = () => { render(); renderLegend(id, vendors.map(v => ({ key: v.id, label: v.name, color: v.color }))); };
  CHARTS.set(id, full);
  full();
}

// --- Gauge ---
function gaugeChart(id, value, label, status) {
  const host = document.getElementById('ch-' + id);
  if (!host) return;
  const render = () => {
    host.textContent = '';
    const W = chartWidth(host), H = 150, cx = W / 2, cy = 92, r = 66, a0 = -210, a1 = 30;
    const pt = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
    const arc = (s, e) => { const [x0, y0] = pt(s), [x1, y1] = pt(e); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
    const v = Number.isFinite(value) ? clamp(value, 0, 100) : 0, ae = a0 + (a1 - a0) * v / 100;
    const col = `var(--${status || 'accent'})`;
    const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': `${label} : ${fmt(value, 0)} sur 100` });
    svg.append(S('path', { d: arc(a0, a1), fill: 'none', style: 'stroke:var(--track)', 'stroke-width': 12, 'stroke-linecap': 'round' }));
    if (v > 0) {
      svg.append(S('path', { d: arc(a0, ae), fill: 'none', style: `stroke:${col};opacity:.25`, 'stroke-width': 20, 'stroke-linecap': 'round' }));
      svg.append(S('path', { d: arc(a0, ae), fill: 'none', class: 'draw', style: `stroke:${col}`, 'stroke-width': 12, 'stroke-linecap': 'round' }));
    }
    [0, 25, 50, 75, 100].forEach(t => { const a = a0 + (a1 - a0) * t / 100, [x, y] = [cx + (r + 16) * Math.cos(a * Math.PI / 180), cy + (r + 16) * Math.sin(a * Math.PI / 180)]; svg.append(S('text', { x, y: y + 3, 'text-anchor': 'middle', style: 'font-size:8.5px', text: String(t) })); });
    svg.append(S('text', { x: cx, y: cy + 6, 'text-anchor': 'middle', style: 'font-size:30px;font-weight:600;fill:var(--ink)', text: fmt(value, 0) }));
    svg.append(S('text', { x: cx, y: cy + 26, 'text-anchor': 'middle', class: 'lbl', style: 'font-size:10.5px', text: label }));
    host.append(svg);
    finishDraw(svg);
  };
  CHARTS.set(id, render);
  render();
}

// ===== VIEWS =====
const SPACE_BY_ID = Object.fromEntries(SPACES.map(sp => [sp.id, sp]));
const DUEL_COLORS = ['var(--accent)', 'var(--accent-2)', 'var(--accent-3)'];
const statusColor = st => st === 'good' ? 'var(--good)' : st === 'warn' ? 'var(--warn)' : st === 'bad' ? 'var(--bad)' : 'var(--accent)';
const xToTime = x => addMonthsEnd(monthsAxis()[0].end, x);
const typo = t => String(t).replace(/ ([?!:;])/g, '\u202f$1');

function headTpl(id, extra = '') {
  const sp = SPACE_BY_ID[id];
  return `<header class="space-head"><div class="eyebrow">${esc(sp.eyebrow)}</div><h1 class="space-title" id="title-${id}">${esc(sp.title)}</h1><p class="space-q">${esc(typo(sp.q))}</p>${extra}</header>`;
}
function cardTpl(id, title, sub, opts = {}) {
  return `<article class="card" id="card-${id}"><div class="card-head"><div style="flex:1;min-width:0"><h2 class="card-title">${esc(typo(title))}</h2>${sub ? `<p class="card-sub">${esc(typo(sub))}</p>` : ''}</div>${opts.noTable ? '' : `<button class="btn-ghost no-print" type="button" data-table-toggle="${id}" aria-expanded="false" aria-controls="tbl-${id}">Voir les données</button>`}</div>${opts.before || ''}<div class="${opts.hm ? 'hm-wrap' : ''}"><div class="chart" id="ch-${id}"></div></div><div class="legend no-print" id="lg-${id}"></div><div class="data-table" id="tbl-${id}"></div>${opts.after || ''}</article>`;
}
function emptyTpl(id) {
  return headTpl(id) + `<article class="card"><div class="empty"><b>Aucune donnée active</b>Chargez le jeu de démonstration ou envoyez un JSON depuis votre agent.<div class="row wrap" style="justify-content:center;margin-top:14px;gap:10px"><button class="btn primary" type="button" data-action="load-demo">${iconSvg('i-spark', 16)}Charger la démo</button><button class="btn" type="button" data-go="flux">${iconSvg('i-flux', 16)}Ouvrir Flux</button></div></div></article>`;
}
function modelTags(m, extra = []) {
  const t = [];
  if (m.open) t.push('<span class="tag good">OPEN</span>');
  if (m.superseded) t.push('<span class="tag">remplacé</span>');
  return t.concat(extra).join('');
}
function deltaTpl(d) {
  if (d.kind === 'new') return '<small class="up">NOUVEAU</small>';
  if (d.kind === 'move') return d.value > 0 ? `<small class="up">▲ ${d.value}</small>` : d.value < 0 ? `<small class="down">▼ ${-d.value}</small>` : '<small class="muted">=</small>';
  return '<small class="muted">—</small>';
}
function lbRow(o, i) {
  return `<li><button type="button" class="lb-row" data-model="${esc(o.id)}" style="animation-delay:${Math.min(i, 12) * 30}ms" aria-label="${esc(o.name)}, ${esc(o.valueText)}. Ouvrir la fiche">
    <span class="lb-rank">${esc(o.rank)}</span>
    <span style="min-width:0"><span class="lb-name"><span class="vdot" style="background:${o.color}"></span><span class="n">${esc(o.name)}</span></span>
    <span class="lb-meta">${esc(o.meta)}${o.tags || ''}</span>
    <span class="lb-bar"><i style="width:${clamp(o.pct, 2, 100).toFixed(1)}%;background:${o.color};animation-delay:${Math.min(i, 12) * 30}ms"></i></span></span>
    <span class="lb-val">${esc(o.valueText)}${o.delta || ''}</span></button></li>`;
}

// ---------- Pulse ----------
function renderPulse(sec) {
  const K = kpis();
  const kHtml = K.map(k => {
    const def = KPI_DEFS[k.id], d = k.delta;
    const dcls = !Number.isFinite(d) || Math.abs(d) < 1e-9 ? '' : d > 0 ? 'up' : 'down';
    return `<button type="button" class="card kpi flat" data-kpi="${k.id}" aria-expanded="false" aria-describedby="kdef-${k.id}">
      <div class="kpi-label"><span class="kpi-dot ${k.status}"></span>${esc(def.label)}</div>
      <div class="kpi-value">${esc(fmt(k.value, k.d))}<span class="kpi-unit">${esc(k.unit)}</span></div>
      <div class="kpi-sub">${esc(k.sub)}</div>
      <div class="kpi-foot"><span class="delta ${dcls}" title="Variation sur ${CONFIG.compareDays} jours">${esc(Number.isFinite(d) ? fmtSigned(d, k.d) : CONFIG.compareDays + ' j')}</span><span class="spark" data-spark="${k.id}" style="flex:1;min-width:0;display:block"></span></div>
      <div class="kpi-def" id="kdef-${k.id}">${esc(def.def)}</div></button>`;
  }).join('');
  const mv = movers();
  sec.innerHTML = headTpl('pulse') + `<div class="stack">
    <div class="kpi-grid">${kHtml}</div>
    <div class="grid-2">
      <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Ce qui a bougé</h2><p class="card-sub">Les ${CONFIG.compareDays} derniers jours, classés par ampleur.</p></div></div>
        <ul class="movers">${mv.map((m, i) => `<li style="animation-delay:${i * 70}ms"><span class="ico" aria-hidden="true">${esc(m.ico)}</span><span>${m.html}</span></li>`).join('') || '<li><span></span><span class="muted">Rien de notable sur la période.</span></li>'}</ul></article>
      ${cardTpl('podium', 'Podium de l’indice Octant', 'Qui occupe le sommet du classement général ?')}
    </div>
    ${cardTpl('race', 'Course au sommet', 'Comment le meilleur indice de chaque éditeur évolue-t-il, mois après mois ?')}
    ${cardTpl('share', 'Records par éditeur', 'Qui a battu le plus de records depuis le début du suivi ?')}
  </div>`;
  K.forEach(k => { const el = sec.querySelector(`[data-spark="${k.id}"]`); if (el) el.append(sparkline(k.spark, statusColor(k.status), k.bars)); });
  podiumChart('podium', ranked(asOf()).slice(0, 3));
  const race = vendorRace(), axis = monthsAxis();
  if (!state.hidden.race) state.hidden.race = race.slice(4).map(sr => sr.vendor.id);
  lineChart('race', {
    aria: 'Meilleur indice Octant par éditeur et par mois',
    series: race.map((sr, i) => ({ key: sr.vendor.id, label: sr.vendor.name, color: sr.vendor.color, points: sr.points, glow: i === 0, width: i === 0 ? 2.4 : 1.8 })),
    xLabel: x => fmtMonth(axis[x] ? axis[x].end : xToTime(x)), tipTitle: x => fmtMonthLong(axis[x].end), yFmt: v => fmt(v, 0), tipFmt: v => fmt(v, 1), legend: true, height: 230,
    table: { headers: ['Mois', ...race.map(sr => sr.vendor.name)], rows: axis.map((mo, i) => [fmtMonth(mo.end), ...race.map(sr => fmt(sr.points[i].y))]), num: race.map((_, i) => i + 1) }
  });
  const share = recordShare();
  donutChart('share', { items: share.map(x => ({ key: x.vendor.id, label: x.vendor.name, value: x.n, color: x.vendor.color })), center: t => fmt(t, 0), centerSub: 'records battus' });
}

// ---------- Arène ----------
function arenaRows() {
  const st = state.settings, now = asOf(), snap = snapshot(now), an = anomalies(), ds = state.data;
  const base = ranking(now).filter(r => st.hideSuperseded ? (r.current && r.tracked) : true);
  if (st.arenaBench === 'index') {
    return base.filter(r => r.tracked || !st.hideSuperseded).map(r => ({ r, value: r.index, norm: r.index, rec: null }));
  }
  const b = bench(st.arenaBench);
  return base.map(r => { const rec = snap.get(r.model.id + '|' + b.id); return rec ? { r, value: rec.score, norm: normScore(b, rec.score), rec, key: r.model.id + '|' + b.id } : null; })
    .filter(Boolean).sort((x, y) => y.norm - x.norm).map(x => ({ ...x, suspect: an.keys.has(x.key), conflict: ds.conflictKeys.has(x.key) }));
}
function renderArena(sec) {
  const st = state.settings, cats = [...new Set(benchList().map(b => b.category))];
  if (st.arenaCat !== 'all' && !cats.includes(st.arenaCat)) st.arenaCat = 'all';
  const benches = benchList().filter(b => st.arenaCat === 'all' || b.category === st.arenaCat);
  if (st.arenaBench !== 'index' && !benches.some(b => b.id === st.arenaBench)) st.arenaBench = 'index';
  const b = st.arenaBench === 'index' ? null : bench(st.arenaBench);
  const rows = arenaRows();
  const sotaKey = b ? (sota(b.id, asOf()).modelId) : null;
  const items = rows.map((x, i) => {
    const m = x.r.model, v = vendorOf(m), tags = [];
    if (b) {
      if (m.id === sotaKey) tags.push('<span class="tag acc">RECORD</span>');
      if (x.suspect) tags.push('<span class="tag warn">⚠ suspect</span>');
      if (x.conflict) tags.push('<span class="tag bad">conflit</span>');
      if (!x.rec.verified) tags.push('<span class="tag">non vérifié</span>');
    } else if (!x.r.tracked) tags.push('<span class="tag">partiel</span>');
    return lbRow({
      id: m.id, rank: b ? String(i + 1) : (x.r.rank ? String(x.r.rank) : '–'), name: m.name, meta: v.name + ' ', tags: modelTags(m, tags), color: v.color,
      pct: x.norm, valueText: b ? fmtScore(b, x.value) + (b.unit === '%' ? ' %' : '') : fmt(x.value),
      delta: b ? `<small class="muted">${esc(fmtDay(x.rec.t))}</small>` : deltaTpl(rankDelta(m.id))
    }, i);
  }).join('');
  const chip = (attr, val, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" ${attr}="${esc(val)}" aria-pressed="${on}">${esc(label)}</button>`;
  sec.innerHTML = headTpl('arena') + `<div class="stack">
    <div class="chips" role="group" aria-label="Catégories">${chip('data-cat', 'all', 'Toutes', st.arenaCat === 'all')}${cats.map(c => chip('data-cat', c, CATEGORIES[c], st.arenaCat === c)).join('')}</div>
    <div class="chips" role="group" aria-label="Benchmarks">${`<button type="button" class="chip sm${st.arenaBench === 'index' ? ' on' : ''}" data-bench="index" aria-pressed="${st.arenaBench === 'index'}">${iconSvg('i-spark', 12)}Indice Octant</button>`}${benches.map(x => `<button type="button" class="chip sm${st.arenaBench === x.id ? ' on' : ''}" data-bench="${esc(x.id)}" aria-pressed="${st.arenaBench === x.id}">${esc(x.name)}</button>`).join('')}</div>
    <article class="card" id="card-lb">
      <div class="card-head"><div style="flex:1;min-width:0"><h2 class="card-title">${esc(b ? b.name : 'Indice Octant')}</h2><p class="card-sub">${esc(b ? (b.description || CATEGORIES[b.category]) + ` · échelle ${fmt(b.scaleMin, 0)}–${fmt(b.scaleMax, 0)}${unitOf(b)}` : 'Moyenne des scores normalisés sur tous les benchmarks, poids égaux. Touchez un modèle pour sa fiche.')}</p></div>
      <button class="btn-ghost no-print" type="button" data-table-toggle="lb" aria-expanded="false" aria-controls="tbl-lb">Voir les données</button></div>
      <label class="switch"><input type="checkbox" id="swHide" ${st.hideSuperseded ? 'checked' : ''}><span>Génération actuelle uniquement</span></label>
      <ul class="lb">${items || '<li class="empty"><b>Aucun résultat</b>Aucun modèle n’a de score sur ce benchmark.</li>'}</ul>
      <div class="data-table" id="tbl-lb"></div>
    </article>
    ${cardTpl('heat', 'Carte thermique', 'Où chaque modèle est-il fort ou faible ? Scores normalisés de 0 à 100 ; point orange = résultat suspect ou en conflit.', { hm: true, noTable: true })}
  </div>`;
  renderDataTable('lb', ['Rang', 'Modèle', 'Éditeur', b ? `Score (${b.unit})` : 'Indice', b ? 'Date' : 'Benchmarks', b ? 'Source' : 'Rang 30 j'], rows.map((x, i) => {
    const m = x.r.model;
    if (b) return [String(i + 1), m.name, vendorOf(m).name, fmtScore(b, x.value), fmtDate(x.rec.t), (x.rec.source === 'independent' ? 'indépendante' : 'officielle') + (x.rec.verified ? ', vérifiée' : '')];
    const p = rowOf(m.id, prevCut());
    return [x.r.rank ? String(x.r.rank) : '–', m.name, vendorOf(m).name, fmt(x.value), String(x.r.count), p && p.rank ? String(p.rank) : '—'];
  }), [0, 3]);
  const snap = snapshot(asOf()), an = anomalies(), ds = state.data;
  const hmRows = ranking(asOf()).filter(r => r.tracked && (st.hideSuperseded ? r.current : true));
  heatmap('heat', {
    aria: 'Carte thermique des scores normalisés par modèle et par benchmark',
    rows: hmRows.map(r => ({ key: r.model.id, label: r.model.name, color: vendorOf(r.model).color })),
    cols: benchList().map(x => ({ key: x.id, label: x.short, full: x.name })),
    cell: (mid, bid) => {
      const rec = snap.get(mid + '|' + bid);
      if (!rec) return null;
      const bb = bench(bid), k = mid + '|' + bid;
      return { n: normScore(bb, rec.score), display: fmt(rec.score, 0), raw: fmtScore(bb, rec.score) + unitOf(bb), flag: an.keys.has(k) ? 'résultat suspect' : ds.conflictKeys.has(k) ? 'conflit de sources' : '' };
    }
  });
}

// ---------- Duel ----------
function duelIds() {
  let ids = state.settings.duel.filter(id => state.data.models.has(id)).slice(0, 3);
  if (!ids.length) { ids = ranked(asOf()).slice(0, 3).map(r => r.model.id); state.settings.duel = ids; }
  return ids;
}
function renderDuel(sec) {
  const ids = duelIds(), ms = ids.map(model), snap = snapshot(asOf()), rel = reliability();
  const chips = ms.map((m, i) => `<span class="chip" style="cursor:default"><span class="sw" style="background:${DUEL_COLORS[i]}"></span>${esc(m.name)}<button type="button" data-duel-remove="${esc(m.id)}" aria-label="Retirer ${esc(m.name)}" style="margin:-4px -6px -4px 2px;width:26px;height:26px;display:grid;place-items:center;border-radius:50%">${iconSvg('i-close', 12)}</button></span>`).join('');
  const verdict = duelVerdict(ids);
  const spec = [
    ['Rang', m => { const r = rowOf(m.id); return r && r.rank ? '#' + r.rank : '—'; }],
    ['Indice Octant', m => fmt((rowOf(m.id) || {}).index)],
    ['Prix entrée', m => fmtPrice(m.priceIn)], ['Prix sortie', m => fmtPrice(m.priceOut)], ['Prix mixte', m => fmtPrice(blendedPrice(m))],
    ['Perf/$', m => fmt(perfPerDollar((rowOf(m.id) || {}).index, m))], ['Vitesse', m => Number.isFinite(m.speed) ? fmt(m.speed, 0) + ' tok/s' : '—'], ['Contexte', m => fmtCtx(m.contextK)],
    ['Sortie', m => fmtDate(m.release)], ['Licence', m => m.open === null ? '—' : m.open ? 'Ouverte' : 'Propriétaire'], ['Fiabilité', m => fmt((rel.per.get(m.id) || {}).score, 0) + ' / 100']
  ];
  sec.innerHTML = headTpl('duel') + `<div class="stack">
    <div class="chips">${chips}<button type="button" class="chip" data-action="open-pick" aria-haspopup="dialog">${iconSvg('i-plus', 14)}${ms.length < 3 ? 'Ajouter' : 'Changer'}</button></div>
    ${ms.length < 2 ? '<article class="card"><div class="empty"><b>Choisissez au moins deux modèles</b>Touchez « Ajouter » pour composer votre duel.</div></article>' : ''}
    <div class="grid-2">
      ${cardTpl('radar', 'Signature', 'Sur quels axes chaque modèle excelle-t-il ? Scores normalisés 0–100.', { noTable: true })}
      <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Verdict</h2><p class="card-sub">Ce que disent les chiffres, en clair.</p></div></div><ul class="verdict">${verdict.map(v => `<li>${v}</li>`).join('') || '<li class="muted">Ajoutez un deuxième modèle.</li>'}</ul></article>
    </div>
    ${cardTpl('bars', 'Benchmark par benchmark', 'Quel modèle l’emporte sur chaque épreuve ? Valeurs dans l’unité du benchmark.')}
    <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Fiche technique</h2><p class="card-sub">Prix en $ par million de tokens.</p></div></div>
      <div class="table-wrap"><table><thead><tr><th scope="col"></th>${ms.map((m, i) => `<th scope="col" class="n"><span class="vdot" style="background:${DUEL_COLORS[i]};margin-right:6px"></span>${esc(m.name)}</th>`).join('')}</tr></thead>
      <tbody>${spec.map(([lbl, f]) => `<tr><td>${esc(lbl)}</td>${ms.map(m => `<td class="n">${esc(f(m))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></article>
  </div>`;
  if (!ms.length) return;
  const axes = benchList().map(b => ({ key: b.id, label: b.short, full: b.name }));
  const series = ms.map((m, i) => {
    const values = {}, raw = {};
    benchList().forEach(b => { const r = snap.get(m.id + '|' + b.id); values[b.id] = r ? normScore(b, r.score) : NaN; raw[b.id] = r ? fmtScore(b, r.score) + unitOf(b) : '—'; });
    return { key: m.id, label: m.name, color: DUEL_COLORS[i], values, raw };
  });
  radarChart('radar', { axes, series, aria: 'Radar des scores normalisés : ' + ms.map(m => m.name).join(', ') });
  groupedBars('bars', {
    aria: 'Comparaison par benchmark',
    series: series.map(sr => ({ key: sr.key, label: sr.label, color: sr.color })),
    groups: benchList().map(b => ({ label: b.name, sub: CATEGORIES[b.category], values: Object.fromEntries(ms.map(m => { const r = snap.get(m.id + '|' + b.id); return [m.id, r ? { n: normScore(b, r.score), display: fmtScore(b, r.score) + (b.unit === '%' ? ' %' : '') } : null]; })) }))
  });
  renderDataTable('bars', ['Benchmark', ...ms.map(m => m.name)], benchList().map(b => [b.name, ...ms.map(m => { const r = snap.get(m.id + '|' + b.id); return r ? fmtScore(b, r.score) + unitOf(b) : '—'; })]), ms.map((_, i) => i + 1));
}

// ---------- Frontière ----------
function renderFrontier(sec) {
  const axis = state.settings.frontierAxis === 'speed' ? 'speed' : 'price';
  const { pts, front, frontKeys } = frontierPoints(axis);
  const topVal = [...pts].filter(p => Number.isFinite(p.ppd)).sort((a, b) => b.ppd - a.ppd).slice(0, 5);
  const maxVal = topVal.length ? topVal[0].ppd : 1;
  sec.innerHTML = headTpl('frontier', `<div class="seg" role="group" aria-label="Axe horizontal" style="margin-top:14px"><button type="button" data-axis="price" aria-pressed="${axis === 'price'}">Prix</button><button type="button" data-axis="speed" aria-pressed="${axis === 'speed'}">Vitesse</button></div>`) + `<div class="stack">
    ${cardTpl('front', axis === 'price' ? 'Frontière prix × performance' : 'Frontière vitesse × performance', axis === 'price' ? 'Quels modèles sont imbattables à leur niveau de prix ? Taille des bulles = fenêtre de contexte.' : 'Quels modèles sont imbattables à leur niveau de vitesse ? Taille des bulles = fenêtre de contexte.')}
    <div class="grid-2">
      <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Sur la frontière</h2><p class="card-sub">Aucun autre modèle n’est à la fois ${axis === 'price' ? 'moins cher' : 'plus rapide'} et meilleur.</p></div></div>
        <ul class="lb">${[...front].sort((a, b) => b.y - a.y).map((p, i) => lbRow({ id: p.key, rank: String(i + 1), name: p.label, meta: vendorOf(p.model).name + ' · ' + (axis === 'price' ? fmtPrice(p.x) : fmt(p.x, 0) + ' tok/s') + ' ', tags: modelTags(p.model), color: p.color, pct: p.y, valueText: fmt(p.y), delta: `<small class="muted">${esc(fmt(p.ppd))} pts/$</small>` }, i)).join('')}</ul></article>
      <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Meilleur indice par dollar</h2><p class="card-sub">Indice Octant ÷ prix mixte. Combien de points chaque dollar achète-t-il ?</p></div></div>
        <ul class="lb">${topVal.map((p, i) => lbRow({ id: p.key, rank: String(i + 1), name: p.label, meta: vendorOf(p.model).name + ' · indice ' + fmt(p.y) + ' ', tags: '', color: p.color, pct: p.ppd / maxVal * 100, valueText: fmt(p.ppd), delta: '<small class="muted">pts/$</small>' }, i)).join('')}</ul></article>
    </div>
  </div>`;
  scatterChart('front', { points: pts, frontKeys, axis, aria: `Nuage de points ${axis === 'price' ? 'prix' : 'vitesse'} contre indice Octant, avec frontière de Pareto` });
  renderDataTable('front', ['Modèle', 'Éditeur', 'Indice', 'Prix mixte', 'Perf/$', 'Vitesse', 'Frontière'], pts.map(p => [p.label, vendorOf(p.model).name, fmt(p.y), fmtPrice(blendedPrice(p.model)), fmt(p.ppd), fmt(p.model.speed, 0), frontKeys.has(p.key) ? 'oui' : 'non']), [2, 3, 4, 5]);
}

// ---------- Trajectoire ----------
function trajContext() {
  const st = state.settings;
  if (st.trajBench !== 'index' && !bench(st.trajBench)) st.trajBench = 'index';
  const bid = st.trajBench, b = bid === 'index' ? null : bench(bid);
  return { bid, b, unit: b ? unitOf(b) : ' pts', dec: b && b.unit === 'Elo' ? 0 : 1, thr: thresholdFor(bid), cur: sota(bid, asOf()).value };
}
function renderTrajectory(sec) {
  const { bid, b, unit, dec, thr } = trajContext();
  const sMin = b ? Math.floor(b.scaleMin) : 40, sMax = b ? b.scaleMax : 100, step = b && b.unit === 'Elo' ? 10 : 1;
  const hist = recordHistory(bid).reverse();
  sec.innerHTML = headTpl('trajectory') + `<div class="stack">
    <div class="chips" role="group" aria-label="Série à prévoir"><button type="button" class="chip sm${bid === 'index' ? ' on' : ''}" data-traj="index" aria-pressed="${bid === 'index'}">${iconSvg('i-spark', 12)}Indice Octant</button>${benchList().map(x => `<button type="button" class="chip sm${bid === x.id ? ' on' : ''}" data-traj="${esc(x.id)}" aria-pressed="${bid === x.id}">${esc(x.name)}</button>`).join('')}</div>
    <article class="card">
      <div class="eyebrow">Prévision</div>
      <div id="trajStmt" aria-live="polite"></div>
      <div class="slider-row"><label for="thr">Seuil visé</label><output id="thrOut" class="mono">${esc(fmt(thr, dec) + unit)}</output>
        <input class="range" type="range" id="thr" min="${sMin}" max="${sMax}" step="${step}" value="${thr}" style="--p:${((thr - sMin) / (sMax - sMin) * 100).toFixed(1)}%"></div>
      <div id="trajSpec"></div>
      <p class="card-sub" style="margin-top:10px">Hypothèse : le rythme des ${CONFIG.forecastWindow} derniers mois se maintient. Les benchmarks ralentissent souvent près de leur plafond : lisez la bande, pas seulement la date centrale.</p>
    </article>
    ${cardTpl('traj', `Trajectoire · ${b ? b.name : 'Indice Octant'}`, 'Record mensuel, tendance linéaire et bande de prédiction à 95 %.')}
    <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Records successifs</h2><p class="card-sub">Chaque fois que l’état de l’art a progressé.</p></div></div>
      <ul class="log">${hist.slice(0, 12).map(hh => { const m = model(hh.modelId); return `<li><span class="tag acc">${esc(fmtMonth(hh.t))}</span><span><b>${esc(fmt(hh.value, dec) + unit)}</b> · ${esc(m ? m.name : '—')} ${hh.verified ? '' : '<span class="tag warn">non vérifié</span>'}</span></li>`; }).join('') || '<li><span></span><span class="muted">Aucun record.</span></li>'}</ul></article>
  </div>`;
  renderTrajParts();
}
function renderTrajParts() {
  const { bid, b, unit, dec, thr, cur } = trajContext();
  const fc = forecast(bid, thr);
  let big = '', sub = '';
  if (!fc.fit) { big = 'Historique insuffisant'; sub = 'Il faut au moins 4 mois de données pour estimer une tendance.'; }
  else if (fc.already) { big = 'Seuil déjà franchi'; sub = `Le record actuel (${fmt(cur, dec)}${unit}) dépasse déjà ${fmt(thr, dec)}${unit}.`; }
  else if (fc.eta) { big = `Vers ${fmtMonthLong(fc.eta.t)}`; sub = `Intervalle à 95 % : ${fc.early ? fmtMonthLong(fc.early.t) : 'dès maintenant'} – ${fc.late ? fmtMonthLong(fc.late.t) : `au-delà de ${CONFIG.forecastHorizon} mois`}.`; }
  else { big = `Pas avant ${CONFIG.forecastHorizon} mois`; sub = fc.fit.slope <= 0 ? 'La tendance récente est plate ou en baisse.' : `Même l’hypothèse haute n’atteint pas ${fmt(thr, dec)}${unit} sur l’horizon.`; }
  const st = $('#trajStmt'), sp = $('#trajSpec');
  if (st) st.innerHTML = `<div class="forecast-big">${esc(big)}</div><p class="card-sub" style="margin:0 0 10px">${esc(sub)}</p>`;
  if (sp) sp.innerHTML = `<div class="spec" style="margin-top:8px">
        <div><b>${esc(fmt(cur, dec) + unit)}</b><span>record actuel</span></div>
        <div><b>${esc(fc.fit ? fmtSigned(fc.fit.slope, 2) + unit : '—')}</b><span>par mois (${CONFIG.forecastWindow} mois)</span></div>
        <div><b>${esc(fc.fit ? fmt(fc.fit.r2, 2) : '—')}</b><span>R² de la régression</span></div>
        <div><b>${esc(fc.eta ? fmtMonth(fc.eta.t) : fc.already ? 'atteint' : '—')}</b><span>date centrale</span></div></div>`;
  if (!fc.fit) { setEmpty($('#ch-traj'), 'Historique insuffisant', 'Au moins 4 mois de données sont nécessaires.'); return; }
  const last = fc.series[fc.series.length - 1];
  const lo = b ? b.scaleMin : 0, hi = b ? b.scaleMax : 100, cl = y => clamp(y, lo, hi);
  lineChart('traj', {
    aria: `Trajectoire du record ${b ? b.name : 'de l’indice Octant'} avec prévision`,
    series: [
      { key: 'sota', label: 'Record', color: 'var(--accent)', points: fc.series, step: true, area: true, glow: true, width: 2.4 },
      { key: 'trend', label: 'Tendance', color: 'var(--accent-2)', points: [...fc.win.map(p => ({ x: p.x, y: cl(fc.fit.predict(p.x)) })), ...fc.proj.slice(1).map(p => ({ x: p.x, y: cl(p.y) }))], dashed: true, noDot: true, width: 1.6 }
    ],
    band: fc.proj.map(p => ({ x: p.x, lo: cl(p.lo), hi: cl(p.hi) })), bandColor: 'var(--accent-2)',
    hline: { y: thr, label: 'seuil ' + fmt(thr, dec) },
    split: last.x,
    markers: fc.eta && !fc.already ? [{ x: fc.eta.x, y: thr, color: 'var(--warn)' }] : [],
    xDomain: [fc.series[0].x, fc.proj[fc.proj.length - 1].x],
    yMax: b ? b.scaleMax : 100,
    xLabel: x => fmtMonth(xToTime(x)), tipTitle: x => fmtMonthLong(xToTime(x)), yFmt: v => fmt(v, 0), tipFmt: v => fmt(v, dec), legend: true, height: 250,
    table: { headers: ['Mois', 'Record', 'Tendance', 'Bande basse', 'Bande haute'], rows: [...fc.series.map(p => [fmtMonth(p.t), fmt(p.y, dec), fmt(fc.fit.predict(p.x), dec), '', '']), ...fc.proj.slice(1).map(p => [fmtMonth(p.t), '', fmt(p.y, dec), fmt(p.lo, dec), fmt(p.hi, dec)])], num: [1, 2, 3, 4] }
  });
}

// ---------- Simulateur ----------
function simCriteria() {
  const cats = [...new Set(benchList().map(b => b.category))];
  return [...cats.map(c => ({ key: c, label: CATEGORIES[c] })), { key: 'cost', label: 'Coût bas' }, { key: 'speed', label: 'Vitesse' }];
}
function renderSimulator(sec) {
  const sc = activeScenario();
  sec.innerHTML = headTpl('simulator') + `<div class="stack">
    <div class="chips" role="group" aria-label="Scénarios">${state.scenarios.map(s2 => `<button type="button" class="chip${s2.id === sc.id ? ' on' : ''}" data-scenario="${esc(s2.id)}" aria-pressed="${s2.id === sc.id}">${esc(s2.name)}</button>`).join('')}</div>
    <div class="grid-2">
      <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Pondérations · ${esc(sc.name)}</h2><p class="card-sub">De 0 (ignoré) à 5 (décisif). Le score perso n’affecte pas l’indice Octant.</p></div></div>
        <div id="simSliders">${simCriteria().map(c => { const v = sc.w[c.key] ?? 0; return `<div class="slider-row"><label for="w-${c.key}">${esc(c.label)}</label><output class="mono" id="wo-${c.key}">${v}</output><input class="range" type="range" min="0" max="5" step="1" id="w-${c.key}" data-weight="${c.key}" value="${v}" style="--p:${v * 20}%"></div>`; }).join('')}</div>
        <div class="row wrap" style="margin-top:12px">
          ${sc.preset ? `<button class="btn" type="button" data-action="reset-scenario">Réinitialiser</button>` : `<button class="btn danger" type="button" data-action="delete-scenario">${iconSvg('i-trash', 16)}Supprimer</button>`}
        </div>
        <div class="row" style="margin-top:12px"><input class="text" id="scName" maxlength="32" placeholder="Nom du nouveau scénario" aria-label="Nom du nouveau scénario"><button class="btn primary" type="button" data-action="save-scenario">Créer</button></div>
      </article>
      <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Votre classement</h2><p class="card-sub">Modèles de la génération actuelle, notés selon vos poids.</p></div></div><ul class="lb" id="simResults"></ul></article>
    </div>
    <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Scénarios côte à côte</h2><p class="card-sub">Le podium change-t-il selon l’usage ? Jusqu’à 3 scénarios. En couleur : présents dans tous.</p></div></div>
      <div class="chips" role="group" aria-label="Scénarios comparés" style="margin-bottom:10px">${state.scenarios.map(s2 => `<button type="button" class="chip sm${state.compare.includes(s2.id) ? ' on' : ''}" data-compare="${esc(s2.id)}" aria-pressed="${state.compare.includes(s2.id)}">${esc(s2.name)}</button>`).join('')}</div>
      <div class="scen-cols" id="simCompare"></div></article>
  </div>`;
  renderSimResults();
}
function renderSimResults() {
  const sc = activeScenario(), res = scenarioScores(sc.w).slice(0, 8), mx = res.length ? res[0].score : 100;
  const el = $('#simResults');
  if (el) el.innerHTML = res.map((x, i) => lbRow({ id: x.model.id, rank: String(i + 1), name: x.model.name, meta: vendorOf(x.model).name + ' · indice ' + fmt(x.index) + ' ', tags: modelTags(x.model), color: vendorOf(x.model).color, pct: x.score / mx * 100, valueText: fmt(x.score), delta: '<small class="muted">score perso</small>' }, i)).join('') || '<li class="empty"><b>Aucun critère actif</b>Montez au moins un curseur.</li>';
  const cmp = state.compare.map(id => state.scenarios.find(s2 => s2.id === id)).filter(Boolean);
  const tops = cmp.map(s2 => scenarioScores(s2.w).slice(0, 5));
  const common = tops.length > 1 ? tops[0].map(x => x.model.id).filter(id => tops.every(t => t.some(x => x.model.id === id))) : [];
  const ce = $('#simCompare');
  if (ce) ce.innerHTML = cmp.map((s2, i) => `<div class="scen-col"><h4>${esc(s2.name)}</h4><ol>${tops[i].map(x => `<li class="${common.includes(x.model.id) ? 'common' : ''}"><span class="vdot" style="background:${vendorOf(x.model).color}"></span>${esc(x.model.name)}<span class="s">${esc(fmt(x.score))}</span></li>`).join('')}</ol></div>`).join('') || '<div class="empty">Sélectionnez au moins un scénario.</div>';
}

// ---------- Flux ----------
function renderFlux(sec) {
  const has = hasData();
  const kindLabel = { demo: 'Démo', agent: 'Agent', file: 'Fichier', paste: 'Collé' };
  const srcHtml = state.sources.map(s2 => `<div class="src"><div class="src-name">${esc(s2.name)} <span class="tag">${esc(kindLabel[s2.kind] || s2.kind)}</span></div>
      <label class="switch" style="min-height:0"><input type="checkbox" data-src-toggle="${esc(s2.id)}" ${s2.active ? 'checked' : ''} aria-label="Activer la source ${esc(s2.name)}"></label>
      <div class="src-meta">Reçu ${esc(fmtStamp(s2.receivedAt))} · ${esc(fmt(s2.payload.results.length, 0))} résultats · ${esc(fmt(s2.payload.models.length, 0))} modèles</div>
      <button type="button" class="btn-ghost" data-src-remove="${esc(s2.id)}" aria-label="Retirer la source ${esc(s2.name)}">Retirer</button></div>`).join('');
  let relHtml = '', logHtml = '';
  if (has) {
    const rel = reliability(), qc = qualityCounts(), log = qualityLog();
    const typeLbl = { invalid: ['Invalide', 'bad'], suspect: ['Suspect', 'warn'], conflict: ['Conflit', 'warn'], missing: ['Manquant', ''] };
    const filtered = log.filter(i => state.logFilter === 'all' || i.type === state.logFilter);
    relHtml = `<div class="grid-2">${cardTpl('rel', 'Fiabilité des données', 'Score moyen des modèles classés : part vérifiée, conflits, anomalies et trous.', { noTable: true, after: `<div class="stat-grid">
        <div class="stat"><b>${esc(fmt(state.data.validCount, 0))}</b><span>résultats valides</span></div>
        <div class="stat"><b>${esc(fmt(rel.verifiedShare, 0))} %</b><span>mesures retenues vérifiées</span></div>
        <div class="stat"><b>${esc(String(qc.invalid))}</b><span>invalides écartés</span></div>
        <div class="stat"><b>${esc(String(qc.conflict))}</b><span>conflits de sources</span></div>
        <div class="stat"><b>${esc(String(qc.suspect))}</b><span>résultats suspects</span></div>
        <div class="stat"><b>${esc(String(qc.missing))}</b><span>valeurs manquantes</span></div></div>
        <label class="switch" style="margin-top:10px"><input type="checkbox" id="swSuspect" ${state.settings.excludeSuspect ? 'checked' : ''}><span>Exclure les résultats suspects des calculs</span></label>` })}
      <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Journal de qualité</h2><p class="card-sub">Chaque alerte avec sa source et sa ligne (index dans le tableau JSON).</p></div></div>
        <div class="chips" role="group" aria-label="Filtrer le journal" style="margin-bottom:6px">${['all', 'invalid', 'suspect', 'conflict', 'missing'].map(t => `<button type="button" class="chip sm${state.logFilter === t ? ' on' : ''}" data-log-filter="${t}" aria-pressed="${state.logFilter === t}">${t === 'all' ? 'Tout · ' + log.length : typeLbl[t][0] + ' · ' + (t === 'suspect' ? qc.suspect : qc[t] || 0)}</button>`).join('')}</div>
        <ul class="log">${filtered.slice(0, state.logLimit).map(i => { const m = i.model ? model(i.model) : null, b = i.bench ? bench(i.bench) : null; return `<li><span class="tag ${typeLbl[i.type][1]}">${esc(typeLbl[i.type][0])}</span><span>${m ? `<b>${esc(m.name)}</b>` : ''}${m && b ? ' · ' : ''}${b ? esc(b.name) : ''}${m || b ? ' — ' : ''}${esc(i.msg)}</span><span class="where">${i.path === '—' ? 'aucune mesure reçue' : `${esc(i.src)} · ${esc(i.path)}[${esc(i.row)}]`}</span></li>`; }).join('') || '<li><span></span><span class="muted">Aucune alerte de ce type.</span></li>'}</ul>
        ${filtered.length > state.logLimit ? `<button class="btn block" type="button" data-action="more-log" style="margin-top:8px">Afficher ${Math.min(40, filtered.length - state.logLimit)} de plus</button>` : ''}
      </article></div>`;
  }
  const envRow = (lbl, st, ok, off) => `<div class="src"><div class="src-name" style="font-weight:600">${esc(lbl)}</div><span class="tag ${st === 'ok' ? 'good' : st === 'pending' ? '' : 'warn'}">${esc(st === 'ok' ? ok : st === 'pending' ? 'en cours' : off)}</span></div>`;
  sec.innerHTML = headTpl('flux') + `<div class="stack">
    <article class="card"><div class="row" style="gap:10px"><span style="color:var(--good)">${iconSvg('i-shield', 22)}</span><div><b style="font-family:var(--font-display);font-weight:500;font-size:14px">100 % local · vos fichiers ne quittent pas ce navigateur</b><div class="card-sub">Aucun serveur, aucune clé, aucune requête sortante hormis les polices et la bibliothèque 3D.</div></div></div></article>
    <div class="grid-2">
      <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Sources</h2><p class="card-sub">Chaque envoi de l’agent devient une source activable. Un nouvel envoi du même agent remplace le précédent.</p></div></div>
        ${srcHtml || '<div class="empty"><b>Aucune source</b>Chargez la démo ou envoyez un JSON.</div>'}
        <div class="grid-2" style="margin-top:12px;gap:8px">
          <button class="btn primary" type="button" data-action="load-demo">${iconSvg('i-spark', 16)}Démo</button>
          <button class="btn" type="button" data-action="paste" aria-haspopup="dialog">${iconSvg('i-paste', 16)}Coller un JSON</button>
          <button class="btn" type="button" data-action="import-json">${iconSvg('i-upload', 16)}Importer un .json</button>
        </div></article>
      <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Pont agent</h2><p class="card-sub">L’app n’a qu’à recevoir : votre agent appelle l’un de ces points d’entrée avec un JSON au format <span class="mono">${esc(CONFIG.schema)}</span>.</p></div></div>
<pre class="code">// 1. Dans la page
OCTANT.ingest(payload, 'Agent PC')

// 2. Depuis une autre fenêtre
win.postMessage({ type: 'octant:ingest',
  name: 'Agent PC', payload }, '*')

// 3. Par lien
fichier.html#payload=&lt;JSON en base64url&gt;</pre>
        <div class="row wrap" style="margin-top:10px"><button class="btn" type="button" data-action="copy-example">${iconSvg('i-copy', 16)}Copier un exemple JSON</button></div></article>
    </div>
    ${relHtml}
    <div class="grid-2">
      <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Espace de travail</h2><p class="card-sub">Sources, filtres, scénarios, seuils, légendes et thème dans un seul fichier (schéma v${CONFIG.workspaceVersion}).</p></div></div>
        <div class="grid-2" style="gap:8px">
          <button class="btn" type="button" data-action="export-ws">${iconSvg('i-download', 16)}Exporter l’espace</button>
          <button class="btn" type="button" data-action="import-ws">${iconSvg('i-upload', 16)}Importer un espace</button>
          <button class="btn danger" type="button" data-action="clear-storage">${iconSvg('i-trash', 16)}Effacer cet appareil</button>
        </div>
        <p class="card-sub" style="margin-top:10px">${state.env.storage ? `Mémorisé sur cet appareil${state.persistedAt ? ' · ' + esc(fmtStamp(state.persistedAt)) : ''}. ` : 'Mémoire locale indisponible : exportez votre espace pour le conserver. '}${state.exportedAt ? 'Dernier export : ' + esc(fmtStamp(state.exportedAt)) + '.' : 'Jamais exporté.'}</p></article>
      <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Système</h2><p class="card-sub">Si un service en ligne manque, l’outil reste utilisable.</p></div></div>
        ${envRow('Fond 3D (Three.js r128)', state.env.three, 'chargé', 'mode de secours')}
        ${envRow('Rendu WebGL', state.env.webgl, 'actif', 'indisponible')}
        ${envRow('Polices Google', state.env.fonts, 'chargées', 'polices système')}
        ${envRow('Mémoire locale', state.env.storage ? 'ok' : 'off', 'disponible', 'bloquée')}
        <label class="switch" style="margin-top:8px"><input type="checkbox" id="swEcoFlux" ${state.eco ? 'checked' : ''}><span>Mode éco (moins de particules, sans flou)</span></label></article>
    </div>
  </div>`;
  if (has) gaugeChart('rel', reliability().global, 'fiabilité moyenne', relStatus(reliability().global));
}

// ---------- Rapport ----------
function reportRows() {
  const st = state.settings, rel = reliability();
  return ranking(asOf()).filter(r => r.tracked && (st.hideSuperseded ? r.current : true)).map(r => ({
    rank: r.rank, model: r.model, vendor: vendorOf(r.model).name, index: r.index, count: r.count,
    price: blendedPrice(r.model), ppd: perfPerDollar(r.index, r.model), rel: (rel.per.get(r.model.id) || {}).score
  }));
}
function renderReport(sec) {
  const K = kpis(), mv = movers(), rows = reportRows().slice(0, 10), ds = state.data;
  const src = state.sources.filter(x => x.active).map(x => x.name).join(', ');
  sec.innerHTML = `<div class="print-only report-head" style="margin-bottom:12px"><svg width="34" height="34" aria-hidden="true"><use href="#logo"/></svg><div><b style="font-family:var(--font-display);letter-spacing:.16em">${esc(CONFIG.appName)}</b><div>${esc(CONFIG.tagline)} · rapport du ${esc(fmtDate(Date.now()))}</div></div></div>` +
    headTpl('report', `<div class="row wrap no-print" style="margin-top:14px">
      <button class="btn primary" type="button" data-action="share">${iconSvg('i-share', 16)}Partager</button>
      <button class="btn" type="button" data-action="print">${iconSvg('i-print', 16)}Imprimer / PDF</button>
      <button class="btn" type="button" data-action="csv">${iconSvg('i-download', 16)}Export CSV</button></div>`) + `<div class="stack">
    <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Synthèse</h2><p class="card-sub">Données au ${esc(fmtDate(ds.asOf))} · source : ${esc(src || '—')}${ds.isDemo ? ' · scores de démonstration fictifs' : ''}.</p></div></div>
      <ul class="verdict">${mv.map(m => `<li>${m.html}</li>`).join('')}</ul></article>
    <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Indicateurs clés</h2><p class="card-sub">Variation sur ${CONFIG.compareDays} jours.</p></div></div>
      <div class="table-wrap"><table><thead><tr><th scope="col">Indicateur</th><th scope="col" class="n">Valeur</th><th scope="col" class="n">Variation</th><th scope="col">Détail</th></tr></thead><tbody>
      ${K.map(k => `<tr><td>${esc(KPI_DEFS[k.id].label)}</td><td class="n">${esc(fmt(k.value, k.d) + ' ' + k.unit)}</td><td class="n">${esc(Number.isFinite(k.delta) ? fmtSigned(k.delta, k.d) : '—')}</td><td>${esc(k.sub)}</td></tr>`).join('')}</tbody></table></div></article>
    <div class="grid-2">${cardTpl('rp-podium', 'Podium', 'Les trois premiers de l’indice Octant.')}${cardTpl('rp-front', 'Frontière prix × performance', 'Les modèles imbattables à leur prix.')}</div>
    <article class="card"><div class="card-head"><div style="flex:1"><h2 class="card-title">Top ${rows.length}</h2><p class="card-sub">Classement général. Prix mixte en $ par million de tokens.</p></div></div>
      <div class="table-wrap"><table><thead><tr><th scope="col" class="n">#</th><th scope="col">Modèle</th><th scope="col">Éditeur</th><th scope="col" class="n">Indice</th><th scope="col" class="n">Prix mixte</th><th scope="col" class="n">Perf/$</th><th scope="col" class="n">Fiabilité</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td class="n">${esc(r.rank ?? '–')}</td><td>${esc(r.model.name)}</td><td>${esc(r.vendor)}</td><td class="n">${esc(fmt(r.index))}</td><td class="n">${esc(fmtPrice(r.price))}</td><td class="n">${esc(fmt(r.ppd))}</td><td class="n">${esc(fmt(r.rel, 0))}</td></tr>`).join('')}</tbody></table></div></article>
  </div>`;
  podiumChart('rp-podium', ranked(asOf()).slice(0, 3));
  const fp = frontierPoints('price');
  scatterChart('rp-front', { points: fp.pts, frontKeys: fp.frontKeys, axis: 'price', aria: 'Frontière prix contre indice Octant' });
  renderDataTable('rp-front', ['Modèle', 'Indice', 'Prix mixte', 'Frontière'], fp.pts.map(p => [p.label, fmt(p.y), fmtPrice(blendedPrice(p.model)), fp.frontKeys.has(p.key) ? 'oui' : 'non']), [1, 2]);
}
function csvNum(v, d) { return Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : ''; }
function csvCell(v) { const s2 = String(v ?? ''); return /[;"\n\r]/.test(s2) ? '"' + s2.replace(/"/g, '""') + '"' : s2; }
function exportCSV() {
  const rows = reportRows(), snap = snapshot(asOf()), bl = benchList();
  const head = ['Rang', 'Modèle', 'Éditeur', 'Sortie', 'Indice Octant', 'Benchmarks', 'Prix mixte ($/M)', 'Perf/$', 'Fiabilité', ...bl.map(b => `${b.name} (${b.unit})`)];
  const lines = [head.map(csvCell).join(';')];
  rows.forEach(r => {
    lines.push([r.rank ?? '', r.model.name, r.vendor, Number.isFinite(r.model.release) ? isoDay(r.model.release) : '', csvNum(r.index, 1), r.count, csvNum(r.price, 2), csvNum(r.ppd, 1), csvNum(r.rel, 0),
      ...bl.map(b => { const x = snap.get(r.model.id + '|' + b.id); return x ? csvNum(x.score, b.unit === 'Elo' ? 0 : 1) : ''; })].map(csvCell).join(';'));
  });
  download(`${CONFIG.csvFileName}-${todayStamp()}.csv`, '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  toast('Export CSV prêt');
}

// ---------- Sheets ----------
function renderMoreSheet() {
  $('#sheet-more-body').innerHTML = `<div class="nav-grid">${SPACES.map(sp => `<button type="button" class="nav-tile" data-go="${sp.id}" ${state.space === sp.id ? 'aria-current="page"' : ''}>${iconSvg(sp.icon, 22)}<b>${esc(sp.title)}</b><span>${esc(sp.q)}</span></button>`).join('')}</div>
    <div class="sec-label" id="themes-label">Thèmes</div>
    <div class="theme-grid" role="group" aria-labelledby="themes-label">${THEMES.map(t => `<button type="button" class="theme-tile ${t.mode === 'light' ? 'light' : ''}" data-theme-pick="${t.id}" aria-pressed="${state.theme === t.id}"><span class="tt-bg" style="background:${t.preview}"></span><span class="check" aria-hidden="true">✓</span><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></button>`).join('')}</div>
    <div class="sec-label">Affichage</div>
    <label class="switch"><input type="checkbox" id="swEco" ${state.eco ? 'checked' : ''}><span>Mode éco : moins de particules, sans flou, 30 images/s</span></label>`;
}
function renderPasteSheet(errors) {
  const body = $('#sheet-paste-body');
  const keep = $('#pasteArea') ? $('#pasteArea').value : '';
  body.innerHTML = `<p class="card-sub" style="margin:0 0 10px">Collez le JSON envoyé par votre agent (format <span class="mono">${esc(CONFIG.schema)}</span>). Il est vérifié avant d’être chargé.</p>
    <textarea class="code" id="pasteArea" spellcheck="false" aria-label="JSON à charger" placeholder='{ "schema": "${esc(CONFIG.schema)}", ... }' data-autofocus></textarea>
    ${errors && errors.length ? `<div class="notice on" style="margin:10px 0 0" role="alert">${errors.map(e => esc(e)).join('<br>')}</div>` : ''}
    <div class="row wrap" style="margin-top:12px"><button class="btn primary" type="button" data-action="paste-load">Vérifier et charger</button><button class="btn" type="button" data-action="paste-example">Insérer l’exemple</button></div>`;
  $('#pasteArea').value = keep;
}
function renderPickSheet() {
  const sel = state.settings.duel;
  const rows = ranking(asOf()).slice().sort((a, b) => (b.current - a.current) || (b.index - a.index));
  $('#sheet-pick-body').innerHTML = `<p class="card-sub" style="margin:0 0 6px">Jusqu’à 3 modèles. ${sel.length}/3 sélectionnés.</p><ul class="pick-list">${rows.map(r => {
    const on = sel.includes(r.model.id), idx = sel.indexOf(r.model.id);
    return `<li><button type="button" data-pick="${esc(r.model.id)}" aria-pressed="${on}"><span class="box" ${on ? `style="background:${DUEL_COLORS[idx]};border-color:${DUEL_COLORS[idx]}"` : ''}>${on ? '✓' : ''}</span><span class="vdot" style="background:${vendorOf(r.model).color}"></span><span style="flex:1;min-width:0"><b>${esc(r.model.name)}</b> <span class="muted" style="font-size:12px">${esc(vendorOf(r.model).name)}</span> ${r.model.superseded ? '<span class="tag">remplacé</span>' : ''}</span><span class="mono">${esc(fmt(r.index))}</span></button></li>`;
  }).join('')}</ul>`;
}
function openModel(id) {
  const m = model(id);
  if (!m) return;
  const r = rowOf(id), snap = snapshot(asOf()), an = anomalies(), rel = reliability().per.get(id) || {}, ds = state.data, v = vendorOf(m);
  $('#sheet-model-title').textContent = m.name;
  const benchRows = benchList().map(b => {
    const k = id + '|' + b.id, rec = snap.get(k), g = ds.groups.get(k) || [];
    const tags = [];
    if (rec && !rec.verified) tags.push('<span class="tag">non vérifié</span>');
    if (an.keys.has(k)) tags.push('<span class="tag warn">suspect</span>');
    if (ds.conflictKeys.has(k)) tags.push('<span class="tag bad">conflit</span>');
    if (rec && sota(b.id, asOf()).modelId === id) tags.push('<span class="tag acc">record</span>');
    return `<tr><td>${esc(b.name)}<div style="margin-top:3px;display:flex;gap:4px;flex-wrap:wrap">${tags.join('')}</div></td><td class="n">${rec ? esc(fmtScore(b, rec.score) + unitOf(b)) : '—'}</td><td class="n">${rec ? esc(fmt(normScore(b, rec.score), 0)) : '—'}</td><td class="n">${esc(String(g.length))}</td></tr>`;
  }).join('');
  $('#sheet-model-body').innerHTML = `<div class="row" style="margin-bottom:12px"><span class="vdot" style="background:${v.color};width:10px;height:10px"></span><span class="ink2">${esc(v.name)}</span>${modelTags(m)}<span class="spacer"></span><span class="tag acc">${r && r.rank ? '#' + r.rank : 'hors classement'}</span></div>
    <div class="spec">
      <div><b>${esc(fmt(r ? r.index : NaN))}</b><span>indice Octant</span></div>
      <div><b>${esc(fmt(rel.score, 0))}</b><span>fiabilité / 100</span></div>
      <div><b>${esc(fmtPrice(blendedPrice(m)))}</b><span>prix mixte ($/M tokens)</span></div>
      <div><b>${esc(fmt(perfPerDollar(r ? r.index : NaN, m)))}</b><span>pts/$</span></div>
      <div><b>${esc(fmt(m.speed, 0))}</b><span>tokens / s</span></div>
      <div><b>${esc(fmtCtx(m.contextK))}</b><span>fenêtre de contexte</span></div>
    </div>
    <p class="card-sub">Sortie le ${esc(fmtDate(m.release))}${m.multimodal === null ? '' : m.multimodal ? ' · multimodal' : ' · texte seul'}${m.open === null ? '' : m.open ? ' · poids ouverts' : ' · propriétaire'}.</p>
    <div class="table-wrap" style="margin-top:10px"><table><thead><tr><th scope="col">Benchmark</th><th scope="col" class="n">Score</th><th scope="col" class="n">0–100</th><th scope="col" class="n">Mesures</th></tr></thead><tbody>${benchRows}</tbody></table></div>
    <div class="row wrap" style="margin-top:14px"><button class="btn primary" type="button" data-action="duel-with" data-id="${esc(id)}">${iconSvg('i-duel', 16)}Ajouter au duel</button></div>`;
  openSheet('sheet-model');
}

// ---------- Routing / rendering ----------
const VIEWS = { pulse: renderPulse, arena: renderArena, duel: renderDuel, frontier: renderFrontier, trajectory: renderTrajectory, simulator: renderSimulator, flux: renderFlux, report: renderReport };
function renderSpace(id = state.space) {
  const sec = document.getElementById('space-' + id);
  if (!sec) return;
  hideTip();
  if (!hasData() && id !== 'flux') { sec.innerHTML = emptyTpl(id); return; }
  VIEWS[id](sec);
}
function renderStatus() {
  const el = $('#statusLine'), ds = state.data;
  if (!hasData()) { el.innerHTML = '<span class="live" style="background:var(--ink-3);box-shadow:none;animation:none"></span>Aucune donnée active'; $('#demoBadge').hidden = true; if (typeof window.octantPastille === 'function') window.octantPastille(); return; }
  const src = state.sources.filter(x => x.active);
  el.innerHTML = `<span class="live"></span>${esc(src.length === 1 ? src[0].name : src.length + ' sources')} · ${esc(fmtDate(ds.asOf))} · ${esc(fmt(ds.validCount, 0))} résultats`;
  $('#demoBadge').hidden = !ds.isDemo;
  if (typeof window.octantPastille === 'function') window.octantPastille();
}
function updateNotice() {
  const n = $('#notice');
  if (!state.env.storage && !state.exportedAt && state.sources.some(x => x.kind !== 'demo')) {
    n.textContent = 'Les données importées disparaîtront à la fermeture de l’onglet. Exportez votre espace pour les conserver (Flux › Espace de travail).';
    n.classList.add('on');
  } else n.classList.remove('on');
}
function setSpace(id, { push = true } = {}) {
  if (!SPACE_BY_ID[id]) id = 'pulse';
  state.space = id;
  $$('.space').forEach(sec => sec.classList.toggle('active', sec.id === 'space-' + id));
  renderSpace(id);
  updateDock();
  closeSheet(true);
  window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
  if (push) { try { history.replaceState(null, '', '#' + id); } catch (e) { /* file:// may refuse */ } }
  document.title = `${SPACE_BY_ID[id].title} · ${CONFIG.appName}`;
}
function refreshAll() { renderStatus(); renderSpace(state.space); updateNotice(); if (openSheetId === 'sheet-more') renderMoreSheet(); }

// ----- Background scene (Three.js, with a 2D canvas fallback) -----
const BG = { r: null, scene: null, cam: null, world: null, raf: 0, running: false, last: 0, sprite: null, fb: null, pointer: { x: 0, y: 0 }, smooth: { x: 0, y: 0, s: 0 } };
function themeColors() {
  const t = THEMES.find(x => x.id === state.theme) || THEMES[0];
  return { a: cssVar('--accent') || '#4de3ff', b: cssVar('--accent-2') || '#9b6bff', c: cssVar('--accent-3') || '#ff5fd2', bg: cssVar('--bg') || '#05060f', light: t.mode === 'light' };
}
function density() { return state.eco ? CONFIG.particleDensity.eco : CONFIG.particleDensity.full; }
function rndSphere(R) {
  const u = Math.random(), v = Math.random(), th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1), r = R * Math.cbrt(Math.random());
  return [r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph)];
}
function loadThree() {
  return new Promise(resolve => {
    if (window.THREE) { resolve(true); return; }
    const sc = document.createElement('script');
    sc.src = CONFIG.three.url; sc.integrity = CONFIG.three.integrity; sc.crossOrigin = 'anonymous'; sc.referrerPolicy = 'no-referrer';
    let done = false;
    const fin = ok => { if (done) return; done = true; resolve(ok && !!window.THREE); };
    sc.onload = () => fin(true); sc.onerror = () => fin(false);
    setTimeout(() => fin(false), CONFIG.three.timeoutMs);
    document.head.appendChild(sc);
  });
}
async function initBackground() {
  const ok = await loadThree();
  state.env.three = ok ? 'ok' : 'off';
  if (ok) {
    try { setup3D(); state.env.webgl = 'ok'; }
    catch (e) { state.env.webgl = 'off'; setupFallback(); }
  } else {
    state.env.webgl = 'off';
    setupFallback();
    toast('Fond 3D indisponible (hors ligne) — fond de secours actif');
  }
  if (state.space === 'flux') renderSpace('flux');
}
function bgSize() { const c = $('#bg'); return [c.clientWidth || innerWidth, c.clientHeight || innerHeight]; }
function setup3D() {
  const T = THREE, canvas = $('#bg');
  const r = new T.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  const [w, h] = bgSize();
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, state.eco ? 1 : CONFIG.maxPixelRatio));
  r.setSize(w, h, false);
  r.setClearColor(0x000000, 0);
  BG.r = r;
  BG.cam = new T.PerspectiveCamera(55, w / h, 0.1, 200);
  BG.cam.position.set(0, 0, 10);
  BG.sprite = makeSprite();
  buildWorld();
  canvas.classList.add('on');
  startLoop();
}
function makeSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function disposeScene(scene) {
  if (!scene) return;
  scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  });
}
function buildWorld() {
  if (!BG.r) return;
  disposeScene(BG.scene);
  const scene = new THREE.Scene(), C = themeColors(), k = density();
  const make = { neural: sceneNeural, aurora: sceneAurora, cryo: sceneCryo, silicon: sceneSilicon, singularity: sceneSingularity }[state.theme] || sceneNeural;
  BG.scene = scene;
  BG.world = make(scene, C, k);
  scene.traverse(o => { o.frustumCulled = false; });
  if (reduceMotion()) drawFrame(6, 0);
}
function pointsMat(color, size, additive, opacity = 1, vertexColors = false) {
  return new THREE.PointsMaterial({ size, map: BG.sprite, color: vertexColors ? 0xffffff : new THREE.Color(color), vertexColors, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
}
function dustCloud(n, spread, color, size, additive, opacity) {
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - .5) * spread[0]; p[i * 3 + 1] = (Math.random() - .5) * spread[1]; p[i * 3 + 2] = (Math.random() - .5) * spread[2] - spread[3]; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, pointsMat(color, size, additive, opacity));
}

// Neural Noir: drifting neurons that connect when close
function sceneNeural(scene, C, k) {
  const T = THREE, g = new T.Group(); scene.add(g);
  const N = Math.round(80 + 90 * k), R = 6.2, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const v = rndSphere(R); pos.set(v, i * 3); for (let j = 0; j < 3; j++) vel[i * 3 + j] = (Math.random() - .5) * 0.012; }
  const ng = new T.BufferGeometry(); ng.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.add(new T.Points(ng, pointsMat(C.a, .24, true, .95)));
  const MAX = N * 5, lp = new Float32Array(MAX * 6), lc = new Float32Array(MAX * 6);
  const lg = new T.BufferGeometry();
  lg.setAttribute('position', new T.BufferAttribute(lp, 3)); lg.setAttribute('color', new T.BufferAttribute(lc, 3));
  g.add(new T.LineSegments(lg, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .75, blending: T.AdditiveBlending, depthWrite: false })));
  g.add(dustCloud(Math.round(650 * k) + 150, [28, 20, 20, 2], C.b, .07, true, .55));
  const ca = new T.Color(C.a), cb = new T.Color(C.b), tmp = new T.Color(), LD2 = 2.15 * 2.15;
  return {
    update(t, dt) {
      const s = dt * 60;
      for (let i = 0; i < N * 3; i += 3) {
        pos[i] += vel[i] * s; pos[i + 1] += vel[i + 1] * s; pos[i + 2] += vel[i + 2] * s;
        if (pos[i] ** 2 + pos[i + 1] ** 2 + pos[i + 2] ** 2 > R * R) { vel[i] *= -1; vel[i + 1] *= -1; vel[i + 2] *= -1; }
      }
      ng.attributes.position.needsUpdate = true;
      let n = 0;
      for (let i = 0; i < N && n < MAX; i++) {
        const ix = i * 3;
        for (let j = i + 1; j < N && n < MAX; j++) {
          const jx = j * 3, dx = pos[ix] - pos[jx], dy = pos[ix + 1] - pos[jx + 1], dz = pos[ix + 2] - pos[jx + 2], d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < LD2) {
            const a = 1 - d2 / LD2, o = n * 6;
            tmp.copy(ca).lerp(cb, clamp((pos[ix + 1] + R) / (2 * R), 0, 1)).multiplyScalar(a * a);
            lp[o] = pos[ix]; lp[o + 1] = pos[ix + 1]; lp[o + 2] = pos[ix + 2]; lp[o + 3] = pos[jx]; lp[o + 4] = pos[jx + 1]; lp[o + 5] = pos[jx + 2];
            lc[o] = lc[o + 3] = tmp.r; lc[o + 1] = lc[o + 4] = tmp.g; lc[o + 2] = lc[o + 5] = tmp.b;
            n++;
          }
        }
      }
      lg.setDrawRange(0, n * 2);
      lg.attributes.position.needsUpdate = true; lg.attributes.color.needsUpdate = true;
      g.rotation.y = t * 0.05; g.rotation.x = Math.sin(t * 0.08) * 0.18;
    }
  };
}
// Quantum Aurora: an undulating quantum field of particles
function sceneAurora(scene, C, k) {
  const T = THREE, g = new T.Group(); scene.add(g);
  const cols = Math.round(70 + 60 * k), rows = Math.round(40 + 34 * k), W = 30, Dp = 22, N = cols * rows;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), bx = new Float32Array(N), bz = new Float32Array(N);
  let i = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { bx[i] = (c / (cols - 1) - .5) * W; bz[i] = (r / (rows - 1) - .5) * Dp; pos[i * 3] = bx[i]; pos[i * 3 + 2] = bz[i]; i++; }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
  g.add(new T.Points(geo, pointsMat(0xffffff, .14, true, 1, true)));
  g.position.set(0, -2.2, -3); g.rotation.x = 0.22;
  const glows = [C.a, C.b, C.a].map((c, j) => {
    const sp = new T.Sprite(new T.SpriteMaterial({ map: BG.sprite, color: new T.Color(c), transparent: true, opacity: .22, blending: T.AdditiveBlending, depthWrite: false }));
    sp.scale.set(14, 6, 1); sp.position.set((j - 1) * 6, 3.5 + j * .6, -12); scene.add(sp); return sp;
  });
  const stars = dustCloud(Math.round(380 * k) + 120, [60, 20, 20, 22], C.c, .08, true, .7);
  stars.position.y = 7; scene.add(stars);
  const ca = new T.Color(C.a), cb = new T.Color(C.b), tmp = new T.Color();
  return {
    update(t) {
      for (let j = 0; j < N; j++) {
        const x = bx[j], z = bz[j];
        const y = Math.sin(x * .32 + t * .55) * .7 + Math.cos(z * .42 + t * .38) * .55 + Math.sin((x + z) * .18 + t * .25) * .45;
        pos[j * 3 + 1] = y;
        tmp.copy(ca).lerp(cb, clamp((y + 1.7) / 3.4, 0, 1)).multiplyScalar(.4 + .9 * clamp((z + Dp / 2) / Dp, 0, 1));
        col[j * 3] = tmp.r; col[j * 3 + 1] = tmp.g; col[j * 3 + 2] = tmp.b;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      g.rotation.y = Math.sin(t * .05) * .12;
      stars.rotation.y = t * .01;
      glows.forEach((sp, j) => { sp.position.x = (j - 1) * 6 + Math.sin(t * .13 + j * 2) * 2.5; sp.material.opacity = .16 + Math.sin(t * .4 + j) * .07; });
    }
  };
}
// Cryo Lab: holographic lab tunnel with floating crystals and scanner rings
function sceneCryo(scene, C, k) {
  const T = THREE, g = new T.Group(); scene.add(g);
  scene.fog = new T.Fog(new T.Color(C.bg), 10, 44);
  const step = 2, X = 36, Z0 = -60, Z1 = 12, L = [];
  for (let x = -X; x <= X; x += step) L.push(x, 0, Z0, x, 0, Z1);
  for (let z = Z0; z <= Z1; z += step) L.push(-X, 0, z, X, 0, z);
  const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(L, 3));
  const floor = new T.LineSegments(gg, new T.LineBasicMaterial({ color: new T.Color(C.a), transparent: true, opacity: .3, fog: true }));
  floor.position.y = -3.4; g.add(floor);
  const ceil = new T.LineSegments(gg, new T.LineBasicMaterial({ color: new T.Color(C.b), transparent: true, opacity: .12, fog: true }));
  ceil.position.y = 7.5; g.add(ceil);
  const polys = [];
  for (let i = 0; i < 6; i++) {
    const m = new T.LineSegments(new T.EdgesGeometry(new T.IcosahedronGeometry(.55 + Math.random() * 1.05, i % 3 === 0 ? 0 : 1)), new T.LineBasicMaterial({ color: new T.Color(i % 2 ? C.b : C.a), transparent: true, opacity: .6, fog: true }));
    m.position.set((Math.random() - .5) * 11, (Math.random() - .3) * 5, -3 - Math.random() * 16);
    g.add(m); polys.push({ m, sp: .12 + Math.random() * .3, ph: Math.random() * 6, y: m.position.y });
  }
  const ring = new T.Mesh(new T.TorusGeometry(3.6, .014, 6, 180), new T.MeshBasicMaterial({ color: new T.Color(C.c), transparent: true, opacity: .5 }));
  const ring2 = new T.Mesh(new T.TorusGeometry(2.5, .01, 6, 160), new T.MeshBasicMaterial({ color: new T.Color(C.a), transparent: true, opacity: .55 }));
  ring.position.set(0, .8, -6); ring2.position.copy(ring.position); g.add(ring, ring2);
  const dust = dustCloud(Math.round(420 * k) + 120, [24, 12, 30, 6], C.a, .1, false, .5);
  g.add(dust);
  return {
    update(t, dt) {
      floor.position.z = (t * 1.1) % step; ceil.position.z = floor.position.z;
      polys.forEach(p => { p.m.rotation.x += p.sp * dt; p.m.rotation.y += p.sp * .8 * dt; p.m.position.y = p.y + Math.sin(t * .6 + p.ph) * .25; });
      ring.rotation.x = t * .22; ring.rotation.y = t * .15; ring2.rotation.x = -t * .3; ring2.rotation.z = t * .2;
      dust.rotation.y = t * .015;
    }
  };
}
// Silicon Dawn: a processor die with pulses travelling along circuit traces
function sceneSilicon(scene, C, k) {
  const T = THREE, g = new T.Group(); scene.add(g);
  scene.fog = new T.Fog(new T.Color(C.bg), 9, 30);
  g.rotation.x = -1.0; g.position.set(0, -1.1, -1);
  const step = .55, H = 1.9, P = Math.round(30 + 36 * k), paths = [];
  for (let p = 0; p < P; p++) {
    const side = p % 4, off = Math.round(((Math.random() - .5) * 3.4) / step) * step;
    let x, y, dir;
    if (side === 0) { x = off; y = H; dir = [0, 1]; } else if (side === 1) { x = off; y = -H; dir = [0, -1]; } else if (side === 2) { x = H; y = off; dir = [1, 0]; } else { x = -H; y = off; dir = [-1, 0]; }
    const pts = [[x, y]], len = 8 + Math.floor(Math.random() * 20), out = dir.slice();
    for (let s = 0; s < len; s++) {
      if (s > 2 && Math.random() < .24) dir = (dir[0] === out[0] && dir[1] === out[1]) ? (Math.random() < .5 ? [out[1], -out[0]] : [-out[1], out[0]]) : out.slice();
      x += dir[0] * step; y += dir[1] * step; pts.push([x, y]);
    }
    const cum = [0];
    for (let s = 1; s < pts.length; s++) cum.push(cum[s - 1] + Math.hypot(pts[s][0] - pts[s - 1][0], pts[s][1] - pts[s - 1][1]));
    paths.push({ pts, cum, total: cum[cum.length - 1], u: Math.random(), sp: .08 + Math.random() * .22 });
  }
  const seg = [], pads = [];
  paths.forEach(p => { for (let s = 1; s < p.pts.length; s++) seg.push(p.pts[s - 1][0], p.pts[s - 1][1], 0, p.pts[s][0], p.pts[s][1], 0); const e = p.pts[p.pts.length - 1]; pads.push(e[0], e[1], 0); });
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(seg, 3));
  g.add(new T.LineSegments(sg, new T.LineBasicMaterial({ color: new T.Color(C.b), transparent: true, opacity: .42, fog: true })));
  const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(pads, 3));
  g.add(new T.Points(pg, pointsMat(C.b, .22, false, .9)));
  [1.9, 1.45, 1.0].forEach((s, i) => {
    const sq = new T.BufferGeometry().setFromPoints([new T.Vector3(-s, -s, 0), new T.Vector3(s, -s, 0), new T.Vector3(s, s, 0), new T.Vector3(-s, s, 0)]);
    g.add(new T.LineLoop(sq, new T.LineBasicMaterial({ color: new T.Color(C.a), transparent: true, opacity: [.8, .45, .25][i] })));
  });
  const die = new T.Mesh(new T.PlaneGeometry(3.8, 3.8), new T.MeshBasicMaterial({ color: new T.Color(C.a), transparent: true, opacity: .07, depthWrite: false }));
  g.add(die);
  const M = paths.length * 2, pp = new Float32Array(M * 3);
  const pulseGeo = new T.BufferGeometry(); pulseGeo.setAttribute('position', new T.BufferAttribute(pp, 3));
  g.add(new T.Points(pulseGeo, pointsMat(C.a, .3, false, 1)));
  const at = (p, u) => {
    const d = ((u % 1) + 1) % 1 * p.total;
    let s = 1; while (s < p.cum.length - 1 && p.cum[s] < d) s++;
    const a = p.pts[s - 1], b = p.pts[s], f = (d - p.cum[s - 1]) / ((p.cum[s] - p.cum[s - 1]) || 1);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };
  return {
    update(t, dt) {
      paths.forEach((p, i) => {
        p.u = (p.u + p.sp * dt) % 1;
        const [x, y] = at(p, p.u), [x2, y2] = at(p, p.u - .035);
        pp[i * 6] = x; pp[i * 6 + 1] = y; pp[i * 6 + 2] = .02; pp[i * 6 + 3] = x2; pp[i * 6 + 4] = y2; pp[i * 6 + 5] = .02;
      });
      pulseGeo.attributes.position.needsUpdate = true;
      g.rotation.z = t * 0.025;
      die.material.opacity = .06 + Math.sin(t * 1.4) * .025;
    }
  };
}
// Singularité: iridescent core with an orbiting accretion disk
function sceneSingularity(scene, C, k) {
  const T = THREE, g = new T.Group(); scene.add(g); g.position.y = 1.3;
  const core = new T.Mesh(new T.IcosahedronGeometry(1.45, state.eco ? 3 : 5), new T.ShaderMaterial({
    transparent: true,
    uniforms: { uT: { value: 0 }, uA: { value: new T.Color(C.a) }, uB: { value: new T.Color(C.b) }, uC: { value: new T.Color(C.c) } },
    vertexShader: `uniform float uT; varying vec3 vN; varying vec3 vV; varying float vD;
      void main(){ vec3 p = position;
        float d = sin(p.x*2.1 + uT*1.1) * sin(p.y*2.3 + uT*0.9) * sin(p.z*1.9 + uT*1.3) + 0.5*sin(p.x*4.3 - uT*1.7 + p.z*3.1);
        p += normal * d * 0.11; vD = d;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uT; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; varying vec3 vN; varying vec3 vV; varying float vD;
      void main(){ float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.0);
        vec3 irid = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + f * 1.2 + vD * 0.6 + uT * 0.05));
        vec3 base = mix(uA, uB, 0.5 + 0.5 * vD);
        vec3 col = mix(base * 0.18, irid, f) + uC * pow(f, 4.0) * 0.9;
        gl_FragColor = vec4(col, 0.95); }`
  }));
  g.add(core);
  const halo = new T.Sprite(new T.SpriteMaterial({ map: BG.sprite, color: new T.Color(C.a), transparent: true, opacity: .32, blending: T.AdditiveBlending, depthWrite: false }));
  halo.scale.set(7, 7, 1); g.add(halo);
  const N = Math.round(2200 * k) + 500, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), rad = new Float32Array(N), ang = new Float32Array(N), hgt = new Float32Array(N);
  const cc = new T.Color(C.c), cb = new T.Color(C.b), ca = new T.Color(C.a), tmp = new T.Color();
  for (let i = 0; i < N; i++) {
    const u = Math.random(); rad[i] = 2.0 + Math.pow(u, 1.8) * 4.6; ang[i] = Math.random() * Math.PI * 2; hgt[i] = (Math.random() - .5) * .12 * rad[i] * .5;
    const f = (rad[i] - 2) / 4.6;
    tmp.copy(cc).lerp(cb, clamp(f * 2, 0, 1)).lerp(ca, clamp(f * 2 - 1, 0, 1)).multiplyScalar(1 - f * .55);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(pos, 3)); dg.setAttribute('color', new T.BufferAttribute(col, 3));
  const disk = new T.Points(dg, pointsMat(0xffffff, .075, true, 1, true));
  disk.rotation.x = 1.18; disk.rotation.z = .22; g.add(disk);
  scene.add(dustCloud(Math.round(420 * k) + 120, [50, 40, 30, 12], C.b, .06, true, .6));
  return {
    update(t, dt) {
      core.material.uniforms.uT.value = t;
      core.rotation.y = t * .12; core.rotation.x = t * .05;
      for (let i = 0; i < N; i++) { ang[i] += dt * 0.9 / Math.pow(rad[i], 1.5); pos[i * 3] = Math.cos(ang[i]) * rad[i]; pos[i * 3 + 1] = hgt[i]; pos[i * 3 + 2] = Math.sin(ang[i]) * rad[i]; }
      dg.attributes.position.needsUpdate = true;
      halo.material.opacity = .26 + Math.sin(t * .9) * .06;
    }
  };
}
function hexA(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return `rgba(128,128,255,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
function setupFallback() {
  const old = $('#bg'), canvas = old.cloneNode(false);
  old.replaceWith(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dots = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.6, s: .2 + Math.random() * .8, p: Math.random() * 6 }));
  const fb = {
    colors: themeColors(),
    resize() { const dpr = Math.min(devicePixelRatio || 1, 1.5); canvas.width = (canvas.clientWidth || innerWidth) * dpr; canvas.height = (canvas.clientHeight || innerHeight) * dpr; },
    draw(t) {
      const W = canvas.width, H = canvas.height, C = fb.colors;
      ctx.clearRect(0, 0, W, H);
      [[C.a, .3 + Math.sin(t * .2) * .15, .25 + Math.cos(t * .17) * .1], [C.b, .75 + Math.cos(t * .15) * .12, .6 + Math.sin(t * .21) * .12], [C.c, .45 + Math.sin(t * .11) * .2, .9]].forEach(([col, x, y]) => {
        const gr = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, Math.max(W, H) * .55);
        gr.addColorStop(0, hexA(col, C.light ? .22 : .28)); gr.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      });
      dots.forEach(d => {
        const y = ((d.y + t * .01 * d.s) % 1) * H, x = (d.x + Math.sin(t * .3 + d.p) * .01) * W;
        ctx.beginPath(); ctx.arc(x, y, d.r * (W / 400), 0, Math.PI * 2); ctx.fillStyle = hexA(C.a, .25 + .35 * Math.abs(Math.sin(t + d.p))); ctx.fill();
      });
    }
  };
  BG.fb = fb; fb.resize(); canvas.classList.add('on');
  startLoop();
}
function drawFrame(t, dt) {
  if (BG.r && BG.world) {
    const s = BG.smooth;
    s.x += (BG.pointer.x - s.x) * .04; s.y += (BG.pointer.y - s.y) * .04;
    s.s += ((window.scrollY || 0) * 0.0008 - s.s) * .06;
    const sc = Math.min(s.s, 3);
    BG.cam.position.set(s.x * .9, -s.y * .6 - sc * 1.2, 10);
    BG.cam.lookAt(0, -sc * .7, 0);
    BG.world.update(t, dt);
    BG.r.render(BG.scene, BG.cam);
  } else if (BG.fb) BG.fb.draw(t);
}
function startLoop() {
  stopLoop();
  if (!BG.r && !BG.fb) return;
  if (reduceMotion()) { drawFrame(6, 0); return; }
  BG.running = true; BG.last = 0;
  const loop = now => {
    if (!BG.running) return;
    BG.raf = requestAnimationFrame(loop);
    if (state.eco && now - BG.last < 32) return;
    const dt = BG.last ? Math.min(.05, (now - BG.last) / 1000) : .016;
    BG.last = now;
    drawFrame(now / 1000, dt);
  };
  BG.raf = requestAnimationFrame(loop);
}
function stopLoop() { BG.running = false; cancelAnimationFrame(BG.raf); }
function bgSetTheme() { if (BG.r) buildWorld(); else if (BG.fb) { BG.fb.colors = themeColors(); if (reduceMotion()) drawFrame(6, 0); } }
function bgResize() {
  if (BG.r) { const [w, h] = bgSize(); BG.r.setSize(w, h, false); BG.cam.aspect = w / h; BG.cam.updateProjectionMatrix(); }
  if (BG.fb) BG.fb.resize();
  if (reduceMotion()) drawFrame(6, 0);
}

// ===== UI EVENTS =====
let openSheetId = null, sheetOpener = null;
function openSheet(id) {
  if (openSheetId && openSheetId !== id) closeSheet(true);
  if (!openSheetId) sheetOpener = document.activeElement;
  const sh = document.getElementById(id);
  sh.classList.add('on'); sh.style.transform = '';
  $('#scrim').classList.add('on');
  openSheetId = id;
  document.body.style.overflow = 'hidden';
  setTimeout(() => { const f = sh.querySelector('[data-autofocus]') || sh.querySelector('.sheet-body button, .sheet-body input, .sheet-body textarea') || sh.querySelector('button'); if (f) f.focus({ preventScroll: true }); }, 80);
}
function closeSheet(silent) {
  if (!openSheetId) return;
  const sh = document.getElementById(openSheetId);
  sh.classList.remove('on'); sh.style.transform = '';
  $('#scrim').classList.remove('on');
  openSheetId = null;
  document.body.style.overflow = '';
  hideTip();
  if (!silent && sheetOpener && sheetOpener.isConnected && sheetOpener.focus) sheetOpener.focus({ preventScroll: true });
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('on'), 2800);
}
function buildDock() {
  const dock = $('#dock');
  SPACES.filter(sp => sp.dock).forEach(sp => dock.insertAdjacentHTML('beforeend', `<button type="button" data-go="${sp.id}">${iconSvg(sp.icon, 22)}<span>${esc(sp.label)}</span></button>`));
  dock.insertAdjacentHTML('beforeend', `<button type="button" id="dockMore" data-action="more" aria-haspopup="dialog">${iconSvg('i-more', 22)}<span>Plus</span></button>`);
}
function updateDock() {
  const btns = $$('#dock button');
  const active = btns.find(b => b.dataset.go === state.space) || $('#dockMore');
  btns.forEach(b => b.removeAttribute('aria-current'));
  active.setAttribute('aria-current', 'page');
  const ind = $('#dockInd');
  ind.style.width = active.offsetWidth + 'px';
  ind.style.height = active.offsetHeight + 'px';
  ind.style.transform = `translate(${active.offsetLeft - 6}px, ${active.offsetTop - 6}px)`;
}
function applyTheme(id, { persist = true } = {}) {
  if (!THEMES.some(t => t.id === id)) id = CONFIG.defaultTheme;
  state.theme = id;
  document.documentElement.dataset.theme = id;
  const meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', THEMES.find(t => t.id === id).meta);
  if (persist) { store.set(CONFIG.storage.theme, id); scheduleSave(); }
  bgSetTheme();
  $$('[data-theme-pick]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themePick === id)));
}
function setEco(on) {
  state.eco = !!on;
  document.documentElement.classList.toggle('eco', state.eco);
  store.set(CONFIG.storage.eco, state.eco ? '1' : '0');
  $$('#swEco, #swEcoFlux').forEach(x => { x.checked = state.eco; });
  if (BG.r) { BG.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, state.eco ? 1 : CONFIG.maxPixelRatio)); bgResize(); buildWorld(); startLoop(); }
  scheduleSave();
}

// --- Workspace (export / import / local persistence) ---
function workspaceObject() {
  return {
    kind: CONFIG.workspaceKind, version: CONFIG.workspaceVersion, app: CONFIG.appName, exportedAt: new Date().toISOString(),
    theme: state.theme, eco: state.eco, settings: state.settings, scenarios: state.scenarios, activeScenario: state.activeScenario,
    compare: state.compare, hidden: state.hidden,
    sources: state.sources.filter(x => x.kind !== 'agent').map(x => ({ id: x.id, name: x.name, kind: x.kind, receivedAt: x.receivedAt, active: x.active, ...(x.kind === 'demo' ? { seed: CONFIG.demoSeed } : { payload: x.payload }) }))
  };
}
function sanitizeWeights(w, fallback) {
  const out = {};
  Object.keys(fallback).forEach(k => { const v = num(w && w[k]); out[k] = Number.isFinite(v) ? clamp(Math.round(v), 0, 5) : fallback[k]; });
  return out;
}
function applyWorkspace(obj) {
  if (!obj || typeof obj !== 'object' || obj.kind !== CONFIG.workspaceKind) return { ok: false, errors: ['Ce fichier n’est pas un espace OCTANT.'] };
  if (typeof obj.version !== 'number' || obj.version > CONFIG.workspaceVersion || obj.version < 1) return { ok: false, errors: [`Version d’espace non prise en charge (${str(obj.version, 8)}). Version attendue : ${CONFIG.workspaceVersion}.`] };
  const errors = [], sources = [];
  (Array.isArray(obj.sources) ? obj.sources : []).slice(0, CONFIG.maxSources).forEach(x => {
    if (!x || typeof x !== 'object') return;
    const payload = x.kind === 'demo' ? generateDemoPayload(Number.isFinite(x.seed) ? x.seed : CONFIG.demoSeed) : x.payload;
    const v = validatePayload(payload);
    if (!v.ok) { errors.push(`Source « ${str(x.name, 40)} » ignorée : ${v.errors[0]}`); return; }
    sources.push({ id: str(x.id, 24) || uid(), name: str(x.name || 'Source', 60), kind: ['demo', 'agent', 'file', 'paste'].includes(x.kind) ? x.kind : 'file', receivedAt: Number.isFinite(x.receivedAt) ? x.receivedAt : Date.now(), active: x.active !== false, payload });
  });
  state.sources = sources;
  const d = defaultSettings(), s = obj.settings && typeof obj.settings === 'object' ? obj.settings : {};
  const thr = {};
  if (s.thresholds && typeof s.thresholds === 'object') Object.keys(s.thresholds).slice(0, 50).forEach(k => { const v = num(s.thresholds[k]); if (Number.isFinite(v)) thr[str(k, 60)] = v; });
  state.settings = {
    arenaCat: typeof s.arenaCat === 'string' ? str(s.arenaCat, 30) : d.arenaCat,
    arenaBench: typeof s.arenaBench === 'string' ? str(s.arenaBench, 60) : d.arenaBench,
    hideSuperseded: typeof s.hideSuperseded === 'boolean' ? s.hideSuperseded : d.hideSuperseded,
    duel: Array.isArray(s.duel) ? s.duel.filter(x => typeof x === 'string').map(x => str(x, 80)).slice(0, 3) : [],
    frontierAxis: s.frontierAxis === 'speed' ? 'speed' : 'price',
    trajBench: typeof s.trajBench === 'string' ? str(s.trajBench, 60) : 'index',
    thresholds: thr,
    excludeSuspect: s.excludeSuspect === true
  };
  const scen = [];
  if (Array.isArray(obj.scenarios)) obj.scenarios.slice(0, 20).forEach(x => {
    if (!x || typeof x !== 'object') return;
    const preset = SCENARIO_PRESETS.find(p => p.id === x.id);
    scen.push({ id: str(x.id, 24) || uid(), name: str(x.name, 32) || 'Scénario', preset: !!preset, w: sanitizeWeights(x.w, (preset || SCENARIO_PRESETS[0]).w) });
  });
  SCENARIO_PRESETS.forEach(p => { if (!scen.some(x => x.id === p.id)) scen.unshift({ ...p, w: { ...p.w } }); });
  state.scenarios = scen;
  state.activeScenario = scen.some(x => x.id === obj.activeScenario) ? obj.activeScenario : 'balanced';
  state.compare = Array.isArray(obj.compare) ? obj.compare.filter(id => scen.some(x => x.id === id)).slice(0, 3) : ['balanced', 'agentic', 'budget'];
  state.hidden = {};
  if (obj.hidden && typeof obj.hidden === 'object') Object.keys(obj.hidden).slice(0, 40).forEach(k => { if (Array.isArray(obj.hidden[k])) state.hidden[str(k, 40)] = obj.hidden[k].filter(v => typeof v === 'string').map(v => str(v, 80)); });
  if (THEMES.some(t => t.id === obj.theme)) state.theme = obj.theme;
  if (typeof obj.eco === 'boolean') state.eco = obj.eco;
  rebuildData();
  return { ok: true, errors };
}
function saveWorkspace() {
  if (state.env.storage) {
    const ok = store.set(CONFIG.storage.workspace, JSON.stringify(workspaceObject()));
    if (ok) state.persistedAt = Date.now(); else state.env.storage = false;
  }
  updateNotice();
}
const scheduleSave = debounce(saveWorkspace, 400);
function dataChanged(msg) { MEMO.clear(); refreshAll(); scheduleSave(); if (msg) toast(msg); }
function loadDemo() { const r = ingestPayload(generateDemoPayload(CONFIG.demoSeed), { kind: 'demo', name: 'Démo OCTANT' }); return r; }
function readJsonFile(file) {
  return new Promise(res => {
    if (!file) { res({ ok: false, errors: ['Aucun fichier sélectionné.'] }); return; }
    if (file.size > 25 * 1024 * 1024) { res({ ok: false, errors: ['Fichier trop volumineux (plus de 25 Mo).'] }); return; }
    const rd = new FileReader();
    rd.onload = () => { try { res({ ok: true, data: JSON.parse(String(rd.result)) }); } catch (e) { res({ ok: false, errors: ['JSON illisible : ' + str(e.message, 120)] }); } };
    rd.onerror = () => res({ ok: false, errors: ['Lecture du fichier impossible.'] });
    rd.readAsText(file);
  });
}
async function handleFile(file, mode) {
  const r = await readJsonFile(file);
  if (!r.ok) { toast(r.errors[0]); return; }
  const isWs = r.data && r.data.kind === CONFIG.workspaceKind;
  if (mode === 'ws' || isWs) {
    const res = applyWorkspace(r.data);
    if (!res.ok) { toast(res.errors[0]); return; }
    applyTheme(state.theme); document.documentElement.classList.toggle('eco', state.eco);
    dataChanged(res.errors.length ? `Espace importé (${res.errors.length} source(s) ignorée(s))` : 'Espace de travail restauré');
    return;
  }
  const res = ingestPayload(r.data, { kind: 'file', name: str(file.name, 60) });
  if (!res.ok) { toast(res.errors[0]); return; }
  dataChanged(`${fmt(res.results, 0)} résultats importés depuis ${file.name}`);
}
async function shareReport() {
  if (!hasData()) { toast('Aucune donnée à partager'); return; }
  const text = `${CONFIG.appName} — ${fmtDate(asOf())}\n` + movers().map(m => '• ' + plainText(m.html)).join('\n');
  if (navigator.share) {
    try { await navigator.share({ title: `${CONFIG.appName} · rapport`, text }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const ok = await copyText(text);
  toast(ok ? 'Synthèse copiée dans le presse-papiers' : 'Partage indisponible sur cet appareil');
}

const ACTIONS = {
  'more': () => { renderMoreSheet(); openSheet('sheet-more'); },
  'load-demo': () => { const r = loadDemo(); dataChanged(`Démo chargée : ${fmt(r.results, 0)} résultats`); },
  'paste': () => { renderPasteSheet(); openSheet('sheet-paste'); },
  'paste-example': () => { $('#pasteArea').value = JSON.stringify(EXAMPLE_PAYLOAD, null, 2); },
  'paste-load': () => {
    let data;
    try { data = JSON.parse($('#pasteArea').value); } catch (e) { renderPasteSheet(['JSON illisible : ' + str(e.message, 120)]); return; }
    const r = ingestPayload(data, { kind: 'paste', name: 'JSON collé' });
    if (!r.ok) { renderPasteSheet(r.errors); return; }
    closeSheet(); dataChanged(`${fmt(r.results, 0)} résultats chargés`);
  },
  'import-json': () => $('#fileJson').click(),
  'import-ws': () => $('#fileWs').click(),
  'export-ws': () => {
    download(`${CONFIG.exportFileName}-${todayStamp()}.json`, JSON.stringify(workspaceObject(), null, 2), 'application/json');
    state.exportedAt = Date.now(); updateNotice(); if (state.space === 'flux') renderSpace('flux'); toast('Espace exporté');
  },
  'clear-storage': btn => {
    if (btn.dataset.armed !== '1') {
      btn.dataset.armed = '1'; btn.lastChild.textContent = 'Confirmer ?';
      setTimeout(() => { if (btn.isConnected) { btn.dataset.armed = ''; btn.lastChild.textContent = 'Effacer cet appareil'; } }, 4000);
      return;
    }
    [CONFIG.storage.workspace, CONFIG.storage.theme, CONFIG.storage.eco].forEach(k => store.del(k));
    state.sources = []; state.settings = defaultSettings(); state.scenarios = SCENARIO_PRESETS.map(x => ({ ...x, w: { ...x.w } })); state.hidden = {};
    rebuildData(); dataChanged('Mémoire locale effacée');
  },
  'print': () => { if (FRAMED) { toast('Impression indisponible dans l’aperçu : ouvrez le fichier HTML dans Chrome'); return; } window.print(); },
  'share': () => shareReport(),
  'csv': () => exportCSV(),
  'copy-example': async () => { const ok = await copyText(JSON.stringify(EXAMPLE_PAYLOAD, null, 2)); toast(ok ? 'Exemple JSON copié' : 'Copie impossible'); },
  'more-log': () => { state.logLimit += 40; renderSpace('flux'); },
  'reset-scenario': () => { const sc = activeScenario(), p = SCENARIO_PRESETS.find(x => x.id === sc.id); if (p) sc.w = { ...p.w }; renderSpace('simulator'); scheduleSave(); toast('Pondérations réinitialisées'); },
  'delete-scenario': () => {
    const id = state.activeScenario;
    state.scenarios = state.scenarios.filter(x => x.id !== id || x.preset);
    state.compare = state.compare.filter(x => x !== id);
    state.activeScenario = 'balanced'; renderSpace('simulator'); scheduleSave(); toast('Scénario supprimé');
  },
  'save-scenario': () => {
    const name = str($('#scName').value, 32);
    if (!name) { toast('Donnez un nom au scénario'); $('#scName').focus(); return; }
    const sc = { id: 'u' + uid(), name, preset: false, w: { ...activeScenario().w } };
    state.scenarios.push(sc); state.activeScenario = sc.id;
    if (state.compare.length < 3) state.compare.push(sc.id);
    renderSpace('simulator'); scheduleSave(); toast(`Scénario « ${name} » créé`);
  },
  'open-pick': () => { renderPickSheet(); openSheet('sheet-pick'); },
  'duel-with': btn => {
    const id = btn.dataset.id, d = state.settings.duel.filter(x => state.data.models.has(x));
    if (!d.includes(id)) { if (d.length >= 3) d.pop(); d.push(id); }
    state.settings.duel = d; scheduleSave(); closeSheet(true); setSpace('duel');
  }
};

document.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;
  const d = t.dataset;
  if (d.go) { setSpace(d.go); return; }
  if (d.action) { const fn = ACTIONS[d.action]; if (fn) fn(t); return; }
  if (d.close !== undefined) { closeSheet(); return; }
  if (d.tableToggle) {
    const el = document.getElementById('tbl-' + d.tableToggle);
    if (!el) return;
    const open = !el.classList.contains('open');
    el.classList.toggle('open', open); t.setAttribute('aria-expanded', String(open)); t.textContent = open ? 'Masquer les données' : 'Voir les données';
    return;
  }
  if (d.kpi) { const open = !t.classList.contains('open'); t.classList.toggle('open', open); t.setAttribute('aria-expanded', String(open)); return; }
  if (d.model) { openModel(d.model); return; }
  if (d.cat) { state.settings.arenaCat = d.cat; state.settings.arenaBench = 'index'; renderSpace('arena'); scheduleSave(); return; }
  if (d.bench) { state.settings.arenaBench = d.bench; renderSpace('arena'); scheduleSave(); return; }
  if (d.traj) { state.settings.trajBench = d.traj; renderSpace('trajectory'); scheduleSave(); return; }
  if (d.axis) { state.settings.frontierAxis = d.axis; renderSpace('frontier'); scheduleSave(); return; }
  if (d.scenario) { state.activeScenario = d.scenario; renderSpace('simulator'); scheduleSave(); return; }
  if (d.compare) {
    const i = state.compare.indexOf(d.compare);
    if (i >= 0) state.compare.splice(i, 1); else { if (state.compare.length >= 3) state.compare.shift(); state.compare.push(d.compare); }
    renderSpace('simulator'); scheduleSave(); return;
  }
  if (d.themePick) { applyTheme(d.themePick); toast(THEMES.find(x => x.id === d.themePick).name); return; }
  if (d.srcRemove) { state.sources = state.sources.filter(x => x.id !== d.srcRemove); rebuildData(); dataChanged('Source retirée'); return; }
  if (d.logFilter) { state.logFilter = d.logFilter; state.logLimit = 40; renderSpace('flux'); return; }
  if (d.duelRemove) { state.settings.duel = duelIds().filter(x => x !== d.duelRemove); if (!state.settings.duel.length) state.settings.duel = []; renderSpace('duel'); scheduleSave(); return; }
  if (d.pick) {
    const sel = state.settings.duel.filter(x => state.data.models.has(x)), i = sel.indexOf(d.pick);
    if (i >= 0) sel.splice(i, 1); else { if (sel.length >= 3) sel.pop(); sel.push(d.pick); }
    state.settings.duel = sel; renderPickSheet(); renderSpace('duel'); scheduleSave();
    const again = document.querySelector(`[data-pick="${CSS.escape(d.pick)}"]`); if (again) again.focus({ preventScroll: true });
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'swHide') { state.settings.hideSuperseded = t.checked; renderSpace('arena'); scheduleSave(); }
  else if (t.id === 'swSuspect') { state.settings.excludeSuspect = t.checked; MEMO.clear(); refreshAll(); scheduleSave(); toast(t.checked ? 'Résultats suspects exclus des calculs' : 'Résultats suspects réintégrés'); }
  else if (t.id === 'swEco' || t.id === 'swEcoFlux') setEco(t.checked);
  else if (t.dataset.srcToggle) { const x = state.sources.find(s2 => s2.id === t.dataset.srcToggle); if (x) { x.active = t.checked; rebuildData(); dataChanged(t.checked ? 'Source activée' : 'Source désactivée'); } }
  else if (t.id === 'fileJson') { handleFile(t.files[0], 'data'); t.value = ''; }
  else if (t.id === 'fileWs') { handleFile(t.files[0], 'ws'); t.value = ''; }
  else if (t.id === 'thr') { renderTrajParts(); scheduleSave(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.weight) {
    const key = t.dataset.weight, v = +t.value;
    activeScenario().w[key] = v;
    const o = document.getElementById('wo-' + key); if (o) o.textContent = String(v);
    t.style.setProperty('--p', v * 20 + '%');
    renderSimResults(); scheduleSave();
  } else if (t.id === 'thr') {
    const v = +t.value, { bid, unit, dec } = trajContext();
    state.settings.thresholds[bid] = v;
    t.style.setProperty('--p', ((v - +t.min) / (+t.max - +t.min) * 100).toFixed(1) + '%');
    $('#thrOut').textContent = fmt(v, dec) + unit;
    renderTrajPartsThrottled();
  }
});
const renderTrajPartsThrottled = debounce(renderTrajParts, 120);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && openSheetId) { closeSheet(); return; }
  if (e.key === 'Tab' && openSheetId) {
    const f = $$('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])', document.getElementById(openSheetId)).filter(x => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});
$('#scrim').addEventListener('click', () => closeSheet());
$('#btnTheme').addEventListener('click', () => { renderMoreSheet(); openSheet('sheet-more'); setTimeout(() => { const l = $('#themes-label'); if (l) l.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' }); }, 120); });
// Swipe a sheet down to close it
$$('.sheet').forEach(sh => {
  let y0 = null, dy = 0;
  const start = e => { if (e.target.closest('button')) return; y0 = e.clientY; dy = 0; sh.style.transition = 'none'; };
  const move = e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = `translateY(${dy}px)`; };
  const end = () => { if (y0 == null) return; sh.style.transition = ''; if (dy > 90) closeSheet(); else sh.style.transform = ''; y0 = null; };
  [sh.querySelector('.sheet-grip'), sh.querySelector('.sheet-head')].forEach(h => { h.style.touchAction = 'none'; h.addEventListener('pointerdown', start); });
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
});
// Drag & drop of a JSON file (desktop)
document.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
document.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) { e.preventDefault(); handleFile(f, 'auto'); } });
// Background interactions
window.addEventListener('pointermove', e => { BG.pointer.x = (e.clientX / innerWidth - .5) * 2; BG.pointer.y = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
window.addEventListener('deviceorientation', e => { if (e.gamma == null) return; BG.pointer.x = clamp(e.gamma / 30, -1, 1) * .6; BG.pointer.y = clamp((e.beta - 45) / 30, -1, 1) * .4; }, { passive: true });
window.addEventListener('scroll', hideTip, { passive: true });
document.addEventListener('pointerdown', e => { if (!e.target.closest('.chart')) hideTip(); }, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) stopLoop(); else startLoop(); });
let lastW = innerWidth;
window.addEventListener('resize', debounce(() => {
  bgResize(); updateDock();
  if (Math.abs(innerWidth - lastW) > 8) { lastW = innerWidth; renderSpace(state.space); }
}, 160));
// Agent bridge: postMessage
window.addEventListener('message', e => {
  const d = e.data;
  if (!d || typeof d !== 'object' || d.type !== 'octant:ingest') return;
  const r = ingestPayload(d.payload, { kind: 'agent', name: typeof d.name === 'string' ? str(d.name, 60) : 'Agent' });
  if (r.ok) dataChanged(`Agent : ${fmt(r.results, 0)} résultats reçus`); else toast('Envoi refusé : ' + r.errors[0]);
  try { if (e.source && e.source.postMessage) e.source.postMessage({ type: 'octant:ack', ok: r.ok, errors: r.errors }, e.origin && e.origin !== 'null' ? e.origin : '*'); } catch (_) { /* ignore */ }
});
window.addEventListener('error', () => toast('Une erreur inattendue est survenue — rechargez la page si l’affichage semble figé.'));

// ===== INIT =====
function ingestFromHash() {
  const m = /[#&]payload=([A-Za-z0-9_\-+/=]+)/.exec(location.hash);
  if (!m) return;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/'), pad = b64 + '='.repeat((4 - b64.length % 4) % 4);
    const text = new TextDecoder().decode(Uint8Array.from(atob(pad), c => c.charCodeAt(0)));
    const r = ingestPayload(JSON.parse(text), { kind: 'agent', name: 'Lien agent' });
    setTimeout(() => toast(r.ok ? `Lien agent : ${fmt(r.results, 0)} résultats reçus` : 'Lien agent refusé : ' + r.errors[0]), 600);
  } catch (e) { setTimeout(() => toast('Lien agent illisible'), 600); }
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
}
function checkFonts() {
  if (!document.fonts) { state.env.fonts = 'off'; return; }
  Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 5000))]).then(() => {
    let ok = false;
    document.fonts.forEach(f => { if (f.family.replace(/["']/g, '') === 'Unbounded' && f.status === 'loaded') ok = true; });
    state.env.fonts = ok ? 'ok' : 'off';
    if (state.space === 'flux') renderSpace('flux');
    else if (ok) renderSpace(state.space);
  });
}
function init() {
  $('#brandName').textContent = CONFIG.appName;
  buildDock();
  let restored = false;
  const raw = store.get(CONFIG.storage.workspace);
  if (raw) { try { restored = applyWorkspace(JSON.parse(raw)).ok; } catch (e) { restored = false; } }
  if (!restored) loadDemo();
  const th = store.get(CONFIG.storage.theme);
  if (th && THEMES.some(t => t.id === th)) state.theme = th;
  const eco = store.get(CONFIG.storage.eco);
  if (eco != null) state.eco = eco === '1';
  document.documentElement.classList.toggle('eco', state.eco);
  applyTheme(state.theme, { persist: false });
  ingestFromHash();
  const route = (/^#\/?([a-z]+)$/.exec(location.hash) || [])[1];
  renderStatus();
  setSpace(route && SPACE_BY_ID[route] ? route : 'pulse', { push: false });
  updateNotice();
  checkFonts();
  initBackground();
  window.OCTANT = Object.freeze({
    version: '1.0.0', schema: CONFIG.schema,
    ingest(payload, name) { const r = ingestPayload(payload, { kind: 'agent', name: typeof name === 'string' ? str(name, 60) : 'Agent' }); if (r.ok) dataChanged(`Agent : ${fmt(r.results, 0)} résultats reçus`); return { ok: r.ok, errors: r.errors }; },
    example() { return JSON.parse(JSON.stringify(EXAMPLE_PAYLOAD)); }
  });
}
init();
