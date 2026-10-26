/* ══════════════════════════════════════════════════════════════
   ODIN MOBILE — l'unique ecriture de l'appli (2026-10-26)
   Depose un ordre « lancer la ronde de tel agent » dans la boite aux lettres ntfy du PC.
   · l'ordre est TOUJOURS chiffre avec la phrase secrete (sans elle, le PC l'ignore) ;
   · l'adresse de la boite vient de l'etat dechiffre, jamais du code public ;
   · le PC verifie tout (agent autorise, ordre recent, jamais deux fois) : voir
     agent-passerelle-mobile/boite.py.
   ══════════════════════════════════════════════════════════════ */

import { chiffrer } from './crypto-odin.js';

const BOITE = /^odin-[0-9a-f]{24}$/;
const AGENT = /^[a-z0-9-]{2,30}$/;

function numero() {
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
}

/** Envoie l'ordre. Rend true si ntfy l'a accepte (le PC le lira s'il est allume et connecte). */
export async function envoyerRonde(boite, agent, phrase) {
  if (!BOITE.test(String(boite)) || !AGENT.test(String(agent))) throw new Error('ordre invalide');
  const paquet = await chiffrer({ v: 1, ordre: 'ronde', agent, id: numero(), emis: new Date().toISOString() }, phrase);
  const r = await fetch('https://ntfy.sh/' + boite, {
    method: 'POST', body: JSON.stringify(paquet), credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
  });
  if (!r.ok) throw new Error(`boîte injoignable (${r.status})`);
  return true;
}
