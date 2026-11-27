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
- Les captures des tests et de l'audit (`verification/`) restent sur le Mac seulement : hors de Git depuis le 25/11/2026
  (les anciennes restent dans l'historique de Git). Le Mac et le disque externe sont presque pleins : supprimer les
  fichiers de travail après usage, et garder sur le disque seulement les planches utiles (`_verif/`).
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
- Mise en ligne : un envoi sur GitHub (main) met à jour le site sur le VPS tout seul (2 à 5 min) : https://beretejewellers.com
  (adresse de secours https://85-190-121-137.sslip.io, jamais indexée). La copie Vercel (berete-nxsp.vercel.app) redirige
  chaque adresse (301) vers le domaine (`MOVED_TO` de `scripts/vercel-redirects.ts`, `npm run redirects`).
- **Site en construction** tant que Yoni ne l'ouvre pas : le public ne voit que « Coming soon » ; le vrai site seulement avec
  le mot de passe d'accès privé (voir « Passe site en construction »). Ne jamais l'ouvrir sans son accord.

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
  **Rhino** : demander les **.3dm** (gardent métal et pierres séparés ; depuis le 26/11 le site maille lui-même les surfaces
  enregistrées sans maillage de rendu).

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
- [x] **La vidéo du produit fini en premier** (depuis le 23/11 : plus à l'entrée, dans sa section « La pièce achevée ») en entrant dans une capsule (`src/components/PieceFilm.tsx`), une fois par visite,
      avec le son (sinon muette avec un bouton son en vue), dans un cadre aux couleurs de l'univers ; « Voir la pièce »,
      Échap ou la fin de la vidéo la ferment ; « Voir le film » la relance. 13 pièces : Inter, VfB, OKA, octogone et maillot
      d'Okafor, croix Tillman, AS, Ruby T, T-Serpent, Tulips, Kenan, The Hand, Butterfly (vidéos regardées image par image ;
      maillot : le petit edit 32/v03 plutôt que le film de livraison). Dragon Ball depuis le 21/11 (son montage 13/v01).
      Sans vidéo : Samuel Ballet, Safi Link et les pièces tirées des stories. Mobile en 720p.
- [x] **Vidéos HD** : arrivées le 21/11 (94 originaux), voir « Passe films en HD ».
- [ ] Yoni : fichiers 3D des pièces (.3dm de préférence), d'abord la bague Inter (ses 9 détails attendent leurs points) ;
      vidéos du produit fini des pièces qui n'en ont pas ; la vidéo de The Hand montre un personnage d'anime gravé sur
      l'écrin (droits, comme Dragon Ball).

## Passe « retours de Yoni du 27/11 après-midi, partie A » (avant The Private Atelier) — état au 27/11/2026
- [x] **La Vision toujours en 2e** sur chaque page de pièce : ouverture → The Vision Behind the Creation → Every Angle → le reste
      (`PAGE_ORDER` / `DEFAULT_ORDER` de `src/data/yoni2711.ts` ; OKA, maillot, T9 changés). Test sur toutes les pages publiées.
- [x] **Genki Dama** (adresse `kevin-schade-dragon-ball-pendant` gardée) : nom de la pièce partout (6 langues), sous le titre « The
      Energy of All » en italique, un filet, « A one-of-one creation for Kevin Schade » (`HERO_LINES`) ; sphère remontée de 15 % de
      la hauteur de l'univers (`drop` de `genkidama-v1` : -0,05 / -0,10, `scripts/universe-media.mjs` et `universes.generated.json`).
- [x] **Inter** : son nom et tous les titres de ses sections en or jaune (dégradé, `index.css`, bloc de fin exclu). Photo 2 sans
      filigrane : **fichier `photo-2-v2.jpeg` pas encore là** (photo actuelle gardée) ; il faudra l'accord du photographe.
- [x] **AngeL Pendant** (Deniz Undav, adresse gardée) : « AngeL » garde son A et son L partout, même dans les titres en capitales
      (`KeepCase` de `src/lib/pieceName.tsx` : le nom du joueur en capitales, la suite telle quelle) ; plus de halo sombre derrière
      le L sur son ciel (`.piece-calm` coupé quand l'univers est « ciel ») ; film de l'album iCloud (`angelFilm`, original 1080p
      dans `.local/yoni-2711/angel-film/`, `node scripts/yoni-2711-media.mjs --only=angel-film,worn`) ; textes mot pour mot
      (`tests/fixtures/yoni-2711b.json`) ; Every Angle p10, p08, p05, p04 ; détails p03, p06, p07, p01, p09 ; « Created exclusively for
      Deniz Undav » dans The Berete Circle avec la photo où il le porte (`CIRCLE_MADE_FOR`, `YONI_MEDIA.worn.angelUndav`).
- [x] **AS Pendant** (Angelo Stiller) : univers fait en code « The Signature » (`as-signature`, `src/components/universe/AsSignature.tsx`,
      `tests/universes2711b.spec.ts`) ; textes mot pour mot ; composition en deux groupes (pendentif, chaîne : un libellé en
      capitales sans valeur = titre de groupe, `RichRows` de `PiecePage.tsx`) ; « The Accompanying Tennis Chain » (p03, p02, p04, jamais
      dans Every Angle : `CHAIN_PHOTOS`) ; « From a Shared Victory to a Personal Creation » + lien vers la bague de Stuttgart (`AS_VICTORY`).
- [x] **JL** : la photo portée avec la cubaine 14 mm en tête de ses photos portées, légende « JL + 14 mm Cuban » (6 langues).
- [x] **Accueil, le rond du mécanisme** : la pièce et le rond remis à leur place d'avant le 27/11 (cadre 4:5, rond sur le coin) ;
      dans le rond seulement, la vidéo remontée (1,25 fois depuis la sphère, 9,5 % plus haut : la boule au centre, plus de noir en haut).
- Tests : `tests/retours2711b.spec.ts`, `tests/home2711.spec.ts` (rond), `tests/universes2711b.spec.ts`. Captures avant / après :
  `~/Downloads/_verif-private-atelier/retours-a/{avant,apres}/` (accueil, Genki Dama, Inter, AngeL, AS, JL ; 1440, 1920, iPhone).
- [ ] Malik : `.local/yoni-2711/inter/photo-2-v2.jpeg` (la photo du joueur assis avec les trophées, version entière). Yoni : accord du
      photographe pour retirer le filigrane ; valider l'univers « The Signature » et les traductions des nouveaux textes.

## Passe « corrections après les contenus de Yoni » (prompt de corrections du 27/11 après-midi) — état au 27/11/2026
- [x] **Maillot d'Okafor — The Moment of Reveal** : le film de Dubaï entier (48,9 s, vertical, image d'attente tirée du film, bouton
      lecture, jamais de son seul), dessous le portrait et la photo de groupe (recadrée en haut seulement : les quatre entiers ;
      côte à côte sur ordinateur, à faire glisser sur iPhone), l'essayage seul dans « See More » ; plus aucune autre photo à leur place.
      Fichiers : `.local/yoni-2711/okafor-dubai/` (noms clairs), `node scripts/yoni-2711-media.mjs --only=okafor-dubai`.
- [x] **Images d'attente jamais noires** (`scripts/film-posters.mjs`, `posterAt` de `scripts/film-media.mjs`, lu aussi par
      `import-media`) : Kenan (13,3 s, les mains croisées de près), maillot (2,4 s, l'écusson suisse), VfB (16,5 s, la bague entière,
      plus l'écrin), croix de Tillman (10 s). Les films de Kenan et du maillot jouent depuis la fin de leur noir (`PLAY_FROM` de
      `src/data/featureFilms.ts`). Test : luminance moyenne ≥ 0,15 pour l'image du premier film de chaque page.
- [x] **Phrases d'accroche, de fin, sous-titres** (`.piece-lead` de `src/index.css` : Cormorant italique 500, 24–28 px, blanc) ; notes
      du maillot (Motif…) à la taille du texte.
- [x] **Dragon Ball : The Art of Detail revenu** (après la composition) : les 4 phrases validées du texte du 23/11 (git ec2d9c67), chacune
      à côté de son gros plan (p09 la sphère, p14 Goku, p16 les sept boules, p11 les tailles tournées), leurs traductions d'alors.
- [x] **T9 : The Evolution of a Signature** en frise sobre (5 noms sur un filet, le T9 seul illustré). Étapes encore sans photo, à
      faire confirmer par Yoni : 1 The Original T, 2 The T with a Sculpted Hand, 3 The T with a Rose-Gold Hand, 4 The T with a Rose-Gold
      Hand and Thorns (le T à épines du site n'a qu'une image IA et une photo sans main visible ; le T-Monster est retiré).
- [x] **Octogone** : Every Angle p09, p10, p05, p07 (le buste p01 tout noir retiré) ; chaînes : 4 puis See More ; lumière blanche / rose
      de la galerie renforcée. **VfB** : « DFB-Pokal » jamais coupé dans le titre (mot à trait d'union gardé entier). **The Art of
      Detail** partout : gros plans plus grands, texte centré sur sa photo, moins d'air entre les blocs. **Inter** : la photo de Yoni
      avec Thuram et Arnautović à côté de l'histoire (loupe), la « photo 2 » en tête des champions (`--only=inter`, `.local/yoni-2711/inter/`).
- [x] **Accueil sur iPhone** : l'écrin remplit le haut de l'écran sous l'en-tête, entier ; la section aussi haute que son contenu.
- [x] **Détourages au niveau studio** (depuis les photos HD du disque ; `scripts/cutouts.py` : bords recalculés sur fond sombre, plus
      aucun liseré ni halo ; plus aucun fondu : une chaîne est entière ou coupée net en haut, `cut: { top }` remplace `fade`, dessinée
      depuis le haut de l'ouverture ; options `peel`, `drop`, `harden`, `edge`, `keepEdge`, `--preview`) : 18 pièces détourées pour la
      première fois (dont le pendentif L, la panthère, la Red Flowers, Oval Eternity, le trèfle, les cubaines, Infinity, FAM sans son image
      IA), 63 vues refaites, 29 ajoutées ; 38 pièces publiées sur 43 s'ouvrent sur un détourage (les 5 autres n'ont que des images IA ou
      portées : T à épines, TM, 3 montres). Non détourables sans inventer : bague NZ (gants), chevalière (main), JACK, JC, 999 (photos
      coupées). `tests/cutouts2711.spec.ts` + `tests/cutout-metrics.ts` (sur gris clair, gris moyen et l'univers : liseré sombre < 8 %
      du bord, voile < 1,5 %, aucun fondu) ; planches `~/Downloads/_verif-corrections-27-11/detourages/`.
- [x] **Écrins uniformes** : DFB-Pokal 2025 Display et World Cup Display (caméra à hauteur d'yeux, socle vu de face) posés sur la
      vraie mise en scène du Butterfly (`scripts/trunk-staging.py` appelé par `scripts/trunk-media.mjs`, `STAGED`, `staged` des données) :
      même socle, même lumière, au pixel près ; vitrine détourée net ; les films gardent leurs raccords. Dragon Ball et The Hand (caméra
      basse aussi) : à passer de même si Yoni le souhaite.
- [x] **D'un univers à l'autre** (`src/components/PieceNav.tsx`) : flèches fines sur les côtés (nom au survol, ← → du clavier quand
      l'ouverture est à l'écran), sur iPhone deux boutons en bas et le glissement ; l'ordre des Créations, en boucle ; fondu (View
      Transitions, sinon fondu court ; instantané avec « réduire les animations »), sans recharger. `tests/piecenav2711.spec.ts`.
- Tests : `tests/corrections2711.spec.ts` (ordinateur, iPhone). Vérifié le 27/11 : en local sur le site construit, 390 + 136 tests
  réussis (les anciens tests mis à jour pour les détourages coupés net, l'accueil iPhone, le T9), `audit:coherence` 0 problème
  (258 pages de pièces + écrins, 6 langues, 1440 et iPhone ; les cartes d'une chaîne coupée en haut admises) ; en ligne (commit
  3619d033) : corrections, contenus, navigation, écrins, univers, Atelier 137 réussis (ordinateur, iPhone), mot de passe réel remis à
  l'identique. Captures : `~/Downloads/_verif-corrections-27-11/{avant,apres,detourages,ecrins,navigation}/`.
- [ ] Yoni : photos studio de la bague NZ, de la chevalière et de JACK ; photos non coupées du JC et du 999 ; une photo HD du FAM ;
      les photos des étapes 1 à 4 du T ; l'original HD du film de Dubaï ; dire si les écrins Dragon Ball et The Hand doivent passer
      sur la même mise en scène.

## Passe « contenus définitifs de Yoni (26-27/11) : 9 pages de pièces, accueil, Atelier, écrins, typographie » — état au 27/11/2026
- [x] **Textes de Yoni mot pour mot** (`src/data/yoni2711.ts`, recopiés par script depuis le prompt de Malik ; les blocs tels quels dans
      `tests/fixtures/yoni-2711.json`, que `tests/contenus2711.spec.ts` compare à la page, caractère par caractère) : « The Vision
      Behind the Creation » (le titre du bloc film + texte partout, 6 langues), « Composition & Craftsmanship » (dans `specs` : un
      libellé en capitales = ligne de Yoni ; ses 3 premiers chiffres en grand, le reste en deux colonnes, « ⸻ » = filet, libellé vide =
      phrase libre, libellé en minuscules = note en petit), « The Art of Detail » (`details`, chacun à côté de son gros plan choisi
      photo par photo, `EXPLAIN` de `src/data/magazine.ts` ; une photo peut venir du dossier de sa chaîne : `baguette-cuban-chain/p06`).
      Pièces : Dragon Ball, VfB, Inter, Kenan (vision seule), OKA, maillot et octogone d'Okafor, T9. Traductions fidèles dans
      `src/i18n/content/<lang>.ts` (anciens textes supprimés ; « Spirit Bomb » = « Genkidama » en français) ; à faire relire, surtout l'arabe.
- [x] **Ordre de chaque page** (`PAGE_ORDER` de `src/data/yoni2711.ts`, `src/pages/PiecePage.tsx` rendu par sections) : Inter (vision →
      Every Angle → composition → détails → The Story Behind the Ring → In the Hands of the Champions → The Art of Presentation →
      Behind the Creation → presse), OKA (Every Angle d'abord, la carte « Worn on / The Two-Tone Baguette Cuban »), maillot (pas
      d'Every Angle : ses autres photos après les détails ; The Moment of Reveal), octogone (The Accompanying Chains, The Berete Circle
      avec la photo de Noah et de l'écrin), T9 (The Evolution of a Signature : seule l'étape 5 a sa photo, les 4 autres attendent Yoni).
      Every Angle partout : 4 photos choisies (`OVERVIEW`, la pièce entière de face d'abord, même si l'ouverture la montre), See More
      juste dessous. Lien vers l'Atelier : « Watch the Making Of ». « Discover His World » pour un joueur.
- [x] **Titres sans le client** : « Dragon Ball Pendant », « Twisted Link Chain », « Snowflake Pendant », « Iced Signet Ring » ;
      « Marcus Thuram — T9 Pendant » (adresse `marcus-thuram-t-serpent-pendant` gardée). L'ancienne adresse du pendentif Inter mène à
      `#piece-details` (le 06 « Beyond the Ring »).
- [x] **Typographie** : tout un cran plus épais (`--font-weight-*` de `src/index.css` : light 400, normal 500, medium 600, semibold 700 ;
      corps 500) ; le texte à côté des pièces en `.piece-text` (17 px, 500) ; **titre de la pièce dans la police de son univers**
      (retour des `@font-face` et de `universeProps`, `npm run audit:coherence` l'admet sur `[data-u-title]`) : Dragon Ball pinceau,
      Stuttgart gothique, Inter en lettres or (Cinzel). Monogramme BRT plus discret derrière les pièces.
- [x] **Films** : Inter = film final de Yoni (album iCloud, original 4K HEVC → 1080p/720p, `scripts/yoni-2711-media.mjs`,
      `src/data/yoni2711.generated.json`, `src/data/yoniMedia.ts`) ; remise aux joueurs : le film complet (49,8 s, déjà un montage :
      le 60-90 s demandé est impossible), un montage de 29 s gardé à côté ; films de moment = `FilmFrame manual` (image + bouton,
      jamais de lecture seule). Les albums ne contenaient aucune photo : 14 images nettes tirées du film 4K dans « View All Moments ».
- [x] **Univers** : Dragon Ball revenu au Genkidama bleu (`genkidama-v1`, `free` + `drop` : la sphère au-dessus de la pièce, l'image
      suit la pièce vers la droite, bords fondus ; pièce « xl ») ; **The Trophy Room** (maillot) et **The Octagon Gallery** (octogone)
      faits en code (`src/components/universe/{CodeScene,TrophyRoom,OctagonGallery}.tsx`, `scenes.css`, `tests/universes2711.spec.ts`).
- [x] **Plus aucune image IA présentée comme une pièce** : couvertures, galeries et détourages tirés de « Pieces sans photo pro (IA) »
      retirés (TM, Thorned T, FAM, 3 montres, chaîne torsadée : `isAiView` de `src/data/showcase.ts`, `withStudio` neutralisé, vignettes
      refaites ; une montre dont les seules photos sont l’ouverture et des photos portées n’a plus d’Every Angle).
- [x] **Accueil** : chargement = le monogramme BRT qui se dessine (`Preloader.tsx`, 2,5 s au plus) ; blocs pièce d'un côté / texte de
      l'autre en alternance (`Feature` de `Home.tsx`), texte = la phrase de la pièce sauf texte écrit dans l'admin (onglet « Textes de
      l'accueil », `ServerSetting` `home.texts`) ; l'image du mécanisme remontée (la pièce entière au-dessus du rond, `tests/home2711.spec.ts`).
- [x] **Atelier** : les chapitres en vrais moments filmés en boucle, muets (`scripts/atelier-chapters.mjs`, `public/media/atelier-chapters/`) ;
      dans la fenêtre de l'atelier « Up next » (même personne, même catégorie…), à la fin « Enter the World » ou « Next film »
      (`tests/atelier2711.spec.ts`).
- Vérifié le 27/11 : en local sur le site construit, 436 tests réussis (pages, contenus, univers, accueil, Atelier, anciens tests mis
  à jour : ordinateur et iPhone) ; `npm run audit:coherence` 258 pages de pièces × 1440 et iPhone + Atelier + écrins, 6 langues,
  0 problème ; `npm run i18n:check` complet. En ligne (commit 65344d51) : `contenus2711`, `universes2711`, `atelier2711`, `film-frame`
  (ordinateur, iPhone) 57 réussis, `home2711` 8 réussis (sans son test admin), mot de passe réel remis à l'identique. Captures avant /
  après : `~/Downloads/_verif-contenus-27-11/{avant,apres}/` (accueil, Atelier, écrins, 8 pages ; 1440, 1920, iPhone ; haut et entière).
- [ ] **Malik** : copier les 4 fichiers de Dubaï (vidéo 00.30.56, photos 00.34.33, 00.34.33 (1), 00.49.17) dans
      `.local/yoni-2711/okafor-dubai/` (macOS bloque leur lecture depuis Téléchargements) puis `node scripts/yoni-2711-media.mjs
      --only=okafor-dubai` ; enregistrer depuis WhatsApp la photo de Yoni avec Thuram et Arnautović et la « photo 2 » (absentes des albums).
- [ ] **Écrins (C)** : uniformiser le socle et le détourage de l'écrin de Stuttgart demande les originaux du disque externe (non branché).
- [ ] Yoni : valider le Genkidama bleu, The Trophy Room, The Octagon Gallery, le film complet de la remise Inter (ou le montage de 29 s),
      les 4 étapes du T sans photo, les images tirées du film de remise ; un original HD du film de Dubaï (copie WhatsApp 720p) ;
      les 3D possibles dans le film de Dubaï (vers 8–11 s, 34–36 s) et le film Inter (gros plans 4–21 s).

## Passe « moteur 3D : corriger ce qui est faux, mode simple, parité iJewel » (retour de Malik du 26/11) — état au 27/11/2026
- [x] **Pierres noires : deux causes trouvées et mesurées** (mode mesure du laboratoire, `?gemDebug=1|2` : rayons sortis,
      rebonds, lumière trouvée) : 1) les fichiers allégés gardent les positions en entiers de 16 bits, three-mesh-bvh les recopiait
      sans les décompresser : la pierre « vue » par les rayons était 32 767 fois plus grande, aucun rayon ne la touchait de
      l'intérieur (grosse émeraude de ZR0982 : 7 % de rayons sortis → 73 %, 0 % de noir ; `floatCopy` de `src/viewer/gems.ts`) ;
      2) les éclairages des pierres étaient noirs sur 90 % du ciel : une taille à degrés renvoyait sa lumière vers le noir. Fond
      doux sous les éclairages épars (`softDome`), trois studios denses (`gem-tente`, `gem-boites`, `gem-escalier`), un rayon encore
      enfermé prend la lumière floutée au lieu d'un tiers de la nette, un rayon qui ne touche rien (pierre ouverte) sort. Bornes de
      sécurité dans `setGemParams` (intensité, gamma, renfort) : aucun curseur ne rend une pierre noire ou blanche plate.
- [x] **Planche des 13 tailles** (`src/viewer/lab/cuts.ts`, `/lab3d?jewel=cuts`, `?quantize=1` pour les positions en entiers) et
      `tests/gems-cuts.spec.ts` (serveur de développement) : chaque pierre, tracée et rapide, sous « auto », Studio, Vitrine, Points
      et en entiers de 16 bits : luminance entre 0,12 et 0,88, contraste ≥ 0,06, < 40 % de noir. Échoue avec l'ancien moteur
      (baguette 55 % noire ; page cassée sur les entiers), passe avec le nouveau. `.local/scripts/cuts-sheet.mjs` fait la planche.
- [x] **Réglage parfait du moteur** (`src/viewer/auto.ts`) : chaque calque reconnu pierre ou métal par son nom PUIS par sa forme
      (facettes taillées qui penchent depuis la table ; une lettre plate en métal reste du métal), famille de taille (à degrés /
      ronde-fantaisie), éclairage des pierres « auto » par calque (bandes en escalier / tente blanche), rebonds (8 à degrés, 7 grosses
      pierres, 4–5 pavé), lueur au seuil 3,4 (seuls les vrais éclats brillent). Un pendentif posé à plat dans le fichier est mis
      debout, pierres devant, bélière en haut (`uprightPose` : la bélière est l'extrémité la plus étroite) ; cadrage serré sur les
      points du bijou avec 10 % de marge (`fitView` de `pick.ts`), aussi pour une photo d'une autre forme que l'écran. Les pièces
      posées à part dans un fichier (3 petites pièces à 23 cm du pendentif OKA, les plaques « N » de l'octogone v2) sont gardées ;
      la caméra cadre la pièce principale (`mainBox` écrit par l'import) et un calque entièrement à part est caché (« Afficher »).
- [x] **Mode simple de l'éditeur par défaut** (`src/pages/admin/editor3d/SimpleMode.tsx`) : 1. Ambiance (6 scènes complètes,
      vignettes faites par le moteur : studio blanc, studio noir, chaud, vitrine, marbre noir Berete, fond transparent), 2. Métal
      (or jaune, blanc, rose, platine, rhodium noir ; tout ou par partie), 3. Pierres (diamant blanc, jaune, rose, champagne, noir,
      bleu, rouge, vert), 4. Vue (face, profil, 3/4, dessus, rotation), Exporter (photo 4K, film 8 s), « Revenir au réglage
      parfait », avertissement « pierres trop sombres / blanches et plates » + « Corriger » (le moteur mesure chaque calque :
      `measureStones`). « Mode expert » ouvre l'éditeur en trois zones. Parcours de Yoni mesuré : fichier Rhino neuf → photo 4K
      en 4 clics et 9 s (`.local/scripts/yoni-path.mjs`, captures `yoni-parcours-1..5.png`).
- [x] **Métaux calibrés** (valeurs et sources dans `src/viewer/materials.ts`) : or jaune 18 ct = ISO 8654 « 3N », or rose 18 ct =
      « 5N » (CIELAB de la norme converti), platine, palladium, argent (physicallybased.info), or blanc rhodié (rhodium ≈ 78 %).
      Nouvel éclairage métal par défaut « Studio clair » (jamais de noir à refléter, un panneau doux face au bijou) ; « Studio chaud »
      éclairci. Ambiances d'avant « studio » et « chaud » : Studio clair + pierres « auto ».
- [x] **Vignettes** : pierres et éclairages des pierres rendus par le vrai shader sur un rond brillant vu de 3/4 (plus jamais de
      boule blanche), ambiances du mode simple (`npm run`… `npx tsx scripts/lab-thumbs.ts`, `ONLY=gems|ambiance|…`).
- [x] **Options iJewel ajoutées** : film irisé et teinte (LUT) par matière, LUT de scène (`src/viewer/looks.ts`, looks faits par code),
      tons « Neutral », vernis/rugosité/couleur du métal par calque, mise au point par clic, flou du sol miroir, carte intérieure
      256/512/1024 au choix, vitesse et sens de rotation, limites d'angle, déplacement latéral oui/non, itérations de lueur 0–7.
      Tableau complet : `docs/3d-parite-ijewel.md` ; réglages testés un par un : `docs/3d-reglages-testes.md`.
- [x] Assistants de la passe : essayage (la bague suit l'axe et la largeur du doigt, moitié arrière cachée par un cylindre invisible,
      photo enregistrée à l'endroit ; `tests/tryon.spec.ts`), fichiers Rhino (calques éteints sautés, blocs vérifiés,
      `scripts/rhino-check.ts`, `tests/rhino-files.spec.ts`, `tests/rhino-framing.spec.ts`), visualiseur client (6 langues partout,
      un seul choix de métal, image d'attente + barre, fond transparent, logo, `/embed/<jeton>` + bouton « Intégrer », WebXR sur
      Android ; `tests/client3d.spec.ts`), export (GLB avec notre extension `BERETE_gem`, fichier `.berete-scene.json`, USDZ, WebM 4K,
      import d'un HDR/EXR personnel `storage/hdri/`), confort (annuler/rétablir, raccourcis, comparaison avant/après à trait
      coulissant, préréglages appliqués à plusieurs modèles, versions, aperçu sur la page de la pièce ; `tests/editor3d-confort.spec.ts`),
      site (pendentif L sans rectangle noir, image d'attente des films derrière la vidéo, « The Art of Detail » rééquilibré).
- Réglages experts testés un par un (`npx tsx scripts/settings-audit.ts`, ~1 h, `PHASE=lab,extremes,ui,doc`) : 154 réglages,
  140 OK, 9 réparés (intensité de l'éclairage des pierres jamais lue, puissance de la lueur jamais appliquée, LUT de scène…),
  7 retirés (biseau à l'écran : ne changeait rien ; lumière « Ambiante » ; « Studio sombre » et brossé cachés : métal noir ou
  blanc plat), aide « ? » + aperçu avant/après (`public/media/3d-lib/help/`). Tous les curseurs des pierres poussés ensemble :
  53 images lisibles sur 56, plus aucun noir nulle part (reste : un gris foncé à 0,11 sous « Spot », deux blancs sous
  « Contre-jour » et « Ancien rendu »). La garde : lumière reçue × gain bornée 0,7–2,1, exposition vue par les pierres
  0,8–1,4, plancher de lumière qui grandit avec le nombre de réglages poussés vers le sombre (`floorK` de `gems.ts`).
- Vitesse (Mac de Malik, machine libre) : 54–60 images/s sur ordinateur (Chrome, Safari), 60 en iPhone émulé (carte graphique
  du Mac : jamais mesuré sur un vrai iPhone), lien client en 4G simulée : image d'attente 1,7 s, bijou 1,9 s. La grosse émeraude
  de ZR0982 (108 000 triangles) est tracée sur son enveloppe convexe (`hullOrCopy`) : 17 → 54 images/s.
- Tests : `gems-cuts` (serveur de développement), `rhino-framing`, `rhino-files`, `client3d` (`--workers=1`), `tryon`,
  `editor3d-confort` ; local le 27/11 : site ciblé 205 réussis, 3D et admin 61 réussis, 0 échec ; en ligne le 27/11 : `editor3d`,
  `client3d`, `film-frame`, `retours2511`, `audit2411` (ordinateur, iPhone, Safari) 76 réussis, mot de passe réel remis à
  l'identique. Les 3 fichiers Rhino de Yoni ne sont que sur le Mac (pas dans l'admin en ligne).
- Captures : `~/Downloads/_verif-3d-v3/` (planches avant/après, émeraude, vignettes, métaux, fichiers Rhino, essayage,
  comparaisons photo/rendu, parité, parcours de Yoni). Photos de comparaison prises sur le site (disque externe non branché).
- [ ] Yoni : un export iJewel d'une pièce (pour une vraie 3e colonne iJewel : aucune comparaison avec iJewel n'a été faite) ; le
      .3dm de la bague VfB (le STL soude les pierres : rouges et baguettes reconstituées en blanc) ; la boule du pendentif OKA est sur
      le calque du métal blanc (elle sort blanche, en or rose sur la photo) ; dire si les plaques « N » à côté de l'octogone v2 servent.

## Passe « 3D au niveau d'iJewel » (visualiseur et éditeur, cahier des charges v2) — état au 26/11/2026
- [x] **Diamants refaits de zéro** (`src/viewer/gems.ts`) : chaque pixel suit la lumière dans la pierre (réfraction, réflexions
      internes, sortie) jusqu'à **l'éclairage des pierres**, séparé de celui du métal (Environment / Gem Environment). Tous les
      réglages d'iJewel, mêmes noms (`DiamondParams` de `src/data/scene3d.ts`) : Environment, Color, Env Intensity (1,30), Env
      Rotation + X/Y/Z, Dispersion, Absorption, Refractive Index (2,60), Gamma, RGB Boost, Transmission, Reflectivity, Ray
      Bounces (5, jusqu'à 16), Diamond Oriented Lighting ; Fixed Env Direction pour la scène ; inclusions en option. **Deux modes** :
      lancer de rayons (BVH, grosses pierres et pierres soudées) et **mode rapide** (une image cube des normales intérieures par
      taille de pierre, 256/512/1024 selon le nombre, partagée par toutes les pierres de même taille : l'équivalent du cacheKey).
      Piège corrigé : three-mesh-bvh accepte un impact 10 µm derrière le rayon (`TRI_INTERSECT_EPSILON`), le rayon retouchait sa
      propre facette (pierres floues) : 1 µm. Ancien rendu gardé (`gem-classic`, « Ancien rendu »).
- [x] **Bibliothèque d'éclairages faite par code** (`src/viewer/hdri/library.ts`, `npm run hdri` → `public/hdri/berete/<id>.hdr`
      2048 × 1024 et `-1k` pour les téléphones, RGBE, 16,9 Mo) : 10 « métal » (studio chaud, grandes boîtes, horizon, salon flou,
      jour, contre-jour, studio sombre, anneau, trois lumières, fenêtre) et 10 « pierres » (bandes, points, anneau, spot, vitrine,
      contre-jour, croix, ciel étoilé, studio — par défaut —, ancien rendu). Les éclairages des pierres ramenés au niveau du studio
      (`GEM_GAIN`) ; le studio a reçu une bande basse et des cartes dessous (sans elles un pavé serti virait au noir).
- [x] **Effets** (`src/viewer/screen.ts`) : un premier passage d'écran (normales, profondeur, miroir, lueur par matière) sert aux
      **reflets à l'écran (SSR, réglages iJewel)**, au **biseau à l'écran (SSBevel, scène 0–8, matière 0–16)** et à la **lueur par
      matière** (bloom avec seuil, seuil doux, intensité, rayon, puissance, itérations, mode contrôle). Tons : 6 modes (ACES, AgX,
      linéaire, Reinhard, Cineon, Uncharted 2), exposition, saturation, contraste, fond transparent ; AO, profondeur de champ,
      vignette, aberration, grain. Rendu progressif à l'arrêt (48 images, 96 en « très haute ») et **TAA en mouvement**
      (`accumulate.ts`). Sol : ombre douce (AccumulativeShadows + lumière aléatoire), ombre de contact, sol réfléchissant.
      Lumières en plus. Vues de caméra (`cameraPath.ts` : durée, ease, sphérique/linéaire, pause, boucle). Pose stable (`pose.ts`).
- [x] **Éditeur de l'admin** (`src/pages/admin/editor3d/`, remplace « Régler le modèle ») en trois zones : à gauche en un clic avec
      vignettes (éclairage du métal, des pierres, fond, ambiances, socle, sol, pose, exporter, rendu en série, réglages avancés,
      essayage) ; au centre la pièce, contour or rose au clic, barre d'outils (plein écran, réinitialiser, recadrer, vues en boucle,
      animation, rotation, capture, .glb) ; à droite les onglets Vue, Parties, Scène, Rendu, Effets, Vues de caméra, Configurateur,
      Export. Enregistrer / Annuler. **117 vignettes faites par notre moteur** (`scripts/lab-thumbs.ts` → `public/media/3d-lib/`) à
      l'aide du **laboratoire 3D** (`/lab3d`, sur le Mac seulement : la route n'existe pas dans le site construit).
- [x] **Bibliothèque de matières** (`src/viewer/library/materials.ts`, 82) : or jaune/blanc/rose 18 et 14 ct, platine, palladium,
      argent, rhodium noir × poli, satiné, brossé (sens réglable), martelé, vieilli ; émaux ; diamant avec et sans feu, diamants de
      couleur, saphirs bleu et rose, rubis, émeraude (+ inclusions) ; perles avec orient, céramique laquée, onyx, nacre. Chaque
      matière s'exporte et s'importe en `.json`. 5 nouveaux métaux dans `METALS` (14 ct, palladium, argent ; 6 langues) ; le client
      se voit proposer par défaut les 5 d'avant (`CLASSIC_METALS`).
- [x] **Socles faits par code** (`src/viewer/stands.ts`) : écrin à bague ouvert, présentoir, cône, socle en marbre noir Berete,
      buste ; textures par code (`src/viewer/textures.ts`) ; fond « Marbre noir » ajouté (6 langues).
- [x] **Import comme iJewel** (`server/models/pipeline/`) : calques `Metal`, `Metal 01–05`, `Head` → métal ; `Gem`, `Gem 01–05`,
      `Diamond` → diamant ; les autres gardent leur couleur ; FBX lu ; contrôles en mots simples (`stats.notes`, `stats.checks` :
      triangles et alerte au-delà de 200 000, unités, pièces retournées corrigées, pierres en copies) ; **maillage des NURBS par le
      site** (`nurbs.ts`, rhino3dm + cdt2d) : les 3 fichiers Rhino de Yoni s'ouvrent en entier (pendentif OKA d'Okafor, octogone « N »
      d'Okafor en deux versions), 3 234 faces, 0 échec. Lecture des exports iJewel (`src/data/ijewel.ts` : GLB `WEBGI_materials_diamond`
      à l'import, scène `.vjson` dans l'onglet Export) **écrite sans exemple réel : à vérifier sur le premier export de Yoni**.
- [x] **Visualiseur du client** (`JewelViewer.tsx`) : vues enregistrées et visite guidée, configurateur en pastilles en bas, + et −
      (ordinateur), recadrer, invite « Glissez pour tourner », partager, limites du zoom par orientation, qualité ; **essayage des
      bagues** (`src/viewer/tryon/`, MediaPipe Hands en local dans `public/mediapipe/`, 25,9 Mo, chargé seulement au clic ; réglage
      par bague sur un cylindre dans l'éditeur ; à cocher par pièce) ; **« Voir chez moi »** (Quick Look iPhone, USDZ fait sur le
      téléphone ; Scene Viewer Android) ; **Seek on Scroll** sur la page de la pièce. Caméra autorisée par le serveur
      (`camera=(self)`), fichiers de l'essayage admis sur les pages privées.
- [x] **Export** (`src/viewer/export/`) : images PNG/JPEG/WebP jusqu'à 4K (fond transparent), films MP4 (tour ou parcours des vues,
      6–15 s, 1080p/4K, carré, 9:16, 16:9) encodés dans le navigateur (WebCodecs + mp4-muxer, sinon MediaRecorder), rendu en série
      (vues × métaux, zip), fichier .glb. Testé sur le vrai moteur : 4K transparent en 1 s, film 1080 × 1920 de 8 s en 16 s.
- [x] **Lien de partage chiffré** (`server/routes/shares.ts`, `/s/<token>`, `src/pages/SealedView.tsx`) : 7 jours par défaut, mot
      de passe facultatif, AES-256-GCM sur l'appareil, le mot de passe jamais envoyé (sans mot de passe, la clé reste dans `#k=`).
      Migration `20261126120000_sealed_shares`. Les éclairages (`/hdri`) passent maintenant aussi sur les pages privées (le métal
      était presque noir sur `/view/<token>`).
- Captures et planches : `~/Downloads/_verif-3d/` (éditeur, éclairages, matières, socles, planche `diamants.jpg`, essayage,
  export 4K et film, fichiers Rhino de Yoni). Tests : `tests/editor3d.spec.ts` (ADMIN_PASSWORD ; l'ordinateur et le téléphone
  changent chacun un modèle différent, remis à l'identique). Sans carte graphique (rendu logiciel : tests sans écran, certains
  ordinateurs de bureau), le visualiseur prend la version légère d'un téléphone (`lowEnd` de `Stage.tsx`). Batterie locale du
  26/11 : 732 réussis, 1 échec par interférence (galerie de l'Inter pendant que `capsules` y pose un modèle 3D ; réussi seul).
  En ligne le 26/11 : `editor3d` (ordinateur, iPhone, Safari) et `retours2511` (33) passent ; modèles en ligne vérifiés propres ;
  mot de passe d'accès réel remis à l'identique. Fluidité mesurée sur ce Mac : 60 images/s en tournant (bracelet de 3 601
  diamants compris), ordinateur et téléphone simulé.
- [ ] Reste en dessous d'iJewel : le rendu des pierres soudées au métal des STL (bague VfB 0542 : pierres reconstituées, grises) ; la
      lecture des exports iJewel n'a vu aucun vrai fichier ; vitesse jamais mesurée sur un vrai iPhone 13 ni un MacBook Air M1.
- [ ] Yoni : un **export iJewel** (GLB + .vjson) d'une pièce pour la planche iJewel contre nous ; les fichiers Rhino des autres pièces
      (calques nommés « Metal 01 », « Gem 01 » si possible) ; l'avis de son spécialiste 3D sur les diamants.

## Passe « retours de Yoni du 25/11 (2 appels + vidéo de l'Atelier) » — état au 26/11/2026
- [x] **WhatsApp** : le vrai numéro de Yoni, **+971 58 593 0211** (`WHATSAPP_NUMBER` = `971585930211`, `PHONE_DISPLAY` de
      `src/lib/site.ts`), sur tous les boutons et dans les données des pages (`telephone` de l'organisation,
      `src/extensions/seo/settings.ts`). Test : chaque lien du site est `https://wa.me/971585930211?text=…`.
- [x] **Pages des pièces en magazine** (`src/pages/PiecePage.tsx`, `src/components/MagazineGallery.tsx`, `src/data/magazine.ts`) :
      après l'ouverture, le film à gauche (collant en descendant, barre pour avancer ou reculer : `src/components/SeekBar.tsx`) et
      à droite « Behind the Creation », la phrase et l'histoire (le nom est juste au-dessus, dans l'ouverture : une seule fois par
      page, règle de l'audit) ; puis « Every Angle » : 4 photos d'ensemble (principale, face, profil, dos) ; puis
      « The Art of Detail » : au plus 5 photos de détail en petit, chacune à côté de la phrase de Yoni qu'elle montre, texte et photo
      alternés ; puis « See more ». `EXPLAIN` : la photo de chaque détail et sa phrase (référence à un paragraphe ou à des phrases
      de l'histoire, ou à un détail : jamais un texte nouveau), 28 pièces faites photo par photo ; une phrase déplacée à côté de sa
      photo quitte l'histoire du haut (lue une fois) ; une traduction coupée autrement prend le paragraphe entier ; l'histoire du
      haut garde toujours un paragraphe. `OVERVIEW` : photos d'ensemble choisies à l'œil (Dragon Ball, T-Serpent). L'**ordre de
      l'admin prime** (`adminOrdered` : la liste de la base n'est pas celle du catalogue). Les légendes écrites dans l'admin
      s'affichent sous la photo et en plein écran (`ownCaption`). Films de la visionneuse : la même barre.
      **Correction du 26/11** (capture de Malik : le film en bande étroite de 128 px, noir dessus et dessous, boutons coupés) : le
      cadre du film prend sa largeur de sa hauteur et de ses proportions (`FilmFrame` de `src/components/FeatureFilm.tsx`), plus
      jamais « à la taille de son contenu » (un navigateur le mesurait à sa barre de progression, 129 px par défaut) ; serré, il
      garde ses proportions et ses boutons passent sur deux lignes. `tests/film-frame.spec.ts` (7 tailles de fenêtre, colonne
      serrée à 128 px ; ordinateur, iPhone, Safari ; vérifié aussi dans Firefox).
- [x] **Loupe au survol** (`src/components/Lightbox.tsx`, `MagnifyingGlass`) : ronde, 180 px, bord or rose, tirée du fichier loupe ;
      seulement sur la photo (jamais sur les flèches, la croix, à côté) ; molette = grossissement ×2 à ×5, jamais plus d'un pixel du
      fichier par point d'écran ; clic pour zoomer et glisser gardés ; iPhone : appui long, la loupe au-dessus du doigt et qui le suit.
- [x] **Pendentif L** : l'image IA retirée partout (photo studio, détourage, vignette, carte, Cercle) ; ouverture sur la vraie
      photo p10 (le L entier, l'illusion de relief), aux bords fondus dans le noir, une ombre douce derrière (`.opening-halo`) :
      détourée, elle perdait soit le L, soit les ombres de l'angelot. Les autres images IA encore en ligne (Thorned T, TM, FAM, les
      3 montres) : liste et vraie photo la plus proche dans `~/Downloads/_verif-retours-25-11/photos-ia.md`, **à valider par Yoni**.
- [x] **Univers Dragon Ball v2** (`genkidama` : canyon en feu, éclairs bleus, sphère en haut ; l'ancien gardé en `genkidama-v1`,
      choisissable dans l'admin) : la pièce (taille « large ») juste sous la sphère, le bas de la sphère calé sur le haut de la pièce
      à toutes les tailles (`below` du fond) ; énergie qui monte (genkidama), éclairs dans les nuages (régions `bolts`), braises des
      feux (région `fires`) ; la vignette Dragon Ball (Créations, accueil) sur ce décor, bords fondus (`THUMB_DECOR` de `PieceThumb`).
- [x] **Inter et VfB** : l'or des champions (`gold-light` : lueur et reflet dorés, confettis dorés, filet or sous le titre).
      **Profondeur double** sur tous les univers à fond (`src/components/universe/depth.ts`) : cartes de profondeur par Depth Anything
      V2 small en ONNX sur le Mac (`npm run universes:depth`, `scripts/universe-depth.py`, modèle dans `.local/models/`, jamais dans
      Git ; onnxruntime dans `.local/venv-cutout`) ; le fond en plans dans un shader WebGL, le bijou bouge un peu avec la souris, le
      fond moins et à l'inverse ; sans WebGL une parallaxe CSS ; iPhone : dérive lente ; rien avec « réduire les animations » ;
      arrêté hors écran.
- [x] **Univers calés sur la pièce** (`src/components/Universe.tsx`, `data-anchored`) : chaque fond a son point d'ancrage
      (`anchor` / `mobileAnchor` de `universes.generated.json`, `npm run universes -- --meta` les réécrit sans refaire d'image) ; l'image
      est placée pour que ce point soit sous le centre de la pièce, quelle que soit la fenêtre. Planche des 22 univers à 390, 430,
      1280, 1440, 1920 et 2560 px : `~/Downloads/_verif-retours-25-11/univers/` (`.local/scripts/univers.ts`).
- [x] **The Bespoke Journey** : « Follow your piece, live » / « Suivez votre pièce, en direct » (signature de la maison, encadré, entre
      les étapes 03 et 04) et « How is the price set? » / « Comment le prix est-il fixé ? » (budget du client, budget minimum, ce dont
      le prix dépend ; aucun chiffre), 6 langues.
- [x] **Atelier** : le making-of dans une scène d'atelier (vraie photo de l'établi floue et assombrie, lampe chaude, grain, le film
      posé sur l'établi), le nom et les étapes de la pièce, plein écran dans les deux sens ; iPhone : la scène autour du film.
- [x] **Admin** : petit cadenas en bas du pied de page vers /admin, seulement pour un appareil entré par l'accès privé ou l'admin
      (marque `bj_in`, `server/access-state.ts`) ; « Stories » retiré ; modèles 3D en cartes avec aperçu, « Régler le modèle » :
      métal, métaux à essayer, lumière, diamants, fond, angle de départ, puis Enregistrer (calques en réglages avancés) ; **diamants
      « Réaliste »** (studio chaud, éclats seulement là où la lumière tape, dispersion légère, `DIAMOND_LOOKS`) ou « Ancien rendu ».
      **Ce que Yoni change dans l'admin reste** : l'ordre des pièces n'est plus remis à l'ordre du catalogue après qu'il les a ordonnées
      (`admin-ordered:<kind>`), une photo retirée ou l'ordre des photos ne reviennent plus à la mise à jour suivante
      (`mergeChosen`, `gallery-seed:<pièce>`). `tests/admin-sync.spec.ts` (ADMIN_PASSWORD) change chaque réglage, vérifie le site,
      remet l'état d'origine.
- `tests/retours2511.spec.ts` (ordinateur, iPhone, Safari), captures `verification/retours2511/` ; avant / après :
  `~/Downloads/_verif-retours-25-11/avant/` et `apres/`. Toute la batterie passe en local (759 tests) ; `npm run audit:coherence`
  local : 522 pages × 1280, 1440, 1512 Retina, iPhone, **0 problème** (26/11). En ligne le 26/11 : `retours2511`, `whatsapp`,
  `admin-sync` (sur la vraie base, remise à l'identique), `audit2411` (ordinateur, iPhone, Safari). Tests en ligne derrière la porte :
  mot de passe de test, l'empreinte du vrai mot de passe mise de côté puis remise à l'identique (les appareils de Malik et Yoni
  retrouvent leur accès).
- [ ] Yoni : relire les phrases à côté des photos de détail ; valider les photos IA restantes ; l'avis de son spécialiste 3D sur le
      rendu des diamants ; ses textes.

## Passe « site en construction + accès privé » (beretejewellers.com en ligne) — état au 25/11/2026
- [x] **Domaine en ligne** : beretejewellers.com et www pointent sur le VPS (A 85.190.121.137, AAAA 2001:880:a:337::1d0,
      testé en IPv6), HTTPS Let's Encrypt (demandé à la première visite, `on_demand_tls` de `deploy/Caddyfile`), www → domaine
      (301), HSTS. E-mail du domaine intact (MX one.com, `ed1._domainkey`). Vercel redirige tout vers le domaine.
- [x] **« Coming soon » pour le public** (`server/access.ts`, la barrière ; `server/door.ts`, la page) : sur toutes les
      adresses (pages, 6 langues, photos, films, /media, sitemap, API du site : 403), y compris l'adresse sslip.io. Fond noir,
      monogramme BRT or rose, BERETE JEWELLERS, « Coming soon » / « Bientôt disponible » (langue du navigateur), la signature,
      @beretejewellers (`src/lib/site.ts`) ; ses seuls fichiers : `public/soon/` (`npm run soon` : monogramme, polices, image
      d'aperçu 1200 × 630). Aperçu de lien : « Berete Jewellers — Coming soon » + monogramme. `noindex` partout, robots.txt
      interdit tout, pas de sitemap.
- [x] **Accès privé** : lien discret « Private access » / « Accès privé » en bas → un mot de passe → le vrai site, à la page
      demandée (un lien de pièce envoyé par WhatsApp), 180 jours par appareil (cookie `bj_access` HttpOnly, Secure, SameSite=Lax,
      signé avec le secret du serveur et le mot de passe : changer le mot de passe referme tous les appareils). 5 essais par
      minute et par adresse IP. Se connecter à l'admin ouvre aussi le site sur cet appareil.
- [x] **Toujours accessibles** : /admin (sa propre porte au même style, puis le mot de passe admin), les liens des clients VIP
      (/vip/<jeton>, l'espace une fois entré, le code d'accès) et les liens 3D (/view/<jeton>) : leur page **seule**, sans le
      menu ni les pages du site (`PrivateApp` de `src/App.tsx`, `<meta name="bj-private">`), avec seulement le code des pages
      et le logo ; /api/health. Rien d'autre.
- [x] **Admin → « Accès au site »** (`src/pages/admin/Access.tsx`, 1er onglet) : interrupteur « Site en construction »
      (activé par défaut ; le décocher ouvre le site à tous, après confirmation), mot de passe tapé deux fois, phrase d'état.
      Seule l'empreinte (scrypt + sel) est gardée, dans la base (`ServerSetting` : `access.construction`, `access.password`) :
      sauvegardée chaque nuit, gardée aux mises à jour et restaurations. Sans réglage ou base illisible : en construction.
      Tant qu'aucun mot de passe n'est choisi, personne n'entre et l'admin s'ouvre sur « Choisissez le mot de passe… ».
- [x] **Terminal (secours)** : `npm run vps -- access` (mot de passe demandé deux fois, masqué), `access off` (ouvre le site),
      `access on`, `access status` ; `status` l'affiche ; `launch` refuse tant que le site est en construction. Le serveur voit
      un changement fait au Terminal en 5 s.
- [x] **Tests** : `ACCESS_PASSWORD=… ` (tapé dans le Terminal, jamais écrit) fait entrer les tests (`tests/fixtures.ts`) et
      `npm run audit:coherence` (`BASE_URL=https://beretejewellers.com`). Sur le Mac, le serveur local n'arrête pas le Mac
      lui-même (`ACCESS_LOCAL=closed npm start` pour tester la barrière). Vérifié en ligne le 25/11 sur le domaine et sslip.io
      (ordinateur, iPhone, Safari) : sans accès 10 pages, 5 fichiers /media, sitemap → « Coming soon » ; lien profond → même
      pièce ; mauvais mot de passe → message ; 6e essai bloqué ; accès gardé après redémarrage ; nouveau mot de passe → tout
      refermé ; admin et lien VIP (3D) sans le mot de passe du site, client de test supprimé ; mot de passe de test effacé.
      `npm run audit:coherence` une fois entré : 522 pages × 1280, 1440, 1512 Retina, iPhone, 0 problème (le profil de
      Mittelstädt repassé seul après un chargement lent). Adresses détournées (`/soon/../…`, points encodés) refusées : seuls
      les fichiers de la porte et des pages privées passent, chacun par son nom exact.
      Captures : `/Volumes/Disque externe/_verif/acces-prive/`.
- [ ] **Malik** : admin → Accès au site → choisir le mot de passe (aujourd'hui personne n'entre) ; `npm run vps -- set
      OPENAI_API_KEY` et `set SMTP_USER SMTP_PASS ALERT_TO` (valeurs demandées sans s'afficher ; send.one.com, port 465 déjà
      réglés). Puis tester qu'un message du formulaire arrive à ALERT_TO.
- [ ] **Dépôt GitHub encore public** (code et photos lisibles) : le VPS lit déjà GitHub avec sa propre clé, le dépôt peut passer
      en privé sans rien casser (`gh repo edit MalikosDM/Berete --visibility private`). Anciennes adresses de chaque version
      Vercel : vérifier dans Vercel que « Deployment Protection » les protège (seule l'adresse principale redirige).

## Passe « audit du site en ligne (24/11 au soir) : 14 incohérences » — état au 25/11/2026
- [x] **Plus de mention provisoire** : la ligne « Precious materials … to be confirmed by the atelier » et la ligne « Matières
      précieuses » tirée des photos ne s'affichent plus (seulement ce que Yoni a donné) ; l'audit interdit « to be confirmed »,
      « à confirmer », « TBD », « placeholder », « coming soon » (et leurs équivalents).
- [x] **Plus de section vide** : pièce pour un collectionneur privé = une fine ligne sous son nom (`data-made-for-line`, accordée) ;
      la section « Created exclusively for » seulement s'il y a une personne (ou des photos portées : « Worn »). L'audit vérifie
      qu'aucun titre de section n'est suivi d'un autre titre ou du pied de page.
- [x] **Vignettes sur le même noir** (`src/components/PieceThumb.tsx`, `npm run thumbs` → `scripts/thumbs.ts`,
      `src/data/thumbs.generated.json`) : le détourage de l'ouverture (35 pièces) sinon la photo de couverture aux bords fondus ;
      le bijou à 65 % de la hauteur du cadre, centré (sa place mesurée dans l'image ; `BOX` pour corriger à la main : panthère,
      Oval Eternity, Red Flowers sans leur reflet ni leur sol) ; une photo n'est montrée qu'autour du bijou, bords fondus ; un bijou
      plus large que haut (chaînes, Sirius, Loïs Openda) remplit la largeur du cadre (94 %) au lieu de 55 % de sa hauteur. Créations,
      accueil (cartes et bagues Inter / VfB), « autres créations », profils. L'audit mesure le bord (6 px, ≤ 3 % plus clair que la
      page) et la part du bijou (55–75 % de la hauteur, ou ≥ 85 % de la largeur pour un bijou plus large que haut). Planche :
      `/Volumes/Disque externe/_verif/audit-2411/vignettes-avant-apres.jpg`.
- [x] **Cercle** : une règle pour toutes les cartes (le nom ; le club dessous seulement Inter Milan ou VfB Stuttgart) ; le numéro
      seulement sur la page du joueur (« No. 9 »), plus sur la page du club. **Sambi Lokonga** hors du Cercle et du plan du site
      (301 vers /players) tant qu'il n'a pas de pièce publiée (règle générale de `publicCatalogue`). Portrait de **Tanguy Nianzou**
      recadré sans le texte de la story (`scripts/piece-media.mjs`).
- [x] **Un seul nom** : « In Pictures » / « En images » (« The Moments » retiré), « Their Creation(s) » / « Leur(s) création(s) »
      pour un club, l'écrin de The Hand porte le nom de la pièce dans chaque langue (« Cube La Main »…). L'audit vérifie qu'une
      pièce porte un seul nom par langue.
- [x] **Titres de section** : un seul style (capitales espacées) ; la phrase de l'Atelier devient une citation en italique ;
      « Your story, in diamonds » une seule fois sur /contact.
- [x] **Atelier** : ses 4 grandes photos doublées par Swin2SR depuis leurs originaux (1080 et 1536 px ; maîtres dans `.local/atelier`,
      jamais dans Git, un à la fois), puis 2880 px et copies 1440 / 2160 ; `sizes` justes.
- [x] **iPhone** : l'accueil prend une version de la photo cadrée sur les deux écrins (`hero-phone`, `npm run page-media`), entiers
      et centrés, la phrase et « Discover More » dessous sur le noir ; cartes : « Enter the World → » sur une ligne, sa flèche collée
      au dernier mot (16 px en lettres simples sur téléphone, la règle des 16 px ; une langue plus longue peut passer à la ligne avec
      sa flèche), le type seul sous le nom.
- [x] **Un seul bouton par carte** : mécanismes de l'Atelier (« Enter the World » ; la bague se soulève au survol ou au toucher),
      presse (l'article ; une photo sur chaque carte, Stuttgarter Nachrichten compris).
- [x] **Cartes de pièces, un seul format** : NOM, une ligne « Type · mention », « Enter the World → » (`CardLine`, `EnterWorld` de
      `src/components/PieceGrid.tsx`).
- [x] **Every Angle** : plus aucune légende ; les 4 premières photos sont 4 vues différentes (empreintes d'image,
      `scripts/angle-views.ts` → `src/data/angle-views.generated.json`, `diverseFirst` de `src/data/pageMedia.ts`).
- [x] **Plan du site** : `/creations/chains/tennis` retiré ; l'audit vérifie qu'aucune adresse du plan ne redirige.
- [x] **Mise en page** : page d'un club comme celle d'un joueur (nom près de la photo, aligné en bas) ; The Bespoke Journey en une
      colonne centrée de 760 px (titre, frise, les deux encadrés de même largeur).
- `tests/audit2411.spec.ts` (ordinateur, Safari, iPhone). Toute la batterie passe en local (727 tests, ordinateur, iPhone, Safari,
  25/11) ; en ligne : `audit2411`, `loupe`, `monogram` (ordinateur, Safari, iPhone) et `npm run audit:coherence` **522 pages × 1280,
  1440, 1512 Retina, iPhone, 0 problème** (25/11). Captures avant (de l'audit) : `_verif/audit-2411/` ; après : `_verif/audit-2411/apres/`.
- [ ] Yoni : la pièce de Sambi Lokonga ; une photo propre de Tanguy Nianzou si le recadrage ne lui plaît pas ; les matières, poids et
      carats de chaque pièce (la ligne « Matières précieuses » reviendra avec ses chiffres).

## Passe « photos nettes à la loupe + monogramme BRT » — état au 24/11/2026
- [x] **Palier loupe** (`scripts/loupe.mjs`) : chaque photo qui s'ouvre dans la visionneuse a, à côté de sa copie de page, une
      copie tirée de l'original du disque (côté long 3200 px au plus, jamais agrandie, WebP qualité 86, lanczos), faite par les
      scripts d'import eux-mêmes avec leurs recadrages et leurs couleurs : `import-media` (HD, stories, pièces, joueurs, croquis,
      La Maison : `<photo>.loupe.<v>.webp`), `extra-media` et `trunk-media` (`<photo>.<v>.loupe.webp`). Seuls les manquants ou
      périmés sont refaits ; une photo dont l'original est à peine plus grand que sa copie (WhatsApp 1080 × 1920) n'en a pas.
      Liste : `src/data/loupe.generated.json` (adresse de la photo → src, largeur, hauteur), chargée par la visionneuse à
      l'ouverture seulement (jamais avec les pages). **758 photos, 416 Mo** (24/11). `media-sizes` ne fait pas de petites copies
      des paliers loupe. Les originaux ne vont jamais dans Git.
- [x] **Visionneuse** (`src/components/Lightbox.tsx`, `src/lib/loupe.ts`) : la copie de page tout de suite, le palier loupe
      derrière puis en fondu de 200 ms dans le même cadre ; paliers de la photo d'avant et d'après préchargés. Zoom maximum =
      jamais plus d'un point d'écran par pixel du fichier (×3,6 sur un portable 1512 × 982 pour une photo de 3200 px de haut,
      ×5,5 sur iPhone ; une photo de téléphone se zoome peu) ; + grisé à la limite. Clic / toucher = zoom à l'endroit visé, nouveau
      clic = photo entière, molette et pincement par paliers doux, glisser pour se déplacer, curseur loupe, flèches = photo
      suivante (zoom à 1). Aide « Click to zoom » / « Cliquez pour zoomer » (6 langues, « Touchez » sur téléphone) une fois par
      visite, effacée au premier zoom. Plus de double clic.
- [x] **Netteté des pages** : `npm run audit:coherence` passe aussi en 1512 × 982 à 2 pixels par point (`SIZES` « 1512x982@2 »)
      et vérifie que chaque photo des pages vient d'un fichier au moins aussi large que la photo dessinée (contrôle
      « sharpness »), ou du plus grand fichier qu'elle a. Corrigé : une photo plus large que son cadre (cadres 4:5 de « Porté
      par », « Every Angle », films de l'Atelier) demande une copie plus large (`coverSizes` de `src/lib/responsive.ts`).
- [x] **Monogramme BRT** (`src/components/Monogram.tsx`, `public/media/brand/monogram.<v>.svg` par `npm run brand`) à la place
      du mot BERETE en fond (univers des pièces, accueil sous la photo, Cercle) : lettres BRT et diamant en traits fins à 5 %,
      grand, au centre ; sur ordinateur un reflet (dégradé masqué par le dessin, 20 %, rayon 220 px) suit la souris avec
      inertie, 3 points du diamant scintillent à son passage, relief de 10 px au plus ; sans souris le reflet passe seul en
      diagonale toutes les 9 s (CSS) ; immobile avec « réduire les animations » ; arrêté onglet caché ou hors écran. Même
      réglage `BRAND_WATERMARK` (et `?filigrane=0/1`). L'audit vérifie qu'aucun « BERETE » ne reste en fond (« watermark »).
- `tests/loupe.spec.ts`, `tests/monogram.spec.ts` (Chromium 1512 × 982 à 2 pixels par point, WebKit, iPhone). Planche avant /
  après : `/Volumes/Disque externe/_verif/loupe-hd/avant-apres.jpg` ; captures et films du monogramme : `_verif/brt-fond/`.

## Passe « retours vidéo de Yoni (24/11, 11 h 01 – 11 h 06) » — état au 24/11/2026
- [x] **Plein écran** qu'on quitte toujours (`src/lib/fullscreen.ts`, `useFullscreen`) : c'est le cadre du film (avec ses boutons)
      qui passe en plein écran, jamais la vidéo seule ; le même bouton entre et sort, Échap et le geste du système aussi ; Safari
      (`webkit…`) ; iPhone : lecteur du système (`webkitEnterFullscreen`). À la sortie : même endroit de la page, le film continue,
      le son comme avant. `FeatureFilm` et le visualiseur 3D.
- [x] **Signature Trunks** : plus de grande ouverture (photo Dragon Ball, phrase) ; un petit titre, les 9 écrins 3 par ligne, la
      1re ligne entière avec ses noms à 1280 × 800 et 1440 × 780. Sous chaque écrin : « Discover the photos » / « Découvrir les
      photos » (visionneuse sur toutes ses photos, compteur) ; ouvert : « Discover the piece → » / « Découvrir la pièce ».
      « Begin Your Creation » une seule fois, en bas de la page.
- [x] **Une seule mise en scène des écrins** (`scripts/trunk-media.mjs`) : le socle de marbre est mesuré sur closed.jpg (zone
      `BASES`, puis bords trouvés par sharp), chaque écrin recadré pour que son socle ait la largeur et la hauteur de celui du
      Butterfly (`REFERENCE`), centré ; même recadrage pour closed, open et les deux films ; bords prolongés en miroir. Valeurs
      `marble` et `frame` dans `src/data/trunks.generated.json`, `PLACES` recalculés par `trunkOf`. **Dragon Ball** : zoom
      abaissé (socle à 67 % au lieu de 73 %) pour garder la malle entière. Planche :
      `_verif/appel-24-11/apres-retours/ecrins-avant-apres.jpg`. **Okafor** : nouveaux fichiers v3 (le dossier `_anciens` n'est
      jamais lu), l'octogone sort du milieu des compartiments.
- [ ] **À repasser sur marbre dès que Yoni envoie les images** (mêmes dossiers v3, aucun code à changer) : Tulips on Tour,
      malle Dragon Ball, DFB-Pokal 2025 Display, World Cup Display → `npm run trunks -- --only=<écrin>`.
- [x] **Begin Your Creation** (/contact) tient dans un écran (1280 × 800, 1440 × 780, 1440 × 900) : titre, colonne de gauche,
      formulaire à droite et dessous deux fines lignes qui s'ouvrent (« By phone », « By email ») ; iPhone : l'un sous l'autre.
- [x] **Accueil** : la photo de l'écrin Sirius commence sous l'en-tête (noir opaque dès le haut), entière, centrée, bords en
      fondu (`HeroPhoto`, `.home-photo-*` de `src/index.css`) à toutes les tailles ; phrase et « Discover More » petits sur le
      noir. Menu : Manrope 500, ivoire franc (contraste ≥ 7:1).
- `tests/retours2411.spec.ts` (ordinateur Chromium, Safari WebKit, iPhone), captures `verification/<appareil>/retours2411-*.jpg`
  et avant / après dans `/Volumes/Disque externe/_verif/appel-24-11/apres-retours/`.
  Vérifié sur le site en ligne le 24/11 : tests ordinateur, Safari, iPhone ; `npm run audit:coherence` 534 pages, 0 problème.

## Passe « zéro incohérence » (après l'appel du 23-24/11) — état au 24/11/2026
- [x] **Deux polices** seulement : Cormorant Garamond (titres) et Manrope (textes). Les polices des univers ne sont plus chargées
      ni utilisées (`universeProps` de `src/components/Universe.tsx` prend toujours `maison` ; l'admin le dit) ; les grands signes
      des univers (力, OKA, T…) ne sont plus dessinés (`SHOW_MARKS`). Filigrane BERETE plus discret (opacité 0,018).
- [x] **Tailles et boutons** : titre de page ≤ 56 px, de section ≤ 36 px, petite étiquette 11–12 px, texte 15 px sur ordinateur
      (plus de `lg:text-[0.9375rem]` ni `0.875rem`), 16 px sur téléphone. Une seule étiquette au-dessus d'un titre (les intros de
      page n'en ont plus : `PageIntro`). Deux boutons : `btn-primary` (contour fin or rose) et `btn-secondary` (texte et petite
      flèche), `src/index.css` ; plus aucun bloc blanc plein. Un seul cadre de page : `wrap` (1280 px, mêmes marges).
- [x] **Mouvements** : fondus lents seulement (`Reveal` sans montée, plus de balayage ni de parallaxe dans l'Atelier, plus de
      flottement ni de relief des vues, plus d'étincelles des écrins, plus d'éclat sur l'or rose ; bloc « Movement » en fin de
      `src/index.css`). Les effets propres aux univers restent.
- [x] **Un seul mot par chose** (6 langues) : « Begin Your Creation » / « Commencer votre création » (une seule traduction),
      « WhatsApp », « Enter the World », « Discover Their World », « All Creations », « See More », « Enter the Atelier ». Menu :
      The Creations, The Berete Circle, The Atelier, Signature Trunks, The Bespoke Journey, The House, Press + Begin Your Creation
      (« Private Enquiries » retiré). Titres de page = nom du menu (Cercle : « Worn by Icons. » en sous-titre ; Presse ; Contact).
- [x] **Page pièce** (`src/pages/PiecePage.tsx`, `data-piece-section`) : ouverture (étiquette = la collection, le nom, sa phrase
      si l'histoire ne la dit pas déjà, Begin Your Creation + WhatsApp) → The Finished Piece (ou The Mechanism : Dragon Ball, croix
      de Tillman) → Every Angle (jamais une photo de l'ouverture : `src/data/pageMedia.ts`) → Behind the Creation → (The Art of
      Detail, sans vignettes) → (Worn as a Pendant / Its Chain) → Composition & Craftsmanship → **Created exclusively for …**
      (une section : la personne, « Discover Their World », les photos portées ; « A Berete Signature » pour BRT Flowers et la
      Safi Link ; « a private collector » une seule fois) → The Trunk → une ligne vers l'Atelier → presse → un seul bloc de fin.
      Plus de stories sur les pages pièces. Le français s'accorde : « Créé » (pendentif, bracelet), « Créée » (bague, chaîne,
      montre) ; espagnol et arabe aussi (`common.madeFor(who, type)`).
- [x] **Une pièce = une page** (`PARTS` de `src/data/pieces.ts`, anciennes adresses en 301 vers la section) : le pendentif Inter
      → « Worn as a Pendant » de la bague ; la tennis 2 rangs (dossier 03, même séance) → « Its Chain » de l'octogone d'Okafor ;
      la Cross Infinity (07) → « Its Chain » du pendentif de Loïs Openda. **Reliées** : Sirius (désormais un pendentif, « Sirius
      Nameplate », catégorie Name) ↔ BRT Flowers ; OKA ↔ Baguette Cuban (à confirmer) ; Butterfly ↔ sa chaîne ; Safi Link ↔
      maillot d'Okafor. **Infinity Link** = la
      chaîne en poire du dossier 09 (`pear-link-chain`, sa face ramenée au noir : `npm run extra-media -- --only=pear-link-chain`) ;
      la chaîne de Thuram (retirée par Yoni le 19/11) repart en non publiée. Catégorie Tennis retirée (sa chaîne est dans
      l'octogone). La photo IA retirée de BRT Flowers.
- [x] **Noms** : The Hand, Tulips on Tour Medallion, D&E Pendant, N14 Medallion, Red Crown / Red Flowers Jesus Piece, The Safi
      Link, Rose Cuban Chain 14 mm / 20 mm, Sirius Nameplate, Infinity Link ; **Losene Keita** partout (adresse `keita-losene`
      gardée). « gold tone » → « gold » dans les 6 langues. Français : « Genkidama » partout, « le Genki Dama » dans le texte de Yoni.
- [x] **Accueil en magazine** (`Story` de `src/pages/Home.tsx`) : la photo de l'écrin, puis une section = un sujet centré (la
      maison, The Mechanism, la bague Inter, la bague VfB, The Creations, Presse, la fin). **The Bespoke Journey** : six étapes
      partout, chaque image mène à l'Atelier / aux Créations / aux Écrins, un seul paiement (acompte de design → 50 % à la
      validation → solde avant la remise), « environ dix semaines ». Contact : Pendants, Chains, Rings, Watches.
- [x] **Contrôle automatique** : `npm run audit:coherence` (`scripts/audit-coherence.ts` ; `BASE_URL`, `SIZES`, `LANGS`, `ONLY`)
      sur toutes les pages du plan du site, 6 langues, 1280 × 800, 1440 × 900, iPhone (WebKit) : polices, tailles, doublons de
      photos et de phrases, boutons, photos sans description, « gold tone », anglais oublié, noms coupés, débordements, ordre des
      sections. Rapport : `verification/coherence/rapport.md`. `tests/coherence2411.spec.ts`. **Passé sur le site en ligne le
      24/11 : 534 pages × 1280, 1440, iPhone, 0 problème.** Toute la batterie passe en local (ordinateur, iPhone, Safari) ; en
      ligne : `coherence2411` et `yoni2411` (ordinateur, iPhone, Safari). Captures avant : `verification/tailles/apres/` (le site
      avant ce passage) ; après : `verification/tailles/coherence/` (1280 × 800, 1440 × 900, 1920 × 1080, iPhone).
      Une story s'ouvre depuis le profil : `/players/<personne>?story=<story>&piece=<pièce>` (au moment qui montre la pièce).
- [ ] Yoni : valider les noms, les fusions, les photos IA encore en ligne (liste dans le rapport du 24/11), la Two-Tone (31 :
      2 photos, une floue, gardée hors ligne), les chaînes probables d'autres pièces (Baguette Cuban = chaîne de l'OKA, reliée ; White
      Iced Cuban = chaîne de Dragon Ball ? 14 et 20 mm = un modèle en deux largeurs ?).

## Passe « appel du 23-24/11 : le luxe ne crie pas » — état au 24/11/2026
- [x] **Une seule échelle de tailles** (`src/index.css`) : sur ordinateur tout le site est dessiné à 15 px (`html` 93,75 % dès
      1 024 px ; le téléphone garde 16 px) ; titres `t-hero` (titre de page), `t-title` (section), `t-lead` (citation), `t-sub`
      (petit titre), `eyebrow` plus petit ; plus aucun `text-[clamp(...)]` isolé ; boutons plus petits et plus fins (`font-medium`
      au lieu de `font-semibold`). Plus aucune animation de mots ou de lettres (`SplitHeading` immobile). Captures avant / après
      de chaque page : `verification/tailles/avant/` (site en ligne avant le passage) et `verification/tailles/apres/`
      (1280 × 800, 1440 × 900, 1470 × 956, 1512 × 982, 1920 × 1080, iPhone 393 × 852 ; `tests/tailles.spec.ts`, `SHOTS=avant|apres`).
- [x] **En-tête** : le nom exactement au centre de la page (positionné au milieu, plus entre le logo et les boutons), plus petit ;
      le logo en image vectorielle nette (`logo-sharp.<v>.svg`, traits un peu épaissis : `npm run brand`) ; menu, menu déroulant,
      langue, WhatsApp et « Begin your creation » plus petits et plus fins. **Pied de page** : logo plus petit, net, centré, la
      phrase « Made by us. Inspired by you. » dessous.
- [x] **Accueil** : la photo de l'écrin Sirius en plein écran (`00 Contexte Yoni/Accueil (photo ecrin)/`, version verticale sur
      téléphone, `npm run page-media` → `public/media/pages/`), la phrase dans le noir (une bande noire sous la photo sur un écran
      large, le sol sombre sur téléphone), « Discover More ». Le film croquis → écrin n'est plus sur l'accueil (`SketchToJewel`
      gardé). Dragon Ball : sa photo et un rond où seule la sphère tourne (boucle 1,5 s du dossier 13, muette, lancée à l'écran),
      le titre, une phrase, « Enter the World » ; le film héros reste en haut de sa page. La Safi Link en tête de la sélection.
- [x] **Loupe** : plus aucune au survol (`Loupe.tsx` supprimé) ; seulement sur une photo ouverte en grand (`Lightbox.tsx` : molette
      à l'endroit du curseur, + / −, pincement ; jamais sur un film). Un clic sur la pièce d'ouverture l'ouvre en grand.
- [x] **Pages pièces, une seule structure** (`src/pages/PiecePage.tsx`) : 1. la pièce dans son univers, entière dans le premier écran
      (1280 × 800), plus petite ; 2. le film de la pièce finie (`FeatureFilm` : muet, en boucle, lancé à l'écran, toujours entier ;
      le film fait pour la page s'il existe — Dragon Ball, croix de Tillman —, sinon son film de la pièce finie ; « Watch the film »
      y descend) ; 3. Every Angle : 4 photos (les plus fortes d'abord : sur fond noir), puis « See more » ; 4. l'histoire ; 5.
      Composition & Craftsmanship (petit, une ligne par info, seulement les lignes remplies ; l'admin prépare les lignes « Gold,
      Gold weight, Diamonds, Total diamond weight, Coloured stones, Hours of work », traduites par `piece.composition`) ; 6. Créée
      pour, Porté par, l'écrin, « Enter the Atelier », presse, autres créations, commande. **Plus de making-of ni de fenêtre de
      cinéma sur les pages pièces** : « Enter the Atelier » mène à `/atelier?piece=<slug>`, où le making-of s'ouvre tout de suite et
      où attendent les étapes de la pièce (`src/components/MakingSteps.tsx`).
- [x] **Aucune 3D présentée comme pièce finie** (44 films regardés image par image) : le film de la bague Inter (25/v01) est
      entièrement en 3D et celui de Dragon Ball (13/v01) s'ouvre sur 4,5 s de modélisation : `atelier: { reveal: null }` pour les
      deux (plus de « Final Reveal » non plus dans l'Atelier). Les autres sont de vraies images.
- [x] **Créations** : 4 par ligne sur ordinateur (2 sur iPhone). **Catégories** (`SUBCATEGORIES` de `src/data/collections.ts`, menu,
      pied de page, `/creations/<collection>/<catégorie>`) ; sur la page d'une collection, les catégories d'abord, puis les pièces.
      Pendentifs : Celebration (Kenan, maillot d'Okafor, Dragon Ball, panthère), Cross (croix Tillman, Baguette Cross, Jesus Cross),
      Name (OKA, octogone d'Okafor, AS, JL, TM, Loïs Openda, D&E, FAM), Letter (T-Serpent, Thorned T, L, N14), Jesus Pieces (4) ; dans
      « Tous » seulement : pendentif Inter, trèfle d'Eljero Elia, Butterfly, The Hand, Tulips. Chaînes : Signature (Safi Link, BRT
      Flowers, Sirius), Cuban (14 mm, 20 mm, Baguette, White), Tennis, Infinity (Infinity Link, Cross Infinity). **À faire valider par
      Yoni.** La Safi Link d'abord parmi les chaînes (`FIRST_IN_COLLECTION`).
- [x] **Chaînes** : **BRT Flowers** = une fiche (`brt-flower-chain`, deux largeurs 12 et 16 mm, chiffres de Yoni) qui reprend la chaîne
      torsadée de Kevin Schade (adresse redirigée) et la chaîne seule de Sirius (37/p29 en couverture) ; **Safi Link** : toutes ses
      photos au même noir (niveaux, `npm run extra-media`), couverture de face ; **Sirius** : sans le dos ni les photos de la chaîne
      seule ou de l'écrin, sa plaque redressée de 1,1° (photo et détourage) ; couvertures des chaînes = la chaîne entière de face
      (14 mm p02, Baguette p05). Remises en ligne : **chaîne tennis 2 rangs** (or rose puis or blanc), **White Iced Cuban**,
      **Infinity Link** (`infinity-link-chain`, sans le nom de Marcus Thuram ; photos de téléphone, détourage impossible).
      Détourages refaits et contrôlés : `verification/cutouts/cutouts-2411-grey.jpg` et `-light.jpg`.
- [x] **The Bespoke Journey** : compacte (le haut tient dans un écran 1440 × 900), plus de film au défilement (fichiers gardés), une
      frise des 6 étapes sur une fine ligne (image, numéro, titre, une ligne, paiement) : consultation (`01-consultation-privee.jpg`),
      croquis de Yoni, rendu 3D, atelier, shooting (`05-shooting-editorial.jpg`), écrin ; étape 04 « Live progress photos and videos
      on WhatsApp » ; avec le serveur seulement, l'espace client aux étapes 02 et 04.
- [x] **Espace client VIP** (serveur seulement ; Vercel inchangé) : l'admin règle l'étape (les 6 du Bespoke Journey), la date de fin
      estimée (historique des changements) et publie des nouvelles (photos, vidéos depuis le téléphone, note, date) ; `/vip` montre la
      3D, la frise avec l'étape en cours, les nouvelles (photo en grand avec loupe, vidéo sur place) et la date (« modifiée »).
      Migration `20261124100000_vip_tracking`, fichiers dans `storage/vip/` (jamais dans Git), `tests/vip.spec.ts`.
- [x] **La Maison** : textes plus petits ; plus aucune image de bijou ; un chapitre sans photo de Yoni n'affiche rien ; chapitre 4 =
      Anvers à la loupe en noir et blanc, chapitre 11 = son ancien bureau en Belgique (`npm run import-media -- --only=house`) ;
      chapitres 6 et 7 retirés (presque pareils que le 5) ; 9 et 10 gardés.
- [x] **Atelier** : plus petit ; la seule page avec la fenêtre de cinéma. **Cercle** : « Worn by Icons » sur une petite ligne, 4 par
      ligne, profils plus petits. **Inter** : les photos de Yoni avec les joueurs et les bagues dans « Porté par » (stories 21/03, 04 ;
      originaux 25/p38, p36 des stories 21/01, 06) ; pendentif Inter porté (story 06/17).
- [x] **Univers Inter et VfB v2** (`inter-victoire-v2`, `vfb-victoire-v2`) : larges, l'équipe de chaque côté, bague plus petite ;
      **un réglage chacun pour revenir aux anciens** : `INTER_VICTORY` et `VFB_VICTORY` de `src/data/themes.ts`.
- `tests/yoni2411.spec.ts` (ordinateur, iPhone, Safari ; anglais et français), vérifié sur le site en ligne le 24/11 (33 réussis),
  captures `verification/<appareil>/yoni2411-*.jpg` ; captures « après » du site en ligne : `verification/tailles/apres/`.
- [ ] Yoni : valider le classement des pendentifs et des chaînes ; « le R » des pendentifs lettre : aucune pièce R sur le site ;
      la chaîne « en or rose et en blanc dont la version seule manque » : candidates dans le rapport (Infinity Link remise en ligne,
      Cross Infinity blanche du collier de Tillman, tennis 2 rangs, cubaine glacée) ; photos studio sur fond noir de l'Infinity Link ;
      les fichiers de « Yoni 24-11 (a telecharger depuis WhatsApp) » (3 vidéos atelier, remise à Keita, photos tennis, grand-père,
      premier bijou, malles sur la table, sertissages) : **aucun n'était là le 24/11** ; les poids d'or et carats pièce par pièce.

## Passe « tout ce qui reste des 3 appels (22-23/11) » — état au 23/11/2026
- [x] **La loupe** (`src/components/Loupe.tsx`, remplace PieceLens) : photos seulement, jamais de vidéo ; elle grossit le fichier le
      plus grand de la photo à l'endroit du curseur, jamais au-delà de ses pixels ; molette (à son plus près ou son plus loin, la page
      défile : elle ne bloque jamais la page) et + / − au coin de la photo. Ouverture des pièces, « Sous tous les angles », « Porté
      par », cartes des Créations (+ / − ne suivent pas le lien), photos des écrins (page Écrins et section écrin). Une photo est
      marquée `data-loupe="<fichier>"`. iPhone : pas de loupe ; un toucher ouvre la photo en plein écran (pincement).
- [x] **Plus de sphère qui tourne au survol** (vidéo `dragon-ball-spin` supprimée, `ShowcaseSpin` retiré). La sphère tourne dans le
      **film héros** (`dragon-ball-hero`) : grande section juste après l'ouverture de l'accueil et de la page Dragon Ball
      (`src/components/FeatureFilm.tsx` : muette en boucle à l'écran, son, plein écran ; texte tiré de son histoire). Source :
      `DRAGON_BALL_HERO_SOURCE` de `scripts/mechanism-media.mjs` (720 × 1280, 25 s, image copiée sans réencodage pour l'ordinateur,
      copie légère pour le téléphone) : **la seule ligne à changer quand arrive l'original 1080p ProRes**, puis
      `npm run mechanisms -- --only=dragon-ball-hero`. Le making-of reste dans sa section et dans l'Atelier.
- [x] **Nouveau texte Dragon Ball** (Yoni, mot pour mot, retours à la ligne gardés : `whitespace-pre-line` des paragraphes) ; fiche
      « Settings » : Classic, bezel, channel, reverse ; 5 langues (FR : « le Genki Dama (le Genkidama) », « sertissage inversé »).
- [x] **La croix de Malik Tillman qui tourne** (`tillman-cross-spin`, story Collectors 14 entière, `TILLMAN_CROSS_SOURCE`) : section
      « Le mécanisme » juste après l'ouverture de sa page, et 3e mécanisme de l'Atelier (« La croix qui tourne »).
- [x] **Univers** : `ciel` (L de Deniz Undav : nuages, rayons dorés, effet `feathers`), Inter (`inter-victoire`, variante
      `inter-victoire-echarpes` : **un seul réglage `INTER_VICTORY` de `src/data/themes.ts`**), VfB (`vfb-victoire`), confettis légers
      bleus-noirs-or (Inter) et or-rouges (VfB) derrière la bague (`fx.ts`), collier T de Thuram `gothique` (**un seul réglage
      `RUBY_T_UNIVERSE` de `src/data/pieces.ts`**, "noir" pour revenir au noir complet). Anciens fichiers jamais utilisés.
- [x] **Photos studio en premier** (`withStudio` de `src/data/pieces.ts`) : chaîne torsadée de Kevin Schade, montres de Radja, Tajon
      et Thuram, médaillon FAM, L de Deniz Undav ; les photos portées restent dans « Porté par ».
- [x] **Ordre des galeries** revu sur les 44 pièces (planches regardées une par une) : `firsts()` pour VfB, Inter (p08 de Yoni en
      tête), maillot d'Okafor (p20), L, The Hand, Tulips, Sirius, Jesus Piece Red Flowers, Cross Infinity ; film amateur de la
      panthère en fin de galerie (`AMATEUR_FILMS`).
- [x] **Détourages contrôlés un par un** (planches `verification/cutouts/cutouts-grey-0N.jpg` sur gris #76808c et `cutouts-light-0N.jpg`
      sur fond clair) : 88 vues regardées, 44 refusées, 26 refaites, 18 retirées, 70 publiées. Refusé : fond noir collé, partie
      manquante, partie délavée ou à moitié transparente, trous dans le pavé, contour dentelé ou halo. Une vue impossible à rendre
      propre est **retirée de la liste** de `scripts/cutouts.mjs` (jamais publiée). Nouvelles options : source `png:` (un PNG déjà
      détouré, pris tel quel : le L de Deniz Undav), `near`, `clear`, `holes`, `largest`, `fadeAt`. Sans détourage propre (ouverture
      sur leur photo) : bague Oval Eternity, médaillon trèfle d'Eljero Elia. Retirées aussi : L p10/p08/p02, croix Tillman p03/p06,
      OKA p05, AS p03, Samuel Ballet s06.
- [ ] Yoni : les rendus IA des montres montrent CARTIER (Tajon, Thuram) et ROLEX (Radja) sur le cadran : d'accord pour les publier ?
- [x] **Marcus Thuram avec Kanye West** (story Thuram SS23 06 recadrée, `players/marcus-thuram`), sur son profil seulement ; textes
      des photos nommées : `players.photoNamed` des textes du site.
- `tests/yoni2311d.spec.ts` (ordinateur et iPhone, anglais et français), captures `verification/<appareil>/yoni2311d-*.jpg`.
- [ ] Yoni : l'original 1080p du film Dragon Ball ; la croix de Tillman en HD ; choisir Inter « trophée » ou « écharpes » ; collier T
      gothique ou tout noir.

## Passe « écrins v3 » (validés par Yoni, 23/11/2026) — état au 23/11/2026
- [x] **9 écrins dans la même mise en scène** (socle en marbre noir, lumière dorée du dessus, caméra fixe, 6 s, la vraie pièce
      dedans) : `00 Contexte Yoni/Ecrins IA (ouverture) v3/<dossier>/` (closed.jpg et open.jpg en 4096, ouverture.mp4 et
      fermeture.mp4 en 1440, 24 im/s). `scripts/trunk-media.mjs` : chaque écrin a sa mise en scène (`set` : v3 pour dragon-ball,
      the-hand-cube, sirius, tulips-on-tour, dfb-pokal-2025-display, world-cup-display, brt-coral-case (dossier `malle-brt-corail`),
      okafor-trunk, butterfly-trunk ; v2 pour les 4 autres), `npm run trunks -- --only=…`. Nouvelles versions dans tous les noms.
- [x] **La page des écrins ne montre que la mise en scène v3** (`TRUNK_SET` et `onTrunksPage` de `src/data/trunks.ts`) :
      signature-trunk, photo-case, trophy-trunk, campione-d-italia-case restent publiés, avec leurs fichiers v2 (rien supprimé),
      visibles sur la page de leur pièce, et reviendront sur la page dès que leur dossier v3 sera passé en `set: "v3"`.
- [x] **Hero de la page des écrins** : l'image fermée v3 de la malle Dragon Ball (c'était déjà le même fichier ; le script lit
      maintenant le dossier v3).
- [x] **Lumière et pièce recalées** sur chaque image ouverte (`PLACES`) : la lumière part de la pièce posée dans l'écrin, la
      pièce sort de là et flotte devant le couvercle ouvert, au-dessus de « Refermer », loin de « Revoir l'ouverture » (iPhone
      compris) ; Dragon Ball : devant son crochet (un seul pendentif visible) ; les deux vitrines : la bague monte un peu.
- [x] **Raccords** : images fixes et films ont le même cadre et la même lumière (écart moyen 2 à 3,7 / 255 entre l'image et la
      première ou la dernière image de son film) ; aucun saut d'une image à la suivante dans les 18 films (le plus fort : les
      portes de la malle Dragon Ball qui pivotent) ; la fermeture est l'ouverture à l'envers. Test image par image dans
      `tests/trunks.spec.ts`.
- [ ] Yoni : les fichiers v3 de l'écrin Campione (photo fermée), de l'écrin Signature, de la Photo Case et de la malle au
      trophée (pièce à mettre dedans) ; la pièce de la BRT Coral Case.

## Passe « retours de Yoni du 23/11 au soir » (WhatsApp 16 h 25 – 17 h 22, fin de l'appel du 22/11) — état au 23/11/2026
- [ ] **Making-of Dragon Ball (« la vidéo héros »)** : introuvable sur le Mac le 23/11 au soir (disque externe, Bureau, iCloud
      Drive, Téléchargements, Vidéos ; la photothèque Photos est fermée à Claude) : **chemin demandé à Malik**. Dès qu'on l'a :
      grande section sur l'accueil juste après le hero (muette en boucle à l'écran, boutons son et plein écran, lien vers la
      pièce, texte tiré de son histoire), en haut de la pièce Dragon Ball (pas en film d'entrée), en tête des making-of de
      l'Atelier ; et, si elle a le plan HD de la sphère qui tourne, `DRAGON_BALL_SPIN_SOURCE` (`scripts/mechanism-media.mjs`).
- [x] **Dragon Ball** : la vue avec sa chaîne (p19) en très grand sur ordinateur (`showcase.size: "xl"`, admin « Pièce en très
      grand ») : +20 %, la chaîne sort en fondu par le haut sous le menu (`.sv-xl`), le bijou entier au-dessus du bas de l'écran ;
      iPhone inchangé (déjà plein cadre). Le dos (p06) n'est plus dans les 3 premières photos depuis le 23/11 (2) : vérifié.
- [x] **Butterfly** : le sertissage des ailes (WA 16.32.56, « Sertissage papillon ») = étape « sertissage » du pendentif (vidéo
      copiée telle quelle, sans réencodage, sans son ; l'ancienne image de la story en 2e image). Malle ouverte (WA 16.36.49…50) :
      5 vraies photos, la malle ouverte de face en premier, dans la galerie de l'écrin (/boxes) et dans la section écrin de la
      pièce. Vidéo d'ouverture de l'écrin non touchée.
- [x] **Écrins `keita-trunk`** (relié à la panthère, `boxSlug`) et **`tillman-trunk`** (relié au profil de Malik Tillman par
      `BOX_PEOPLE` de `src/data/pieces.ts`, à aucune pièce) : photos de Yoni entières. **La page des écrins ne montre que les
      écrins qui s'ouvrent avec leur film** (`onTrunksPage` = `trunkOf`) : ces deux-là y arriveront seuls avec leurs vidéos
      (`npm run trunks`). Textes en 6 langues.
- [x] **Section « Présentation sur mesure »** (`src/components/BoxSection.tsx`) : sur chaque pièce qui a un écrin (remplace la
      petite carte de la fiche technique) et sur chaque profil (« Son écrin » : les écrins de ses pièces + `BOX_PEOPLE`) : nom,
      texte, toutes les photos entières (plein écran au clic), « L'ouvrir dans les Écrins Signature » quand l'écrin y est.
- [x] **Keita** (WA 16.50.18, à la boutique avec sa malle) : dans ses photos (`extra-media` « players/keita-losene », ajoutées par
      `photosOf`) et dans « Porté par » de la panthère.
- [x] **Le nom BERETE en filigrane** : **un seul réglage, `BRAND_WATERMARK` de `src/lib/site.ts`** (true / false). Accueil et
      Cercle (`src/components/BrandMark.tsx`, fixe en bas de l'écran, sous tout le contenu : le cadre des pages est isolé), pièces
      (le `.u-brand` de leur univers). Pour comparer sur le site sans toucher au réglage : `?filigrane=0` ou `?filigrane=1` (gardé
      pour la visite). Les sections de l'accueil n'ont plus leur propre fond noir (même noir que la page) pour qu'il se voie.
- [ ] **WhatsApp et presse** : le prompt avait encore « [NUMÉRO] », « [LIEN BILD] », « [LIEN SPORT.DE] » : rien changé
      (`WHATSAPP_NUMBER` de `src/lib/site.ts`, `PRESS` de `src/data/press.ts`).
- `npm run extra-media` sait aussi préparer une vidéo (`"video"` : copie H.264 sans son, image d'attente).
- `tests/yoni2311c.spec.ts` (ordinateur et iPhone, anglais et français), captures `verification/<appareil>/yoni2311c-*.jpg`
  (filigrane avec / sans : `yoni2311c-filigrane-avec-*` et `-sans-*`).

## Passe « retours de Yoni du 23/11 (2) » (WhatsApp : vocal, 5 vidéos, 13 captures, 29 photos, 1 fichier 3D) + audit — état au 23/11/2026
- [x] **Cercle** : un clic sur un joueur ou un club ouvre toujours `/players/<slug>` (`personHref`), partout (mur, clubs, « Créée pour »).
- [x] **Profils sur un seul modèle** (`PlayerPage`, `src/pages/Players.tsx`) : grand portrait (initiales en grand sinon), nom, club,
      numéro, présentation et Instagram seulement s'ils existent (plus de phrase générique), toutes ses pièces, ses photos et ses
      stories (bouton). Ajoutés : portrait d'Angelo Stiller (`Photos joueurs en maillot/Angelo Stiller - 01.jpg`), numéro 16 de
      Karazor (gravé sur sa bague), 9 de Thuram (texte du T-Serpent). Pendentif panthère relié à `keita-losene` (rien renommé).
- [x] **En-tête** : le logo d'origine (losange BRT, BERETE JEWELLERS dessous) et, en plus, le nom en grand au centre de la barre,
      toujours visible (`[data-wordmark]`).
- [x] **Accueil** : d'abord le film croquis → bijou de The Bespoke Journey (piloté par le défilement), puis la photo du Butterfly
      sur sa chaîne sur le buste noir (p54) ; le gros plan de l'aile (p75) est prêt (`HERO_PHOTO` de `src/pages/Home.tsx`).
- [x] **Photos principales demandées** : Butterfly sur sa chaîne (vitrine, 1re photo, couverture), collier T entier (p01, en grand),
      Sirius plaque seule (p28), maillot d'Okafor avec sa chaîne (p20), Inter de face (p08), VfB (p13), T-Serpent p08 en couverture.
- [x] **Dragon Ball** : loupe qui suit la souris (`src/components/PieceLens.tsx`, détail tiré du fichier, jamais agrandi au-delà de
      ses pixels ; sur toutes les pièces, ordinateur) ; au survol la pièce tourne (film `dragon-ball-spin`, story 03/12 en
      720 × 1120 d'origine, aller-retour sans saut), elle s'arrête quand on sort ; au toucher sur iPhone. **Vidéo pro HD attendue** :
      changer `DRAGON_BALL_SPIN_SOURCE` dans `scripts/mechanism-media.mjs`, puis `npm run mechanisms -- --only=dragon-ball-spin`.
- [x] **Pendentif Inter** (`campione-d-italia-pendant`) : 2 photos WhatsApp (fond noir + porté), détourage, joueurs et univers de la
      bague. Son fichier 3D ZP0975-BJ001.3dm n'est **pas publié** : 59 volumes de métal sans maillage de rendu (+ 2 images de
      référence). L'admin le garde en brouillon « incomplet » avec l'avertissement ; formats acceptés : .3dm, .glb, .gltf, .obj, .stl.
- [x] **JL** : les 7 vraies photos pro sur fond noir (vue de face en hero, détourage refait), l'image IA retirée.
- [x] **Jesus Pieces** : texte de Yoni (« From the streets of New York to Biggie… »), 6 langues.
- [x] **Presse** : la carte entière ouvre l'article (nouvel onglet), « Découvrir l'univers de la création » dessous. BILD et
      sport.de réservés en tête, **cachés tant que leurs liens manquent** (jamais reçus).
- [x] **Contact** : étape « Imaginez votre création » (`src/components/Imagine.tsx`, `server/imagine.ts`) : OpenAI Images
      (`gpt-image-1`), clé `OPENAI_API_KEY` sur le serveur seulement (docker-compose, `.env.example`), 5 images / 10 min par
      visiteur, 200 / jour en tout ; « Contacter la maison pour finaliser » remplit le formulaire (idée + image jointe). Cachée sur
      Vercel et sans clé.
- [x] **Écrins** : l'écrin Dragon Ball en grand en haut (`Ecrins v3/dragonball-closed.jpg`), la sélection apparaît au défilement ;
      6 vraies photos de l'écrin Campione dans sa galerie. Vidéos des écrins non touchées.
- [x] **La Maison** : 9 photos de Yoni dans les chapitres 4 à 12 (loupe, plateau de diamants, Inter et l'écrin Campione, la tête dans
      les mains avec 4 bagues) ; chapitres 1 à 3 : croquis et atelier. 09.34.58 jamais publiée.
- [x] **Pièces sur un modèle** : « Sous tous les angles » = la pièce seule ; les photos portées, en main, essayées vont dans
      **« Porté par »** (même bloc partout, avec la remise ; `isWorn`/`wornSet` de `src/data/angles.ts`). Montres de Tajon et Thuram
      détourées ; montre de Radja et chaîne torsadée : pas de détourage propre possible (photos en main), elles gardent leur photo.
- [x] Construction locale sans recopier les photos (Mac plein) : `BERETE_LINK_PUBLIC=1 SITE_URL=http://localhost:3001 npm run build`
      puis `node scripts/link-public.mjs`.
- `tests/yoni2311b.spec.ts` (ordinateur et iPhone, anglais et français), captures `verification/<appareil>/yoni2311b-*.jpg`.
- [ ] Yoni / Malik : liens BILD et sport.de ; clé OpenAI pour le VPS ; vidéo pro HD de la sphère ; photos studio de la chaîne
      torsadée et des 3 montres ; le bon nom du combattant (Lasana Keita ou Keita Losene) ; présentations, clubs, numéros et
      Instagram des joueurs ; .3dm du pendentif Inter réenregistré avec ses maillages (ou STL/OBJ/GLB).

## Passe « retours de Yoni des appels du 22-23/11 » (accueil calme, menu, capsules, presse…) — état au 23/11/2026
- [x] **Accueil refait** (`src/pages/Home.tsx`) : plus de bulles de stories (supprimées partout, aussi sur les pages des joueurs ;
      `StoriesBar` supprimé), plus de film de fond ni de défilé de pièces, aucun univers de capsule. Noir profond, lumière douce
      or rose : la Butterfly Pendant détourée seule en grand, l'accroche « We don't begin with what has been done. We begin
      with what could be. », une phrase (maison de haute joaillerie sur mesure à Dubaï), « Imaginez votre création » / « Explorer
      les créations ». Puis : 1. Dragon Ball, la sphère qui tourne (film 13/v02 joué au clic seulement, jamais tout seul) et sa
      capsule ; 2. les bagues Inter et VfB ; 3. une sélection équilibrée (The Hand, Butterfly Chain, Oval Eternity, Tulips on Tour,
      Sirius, bague Bosnie) ; 4. le bandeau presse. L'animation « le dessus se soulève » est passée dans l'Atelier.
- [x] **Menu** (`src/components/Navbar.tsx`) : le menu complet sur tous les ordinateurs (dès 1 024 px, et dès 900 px avec une
      souris ou un trackpad : variante `desk` de `src/index.css`), sur sa propre ligne sous le nom ; vérifié dans les 6 langues, de
      900 à 1 440 px, Chrome et Safari. Créations : Toutes, Pendentifs (Jesus Pieces), Chaînes, Bagues, Montres. Lien **Presse**.
      **« BERETE JEWELLERS »** à côté du logo dans les lettres mêmes du logo (`npm run brand` : `scripts/brand-media.mjs` découpe le nom
      du logo, `public/media/brand/wordmark.<v>.svg` et `berete.<v>.svg`). Filigrane **BERETE** très discret au fond de chaque
      capsule, derrière le décor (`.u-brand`, jamais sur un bijou).
- [x] **Créations** : grille 3 par 3 (2 sur tablette, 1 sur téléphone), plus de carrousel (`src/components/PieceGrid.tsx`).
- [x] **Capsules** : plus de film à l'entrée ; le film de la pièce finie dans sa section « La pièce achevée » (plein écran avec le
      son au clic). Lumière sombre derrière le bijou (`.piece-calm`) : l'univers ne domine jamais. **Loupe** (`src/components/Lightbox.tsx`)
      dans les galeries des capsules et des écrins : + et −, double clic, glisser à la souris, pincer à deux doigts, molette ou
      pincement du trackpad (Safari aussi). **Sous tous les angles** : une galerie (3 / 2 par rangée), plus aucun texte qui décrit ce
      qu'on voit ; 42 légendes courtes gardées sur 457 photos (titres de `src/data/angles.json`, `text` vidés ; l'admin le dit).
- [x] **Univers** : bianconero assombri (images de Yoni) ; Noah Okafor : `okafor-jersey` (projecteurs Nigeria/Suisse) pour le
      maillot, `okafor-oka` (camouflage or rose) pour l'OKA, l'octogone garde le tunnel ; univers `noir` (tout noir, sans décor) pour le
      collier T de Thuram (le T et sa goutte en grand, vue p02) et la bague Bosnie. Les fonds refaits portent leur version
      (`<id>-1600.<v>.webp`, `version` dans `universes.generated.json`). Kenan : pièce en grand (`size: "large"`).
- [x] **Dragon Ball** : la vue avec sa chaîne seule et en grand à l'ouverture (plus de dos dans la vitrine, dos en fin de galerie) ;
      sur téléphone la sphère d'énergie plus haute et la lumière qui monte vers elle comme sur ordinateur (60 particules).
- [x] **Détourages** refaits et vérifiés un par un (78 vues, 32 pièces, adresses versionnées `<id>-<w>.<v>.webp`) : bagues entières
      (Inter p08, VfB p13/p12/p18, Oval Eternity enfin détourée), pendentif L de Deniz Undav, bague Bosnie, vues studio de JL, TM et
      T à épines. Non propres (jamais montrées) : AS p03, croix Tillman p03 et p06.
- [x] **Photos studio** (`npm run extra-media`, `scripts/extra-media.mjs`, `public/media/extra/<pièce>/<nom>.<v>.webp`) : couverture et
      1re photo de JL, TM et T à épines, les anciennes après.
- [x] **Textes** : Okafor maillot (Oka4, la couronne des 4 frères et sœurs, Nigeria et Suisse, la célébration, la chaîne qui devient
      la Safi Link : lien dans les deux sens, `WORN_TOGETHER`), OKA, T-Serpent (T9), Tulips on Tour, Inter et VfB en 4 parties
      (inspiration, design, technique, détails) ; aucune pierre nommée ; phrases répétées d'une pièce à l'autre réécrites. 5 langues.
- [x] **Bague Bosnie** (`bosnia-and-herzegovina-world-cup-2026-ring`, `BOSNIA`) : 17 photos dans l'ordre de Yoni, cadrées sur la bague,
      texte de ce qu'on voit (aucun nom de joueur), tout noir ; l'écrin World Cup Display mène à elle.
- [x] **Écrins** : « x photos » ouvre la galerie sous la boîte, qui reste ouverte ; loupe ; « Enter the World » discret après la
      galerie quand la page de la pièce existe. Vidéos d'ouverture non touchées (elles vont être refaites).
- [x] **Atelier** : section Philosophie (« No vision too bold, no detail without purpose. ») et « Engineering the Extraordinary »
      (`src/components/Mechanisms.tsx` : la sphère Dragon Ball qui tourne, film 13/v02 `npm run mechanisms` ; le dessus des bagues
      qui se soulève). La croix TM qui tourne et la bague qui s'ouvre viendront avec leurs films (rien d'affiché sans média).
- [x] **The Bespoke Journey** : en tête, 4 étapes avec de vraies images (croquis, planche du design validée tirée du film 13/v01,
      atelier, écrin ouvert), une ligne chacune ; « Comment commander ? » et « Combien de temps ? » (chaque pièce son délai, environ
      dix semaines en moyenne, chiffre de Yoni).
- [x] **La Maison** : une image par chapitre (`houseChapterPhoto` de `src/data/house.ts` : croquis, atelier, diamants, pièces, écrin,
      portrait à la fin), remplacée par la photo de Yoni dès qu'il l'envoie (admin ou dossier). Texte inchangé.
- [x] **Presse** (`/press`, `src/pages/Press.tsx`, `src/data/press.ts`) : Goal.com Deutschland, Stuttgarter Nachrichten, Daily Mail
      (liens ouverts le 23/11 ; Daily Mail du 29/05/2024) ; **BILD garde la 1re place, invisible tant que son lien manque** (le mettre
      dans `PRESS`). Articles VfB dans la capsule VfB, Daily Mail dans celle de l'Inter ; bandeau sur l'accueil.
- `tests/yoni2311.spec.ts` (ordinateur 1440, iPhone, **Safari 1280**), vérifié sur le site en ligne le 23/11 (24 réussis), captures
  `verification/<appareil>/yoni2311-*.jpg`. Les anciens tests adaptés (film d'entrée, textes des galeries, carrousel, bulles) ;
  toute la batterie passe en local sur ordinateur et iPhone. Le Mac n'a presque plus de place (moins de 1 Go libre le 23/11).
- [ ] Yoni : le lien de l'article BILD ; « Créée pour » de la bague Bosnie (aujourd'hui « un collectionneur privé ») ; relire les
      nouveaux textes et leurs traductions ; le titre « Ruby T Necklace » nomme une pierre (à renommer ?) ; films de la croix TM qui
      tourne et de la bague qui s'ouvre ; ses photos personnelles pour les chapitres de La Maison.

## Passe « écrins qui s'ouvrent et se referment » (Yoni, 22/11/2026, 4) — état au 22/11/2026
- [x] **Les 13 écrins s'ouvrent ET se referment avec leurs vidéos** (`00 Contexte Yoni/Ecrins IA (ouverture) v2/<dossier>/` :
      closed.jpg, open.jpg, ouverture.mp4, fermeture.mp4 ; carrés 1440, 6 s, sans son). Nouvelles vidéos pour Dragon Ball,
      The Hand Cube, DFB-Pokal 2025 Display, World Cup Display, Photo Case ; nouvelles images studio + vidéos pour Campione,
      Butterfly et Okafor (remplacent les images des stories et des films de livraison). Dossiers `malle-brt-corail` →
      `brt-coral-case`, `malle-photo-coupe-rouge` → `trophy-trunk`. **Plus aucun écrin ne s'ouvre en fondu de photos** (code
      et styles retirés). Raccords mesurés : première et dernière image de chaque vidéo = images fermée et ouverte (écart
      moyen ≤ 3,4/255).
- [x] **Comportement** (`src/components/TrunkReveal.tsx`) : fermé + « Ouvrir » ; la vidéo d'ouverture, puis la pièce détourée
      monte, « Créer votre écrin » et « Découvrir la pièce » (ou le premier seul). « Refermer » (6 langues, à la place
      d'« Ouvrir ») : les boutons s'en vont, la pièce redescend dans la boîte (0,75 s), la vidéo de fermeture joue, l'écrin
      finit fermé, « Ouvrir » revient ; autant de fois qu'on veut. « Revoir l'ouverture » (coin haut) : la pièce rentre,
      l'image fermée revient en fondu, l'ouverture rejoue. Chaque vidéo reste cachée tant qu'elle ne joue pas (l'image
      dessous est sa première image), s'efface sur l'image de sa dernière, puis revient à son début, cachée. Pendant une
      vidéo, aucun bouton (un clic ne casse rien). Vidéo d'ouverture chargée à l'approche, celle de fermeture dès que
      l'écrin est ouvert. Clavier : le focus passe d'« Ouvrir » à « Refermer » et inversement. « Réduire les animations » :
      ouvert ou fermé d'un coup. Au doigt sur iPhone (tests au toucher).
- [x] **Adresses versionnées** : `npm run trunks` donne à chaque écrin une version (empreinte de tous ses fichiers) dans
      chaque nom (`opening.<v>.mp4`, `closing.<v>.mp4`, `closed-720.<v>.webp`, `photo-01.<v>.webp`…) ; dossier vidé avant,
      dossiers en trop supprimés. 34 Mo pour les 13 écrins (vidéos de 0,5 à 1,3 Mo).
- [x] Photos pro (`Boites (photos pro)`) : seulement dans la galerie « x photos » et sur la page de la pièce, jamais dans
      l'ouverture. Campione, Butterfly et Okafor gardent leurs vraies photos en galerie. Place de la pièce et lumière de
      chaque écrin refaites sur les nouvelles images (`PLACES` de `src/data/trunks.ts`).
- `tests/trunks.spec.ts` : les 13 écrins ouverts puis refermés un par un (ordinateur et iPhone) : chacun joue SA vidéo
  d'ouverture et SA vidéo de fermeture (adresse versionnée), la pièce sort puis rentre, raccords sans saut, liens
  (WhatsApp, capsule) ; plusieurs cycles de suite ; clavier ; chargement à l'approche. Captures `verification/trunks/`.
- [ ] Yoni : les vidéos de la World Cup Display montrent la vitrine qui se vide (l'image ouverte n'a plus la bague) ; la
      pièce de BRT Coral Case, Trophy Trunk, Photo Case, World Cup Display et de l'Écrin Signature.

## Passe « texte officiel de la pièce Dragon Ball » (Yoni, 22/11/2026, 3) — état au 22/11/2026
- [x] **Texte de Yoni mot pour mot** (`kevin-schade-dragon-ball-pendant`, `src/data/pieces.ts`) en deux parties titrées,
      « The Vision Behind the Creation » et « The Art of Craftsmanship » ; sa dernière phrase « Not power taken, but power
      entrusted. » en citation de fin (style des citations de La Maison) et en phrase sous le titre. Le texte d'une pièce
      accepte deux repères en début de paragraphe (`src/data/story.ts`) : `## ` = titre de partie, `> ` = citation de fin
      (hors traductions et hors description Google) ; aide dans l'admin (champ « Texte »). Quand le texte a ses titres, la
      phrase n'est pas répétée en haut du texte.
- [x] **Fiche technique** : seulement ce que dit le texte (Motif, Spirit Bomb, tailles des diamants, sertis) ; l'ancienne
      ligne « Type » et la ligne « d'après les photos » (pierres bleues, baguettes) retirées. Pas d'annotations « L'art du
      détail » sur cette pièce : rien à aligner.
- [x] Traductions fidèles en 5 langues (« Genki Dama » et « Spirit Bomb » tels quels ; les Dragon Balls : « boules de
      cristal » en français, « Bolas de Dragón » en espagnol, « Dragonballs » en allemand, « كرات التنين » en arabe).
      `tests/dragonball.spec.ts` (ordinateur et iPhone, anglais et français), vérifié sur le site en ligne le 22/11, captures
      `verification/dragonball/`.
- [ ] Yoni : relire les traductions (surtout l'arabe) ; droits Dragon Ball toujours à confirmer.

## Passe « carrousel des Créations et vraies boîtes » (Yoni, 22/11/2026, 2) — état au 22/11/2026
- [x] **Créations en carrousel** (depuis le 23/11 : retour à la grille 3 par 3, carrousel supprimé) (`src/components/PieceCarousel.tsx`), dans Toutes, chaque collection et sous-catégorie
      (Chaînes, Pendentifs > Jesus Pieces…) : la création en cours grande au centre (cadre carré), celles d'avant et
      d'après plus petites, floutées, qui dépassent sur les côtés ; défilement natif aimanté (doigt, trackpad), molette
      horizontale (une création par geste), flèches (sur les côtés sur ordinateur, sous la pièce sur téléphone), clavier
      (← →, Début, Fin), compteur « 3 / 18 ». Clic au centre = la pièce ; clic sur une floutée = elle vient au centre. Au
      retour d'une pièce, le carrousel reprend où il était. « Voir toutes les créations » : grille de cartes identiques
      (`?view=grid` ; 3 / 2 / 1 par rangée, même cadre 4:5, titre sur 2 lignes au plus, ligne « Créée pour » sur 2 lignes
      réservées : titres alignés), « Revenir au carrousel ». Aucun saut de mise en page. Textes en 6 langues
      (`creations.carousel…backToCarousel` de `src/i18n/ui/*.ts`). Avec le serveur, la liste arrive ensuite dans l'ordre de
      la base : le carrousel revient sur la première tant que le visiteur n'y a pas touché.
- [x] **Écrins : les vraies boîtes** (`/boxes`). 13 écrins dans l'ordre de `BOXES` (`src/data/pieces.ts`), même carré, grille
      alignée (3 / 2 / 1). `npm run trunks` (`scripts/trunk-media.mjs`, refait en entier) :
      - **avec vidéo** (`00 Contexte Yoni/Ecrins IA (ouverture) v2/<dossier>/`, raccord vidéo → photo ouverte < 4/255) :
        Écrin Signature, Sirius, Tulips on Tour, **BRT Coral Case** (`brt-coral-case`, nouveau), **Trophy Trunk**
        (`trophy-trunk`, nouveau) ;
      - **sans vidéo** (`00 Contexte Yoni/Boites (photos pro)/<dossier>/`, 01 fermée → 03 ouverte, posées entières dans
        le carré sur leur propre fond flouté, transition avec une lumière qui sort de la boîte) : Dragon Ball, **The Hand
        Cube** (`the-hand-cube`), **DFB-Pokal 2025 Display** (`dfb-pokal-2025-display`), **Photo Case** (`photo-case`, le
        joueur n'est pas nommé), **World Cup Display** (`world-cup-display` : sa 03 est le côté au blason, fermée ; elle
        s'ouvre sur la **04**, la vitrine levée) ;
      - **écrins d'avant** (Butterfly, Okafor, Campione d'Italia) : leurs anciennes ouvertures IA supprimées (intérieur
        inventé) ; ils s'ouvrent de leurs vraies images (Campione : photos 25/p20 → p22 ; Butterfly : film de livraison
        23/v01 HD à 0,2 s → 4 s ; Okafor : story 11/03 à 0 s → 7 s). Leurs photos de page inchangées. NZ reste retiré (son
        ouverture IA supprimée aussi).
      Depuis le 22/11 (4) : tous s'ouvrent et se referment avec leurs vidéos, plus aucun fondu de photos (voir « écrins qui
      s'ouvrent et se referment »).
      À la fin de l'ouverture, la **pièce détourée monte et flotte** au-dessus de la boîte (vue principale de la vitrine de
      la pièce, `resolveShowcase`) avec une lueur ; puis **« Créer votre écrin »** (WhatsApp qui nomme l'écrin, 6 langues)
      et **« Découvrir la pièce »** (sa capsule). Pièce inconnue (`pieceSlug: null`, à remplir dans `BOXES` ou l'admin
      « Pièce liée ») : seulement « Créer votre écrin », rien ne sort. Lumière et place de la pièce : `PLACES` de
      `src/data/trunks.ts`. Vidéos chargées à l'approche, image fermée en attente.
- [x] **Photos des écrins** : les photos pro (`public/media/trunks/<écrin>/photo-NN`) remplacent les anciennes (Dragon Ball,
      Sirius, Tulips ; Signature : les 4 pro puis 3 anciennes qui montrent autre chose). Pages des pièces : The Hand → The
      Hand Cube, VfB → DFB-Pokal 2025 Display (`boxSlug`), le lien de l'écrin mène à `/boxes#box-<écrin>`. Étape « remise »
      de Dragon Ball : sa photo pro ouverte. Textes courts d'après les photos (aucune pierre, aucun nom de joueur), 6
      langues ; admin : les nouveaux écrins apparaissent seuls, aide du champ « Pièce liée ».
- `tests/carousel.spec.ts` et `tests/trunks.spec.ts` (ordinateur, tablette, iPhone), vérifiés sur le site en ligne le 22/11
  (50 réussis), captures `verification/carousel/` et `verification/trunks/`.
- [ ] Yoni : la pièce de BRT Coral Case, Trophy Trunk, Photo Case, World Cup Display (et l'Écrin Signature) ; droits des
      dessins d'anime sur la malle Dragon Ball et le cube The Hand ; la bague grise dans la vitrine Coupe du monde est-elle
      un prototype ? accord du joueur photographié sur la Photo Case.

## Passe « retours de Yoni du 22/11 » (Créations, Jesus Pieces, serpent or rose, Butterfly en deux, formulaire photos) — état au 22/11/2026
- [x] **Créations** : 3 pièces par ligne sur ordinateur (grandes cartes, celles des collections), 2 sur tablette, 1 sur
      téléphone (`src/pages/Creations.tsx`). Depuis le 22/11 (2) : carrousel d'abord, cette grille avec « Voir toutes les
      créations » (voir « carrousel des Créations et vraies boîtes »).
- [x] **Jesus Pieces = sous-catégorie des Pendentifs** (`SUBCATEGORIES` de `src/data/collections.ts`, `parent: "pendant"`) :
      onglets « Tous les pendentifs / Jesus Pieces » sur la page des pendentifs, filtre sous « Pendentifs » dans Créations
      (`?category=pendants&sub=jesus-pieces`), adresse directe `/creations/pendants/jesus-pieces` (titre Google déplacé,
      `seo.json` et `ui/*.ts`), sous « Pendentifs » dans le menu, le menu téléphone et le pied de page. L'ancienne adresse
      `/creations/jesus-pieces` y mène (301 : serveur et `vercel.json`). Toujours 4 pièces : la 5e reste introuvable.
- [x] **Univers serpent en or rose** : nouvelles images de Yoni (`serpent-desktop/-mobile.jpg`, jamais `_originaux`),
      `npm run universes -- --only=serpent` ; serpent de lumière, braises, halo et lumière en or rose (`glow: "#e8b4a0"`,
      `fx.ts`) ; noms « écailles or rose » / « serpents or rose ». La lueur rouge de la porte (dans l'image) reste rouge.
- [x] **Butterfly en deux pièces** : `michy-batshuayi-butterfly-pendant` (« Michy Batshuayi — Butterfly Pendant », ancienne
      adresse `michy-batshuayi-butterfly-chain` redirigée vers lui, `RENAMED_PIECES`) garde tout sauf la chaîne seule : le
      pendentif seul, porté sur la chaîne (p52, p54), Michy qui le porte, le brut p77, le making-of (story 07/10), l'écrin,
      son film d'ouverture, son croquis (`sketch` : le fichier garde l'ancien nom). Les 3 vidéos v03, v09, v15 montrent toutes
      le pendentif : elles restent sur lui. **`butterfly-chain`** (« Michy Batshuayi — Butterfly Chain », chaîne) : p60
      (principale), p56, p59, p55, p66. Les deux pièces viennent du même dossier `public/media/hd/michy-batshuayi-butterfly-chain/`
      (`sorted(dir, own, files)` choisit les fichiers). Lien de l'une à l'autre sur leur page (`WORN_TOGETHER`, `wornWith`,
      « Se porte sur » / « Son pendentif »). Textes en 6 langues, détourages et film renommés, aperçus de liens refaits.
- [x] **Fond Butterfly plus sombre** (images de Yoni, `npm run universes -- --only=butterfly`), moins de papillons de lumière
      et plus discrets, lune moins forte (`fx.ts`, `index.css`) : la pièce d'abord.
- [x] **Correspondance privée (formulaire de /contact)** : nom, e-mail, Instagram (facultatif), l'idée et jusqu'à 6 photos
      (ordinateur ou galerie du téléphone, aperçu, retirer avant l'envoi), allégées dans le navigateur (`src/lib/photos.ts` :
      2048 px, JPEG ≤ 1,6 Mo ; une photo HEIC que le navigateur ne sait pas lire part telle quelle si ≤ 3,8 Mo). Serveur :
      `POST /api/contact` (34 Mo au plus pour cette adresse, chaque photo vérifiée par ses premiers octets, ≤ 4 Mo), photos
      dans la base (`ContactPhoto`, migration `20261122100000_contact_photos`), jamais publiques : l'admin (onglet Messages)
      les lit avec le mot de passe, bouton « Supprimer » ; l'e-mail de la maison les joint quand le SMTP est réglé.
      Anti-spam discret : champ caché, envoi en moins de 3 s ignoré, 5 envois / 10 min. Confirmation et erreurs claires
      (6 langues). **Sur Vercel (sans serveur), le formulaire ouvre WhatsApp** avec le texte et demande d'y ajouter les photos :
      l'envoi avec photos et l'admin marcheront sur le VPS.
- `tests/yoni2211.spec.ts` (ordinateur, tablette, iPhone ; formulaire avec 2 photos dont une HEIC reçu dans l'admin puis
  supprimé, en local avec le serveur ; en ligne, le passage par WhatsApp avec ses photos en aperçu), vérifié sur le site
  en ligne le 22/11, captures dans `verification/yoni2211/`.
- [ ] Yoni : la 5e Jesus Piece ; relire les textes de la Butterfly Chain et du pendentif (traductions).

## Passe « portrait de Yoni sur La Maison » — état au 22/11/2026
- [x] **Le portrait noir et blanc** de Yoni (`Berete - La Maison/Portraits IA (propositions)/yoni-noir-blanc.jpg`, copié en
      `Berete - La Maison/portrait.jpg`, `npm run import-media -- --only=house`) est la photo principale de La Maison
      (`public/media/house/portrait.webp`) : cadré depuis le haut (le cadre 4:5 ne retire que le bas du pull, jamais la
      tête), chargé tout de suite. Aucune autre photo de ce dossier sur le site (ni yoni-showroom, ni yoni-etabli, ni
      yoni-portrait-atelier, jamais mises en ligne). Citations et chapitres : toujours sans photo (aucun cadre vide).
- [x] Corrigé au passage : la vitrine d'une pièce plantait quand une de ses vues est exclue dans l'admin (seulement avec le
      serveur, jamais sur Vercel) : `places` de `src/components/Showcase.tsx`.
- `tests/maison.spec.ts` (ordinateur et iPhone, anglais et français : visage entier, rien coupé), captures dans
  `verification/maison/`.
- [ ] Yoni : valider ce portrait (image IA) ; ses vraies photos personnelles pour les citations et les chapitres.

## Passe « réponses aux doutes du Making of » (Yoni, 21/11/2026) — état au 21/11/2026
- [x] **Nouvelles étapes** (`MAKING_STEPS` de `src/data/types.ts`, titres et textes en 6 langues dans `src/i18n/ui/*.ts`) :
      « Préparation du sertissage » (`preparation`), « Les pièces avant assemblage » (`parts`), « Assemblage » (`assembly`),
      « Finition » (`finishing`), « La pièce portée » (`worn`), dans l'ordre esquisse, brut, préparation, sertissage, pièces,
      assemblage, polissage, finition, remise, portée. Une étape peut avoir une 2e image (`setting2` …) : petite image dans le
      coin de la première, qui s'ouvre de même (`makingSteps` de `src/data/making.ts`).
- [x] **Mis en ligne** (planche, lignes validées) : 1. octogone d'Okafor, remise (story 11/05 : la malle à photo est bien
      la sienne, plus dans `BOX_NOT_ITS_OWN`) ; 3. AS, préparation du sertissage (18/v04 à 2 s) ; 4. panthère, assemblage
      (08/v08 à 1 s) ; 5. panthère, les pièces avant assemblage (08/p01, les plaques LASANA) ; 9. T-Serpent, 2e image du
      sertissage (08/v19 à 2 s, à côté de son film 27/v03) ; 10. Inter, 2e image du sertissage (08/v25 à 3 s) ; 16. chaîne
      torsadée de Kevin Schade, remise (story 03/02) ; 18. Jesus piece de Samuel Ballet, la pièce portée (story 15/05 à
      8,4 s ; rien pour la BRT Flower) ; 19. Tulips on Tour, finition (24/v13 à 0,5 s) ; 20. inchangé (making-of 14 mm).
- [x] **Écartés** (rien en ligne) : 2 (étui NZ), 6, 8, 11 à 14 (pièce non identifiée), 7 (BRT Flower ou Sirius), 15
      (maillons du film du maillot d'Okafor), 17 (36/v02 reste sur la BRT Flower seule).
- [x] Planche mise à jour : chaque ligne marquée « VALIDÉ » (vert) ou « ÉCARTÉ » (rouge). `tests/doutes.spec.ts` (les 8
      pièces, ordinateur et iPhone, chaque image ouverte en plein écran), captures dans `verification/doutes/`.
- Les photos de l'écrin Sirius sont passées dans `public/media/trunks/sirius/photo-*` (l'import vidait `media/boxes`).

## Passe « retours de Yoni du 21/11 (3) » (Dragon Ball, Cercle, Sirius, écrin NZ, accueil, menu) — état au 21/11/2026
- [x] **Dragon Ball** : la vue principale détourée en grand à l'ouverture (`showcase: { size: "large" }` de la pièce ; admin
      « Vitrine de l'ouverture » : « Pièce en grand ») : toute la hauteur sur ordinateur (+35 %), un cadre plus haut sur
      téléphone (70 svh, +28 %), jamais coupée. Son montage pro **13/v01** (HD 1080 × 1920, 25 s, du dessin 3D à la pièce
      finie) devient son film d'ouverture (`reveal` dans `scripts/film-media.mjs`) ; il reste dans l'atelier, joué une fois.
      La version des stories (kevin-schade/20) n'est qu'en 720p, aucun « Videos HD » dans le dossier 13.
- [x] **Le Cercle** : un clic sur un joueur mène droit à la capsule de sa pièce, dans son univers (`personHref` de
      `src/data/relations.ts`) ; s'il en a plusieurs (Thuram, Okafor, Kevin Schade, Tillman, Leweling, Undav, Stiller), à sa
      page : ses pièces en premier (cartes « Entrer dans l'univers »), photos, joueurs du club, puis ses stories en petit en
      bas. Partout : mur du Cercle (/players et accueil), joueurs d'un club, « Créée pour » d'une pièce (vers sa page s'il
      n'a que cette pièce). La barre des stories en haut de l'accueil ouvre toujours les stories (la fonction Instagram).
- [x] **Écrin Sirius** : nouveaux fichiers de Yoni (le vrai écrin noir au masque, suède rouge, braises), `npm run trunks --
      --only=sirius` ; ses deux images remplacent ses photos sur la page des écrins (`public/media/trunks/sirius/photo-closed|
      open`, `photos` dans `trunks.generated.json` ; jamais dans `media/boxes`, que `npm run import-media` vide de ce qu'il
      n'a pas fait). Les vraies photos de l'écrin (37/p01, p03, p04) restent sur la page de la chaîne.
- [x] **Univers japonais de Sirius** (remplace le ciel étoilé) : fond `sirius-japon` (`sirius-japon-desktop/-mobile.jpg`),
      preset `japon` : braises rouges, feuilles d'érable rouges qui tombent (effet `maple`, `fx.ts`), brume rouge (`smoke`),
      lune de sang qui respire, yeux des masques qui s'allument par moments (spots `eye`, les 2 yeux d'un masque ensemble ;
      2 masques sur ordinateur, 7 sur téléphone), éclairs discrets dans les nuages (spots `flash`) ; sur la pièce un reflet
      rouge et un halo rouge (`jewel-blood`). Police pinceau. Aucune story ne montre Sirius : le fond (`portrait`) entourera
      sa story dès qu'elle existera.
- [x] **NZ Travel Case retirée** : les écrins ont maintenant une case « Publié » (colonne `published` de `Box`, migration
      `20261121200000_box_published`, `REMOVED_BOXES` dans `src/data/pieces.ts`) ; gardée dans l'admin, invisible partout
      (page des écrins, page du FAM). Toute adresse `/boxes/<écrin>` mène (301) à /boxes (serveur et `vercel.json`).
- [x] **Accueil plus petit** (−15 à −20 %) : titres de section 52 px au plus (64 avant), textes, boutons et marges réduits
      (textes ≥ 16 px et boutons ≥ 48 px gardés sur téléphone). « Explore the Creations » (`CollectionTiles.tsx`) : petites
      cartes (4 de front sur ordinateur, 2 sur téléphone), le bijou entier avec de l'air autour (plus de recadrage). Cartes
      « The Universes » et mur des joueurs plus petits, section « From Vision to Reality » en carrés.
- [x] **Menu** : la page « Worn by Icons » (/players) avait le même menu que les autres ; sous 1 440 px (portable avec sa
      barre de défilement), toutes les pages passaient au bouton menu en haut à droite. Le menu complet tient maintenant dès
      **1 260 px** (`--breakpoint-nav`, lettres un peu plus serrées jusqu'à 1 440 px, `roomy`), vérifié dans les 6 langues.
- `tests/yoni2111.spec.ts` (ordinateur et iPhone), captures dans `verification/yoni2111/`.
- [ ] Yoni : relire l'univers japonais (masques oni : rien d'une œuvre précise) ; une story de Sirius et de The Hand ?

## Passe « The Hand : l'espace infini » — état au 21/11/2026
- [x] **Nouvel univers de The Hand** (remplace le rideau de velours) : fond `infini` (images de Yoni `vide-infini-desktop/
      -mobile.jpg` de `Univers IA (propositions)`, `npm run universes -- --only=infini` ; version téléphone sur téléphone,
      19 à 130 Ko), preset `infini` (`src/data/themes.ts`). Entrée `unfold` : l'écran noir, puis l'espace se déploie depuis la
      pièce dans un cercle de lumière (1,9 s ; `src/index.css`, la pièce et son halo arrivent avec lui). Effets `void` :
      traits de lumière blancs et violets qui filent vers la sphère (`src/components/universe/fx.ts`), trois anneaux qui
      ondulent depuis elle et la respiration lente de sa lumière (`.u-void-ring`, `.u-genki[data-spot="void"]`, position de
      la sphère `core` / `mobileCore`), fines étoiles (`stars`). Sur la pièce : halo bleu-blanc derrière elle et reflets
      froids (`jewel-void`, `JewelFx.tsx`). Pause en bas de page, immobile avec « réduire les animations ».
- [x] Rien de l'animé : ni personnage, ni logo, ni police, ni nom de l'œuvre dans le site (noms neutres « infini »,
      « unfold », « void » ; test). Titre et menu lisibles (contraste AA).
- [ ] **Sa story** : aucune story ne montre The Hand ; le fond est fait pour un écran entier (`portrait`), il entourera sa
      story dès qu'elle existera (comme Dragon Ball). `tests/infini.spec.ts`, captures dans `verification/infini/`.

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
- Depuis le 21/11 (3) : nouvel écrin Sirius, NZ Travel Case retirée (voir plus haut). Depuis le 22/11 (2) : vraies boîtes,
  nouvelles vidéos, la pièce qui sort, 13 écrins (voir « carrousel des Créations et vraies boîtes »).
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
      d'Okafor (remise de l'octogone depuis le 21/11, réponse de Yoni) et l'étui NZ ne sont plus montrés comme remise (`BOX_NOT_ITS_OWN`) ; la remise de la Butterfly (repost de
      story) remplacée par la chaîne dans sa malle. Aucune remise « photo seule » de la pièce finie.
- [x] **Doutes** : planche `/Volumes/Disque externe/Berete - Dossiers icloud/_verif/making-of-doutes.jpg` (20 lignes :
      pièce, étape, images, fichier source). Réponses de Yoni le 21/11 (voir « Passe réponses aux doutes du Making of »).
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
- [x] **Jesus Pieces** dans le menu sous Les Créations (ordinateur, téléphone, pied de page) : depuis le 22/11 une
      sous-catégorie des Pendentifs, `/creations/pendants/jesus-pieces` (voir « retours de Yoni du 22/11 »),
      `SUBCATEGORIES` dans `src/data/collections.ts` (Red Crown, Samuel Ballet, Red Flowers, Jesus Cross), 6 langues, titre
      Google. **5e introuvable** : toutes les photos et vidéos des dossiers 01–38, des stories et du 08 regardées ; les
      candidates (Thuram SS23 03/04, Collectors 15, 20, 23, 24) sont des 4 connues. Peut-être dans « 99 - NE PAS ENVOYER »
      (jamais ouvert) ou une pièce retirée : demander à Yoni. La page Thuram retirée reste hors ligne.
- `tests/making.spec.ts` (6 capsules, N14, panthère, Jesus Pieces ; ordinateur et iPhone), captures `verification/making/`.
- [ ] Yoni : la 5e Jesus Piece ; des photos de fabrication pour les pièces sans étape (Baguette Cross, Cross Infinity, Oval Eternity, Red Crown, Baguette
      Cuban, Rose 20 mm).

## Passe « Sous tous les angles » et 4 pièces retirées (retours de Yoni du 21/11) — état au 21/11/2026
- [x] **Une photo + un texte** (depuis le 23/11 : une galerie, au plus une courte légende) sur toutes les pièces (`src/components/EveryAngle.tsx`) : chaque photo et chaque vidéo de la
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
      (`sirius`) ; tulipes → Tulips on Tour ; Flâneur (`flaneur`, pièce retirée le 21/11) ; trèfle → Eljero Elia (`emeraude`) ; The Hand (`rideau`, remplacé le 21/11
      par l'espace infini `infini`) ;
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

## Passe « mise en ligne sur VPS » (tout en un) — état au 25/11/2026
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
- [x] VPS de Yoni chez one.com (Cloud server M, Ubuntu 26.04, 85.190.121.137), `Host berete-vps` (root, `~/.ssh/id_ed25519`),
      SSH par clé seulement (root et administrator), installé, 3D envoyée, clé de déploiement GitHub en place, domaine
      beretejewellers.com (25/11). `deploy/restore.sh --test` relit une sauvegarde dans une base à part. Docker en IPv6 (chaque
      visiteur IPv6 garde son adresse : limites d'essais justes).
- [ ] Boîte e-mail des alertes (`set SMTP_USER SMTP_PASS ALERT_TO`) et clé OpenAI (`set OPENAI_API_KEY`) : Malik les tape.
- [ ] Avant d'ouvrir au public : repo GitHub en privé, droits Dragon Ball, ouvrir le site (admin), puis `launch`.

## Ce que Yoni a demandé le 9/11 — état au 13/11/2026
- [x] Stories façon Instagram, pages pièces avec histoire et fabrication, 6 langues, page Process, contact WhatsApp.
- [x] Visualiseur 3D maison (remplace iJewel3D) : métaux par calque, lumières, zoom sans recentrage, liens privés,
      espace VIP. Fonctionne seulement avec le serveur (pas sur la version Vercel).
- [x] Pierres soudées au métal dans les STL (bague VfB 0542) : retrouvées et reconstituées automatiquement (458 sur la
      0542, aucune fausse sur les autres fichiers). Restent en métal : les cônes de la bande « DFB-POKAL » et les carrés du
      bord de la tête (diamants posés à l'envers ou sertis vides ? à demander à Yoni).
- [x] **Section « Special Project » Inter Milan** (depuis le 23/11 : « Les grandes commandes », sans le dessus qui se soulève, passé dans l'Atelier) sur l'accueil, juste après le film : les **deux bagues** (Inter et VfB,
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
- [x] WhatsApp : vrai numéro (+971 58 593 0211, 25/11) ; message pré-rempli selon la page et la pièce (21/11, voir plus haut) ; Bracelet et
      Montre ajoutés au configurateur de contact (fait).
- [x] La Maison : biographie (fait), portrait noir et blanc en haut de la page (22/11). [ ] Photos personnelles de Yoni pour
      les citations et les chapitres (il les envoie).
- [ ] Étapes « croquis → 3D » de chaque pièce (Yoni envoie ses étapes).
- [ ] Vidéos IA à refaire par Malik : mécanisme bague → pendentif (plus clair), explication de la bague Inter en voix
      off grave, en anglais, sans longue intro.
- [ ] Mise en ligne : serveur VPS (KVM 2, environ 7,79 $/mois) pour la 3D, l'admin et l'espace VIP ; reprendre le nom
      de domaine de Yoni (chez one.com).

## Attendu de Yoni (bloque le lancement)
Photos personnelles pour La Maison (citations, chapitres ; le portrait est en ligne depuis le 22/11), autres noms des pièces publiées le 20/11 s'il en veut (et leurs
destinataires), photos des étapes de
fabrication, 2-3 fichiers 3D (.3dm de préférence), email, accord sur les visuels Dragon Ball.

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
