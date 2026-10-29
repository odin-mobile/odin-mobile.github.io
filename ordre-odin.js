/* ══════════════════════════════════════════════════════════════
   ODIN MOBILE — l'unique ecriture de l'appli (2026-10-26)
   Depose un ordre dans la boite aux lettres ntfy du PC :
   · « ronde » : lancer la ronde d'un agent ;
   · « case »  : cocher ou decocher une tache des recaps (designee par une empreinte opaque) ;
   · « pause » (2026-10-29) : mettre en pause (actif: false) ou reprendre (actif: true) un agent ;
   · « relais » (2026-10-29) : enregistrer « accord » ou « refus » sur un resultat de Relais a
     relire — le PC l'ecrit dans un journal, il n'applique JAMAIS rien.
   · l'ordre est TOUJOURS chiffre avec la phrase secrete (sans elle, le PC l'ignore) ;
   · l'adresse de la boite vient de l'etat dechiffre, jamais du code public ;
   · le PC verifie tout (agent autorise, ordre recent, jamais deux fois) : voir
     agent-passerelle-mobile/boite.py.
   ══════════════════════════════════════════════════════════════ */

import { chiffrer } from './crypto-odin.js';

const BOITE = /^odin-[0-9a-f]{24}$/;
const AGENT = /^[a-z0-9-]{2,30}$/;
const REF = /^[0-9a-f]{16}$/;
const NUMERO = /^[0-9a-f]{24}$/;
// Meme format que relais_mobile.TACHE cote PC : 2026-10-29-1816-tisseur-t1, 2026-10-25-2145-t2
const TACHE = /^\d{4}-\d{2}-\d{2}-\d{4}-[a-z0-9]{1,24}(?:-[a-z0-9]{1,24}){0,3}$/;
const MOTEURS = ['gemini', 'chatgpt'];
const DECISIONS = ['accord', 'refus'];

export function numero() {
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
}

/** L'ordre tel qu'il part : seuls les champs connus, verifies. Leve une erreur sinon. */
export function preparer(ordre) {
  let o;
  if (ordre?.ordre === 'ronde' && AGENT.test(String(ordre.agent))) o = { v: 1, ordre: 'ronde', agent: ordre.agent };
  else if (ordre?.ordre === 'case' && REF.test(String(ordre.ref)) && typeof ordre.fait === 'boolean') {
    o = { v: 1, ordre: 'case', ref: ordre.ref, fait: ordre.fait };
  } else if (ordre?.ordre === 'pause' && AGENT.test(String(ordre.agent)) && typeof ordre.actif === 'boolean') {
    o = { v: 1, ordre: 'pause', agent: ordre.agent, actif: ordre.actif };
  } else if (ordre?.ordre === 'relais' && TACHE.test(String(ordre.tache)) && MOTEURS.includes(ordre.moteur)
             && DECISIONS.includes(ordre.decision)) {
    o = { v: 1, ordre: 'relais', tache: ordre.tache, moteur: ordre.moteur, decision: ordre.decision };
  } else throw new Error('ordre invalide');
  // Un renvoi garde son numero et sa date : le PC ne l'appliquera jamais deux fois.
  o.id = NUMERO.test(String(ordre.id)) ? ordre.id : numero();
  o.emis = typeof ordre.emis === 'string' && !Number.isNaN(Date.parse(ordre.emis)) ? ordre.emis : new Date().toISOString();
  return o;
}

/** Envoie l'ordre. Rend l'ordre parti si ntfy l'a accepte (le PC le lira s'il est allume et connecte). */
export async function envoyerOrdre(boite, ordre, phrase) {
  if (!BOITE.test(String(boite))) throw new Error('ordre invalide');
  const o = preparer(ordre);
  const paquet = await chiffrer(o, phrase);
  const r = await fetch('https://ntfy.sh/' + boite, {
    method: 'POST', body: JSON.stringify(paquet), credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
  });
  if (!r.ok) throw new Error(`boîte injoignable (${r.status})`);
  return o;
}

export const envoyerRonde = (boite, agent, phrase) => envoyerOrdre(boite, { ordre: 'ronde', agent }, phrase);
