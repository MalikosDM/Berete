# Moteur 3D Berete et iJewel : toutes les options, une par une

État au 27/11/2026. Chaque option a un nom simple en français, son nom iJewel entre parenthèses, une phrase d'aide, son état et
la capture qui le prouve (dossier `~/Downloads/_verif-3d-v3/` sur le Mac de Malik). Rien n'est repris d'iJewel ni de WebGi :
code, éclairages, icônes et noms sont à nous ; seule la lecture de leurs fichiers à l'import existe.

**Présent** : l'option existe, marche et a été vérifiée. **Partiel** : elle existe en partie (dit pourquoi). **Absent** : elle n'existe pas.

## Pierres

| Option | État | Aide | Preuve |
|---|---|---|---|
| Indice de réfraction (Refractive Index) | Présent | 2,42 vrai diamant, 2,60 conseillé pour plus d'éclat. | `planche-tailles-apres.png`, `docs/3d-reglages-testes.md` |
| Feu (Dispersion) | Présent | Les petits éclats colorés quand la lumière sort. | `planche-tailles-apres.png` |
| Rebonds de la lumière (Ray Bounces), 1 à 16, 5 par défaut | Présent | Le moteur en met 8 aux tailles à degrés, 7 aux grosses pierres, 4–5 au pavé. | `emeraude-ZR0982-apres.png` |
| Intensité de l'éclairage (Env Intensity) | Présent | Plus ou moins de lumière dans la pierre ; bornée pour ne jamais noircir. | `docs/3d-reglages-testes.md` |
| Contraste intérieur (Gamma) | Présent | Les zones sombres de la pierre plus ou moins marquées. | idem |
| Renfort de couleur (RGB Boost) | Présent | Un peu plus de rouge, de vert ou de bleu dans la pierre. | idem |
| Éclairage orienté (Diamond Oriented Lighting) | Présent | La lumière suit le haut de chaque pierre, où qu'elle soit sertie. | idem |
| Rotation de l'éclairage X/Y/Z de la pierre (Env Rotation) | Présent | Déplace les éclats sur les facettes. | idem |
| Densité de couleur (Absorption) | Présent | Une pierre de couleur plus foncée là où la lumière traverse plus. | `vignettes-matieres.png` |
| Transparence vers l'arrière (Transmission) | Présent | Laisse voir les griffes à travers la pierre. | `docs/3d-reglages-testes.md` |
| Reflet de surface (Reflectivity) | Présent | Le reflet de la facette elle-même. | idem |
| Inclusions | Présent | Un léger nuage dans la pierre. | `vignettes-matieres.png` |
| Film irisé (Thin Film) | Présent | Un voile qui colore les reflets, comme une bulle de savon. | `docs/3d-reglages-testes.md` |
| Lueur par matière (Bloom par matériau) | Présent | Seules les pierres choisies brillent d'un halo. | idem |
| Teinte de la matière (LUT par matériau) | Partiel | Six teintes faites par code (chaud, froid, vif, doux, argentique, noir et blanc) ; pas d'import de fichier .cube. | idem |
| Précision de la carte intérieure 256/512/1024, partagée par taille (Cube Map Size) | Présent | Choisie seule par le moteur selon le nombre de pierres, ou à la main. | `docs/3d-reglages-testes.md` |
| Enregistrer / recharger une pierre (notre format .bgem) | Présent | « Enregistrer la pierre (.bgem) », « Charger une pierre ». | idem |
| Couleurs prêtes : blanc, jaune, rose, champagne, noir, bleu, rouge, vert | Présent | En un clic dans le mode simple. | `vignettes-matieres.png`, `yoni-parcours-3.png` |
| Calcul tracé (BVH) et calcul rapide (carte des normales par taille) | Présent | Le moteur choisit : rapide pour le pavé, tracé pour les grosses pierres. | `planche-tailles-apres.png` (deux rangées) |

## Métaux

| Option | État | Aide | Preuve |
|---|---|---|---|
| Couleur (Color) | Présent | Les 10 métaux calibrés sur des mesures, ou une couleur à soi. | `metaux-calibres.png` |
| Rugosité (Roughness) | Présent | Du poli miroir au satiné. | `docs/3d-reglages-testes.md` |
| Vernis (Clearcoat) | Présent | Une couche brillante par-dessus le métal. | idem |
| Brossé avec direction (Anisotropy) | Partiel | Existe dans le moteur et la bibliothèque, mais caché de la liste des finitions : sous le studio clair il sort presque blanc (mesuré). | `docs/3d-reglages-testes.md` |
| Martelé, vieilli | Présent | Finitions faites par code. | idem |
| Biseau par matière 0–16 (SSBevel) | Absent | Retiré : il moyennait les normales du fichier, déjà lisses, et ne changeait rien (écart mesuré 0,0–0,4) ; à refaire à partir de la profondeur. | `docs/3d-reglages-testes.md` |
| Lueur par matière | Présent | idem pierres. | idem |
| 14 ct et 18 ct | Présent | Or jaune, rose, blanc en 14 et 18 carats. | `metaux-calibres.png` |

## Éclairage

| Option | État | Aide | Preuve |
|---|---|---|---|
| Un éclairage pour le métal, un pour les pierres (Environment / Gem Environment) | Présent | 11 éclairages métal, 13 éclairages pierres faits par code, plus « auto ». | `hdri-planche.png` |
| Intensité et rotation de chacun | Présent | | `docs/3d-reglages-testes.md` |
| Éclairage fixe quand la caméra tourne (Fixed Env Direction) | Présent | Les éclats passent d'une facette à l'autre. | idem |
| Import d'un HDR ou EXR personnel | Présent | Onglet Scène → « Vos éclairages ». | `export-hdri-ui.png` |
| Fond indépendant de l'éclairage | Présent | Couleur, dégradé, fonds nommés, transparent. | `vignettes-matieres.png` (ambiances) |
| Au moins 3 éclairages pierres « studio dense » qui marchent sur toutes les tailles | Présent | Tente blanche, Boîtes studio, Bandes en escalier (+ Studio). | `planche-tailles-apres.png` |

## Effets

| Option | État | Aide | Preuve |
|---|---|---|---|
| Reflets à l'écran (SSR) : intensité, puissance, tolérance, pas, ignorer les rayons de face, masque | Présent | Le métal se reflète en lui-même. | `docs/3d-reglages-testes.md` |
| Biseau à l'écran, rayon de scène 0–8 (SSBevel) | Absent | Retiré pour la même raison (ne changeait rien sur les deux bijoux testés). | idem |
| Lueur (Bloom) : seuil, seuil doux, intensité, rayon, puissance, itérations 0–7, mode contrôle | Présent | Seuil haut par défaut : les pendentifs pavés ne brûlent plus. | idem, `rhino-yoni-2.png` |
| Tons : ACES, AgX, Neutral ; exposition, saturation, contraste ; détourer le fond | Présent | | idem |
| Occlusion ambiante (AO) | Présent | Les creux un peu plus sombres. | idem |
| Profondeur de champ avec mise au point par clic (DoF) | Présent | Cliquez sur la pièce : ce point est net. | idem |
| Vignettage (Vignette) | Présent | | idem |
| Teinte de scène (LUT de scène) | Partiel | Six teintes faites par code ; pas d'import .cube. | idem |
| Image qui s'affine à l'arrêt (rendu progressif) et lissage en mouvement (TAA) | Présent | | `yoni-photo-4k.jpg` |

## Sol

| Option | État | Aide | Preuve |
|---|---|---|---|
| Taille | Présent | | `docs/3d-reglages-testes.md` |
| Ombre douce accumulée : images d'ombre, lumière aléatoire (Shadow Frames, Random Light) | Présent | | idem |
| Ombre de contact | Présent | | `vignettes-matieres.png` (ambiances) |
| Sol miroir avec flou | Présent | Du miroir net au sol satiné. | idem |
| Rendu dans la profondeur (Render to Depth) | Présent | Le sol se fond dans le fond. | idem |
| Caméra bloquée au-dessus du sol | Présent | | idem |

## Caméra et vues

| Option | État | Aide | Preuve |
|---|---|---|---|
| Champ de vision (FOV) | Présent | | `docs/3d-reglages-testes.md` |
| Liste de vues : enregistrer, nommer, réordonner | Présent | Onglet « Vues de caméra ». | idem |
| Transitions : courbe douce (easeInOutSine), interpolation sphérique, durée, pause, boucle | Présent | | idem |
| Vues pilotées par le défilement de la page (Seek on Scroll) | Présent | | idem |
| Rotation auto : vitesse et sens | Présent | Vitesse négative = l'autre sens. | idem |
| Limites de zoom et d'angle | Présent | Au plus près / au plus loin, angle de vue mini/maxi. | idem |
| Déplacement latéral oui / non (Pan) | Présent | | idem |
| Cadrage automatique à l'ouverture (toute la pièce, 10 % de marge) | Présent | Un pendentif posé à plat est mis debout, bélière en haut. | `rhino-yoni-1..3.png`, `tests/rhino-framing.spec.ts` |

## Visualiseur du client

| Option | État | Aide | Preuve |
|---|---|---|---|
| Boutons zoom, cadrer, plein écran | Présent | | `client-configurateur-en.png` |
| Image d'attente et barre de progression | Présent | | `client-chargement.png` |
| Fond transparent | Présent | | `client-embed.png` |
| Logo | Présent | | idem |
| Qualité auto selon l'appareil | Présent | Version légère sur téléphone et ordinateurs sans carte graphique. | mesures ci-dessous |
| Partage | Présent | Lien chiffré, 7 jours, mot de passe facultatif. | passe du 26/11 |
| Essayage de bague | Présent | Suit l'axe et la largeur du doigt, moitié arrière cachée. | `essayage.png`, `essayage-photo-enregistree.jpg` |
| « Voir chez moi » : Quick Look (iPhone), Scene Viewer et WebXR (Android) | Présent | WebXR non essayé sur un vrai téléphone Android. | `client-configurateur-ar.png` |
| Code d'intégration (iframe) depuis l'admin | Présent | Bouton « Intégrer ». | `admin-integrer.png`, `client-embed.png` |
| Textes dans les 6 langues | Présent | | `client-configurateur-en.png`, `-fr`, `-ar` |

## Configurateur

| Option | État | Aide | Preuve |
|---|---|---|---|
| Variantes de métal et de pierre par partie | Présent | | `client-configurateur-fr.png` |
| Pastilles | Présent | Un seul choix de métal visible, synchronisé. | idem |
| Plusieurs variantes d'un même modèle | Présent | Plusieurs groupes de pastilles. | idem |

## Import

| Option | État | Aide | Preuve |
|---|---|---|---|
| Formats : 3dm avec et sans maillage de rendu, GLB/glTF, FBX, OBJ, STL | Présent | Le site maille lui-même les surfaces Rhino. | `rhino-inventaire.md` |
| Calques Metal / Metal 01–05 / Head / Gem / Gem 01–05 / Diamond | Présent | | idem |
| Blocs et copies (instances), calques éteints | Présent | Vérifiés objet par objet avec rhino3dm (`scripts/rhino-check.ts`). | `tests/rhino-files.spec.ts` |
| Unités en mm | Présent | | idem |
| Alerte au-dessus de 200 000 triangles et réduction proposée | Présent | La version du client est allégée seule. | passe du 26/11 |
| Compression pour le client (meshopt) | Présent | | idem |
| Pierres reconnues par le nom ET par la forme, puis choix manuel | Présent | Une lettre plate en métal reste du métal. | `src/viewer/auto.ts` |
| Lecture des exports iJewel (GLB + .vjson) | Partiel | Écrite sans vrai fichier d'iJewel : à vérifier sur le premier export de Yoni. | — |

## Export

| Option | État | Aide | Preuve |
|---|---|---|---|
| GLB avec notre extension BERETE_gem et fichier de scène JSON | Présent | | `export-glb.txt`, `export-scene.berete-scene.json` |
| USDZ | Présent | | `export-panel-after.png` |
| Photo PNG 4K, fond transparent possible | Présent | | `yoni-photo-4k.jpg` |
| Films MP4 et WebM 4K avec la trajectoire de caméra | Présent | WebM caché sur Safari (pas d'encodeur VP9). | `export-webm-ffprobe.txt` |
| Rendu en série | Présent | | passe du 26/11 |

## Confort dans l'admin

| Option | État | Aide | Preuve |
|---|---|---|---|
| Annuler / rétablir | Présent | Ctrl/⌘ + Z, Ctrl/⌘ + Maj + Z. | `confort-annuler-retablir.png` |
| Préréglages de scène appliqués à plusieurs modèles d'un coup | Présent | | `confort-prereglages.png`, `confort-appliquer.png` |
| Comparaison avant / après avec un trait coulissant | Présent | | `confort-comparer.png` |
| Raccourcis clavier | Présent | « ? Raccourcis ». | `confort-raccourcis.png` |
| Aperçu direct sur la page du site | Présent | « Voir sur la page de la pièce ». | `tests/editor3d-confort.spec.ts` |
| Versions enregistrées d'une scène | Présent | Les 20 dernières. | `confort-versions.png` |
| Mode simple (4 choix) et mode expert fermé | Présent | | `yoni-parcours-3.png` |
| Avertissement « pierres trop sombres » avec « Corriger » | Présent | | `src/pages/admin/editor3d/SimpleMode.tsx` |

## Performances

Mesuré le 27/11/2026 sur le Mac de Malik (machine libre), bijou qui tourne en continu, `.local/scripts/perf-3d.mjs`.
« iPhone 13 émulé » = la taille et le mode téléphone de l'iPhone dans WebKit, mais avec la carte graphique du Mac : ce n'est
pas un vrai iPhone 13 (jamais mesuré sur l'appareil). La 4G est simulée (9 Mbit/s, 150 ms) sur la version construite du site.

| Mesure | ZR0982 (grosse émeraude) | ZN1242 (bracelet, 3 601 pierres) | ZP0975 (octogone N) | Objectif |
|---|---|---|---|---|
| Chromium ordinateur 1440 px | 54 images/s | 60 | 60 | 60 |
| WebKit (Safari) ordinateur 1280 px | 59 | 60 | 60 | 60 |
| iPhone 13 émulé (WebKit) | 60 | 60 | 60 | 30 minimum |
| Lien client, 4G, ordinateur : image d'attente / bijou dessiné | 1,7 s / 1,9 s | 1,7 s / 1,9 s | — | < 3 s |
| Lien client, 4G, iPhone : image d'attente / bijou dessiné | 1,7 s / 1,9 s | 1,7 s / 1,8 s | — | < 3 s |

La grosse émeraude de ZR0982 (108 000 triangles pour une soixantaine de facettes) tombait à 17 images/s une fois les rayons
réparés ; les rayons la parcourent maintenant sur sa forme exacte à facettes (enveloppe convexe) : 54.

## Décompte

84 options présentes, 4 partielles (teinte LUT par matière et de scène : pas d'import de fichier .cube ; brossé caché car trop
clair ; lecture des exports iJewel jamais essayée sur un vrai fichier), 2 absentes (biseau à l'écran, scène et matière : retiré
parce qu'il ne changeait rien ; à refaire à partir de la profondeur). Aucune comparaison avec iJewel lui-même n'a été faite :
il faut un export iJewel d'une pièce (GLB + .vjson).
