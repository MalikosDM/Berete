# Berete Jewellers — contexte du projet (à lire avant toute tâche)

Ce fichier garde tout le contexte du projet, pour Claude Code et pour Claude (chat). Le détail technique est dans
`README.md` ; ici : le client, les décisions, ce qui reste à faire. Mettre à jour la section « État » à chaque grosse étape.

## Le client et le projet
- **Berete Jewellers** (Instagram @beretejewellers) : haute joaillerie sur mesure, **la maison est basée à Dubaï**.
  Fondateur : **Yoni Berete** (Fondateur & Directeur artistique). Clients : footballeurs, clubs (Inter Milan, VfB
  Stuttgart), personnalités. La Belgique, Bruxelles et Anvers apparaissent **uniquement dans son histoire** (page La
  Maison, sa biographie à lui, voulue ainsi) ; ailleurs, la maison reste à Dubaï.
- Site fait par **Malik** (développeur, Marseille). Démarré sur ODORO (son générateur de sites), puis exporté ici et
  poursuivi avec Claude Code. Repo : github.com/MalikosDM/Berete.
- Réunion de validation avec Yoni le **9 novembre 2026** : site **approuvé** (stories façon Instagram, pages pièces,
  6 langues). Résumé et transcription chez Malik (Fathom).

## Façon de travailler avec Malik
- Il ne code pas : réponses **en français, simples, sans jargon**, courtes. Pas de compte rendu technique (SHA, CI…).
- Il veut voir le projet avancer et en ligne ; ne le solliciter que pour une vraie décision.
- Un seul prompt / une seule passe qui couvre tout, plutôt que des petites étapes.
- Toujours vérifier soi-même (Playwright, ordinateur 1440 px + iPhone 390 px) avant de dire que c'est fini.
- Vérifications toujours **sans le son** (demande de Malik, 20/11) : les tests importent `test` de `tests/fixtures.ts`
  (iPhone/WebKit : volume réel des vidéos à 0) et Chromium tourne avec `--mute-audio`. Tout nouveau test ou script garde ça.
- Vérifier en local : `SITE_URL=http://localhost:3001 npm run build`, `npm run build:server`, `npm start`, puis
  `npm run verify` (sans `SITE_URL`, les aperçus de liens n'ont pas d'image et leur test échoue).

## Règles non négociables
- Couleurs : noir #0A0A0A, blanc #FFFFFF / #F4F2EF, accent unique **or rose métallique** (#9C5B4F → #E8B4A0 → #B76E79)
  pour les boutons, liens et traits. **Aucun bleu** dans l'interface (le bleu des photos Inter est normal).
  Exception voulue par Yoni : chaque pièce a son **univers** (`src/data/themes.ts`, modifiable dans l'admin) : fond
  plein écran (fond IA, sinon composition), police du titre, entrée cinématique (une seule fois par visite), effets au
  scroll, filigrane. Ses couleurs vivent seulement dans le fond, le titre et les effets, toujours sombres derrière les
  textes (contraste AA) ; boutons et liens restent en or rose. L'univers Inter a un **fond bleu nuit** (stade de nuit).
- Lisibilité mobile : texte ≥ 16 px, contrastes AA, boutons ≥ 48 px.
- Vidéos de l'accueil et de /process pilotées par le scroll (jamais d'autoplay ni de boucle).
- Ne jamais inventer de chiffres (carats, poids, prix, heures) : textes des pièces = brouillons à faire valider par Yoni.
- Ne jamais utiliser le dossier « 99 - NE PAS ENVOYER (a valider) ». Visuels Dragon Ball / Goku : **droits à confirmer
  par Yoni** avant la mise en ligne publique.
- Numéro WhatsApp, email, Instagram : uniquement dans `src/lib/site.ts`.
- Textes du site : le fichier de Yoni « 01 Wording du site (EN-FR) » fait foi (anglais et français exacts) ; les 4 autres
  langues traduisent l'anglais. Signatures à garder : « Made by us. Inspired by you. » / « Créé par nous. Inspiré par
  vous. », « Your story, in diamonds. » / « Votre histoire, en diamants. ». Bouton de chaque pièce : « Enter the World » /
  « Entrer dans l'univers ». Catégories Pendants/Chains/Rings/Watches inchangées.
- Une pièce retirée n'est jamais supprimée : elle passe en « non publiée » (case dans l'admin), son adresse redirige
  (301) vers son joueur, sinon /creations (`npm run redirects` pour Vercel).
- Mise en ligne : un envoi sur GitHub (main) met à jour le site Vercel tout seul : https://berete-nxsp.vercel.app

## Où sont les fichiers (Mac de Malik)
- **Depuis le 19/11/2026, tous les fichiers du projet sont sur le disque externe** `/Volumes/Disque externe/` (plus rien
  sur le Bureau) : `Berete - Dossiers icloud`, `Berete - Stories`, `Berete - Croquis`, `Berete - La Maison`,
  `Berete - 3D`, `Berete - Envoi ODORO`, `Berete - Boutique Bijoutier (export ODORO)`, `Berete - Telechargements`
  (photos WhatsApp de Yoni, photos joueurs SnapInsta, ancienne archive du repo). Le logo est dans
  `Berete - Stories/berete_jewellers-cropped.svg`. Les scripts (`import-media`, `universes`, `verify:3d`) lisent ces
  dossiers par défaut (`BERETE_DISK` pour un autre disque) : **brancher le disque avant de les lancer** ; sans lui,
  `npm run import-media` s'arrête sans rien modifier.
- Photos et vidéos HD envoyées par Yoni (19/11/2026) : disque externe `/Volumes/Disque externe/Berete - Dossiers
  icloud/` (35 dossiers « NN Nom », noms donnés d'après les photos, pas par Yoni ; `00 Contexte Yoni` = ses textes :
  wording, biographie, citations, pièces à retirer). Choix des photos : `scripts/hd-media.mjs`, puis
  `npm run import-media -- --only=hd`. Ne jamais modifier ces fichiers.
- Photos des joueurs en maillot : `00 Contexte Yoni/Photos joueurs en maillot/` (un dossier par joueur, cadrages dans
  `scripts/player-media.mjs`, puis `npm run import-media -- --only=players`). Fonds IA des univers :
  `00 Contexte Yoni/Univers IA (propositions)/` → `npm run universes` (agrandis à 2560 px par Swin2SR, originaux
  agrandis dans `.local/universes`, jamais dans Git ; polices libres copiées dans `public/fonts/universe`).
- Photos personnelles de Yoni pour La Maison : `Berete - La Maison/` (voir LISEZ-MOI), ou l'admin.
- Médias des stories (Instagram, triés) : `Berete - Stories/` (30 dossiers « NN Nom », couvertures dans
  `00 Couvertures`). Relancer `npm run import-media` après ajout.
- Photos et vidéos du site : `Berete - Envoi ODORO/`. Photos de la boutique : `Berete - Boutique Bijoutier (export ODORO)/`.
  Croquis : **`Berete - Croquis/Croquis main de Yoni (site)/`** (depuis le 20/11/2026 : la main de Yoni qui dessine
  chaque pièce, un `<slug>.jpg` en 3:4 par pièce, 28 pièces ; `BERETE_SKETCHES_DIR`, puis
  `npm run import-media -- --only=sketches`). Les anciens croquis à la racine de `Berete - Croquis/` ne servent plus qu'aux
  pièces absentes de ce dossier (les 9 pièces retirées). Dragon Ball garde son premier dessin (stories).
- Fichiers 3D de Yoni : `Berete - 3D/fichiers de test/ZN1242-bj001.glb` (bracelet iJewel3D). Les 4 STL (ZN1059 collier,
  zp1864 pendentif, 0542, ZR0982 bague) ne sont plus sur le Mac ni sur le disque : les remettre dans `Berete - 3D/`
  (`npm run verify:3d` les y cherche ; une copie de chacun reste dans `storage/models/*/original.stl`, importée dans l'admin). Ses fichiers sortent de
  **Rhino** : demander les **.3dm** (gardent métal et pierres séparés).

## Passe « identité Berete » (fichiers de Yoni du 19/11/2026) — état au 19/11/2026
- [x] **Wording** de Yoni sur tout le site (menu, accueil, Créations, pièces, The Berete Circle, Championship rings,
      The Atelier, Signature Trunks, The Bespoke Journey, The House, Private Enquiries, phrases d'introduction, titres
      Google et aperçus de liens), anglais et français exacts, espagnol, allemand, néerlandais et arabe traduits (à faire
      relire par des natifs, surtout l'arabe). Adresses inchangées (/players, /boxes, /process, /about, /contact).
- [x] **10 pièces retirées** (Jack ; Thuram Infinity, Snowflake, Jesus Piece, Signet, T-Monster ; Jeff Chabot JC ;
      Nianzou NZ pendentif et bague ; Eweka 999) : non publiées, invisibles partout, adresses redirigées (301).
      Jeff Chabot et Sidney Eweka sortent du Cercle (page redirigée vers /players).
- [x] **La Maison** : biographie de Yoni en 12 chapitres (texte français tel quel), 3 citations (01 L'Identité,
      02 La Philosophie, 03 Le Parcours), emplacement photo par chapitre (invisible tant que vide).
- [x] **Photos HD** : 15 pièces du site passées en HD (photos fond noir en premier), 15 brouillons non publiés créés
      pour les dossiers sans pièce (titre = nom du dossier, « Made for » à valider), écrin Signature Trunk (dossier 35)
      en tête de Signature Trunks, vidéo d'ouverture de l'Atelier remplacée par un vrai plan horizontal (dossier 24).
- [x] **Un univers par pièce** (29 pièces publiées) : thème modifiable dans l'admin (« Univers de la page »).
- [ ] Yoni : envoyer ses photos personnelles pour La Maison, relire les textes (dont les traductions), confirmer les
      droits Dragon Ball. (Les 15 brouillons sont publiés depuis le 20/11 : voir « Passe toutes les photos ».)

## Passe « détourages et vitrine » — état au 20/11/2026
- [x] **Détourages** refaits depuis les photos HD d'origine (disque) : détourage de macOS (Vision, sur le Mac, sans rien
      télécharger ; le modèle BiRefNet exige du code téléchargé, refusé), puis bords redessinés au pixel près, couleurs
      des bords nettoyées, chaîne qui sort de la photo en fondu, marge transparente. `npm run cutouts`
      (`scripts/cutouts.mjs` : choix des vues ; `scripts/cutouts.py` ; `scripts/cutout-mask.swift`), WebP transparents
      480/960/1600 px dans `public/media/cutouts`, liste dans `src/data/cutouts.generated.json`. 56 vues, 22 pièces.
- [x] **Vitrine multi-vues** à l'ouverture (`src/components/Showcase.tsx`) : ordinateur, vue principale au centre, les
      autres autour en profondeur (flottement, relief à la souris, clic = échange) ; iPhone, glissement + points. Par
      défaut sur les 5 univers prioritaires et partout où il y a 3 vues propres ; sinon une seule vue détourée.
      Admin : « Vitrine de l'ouverture » par pièce (auto / une vue / multi-vues, choix et ordre des vues) et onglet
      **Détourages** (damier + noir, Exclure/Rétablir). Aucun bijou coupé (test automatique sur les 29 pièces, 1440 et 390 px).
- [ ] Photo actuelle gardée (pas de photo propre du bijou seul) : JL (photo coupée en bas), Loïs Openda, Flâneur (retiré
      le 21/11), chaîne torsadée de Kevin Schade, les 3 montres. Demander à Yoni des photos sur fond noir de ces pièces.

## Passe « making-of : Entrer dans l'atelier » — état au 19/11/2026
- [x] **Vidéos web** : `npm run import-media -- --only=films` (choix par pièce dans `scripts/film-media.mjs`, faits à
      l'œil). Depuis le 21/11, chaque film part de son original de « Videos HD/ » (même numéro que la copie de « Videos/ ») :
      voir « Passe films en HD ». Le choix d'après le nom du fichier est supprimé (il prenait d'autres films que ceux choisis).
      Le dossier 08 « Fabrication atelier (divers) » contient les making-of de VfB (HD), T-Serpent et Samuel Ballet.
      Ordinateur : H.264 1080p ; mobile : copie légère (720p, 540p depuis une petite vidéo) ; 6 images d'aperçu ; `public/media/films`.
- [x] **Page pièce** : passage « Enter the Atelier » / « Entrer dans l'atelier » après les photos, atelier plein écran
      (`src/components/AtelierRoom.tsx`) : fabrication puis « The Final Reveal », son coupé au départ, lecture après le
      clic seulement, sortie bouton / Échap / geste retour. Sans vidéo de fabrication : pas de passage.
- [x] **Page The Atelier** : section « Every Piece, Its Making-of » (vignettes des pièces publiées, même atelier, lien
      « Enter the World »). Admin : « L'atelier de la pièce » (vidéos ou aucune, image d'aperçu).
- Making-of en ligne (11) : Dragon Ball (HD), VfB (HD), croix Tillman (HD), Inter, OKA, octogone Okafor, Ruby T,
  T-Serpent, Samuel Ballet, Tulips (vidéo téléphone à l'établi), AS (vidéo téléphone, polissage). Sans fabrication : Kenan
  Yildiz, The Hand, Butterfly, maillot d'Okafor (pièce finie seule, prête), Safi Link et les autres (aucune vidéo).
- [ ] Yoni : envoyer les originaux des 4 films restés en 720p (voir « Passe films en HD ») et les making-of manquants
      (Butterfly, maillot d'Okafor, Kenan, The Hand, Safi Link…) ; confirmer que 08/v21 est bien le Jesus piece de Samuel Ballet.

## Passe « portraits et univers immersifs » — état au 19/11/2026
- [x] **Portraits** : 17 joueurs avec une photo HD en maillot (Eljero Elia sans maillot, avec son trèfle), cadrée sur
      le visage et le maillot (4:5), étalonnage de série léger, champ « Photo de profil » de l'admin rempli ; photos en plus
      dans « En images » sur leur page. Gardés : Angelo Stiller (initiales : photo trop petite, de dos), Sambi Lokonga et
      Tanguy Nianzou (captures de stories). Keita Losene (MMA) dans « Athlètes », sans club.
- [x] **Univers immersifs** sur les 29 pièces publiées : 5 fonds IA (Dragon Ball, Butterfly, Inter, VfB, tunnel
      d'Okafor pour ses 3 pièces) ; 13 polices de titre libres ; entrées (flash d'énergie, fumée qui se dissipe, vingt
      étoiles, envol de papillons, lumières du tunnel, projecteur, éclat, pétales, pluie, rouages) ; effets au scroll
      (braises, éclairs, lignes de vitesse, papillons, confettis, pétales, étoiles, brume) ; impact à l'ouverture d'une
      photo (Dragon Ball) ; filigranes (力, OKA, T, AS, JL, L, TM, FAM). Admin « Univers de la page » : univers, fond (IA,
      image envoyée ou composition), police, entrée, effets, filigrane, couleurs, texture, lumière, « Rejouer l'entrée ».
- [x] **Aimant** sur le film de « The Bespoke Journey » (/process) : à chaque arrêt, la page glisse au centre du texte
      le plus proche (`magnet="strong"` de `src/components/ScrollVideo.tsx`) ; libre au début et à la fin du film, annulé
      par le moindre geste. L'accueil garde son aimant doux.
- [ ] Yoni : valider les fonds IA et l'ambiance de chaque univers ; droits des photos des joueurs (photos d'agences et
      de clubs) ; photo HD d'Angelo Stiller ; fonds IA des 22 autres pièces à générer (idées dans le rapport du 19/11).

## Passe « capsules » (pages des pièces) — état au 20/11/2026
- [x] **Logo officiel de l'Inter** dans « Created exclusively for » (le fichier du club, logo 2021, FC Internazionale Milano
      / Bureau Borsche, pris sur Wikimedia Commons, jamais retouché : `src/assets/clubs/inter-milan.svg`, servi tel quel).
      Ajouter le logo d'un autre club = déposer `src/assets/clubs/<adresse du club>.svg` (`src/lib/clubs.ts`).
- [ ] **Yoni doit valider l'utilisation des logos de club** (marques déposées), Inter compris.
- [x] **« The Art of Detail » en 3D** (`src/viewer/DetailViewer.tsx`) : quand la pièce a un modèle 3D, il tourne lentement au-dessus
      de la liste des détails, fils fins et étiquettes accrochés à la pièce (titre sur ordinateur, numéro sur téléphone),
      une étiquette dont le point passe derrière s'efface puis revient. Admin : « Les détails sur le modèle 3D » (Placer,
      puis un clic sur la pièce). Points gardés avec la pièce (`detailPoints`, liés au modèle). Seule l'Inter a des détails
      écrits : la 3D annotée attend son fichier 3D. Testé seulement en local (ZN1242 posé sur l'Inter puis retiré).
- [x] **Genkidama** pour la pièce Dragon Ball (page et story) : fond noir, sphère de lumière qui respire, particules qui
      montent vers elle (`npm run universes -- --only=genkidama`, effet « genkidama »). Rien d'officiel Dragon Ball. La chaîne
      de Kevin Schade n'était pas dans l'univers Énergie (univers de la Maison, soie) : inchangée.
- [x] **La vidéo du produit fini en premier** en entrant dans une capsule (`src/components/PieceFilm.tsx`), une fois par visite,
      avec le son (sinon muette avec un bouton son en vue), dans un cadre aux couleurs de l'univers ; « Voir la pièce »,
      Échap ou la fin de la vidéo la ferment ; « Voir le film » la relance. 13 pièces : Inter, VfB, OKA, octogone et maillot
      d'Okafor, croix Tillman, AS, Ruby T, T-Serpent, Tulips, Kenan, The Hand, Butterfly (vidéos regardées image par image ;
      maillot : le petit edit 32/v03 plutôt que le film de livraison). Sans vidéo : Dragon Ball, Samuel Ballet, Safi Link et
      les pièces tirées des stories. Mobile en 720p.
- [x] **Vidéos HD** : arrivées le 21/11 (94 originaux), voir « Passe films en HD ».
- [ ] Yoni : fichiers 3D des pièces (.3dm de préférence), d'abord la bague Inter (ses 9 détails attendent leurs points) ;
      vidéos du produit fini des pièces qui n'en ont pas ; la vidéo de The Hand montre un personnage d'anime gravé sur
      l'écrin (droits, comme Dragon Ball).

## Passe « écrins qui s'ouvrent » (Signature Trunks) — état au 21/11/2026
- [x] **Page des écrins** (`/boxes`, `src/pages/Atelier.tsx` « Boxes ») : une grille de carrés de même taille (3 colonnes sur
      ordinateur, 2 sur tablette, 1 sur téléphone), l'écrin Signature en premier, chacun **fermé** avec son nom ; dessous,
      son texte, ses photos (plein écran) et sa pièce. La section qui montrait les 10 photos de l'écrin Signature est
      remplacée (photos toujours accessibles par « 10 photos »).
- [x] **Ouverture** (`src/components/TrunkReveal.tsx`) : au clic, la vidéo d'ouverture joue à la place de l'image fermée,
      muette ; une lueur dorée en CSS (halo qui respire, quelques étincelles, `src/index.css` « .trunk-glow ») ; à la fin,
      l'image ouverte arrive en fondu sur la dernière image de la vidéo (aucun saut, vérifié par test : écart moyen < 9/255),
      puis le bouton « Create my own trunk » / « Créer mon écrin » apparaît dans la lumière (position par écrin, `LIGHT`
      dans `src/data/trunks.ts`), avec un message WhatsApp qui nomme l'écrin dans la langue du site (« Hello Berete, I
      discovered the Sirius trunk on your website and would like to create my own. »). En bas du carré : « Revoir
      l'ouverture » et « Refermer l'écrin ». Avec « réduire les animations », le clic montre directement l'écrin ouvert.
- [x] **Fichiers** de Yoni : `00 Contexte Yoni/Ecrins IA (ouverture)/` (`<nom>-closed.jpg`, `-open.jpg`, `-ouverture.mp4`),
      préparés par `npm run trunks` (`scripts/trunk-media.mjs`) : images carrées 720/1080/1440 en AVIF et WebP (15 à 50 Ko),
      vidéo 1080 × 1080 H.264 sans son (~0,8 Mo, la même sur ordinateur et téléphone), chargée seulement quand l'écrin
      approche de l'écran ou au survol. Originaux jamais dans Git. L'écrin Dragon Ball garde ses photos (droits).
- `tests/trunks.spec.ts` (Signature, Inter, Sirius ; ordinateur et iPhone ; messages en anglais et en français ;
  « réduire les animations » ; vidéos chargées à l'approche), captures dans `verification/trunks/`.

## Passe « Making of réel, panthère, N14, Jesus Pieces » (retours de Yoni du 21/11, 2) — état au 21/11/2026
- [x] **The Making of a Masterpiece : seulement les vraies étapes** (`src/data/making.ts`, `making` de chaque pièce dans
      `src/data/pieces.ts`). Toutes les vidéos des dossiers (Videos HD, Fabrication/, 08, stories) regardées image par image
      (planches dans le dossier temporaire, rien sur le disque sauf `_verif`). Plus aucune image générique de l'atelier :
      une étape sans média de la pièce disparaît, une pièce sans étape n'a pas de section. Le making-of complet passe en
      premier (`COMPLETE_MAKING_OF` : 15 pièces, plus la Butterfly dont le making-of est la story 07/10), il joue muet à
      l'écran, plein écran avec le son au clic. Étapes tirées des films (`"v2@14.6"` dans `also` de `scripts/hd-media.mjs`,
      images des stories dans `scripts/piece-media.mjs`). Corrigées : le « sertissage » de Dragon Ball était tout le film
      (story 20), celui du AS des logements creusés sans pierres, celui de Sirius une fraise sur la plaque brute, le
      « polissage » de BRT Flower une fraise sur un maillon brut, celui de Tulips la pièce finie en main ; la malle
      d'Okafor et l'étui NZ ne sont plus montrés comme remise (`BOX_NOT_ITS_OWN`) ; la remise de la Butterfly (repost de
      story) remplacée par la chaîne dans sa malle. Aucune remise « photo seule » de la pièce finie.
- [x] **Doutes** : planche `/Volumes/Disque externe/Berete - Dossiers icloud/_verif/making-of-doutes.jpg` (20 lignes :
      pièce, étape, images, fichier source). Rien de cela en ligne, sauf la ligne 20 (making-of de la chaîne 14 mm, rangé
      dans le dossier 01, la 20 mm étant presque identique).
- [x] **Plus de séquence épinglée** entre l'ouverture et le contenu (retirée le 21/11 avec « Sous tous les angles ») :
      un défilement mène à la section suivante (test).
- [x] **Vidéos amateur à la fin** de « Sous tous les angles » (`AMATEUR_FILMS` dans `src/data/angles.ts` : 17 vidéos de
      téléphone, en main, essayages ; les 8 montages pro gardent leur place). Doublon retiré : la story 11 de Noah Okafor
      (le même montage que 32/v01) ; la story 07/10 de la Butterfly passe dans son Making of.
- [x] **N14** : 4 photos de plus (le N et sa figure, le dos entier, le dos de biais, la marque BRT ; textes en 6 langues),
      les gros plans des prénoms laissés de côté ; son montage pro 22/v08 (HD) en film d'ouverture et dans l'atelier (joué
      une fois : `resolveAtelier` ne répète pas un film identique). Yoni accepte de montrer le dos gravé.
- [x] **La panthère de Lasana Keita** : fond « keita » (`THEME_PRESETS.keita`), une séquence de 3 images en fondu lent,
      8 s chacune (KO, cage ouverte, célébration ; `SEQUENCES` dans `scripts/universe-media.mjs`, `sequence` du fond ;
      `src/components/Universe.tsx`), chacune avec son projecteur ; braises, confettis dorés, fumée ; flashs de la foule
      seulement sur la célébration (région « crowd », `data-off` sinon). Version mobile de keita-tribune = recadrage de la
      version ordinateur (la version mobile le montre assis dans la cage). Pause hors écran, la célébration fixe avec
      « réduire les animations ». Texte de la célébration en 2e paragraphe de son histoire (6 langues, sans le nom de
      l'organisation ; « Lasana Keita » gardé, orthographe à confirmer). Aucune story ne montre la panthère (la story
      « Keita Losene » montre un écrin vert : même personne ? à confirmer) : sa story prendra la séquence dès qu'elle existe.
- [x] **Jesus Pieces** dans le menu sous Les Créations (ordinateur, téléphone, pied de page) : `/creations/jesus-pieces`,
      `THEMES` dans `src/data/collections.ts` (Red Crown, Samuel Ballet, Red Flowers, Jesus Cross), 6 langues, titre
      Google. **5e introuvable** : toutes les photos et vidéos des dossiers 01–38, des stories et du 08 regardées ; les
      candidates (Thuram SS23 03/04, Collectors 15, 20, 23, 24) sont des 4 connues. Peut-être dans « 99 - NE PAS ENVOYER »
      (jamais ouvert) ou une pièce retirée : demander à Yoni. La page Thuram retirée reste hors ligne.
- `tests/making.spec.ts` (6 capsules, N14, panthère, Jesus Pieces ; ordinateur et iPhone), captures `verification/making/`.
- [ ] Yoni : les doutes de la planche ; la 5e Jesus Piece ; la malle d'Okafor (octogone ou OKA ?) ; l'étui NZ ; des
      photos de fabrication pour les pièces sans étape (Baguette Cross, Cross Infinity, Oval Eternity, Red Crown, Baguette
      Cuban, Rose 20 mm).

## Passe « Sous tous les angles » et 4 pièces retirées (retours de Yoni du 21/11) — état au 21/11/2026
- [x] **Une photo + un texte** sur toutes les pièces (`src/components/EveryAngle.tsx`) : chaque photo et chaque vidéo de la
      pièce a un petit titre et une ou deux phrases, numérotés comme les détails de l'Inter ; ordinateur : photo et texte
      côte à côte en damier, deux par rangée ; tablette : un par rangée, à gauche puis à droite ; iPhone : la photo puis son
      texte. 6 d'abord puis « Voir les N autres » au-delà de 8. Remplace la rangée qui défilait de côté et l'ancienne
      grille. La photo d'ouverture y figure quand l'ouverture montre le bijou détouré, ou quand la pièce n'a pas d'autre
      photo (les montres). L'Inter garde « L'art du détail » (ses 9 symboles) en plus.
- [x] **455 textes** (41 pièces), écrits photo par photo après avoir regardé chacune (vidéos : images extraites, sans son) :
      seulement ce que montre la photo ou ce que la maison a déjà écrit ; aucun chiffre qui ne vient pas de Yoni, aucun nom
      de pierre de couleur, aucun nom de personne privée ni de marque ; corrections de la liste « À vérifier avec Yoni »
      appliquées. Anglais dans `src/data/angles.json` (par pièce puis adresse de photo), traductions dans
      `src/i18n/content/angles/<langue>.json` (5 langues, à faire relire comme le reste, surtout l'arabe).
- [x] **Admin** : « Sous tous les angles » dans chaque pièce (un titre et un texte par photo, puis leurs traductions ;
      vide = la traduction du site, en gris). Colonne `angles` de la base (migration `20261121180000_piece_angles`) ; une
      photo sans texte dans la base prend celui du catalogue ; titre et texte vidés = pas de texte sur le site.
- [x] **4 pièces retirées** (trop peu de photos) : Flâneur, Two-Tone Iced Cuban Chain, White Iced Cuban Chain, Infinity
      Pear Chain. Non publiées (`REMOVED_PIECES`, gardées dans l'admin), adresses redirigées (301) vers /creations
      (`vercel.json` refait). Partout absentes (Créations et ses filtres, « Discover More », stories, plan du site). 41
      pièces en ligne. Les 3 Jesus pieces restent. Leurs univers (`flaneur`, `pluie`) attendent leur retour.
- `tests/angles.spec.ts` (6 pièces dont l'Inter, des chaînes et une montre, ordinateur et iPhone, contraste AA du texte ;
  Créations ; anciennes adresses ; admin), captures dans `verification/angles/`.
- [ ] Yoni : relire les textes (doutes notés par photo : la date « 06-09-2024 » se lit encore sur la photo des griffes de la
      panthère p06 et sur sa photo d'ouverture ; le pendentif de Loïs Openda porte un nom en lettres cursives jamais écrit
      par la maison ; la lettre N sur l'octogone d'Okafor ; le motto « Furchtlos und treu » lu sur la bague VfB ; une bague
      Inter porte « TIKUS » et le 9) ; la story de Kevin Schade dans sa galerie (stories/kevin-schade/01) garde un texte
      d'anniversaire Instagram.

## Passe « 15 univers » (fonds IA de Yoni, effets, effet sur la pièce) — état au 21/11/2026
- [x] **15 fonds** de `00 Contexte Yoni/Univers IA (propositions)/` (`<nom>-desktop.jpg` / `<nom>-mobile.jpg`), préparés par
      `npm run universes` (AVIF + WebP, 3 tailles ordinateur, 2 mobile ; 8,7 Mo en tout, 235 Ko au plus ; originaux hors Git).
      Version mobile sur téléphone, ordinateur sinon. Chaque fond entoure aussi la story de sa pièce (`portrait`).
- [x] **Univers propres** : arène → Lasana Keita (`arene`) ; bianconero → Kenan Yildiz ; serpent → T-Serpent ; Sirius
      (`sirius`) ; tulipes → Tulips on Tour ; Flâneur (`flaneur`, pièce retirée le 21/11) ; trèfle → Eljero Elia (`emeraude`) ; The Hand (`rideau`) ;
      forge → chaîne torsadée de Kevin Schade (`forge`) ; N14 (`n14`). **Partagés** (même nom de preset) : `sacre` (Deniz
      Undav L, Samuel Ballet, croix Tillman, Loïs Openda, Baguette Cross, Jesus Piece Red Crown, Cross Infinity), `roses`
      (Thorned T, FAM, Safi Link, Jesus Cross, BRT Flower), `velours` (collier T au rubis, Jesus Piece Red Flowers, 14 mm
      Cuban), `facettes` (TM, D&E, Baguette Cuban, Oval Eternity ; Two-Tone et White Iced retirées le 21/11), `mecanique`
      (les 3 montres).
- [x] **Effets** (`src/data/themes.ts`, admin « Univers de la page ») : « scene » anime les lumières propres au fond
      (projecteur qui respire, étoile qui scintille, constellation du N qui s'allume étoile par étoile, réverbères, bougies
      qui vacillent et leur fumée, faisceaux du stade, rayons des vitraux, reflets des pavés, air chaud de la forge, rideau,
      reflets qui tournent sur les rouages, ailes des moulins ; positions dans `scripts/universe-media.mjs`, dessin dans
      `src/index.css` « .u-spot ») ; effets dessinés (`src/components/universe/fx.ts`) : flashs d'appareils, serpent de
      lumière dorée, lucioles, gerbes d'étincelles, lignes de lumière, éclats prismatiques, rosée, poussière du faisceau,
      gouttes sous le réverbère, pétales rouges, confettis blancs. **Effet sur la pièce** (`JewelFx.tsx`) : reflet doré,
      éclats blancs ou bleu-blanc, halo rouge ou émeraude qui pulse, lumière chaude, rayon de lumière, reflets
      arcs-en-ciel ; sur un détourage il prend la forme du bijou, sur une photo un cercle doux.
- [x] Lisibilité : voile sombre derrière les textes, bande sombre sous le menu de l'ordinateur sur les fonds IA (sauf
      Genkidama) ; contraste AA vérifié (titre et menu). Pause hors écran et en bas de page ; rien ne bouge avec « réduire
      les animations ». `tests/universes15.spec.ts` (une pièce par univers, ordinateur et iPhone, captures dans
      `verification/universes15/`).
- Moulins : les ailes peintes sont effacées d'une copie de l'image ordinateur (`scripts/universe-inpaint.py`, ciel
  reconstitué) et redessinées en train de tourner ; sur téléphone le moulin est sous le texte, il reste tel quel.
- Approchés, faute de pouvoir bouger une image fixe : les rouages ne tournent pas vraiment (un reflet tourne sur les roues,
  le balancier oscille en reflet), l'air de la forge scintille au lieu d'onduler, le rideau bouge par ses plis d'ombre.
- [ ] Hors des 15 univers (gardent l'ancien) : AS de Stiller et JL de Leweling (`stuttgart`), Rose 20 mm (`maison`).
      Chaîne torsadée de Kevin Schade, panthère et les 3 montres s'ouvrent encore sur
      leur photo (pas de photo du bijou seul) : le fond se voit autour.

## Passe « retours de Yoni du 21/11 » (WhatsApp, univers VfB et Butterfly, Openda) — état au 21/11/2026
- [x] **WhatsApp** : chaque bouton ouvre WhatsApp avec un message déjà écrit, adapté à la page (`src/lib/whatsapp.ts`,
      textes « whatsapp » de `src/i18n/ui/*.ts`, 6 langues). Pièce : « Hello Berete, I discovered the <nom affiché> on your
      website and would like to discuss a bespoke creation of my own. » (phrase de Yoni ; en français « J’ai découvert la
      création « … » sur votre site… ») ; joueur ou club : « the creations made for … » ; collection, Créations, Atelier,
      La Maison, Le Cercle, Écrins Signature, L’Expérience sur mesure, accueil : leur message ; ailleurs un bonjour. Menu,
      barre mobile, pied de page, boutons des pages, stories (la pièce montrée, sinon le joueur). Lien universel
      `https://wa.me/<numéro>?text=…` (iPhone, Android, WhatsApp Web) : wa.me garde le texte entier (accents, «», —, ’),
      vérifié le 21/11. Le numéro reste à remplacer dans `src/lib/site.ts`. `tests/whatsapp.spec.ts`.
- [x] **Univers VfB et Butterfly** refaits avec les images de Yoni (`00 Contexte Yoni/Univers IA (propositions)/`,
      `vfb-stade-*`, `butterfly-foret-*` : version mobile sur téléphone, ordinateur sinon ; `npm run universes`). VfB : fumée
      de fumigènes qui monte (effet « smoke-rise ») et confettis dorés qui tombent (« gold-confetti »). Butterfly : papillons
      de lumière aux couleurs de l’univers, scintillements, la lune qui brille à peine (« moon », position de la lune dans
      `scripts/universe-media.mjs`), bande sombre sous le menu de l’ordinateur. Les fonds faits pour le plein écran
      (`portrait`) entourent aussi la story de leur pièce (Genkidama, VfB dans « collectionneurs », Butterfly).
- [x] **Loïs Openda = Bouzou** : une seule pièce, « Loïs Openda — Script Pendant » (`lois-openda-script-pendant`), créée
      pour Loïs Openda : les 12 photos, le film, le détourage et l’étape brute du dossier 14, plus le gros plan des stories
      (après les détails) et le croquis de Yoni. `script-nameplate-pendant` redirige (301, `RENAMED_PIECES`, aussi dans
      `vercel.json` via `npm run redirects`). Texte de la Cross Infinity Chain : « sur ses photos, elle porte le pendentif
      de Loïs Openda ».
- [x] **Atelier en HD sur écran Retina** : l’aperçu du making-of prend la version HD quand son cadre montre plus de pixels
      que la copie légère (Mac Retina) ; téléphone, connexion lente ou écran simple : copie légère (`AtelierPassage.tsx`).
- `tests/universes.spec.ts` : univers VfB et Butterfly (ordinateur et iPhone, contraste du titre et du menu), story,
  fusion Openda (adresses, page joueur, Créations), Retina.

## Passe « films en HD » — état au 21/11/2026
- [x] **94 originaux** dans `<NN dossier>/Videos HD/` (« NN dossier - video NN - nom d'origine », même numéro que la copie
      de « Videos/ ») : ProRes 422 ou H.264, tous en 1080 × 1920, aucun en HDR, durées identiques aux copies ; les 25 utilisés
      lus en entier sans erreur (14/01 : un repère de chapitre absent, sans effet). Jamais copiés dans Git.
- [x] `npm run films` : **36 films sur 40 en vraie HD 1080p** sur ordinateur (au lieu de 10), H.264, 4,5 Mbit/s au plus.
      Mobile : 720p tiré de la HD, jamais plus lourd qu'avant (1,2 Mbit/s au plus pour un making-of, 1,5 pour le film
      d'ouverture) : 202 Mo pour tous les films au lieu de 207. Images d'attente refaites depuis les originaux. Plus de piste
      de timecode (héritée du ProRes). Une copie de « Videos/ » déjà identique à l'original (21/v02, 08/v05, 04/v01) est gardée.
- [x] Chargement : le film d'ouverture à l'entrée dans la page, l'aperçu de l'atelier seulement quand il arrive à l'écran,
      l'atelier plein écran après le clic ; aucun autre film avant. `tests/films.spec.ts` (Inter, VfB, collier T, panthère de
      Lasana Keita, Jesus Cross, Sirius ; ordinateur et iPhone ; captures dans `verification/films/`).
- [ ] Restés en 720p, faute d'original : making-of du AS (18/v04, vidéo téléphone), de Tulips (24/v12, vidéo téléphone), de
      la chaîne 14 mm (01, dossier Fabrication ; son original 1080p existe en 08/v09 « Videos HD ») et de Sirius (37/v05, 848 × 480). Dragon Ball (13/v01), OKA (34/v03),
      Jesus Piece Red Flowers (20/v02) et les dossiers 36, 37, 38 étaient déjà en 1080p dans « Videos/ ».
- [x] Vidéos courtes des galeries (« Sous tous les angles », 720p, 12 s, 25 tirées des dossiers) : toutes depuis les originaux
      le 21/11 (9 refaites depuis « Videos HD », les 16 autres venaient déjà de fichiers en pleine qualité), même poids.

## Passe « toutes les photos » (galeries complètes, pièces cachées publiées) — état au 20/11/2026
- [x] **Tri refait** de tous les dossiers iCloud (photo par photo, images de chaque vidéo regardées) : tout ce qui est
      utile est gardé (chaque angle, détail, mise en scène) ; retirés : doublons et quasi-doublons (la plus nette gardée),
      flous, captures d'écran et rendus 3D, photos d'atelier (gardées pour la fabrication), visages de personnes privées
      (un joueur seulement s'il est reconnu à coup sûr), dessins animés (Dragon Ball). Liste et ordre dans
      `scripts/hd-media.mjs` (`gallery` : `"p7:front"`, ce que montre chaque photo, `src/data/views.ts`, légendes
      traduites dans les 6 langues ; `also` : fichiers des étapes de fabrication). `npm run import-media -- --only=hd`.
      Ordre : la plus belle d'abord, vues d'ensemble, détails, dos et gravures, portées, écrin.
- [x] **Page d'une pièce** : toutes les photos, plus de limite de 10 (depuis le 21/11 : « Sous tous les angles », une photo
      + un texte, voir plus haut ; chargées au fil du défilement, copie légère, vidéos muettes qui ne jouent qu'à l'écran).
- [x] **Aucune pièce cachée** (demande de Yoni, captures de ses albums iPhone du 20/11, cochées en vert) : toutes les
      pièces des dossiers sont en ligne, sauf les 10 retirées et la chaîne **Tennis** (03, barrée par Yoni : non publiée,
      `REMOVED_PIECES`). Titres = noms de ses albums mis au propre (`NEW_PIECES` dans `src/data/pieces.ts`, jamais le nom
      d'une pierre : « red ruby » devient « Red ») : Bouzou — Pendant (14), Cross Infinity Chain (07, la chaîne du
      Bouzou), BRT Flower Chain (photos arrivées le 20/11 : dossier 36, voir plus bas), Baguette Cross
      (06), Jesus Cross (05), D&E — Pendant (04), Jesus Piece — Red Crown (15), Jesus Piece — Red Flowers (20 : la pièce
      retirée « Marcus Thuram — Jesus Piece », remise en ligne sans nom à la demande de Yoni), Oval Eternity Ring (10),
      Rose 20 mm Cuban Chain (02 + 28/p07), 14 mm Cuban Chain (01 : les vignettes de ses albums le montrent ; 01 et 02 sont
      deux chaînes), N14 — Medallion (22), Lasana Keita — Panther Pendant (19, « Created exclusively for Lasana Keita »).
      Non cochées, titre descriptif : Infinity Pear Chain (09, nom de son album), Baguette Cuban Chain (30, sans doute la
      chaîne du pendentif OKA), Two-Tone Iced Cuban Chain (31), White Iced Cuban Chain (33). 46 pièces en ligne (45 depuis le
      21/11 : Bouzou fondu dans la pièce de Loïs Openda ; 41 après le retrait de 4 pièces le même jour).
- [x] **Photos des joueurs** envoyées par Yoni (19/11) en photo principale, rangées dans « Photos joueurs en maillot »
      (`- 03`/`- 04`/`- 02`, `scripts/player-media.mjs`) : Kenan Yildiz (Juventus), Marcus Thuram (Inter), Noah Okafor
      (Leeds), Loïs Openda (Juventus), Michy Batshuayi (Belgique). Kenan (554 px) et Openda (479 px) sont petites, jamais
      agrandies : à redemander en grand.
- [x] Détourages des nouvelles pièces (8 vues propres : D&E, crucifix, croix baguettes, prénom, Jesus piece, médaillon) ;
      l'alliance et la panthère gardaient le reflet du miroir : elles s'ouvrent sur leur photo.
- Galeries : 156 photos et 77 vidéos avant ce chantier (29 pièces), 402 photos et 95 vidéos après (46 pièces).
- [ ] Yoni : **revers de N14** (dossier 22) : prénoms d'une famille et « 1955 – 2022 » gravés : ni ce
      revers ni le film (22/v08) ne sont montrés tant que la famille n'a pas dit oui. **Panthère** : la ceinture porte une
      date et une heure (les deux gros plans sont retirés). **« BRT-Flower »** ressemble à la chaîne torsadée de Kevin
      Schade : même pièce ? Son album « Openda » montre **The Hand** (en ligne pour un collectionneur privé) : pièce de Loïs
      Openda ? **Homme en casquette verte** (40 photos de la livraison du Butterfly) et **homme en
      lunettes** (remise des bagues VfB) : si c'est Yoni, ces photos peuvent revenir. Visages des joueurs de l'Inter
      (remise des bagues) gardés hors galerie. Tulips on Tour porte « Mason Garments ». Les montres de Thuram et Tajon
      ressemblent à des Cartier Santos glacées. Photos des 4 chaînes isolées du dossier 31 et vidéos 08/v18, v19 à identifier.

## Passe « retours de Yoni et albums 36, 37, 38 » — état au 20/11/2026
- [x] **3 nouveaux albums** dans les scripts (`hd-media`, `film-media`, `cutouts`) : 36 BRT Flower (photographiée enfin),
      37 Sirius, 38 pendentif L de Deniz Undav. Sirius : 27 photos + 1 film en galerie (avant : 2 photos), film d'ouverture
      37/v02, atelier 37/v05 (seule vidéo de fabrication, 848 × 480), étape « avant l'assemblage » 37/p30 ; écrin Sirius en HD
      (37/p01, p03, p04). Écartés : 2 doublons, 37/v01 (même montage que v02), 37/v04 (livraison, visage d'une personne
      privée). BRT Flower : titre « BRT Flower Chain », 11 vraies photos (au lieu de 9 images du film), film 36/v01 et
      making-of 36/v02 en HD, étapes 36/v04 (sertissage) et v05 (fermoir à l'établi). Pendentif L : 10 photos (avant : 1),
      atelier 38/v01, polissage 38/v02. Détourages : Sirius (chaîne + plaque, plaque, revers), pendentif L (3 vues) ;
      BRT Flower s'ouvre sur sa photo (chaîne qui sort de la photo, bouts déchirés au détourage).
- [x] **Créations** : grille serrée, 6 pièces au premier écran (1440 × 900) puis environ 6 à chaque écran, 2 colonnes sur
      iPhone, titre plus petit (`PageIntro compact`, `PieceCard compact` : photo, nom, joueur, « Entrer dans l'univers »).
- [x] **Capsules** : bloc de gauche plus petit et discret (catégorie, « Créée exclusivement pour », titre 28–44 px, phrase,
      boutons de 48 px), la pièce prend plus de place (8 colonnes sur 12 dès 1280 px). Photos de « L'art du détail » à la
      taille de celles de « Sous tous les angles ». « Entrer dans l'atelier » : le making-of joue seul, muet, à l'écran.
- [x] **Collier T au rubis** : ouverture sur le collier entier (26/p01), le T et la pampille en bas à gauche. Ses 3
      détourages perdaient le rubis (pris pour le fond noir) : refaits en le gardant (option `stones` de `cutouts.mjs`).
- [x] **22 reposts de story retirés des galeries** (joueur en incrustation, cadre Instagram, mentions @, textes de story) :
      Dragon Ball (kevin-schade/15), Kenan (kenan-yildiz/02), maillot d'Okafor (noah-okafor/05), OKA (noah-okafor-s24/04),
      T-Serpent (thuram/15), collier T (thuram-ii/01), AS (angelo-stiller/01), JL (jamie-leweling/01), croix Tillman
      (collectors/13, malik-tillman/02), TM (malik-tillman-ii/02, 03), FAM (nz/01), Openda (lois-openda/02), Flâneur
      (collectors/03), Tulips (collectors/53), Butterfly (michy-batshuayi/03), chaîne de Kevin Schade (kevin-schade/23),
      Safi Link (noah-okafor/10), montre de Tajon (tajon-buchanan/01, 02), montre de Radja (radja-nainggolan/01). Ils
      restent dans les stories. Liste vérifiée par `tests/feedback.spec.ts`.
- [ ] Yoni : BRT Flower et la chaîne de Sirius sont le même modèle (maillons torsadés, fleurs, feuilles marquise, fermoir
      BRT) : même pièce photographiée sans la plaque, ou deux chaînes ? (BRT Flower reste en ligne.) Making-of de Sirius en
      meilleure qualité.

## Passe « mise en ligne sur VPS » (tout en un) — état au 20/11/2026
- [x] **Tout sur une machine** (`docker-compose.yml`) : base PostgreSQL 17, site construit (`Dockerfile` : pages, API,
      admin, visualiseur 3D, espace VIP), Caddy devant (`deploy/Caddyfile` : HTTPS tout seul, `www.` → sans `www.`).
      Photos et vidéos du site (1 Go) gardées hors de l'image, prêtées au site depuis le code (`public/media`).
- [x] **Installation en une commande** depuis le Mac : `npm run vps -- install [domaine]` (`deploy/install.sh`) : système à
      jour, Docker, swap, pare-feu, fail2ban, mises à jour de sécurité, SSH par clé, code dans `/srv/berete`, réglages dans
      `/srv/berete/.env` (mots de passe tirés au hasard), données dans `/srv/berete-data`. Sans domaine : `<IP>.sslip.io`.
- [x] **Mise à jour toute seule** à chaque envoi sur GitHub (le VPS regarde toutes les 2 min, `deploy/update.sh` :
      construit à côté, bascule, revient à l'ancienne version si la nouvelle ne démarre pas). Vercel continue en parallèle.
- [x] **Sauvegardes** chaque nuit (3 h 30 Dubaï, 14 jours : base + fichiers 3D, `deploy/backup.sh`, `deploy/restore.sh`) ;
      copie sur le disque externe : `npm run vps -- backup`.
- [x] **Protections** (`server/security.ts`) : en-têtes, `noindex` jusqu'au lancement, limites d'essais (admin, formulaires,
      codes VIP, liens 3D). Commandes : `npm run vps -- status | admin | 3d | domain | set | launch | private | logs`.
- [x] Testé en entier sur le Mac avec Docker (https://localhost:8443) : tous les tests du site, admin, 3D envoyée.
      Attention : le Mac a peu de place (~16 Go libres le 20/11 après ménage ; le disque plein a fait planter les tests) ;
      une construction Docker en prend ~4 (`docker builder prune -af` après). La construction du site ne recopie plus les
      photos dans `dist-ssr` (1,5 Go gagnés, `copyPublicDir` dans `vite.config.ts`).
- [x] Clé SSH du Mac pour le VPS : `~/.ssh/berete_vps` (la clé publique va dans le panneau Hostinger à la création).
- [ ] Malik : acheter le VPS (Ubuntu 24.04, clé `berete_vps.pub`), donner l'IP → ajouter `Host berete-vps` dans
      `~/.ssh/config`, puis `npm run vps -- install`, `npm run vps -- 3d`.
- [ ] Yoni : accès DNS chez one.com (A `@` et `www` vers l'IP), boîte e-mail pour les alertes (SMTP one.com :
      `send.one.com`, port 465), puis `npm run vps -- domain <domaine>` et `set SMTP_…`.
- [ ] Avant d'ouvrir au public : repo GitHub en privé (`npm run vps -- private` d'abord), droits Dragon Ball, `launch`.

## Ce que Yoni a demandé le 9/11 — état au 13/11/2026
- [x] Stories façon Instagram, pages pièces avec histoire et fabrication, 6 langues, page Process, contact WhatsApp.
- [x] Visualiseur 3D maison (remplace iJewel3D) : métaux par calque, lumières, zoom sans recentrage, liens privés,
      espace VIP. Fonctionne seulement avec le serveur (pas sur la version Vercel).
- [x] Pierres soudées au métal dans les STL (bague VfB 0542) : retrouvées et reconstituées automatiquement (458 sur la
      0542, aucune fausse sur les autres fichiers). Restent en métal : les cônes de la bande « DFB-POKAL » et les carrés du
      bord de la tête (diamants posés à l'envers ou sertis vides ? à demander à Yoni).
- [x] **Section « Special Project » Inter Milan** sur l'accueil, juste après le film : les **deux bagues** (Inter et VfB,
      qui s'ouvrent toutes les deux sur le trophée) côte à côte, chacune mène à sa page.
- [x] **Histoire complète de la bague Inter** : section « The details » (9 symboles, chacun avec sa photo, 6 langues) :
      6 mois de travail, 20 étoiles + 20 diamants, noir-bleu du maillot, drapeau italien, « Forza Inter », logo Serie A
      avec le 20, « Inter Milan Campione d'Italia », la coupe cachée, la bague devient pendentif. « Made for Inter Milan »
      (Marcus Thuram reste dans les joueurs liés). Textes à faire relire par Yoni.
- [x] **Players = mur de célébrités** (/players et accueil) : photo de chaque joueur recadrée sur lui (16 trouvées dans
      les stories, initiales en or rose pour les 8 autres), nom, club, Instagram. Admin : « Photo de profil » et
      « Instagram » (aucun pseudo rempli : à saisir). Reste : photos de remise des bagues aux joueurs de l'Inter (Yoni).
- [x] Page Boxes : bouton **« Create your own box »** en haut et en bas (WhatsApp pré-rempli).
- [x] Atelier : vidéo d'ouverture remplacée (plan horizontal net, noir et blanc chaud). [ ] Revoir la vidéo IA verticale.
- [x] Photos des pièces : **haute résolution et fond noir en premier** pour les 15 pièces dont Yoni a envoyé les photos.
- [ ] WhatsApp : vrai numéro (encore 971XXXXXXXXX) ; message pré-rempli selon la page et la pièce (21/11, voir plus haut) ; Bracelet et
      Montre ajoutés au configurateur de contact (fait).
- [x] La Maison : biographie (fait). [ ] Photos personnelles de Yoni (il les envoie).
- [ ] Étapes « croquis → 3D » de chaque pièce (Yoni envoie ses étapes).
- [ ] Vidéos IA à refaire par Malik : mécanisme bague → pendentif (plus clair), explication de la bague Inter en voix
      off grave, en anglais, sans longue intro.
- [ ] Mise en ligne : serveur VPS (KVM 2, environ 7,79 $/mois) pour la 3D, l'admin et l'espace VIP ; reprendre le nom
      de domaine de Yoni (chez one.com).

## Attendu de Yoni (bloque le lancement)
Photos personnelles pour La Maison, autres noms des pièces publiées le 20/11 s'il en veut (et leurs
destinataires), photos des étapes de
fabrication, 2-3 fichiers 3D (.3dm de préférence), vrai numéro WhatsApp, email, accord sur les visuels Dragon Ball.

## Points relevés à l'analyse du 12/11/2026 (à corriger)
- [x] iPhone (SE, 13, 15 Pro Max) : titre, phrase et 3 boutons entiers sous les bulles, noms qui ne se touchent plus ;
  la barre des stories se cache en descendant, revient en remontant, jamais sur le pied de page.
- [x] Film de l'accueil : un halo sombre derrière chaque phrase.
- [x] Aperçus de liens : image 1200 × 630 par page (photo de la pièce, sinon logo + bague), og:locale par langue.
- [x] Vides noirs sous les tuiles Collections (photos recadrées sur le bijou) ; la capsule VfB est reprise dans le
  Special project.
- [x] Fiche technique : « Shared on request » remplacé par ce que montrent les photos (métal, tailles de pierres), marqué
  « d'après les photos, à confirmer » ; ligne absente quand rien n'est sûr (NZ Ring, JACK, Tulips on Tour).
- [x] Saut de mise en page au chargement (CLS 0,15 sur /fr → 0) ; étiquettes des boutons pour lecteur d'écran ;
  « Made for a private collector ».
- 18 photos principales de pièces sur 35 font moins de 900 px de large (captures de stories) : floues sur grand écran.
- [x] Films de l'accueil et de /process en pleine résolution (1920 × 1080, téléphones 608 × 1080) : nets sur grand écran (19/11/2026).
- [x] Alerte e-mail à la maison pour chaque message et demande de rappel (`server/alerts.ts`) : prête, inactive tant que
  la boîte e-mail (SMTP) n'est pas réglée sur le VPS (20/11/2026).
- [x] Admin : 5 essais de mot de passe puis 15 min d'attente, session de 12 h (20/11/2026).
- Toute la version Vercel est en « noindex » (vercel.json) ; le VPS aussi (`SITE_INDEXING=off`) : `npm run vps -- launch`
  le jour du lancement.
- Le repo GitHub est **public** (code, photos des clients, fichier 3D de Yoni) : le passer en privé.

## À vérifier avec Yoni (photos regardées le 13/11/2026)
Des textes brouillons des pièces ne collent pas aux photos : VfB, les pierres rouges autour du blason sont taillées en
écusson, pas en poire ; Inter, le « 20 » est en or rose poli, pas serti (accroche corrigée : « Twenty stars for twenty
titles ») ; Kenan Yildiz, le médaillon « KY » est au poignet, pas sur la bélière ; OKA, le ballon est sur le K ; Malik
Tillman (croix), le centre est en ronds sertis clos, les baguettes font le cadre ; The Hand, une seule pierre rouge
ovale (le texte dit « rubis ») ; Samuel Ballet, la marque BRT est en relief ; Twisted Link et Safi Link, un seul ton
or rose. Les noms des pierres (rubis…) ne sont jamais écrits : seulement leur couleur.
