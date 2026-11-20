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
- [ ] Photo actuelle gardée (pas de photo propre du bijou seul) : JL (photo coupée en bas), Loïs Openda, Flâneur,
      chaîne torsadée de Kevin Schade, les 3 montres. Demander à Yoni des photos sur fond noir de ces pièces.

## Passe « making-of : Entrer dans l'atelier » — état au 19/11/2026
- [x] **Vidéos web** : `npm run import-media -- --only=films` (choix par pièce dans `scripts/film-media.mjs`, faits à
      l'œil). Les dossiers « Videos HD/ » annoncés **n'existent pas encore** sur le disque : on prend la meilleure copie de
      « Videos/ » (sans « (720p) » quand elle existe) ; dès qu'un « Videos HD/ » arrive, relancer la commande (il passe
      avant, et un fichier nommé « …Craftsmanship… / …Process… / Final Product Video / Final cut » est pris d'office).
      Le dossier 08 « Fabrication atelier (divers) » contient les making-of de VfB (HD), T-Serpent et Samuel Ballet.
      Ordinateur : H.264 jusqu'à 1080p ; mobile : copie légère (720p/540p) ; 6 images d'aperçu ; `public/media/films`.
- [x] **Page pièce** : passage « Enter the Atelier » / « Entrer dans l'atelier » après les photos, atelier plein écran
      (`src/components/AtelierRoom.tsx`) : fabrication puis « The Final Reveal », son coupé au départ, lecture après le
      clic seulement, sortie bouton / Échap / geste retour. Sans vidéo de fabrication : pas de passage.
- [x] **Page The Atelier** : section « Every Piece, Its Making-of » (vignettes des pièces publiées, même atelier, lien
      « Enter the World »). Admin : « L'atelier de la pièce » (vidéos ou aucune, image d'aperçu).
- Making-of en ligne (11) : Dragon Ball (HD), VfB (HD), croix Tillman (HD), Inter, OKA, octogone Okafor, Ruby T,
  T-Serpent, Samuel Ballet, Tulips (vidéo téléphone à l'établi), AS (vidéo téléphone, polissage). Sans fabrication : Kenan
  Yildiz, The Hand, Butterfly, maillot d'Okafor (pièce finie seule, prête), Safi Link et les autres (aucune vidéo).
- [ ] Yoni : envoyer les vidéos HD d'origine (la plupart des making-of sont en 720p) et les making-of manquants
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
- [x] **Vidéos HD** : `npm run films` les prend dès qu'elles sont entières dans « Videos HD » (pas écrites depuis 3 min, même
      durée que la copie) ; au 20/11 à 3 h 40, aucun dossier « Videos HD » n'était encore arrivé.
- [ ] Yoni : fichiers 3D des pièces (.3dm de préférence), d'abord la bague Inter (ses 9 détails attendent leurs points) ;
      vidéos du produit fini des pièces qui n'en ont pas ; la vidéo de The Hand montre un personnage d'anime gravé sur
      l'écrin (droits, comme Dragon Ball).

## Passe « toutes les photos » (galeries complètes, pièces cachées publiées) — état au 20/11/2026
- [x] **Tri refait** de tous les dossiers iCloud (photo par photo, images de chaque vidéo regardées) : tout ce qui est
      utile est gardé (chaque angle, détail, mise en scène) ; retirés : doublons et quasi-doublons (la plus nette gardée),
      flous, captures d'écran et rendus 3D, photos d'atelier (gardées pour la fabrication), visages de personnes privées
      (un joueur seulement s'il est reconnu à coup sûr), dessins animés (Dragon Ball). Liste et ordre dans
      `scripts/hd-media.mjs` (`gallery` : `"p7:front"`, ce que montre chaque photo, `src/data/views.ts`, légendes
      traduites dans les 6 langues ; `also` : fichiers des étapes de fabrication). `npm run import-media -- --only=hd`.
      Ordre : la plus belle d'abord, vues d'ensemble, détails, dos et gravures, portées, écrin.
- [x] **Page d'une pièce** : les 8 premières photos défilent comme avant, toutes les autres dans la grille « Every Angle
      / Sous tous les angles » (`src/components/GalleryGrid.tsx` : 12 d'abord, puis « Voir les N autres », chargées au
      fil du défilement, copie légère de chaque photo, vidéos muettes qui ne jouent qu'à l'écran). Plus de limite de 10.
- [x] **14 pièces cachées publiées** (« Created exclusively for a private collector », titres anglais d'après les
      photos, univers existants, textes sans nom ni chiffre, `NEW_PIECES` dans `src/data/pieces.ts`) : Script Nameplate
      Pendant (dossiers 14 + 07, même pièce), Ampersand Initials Pendant, Thorns and Roses Crucifix, Baguette Cross
      Pendant, Crown of Thorns Jesus Piece, Panther Champion Pendant, Celestial Initial Medallion, Rose Iced Cuban Chain
      (01), Wide Rose Iced Cuban Chain (02 + 28/p07 : pas la même chaîne que 01, fermoir et largeur différents),
      Two-Tone Iced Cuban Chain (31, seule pièce propre du dossier), White Iced Cuban Chain (33), Two-Row Tennis Chain,
      Pear Link Chain, Oval Eternity Band. Aucune ne correspond aux 10 pièces retirées. Yoni peut les renommer ou les
      cacher dans l'admin. Films d'ouverture : D&E (commence à 7,4 s : avant, une fresque d'un basketteur connu),
      crucifix, prénom, panthère ; atelier : chaîne rose (01/f), crucifix, panthère.
- [x] **Fusions** : dossier 30 = la chaîne du pendentif OKA d'Okafor (mêmes maillons, même écrin) : ses photos sont sur la
      page OKA ; 28 = copies d'autres dossiers (rien à publier) ; 31 mélangeait 6 chaînes (une seule gardée).
- [x] Détourages des nouvelles pièces (8 vues propres : D&E, crucifix, croix baguettes, prénom, Jesus piece, médaillon) ;
      l'alliance et la panthère gardaient le reflet du miroir : elles s'ouvrent sur leur photo.
- 43 pièces en ligne : 156 photos et 77 vidéos avant, 392 photos et 89 vidéos après (détail dans le rapport du 20/11).
- [ ] Yoni : **revers de la médaille céleste** (dossier 22) : prénoms d'une famille et « 1955 – 2022 » gravés : ni ce
      revers ni le film (22/v08) ne sont montrés tant que la famille n'a pas dit oui. **Panthère** : la ceinture porte un
      prénom, une date et une heure (les deux gros plans de la date et de l'heure sont retirés) ; est-ce la pièce de Keita
      Losene (« MMA CHAMPION ») ? **Homme en casquette verte** (40 photos de la livraison du Butterfly) et **homme en
      lunettes** (remise des bagues VfB) : si c'est Yoni, ces photos peuvent revenir. Visages des joueurs de l'Inter
      (remise des bagues) gardés hors galerie. Tulips on Tour porte « Mason Garments ». Les montres de Thuram et Tajon
      ressemblent à des Cartier Santos glacées. Photos des 4 chaînes isolées du dossier 31 et vidéos 08/v18, v19 à identifier.

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
      Attention : le Mac n'a que ~5 Go libres ; une construction Docker en prend ~4 (`docker builder prune -af` après).
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
- [ ] WhatsApp : vrai numéro (encore 971XXXXXXXXX) ; message pré-rempli selon le type de bijou (fait) ; Bracelet et
      Montre ajoutés au configurateur de contact (fait).
- [x] La Maison : biographie (fait). [ ] Photos personnelles de Yoni (il les envoie).
- [ ] Étapes « croquis → 3D » de chaque pièce (Yoni envoie ses étapes).
- [ ] Vidéos IA à refaire par Malik : mécanisme bague → pendentif (plus clair), explication de la bague Inter en voix
      off grave, en anglais, sans longue intro.
- [ ] Mise en ligne : serveur VPS (KVM 2, environ 7,79 $/mois) pour la 3D, l'admin et l'espace VIP ; reprendre le nom
      de domaine de Yoni (chez one.com).

## Attendu de Yoni (bloque le lancement)
Photos personnelles pour La Maison, vrais noms des 14 pièces publiées le 20/11 s'il en veut d'autres (et leurs
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
