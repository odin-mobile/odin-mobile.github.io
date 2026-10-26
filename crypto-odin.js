/* ══════════════════════════════════════════════════════════════
   ODIN MOBILE — dechiffrement de l'etat (WebCrypto, rien d'autre)
   Format ecrit par la Passerelle (agent-passerelle-mobile/passerelle.py) :
     { v:1, alg:"AES-256-GCM", kdf:"PBKDF2-SHA-256", iter, sel, nonce, donnees }
   cle = PBKDF2-SHA-256(phrase, sel, iter) ; donnees = chiffre + etiquette GCM.
   Module sans DOM : le meme fichier sert au navigateur et au test node.
   ══════════════════════════════════════════════════════════════ */

const ITER_MIN = 100_000, ITER_MAX = 5_000_000;   // garde-fou : un fichier bizarre ne bloque pas le telephone

const octets = s => Uint8Array.from(atob(String(s)), c => c.charCodeAt(0));

/** Erreur « phrase incorrecte » (ou fichier altere : GCM refuse les deux de la meme facon). */
export class PhraseIncorrecte extends Error {}

export async function dechiffrer(paquet, phrase) {
  if (!paquet || paquet.v !== 1 || paquet.alg !== 'AES-256-GCM' || paquet.kdf !== 'PBKDF2-SHA-256') {
    throw new Error('format d’état inconnu');
  }
  const iter = Number(paquet.iter);
  if (!Number.isInteger(iter) || iter < ITER_MIN || iter > ITER_MAX) throw new Error('format d’état inconnu');
  const subtle = globalThis.crypto.subtle;
  const base = await subtle.importKey('raw', new TextEncoder().encode(phrase), 'PBKDF2', false, ['deriveKey']);
  const cle = await subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: octets(paquet.sel), iterations: iter },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  let clair;
  try {
    clair = await subtle.decrypt({ name: 'AES-GCM', iv: octets(paquet.nonce) }, cle, octets(paquet.donnees));
  } catch {
    throw new PhraseIncorrecte('phrase incorrecte');
  }
  return JSON.parse(new TextDecoder().decode(clair));
}

/* ── Chiffrer un ordre (2026-10-26) : meme format et memes reglages que l'etat publie par le PC,
      pour que la Passerelle (boite.py) le relise avec la meme phrase. ── */
export const ITER_ORDRE = 600_000;
const base64 = u8 => btoa(String.fromCharCode(...u8));

export async function chiffrer(objet, phrase, iter = ITER_ORDRE) {
  const subtle = globalThis.crypto.subtle;
  const sel = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const base = await subtle.importKey('raw', new TextEncoder().encode(phrase), 'PBKDF2', false, ['deriveKey']);
  const cle = await subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations: iter },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const chiffre = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cle,
    new TextEncoder().encode(JSON.stringify(objet))));
  return { v: 1, alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA-256', iter, sel: base64(sel), nonce: base64(nonce), donnees: base64(chiffre) };
}
