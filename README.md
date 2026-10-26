# ODIN Mobile

Le dernier état connu d'ODIN (le centre de commandement personnel d'Amir), sur téléphone, en lecture, avec **une seule action** : lancer la ronde d'un agent.

- L'appli ne lit qu'un seul fichier : `etat.chiffre.json`, **chiffré** (AES-256-GCM, clé dérivée d'une phrase secrète par PBKDF2-SHA-256, 600 000 itérations). Sans la phrase, il est illisible.
- **Lancer une ronde** (fiche d'un agent, depuis la liste ou la scène 3D) : l'appli dépose un ordre **chiffré avec la même phrase** dans une boîte aux lettres ntfy.sh dont l'adresse n'est connue que de l'état chiffré. Le PC, s'il est allumé et connecté, le lit, vérifie tout (agent autorisé, ordre de moins de 2 h, jamais deux fois) et lance la ronde. Sans la phrase, un ordre est ignoré.
- Un agent avec IA demande un second appui (« coûte des jetons »).
- Aucune clé d'IA dans l'appli ; aucun autre site contacté que ntfy.sh, et seulement pour cet ordre (Content-Security-Policy stricte).
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

## Compétences et thèmes (2026-10-18)

### 1. Compétences

1. L'onglet SKILLS (le 5e de la barre du bas) liste les fiches du dossier AI/Compétences du vault.
2. Chaque ligne montre le vrai nom de la compétence, avec ses tirets (c'est celui qui sert à la lancer), puis son titre lisible dessous, une pastille de l'IA (Claude, Gemini, Les deux) et une pastille de statut.
3. Toucher une ligne la déplie : résumé, IA, où elle vit, statut complet.
4. Les filtres sont Toutes / Claude / Gemini / Les deux. Claude et Gemini incluent aussi les compétences faites pour les deux.
5. La recherche marche par nom, usage ou IA, sans tenir compte des accents.
6. Les données arrivent avec l'état chiffré, mises à jour toutes les 30 minutes.

### 2. Thèmes

1. Trois pastilles se trouvent en haut à droite de l'écran.
2. Neon est le thème par défaut ; Clair correspond à ODIN White ; Tokyo correspond à Dark Tokyo Cyberpunk.
3. Le choix est gardé sur ce téléphone.
4. Les scènes 3D suivent le thème.
