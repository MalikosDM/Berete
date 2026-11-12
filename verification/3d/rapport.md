# Visualiseur 3D : rapport de vérification

Généré par `npm run verify:3d` le 12/11/2026 20:33:10, sur http://localhost:3001. Machine : Apple M4, rendu par le GPU (Chromium, ANGLE Metal).

Images par seconde : moyenne sur 4 s de rotation automatique. Ordinateur : 1440 × 900, version « full ». iPhone : écran de 390 px émulé, version « light », processeur ralenti 4 fois (le GPU reste celui du Mac, la fluidité sur un vrai iPhone est à confirmer sur l'appareil).

## Poids et traitement

| Fichier | Original | Full (ordinateur) | Light (téléphone) | Triangles affichés full / light | Traitement |
|---|---|---|---|---|---|
| ZN1242-bj001.glb | 37,5 Mo | 8,7 Mo | 2,4 Mo | 2 586 390 / 1 032 926 | 15,1 s (+ envoi 1,5 s) |
| ZN1059-BJ001(2).stl | 393,5 Mo | 2,0 Mo | 1,0 Mo | 722 194 / 436 712 | 21,7 s (+ envoi 1,2 s) |
| zp1864-BJ001.stl | 278,3 Mo | 1,8 Mo | 0,7 Mo | 231 923 / 106 679 | 17,9 s (+ envoi 0,6 s) |
| 0542.stl | 104,9 Mo | 5,3 Mo | 2,5 Mo | 481 380 / 210 129 | 13,4 s (+ envoi 0,3 s) |
| ZR0982-BJ001.stl | 20,5 Mo | 0,5 Mo | 0,4 Mo | 130 603 / 125 947 | 2,1 s (+ envoi 0,1 s) |

## Pierres détectées

| Fichier | Trouvé par le pipeline | Analyse de départ |
|---|---|---|
| ZN1242-bj001.glb | 图层01 : 133 exemplaire(s), rôle deviné metal ; 图层04 : 1 exemplaire(s), rôle deviné metal (à vérifier) ; 图层05 : 3 exemplaire(s), rôle deviné metal ; 图层09 : 3601 exemplaire(s), rôle deviné diamond ; 图层10 : 199 exemplaire(s), rôle deviné diamond | 3601 diamants (图层09), 2 × 199 autres pierres (图层10), maillons or rose (图层05), fleurs or blanc (图层01), 图层04 inconnu |
| ZN1059-BJ001(2).stl | 1078 × round 0.8mm ; 168 × fancy 1.5x2.0mm ; 152 × round 1.9mm ; 144 × round 2.2mm ; 108 × round 2.3mm ; 104 × round 1.0mm ; 52 × round 0.9mm ; 42 × fancy 1.5x3.5mm ; 36 × round 2.4mm ; 36 × round 4.5mm ; 18 × round 3.1mm ; 14 × fancy 1.5x2.5mm ; 9 × fancy 1.5x3.0mm | 1026 rondes 0,8 mm ; 152 rondes 1,9 mm ; plusieurs centaines de taille fantaisie (40 triangles) ; 144 griffes et 38 maillons en métal |
| zp1864-BJ001.stl | 40 × round 1.0mm ; 32 × fancy 0.3x0.5mm (à vérifier) ; 28 × fancy 0.2x0.4mm (à vérifier) ; 20 × fancy 0.3x0.6mm (à vérifier) ; 12 × fancy 0.4x0.8mm ; 8 × fancy 0.8x1.5mm ; 8 × fancy 0.6x1.1mm ; 8 × fancy 0.4x0.6mm ; 8 × fancy 0.5x0.9mm ; 4 × round 0.7mm ; 4 × fancy 0.5x0.8mm | 40 rondes 1,0 mm + quelques petits groupes répétés |
| 0542.stl | 130 × round 1.0mm (soudées, reconstituées) ; 101 × round 1.5mm (soudées, reconstituées) ; 78 × fancy 1.0mm (soudées, reconstituées) ; 40 × fancy 1.5mm (soudées, reconstituées) ; 29 × fancy 3.0mm (soudées, reconstituées) ; 26 × fancy 2.5mm (soudées, reconstituées) ; 19 × round 2.0mm (soudées, reconstituées) ; 16 × fancy 0.5mm (soudées, reconstituées) ; 12 × fancy 2.0mm (soudées, reconstituées) ; 7 × fancy 3.5mm (soudées, reconstituées) ; 5 × round 1.0mm ; 2 × round 0.9mm | un grand bloc où les pierres sont soudées au métal (seul leur dessus reste : table et facettes) : plusieurs centaines de brillants, des tailles émeraude, des pentagones, 2 losanges ; à part, 7 petites pierres rondes d'environ 1 mm, chacune dessinée autrement (plus de 1000 triangles) ; les cônes de la bande « DFB-POKAL » et les carrés du bord de la tête sont du métal ou des sertis vides |
| ZR0982-BJ001.stl | 2 × fancy 4.2x6.0mm ; 1 × fancy 8.1x12mm | 1 émeraude centrale 12,5 × 8,1 mm dessinée avec 108 481 triangles, et 2 baguettes effilées de côté (40 triangles, pavillon aux facettes tordues) |

## Chargement et fluidité

Chargement : du clic sur le lien au bijou affiché, serveur local ; « 4G » : la même page sur l'iPhone émulé avec une connexion de 10 Mbit/s, sans cache. Les images par seconde plafonnent à 60 (la fréquence de l'écran).

| Fichier | Ordinateur : chargement / images par s | iPhone émulé : chargement (4G) / images par s | Zoom sur une pierre : centre de la vue → pierre | Recentrage tout seul (2,5 s après) |
|---|---|---|---|---|
| ZN1242-bj001.glb | 0,9 s / 44 | 1,3 s (4,8 s) / 60 | 1,91 mm (la pierre est à 89,5 mm du centre du bijou ; caméra à 24,4 mm) | 0,000 mm |
| ZN1059-BJ001(2).stl | 0,9 s / 59 | 1,3 s (3,5 s) / 60 | 0,32 mm (la pierre est à 249,4 mm du centre du bijou ; caméra à 9,2 mm) | 0,000 mm |
| zp1864-BJ001.stl | 0,9 s / 52 | 1,5 s (4,0 s) / 60 | 0,47 mm (la pierre est à 10,3 mm du centre du bijou ; caméra à 4,7 mm) | 0,000 mm |
| 0542.stl | 1,4 s / 30 | 2,4 s (6,7 s) / 57 | 0,70 mm (la pierre est à 19,3 mm du centre du bijou ; caméra à 6,5 mm) | 0,000 mm |
| ZR0982-BJ001.stl | 1,5 s / 36 | 1,9 s (3,5 s) / 51 | 1,46 mm (la pierre est à 10,0 mm du centre du bijou ; caméra à 9,2 mm) | 0,000 mm |

## Contrôles

- OK — Import .3dm (fichier Rhino fabriqué pour le test) : calques « Metal 18K » → metal, « Diamonds » → diamond, 21 morceaux lus (la pièce de métal et 20 pierres : un bloc posé 12 fois et 8 copies tournées)
- OK — Pierres en miroir du fichier de test (665 + 55) : 0 copie(s) encore à l'envers, 3601 diamants (图层09) et 199 grosses pierres (图层10) sur 3601 et 199
- OK — Pierres seules ou très finement dessinées reconnues à leur forme : ZR0982 3 (l'émeraude centrale et 2 baguettes : 3 attendues), 0542 7 (7 petites pierres séparées attendues)
- OK — Pierres soudées au métal retrouvées et reconstituées : 0542 458 (plus de 400 attendues) ; aucune dans les autres fichiers (ZN1059-BJ001(2).stl 0, zp1864-BJ001.stl 0, ZR0982-BJ001.stl 0)
- OK — Modèle de démonstration (fait avant la correction) : 720 pierres en miroir redessinées à l'endroit par le visualiseur (665 + 55 attendues)
- OK — Lien expiré : page « Ce lien a expiré »
- OK — Lien inexistant : page « Ce lien n'existe pas »
- OK — Mot de passe faux refusé
- OK — Bon mot de passe : la pièce s'affiche
- OK — Bouton WhatsApp « I love it » avec le métal : Hello Berete Jewellers, I love the piece "Test" in 18k white gold (Flowers), 18k rose gold (BRT logo) and 18k rose gold (Links). http://localhost:3001/view/piTk
- OK — Lien privé jamais indexé : meta robots « noindex,nofollow », en-tête « noindex, nofollow »
- OK — Bouton « See it in 3D » en haut de la page de la pièce : il amène au visualiseur (haut à 96 px)
- OK — Page de la pièce /pieces/michy-batshuayi-butterfly-chain : section « Explore in 3D », WhatsApp « Hello Berete Jewellers, I want the piece "Michy Batshuayi — Butterfly Chain" in 18k yellow gold (Flowers), 18k rose gold (BRT logo) and 18k rose gold (Links). Can we talk »
- OK — Molette sur le bijou : il se rapproche, la page ne défile pas (0 px)
- OK — Fichier de la 3D introuvable une fois (nouvelle version du site) : la page se recharge seule et la 3D s'affiche
- OK — Fichier de la 3D toujours introuvable : message « The 3D model could not be loaded. » à sa place, le reste de la page reste affiché
- OK — Vignette de la pièce dans les créations : repère « 3D »
- OK — Calques du fichier de test reconnus par leur nom : 图层01 white-gold, 图层05 rose-gold, 图层09 diamond
- OK — Zoom sur un détail : la vue reste sur le détail, jamais de recentrage sur le bijou
- OK — Pincement du pavé tactile : la caméra se rapproche (431,1 → 161,0 mm ; 915,5 → 341,9 mm ; 80,9 → 30,2 mm ; 95,2 → 35,6 mm ; 64,0 → 23,9 mm), l'image n'est jamais agrandie (flou)
- OK — Erreurs dans la console (toutes les pages ouvertes) : 0

## Captures

- `admin-*.jpg` : l'envoi du fichier de test dans l'admin, la liste, les réglages des calques, un calque vu seul.
- `desktop/` et `iphone/` : pour chaque modèle, `-0-page` (la page du lien privé), `-1-vue-par-defaut`, `-1b-pincement` (pincement du pavé tactile, ordinateur), `-2-zoom` (double-clic puis molette, ou double-tap), `-3-lumiere-*` (bracelet de test), `-4-metal-*`.
- `lien-expire.jpg`, `lien-mot-de-passe.jpg`, `page-piece-explore-in-3d.jpg`.
