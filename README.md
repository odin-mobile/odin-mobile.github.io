# ODIN Mobile

Le dernier état connu d'ODIN (le centre de commandement personnel d'Amir), sur téléphone, **en lecture seule**.

- L'appli ne lit qu'un seul fichier : `etat.chiffre.json`, **chiffré** (AES-256-GCM, clé dérivée d'une phrase secrète par PBKDF2-SHA-256, 600 000 itérations). Sans la phrase, il est illisible.
- Aucune clé d'IA, aucune action possible, aucun appel vers un autre site (Content-Security-Policy stricte).
- L'état est publié depuis le PC par l'Agent 26 « Passerelle mobile », seulement quand il change.

Polices : Saira, Orbitron, IBM Plex Mono — SIL Open Font License 1.1 (voir `fonts/`).

## Sur le téléphone

### 1. Installer

1. Sur Android, ouvrir https://odin-mobile.github.io/ dans Chrome.
2. Ouvrir le menu ⋮ (en haut à droite).
3. Choisir « Ajouter à l'écran d'accueil ».
4. Si Android dit « appli déjà installée », désinstaller d'abord l'ancienne icône, puis recommencer.

### 2. Déverrouiller

1. Taper la phrase secrète une seule fois : elle reste ensuite sur ce téléphone.
2. Cette phrase ne se trouve que sur le PC d'Amir.

### 3. Hors ligne

1. Sans connexion, l'appli affiche le dernier état gardé en mémoire, avec le badge « HORS LIGNE ».
2. Au-delà de 2 heures sans nouvel état, un bandeau « état ancien » apparaît.
3. Cela veut souvent dire que le PC est éteint.

### 4. Oublier la phrase

1. En bas de l'écran Vault, appuyer sur le bouton « Oublier la phrase ».
2. La phrase sera redemandée la prochaine fois.
