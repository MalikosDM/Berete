# Berete Jewellers

Site de la maison Berete Jewellers (Dubaï) : Vite + React + TypeScript, Tailwind, GSAP + Lenis.
API : Express + Prisma + PostgreSQL (catalogue, admin, formulaires).

## Lancer le site en local

```sh
npm install
npm run db:local        # crée puis démarre une base PostgreSQL locale (.local/postgres, port 5433)
cp .env.example .env    # puis choisir ADMIN_PASSWORD
npm run db:migrate
npm run dev:server      # API sur http://localhost:3001
npm run dev             # site sur http://localhost:5173
```

Le site s'affiche aussi sans l'API : il utilise alors le catalogue intégré.
Safari avec un bloqueur de pubs (uBlock…) peut bloquer certains fichiers en mode développement : tester dans Chrome, ou désactiver le bloqueur pour `localhost`.

## Les contenus

- **Une seule source de données** : `src/data/` — `catalogue.ts` (joueurs, stories), `pieces.ts`
  (les pièces et les écrins), `collections.ts` (une collection par type de bijou), `relations.ts`
  (liens entre stories, joueurs et pièces).
- **Les pièces** : 29 pièces publiées, trouvées dans les stories, les dossiers et les photos HD de Yoni. Leurs textes
  sont des brouillons (`draft: true`, « Brouillon » dans l'admin) à faire valider par le client ; aucun chiffre n'est inventé.
- **Pièces non publiées** (`published: false`, case « Publiée sur le site » dans l'admin) : gardées dans la base mais
  invisibles partout sur le site (listes, pièces similaires, stories, écrins, plan du site, aperçus ; `publicCatalogue`
  dans `src/data/relations.ts`, aussi appliqué par l'API `/api/catalogue`). Leur adresse redirige (301) vers la page de
  leur joueur s'il a encore des pièces, sinon vers `/creations` ; un joueur dont toutes les pièces sont non publiées sort
  du Cercle (sa page mène à `/players`). Le serveur le fait depuis la base ; pour Vercel, `npm run redirects` écrit les
  mêmes redirections dans `vercel.json`. Ce sont les 10 pièces retirées par Yoni (`REMOVED_PIECES`) et les 15
  **brouillons** créés depuis ses dossiers de photos qui ne correspondent à aucune pièce (`DRAFTS` dans
  `src/data/pieces.ts` : titre provisoire = nom du dossier, « Made for » à valider, galerie déjà remplie).
- **L'univers de chaque pièce** (`theme` d'une pièce, `src/data/themes.ts`, dessiné par `src/components/Universe.tsx`,
  `src/components/universe/fx.ts` et `.universe` dans `src/index.css`) : la page garde sa structure, mais on entre dans le
  monde de la pièce.
  - **Fond plein écran** : un fond IA quand il existe (`npm run universes` : les propositions du disque externe agrandies à
    2560 px par `scripts/universe-upscale.py` (Swin2SR, torch + transformers), puis AVIF/WebP en 3 largeurs et un cadrage
    portrait pour téléphone, `src/data/universes.generated.json`), sinon une composition (couleurs, lumière, texture,
    brume, particules). Il recule dans la profondeur pendant le scroll ; un voile garde les textes en AA.
  - **Police du titre** : 13 polices libres (OFL, `public/fonts/universe`, licences dans `LICENSES.txt`), annoncées par un
    `<link rel="preload">` sur la page de la pièce (aucun saut du titre).
  - **Entrée cinématique** (1 à 2 s, CSS, `[data-entering]`) : jouée à la première visite de la pièce dans la session,
    jamais au retour ; elle attend la fin de l'intro du site (`html[data-intro]`) ; les textes sont lisibles tout de suite.
  - **Effets** : un canvas chargé après le contenu (braises, éclairs, lignes de vitesse, papillons, confettis, pétales,
    étoiles, poussière, éclats), qui répond à la vitesse du scroll, moins de la moitié des particules sur téléphone ; plus
    des couches CSS (brume, reflets irisés, pluie, vingt étoiles de l'Inter) et l'impact à l'ouverture d'une photo.
  - Tout se règle dans l'admin (« Univers de la page » : univers, fond IA ou image envoyée, police, entrée, effets,
    filigrane, couleurs, texture, lumière, avec un aperçu et « Rejouer l'entrée »). Sans thème : l'univers de la Maison.
    L'accent reste l'or rose ; rien ne bouge avec « réduire les animations ».
- **Le bouton de chaque pièce** est « Enter the World » / « Entrer dans l'univers » (cartes, sélection, écrins).
  La ligne « Precious Materials » (avant « Metal and stones ») de la fiche technique (`seen` dans `src/data/pieces.ts`) dit seulement ce que les photos
  montrent (couleur du métal, tailles et couleurs des pierres, sans carats ni poids) ; elle est absente quand les photos
  ne permettent rien de sûr, et tant que la pièce est en brouillon la page précise « d'après les photos, à confirmer ».
- **« The details »** (`details` d'une pièce) : un symbole par ligne, avec la photo de la pièce qui le montre (elle
  s'ouvre en grand au clic). Rempli pour la bague Inter d'après la réunion avec Yoni. Dans l'admin : « Titre | Texte |
  n° de la photo » (1 = photo d'ouverture, 2 = 1re photo des détails…).
- **L'accueil** : le film, puis le « Special project » (les bagues Inter et VfB côte à côte, `SPECIAL_PROJECT` dans
  `src/data/pieces.ts` : elles s'ouvrent sur le trophée au survol ou avec « Lift the top »), les collections, la capsule à
  la une (si elle n'est pas déjà l'une des deux bagues), la sélection, le mur des joueurs. La barre des stories se cache
  quand on descend, revient dès qu'on remonte (pas quand le film glisse tout seul vers une phrase) et jamais sur le pied
  de page. Chaque phrase du film a un halo sombre derrière elle.
- **Les joueurs** : un mur de portraits (photo, nom, club, Instagram) sur `/players` et sur l'accueil. La photo : celle
  de l'admin (« Photo de profil » ; par défaut sa photo en maillot), sinon sa photo en maillot, sinon la meilleure photo
  des stories recadrée sur la personne (`PORTRAITS` dans `scripts/piece-media.mjs`), sinon ses initiales en or rose. Les
  photos en maillot envoyées par Yoni (disque externe, `00 Contexte Yoni/Photos joueurs en maillot`, `BERETE_PLAYERS_DIR`)
  sont choisies et recadrées en 4:5 dans `scripts/player-media.mjs` (la première = le portrait, les autres vont dans
  « In Pictures » sur la page du joueur), avec un même étalonnage léger pour toute la série :
  `npm run import-media -- --only=players` → `public/media/players/<slug>.webp`, `<slug>-2.webp`… (1080 × 1350 au plus).
  Le pseudo Instagram se met dans l'admin (aucun n'est rempli d'office).
- **La Maison** (`/about`, `src/pages/About.tsx`) : l'histoire de Yoni Berete en 12 chapitres, son texte français tel
  quel (`src/i18n/house/fr.ts`, tiré de son fichier), traduit dans les autres langues (`src/i18n/house/<langue>.ts`), et
  ses trois citations (01 L'Identité, 02 La Philosophie, 03 Le Parcours). Chaque chapitre, chaque citation et le haut de
  la page ont une place pour une photo personnelle (`src/data/house.ts`), invisible tant qu'elle est vide : onglet « La
  Maison » de l'admin, ou un fichier `portrait.jpg`, `citation-1.jpg`, `chapitre-03.jpg`… dans
  `Berete - La Maison` (disque externe) puis `npm run import-media -- --only=house`.
- **Signature Trunks** (`/boxes`) : l'écrin Signature Trunk en tête (`FEATURED_BOX`, ses 10 photos qui s'ouvrent en
  grand), puis les autres écrins ; « Commission Your Signature Trunk » ouvre WhatsApp, le message déjà écrit.
- **Les collections** : `/creations/pendants`, `/chains`, `/rings`, `/watches`, `/bracelets`.
  L'accueil montre une tuile par type qui a au moins 2 pièces.
- **Les médias** sont produits par `npm run import-media`, qui relit les dossiers du disque externe
  `/Volumes/Disque externe` (`BERETE_DISK` pour un autre chemin : `Berete - Stories` et le logo qui s'y trouve,
  `Berete - Envoi ODORO`, `Berete - Boutique Bijoutier (export ODORO)`, `Berete - Croquis`, `Berete - La Maison`,
  `Berete - Dossiers icloud`). Sans le disque, il s'arrête sans rien modifier (un dossier manquant viderait sa partie de
  `public/media/`). Il écrit `public/media/` ainsi que `src/data/stories.generated.json` et `src/data/media.generated.json`.
  Les photos principales tirées des stories (image d'une vidéo, recadrage sur le bijou) et les photos des écrins
  sont décrites dans `scripts/piece-media.mjs`.
  Les croquis (`Berete - Croquis`, un fichier `<slug-de-la-pièce>.jpg` par pièce, les fichiers qui commencent par `_` sont
  ignorés) deviennent `public/media/sketches/<slug>.webp` et l'étape « Sketch » de « How it was made », sauf pour une
  pièce qui a déjà la sienne (`src/data/pieces.ts`) ; dans la page, les photos des étapes s'ouvrent en grand au clic.
  On peut le relancer après avoir ajouté des fichiers : rien n'est créé en double, seuls les nouveaux fichiers sont traités.
  Le dossier « 99 - NE PAS ENVOYER » n'est jamais lu.
  Les **photos et vidéos HD de Yoni** (disque externe « Berete - Dossiers icloud », `BERETE_HD_DIR`) sont choisies
  dossier par dossier dans `scripts/hd-media.mjs` (section `hd` : `npm run import-media -- --only=hd`) : photos 1440 px
  de large (1080 px pour les brouillons), vidéos MP4 H.264 720p, muettes, 12 secondes au plus, avec leur image d'attente ;
  les originaux ne vont jamais dans Git. `yoni(<dossier>, "p07")` dans `src/data/pieces.ts` les place dans une pièce.
  À la fin, il prépare des copies plus légères de chaque photo (`cover.w1080.webp` pour les photos HD, `cover.w640.webp`,
  `cover.w160.webp`) que le navigateur choisit sur téléphone et pour les vignettes. Pour les refaire seules : `npm run media:sizes`.
- **L'admin** (`/admin`, mot de passe `ADMIN_PASSWORD`, sa propre page sans le menu du site) modifie les pièces (dont
  « Publiée sur le site » et « Univers de la page » ; les non publiées sont marquées « Non publiée »), les photos de La
  Maison, les
  modèles 3D, les clients VIP, les stories, joueurs et écrins dans la base, et affiche les messages et demandes de rappel. Au démarrage, l'API ajoute à la base ce qui est nouveau dans `src/data/`
  (nouvelles stories, nouvelles photos, nouveaux textes) sans jamais écraser un texte modifié depuis l'admin.
- **Le numéro WhatsApp, l'email, Instagram** : `src/lib/site.ts` (seul fichier à modifier).

## Les langues

Le site existe en anglais (`/creations`), français (`/fr/creations`), espagnol (`/es/...`), allemand (`/de/...`),
néerlandais (`/nl/...`) et arabe (`/ar/...`, lu de droite à gauche). Le menu de langue (barre du haut, menu mobile, pied de page) garde la même page.

- **Les mots des pages** : `src/i18n/ui/en.ts` (la source), puis `fr.ts`, `es.ts`, `de.ts`, `nl.ts`, `ar.ts`. TypeScript refuse
  une langue à laquelle il manque une phrase. Les titres et descriptions Google de chaque page sont dans `seoPages`
  (l'anglais dans `src/extensions/seo/seo.json`).
- **Les textes du catalogue** (pièces, joueurs, stories, écrins) sont écrits en anglais dans `src/data/` ; chaque langue
  les traduit dans `src/i18n/content/<langue>.ts`, rangés par texte anglais. `npm run i18n:check` dit ce qui manque.
- **Depuis l'admin** : chaque fiche a un bloc « Traductions » (français, espagnol, allemand, néerlandais, arabe). Vide, la fiche garde la
  traduction du site (affichée en gris) ; rempli, il la remplace. Un texte anglais modifié dans l'admin reste en anglais
  dans les autres langues tant que sa traduction n'est pas écrite dans ce bloc.
- **Arabe** : polices Amiri (titres) et IBM Plex Sans Arabic (texte), sans espacement entre les lettres ; mise en page,
  flèches, galeries et stories en miroir (on avance vers la gauche).
- **WhatsApp et formulaires** : les messages préremplis sont écrits dans la langue de la page ; les messages et demandes
  de rappel indiquent dans l'admin la langue du visiteur.
- **Google** : chaque langue a ses pages pré-rendues, son plan du site et ses liens `hreflang`. Pour que ces liens
  figurent dans les pages construites, définir l'adresse publique au moment du build : `SITE_URL=https://… npm run build`
  (sur Vercel, l'adresse du projet est prise d'office).
- **Aperçus de liens** (WhatsApp, Instagram, iMessage) : chaque page a une image de partage 1200 × 630 (`og:image`,
  `twitter:image`, carte « summary_large_image ») : la photo principale de la pièce sur fond noir avec le logo pour une
  page pièce, le logo en or rose avec une bague pour les autres. Elles sont faites par `npm run media:share`
  (`scripts/share-images.ts`, dans `public/media/share/`, à relancer après de nouvelles pièces) ; sans mots, elles
  servent à toutes les langues. `og:locale` suit la langue (en_GB, fr_FR, es_ES, de_DE, nl_NL, ar_AE). Comme les liens
  `hreflang`, l'image n'est écrite dans la page que si `SITE_URL` est connu au build.

## Visualiseur 3D

Remplace iJewel3D : les modèles du joaillier, montrés sur le site et par lien privé.

- **Admin, onglet « Modèles 3D »** : envoyer un fichier `.3dm` (Rhino, le mieux : il garde les calques), `.glb` ou `.stl`,
  jusqu'à 800 Mo (envoi par morceaux), suivre l'optimisation, choisir **la page du site où il apparaît** (menu de la
  liste, enregistré tout de suite), donner un rôle à chaque calque (Métal avec son métal par défaut, Diamant, Pierre de
  couleur avec sa couleur, Émail, Masquer ; « Voir seul » montre un calque), choisir les métaux proposés, la lumière, le
  fond, « Enregistrer la vue », partager dans l'espace VIP, créer des liens privés (expiration et mot de passe
  facultatifs) et les copier. Une image d'aperçu est faite toute seule à la première ouverture d'un modèle (puis à
  chaque « Enregistrer la vue ») : elle sert dans les listes et pendant le chargement sur le site.
- **Un modèle par pièce**, choisi depuis le modèle ou depuis la pièce (onglet « Pièces », « Modèle 3D sur la page ») :
  le nouveau remplace l'ancien. Le lien suit la pièce si son adresse change ; une pièce supprimée libère son modèle.
- **Les rôles des calques** sont devinés (pierre répétée des centaines de fois = diamant, grand volume = métal, nom du
  calque : « Diamonds », « Gold »…) puis **retenus par nom** : un fichier dont les calques portent les mêmes noms reçoit
  les mêmes rôles (table `LayerMemory`). Le fichier de test ZN1242-bj001 est déjà réglé (`server/models/demo.ts`,
  ses versions optimisées dans `storage/demo/`).
- **Le pipeline** (`server/models/pipeline/`, lancé dans un processus à part par `server/models/jobs.ts`) : lecture
  (STL lu par morceaux, GLB avec Draco, 3DM avec rhino3dm : calques et blocs), soudure des sommets à 0,0001 mm, découpage
  en morceaux, copies d'une même forme placées sur la première par alignement (Kabsch, aussi en miroir) et dessinées une
  seule fois (`EXT_mesh_gpu_instancing`) ; les copies vues en miroir (échelle négative, comme dans le fichier iJewel
  ZN1242 : 720 pierres) ont leur propre forme retournée, sinon le visualiseur les dessine à l'envers (sertissure vide) ;
  le visualiseur fait de même pour les fichiers optimisés avant (`src/viewer/mirror.ts`) ; dans un STL, les pierres sont reconnues (petites, convexes, avec une table,
  répétées, ou les 174 et 40 triangles des tailles Rhino), et aussi à leur forme (`looksCut` : une table en haut, une pointe
  ou une arête en bas, des facettes ou un cône lisse, jamais deux grandes faces opposées comme une barrette de métal),
  même seules (la pierre centrale d'une bague) ou dessinées avec 100 000 triangles ; les pierres **soudées au métal** par
  l'export (une union : seul leur dessus reste, collé au métal, comme dans la bague 0542) sont retrouvées à leur forme
  (`fused.ts` : une table plate à 4 µm près, entourée de facettes qui descendent vers l'extérieur et finissent sur une arête
  nette, tournées dans plusieurs directions ; seulement dans un morceau qui contient au moins 4 pierres nettes de même
  taille, ce qui écarte les reliefs sculptés), retirées du métal et refaites entières (leur dessus tel quel, un rondiste et
  une culasse à 43 %, enveloppe convexe) ; chacune garde la direction de sa table (`_GEMUP`) pour l'éclairage ; le métal
  est simplifié (0,01 mm pour la version ordinateur, 0,03 mm pour la version téléphone) sans bouger les bords des trous
  laissés par ces pierres, normales nettes aux arêtes (35°), compression Meshopt. Le fichier d'origine est toujours
  gardé. En ligne de commande : `npm run models:optimize -- <fichier> <dossier>`.
- **Les fichiers** sont dans `storage/` (hors git, `MODELS_DIR` pour un autre dossier), derrière `server/models/storage.ts` :
  seul ce fichier change pour les mettre ailleurs (disque du VPS, stockage objet).
- **Le visualiseur** (`src/viewer/`, three.js, React Three Fiber, chargé seulement quand il est montré) :
  - diamants en vraie réfraction (rayons suivis dans la pierre, jusqu'à 6 rebonds, **feu** : le rouge et le bleu
    sortent de la dernière facette à leur propre angle, indices 2,408 à 2,451) sous un éclairage de bijoutier fin
    (des centaines de panneaux étroits et de points lumineux, petite zone sombre au-dessus qui dessine les flèches
    noires d'une vraie pierre) **attaché à chaque pierre**, sa table vers le haut (comme l'« oriented lighting »
    d'iJewel3D : toutes les pierres d'un pavé scintillent) — `materials.ts`, `diamondEnv.ts` ; plus léger sur téléphone,
    verre d'indice 2,42 seulement si un téléphone reste trop lent ;
  - **rendu progressif** : dès que la caméra s'arrête, 32 images décalées d'une fraction de pixel sont moyennées
    (facettes et petites pierres nettes) — `accumulate.ts` ; ombres dans les creux (N8AO) sur ordinateur ;
  - ombre douce au sol ; fonds unis et studios (noir, studio sombre, studio clair, blanc, rosé) et **décors** : le bijou
    posé sur une table en noyer, du velours noir, du satin champagne ou du cuir blanc, devant une pièce floue
    (textures et pièces Poly Haven, CC0, dans `public/decor/` et `public/hdri/`) — `backgrounds.ts` ;
  - 5 métaux par calque, 3 lumières (studio, chaude, projecteur) et lumière tournante, zoom vers le curseur ou le
    pincement, double-clic / double-tap pour s'approcher d'un détail, **jamais de recentrage tout seul**, vues de face,
    côté, dessus, rotation, plein écran, image PNG. Éclairages HDRI de Poly Haven (CC0) dans `public/hdri/`, décodeur
    Draco dans `public/draco/`.
  - Les choix (métal de chaque calque, fond, lumière) et les boutons WhatsApp sont dans un panneau « Personnaliser » à
    droite du bijou sur ordinateur (il défile seul s'il est plus haut que le bijou), sous le bijou sur téléphone
    (`src/viewer/layout.ts`).
- **Espace client (VIP)** : onglet « Clients VIP » de l'admin. Chaque client a un espace privé sur le site (`/vip`)
  avec les pièces en 3D choisies pour lui (aussi depuis chaque modèle : « Partager dans l'espace VIP »). Il entre avec
  son **lien personnel** (`/vip/<lien>`, sans code) ou avec son **code d'accès** (montré une seule fois, « Créer un
  nouveau code » pour en faire un autre). Session de 30 jours (cookie signé), jamais indexé. Le secret qui signe les
  sessions et les adresses des fichiers est gardé dans la base (`server/secret.ts`) ou dans `MODEL_SECRET`.
- **Où il apparaît** : sur la page d'une pièce qui a un modèle, un bouton « See it in 3D » en haut et la section
  « Explore in 3D » juste sous l'ouverture (bouton WhatsApp avec le métal choisi), et le repère « 3D » sur sa vignette ;
  `/view/<lien>` pour un client (logo, pièce en 3D, « I love it » / « I'd like a change » sur WhatsApp), jamais indexé.
- **Vérifier** : `npm run verify:3d` (site construit lancé) envoie les fichiers de test par l'admin, ouvre chaque modèle
  sur ordinateur et iPhone avec le GPU, contrôle les liens et écrit `verification/3d/rapport.md` et ses captures.

## Vérifier

```sh
npm run lint
npm run typecheck
npm run i18n:check      # aucune traduction ne manque (fr, es, de, nl, ar)
npm run build && npm run build:server
npm start               # site construit + API sur http://localhost:3001
npm run verify          # tests Playwright (ordinateur 1440 px et iPhone 390 px), captures dans verification/
                        # tests/home.spec.ts tourne aussi sur iPhone SE (320 px) et iPhone 15 Pro Max (430 px) :
                        # haut de l'accueil sous les stories, phrases du film, Special project, bague Inter, joueurs,
                        # écrins, aperçus de liens, sauts de mise en page (< 0,05) et axe-core sur l'accueil
                        # (accueil → collections → chaque pièce, liens joueur ↔ pièce ↔ story, netteté des photos,
                        #  chaque langue : aucun mot anglais oublié, arabe de droite à gauche, menu de langue)
npm run verify:3d       # visualiseur 3D avec le GPU : verification/3d/rapport.md et ses captures
                        # tests/identity.spec.ts : pièces retirées (301) et brouillons absents du site, nouveaux noms
                        # (aucun ancien intitulé en anglais et en français), Enter the World, La Maison, l'univers de
                        # chaque pièce (contraste AA des textes, immobile si « réduire les animations »), le film
                        # horizontal de l'atelier, l'admin (non publiées, univers, photo de La Maison)
```

## Vitesse (Lighthouse)

- **Compression et mémoire du navigateur** : le serveur (`server/index.ts`) envoie les pages, le code et l'API
  compressés, garde un an le code et les polices d'une version (leur nom change à chaque build), un jour les photos.
- **Le film de l'accueil** ne télécharge ses images qu'au premier geste du visiteur, ou 2,5 s après le chargement
  de la page (`src/components/ScrollVideo.tsx`).
- **Les photos** : la photo principale de la page passe en premier (`priority`) ; les autres attendent que la page soit
  chargée, puis se chargent quand on s'en approche ; le navigateur choisit la copie la plus légère qui reste nette
  (`sizes`, `src/lib/responsive.ts`).
- **Les polices** sont servies par le site (paquets `@fontsource`, `src/main.tsx`) ; les polices arabes ne se
  téléchargent que sur les pages en arabe. Celles du premier écran sont demandées avec la page (`preloadFonts` dans
  `vite.config.ts`) et, en attendant, le texte s'affiche dans une police système à la même largeur (`Cormorant Fallback`,
  `Manrope Fallback` dans `src/index.css`) : rien ne saute quand la vraie police arrive.
- Mesurer sur le site construit (`http://localhost:3001`), pas sur la version de travail : la note varie de quelques
  points d'une mesure à l'autre.

## Mettre en ligne

**Le site en ligne** : chaque envoi sur GitHub (branche `main`) met à jour la version Vercel toute seule :
https://berete-nxsp.vercel.app (fermée aux moteurs de recherche, `noindex` de `vercel.json`, jusqu'au lancement).

`docker compose up` lance la base et le site construit (définir `ADMIN_PASSWORD` dans `.env`). Les modèles 3D sont
gardés dans le volume `models` (`/app/storage/models`). Facultatif : `MODEL_SECRET` signe les adresses des fichiers 3D (sinon
elles sont signées à partir d'`ADMIN_PASSWORD`).

**Sans serveur (Vercel, en attendant le vrai serveur)** : `vercel.json` construit le site (`npm run build`) et publie
`dist/`. Sur Vercel (ou avec `BERETE_STATIC=1 npm run build`), le site est construit sans serveur (`HAS_SERVER` dans
`src/lib/site.ts`) : il ne demande rien à l'API ; la demande de rappel et le formulaire e-mail ouvrent WhatsApp avec la
demande déjà écrite ; le lien « Espace client » disparaît du pied de page, `/vip` dit que l'espace ouvre bientôt (bouton
WhatsApp) et `/admin` qu'il faut le serveur ; la 3D n'apparaît pas. Avec le serveur, si un formulaire ne part pas, il
propose aussi WhatsApp, la demande déjà écrite.
