# La vitesse du site — diagnostic du 28/11/2026

Malik et Yoni trouvaient le site lent à parcourir, sur des connexions différentes. Mesures faites sur le vrai site
(https://beretejewellers.com, derrière l'accès privé), depuis le Mac de Malik, avec un vrai navigateur (Chromium avec la
carte graphique, et WebKit, le moteur de Safari), en fibre et en « 4G rapide » simulée (9 Mbit/s, +60 ms). Scripts :
`.local/scripts/speed-curl.sh`, `speed-browser.mjs`, `speed-feel.mjs` ; chiffres bruts : `~/Downloads/_verif-28-11/vitesse/`.

## Ce qui n'était PAS en cause

- **Le serveur** : 4 cœurs, 8 Go, processeur à 0–1 % pendant la navigation, aucune erreur répétée. Pages HTML en 50 à 150 ms
  côté serveur (TTFB 150–250 ms depuis le Mac, dont ~60 ms d'aller-retour réseau et la poignée de main HTTPS).
- **La barrière d'accès privé** : elle vérifie une signature en mémoire (HMAC), ne lit la base qu'une fois toutes les 5 s.
- **Le cache et la compression** : HTTP/2, Brotli pour HTML/JS/CSS/JSON, fichiers avec empreinte gardés un an (`immutable`),
  HTML revalidé à chaque visite, vidéos servies par morceaux (`Range`, réponses 206).
- **Le passage d'une page à l'autre** : 65 à 120 ms (l'application change de page sans recharger).
- **La fluidité** : 60 images/s en défilant et dans les univers, sur ordinateur comme en processeur ralenti 4 fois.

## Les vraies causes (et les corrections)

| Cause | Avant | Après | Correction |
|---|---|---|---|
| Le monogramme d'arrivée jouait 2,5 s **par-dessus une page déjà affichée** (elle apparaissait, puis était cachée), à chaque nouvelle visite (chaque lien WhatsApp) | arrivée utilisable en 3,4 s (fibre), 3,6 s (4G) | **1,7 s** (fibre), **2,0 s** (4G) | Le monogramme est écrit dans la page (`index.html`, `scripts/intro-markup.mjs`) : il est là dès la première image et s'efface dès que la page est prête (1,2 s au plus, `Preloader.tsx`) |
| L'entrée « cinéma » de chaque univers attendait la fin du monogramme puis durait 2,6 s | arrivée sur une pièce : 6,8 s (appareil lent), 5,8 s (Safari) | **3,6 s**, **3,3 s** | Toutes les animations d'entrée à 55 % de leur durée (`src/index.css`, `Universe.tsx`) ; la pièce est visible en moins d'une seconde |
| Le défilement « adouci » (Lenis) continuait de glisser après l'arrêt de la molette : la page n'était jamais là où on la voulait | 1,05 s et 260–340 px de glisse | **0,05 s, 0 px** | Molette et pavé tactile directs (`SmoothScroll.tsx`, `smoothWheel: false`) |
| Sur ordinateur, la grande photo de la version téléphone de l'ouverture était téléchargée aussi (cachée) | photos d'une page de pièce : 1,9 Mo | **0,84 Mo** (local), 1,3 Mo en ligne avec la galerie | Chaque version ne charge sa photo que là où elle se voit (`Showcase.tsx`) |
| Les 6 films d'ouverture des écrins se chargeaient avec la page | 4,4 Mo de films à l'arrivée sur Signature Trunks | **0** | Chargés quand la souris arrive sur l'écrin (ou au doigt quand il est bien à l'écran) (`TrunkReveal.tsx`) |
| Le premier film des chapitres de l'Atelier se chargeait avec la page | 2,6 Mo de films à l'arrivée | **1,5 Mo** (le seul film d'ouverture) | Chargés au moment de les voir (`AtelierChapters.tsx`) |
| La photo d'une pièce ne commençait à charger qu'une fois sur sa page | — | préchargée au survol de son lien | `src/lib/prefetch.ts` |

## Les objectifs (mesurés en ligne après correction, 4G rapide)

- Premier affichage < 1,5 s : 0,6 à 0,95 s sur l'accueil, une pièce, Créations, l'Atelier, les écrins.
- Pièce du haut visible < 2,5 s : 0,7 à 1,7 s (la page Créations, la plus chargée, à 1,7 s).
- Passage d'une page à l'autre < 1 s : 66 à 117 ms.
- Aucun gel en défilant, 60 images/s (59 à 60 en Safari) ; univers au repos à 60 images/s.

Le test `tests/perf.spec.ts` (local et en ligne) échoue si l'un de ces objectifs n'est plus tenu, si la page glisse après la
molette, ou si des photos ou des films sont téléchargés pour rien. Passé en ligne le 28/11 : 7 réussis.

## Ce qui reste possible plus tard

- Les détourages des vignettes de Créations pèsent ~100 Ko chacun (WebP qualité 90 avec transparence) ; une version 640 px et
  une qualité un peu plus basse allégeraient la page Créations sur les écrans Retina.
- Le script principal (~320 Ko compressé) contient toutes les pages : le découper par page gagnerait ~100 ms en 4G.
- Jamais mesuré sur un vrai iPhone : WebKit sur Mac est un bon indicateur, pas une preuve.
