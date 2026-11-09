# Visualiseur 3D : rapport de vérification

Généré par `npm run verify:3d` le 09/11/2026 20:24:47, sur http://localhost:3001. Machine : Apple M4, rendu par le GPU (Chromium, ANGLE Metal).

Images par seconde : moyenne sur 4 s de rotation automatique. Ordinateur : 1440 × 900, version « full ». iPhone : écran de 390 px émulé, version « light », processeur ralenti 4 fois (le GPU reste celui du Mac, la fluidité sur un vrai iPhone est à confirmer sur l'appareil).

## Poids et traitement

| Fichier | Original | Full (ordinateur) | Light (téléphone) | Triangles affichés full / light | Traitement |
|---|---|---|---|---|---|
| ZN1242-bj001.glb | 37,5 Mo | 8,7 Mo | 2,3 Mo | 2 578 145 / 1 020 971 | 8,2 s (+ envoi 1,2 s) |
| ZN1059-BJ001(2).stl | 393,5 Mo | 1,9 Mo | 0,9 Mo | 712 251 / 424 651 | 4,9 s (+ envoi 0,7 s) |
| zp1864-BJ001.stl | 278,3 Mo | 1,7 Mo | 0,6 Mo | 229 732 / 104 386 | 5,1 s (+ envoi 0,5 s) |
| 0542.stl | 104,9 Mo | 4,0 Mo | 1,0 Mo | 393 671 / 92 607 | 5,1 s (+ envoi 0,2 s) |
| ZR0982-BJ001.stl | 20,5 Mo | 0,1 Mo | 0,1 Mo | 21 912 / 16 940 | 0,4 s (+ envoi 0,0 s) |

## Pierres détectées

| Fichier | Trouvé par le pipeline | Analyse de départ |
|---|---|---|
| ZN1242-bj001.glb | 图层01 : 133 exemplaire(s), rôle deviné metal ; 图层04 : 1 exemplaire(s), rôle deviné metal (à vérifier) ; 图层05 : 3 exemplaire(s), rôle deviné metal ; 图层09 : 3601 exemplaire(s), rôle deviné diamond ; 图层10 : 199 exemplaire(s), rôle deviné diamond | 3601 diamants (图层09), 2 × 199 autres pierres (图层10), maillons or rose (图层05), fleurs or blanc (图层01), 图层04 inconnu |
| ZN1059-BJ001(2).stl | 1078 × round 0.8mm ; 168 × fancy 1.5x2.0mm ; 152 × round 1.9mm ; 144 × round 2.2mm ; 108 × round 2.3mm ; 104 × round 1.0mm ; 52 × round 0.9mm ; 42 × fancy 1.5x3.5mm ; 36 × round 2.4mm ; 36 × round 4.5mm ; 18 × round 3.1mm ; 14 × fancy 1.5x2.5mm ; 9 × fancy 1.5x3.0mm | 1026 rondes 0,8 mm ; 152 rondes 1,9 mm ; plusieurs centaines de taille fantaisie (40 triangles) ; 144 griffes et 38 maillons en métal |
| zp1864-BJ001.stl | 40 × round 1.0mm ; 28 × fancy 0.2x0.4mm (à vérifier) ; 24 × fancy 0.3x0.5mm (à vérifier) ; 17 × fancy 0.3x0.6mm (à vérifier) ; 12 × fancy 0.4x0.8mm (à vérifier) ; 8 × fancy 0.8x1.5mm (à vérifier) ; 8 × fancy 0.6x1.1mm (à vérifier) ; 7 × fancy 0.4x0.6mm (à vérifier) ; 7 × fancy 0.5x0.9mm (à vérifier) ; 4 × round 0.7mm | 40 rondes 1,0 mm + quelques petits groupes répétés |
| 0542.stl | aucune pierre séparable : métal seul (message « pierres fondues ou absentes » dans l'admin) | un seul bloc fondu : pas de pierres séparables |
| ZR0982-BJ001.stl | aucune pierre séparable : métal seul (message « pierres fondues ou absentes » dans l'admin) | aucune pierre répétée : métal seul |

## Chargement et fluidité

Chargement : du clic sur le lien au bijou affiché, serveur local ; « 4G » : la même page sur l'iPhone émulé avec une connexion de 10 Mbit/s, sans cache. Les images par seconde plafonnent à 60 (la fréquence de l'écran).

| Fichier | Ordinateur : chargement / images par s | iPhone émulé : chargement (4G) / images par s | Zoom sur une pierre : centre de la vue → pierre | Recentrage tout seul (2,5 s après) |
|---|---|---|---|---|
| ZN1242-bj001.glb | 0,9 s / 60 | 1,0 s (4,2 s) / 60 | 2,41 mm (la pierre est à 92,0 mm du centre du bijou ; caméra à 22,9 mm) | 0,000 mm |
| ZN1059-BJ001(2).stl | 0,9 s / 60 | 1,0 s (3,3 s) / 60 | 0,32 mm (la pierre est à 249,4 mm du centre du bijou ; caméra à 7,7 mm) | 0,000 mm |
| zp1864-BJ001.stl | 0,9 s / 60 | 1,1 s (2,8 s) / 60 | 0,46 mm (la pierre est à 10,3 mm du centre du bijou ; caméra à 9,7 mm) | 0,000 mm |
| 0542.stl | 0,9 s / 60 | 1,0 s (3,2 s) / 60 | pas de pierres : zoom sur le métal (caméra à 13,2 mm) | 0,000 mm |
| ZR0982-BJ001.stl | 0,8 s / 60 | 1,0 s (1,7 s) / 60 | pas de pierres : zoom sur le métal (caméra à 9,0 mm) | 0,000 mm |

## Contrôles

- OK — Import .3dm (fichier Rhino fabriqué pour le test) : calques « Metal 18K » → metal, « Diamonds » → diamond, 21 morceaux lus (la pièce de métal et 20 pierres : un bloc posé 12 fois et 8 copies tournées)
- OK — Lien expiré : page « Ce lien a expiré »
- OK — Lien inexistant : page « Ce lien n'existe pas »
- OK — Mot de passe faux refusé
- OK — Bon mot de passe : la pièce s'affiche
- OK — Bouton WhatsApp « I love it » avec le métal : Hello Berete Jewellers, I love the piece "Test" in 18k white gold (Flowers), 18k rose gold (BRT logo) and 18k rose gold (Links). http://localhost:3001/view/zkEY
- OK — Lien privé jamais indexé : meta robots « noindex,nofollow », en-tête « noindex, nofollow »
- OK — Page de la pièce /pieces/vfb-stuttgart-dfb-pokal-2025 : section « Explore in 3D », WhatsApp « Hello Berete Jewellers, I want the piece "VfB Stuttgart — DFB-Pokal 2025 Ring" in 18k yellow gold (Flowers), 18k rose gold (BRT logo) and 18k rose gold (Links). Can we ta »
- OK — Calques du fichier de test reconnus par leur nom : 图层01 white-gold, 图层05 rose-gold, 图层09 diamond
- OK — Zoom sur un détail : la vue reste sur le détail, jamais de recentrage sur le bijou
- OK — Erreurs dans la console (toutes les pages ouvertes) : 0

## Captures

- `admin-*.jpg` : l'envoi du fichier de test dans l'admin, la liste, les réglages des calques, un calque vu seul.
- `desktop/` et `iphone/` : pour chaque modèle, `-0-page` (la page du lien privé), `-1-vue-par-defaut`, `-2-zoom` (double-clic puis molette, ou double-tap), `-3-lumiere-*` (bracelet de test), `-4-metal-*`.
- `lien-expire.jpg`, `lien-mot-de-passe.jpg`, `page-piece-explore-in-3d.jpg`.
