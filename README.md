# ODIN Mobile

Le dernier état connu d'ODIN (le centre de commandement personnel d'Amir), sur téléphone, en lecture, avec **deux actions à distance** : lancer la ronde d'un agent, cocher une tâche des récaps.

- L'appli ne lit qu'un seul fichier : `etat.chiffre.json`, **chiffré** (AES-256-GCM, clé dérivée d'une phrase secrète par PBKDF2-SHA-256, 600 000 itérations). Sans la phrase, il est illisible.
- **Lancer une ronde** (fiche d'un agent, depuis la liste ou la scène 3D) : l'appli dépose un ordre **chiffré avec la même phrase** dans une boîte aux lettres ntfy.sh dont l'adresse n'est connue que de l'état chiffré. Le PC, s'il est allumé et connecté, le lit, vérifie tout (agent autorisé, ordre de moins de 2 h, jamais deux fois) et lance la ronde. Sans la phrase, un ordre est ignoré.
- Un agent qui passe par une **clé d'API** demande un second appui (« coûte des jetons ») ; les Relais, qui utilisent les abonnements (Gemini Pro, ChatGPT gratuit), l'indiquent sans confirmation.
- **Cocher une tâche** (onglet Synthèse) : même boîte, ordre chiffré « case ». La tâche reste « en attente du PC » ; le téléphone renvoie l'ordre à chaque ouverture tant que le PC ne l'a pas appliqué (valable 7 jours). Le PC coche la case dans le récap Obsidian (copie avant, journal), et ODIN la voit cochée.
- **⟳ Actualiser** (en haut) : recharge l'état et demande au PC d'en publier un frais.
- Aucune clé d'IA dans l'appli ; aucun autre site contacté que ntfy.sh, et seulement pour cet ordre (Content-Security-Policy stricte).
- L'état est publié depuis le PC par l'Agent 26 « Passerelle mobile », seulement quand il change.

Polices : Saira, Orbitron, IBM Plex Mono — SIL Open Font License 1.1 (voir `fonts/`).

**OCTANT** (ODIN 5.15) : l'observatoire des benchmarks IA, alimenté par l'Observatoire d'ODIN (fichier chiffré `octant.chiffre.json`, même phrase) — https://odin-mobile.github.io/octant/ (dossier `octant/`, sa propre icône).

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

## Pause d'un agent et décisions de Relais (2026-10-29)

### 1. Mettre un agent en pause ou le reprendre
1. Ouvrir la fiche d'un agent (liste ou scène 3D).
2. Appuyer sur « Mettre en pause » (ou « Reprendre » s'il est en pause).
3. Pour le Notaire, le Canari et le Vigile des versions, un second appui confirme (« la surveillance s'arrête »).
4. Le bouton affiche « en attente du PC » ; 1 à 2 minutes plus tard, si le PC est allumé, l'agent passe « EN PAUSE » (ou repart).
5. La Passerelle et le Métronome ne se mettent jamais en pause depuis le téléphone. Un refus du PC s'affiche en clair sous le bouton.

### 2. Donner sa décision sur un résultat de Relais
1. Ouvrir la fiche du Relais Gemini ou du Relais ChatGPT.
2. Le bloc « Résultats à relire » liste chaque résultat : titre, moteur, date, nombre de lignes et de fichiers (jamais de code).
3. Appuyer sur « Accord pour relecture » ou « Refus », puis encore une fois pour confirmer.
4. Rien n'est appliqué : la décision est seulement enregistrée sur le PC. Claude la lit au début de la session suivante (accord : il relit, teste puis applique ; refus : il range le résultat).


## Portraits, pôles et fiche agent (2026-11-02)

### 1. Portraits
1. Les images sont dans le dossier `portraits/`, en deux tailles par agent : `<clé>.jpg` (720 px, pour la fiche) et `<clé>-mini.jpg` (160 px, pour la liste).
2. Ce sont les mêmes images que sur ODIN (PC). Elles ne sont pas chiffrées : elles sont publiques sur le site, comme le reste de l'appli.
3. Dans la liste, le portrait est rond, entouré d'un anneau et d'un point à la couleur du verdict. Un agent en pause est grisé.
4. Si l'agent n'a pas de portrait, ou si l'image ne charge pas (hors ligne, pas encore en cache), l'ancienne pastille à deux lettres prend la place.
5. Pour ajouter un agent :
   1. ajouter sa clé (l'identifiant de l'agent) dans la liste `PORTRAITS` de `app.js` ;
   2. déposer les deux images `<clé>.jpg` et `<clé>-mini.jpg` dans `portraits/` ;
   3. ajouter `portraits/<clé>-mini.jpg` dans la liste `MINIS` de `sw.js`, puis changer la `VERSION` du service worker.

### 2. Liste des agents
1. La liste commence par la rubrique « À traiter » : les agents au verdict grave, pour qu'une alerte ne se perde pas.
2. Viennent ensuite les 5 pôles : Pilotage, Atelier du code, Vault & idées, PC & vie perso, Autres.
3. Dans chaque pôle, les agents en pause passent en dernier.
4. Une rubrique vide n'apparaît pas.
5. Les filtres (Tous, À traiter, avec IA, sans IA) ne changent pas : ils décident quels agents sont montrés, puis le classement s'applique.
6. Dans un pôle, le nom du pôle n'est pas répété sur chaque carte, puisqu'il est déjà dans le titre.

### 3. Rubriques repliables
1. Chaque titre de rubrique est un bouton : un appui replie ou déplie la rubrique.
2. Le titre montre le nombre d'agents et une flèche (▾ ouverte, ▸ repliée).
3. Les rubriques repliées sont mémorisées sur ce téléphone, et retrouvées à la prochaine ouverture.
4. Au début, tout est déplié.

### 4. Fiche agent
1. La fiche s'ouvre comme avant (liste ou scène 3D).
2. Le grand portrait, carré, est au-dessus du nom (360 px de large au plus), avec le point du verdict dans le coin.
3. Sans portrait, la pastille à deux lettres reste à côté du nom, comme avant.
4. Le reste de la fiche ne change pas.

### 5. Hors ligne
1. Les miniatures sont mises en cache à l'installation : la liste a ses portraits sans connexion.
2. Si une miniature n'a pas pu être récupérée, l'installation continue quand même, et la pastille à lettres sert de repli.
3. Les grandes images sont gardées en cache à la première ouverture d'une fiche : hors ligne, elles ne s'affichent que pour les agents déjà ouverts une fois avec du réseau.
4. Le service worker passe à la version v12 (`odin-mobile-v12`) : l'ancien cache est supprimé au premier lancement.


## Modèles : quel modèle pour ma tâche ? (2026-11-21, ODIN 5.13)

Avant une tâche en IA, l'onglet **MODÈLES** (ou le bouton « Quel modèle pour ma tâche ? » de Command) montre les
benchmarks relevés chaque semaine par l'Agent 39 « L'Observatoire », avec la même logique que l'écran Benchmarks d'ODIN.

### 1. Lire l'écran
1. En haut : « Relevé du … » ; au-delà de 10 jours, un bandeau orange « Relevé ancien » ; hors ligne, « dernière version reçue ».
2. Choisir sa tâche : six pastilles (Coder, Agents qui pilotent un ordinateur, Raisonnement et science, Écrire et converser, Images et vidéo, Petit prix et gros volume) ; les autres et la vue d'ensemble sont sous « Plus de tâches ». Le choix est gardé.
3. Le tableau : une ligne par modèle (nom fixe à gauche), une colonne par benchmark ; faire glisser vers la droite. Chaque case donne la valeur **brute** dans son unité, le niveau de raisonnement, le rang (« n° 1 » surligné, « = 1er » à égalité) et une pastille de nature : ● mesure indépendante, ◑ préférence humaine, ◐ annonce de l'éditeur (jamais classée). « non classé » : mesuré à un autre niveau que le protocole de référence. « au plafond » : la colonne ne départage plus. Jamais de note sur 100.
4. Les raccourcis (Le meilleur, Meilleur rapport qualité/prix, Le moins cher correct) : calculés par l'Observatoire, chacun avec sa règle écrite et le coût d'une tâche type (10 000 jetons lus, 2 000 écrits).
5. « Nouveautés peu mesurées » : les modèles de moins de 45 jours, chaque chiffre avec sa nature, et pourquoi une case est vide.
6. Toucher le nom d'une colonne (ou une ligne de « Comprendre les benchmarks ») ouvre la fiche : ce qu'il compare, exemple, utile pour, limites, protocole de référence.

### 2. D'où viennent les données
- Un second fichier chiffré, `modeles.chiffre.json` (même phrase, même chiffrement que l'état), publié par la Passerelle **seulement quand le relevé change** (environ une fois par semaine). L'appli le lit après l'état, sans ralentir l'ouverture.
- Hors ligne, le service worker (v19) garde la dernière version reçue, avec sa date.
- Code : `modeles.js` (logique testée sous Node, affichage en `textContent` seulement).

### 3. Tests (sur le PC, dossier `tests/`, non publié)
`python -m unittest discover -s tests` : logique (`modeles-essai.mjs`) et navigateur (`navigateur.cjs --essais`, émulation téléphone, données d'essai chiffrées sur place avec une phrase d'essai). `node tests/navigateur.cjs --captures <dossier> --etat <clair> --modeles <clair>` fait les captures 390 × 844 dans les trois thèmes.
