# ODIN Mobile

Le dernier état connu d'ODIN (le centre de commandement personnel d'Amir), sur téléphone, **en lecture seule**.

- L'appli ne lit qu'un seul fichier : `etat.chiffre.json`, **chiffré** (AES-256-GCM, clé dérivée d'une phrase secrète par PBKDF2-SHA-256, 600 000 itérations). Sans la phrase, il est illisible.
- Aucune clé d'IA, aucune action possible, aucun appel vers un autre site (Content-Security-Policy stricte).
- L'état est publié depuis le PC par l'Agent 26 « Passerelle mobile », seulement quand il change.

Polices : Saira, Orbitron, IBM Plex Mono — SIL Open Font License 1.1 (voir `fonts/`).
