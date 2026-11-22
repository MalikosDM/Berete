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
- **Les pièces** : 46 pièces publiées, trouvées dans les stories, les dossiers et les photos HD de Yoni (dont 17 pièces
  publiées le 20/11/2026, `NEW_PIECES`, titrées d'après les albums de son téléphone). Leurs textes
  sont des brouillons (`draft: true`, « Brouillon » dans l'admin) à faire valider par le client ; aucun chiffre n'est inventé.
- **Pièces non publiées** (`published: false`, case « Publiée sur le site » dans l'admin) : gardées dans la base mais
  invisibles partout sur le site (listes, pièces similaires, stories, écrins, plan du site, aperçus ; `publicCatalogue`
  dans `src/data/relations.ts`, aussi appliqué par l'API `/api/catalogue`). Leur adresse redirige (301) vers la page de
  leur joueur s'il a encore des pièces, sinon vers `/creations` ; un joueur dont toutes les pièces sont non publiées sort
  du Cercle (sa page mène à `/players`). Le serveur le fait depuis la base ; pour Vercel, `npm run redirects` écrit les
  mêmes redirections dans `vercel.json`. Ce sont les 10 pièces retirées par Yoni et la chaîne Tennis qu'il a barrée
  (`REMOVED_PIECES`).
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
  - **Le décor qui s'anime** (effet « scene », 21/11/2026) : les lumières d'un fond IA (projecteur, étoile, bougies,
    faisceaux, rayons, reflets, ailes de moulin…) placées sur l'image (`spots` de `scripts/universe-media.mjs`, `.u-spot`
    de `src/index.css`), et **un effet sur la pièce elle-même** (reflet, éclats, halo, lumière chaude, rayon, arcs-en-ciel :
    `src/components/universe/JewelFx.tsx`). Les fonds avec leur propre version téléphone entourent aussi la story de la pièce.
  - Tout se règle dans l'admin (« Univers de la page » : univers, fond IA ou image envoyée, police, entrée, effets,
    filigrane, couleurs, texture, lumière, avec un aperçu et « Rejouer l'entrée »). Sans thème : l'univers de la Maison.
    L'accent reste l'or rose ; rien ne bouge avec « réduire les animations ».
- **L'ouverture d'une pièce** : son bijou détouré (`npm run cutouts` : photos HD du disque, détourage de macOS affiné
  par `scripts/cutouts.py`, fondu d'une chaîne qui sort de la photo, WebP transparents dans `public/media/cutouts`,
  `src/data/cutouts.generated.json`), seul ou en **vitrine multi-vues** (`src/components/Showcase.tsx`, règles dans
  `src/data/showcase.ts`) ; une pièce sans détourage garde sa photo. Admin : « Vitrine de l'ouverture » dans la fiche de la
  pièce, onglet « Détourages » pour tout vérifier et exclure une vue.
- **La vidéo du produit fini** (`src/components/PieceFilm.tsx`) : la première chose vue en entrant dans une pièce, une fois par
  visite (`src/lib/films.ts`), avec le son (un navigateur qui le refuse : muette, bouton son en vue), dans un cadre fait de
  l'univers de la pièce ; « Voir la pièce », Échap ou la fin la ferment, « Voir le film » dans l'ouverture la relance. C'est
  la vidéo « reveal » de la pièce (`scripts/film-media.mjs`, `resolveReveal` dans `src/data/atelier.ts`, réglable dans l'admin
  avec l'atelier). `npm run films` encode les vidéos depuis les originaux de « Videos HD » (ordinateur en 1080p, téléphone
  en 720p léger : 1,5 Mbit/s au plus pour ce film, 1,2 pour un making-of) ; aucune vidéo ne se charge avant d'être vue.
- **Logos de club** (`src/lib/clubs.ts`) : le fichier officiel du club dans `src/assets/clubs/<adresse du club>.svg`, servi tel
  quel, montré dans « Created exclusively for » (aujourd'hui l'Inter seule).
- **« The Art of Detail » en 3D** (`src/viewer/DetailViewer.tsx`, `src/data/details3d.ts`) : une pièce qui a un modèle 3D le
  montre au-dessus de ses détails, tournant lentement, ses détails accrochés à la pièce (fils et étiquettes qui la suivent,
  s'effacent quand leur point passe derrière : `lookAt` dans `src/viewer/Stage.tsx`). Points placés dans l'admin (« Les
  détails sur le modèle 3D »). La molette ne zoome qu'après un clic sur la pièce (sinon elle fait défiler la page).
- **L'atelier d'une pièce** (« Enter the Atelier » / « Entrer dans l'atelier ») : après les photos de la pièce, un passage
  ouvre en plein écran son atelier (`src/components/AtelierRoom.tsx`) : sa vidéo de fabrication, puis la pièce finie
  (« The Final Reveal »), son coupé au départ, lecture seulement après le clic, sortie par le bouton, Échap ou le geste
  retour. Sur la page, le passage montre déjà la vidéo de fabrication : elle joue seule, muette et en boucle, tant qu'elle
  est à l'écran (copie légère), et s'arrête hors écran ou quand l'atelier est ouvert (`AtelierPassage.tsx`). La page The Atelier rassemble les making-of de toutes les pièces publiées. Vidéos : `npm run import-media --
  --only=films` (choix par pièce dans `scripts/film-media.mjs`, faits à l'œil le 19/11/2026 ; l'original de « Videos HD/ » au même
  numéro passe avant, une fois entier et lisible ; plus de choix d'après le nom du fichier), H.264 1080p pour ordinateur,
  copie légère pour mobile, 6 images d'aperçu tirées de l'original, dans
  `public/media/films` (`media.films` de `src/data/media.generated.json`, règles dans `src/data/atelier.ts`). Admin :
  « L'atelier de la pièce » (vidéo de fabrication, vidéo de la pièce finie, ou aucune, et l'image d'aperçu). Sans vidéo
  de fabrication, pas de passage.
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
  Les croquis : la main de Yoni qui dessine la pièce (`Berete - Croquis/Croquis main de Yoni (site)`, `BERETE_SKETCHES_DIR`,
  un fichier `<slug-de-la-pièce>.jpg` par pièce en 3:4 ; les fichiers qui commencent par `_` sont ignorés) deviennent
  `public/media/sketches/<slug>.webp` (1434 × 1920 pour le plein écran, copies 1080, 640 et 160 px, chargées à
  l'approche) et l'étape « The Vision » de « The Making of a Masterpiece » : elle passe avant l'image donnée par la pièce
  (`src/data/pieces.ts`). Une pièce sans fichier dans ce dossier garde son croquis d'avant (`Berete - Croquis`,
  `BERETE_OLD_SKETCHES_DIR`), sinon son image (Dragon Ball : son premier dessin, tiré des stories). Dans la page, les
  photos des étapes s'ouvrent en grand au clic. Vérifié par `tests/sketches.spec.ts`.
  On peut le relancer après avoir ajouté des fichiers : rien n'est créé en double, seuls les nouveaux fichiers sont traités.
  Le dossier « 99 - NE PAS ENVOYER » n'est jamais lu.
  Les **photos et vidéos HD de Yoni** (disque externe « Berete - Dossiers icloud », `BERETE_HD_DIR`) sont choisies
  dossier par dossier dans `scripts/hd-media.mjs` (section `hd` : `npm run import-media -- --only=hd`) : photos 1440 px
  de large, vidéos MP4 H.264 720p, muettes, 12 secondes au plus, avec leur image d'attente ; les originaux ne vont jamais
  dans Git. Chaque pièce y a sa **galerie** dans l'ordre (`gallery`, la première est la photo principale) et ce que montre
  chaque photo (`"p7:front"`, mots dans `src/data/views.ts` : légende et texte pour lecteur d'écran, traduits comme le
  reste) ; `sorted()` dans `src/data/pieces.ts` en fait la photo principale et la galerie, un texte écrit à la main pour
  une photo restant prioritaire ; `yoni(<dossier>, "p07")` place un fichier ailleurs (étapes, détails). Une photo est
  « sur noir » (fondue dans la page) sauf si son fond est clair (`shotOnBlack`). Sur la page, toutes les photos et
  vidéos sont dans « Every Angle / Sous tous les angles » (`src/components/EveryAngle.tsx`), chacune avec son texte (un
  petit titre et une ou deux phrases, numérotés) : photo et texte côte à côte en damier sur ordinateur, la photo puis son
  texte sur téléphone, 6 d'abord puis « Voir les N autres » au-delà de 8. Les textes sont dans `src/data/angles.json`
  (anglais, par pièce puis par adresse de photo), traduits dans `src/i18n/content/angles/<langue>.json` ; l'admin les
  modifie (« Sous tous les angles », un titre et un texte par photo, et leurs traductions ; colonne `angles` de la base,
  une photo sans texte dans la base prend celui du catalogue). La photo d'ouverture y figure quand l'ouverture montre le
  bijou détouré, ou quand la pièce n'a pas d'autre photo. « The Making of a Masterpiece » ne montre que les vraies étapes de la pièce (`src/data/making.ts`, `making` de
  `src/data/pieces.ts` : photos, images tirées des films `"v2@14.6"` dans `also` de `scripts/hd-media.mjs`, images des stories
  dans `scripts/piece-media.mjs`), son making-of complet en premier ; sans étape réelle, pas de section. Les vidéos amateur
  vont à la fin de « Every Angle » (`AMATEUR_FILMS`). Les thèmes (`THEMES` de `src/data/collections.ts`, Jesus Pieces)
  regroupent des pièces de types différents à `/creations/<slug>`, dans le menu sous les collections. Un fond d'univers peut
  être une séquence d'images en fondu (`sequence`, `SEQUENCES` de `scripts/universe-media.mjs` : la nuit de Lasana Keita).
  Les Signature Trunks s'ouvrent et se referment (`src/components/TrunkReveal.tsx`), tous les 13 avec leurs vidéos
  (`Ecrins IA (ouverture) v2/<dossier>/` : closed.jpg, open.jpg, ouverture.mp4, fermeture.mp4) : boîte fermée et « Ouvrir » ;
  la vidéo d'ouverture, puis la pièce détourée (`public/media/cutouts/<pièce>`) monte et flotte au-dessus, et deux boutons :
  « Créer votre écrin » (WhatsApp) et « Découvrir la pièce » (si `pieceSlug` est rempli dans `BOXES` de
  `src/data/pieces.ts` ou dans l'admin ; vide = seulement le premier bouton). « Refermer » : les boutons s'en vont, la pièce
  redescend dans la boîte, la vidéo de fermeture joue, la boîte finit fermée ; « Revoir l'ouverture » sur la boîte ouverte.
  Chaque vidéo reste cachée tant qu'elle ne joue pas (l'image dessous est sa première image) et ne s'efface que sur l'image
  de sa dernière ; pendant une vidéo, rien à cliquer. Vidéo d'ouverture chargée à l'approche, celle de fermeture une fois la
  boîte ouverte. Fichiers préparés par `npm run trunks` (`scripts/trunk-media.mjs` : liste `BOXES` du script, carrés
  720/1080/1440, deux vidéos 1080 px, photos pro `photo-NN` pour la galerie « x photos » ; chaque nom porte la version de
  l'écrin, une empreinte de ses fichiers : `opening.<version>.mp4`, plus aucune ancienne version en cache ;
  `src/data/trunks.generated.json`) ; lumière et place de la pièce de chaque écrin dans `PLACES` de `src/data/trunks.ts` ;
  un seul écrin : `npm run trunks -- --only=the-hand-cube`. Un écrin retiré passe en « non publié » (case de l'admin,
  `REMOVED_BOXES`) ; toute adresse `/boxes/<écrin>` mène à /boxes ; `/boxes#box-<écrin>` (lien de la page d'une pièce)
  l'amène à l'écran.
  Les Créations (toutes, chaque collection, chaque sous-catégorie) s'affichent une par une en carrousel
  (`src/components/PieceCarousel.tsx` : défilement natif aimanté, flèches, clavier, molette horizontale, compteur), et
  « Voir toutes les créations » ouvre la grille de cartes égales (`?view=grid` : 3, 2, 1 par rangée).
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
- **WhatsApp et formulaires** : les messages préremplis sont écrits dans la langue de la page ; chaque bouton WhatsApp
  porte le message de la page où il est (`src/lib/whatsapp.ts` : la pièce par son nom affiché, le joueur, la collection,
  la page ; textes « whatsapp » de `src/i18n/ui/*.ts`) ; les messages et demandes de rappel indiquent dans l'admin la
  langue du visiteur.
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
                        # tests/galleries.spec.ts : Créations complète, galeries entières (« Every Angle »),
                        # films des nouvelles pièces, peu de photos chargées avant le défilement
                        # tests/feedback.spec.ts : retours de Yoni du 20/11 (6 pièces au premier écran des Créations,
                        # ouverture discrète des capsules, atelier qui joue seul, Sirius, BRT Flower, pendentif L,
                        # collier T, aucun repost de story dans les galeries)
                        # tests/identity.spec.ts : pièces retirées (301), pièces de collectionneurs publiées, nouveaux noms
                        # (aucun ancien intitulé en anglais et en français), Enter the World, La Maison, l'univers de
                        # chaque pièce (contraste AA des textes, immobile si « réduire les animations »), le film
                        # horizontal de l'atelier, l'admin (non publiées, univers, photo de La Maison)
                        # tests/trunks.spec.ts : les 13 écrins qui s'ouvrent et se referment (leurs deux vidéos, sans
                        # saut, adresses versionnées), la pièce qui sort puis rentre, « Créer votre écrin » et
                        # « Découvrir la pièce », plusieurs fois de suite, clavier, pages des pièces
                        # tests/carousel.spec.ts : le carrousel des Créations (flèches, glissement, clavier, compteur,
                        # retour), la grille de cartes égales (ordinateur, tablette, iPhone), 6 langues, aucun saut
                        # tests/angles.spec.ts : retours de Yoni du 21/11 (« Sous tous les angles » : un texte par photo
                        # en 6 langues, damier, iPhone, lisibilité ; 4 pièces retirées, filtres des Créations, admin)
                        # tests/yoni2111.spec.ts : Dragon Ball en grand et son film, le Cercle (clic = la pièce),
                        # Sirius (écrin, nuit japonaise), écrin NZ retiré, accueil plus petit, menu dès 1 260 px
                        # tests/doutes.spec.ts : réponses de Yoni aux doutes du Making of (8 pièces, étapes validées)
                        # tests/maison.spec.ts : le portrait de Yoni en haut de La Maison (visage entier, ordinateur et iPhone)
                        # tests/yoni2211.spec.ts : Créations à 3 par ligne, Pendentifs > Jesus Pieces, serpent or rose, Butterfly
                        # pendentif + chaîne, formulaire avec photos reçu dans l'admin
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

**Aujourd'hui (Vercel, sans serveur)** : chaque envoi sur GitHub (branche `main`) met à jour la version Vercel toute
seule : https://berete-nxsp.vercel.app (fermée aux moteurs de recherche, `noindex` de `vercel.json`, jusqu'au lancement).
`vercel.json` construit le site (`npm run build`) et publie `dist/`. Sur Vercel (ou avec `BERETE_STATIC=1 npm run build`),
le site est construit sans serveur (`HAS_SERVER` dans `src/lib/site.ts`) : il ne demande rien à l'API ; la demande de
rappel et le formulaire e-mail ouvrent WhatsApp avec la demande déjà écrite ; le lien « Espace client » disparaît du pied
de page, `/vip` dit que l'espace ouvre bientôt (bouton WhatsApp) et `/admin` qu'il faut le serveur ; la 3D n'apparaît pas.
Avec le serveur, si un formulaire ne part pas, il propose aussi WhatsApp, la demande déjà écrite.

**Le VPS (tout en un : site, admin, 3D, espace VIP)** : `docker-compose.yml` lance sur une seule machine la base
(PostgreSQL 17), le site construit (`Dockerfile` : pages, photos et vidéos, API, admin, visualiseur, espace client) et
Caddy devant (`deploy/Caddyfile` : HTTPS obtenu et renouvelé tout seul, `www.` mène à l'adresse sans `www.`, le visiteur
attend quelques secondes au lieu d'une erreur pendant une mise à jour). Prévu pour un VPS Ubuntu 22.04 ou 24.04 réservé au
site (KVM 2 : 2 processeurs, 8 Go). Tout se pilote depuis le Mac (`deploy/vps.sh`) :

```sh
npm run vps -- install [domaine]   # installe tout sur le VPS neuf (deploy/install.sh), en une fois
npm run vps -- status              # en ligne ? version, disque, dernières sauvegardes
npm run vps -- admin               # adresse et mot de passe de l'admin
npm run vps -- 3d                  # envoie les modèles 3D du Mac (base locale + storage/) au VPS
npm run vps -- domain exemple.com  # l'adresse du site (quand le DNS pointe vers le VPS)
npm run vps -- set ALERT_TO=…      # un réglage de .env, puis le site redémarre avec
npm run vps -- launch              # ouvre le site aux moteurs de recherche (le jour du lancement)
npm run vps -- backup              # copie les sauvegardes du VPS sur le disque externe
npm run vps -- private             # le VPS lit GitHub avec sa propre clé (avant de passer le dépôt en privé)
```

- **Accès** : le nom SSH `berete-vps` (`~/.ssh/config`, clé `~/.ssh/berete_vps`), ou `BERETE_VPS=root@<IP>`.
- **L'installation** (`deploy/install.sh`, relançable sans rien perdre) : système à jour, Docker, 4 Go de swap, pare-feu
  (SSH, 80, 443), mises à jour de sécurité automatiques, fail2ban, connexion SSH par clé seulement (si une clé est déjà
  posée), le code dans `/srv/berete` (copie légère de GitHub ; dépôt privé : une clé du VPS ajoutée à GitHub en lecture
  seule, par le GitHub CLI du Mac), les réglages dans `/srv/berete/.env` (modèle : `deploy/env.example` ; mots de passe
  de l'admin et de la base tirés au hasard), les fichiers 3D et les sauvegardes dans `/srv/berete-data`. Sans domaine,
  le site répond à `<IP avec des tirets>.sslip.io`, en HTTPS.
- **Mises à jour** : toutes les 2 minutes, le VPS regarde GitHub (`deploy/update.sh`, `berete-update.timer`). Une
  nouvelle version est construite pendant que l'ancienne sert encore, puis prend sa place ; si elle ne démarre pas,
  l'ancienne revient et cette version n'est plus retentée. Journal : `/var/log/berete-deploy.log`. La base est mise à jour
  au démarrage (`prisma migrate deploy`).
- **Sauvegardes** : chaque nuit à 3 h 30 (heure de Dubaï), la base entière et les fichiers 3D, gardés 14 jours dans
  `/srv/berete-data/backups` (`deploy/backup.sh`) ; `deploy/restore.sh <date>` remet la base d'un jour (la base du moment
  est d'abord sauvegardée). Les photos et vidéos du site sont dans git.
- **Protections** (`server/security.ts`) : adresse réelle du visiteur derrière Caddy, en-têtes de sécurité, `noindex`
  partout tant que `SITE_INDEXING` n'est pas `on` ; admin : 5 mots de passe faux par visiteur, puis 15 minutes d'attente,
  session de 12 heures (un nouveau mot de passe ferme toutes les sessions) ; formulaires : 5 envois en 10 minutes par
  visiteur ; codes de l'espace client et mots de passe des liens 3D : 10 essais faux en 15 minutes. La machine elle-même
  (contrôles, tests) n'est jamais limitée. `GET /api/health` répond quand la base répond.
- **Alertes** (`server/alerts.ts`) : un e-mail à la maison pour chaque message et demande de rappel (ils restent aussi
  dans l'admin), par la boîte e-mail du domaine : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `ALERT_TO`.
- **Domaine** (chez one.com) : un enregistrement A pour `@` et un pour `www` vers l'IP du VPS (retirer un éventuel AAAA
  qui pointe ailleurs ; ne pas toucher aux MX de la boîte e-mail), puis `npm run vps -- domain <domaine>`.
- **Essayer sur le Mac** : Docker Desktop, un fichier de réglages de test (`.data/test.env` : `POSTGRES_PASSWORD`,
  `ADMIN_PASSWORD`, `HTTP_PORT=8080`, `HTTPS_PORT=8443`, `APP_PORT=3101`), puis
  `COMPOSE_ENV_FILES=.data/test.env docker compose up -d --build` : https://localhost:8443 (certificat local).
