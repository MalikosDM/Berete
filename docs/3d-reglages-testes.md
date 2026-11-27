# Réglages de l'éditeur 3D : chacun testé

Mis à jour le 27/11/2026 par `npx tsx scripts/settings-audit.ts` (serveur de développement lancé).

## Comment c'est testé

- **Deux bijoux** : ZR0982 (bague : une grosse pierre taille émeraude, deux baguettes) ; Octogone « N » v1 (fichier Rhino du client : pavé de petites pierres). Ils ne sont jamais enregistrés : chaque réglage est donné dans l'adresse du laboratoire 3D (/lab3d), qui dessine le bijou avec notre moteur.
- **Pour chaque réglage**, une valeur basse et une valeur haute (ou chaque choix de la liste) sont dessinées, puis les deux images sont comparées **sur le bijou** : l'écart moyen des points (0 à 255 ; visible à partir de 0,8, ou quand 1 % des points changent nettement) et le **sens** attendu : plus clair ou plus sombre, plus ou moins de couleur, de contraste, de chaleur, de halo autour du bijou, de netteté. Les réglages des pierres se mesurent sur les pierres, ceux du métal sur le métal, ceux de la scène et des effets sur tout le bijou, ceux du fond sur le fond, ceux du sol sous le bijou.
- **Les pierres** sont aussi mesurées par le moteur lui-même (`measureStones` : luminosité moyenne, part de noir et de blanc plat). Une pierre est lisible quand sa moyenne est entre 0,12 et 0,88, avec moins de 40 % de noir et moins de 45 % de blanc plat. Chaque curseur est mesuré à ses deux bouts (les autres réglages par défaut) ; **les combinaisons les plus sombres et les plus claires** de tous les curseurs des pierres ensemble sont mesurées sous chacun des éclairages des pierres (plus bas).
- **Dans le vrai éditeur**, chaque réglage est ensuite bougé à la main (Playwright) : l'image doit changer tout de suite, et « Enregistrer » est intercepté (jamais envoyé) pour vérifier que le réglage écrit bien ce qu'il doit. « éditeur ✓ » dans la colonne Résultat.
- Les réglages qui ne changent pas l'image (boutons du client, mouvements de caméra) sont vérifiés dans le code qui les lit.
- Les petites images d'aide (« ? » à côté de chaque réglage) sortent de ces mêmes rendus, sur ZR0982 : l'émeraude pour les pierres, l'anneau pour le métal, la bague entière pour la scène et les effets.

**Bilan** : 154 réglages testés (356 valeurs ou choix) : 140 OK, 9 réparés, 7 retirés, 1 à revoir. Pierres poussées toutes ensemble au même bout (garde commune du moteur) — côté clair : 26 images lisibles sur 28 ; encore trop blanches : ZR Contre-jour ; N Ancien rendu ; côté sombre : 27 images lisibles sur 28 ; encore trop sombres : ZR Spot.

## Vue

| Réglage | Effet attendu | Effet mesuré | Résultat |
| --- | --- | --- | --- |
| Qualité | Très haute : plus de rebonds dans les pierres, image plus lisse | ZR : 3 options, 1 visibles (écart 1,0 à 1,0) · N : 3 options, 1 visibles (écart 1,8 à 1,8) *(Sur un ordinateur, « Automatique » est « Haute ».)* | **OK** |
| Champ de vision | Plus de perspective quand il grandit | ZR : écart 36,9 (32 % des points), pierres 0,37 → 0,42 · N : écart 20,2 (29 % des points), pierres 0,56 → 0,54 | **OK** |
| Mise à l'échelle automatique (Auto Scale) | Le bijou cadré entier à la première vue | ZR : écart 51,2 (32 % des points), pierres 0,34 → 0,44 · N : écart 26,0 (32 % des points), pierres 0,54 → 0,54 | **OK** |
| Centrage automatique (Auto Center) | La première vue vise le milieu du bijou | ZR : écart 59,4 (42 % des points), pierres 0,34 → 0,44 · N : écart 30,0 (32 % des points), pierres 0,55 → 0,54 | **OK** |
| Zoom à la molette et au pincement | Un bouton ou un geste chez le client | Pas un réglage de l'image : lu par le visualiseur du client (vérifié dans son code ; boutons testés par tests/editor3d.spec.ts). | **OK** |
| Boutons + et − | Un bouton ou un geste chez le client | Pas un réglage de l'image : lu par le visualiseur du client (vérifié dans son code ; boutons testés par tests/editor3d.spec.ts). | **OK** |
| Invite « Glissez pour tourner » | Un bouton ou un geste chez le client | Pas un réglage de l'image : lu par le visualiseur du client (vérifié dans son code ; boutons testés par tests/editor3d.spec.ts). | **OK** |
| Rotation automatique au départ | Un bouton ou un geste chez le client | Pas un réglage de l'image : lu par le visualiseur du client (vérifié dans son code ; boutons testés par tests/editor3d.spec.ts). | **OK** |
| Vues enregistrées et visite guidée | Un bouton ou un geste chez le client | Pas un réglage de l'image : lu par le visualiseur du client (vérifié dans son code ; boutons testés par tests/editor3d.spec.ts). | **OK** |
| Configurateur (pastilles en bas) | Un bouton ou un geste chez le client | Pas un réglage de l'image : lu par le visualiseur du client (vérifié dans son code ; boutons testés par tests/editor3d.spec.ts). | **OK** |
| Bouton Partager | Un bouton ou un geste chez le client | Pas un réglage de l'image : lu par le visualiseur du client (vérifié dans son code ; boutons testés par tests/editor3d.spec.ts). | **OK** |
| Plein écran | Un bouton ou un geste chez le client | Pas un réglage de l'image : lu par le visualiseur du client (vérifié dans son code ; boutons testés par tests/editor3d.spec.ts). | **OK** |
| Essayage (bagues) | Un bouton ou un geste chez le client | Pas un réglage de l'image : lu par le visualiseur du client (vérifié dans son code ; boutons testés par tests/editor3d.spec.ts). | **OK** |
| Voir chez moi (réalité augmentée) | Un bouton ou un geste chez le client | Pas un réglage de l'image : lu par le visualiseur du client (vérifié dans son code ; boutons testés par tests/editor3d.spec.ts). | **OK** |
| Qualité chez le client | Un bouton ou un geste chez le client | Pas un réglage de l'image : lu par le visualiseur du client (vérifié dans son code ; boutons testés par tests/editor3d.spec.ts). | **OK** |
| Limiter le zoom (écran en hauteur / en largeur) | Un bouton ou un geste chez le client | Pas un réglage de l'image : lu par le visualiseur du client (vérifié dans son code ; boutons testés par tests/editor3d.spec.ts). | **OK** |
| Au plus près / au plus loin | Les distances limites du zoom chez le client | Limite la caméra du client (lue par la scène : minDistance / maxDistance). | **OK** |
| Vitesse de la rotation automatique (Rotate Speed) | Le bijou tourne plus ou moins vite, dans un sens ou dans l'autre | ZR : écart 25,5 (24 % des points), pierres 0,38 → 0,40 · N : écart 14,0 (16 % des points), pierres 0,43 → 0,38 *(Images : la caméra là où la rotation l'amène au bout d'une seconde. La vitesse elle-même est lue par le visualiseur du client (src/viewer/JewelViewer.tsx → Stage : rotateSpeed).)* | **OK** · éditeur ✓ |
| Déplacement latéral (Pan) | Le client peut ou non faire glisser le bijou | Un geste du client, pas une image (lu par la scène : clic droit, Maj + glisser, deux doigts). | **OK** · éditeur ✓ |
| Limites d'angle de la caméra (Polar Angle Limits) | La caméra du client ne monte ni ne descend au-delà | Un mouvement de caméra du client, pas une image (lu par la scène : angles en degrés depuis le dessus). | **OK** · éditeur ✓ |

## Parties

| Réglage | Effet attendu | Effet mesuré | Résultat |
| --- | --- | --- | --- |
| Rôle | La partie change de matière (cachée : elle disparaît) | ZR : 5 options, 4 visibles (écart 35,6 à 88,5) · N : 5 options, 4 visibles (écart 37,4 à 69,3) *(« Pierre de couleur » : rouge (la couleur que montre le champ), densité de couleur 0,4.)* | **réparé** · éditeur ✓ — « Pierre de couleur » et « Émail » restaient blancs ou noirs : ils prennent la couleur que montre le champ, et une pierre de couleur une densité 0,4 (à 1,2, une grande pierre était à moitié noire). |
| Métal | La couleur et l'éclat de l'alliage | ZR : 10 options, 8 visibles (écart 2,3 à 73,2) · N : 10 options, 9 visibles (écart 0,9 à 67,3) *(L'or rose 14 carats a presque la couleur de l'or rose 18 carats (valeurs mesurées des alliages) : écart faible, normal.)* | **OK** |
| Finition | Poli, satiné, brossé, martelé, vieilli | ZR : 4 options, 3 visibles (écart 4,8 à 31,9) · N : 4 options, 3 visibles (écart 8,6 à 36,6) | **OK** |
| Sens du brossage | Les lignes du brossage tournent | ZR : écart 56,7 (91 % des points), pierres 0,44 → 0,44 · N : écart 49,4 (86 % des points), pierres 0,54 → 0,54 *(Ne se montre plus que sur un métal déjà brossé (la finition « Brossé » est retirée des choix, voir plus bas).)* | **OK** |
| Teinte du métal (Metal Color) | Le métal prend la teinte choisie | ZR : écart 20,9 (92 % des points), chaleur (rouge − bleu) 0,142 → 0,306, pierres 0,44 → 0,44 · N : écart 25,9 (93 % des points), chaleur (rouge − bleu) 0,125 → 0,339, pierres 0,54 → 0,54 | **OK** · éditeur ✓ |
| Rugosité (Roughness) | Reflets plus flous, métal plus doux | ZR : écart 48,1 (63 % des points), contraste 0,268 → 0,078, netteté −78 %, pierres 0,44 → 0,44 · N : écart 53,5 (71 % des points), contraste 0,210 → 0,066, netteté −73 %, pierres 0,54 → 0,54 | **OK** · éditeur ✓ |
| Vernis (Clearcoat) | Un deuxième reflet, net, par-dessus | ZR : écart 1,6, pierres 0,44 → 0,44 · N : écart 2,3 (1 % des points), pierres 0,54 → 0,54 | **OK** · éditeur ✓ |
| Teinte de la matière (LUT), métal | Le métal plus chaud, plus froid, plus vif… | ZR : 7 options, 6 visibles (écart 2,6 à 12,7) · N : 7 options, 6 visibles (écart 3,1 à 11,9) | **OK** · éditeur ✓ |
| Couleur (pierre de couleur, émail) | La pierre prend la couleur choisie | ZR : écart 4,0 (11 % des points), pierres 0,29 → 0,30 · N : écart 7,8 (25 % des points), pierres 0,27 → 0,28 | **réparé** — même réparation que « Rôle » (densité de couleur 0,4 au passage en pierre de couleur). |
| Biseau à l'écran, cette matière (SSBevel) | Les arêtes du métal plus arrondies | ZR : écart 0,1, pierres 0,44 → 0,44 · N : écart 0,0, pierres 0,54 → 0,54 | **retiré** — même raison. |
| Lueur sur cette matière (Bloom) | Les éclats des pierres rayonnent | ZR : écart 4,6 (8 % des points), pierres 0,44 → 0,44 · N : écart 4,2 (9 % des points), pierres 0,54 → 0,54 *(Mesuré avec une lueur plus forte que celle par défaut (seuil 1,2, intensité 0,6) pour qu'elle se voie.)* | **réparé** · éditeur ✓ — la lueur ne savait plus quelles matières rayonnent : le seuil effaçait le choix par matière (src/viewer/screen.ts) ; et dans l'éditeur, chaque réglage de la lueur refaisait l'effet sans ce choix ni la puissance (src/viewer/Stage.tsx). |
| Éclairage de la pierre (Environment) | Une autre lumière dans cette pierre | ZR : 14 options, 12 visibles (écart 50,7 à 82,0) · N : 14 options, 12 visibles (écart 30,1 à 53,5) *(Quand l'éclairage choisi est celui que « Automatique » prend déjà pour cette taille de pierre, rien ne change (normal).)* | **OK** |
| Couleur (Color) | La pierre teintée | ZR : écart 15,8 (44 % des points), couleur 0,069 → 0,124, pierres 0,44 → 0,35 · N : écart 25,1 (77 % des points), couleur 0,056 → 0,153, pierres 0,54 → 0,40 | **OK** |
| Luminosité (Env Intensity) | Pierre plus lumineuse | ZR : écart 77,4 (82 % des points), lumière 0,47 → 0,77, pierres 0,25 → 0,62 · N : écart 79,1 (84 % des points), lumière 0,57 → 0,88, pierres 0,31 → 0,72 | **OK** |
| Rotation de l'éclairage (Env Rotation Offset) | Les éclats changent de place | ZR : écart 11,7 (22 % des points), pierres 0,44 → 0,44 · N : écart 19,8 (47 % des points), pierres 0,54 → 0,55 | **OK** |
| Rotation de l'éclairage X / Y / Z | Les éclats changent de place | ZR : écart 58,4 (68 % des points), pierres 0,44 → 0,33 · N : écart 37,5 (65 % des points), pierres 0,54 → 0,45 | **OK** |
| Feu (Dispersion) | Plus d'éclats colorés | ZR : écart 9,8 (19 % des points), couleur 0,044 → 0,124, pierres 0,44 → 0,45 · N : écart 5,7 (14 % des points), couleur 0,041 → 0,084, pierres 0,54 → 0,54 | **OK** |
| Densité de couleur (Absorption) | Pierre teintée plus foncée | ZR : écart 23,3 (38 % des points), lumière 0,56 → 0,47, pierres 0,35 → 0,28 · N : écart 36,1 (75 % des points), lumière 0,64 → 0,49, pierres 0,40 → 0,23 *(Mesuré sur une pierre teintée rose (sans effet sur une pierre blanche, comme dans iJewel). Bornée à 1 : à 4, la moitié de la pierre était noire (à 1,1 déjà 40 %).)* | **OK** · éditeur ✓ |
| Indice de réfraction (Refractive Index) | La lumière pliée autrement : plus de brillant | ZR : écart 64,0 (72 % des points), pierres 0,33 → 0,47 · N : écart 51,8 (69 % des points), pierres 0,36 → 0,54 | **OK** |
| Contraste intérieur (Gamma) | Plus de contraste dans la pierre | ZR : écart 28,1 (54 % des points), contraste 0,207 → 0,306, pierres 0,52 → 0,41 · N : écart 14,4 (38 % des points), contraste 0,120 → 0,154, pierres 0,61 → 0,48 | **OK** |
| Gain par couleur (RGB Boost) | Pierre plus lumineuse (ou teintée) | ZR : écart 23,9 (57 % des points), lumière 0,59 → 0,69, pierres 0,39 → 0,50 · N : écart 35,0 (80 % des points), lumière 0,69 → 0,82, pierres 0,45 → 0,62 | **OK** |
| Transparence vers l'arrière (Transmission) | On voit ce qui est derrière la pierre | ZR : écart 35,3 (55 % des points), pierres 0,44 → 0,35 · N : écart 15,9 (47 % des points), pierres 0,54 → 0,38 | **OK** |
| Reflet de surface (Reflectivity) | Plus de reflet sur le dessus | ZR : écart 59,0 (45 % des points), lumière 0,46 → 0,69, pierres 0,25 → 0,51 · N : écart 18,9 (44 % des points), lumière 0,71 → 0,79, pierres 0,44 → 0,59 | **OK** |
| Rebonds de la lumière (Ray Bounces) | Plus de lumière qui ressort de la pierre | ZR : écart 35,2 (50 % des points), pierres 0,47 → 0,43 · N : écart 43,4 (70 % des points), pierres 0,42 → 0,52 | **OK** |
| Éclairage orienté (Diamond Oriented Lighting) | La lumière suit le dessus de chaque pierre | ZR : écart 0,0, pierres 0,37 → 0,37 · N : écart 0,9 (2 % des points), pierres 0,31 → 0,40 *(Mesuré le bijou incliné de 70°. N'agit que sur les pierres répétées (le pavé du N) : une pierre seule (l'émeraude de ZR0982) suit déjà son propre dessus, comme prévu par le moteur.)* | **OK** |
| Calcul | Exact ou rapide (même aspect, autre vitesse) | ZR : 3 options, 0 visibles · N : 3 options, 1 visibles (écart 1,8 à 1,8) | **OK** |
| Précision de la carte intérieure (Cube Map Size) | Calcul rapide : intérieur plus ou moins net | ZR : 4 options, 0 visibles · N : 4 options, 2 visibles (écart 1,0 à 1,2) *(Seulement les pierres en calcul rapide (le pavé du N) ; les pierres de ZR0982 sont toujours calculées exactement, et « Automatique » choisit 256 pour un grand pavé.)* | **réparé** · éditeur ✓ — la taille choisie était perdue en route (la fusion des réglages garde « auto » sous un nombre) : le moteur lit maintenant celle de la pierre (src/viewer/Stage.tsx). |
| Teinte de la matière (LUT), pierre | La pierre plus chaude, plus froide, plus vive… | ZR : 7 options, 6 visibles (écart 1,7 à 5,5) · N : 7 options, 6 visibles (écart 1,9 à 4,1) | **OK** · éditeur ✓ |
| Film irisé (Thin Film) | Reflets irisés sur la pierre | ZR : écart 5,8 (25 % des points), pierres 0,44 → 0,42 · N : écart 2,6 (3 % des points), pierres 0,54 → 0,54 | **OK** · éditeur ✓ |
| Film irisé : force | Reflets irisés plus forts | ZR : écart 12,8 (33 % des points), pierres 0,44 → 0,36 · N : écart 4,5 (10 % des points), pierres 0,54 → 0,55 | **OK** |
| Film irisé : épaisseur | Les couleurs des reflets changent | ZR : écart 17,7 (36 % des points), pierres 0,48 → 0,43 · N : écart 6,2 (16 % des points), pierres 0,58 → 0,52 | **OK** |
| Inclusions | Un nuage dans la pierre | ZR : écart 1,4 (1 % des points), pierres 0,44 → 0,44 · N : écart 1,2, pierres 0,54 → 0,53 *(Allumées à la quantité 0,6 (à 0,3, l'ancien départ, le nuage ne se voyait pas).)* | **réparé** · éditeur ✓ — allumées à 0,3, elles ne se voyaient pas : départ à 0,6. |
| Inclusions : quantité | Plus de nuage | ZR : écart 5,6 (17 % des points), pierres 0,44 → 0,43 · N : écart 7,3 (18 % des points), pierres 0,54 → 0,50 | **OK** |
| Inclusions : échelle | Taches plus grandes | ZR : écart 1,5 (1 % des points), pierres 0,44 → 0,44 · N : écart 1,8, pierres 0,54 → 0,53 | **OK** |
| Inclusions : rugosité | Taches plus floues | ZR : écart 1,2, pierres 0,44 → 0,45 · N : écart 1,2, pierres 0,53 → 0,53 | **OK** |
| Position du bijou : rotation | Le bijou tourne sur lui-même | ZR : écart 67,8 (44 % des points), pierres 0,44 → 0,33 · N : écart 54,3 (36 % des points), pierres 0,54 → 0,41 | **OK** |
| Bibliothèque de matières : pierres | La pierre prend la matière choisie | ZR : 20 options, 18 visibles (écart 2,6 à 67,4) ; à revoir : Diamant · inclusions (écart 0,1) · N : 20 options, 18 visibles (écart 2,0 à 98,2) ; à revoir : Diamant · inclusions (écart 0,1) | **à revoir** — les pierres « avec inclusions » de la bibliothèque allument un nuage à 0,3, trop faible pour se voir (src/viewer/library/materials.ts : à monter vers 0,6, comme le bouton « Inclusions »). |
| Bibliothèque de matières : métaux | Le métal prend la matière choisie | ZR : 40 options, 38 visibles (écart 2,3 à 84,1) · N : 40 options, 39 visibles (écart 0,9 à 80,2) | **OK** |
| Bibliothèque de matières : perles et autres | La partie prend la matière choisie | ZR : 12 options, 12 visibles (écart 46,2 à 112,5) · N : 12 options, 12 visibles (écart 36,2 à 109,8) | **OK** |
| Enregistrer / charger une pierre (.bgem) | Le fichier garde tous les réglages ; au chargement, seuls nos réglages, dans les bornes des curseurs | ZR : fichier enregistré au bon format ; pierre chargée : indice 2.9, luminosité 0.5, gain [1.6,1.6,1.6], rebonds 16, contraste 0.6, clé inconnue ignorée, couleur invalide ignorée | **OK** · éditeur ✓ |

## Scène

| Réglage | Effet attendu | Effet mesuré | Résultat |
| --- | --- | --- | --- |
| Fond | Ce qu'on voit derrière le bijou change | ZR : 13 options, 11 visibles (écart 3,8 à 228,2) · N : 13 options, 11 visibles (écart 2,8 à 230,2) *(« Dégradé » part des mêmes couleurs que « Studio sombre » (centre et bords se règlent ensuite).)* | **OK** |
| Fond : couleur unie | Le fond prend la couleur | ZR : écart 227,4 (100 % des points), lumière 0,00 → 0,89, pierres 0,44 → 0,44 · N : écart 228,7 (100 % des points), lumière 0,00 → 0,90, pierres 0,54 → 0,54 | **OK** |
| Fond dégradé : centre | Le centre du fond change | ZR : écart 92,6 (98 % des points), lumière 0,02 → 0,38, pierres 0,44 → 0,44 · N : écart 90,8 (98 % des points), lumière 0,01 → 0,37, pierres 0,54 → 0,54 | **OK** |
| Fond dégradé : bords | Les bords du fond changent | ZR : écart 173,5 (100 % des points), lumière 0,02 → 0,70, pierres 0,44 → 0,44 · N : écart 183,8 (100 % des points), lumière 0,01 → 0,73, pierres 0,54 → 0,54 | **OK** |
| Éclairage du métal (Environment) | Une autre lumière sur le métal (jamais noir) | ZR : 10 options, 9 visibles (écart 61,3 à 148,7) · N : 10 options, 9 visibles (écart 65,6 à 121,1) | **OK** |
| Éclairage du métal : rotation | Les reflets bougent sur le métal | ZR : écart 48,8 (73 % des points), pierres 0,44 → 0,44 · N : écart 70,3 (85 % des points), pierres 0,54 → 0,54 | **OK** |
| Éclairage du métal : intensité | Métal plus clair | ZR : écart 92,8 (100 % des points), lumière 0,48 → 0,84, pierres 0,44 → 0,44 · N : écart 102,8 (99 % des points), lumière 0,45 → 0,85, pierres 0,54 → 0,54 | **OK** |
| Éclairage des pierres (Gem Environment) | Une autre lumière dans les pierres (jamais noires) | ZR : 14 options, 12 visibles (écart 50,7 à 82,3) · N : 14 options, 12 visibles (écart 30,4 à 53,8) *(« Automatique » choisit déjà un de ces éclairages pour chaque taille de pierre : le même choisi à la main ne change rien sur ce bijou (normal).)* | **OK** |
| Éclairage des pierres : rotation | Les éclats changent de facette | ZR : écart 11,7 (22 % des points), pierres 0,44 → 0,44 · N : écart 19,8 (47 % des points), pierres 0,54 → 0,55 | **OK** |
| Éclairage des pierres : intensité | Pierres plus lumineuses | ZR : écart 67,7 (82 % des points), lumière 0,52 → 0,78, pierres 0,30 → 0,63 · N : écart 67,0 (84 % des points), lumière 0,62 → 0,89, pierres 0,37 → 0,73 | **réparé** · éditeur ✓ — le moteur ne lisait cette intensité nulle part : elle multiplie maintenant la luminosité de chaque pierre (src/viewer/Stage.tsx). |
| Éclairage fixe quand la pièce tourne (Fixed Env Direction) | Vu de côté : la lumière a suivi la caméra | ZR : écart 11,6 (15 % des points), pierres 0,26 → 0,26 · N : écart 21,5 (25 % des points), pierres 0,39 → 0,39 *(Mesuré vue de profil (de face, la caméra n'a pas tourné : aucun écart possible).)* | **OK** |
| Sol (Ground) | Rien, une ombre douce, une ombre de contact, un miroir | ZR : 4 options, 3 visibles (écart 5,1 à 83,7) · N : 4 options, 2 visibles (écart 22,8 à 82,4) | **OK** |
| Sol : taille | L'ombre (ou le sol) plus grande | ZR : écart 2,2, pierres 0,44 → 0,44 · N : écart 0,0, pierres 0,54 → 0,54 *(Le N tient debout sur une arête : son ombre de contact est presque invisible ; mesuré sous la bague ZR0982.)* | **OK** |
| Sol : hauteur sous le bijou | L'ombre s'éloigne | ZR : écart 5,1 (24 % des points), pierres 0,44 → 0,44 · N : écart 0,0, pierres 0,54 → 0,54 *(Le N tient debout sur une arête : son ombre de contact est presque invisible ; mesuré sous la bague ZR0982.)* | **OK** |
| Sol : opacité | L'ombre plus forte | ZR : écart 5,7 (27 % des points), lumière 0,86 → 0,84, pierres 0,44 → 0,44 · N : écart 0,0, lumière 0,87 → 0,87, pierres 0,54 → 0,54 *(Le N tient debout sur une arête : son ombre de contact est presque invisible ; mesuré sous la bague ZR0982.)* | **OK** · éditeur ✓ |
| Sol miroir : se fondre dans le fond (Render to Depth) | Le bord du miroir disparaît | ZR : écart 78,5 (100 % des points), pierres 0,44 → 0,44 · N : écart 69,0 (100 % des points), pierres 0,54 → 0,54 | **OK** |
| Pas de caméra sous le sol (Limit Camera) | La caméra s'arrête au niveau du sol | Un mouvement de caméra, pas une image (lu par la scène : maxPolarAngle). | **OK** |
| Ombre douce : images (Shadow Frames) | Ombre plus lisse | ZR : écart 20,6 (92 % des points), pierres 0,44 → 0,44 · N : écart 5,2 (15 % des points), pierres 0,54 → 0,54 | **OK** |
| Ombre douce : couleur | L'ombre teintée | ZR : écart 4,2, pierres 0,44 → 0,44 · N : écart 2,4, pierres 0,54 → 0,54 | **OK** |
| Ombre douce : intensité | L'ombre plus marquée | ZR : écart 62,0 (100 % des points), pierres 0,44 → 0,44 · N : écart 61,3 (100 % des points), pierres 0,54 → 0,54 | **OK** |
| Ombre douce : direction de la lumière | L'ombre part d'un autre côté | ZR : écart 18,8 (82 % des points), pierres 0,44 → 0,44 · N : écart 21,2 (88 % des points), pierres 0,54 → 0,54 | **OK** |
| Ombre douce : rayon | Ombre plus floue | ZR : écart 8,1 (13 % des points), pierres 0,44 → 0,44 · N : écart 10,3 (27 % des points), pierres 0,54 → 0,54 | **OK** |
| Ombre douce : biais (Bias) | L'ombre se décale un peu | ZR : écart 2,0, pierres 0,44 → 0,44 · N : écart 2,1 (2 % des points), pierres 0,54 → 0,54 | **OK** |
| Ombre douce : netteté (Focus) | Ombre plus franche | ZR : écart 26,0 (89 % des points), pierres 0,44 → 0,44 · N : écart 30,0 (92 % des points), pierres 0,54 → 0,54 | **OK** |
| Ombre douce : étalement (Spread) | Ombre plus douce | ZR : écart 90,1 (100 % des points), pierres 0,44 → 0,44 · N : écart 80,8 (100 % des points), pierres 0,54 → 0,54 | **OK** |
| Sol miroir : couleur | Le sol teinté | ZR : écart 41,1 (100 % des points), pierres 0,44 → 0,44 · N : écart 37,7 (100 % des points), pierres 0,54 → 0,54 | **OK** |
| Sol miroir : rugosité | Reflet plus terne | ZR : écart 14,1 (53 % des points), pierres 0,44 → 0,44 · N : écart 23,7 (94 % des points), pierres 0,54 → 0,54 | **OK** |
| Sol miroir : métal | Reflet coloré comme du métal | ZR : écart 16,6 (100 % des points), pierres 0,44 → 0,44 · N : écart 15,5 (100 % des points), pierres 0,54 → 0,54 | **OK** |
| Flou du sol miroir (Mirror Blur) | Reflet plus flou | ZR : écart 0,8 (1 % des points), pierres 0,44 → 0,44 · N : écart 0,7 (1 % des points), pierres 0,54 → 0,54 | **OK** · éditeur ✓ — vu à l'œil : le reflet de l'anneau dans le sol s'efface à 1 (comparé à l'œil) ; ce reflet n'occupe qu'un coin de l'image cadrée. |
| Lumières en plus : ajouter | Une lumière de plus sur le bijou | ZR : 4 options, 2 visibles (écart 0,9 à 0,9) · N : 4 options, 2 visibles (écart 3,3 à 3,3) *(Une lumière directionnelle ne fait qu'un petit reflet net sur un métal poli (le métal prend sa lumière de son éclairage) ; « Ambiante » est retirée.)* | **OK** |
| Lumière en plus : couleur | La lumière teinte le bijou | ZR : écart 1,0 (2 % des points), chaleur (rouge − bleu) 0,141 → 0,148, pierres 0,44 → 0,44 · N : écart 2,9 (8 % des points), chaleur (rouge − bleu) 0,119 → 0,139, pierres 0,54 → 0,54 | **OK** |
| Lumière en plus : intensité | Bijou plus éclairé | ZR : écart 2,2 (5 % des points), lumière 0,68 → 0,69, pierres 0,44 → 0,44 · N : écart 6,0 (14 % des points), lumière 0,66 → 0,69, pierres 0,54 → 0,54 | **OK** |
| Lumière en plus : position | La lumière vient d'ailleurs | ZR : écart 4,7 (8 % des points), pierres 0,44 → 0,44 · N : écart 6,3 (14 % des points), pierres 0,54 → 0,54 | **OK** |
| Spot : ouverture | Le rond de lumière plus large | ZR : écart 0,7 (1 % des points), pierres 0,44 → 0,44 · N : écart 1,3 (2 % des points), pierres 0,54 → 0,54 | **OK** |

## Rendu

| Réglage | Effet attendu | Effet mesuré | Résultat |
| --- | --- | --- | --- |
| Images de lissage à l'arrêt (rendu progressif) | Image plus lisse, arêtes sans escalier | ZR : écart 3,4 (7 % des points), pierres 0,44 → 0,44 · N : écart 10,7 (27 % des points), pierres 0,54 → 0,54 | **OK** |
| Lissage en mouvement (TAA) | Moins de scintillement quand le bijou tourne | N'agit que pendant le mouvement (aucun écart possible sur une image immobile) ; lu par la scène. | **OK** |

## Effets

| Réglage | Effet attendu | Effet mesuré | Résultat |
| --- | --- | --- | --- |
| Reflets à l'écran (SSR) : activer | Le métal reflète les pierres et les griffes | ZR : écart 3,5 (6 % des points), pierres 0,44 → 0,44 · N : écart 20,6 (27 % des points), pierres 0,54 → 0,54 | **OK** |
| SSR : intensité | Reflets plus forts | ZR : écart 6,3 (8 % des points), lumière 0,67 → 0,69, pierres 0,44 → 0,44 · N : écart 32,6 (31 % des points), lumière 0,58 → 0,71, pierres 0,54 → 0,54 | **OK** |
| SSR : gain (Boost RGB) | Reflets plus forts | ZR : écart 4,7 (8 % des points), lumière 0,67 → 0,69, pierres 0,44 → 0,44 · N : écart 23,3 (30 % des points), lumière 0,62 → 0,71, pierres 0,54 → 0,54 | **OK** |
| SSR : rayon automatique (Auto Radius) | Portée des reflets suit le bijou | ZR : écart 1,5 (4 % des points), pierres 0,44 → 0,44 · N : écart 8,6 (16 % des points), pierres 0,54 → 0,54 | **OK** |
| SSR : rayon de l'objet (Object Radius) | Reflets plus lointains | ZR : écart 6,1 (11 % des points), pierres 0,44 → 0,44 · N : écart 17,2 (24 % des points), pierres 0,54 → 0,54 | **OK** |
| SSR : puissance (Power) | Seuls les reflets francs restent | ZR : écart 4,4 (8 % des points), pierres 0,44 → 0,44 · N : écart 22,1 (32 % des points), pierres 0,54 → 0,54 | **OK** |
| SSR : tolérance | Trous des reflets bouchés | ZR : écart 4,0 (8 % des points), pierres 0,44 → 0,44 · N : écart 6,4 (14 % des points), pierres 0,54 → 0,54 | **OK** |
| SSR : pas (Step Count) | Reflets plus complets | ZR : écart 5,2 (11 % des points), pierres 0,44 → 0,44 · N : écart 14,4 (23 % des points), pierres 0,54 → 0,54 | **OK** |
| SSR : ignorer les rayons vers l'avant | Moins de faux reflets | ZR : écart 3,5 (7 % des points), pierres 0,44 → 0,44 · N : écart 3,0 (10 % des points), pierres 0,54 → 0,54 | **OK** |
| SSR : masque des rayons avant | Plus ou moins de reflets vers vous | ZR : écart 5,9 (11 % des points), pierres 0,44 → 0,44 · N : écart 7,6 (23 % des points), pierres 0,54 → 0,54 | **OK** |
| Tons (Tonemapping) : mode | Une autre façon de rendre la lumière | ZR : 7 options, 6 visibles (écart 8,7 à 43,8) · N : 7 options, 6 visibles (écart 8,5 à 54,0) | **OK** |
| Exposition (Exposure) | Toute l'image plus claire | ZR : écart 73,4 (99 % des points), lumière 0,48 → 0,76, pierres 0,30 → 0,61 · N : écart 79,4 (99 % des points), lumière 0,54 → 0,85, pierres 0,37 → 0,71 | **OK** |
| Saturation | Couleurs plus vives | ZR : écart 20,6 (59 % des points), couleur 0,000 → 0,224, pierres 0,44 → 0,44 · N : écart 13,4 (31 % des points), couleur 0,000 → 0,143, pierres 0,54 → 0,54 *(Bornée à 1,5 : à 2, toute l'image virait au rouge (fond compris).)* | **OK** · éditeur ✓ |
| Contraste (Contrast) | Plus d'écart entre sombre et clair | ZR : écart 51,4 (99 % des points), contraste 0,196 → 0,385, pierres 0,44 → 0,44 · N : écart 50,9 (97 % des points), contraste 0,140 → 0,275, pierres 0,54 → 0,54 *(Borné entre 0,85 et 1,2 : à 0,6 l'image devenait grise, à 1,4 le métal brûlait en blanc.)* | **OK** · éditeur ✓ |
| Fond transparent (Clip Background) | Le fond disparaît (transparent) | ZR : écart 8,3 (2 % des points), pierres 0,44 → 0,44 · N : écart 7,5, pierres 0,54 → 0,54 | **OK** |
| Teinte de la scène (LUT de scène) | Toute l'image plus chaude, froide, vive… | ZR : 7 options, 6 visibles (écart 5,2 à 11,5) · N : 7 options, 6 visibles (écart 5,9 à 10,5) | **OK** · éditeur ✓ |
| Teinte de la scène : force | La teinte plus marquée | ZR : écart 6,8 (1 % des points), couleur 0,114 → 0,142, pierres 0,44 → 0,44 · N : écart 6,4 (1 % des points), couleur 0,074 → 0,094, pierres 0,54 → 0,54 | **réparé** · éditeur ✓ — la force ne changeait rien : la teinte remplaçait l'image au lieu de s'y mélanger (src/viewer/Stage.tsx, mélange « normal »). |
| Lueur (Bloom) : activer | Une lueur autour des éclats | ZR : écart 1,9 (3 % des points), pierres 0,44 → 0,44 · N : écart 3,4 (7 % des points), pierres 0,54 → 0,54 *(Mesuré avec seuil 1,2 et intensité 0,6 (la lueur par défaut est volontairement très discrète).)* | **OK** |
| Lueur : seuil (Threshold) | Moins d'éclats rayonnent | ZR : écart 3,2 (6 % des points), pierres 0,44 → 0,44 · N : écart 2,6 (4 % des points), pierres 0,54 → 0,54 | **OK** |
| Lueur : seuil doux (Soft Threshold) | Passage plus progressif (visible sur la grosse pierre de ZR0982, à peine sur le pavé du N) | ZR : écart 1,9 (4 % des points), pierres 0,44 → 0,44 · N : écart 0,6, pierres 0,54 → 0,54 | **OK** |
| Lueur : intensité | Lueur plus forte | ZR : écart 3,7 (7 % des points), halo autour du bijou 0,028 → 0,030, pierres 0,44 → 0,44 · N : écart 6,1 (13 % des points), halo autour du bijou 0,034 → 0,037, pierres 0,54 → 0,54 | **OK** |
| Lueur : rayon | Lueur plus large | ZR : écart 4,6 (12 % des points), halo autour du bijou 0,028 → 0,040, pierres 0,44 → 0,44 · N : écart 6,5 (15 % des points), halo autour du bijou 0,034 → 0,072, pierres 0,54 → 0,54 | **OK** |
| Lueur : puissance (Power) | La lueur reste sur les éclats forts | ZR : écart 28,0 (49 % des points), pierres 0,44 → 0,44 · N : écart 33,9 (80 % des points), pierres 0,54 → 0,54 | **réparé** · éditeur ✓ — la puissance n'arrivait jamais à l'écran : la lueur recevait son nouveau calcul sans être refaite (src/viewer/screen.ts) ; et dans l'éditeur elle se perdait dès qu'un autre réglage de la lueur bougeait (src/viewer/Stage.tsx). |
| Lueur : itérations | 0 : éteinte ; plus : plus large | ZR : écart 1,9 (3 % des points), pierres 0,44 → 0,44 · N : écart 3,3 (7 % des points), pierres 0,54 → 0,54 | **OK** |
| Lueur : mode contrôle (Debug) | Ne montre que ce qui rayonne | ZR : écart 147,0 (94 % des points), pierres 0,44 → 0,44 · N : écart 171,0 (96 % des points), pierres 0,54 → 0,54 | **OK** |
| Biseau à l'écran (SSBevel) : activer | Arêtes arrondies | ZR : écart 0,1, pierres 0,44 → 0,44 · N : écart 0,0, pierres 0,54 → 0,54 | **retiré** — l'arrondi fait la moyenne des normales du fichier, déjà lisses : rien ne changeait sur les deux bijoux (écart 0,0 à 0,5). Il faudrait le recalculer à partir de la profondeur, comme iJewel : signalé pour le moteur. |
| Biseau : rayon (scène) | Arrondi plus large | ZR : écart 0,1, pierres 0,44 → 0,44 · N : écart 0,4, pierres 0,54 → 0,54 | **retiré** — même raison (et le curseur « Rayon » du biseau dans « Réglages avancés », à gauche). |
| Biseau : intensité | Arrondi plus marqué | ZR : écart 0,0, pierres 0,44 → 0,44 · N : écart 0,0, pierres 0,54 → 0,54 | **retiré** — même raison (et le curseur « Intensité » du biseau dans « Réglages avancés »). |
| Ombres dans les creux (AO) : activer | Creux plus sombres | ZR : écart 1,9 (4 % des points), lumière 0,63 → 0,62, pierres 0,44 → 0,44 · N : écart 10,8 (34 % des points), lumière 0,75 → 0,71, pierres 0,54 → 0,54 | **OK** |
| AO : intensité | Creux plus sombres | ZR : écart 5,5 (10 % des points), lumière 0,63 → 0,61, pierres 0,44 → 0,44 · N : écart 35,2 (77 % des points), lumière 0,75 → 0,61, pierres 0,54 → 0,54 | **OK** |
| AO : rayon | Creux assombris plus larges | ZR : écart 4,1 (9 % des points), lumière 0,62 → 0,61, pierres 0,44 → 0,44 · N : écart 12,6 (34 % des points), lumière 0,75 → 0,70, pierres 0,54 → 0,54 | **OK** |
| Profondeur de champ : activer | Une partie floue | ZR : écart 46,1 (56 % des points), netteté −91 %, pierres 0,44 → 0,44 · N : écart 30,3 (55 % des points), netteté −82 %, pierres 0,54 → 0,54 *(Mesuré avec une zone nette fine (0,1) et un flou de 1,2.)* | **OK** |
| Profondeur de champ : flou maximal | Plus de flou hors de la zone nette | ZR : écart 47,8 (61 % des points), netteté −87 %, pierres 0,44 → 0,44 · N : écart 28,8 (57 % des points), netteté −78 %, pierres 0,54 → 0,54 | **OK** |
| Profondeur de la zone nette (Aperture) | Plus de bijou net | ZR : écart 12,1 (23 % des points), netteté +132 %, pierres 0,44 → 0,44 · N : écart 18,8 (46 % des points), netteté +229 %, pierres 0,54 → 0,54 | **OK** |
| Vignette : activer | Coins plus sombres | ZR : écart 7,9 (24 % des points), lumière 0,81 → 0,78, pierres 0,44 → 0,44 · N : écart 8,0 (25 % des points), lumière 0,83 → 0,80, pierres 0,54 → 0,54 *(Mesurée sur le fond « Studio clair » (sur un fond sombre, les coins sont déjà presque noirs).)* | **OK** |
| Vignette : distance | L'assombrissement entre plus ou moins | ZR : écart 64,2 (76 % des points), pierres 0,44 → 0,44 · N : écart 65,1 (79 % des points), pierres 0,54 → 0,54 | **OK** |
| Vignette : obscurité | Coins plus sombres | ZR : écart 72,4 (71 % des points), lumière 0,81 → 0,52, pierres 0,44 → 0,44 · N : écart 73,6 (73 % des points), lumière 0,83 → 0,54, pierres 0,54 → 0,54 | **OK** |
| Aberration chromatique : activer | Liseré coloré sur les bords | ZR : écart 16,3 (39 % des points), pierres 0,44 → 0,44 · N : écart 19,4 (56 % des points), pierres 0,54 → 0,54 | **OK** |
| Aberration chromatique : décalage | Liseré plus large | ZR : écart 19,7 (46 % des points), pierres 0,44 → 0,44 · N : écart 21,4 (61 % des points), pierres 0,54 → 0,54 | **OK** |
| Grain : activer | Grain de film | ZR : écart 1,5, pierres 0,44 → 0,44 · N : écart 2,0, pierres 0,54 → 0,54 *(Mesuré sur le bijou et un fond clair : le grain suit la lumière (presque rien dans le noir).)* | **OK** |
| Grain : intensité | Grain plus fort | ZR : écart 2,7, pierres 0,44 → 0,44 · N : écart 3,5, pierres 0,54 → 0,54 | **OK** |
| Mise au point par clic | L'endroit cliqué devient net | ZR : pierre nette +512 % quand on la vise, bas de l'anneau +224 % quand on le vise · N : pierre nette +86 % quand on la vise, bas de l'anneau +77 % quand on le vise | **OK** |

## Vues de caméra

| Réglage | Effet attendu | Effet mesuré | Résultat |
| --- | --- | --- | --- |
| Durée d'une vue à l'autre (Duration) | Le parcours de la caméra entre les vues | Un mouvement de caméra, pas une image (lu par le parcours des vues, src/viewer/cameraPath.ts). | **OK** |
| Mouvement (Ease) | Le parcours de la caméra entre les vues | Un mouvement de caméra, pas une image (lu par le parcours des vues, src/viewer/cameraPath.ts). | **OK** |
| Trajet (Interpolation) | Le parcours de la caméra entre les vues | Un mouvement de caméra, pas une image (lu par le parcours des vues, src/viewer/cameraPath.ts). | **OK** |
| Pause à chaque vue (View Pause Time) | Le parcours de la caméra entre les vues | Un mouvement de caméra, pas une image (lu par le parcours des vues, src/viewer/cameraPath.ts). | **OK** |
| Boucler toutes les vues (Loop All Views) | Le parcours de la caméra entre les vues | Un mouvement de caméra, pas une image (lu par le parcours des vues, src/viewer/cameraPath.ts). | **OK** |
| La caméra suit le défilement (Seek on Scroll) | Sur la page de la pièce, la caméra suit le défilement | Agit sur la page de la pièce (lu par src/components/Piece3D.tsx). | **OK** |

## Configurateur

| Réglage | Effet attendu | Effet mesuré | Résultat |
| --- | --- | --- | --- |
| Parties et matières proposées | Les pastilles du client | Le contenu des pastilles du client (lu par son visualiseur ; testé par tests/editor3d.spec.ts). | **OK** |

## À gauche

| Réglage | Effet attendu | Effet mesuré | Résultat |
| --- | --- | --- | --- |
| Ambiances (images) | Toute une scène d'un clic (métal jamais noir, pierres lisibles) | ZR : 7 options, 6 visibles (écart 70,1 à 125,3) · N : 7 options, 6 visibles (écart 54,4 à 74,0) | **OK** |
| Socle | Le bijou posé sur un socle | ZR : 6 options, 5 visibles (écart 55,3 à 88,0) · N : 6 options, 5 visibles (écart 65,9 à 83,4) | **OK** |
| Pose (Compute Stable Pose) | Le bijou posé à plat, debout, en angle | ZR : 4 options, 3 visibles (écart 45,8 à 58,1) · N : 4 options, 3 visibles (écart 41,6 à 60,6) *(« Telle que le fichier » ne tourne pas le bijou ; « Debout » ou « En angle » peuvent tomber sur la position du fichier quand il est déjà posé ainsi.)* | **OK** |
| Éclairage du métal : intensité (à gauche) | Métal plus clair (le même réglage que l'onglet Scène) | ZR : écart 91,5 (100 % des points), lumière 0,48 → 0,84, pierres 0,44 → 0,44 · N : écart 102,1 (99 % des points), lumière 0,45 → 0,85, pierres 0,54 → 0,54 | **OK** · éditeur ✓ |
| Éclairage des pierres : intensité (à gauche) | Pierres plus lumineuses (le même réglage que l'onglet Scène) | ZR : écart 67,1 (81 % des points), lumière 0,51 → 0,78, pierres 0,30 → 0,63 · N : écart 67,2 (84 % des points), lumière 0,62 → 0,88, pierres 0,37 → 0,73 | **réparé** · éditeur ✓ — même réparation (le curseur « Intensité » de l'éclairage des pierres, à gauche). |

## Mode simple

| Réglage | Effet attendu | Effet mesuré | Résultat |
| --- | --- | --- | --- |
| 1. Ambiance | Toute une scène (métal jamais noir, pierres lisibles) | ZR : 6 options, 5 visibles (écart 2,3 à 108,7) · N : 6 options, 5 visibles (écart 1,5 à 60,2) | **OK** · éditeur ✓ |
| 2. Métal | Le métal de toutes les parties | ZR : 5 options, 4 visibles (écart 2,3 à 73,2) · N : 5 options, 4 visibles (écart 2,6 à 67,2) | **OK** · éditeur ✓ |
| 3. Pierres | La couleur de toutes les pierres | ZR : 8 options, 7 visibles (écart 17,3 à 66,6) · N : 8 options, 7 visibles (écart 23,7 à 98,2) | **OK** · éditeur ✓ |
| 4. Vue | La caméra de face, de profil, de 3/4, de dessus | ZR : 4 options, 3 visibles (écart 40,9 à 57,3) · N : 4 options, 3 visibles (écart 28,9 à 49,4) | **OK** |

## Pierres aux extrêmes

Tous les curseurs des pierres poussés ensemble vers le plus sombre (luminosité 0,5, contraste 1,6, gain 0,6, indice 1,5, 1 rebond, sans reflet, transparence 0,6, intensité de l'éclairage des pierres 0,5, exposition 0,5) puis vers le plus clair (luminosité 3, contraste 0,6, gain 1,6, indice 2,9, 16 rebonds, reflet 1, feu 0,03, intensité 2,5, exposition 2,2), sous chacun des éclairages des pierres.

La garde commune du moteur (src/viewer/gems.ts, 27/11/2026) garde la lumière d'une pierre (intensité × gain) entre 0,7 et 2,8, adoucit le contraste intérieur à ces bouts, ajoute un fond de lumière douce et limite l'exposition vue par les pierres entre 0,75 et 1,6.

**Résultat** : Pierres poussées toutes ensemble au même bout (garde commune du moteur) — côté clair : 26 images lisibles sur 28 ; encore trop blanches : ZR Contre-jour ; N Ancien rendu ; côté sombre : 27 images lisibles sur 28 ; encore trop sombres : ZR Spot.

| Bijou | Combinaison | Éclairage | Pierres : moyenne (noir, blanc plat) | Lisible |
| --- | --- | --- | --- | --- |
| ZR | sombre | Automatique | 0,40 (0 %, 0 %) ; 0,37 (0 %, 0 %) | oui |
| ZR | sombre | Studio | 0,31 (7 %, 0 %) ; 0,26 (22 %, 0 %) | oui |
| ZR | sombre | Tente blanche | 0,38 (0 %, 0 %) ; 0,34 (0 %, 0 %) | oui |
| ZR | sombre | Boîtes studio | 0,38 (0 %, 0 %) ; 0,43 (0 %, 0 %) | oui |
| ZR | sombre | Bandes en escalier | 0,40 (0 %, 0 %) ; 0,37 (0 %, 0 %) | oui |
| ZR | sombre | Bandes | 0,34 (0 %, 0 %) ; 0,39 (0 %, 0 %) | oui |
| ZR | sombre | Points | 0,33 (0 %, 2 %) ; 0,42 (0 %, 0 %) | oui |
| ZR | sombre | Anneau | 0,22 (0 %, 0 %) ; 0,30 (0 %, 0 %) | oui |
| ZR | sombre | Spot | 0,11 (0 %, 0 %) ; 0,14 (0 %, 0 %) | **non** |
| ZR | sombre | Vitrine | 0,39 (0 %, 0 %) ; 0,14 (0 %, 0 %) | oui |
| ZR | sombre | Contre-jour | 0,30 (0 %, 0 %) ; 0,19 (0 %, 0 %) | oui |
| ZR | sombre | Croix | 0,14 (0 %, 0 %) ; 0,14 (0 %, 0 %) | oui |
| ZR | sombre | Ciel étoilé | 0,43 (0 %, 0 %) ; 0,42 (0 %, 0 %) | oui |
| ZR | sombre | Ancien rendu | 0,51 (0 %, 0 %) ; 0,46 (0 %, 0 %) | oui |
| ZR | clair | Automatique | 0,65 (0 %, 7 %) ; 0,69 (0 %, 8 %) | oui |
| ZR | clair | Studio | 0,50 (0 %, 20 %) ; 0,48 (0 %, 24 %) | oui |
| ZR | clair | Tente blanche | 0,73 (0 %, 0 %) ; 0,75 (0 %, 1 %) | oui |
| ZR | clair | Boîtes studio | 0,66 (0 %, 12 %) ; 0,69 (0 %, 20 %) | oui |
| ZR | clair | Bandes en escalier | 0,65 (0 %, 7 %) ; 0,69 (0 %, 8 %) | oui |
| ZR | clair | Bandes | 0,53 (0 %, 2 %) ; 0,65 (0 %, 14 %) | oui |
| ZR | clair | Points | 0,54 (0 %, 3 %) ; 0,63 (0 %, 6 %) | oui |
| ZR | clair | Anneau | 0,56 (0 %, 6 %) ; 0,70 (0 %, 14 %) | oui |
| ZR | clair | Spot | 0,53 (0 %, 0 %) ; 0,61 (0 %, 0 %) | oui |
| ZR | clair | Vitrine | 0,57 (0 %, 3 %) ; 0,64 (0 %, 5 %) | oui |
| ZR | clair | Contre-jour | 0,64 (0 %, 24 %) ; 0,83 (0 %, 55 %) | **non** |
| ZR | clair | Croix | 0,53 (0 %, 5 %) ; 0,62 (0 %, 9 %) | oui |
| ZR | clair | Ciel étoilé | 0,64 (0 %, 7 %) ; 0,65 (0 %, 5 %) | oui |
| ZR | clair | Ancien rendu | 0,79 (0 %, 39 %) ; 0,78 (0 %, 45 %) | oui |
| N | sombre | Automatique | 0,38 (2 %, 0 %) ; 0,40 (0 %, 0 %) | oui |
| N | sombre | Studio | 0,28 (21 %, 0 %) ; 0,34 (4 %, 0 %) | oui |
| N | sombre | Tente blanche | 0,38 (2 %, 0 %) ; 0,40 (0 %, 0 %) | oui |
| N | sombre | Boîtes studio | 0,34 (16 %, 0 %) ; 0,26 (27 %, 0 %) | oui |
| N | sombre | Bandes en escalier | 0,31 (3 %, 0 %) ; 0,32 (1 %, 0 %) | oui |
| N | sombre | Bandes | 0,36 (0 %, 0 %) ; 0,31 (0 %, 0 %) | oui |
| N | sombre | Points | 0,34 (0 %, 0 %) ; 0,33 (0 %, 0 %) | oui |
| N | sombre | Anneau | 0,40 (1 %, 0 %) ; 0,41 (0 %, 0 %) | oui |
| N | sombre | Spot | 0,27 (1 %, 0 %) ; 0,25 (0 %, 0 %) | oui |
| N | sombre | Vitrine | 0,33 (1 %, 0 %) ; 0,36 (0 %, 0 %) | oui |
| N | sombre | Contre-jour | 0,30 (1 %, 0 %) ; 0,26 (0 %, 0 %) | oui |
| N | sombre | Croix | 0,28 (1 %, 0 %) ; 0,25 (0 %, 0 %) | oui |
| N | sombre | Ciel étoilé | 0,41 (0 %, 0 %) ; 0,41 (0 %, 0 %) | oui |
| N | sombre | Ancien rendu | 0,42 (0 %, 0 %) ; 0,42 (0 %, 0 %) | oui |
| N | clair | Automatique | 0,75 (0 %, 1 %) ; 0,75 (0 %, 2 %) | oui |
| N | clair | Studio | 0,62 (0 %, 34 %) ; 0,69 (0 %, 36 %) | oui |
| N | clair | Tente blanche | 0,75 (0 %, 1 %) ; 0,75 (0 %, 2 %) | oui |
| N | clair | Boîtes studio | 0,80 (0 %, 36 %) ; 0,77 (0 %, 33 %) | oui |
| N | clair | Bandes en escalier | 0,72 (0 %, 18 %) ; 0,72 (0 %, 18 %) | oui |
| N | clair | Bandes | 0,74 (0 %, 21 %) ; 0,74 (0 %, 20 %) | oui |
| N | clair | Points | 0,73 (0 %, 10 %) ; 0,73 (0 %, 8 %) | oui |
| N | clair | Anneau | 0,73 (0 %, 19 %) ; 0,75 (0 %, 24 %) | oui |
| N | clair | Spot | 0,69 (0 %, 1 %) ; 0,69 (0 %, 1 %) | oui |
| N | clair | Vitrine | 0,73 (0 %, 7 %) ; 0,73 (0 %, 8 %) | oui |
| N | clair | Contre-jour | 0,72 (0 %, 17 %) ; 0,70 (0 %, 13 %) | oui |
| N | clair | Croix | 0,70 (0 %, 14 %) ; 0,70 (0 %, 12 %) | oui |
| N | clair | Ciel étoilé | 0,74 (0 %, 6 %) ; 0,74 (0 %, 7 %) | oui |
| N | clair | Ancien rendu | 0,90 (0 %, 58 %) ; 0,92 (0 %, 65 %) | **non** |

## Valeurs signalées par la mesure (pierres ou métal hors limites)

- env-rotation-xyz = [90,0,0] (ZR) : pierres « stone_fancy_4.2x6.0mm » moyenne 0,33, noir 41 %, blanc 1 %
- library-gems = gem/sapphire-blue (ZR) : pierres « stone_fancy_4.2x6.0mm » moyenne 0,19, noir 43 %, blanc 0 %
- library-gems = gem/sapphire-blue/inclusions (ZR) : pierres « stone_fancy_4.2x6.0mm » moyenne 0,19, noir 42 %, blanc 0 %
- library-gems = gem/emerald (ZR) : pierres « stone_fancy_8.1x12mm » moyenne 0,24, noir 40 %, blanc 0 %
- library-gems = gem/emerald/inclusions (ZR) : pierres « stone_fancy_8.1x12mm » moyenne 0,24, noir 40 %, blanc 0 %
- library-gems = gem/sapphire-blue (N) : pierres « 组名3 » moyenne 0,11, noir 34 %, blanc 1 %
- library-gems = gem/sapphire-blue/inclusions (N) : pierres « 组名3 » moyenne 0,11, noir 34 %, blanc 1 %
- fixed-env = false (ZR) : pierres « stone_fancy_8.1x12mm » moyenne 0,26, noir 49 %, blanc 0 %
- fixed-env = false (ZR) : métal moyenne 0,12, blanc 2 %
- fixed-env = true (ZR) : pierres « stone_fancy_8.1x12mm » moyenne 0,26, noir 49 %, blanc 0 %
- presets = studio-berete (ZR) : pierres « stone_fancy_8.1x12mm » moyenne 0,35, noir 45 %, blanc 6 %
- presets = vitrine (ZR) : métal moyenne 0,10, blanc 2 %
- simple-stone = gem/sapphire-blue (ZR) : pierres « stone_fancy_4.2x6.0mm » moyenne 0,19, noir 43 %, blanc 0 %
- simple-stone = gem/emerald (ZR) : pierres « stone_fancy_8.1x12mm » moyenne 0,24, noir 40 %, blanc 0 %
- simple-stone = gem/sapphire-blue (N) : pierres « 组名3 » moyenne 0,11, noir 34 %, blanc 1 %
- brush-angle = 0 (ZR) : métal moyenne 0,96, blanc 81 %
- brush-angle = 0 (N) : métal moyenne 0,95, blanc 54 %
- gem-env = gem-studio (ZR) : pierres « stone_fancy_8.1x12mm » moyenne 0,35, noir 45 %, blanc 6 %
- gem-env = gem-classic (N) : pierres « 图层09 » moyenne 0,86, noir 3 %, blanc 59 %
- gem-env = gem-classic (N) : pierres « 组名3 » moyenne 0,91, noir 1 %, blanc 60 %
- env-metal = three-point (ZR) : métal moyenne 0,10, blanc 2 %
- env-gem = gem-studio (ZR) : pierres « stone_fancy_8.1x12mm » moyenne 0,35, noir 45 %, blanc 6 %
- env-gem = gem-classic (N) : pierres « 图层09 » moyenne 0,86, noir 3 %, blanc 59 %
- env-gem = gem-classic (N) : pierres « 组名3 » moyenne 0,91, noir 1 %, blanc 60 %
- contrast = 1.2 (ZR) : métal moyenne 0,72, blanc 50 %
- bloom-debug = true (ZR) : métal moyenne 0,04, blanc 0 %
- bloom-debug = true (N) : métal moyenne 0,04, blanc 0 %

## Retirés, et pourquoi

- **Éclairage du métal « Studio sombre » (onglet Scène et images à gauche)** : le métal devenait noir sur les deux bijoux (moyenne 0,02 sur ZR0982, 0,10 sur le N). Il reste affiché pour un modèle qui l'utilise déjà, et dans l'ambiance « Noir profond », où un spot éclaire le métal.
- **Finition « Brossé » (et les métaux brossés de la bibliothèque)** : le métal devenait presque blanc et plat (81 à 88 % de blanc sur ZR0982, 54 à 76 % sur le N). Cause : l'anisotropie 0,8 de la matière brossée (src/viewer/library/materials.ts) sous le studio clair ; à corriger dans le moteur, puis à remettre. Un modèle déjà brossé la garde, avec son « Sens du brossage ».
- **Biseau à l'écran (SSBevel) : activer** : l'arrondi fait la moyenne des normales du fichier, déjà lisses : rien ne changeait sur les deux bijoux (écart 0,0 à 0,5). Il faudrait le recalculer à partir de la profondeur, comme iJewel : signalé pour le moteur.
- **Biseau : rayon (scène)** : même raison (et le curseur « Rayon » du biseau dans « Réglages avancés », à gauche).
- **Biseau : intensité** : même raison (et le curseur « Intensité » du biseau dans « Réglages avancés »).
- **Biseau à l'écran, par matière (onglet Parties)** : même raison.
- **Lumière en plus « Ambiante »** : elle n'éclaire que les matières mates (émail, perles, socles) : le métal et les pierres, qui prennent leur lumière de leurs éclairages, ne changeaient pas (écart 0,0 sur les deux bijoux).
