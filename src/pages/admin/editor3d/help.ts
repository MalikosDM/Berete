/*
 * The help of every setting of the expert 3D editor (27/11/2026), in simple French: one short sentence, and for the
 * settings that change the picture two small images made by our own engine on the ring ZR0982 (the emerald for the
 * stones' settings, the band for the metal's, the whole ring for the scene and the effects), the low value and the high
 * one, shown when « ? » is opened beside the setting. The images are made again by scripts/settings-audit.ts, which also
 * tests every setting (docs/3d-reglages-testes.md); the captions below say the values it renders.
 * Keyed by the `data` key every control carries (data-control in the page).
 */

export type Help = {
  /** One short sentence, no technical word without its simple translation. */
  text: string;
  /** The captions of the two images (low value | high value): /media/3d-lib/help/<key>-a.webp and -b.webp. */
  pair?: [string, string];
};

export const HELP: Record<string, Help> = {
  /* ---------- Vue ---------- */
  quality: { text: "Très haute : plus de rebonds de lumière dans les pierres et une image plus lisse à l'arrêt, mais plus lente à calculer.", pair: ["Haute", "Très haute"] },
  fov: { text: "Petit : comme un téléobjectif, le bijou n'est presque pas déformé. Grand : plus de perspective, les bords s'étirent.", pair: ["12°", "60°"] },
  "auto-scale": { text: "La première vue cadre tout le bijou, quelle que soit sa taille dans le fichier. Sans : la caméra se place à une distance fixe.", pair: ["Sans", "Avec"] },
  "auto-center": { text: "La première vue vise le milieu du bijou. Sans : elle vise le point zéro du fichier (souvent le même sur un fichier bien préparé)." },
  "client-zoom": { text: "Le client peut rapprocher le bijou avec la molette ou deux doigts. Sans : la molette fait défiler la page." },
  "client-zoom-buttons": { text: "Des boutons + et − sur l'image, pour zoomer sans molette (ordinateur seulement)." },
  "client-prompt": { text: "Une petite invite « Glissez pour tourner » à la première apparition du bijou ; elle s'efface seule." },
  "client-auto-rotate": { text: "Le bijou tourne doucement tout seul au départ ; il s'arrête dès que le client le touche." },
  "client-views": { text: "Les vues enregistrées (onglet « Vues de caméra ») et le bouton de visite guidée chez le client." },
  "client-configurator": { text: "Les pastilles en bas de la 3D pour changer de matière (onglet « Configurateur »)." },
  "client-share": { text: "Un bouton pour envoyer le lien de la 3D." },
  "client-fullscreen": { text: "Un bouton pour voir la 3D sur tout l'écran." },
  "client-try-on": { text: "Le bouton d'essayage de la bague sur la main, avec la caméra du téléphone (réglé dans « Essayage », à gauche)." },
  "client-ar": { text: "Le bouton « Voir chez moi » : la pièce posée dans la pièce du client, sur iPhone et Android." },
  "client-quality": { text: "La finesse de l'image chez le client. Automatique : plus légère sur un téléphone pour rester fluide." },
  "zoom-limit": { text: "Empêche le client de trop rapprocher ou de trop éloigner le bijou, sur ce type d'écran." },
  "zoom-near": { text: "La distance la plus courte, en nombre de fois la taille du bijou." },
  "zoom-far": { text: "La distance la plus grande, en nombre de fois la taille du bijou." },
  "rotate-speed": { text: "La vitesse à laquelle le bijou tourne seul chez le client. 0,35 conseillé ; en dessous de 0, il tourne dans l'autre sens. Les images : où il en est au bout d'une seconde.", pair: ["−1,5", "+1,5"] },
  "camera-pan": { text: "Le client peut faire glisser le bijou sur le côté (clic droit, Maj + glisser ou deux doigts). Sans : le bijou reste au centre." },
  "polar-limits": { text: "Empêche la caméra du client de monter trop haut ou de passer sous le bijou. En degrés depuis le dessus : 0, vu de dessus ; 90, de face ; 180, de dessous." },
  "polar-min": { text: "L'angle le plus haut que la caméra peut prendre (0 : tout à fait au-dessus)." },
  "polar-max": { text: "L'angle le plus bas que la caméra peut prendre (90 : de face ; au-delà, elle passe sous le bijou)." },
  "save-gem": { text: "Enregistre tous les réglages de cette pierre dans un fichier .bgem, pour les reprendre sur une autre pièce avec « Charger une pierre »." },

  /* ---------- Parties ---------- */
  role: { text: "Ce qu'est cette partie : du métal, un diamant, une pierre de couleur, de l'émail, ou cachée.", pair: ["Diamant", "Pierre de couleur"] },
  "layer-label": { text: "Le nom que lit le client au-dessus des pastilles de ce métal (« Maillons », « Fleurs »…)." },
  metal: { text: "L'alliage de cette partie : sa couleur et son éclat.", pair: ["Or rose 18 ct", "Or blanc 18 ct"] },
  finish: { text: "L'aspect de la surface : poli comme un miroir, satiné, martelé ou vieilli.", pair: ["Poli", "Satiné"] },
  "brush-angle": { text: "Le sens des fines lignes du brossage.", pair: ["0°", "90°"] },
  "metal-color": { text: "Une teinte à vous à la place de celle de l'alliage (par exemple un or plus jaune). « Couleur de l'alliage » la retire.", pair: ["Alliage", "Teinte #e9c46f"] },
  roughness: { text: "Le poli du métal : bas, un miroir net ; haut, un métal plus doux qui reflète flou.", pair: ["0,05", "0,6"] },
  clearcoat: { text: "Une fine couche de vernis transparent sur le métal : un deuxième reflet, plus net, par-dessus.", pair: ["0", "1"] },
  "metal-lut": { text: "Une teinte d'ensemble pour ce métal seulement : plus chaud, plus froid, plus vif…", pair: ["Aucune", "Chaud"] },
  "stone-color": { text: "La couleur de cette pierre ou de cet émail.", pair: ["Rouge", "Vert"] },
  "bloom-layer": { text: "Les éclats les plus forts de cette matière rayonnent d'une petite lueur.", pair: ["Sans", "Avec"] },

  "gem-env": { text: "La lumière que voit cette pierre. « Celui de la scène » : celle choisie pour toutes les pierres.", pair: ["Celui de la scène", "Bandes"] },
  "gem-color": { text: "La teinte de la pierre. Blanc : un diamant incolore.", pair: ["Blanc", "Rose"] },
  "env-intensity": { text: "La quantité de lumière dans la pierre : plus haut, plus lumineuse. 1,30 conseillé.", pair: ["0,5", "3"] },
  "env-rotation": { text: "Tourne la lumière autour de la pierre : déplace les éclats et le feu, ou éloigne une zone trop blanche.", pair: ["0°", "120°"] },
  "env-rotation-xyz": { text: "Tourne la lumière de la pierre sur les trois axes (de gauche à droite, d'avant en arrière, sur elle-même).", pair: ["0°", "X 90°"] },
  dispersion: { text: "Le feu : la lumière blanche qui se sépare en petits éclats de couleur. Très bas : quelques éclats remarquables.", pair: ["0", "0,03"] },
  absorption: { text: "La profondeur de la couleur d'une pierre teintée : plus haut, plus foncée là où la lumière traverse longtemps. Sans effet sur une pierre blanche.", pair: ["0", "1"] },
  ior: { text: "Combien la pierre plie la lumière (indice de réfraction). 2,42 : un vrai diamant ; 2,60 conseillé, plus brillant ; 1,5 : du verre.", pair: ["1,5", "2,9"] },
  gamma: { text: "Le contraste à l'intérieur de la pierre : plus haut, des noirs et des blancs plus francs.", pair: ["0,6", "1,6"] },
  boost: { text: "Renforce une couleur de la lumière dans la pierre (rouge, vert, bleu) : une autre façon de la teinter.", pair: ["0,6", "1,6"] },
  transmission: { text: "Laisse voir ce qui est derrière la pierre (les griffes, le métal), comme à travers une vitre.", pair: ["0", "0,6"] },
  reflectivity: { text: "Le reflet sur le dessus de la pierre, comme sur du verre poli.", pair: ["0", "1"] },
  bounces: { text: "Combien de fois la lumière rebondit dans la pierre avant d'en sortir : peu, la pierre s'assombrit ; 5 suffit en général.", pair: ["1", "16"] },
  oriented: { text: "1 : la lumière suit le dessus de chaque pierre, où qu'elle soit sertie (utile pour un pavé sur une forme courbe). 0 : la même lumière pour toutes. Sans effet sur une pierre seule." },
  "gem-mode": { text: "Exact : chaque rayon suit la pierre (grosses pierres). Rapide : une mesure partagée par toutes les pierres de même taille (pavés).", pair: ["Exact", "Rapide"] },
  "cube-size": { text: "En calcul rapide seulement : la finesse de la mesure intérieure de la pierre. Plus haut : plus net, un peu plus lent." },
  "thin-film": { text: "Une fine couche irisée sur la pierre, comme une bulle de savon : des reflets aux couleurs changeantes.", pair: ["Sans", "Avec"] },
  "thin-film-amount": { text: "La force des reflets irisés.", pair: ["0,1", "1"] },
  "thin-film-thickness": { text: "L'épaisseur de la couche irisée : elle change les couleurs des reflets.", pair: ["200 nm", "900 nm"] },
  "gem-lut": { text: "Une teinte d'ensemble pour cette pierre seulement : plus chaude, plus froide, plus vive…", pair: ["Aucune", "Froid"] },
  inclusions: { text: "Un léger nuage à l'intérieur de la pierre, comme dans une pierre naturelle.", pair: ["Sans", "Avec"] },
  "inclusions-amount": { text: "La quantité de nuage dans la pierre.", pair: ["0,1", "1"] },
  "inclusions-scale": { text: "La taille des taches du nuage : petit, fin et serré ; grand, de larges voiles.", pair: ["0,3", "3"] },
  "inclusions-roughness": { text: "Le flou des inclusions : bas, des taches nettes ; haut, un voile doux.", pair: ["0", "1"] },
  "pose-rotation": { text: "Tourne le bijou sur lui-même (de gauche à droite, d'avant en arrière, à plat).", pair: ["0°", "X 60°"] },

  /* ---------- Scène ---------- */
  background: { text: "Ce qu'on voit derrière le bijou : une couleur, un studio, une matière (velours, marbre…) ou l'éclairage lui-même.", pair: ["Studio sombre", "Studio clair"] },
  "backdrop-color": { text: "La couleur du fond.", pair: ["Noir", "Ivoire"] },
  "backdrop-inner": { text: "La couleur du fond au centre, derrière le bijou.", pair: ["Brun", "Ivoire"] },
  "backdrop-outer": { text: "La couleur du fond vers les bords.", pair: ["Noir", "Ivoire"] },
  "env-metal": { text: "La lumière du métal (et de l'émail, des perles) : un studio, une fenêtre, un contre-jour…", pair: ["Studio clair", "Trois lumières"] },
  "env-metal-rotation": { text: "Tourne cette lumière autour du bijou : les reflets se déplacent sur le métal.", pair: ["0°", "120°"] },
  "env-metal-intensity": { text: "La force de la lumière du métal : plus haut, un métal plus clair.", pair: ["0,4", "2,5"] },
  "env-gem": { text: "La lumière de toutes les pierres. Automatique : le moteur choisit la meilleure pour chaque taille de pierre.", pair: ["Automatique", "Bandes"] },
  "env-gem-rotation": { text: "Tourne la lumière des pierres : les éclats changent de facette.", pair: ["0°", "120°"] },
  "env-gem-intensity": { text: "La force de la lumière des pierres : plus haut, des pierres plus lumineuses.", pair: ["0,5", "2,5"] },
  "fixed-env": { text: "La lumière reste face à vous quand on tourne autour du bijou : les éclats passent d'une facette à l'autre.", pair: ["Sans", "Avec"] },
  ground: { text: "Sous le bijou : rien, une ombre douce, une ombre de contact ou un sol qui le reflète.", pair: ["Ombre de contact", "Sol réfléchissant"] },
  "ground-size": { text: "La taille du sol (ou de l'ombre), en nombre de fois la taille du bijou.", pair: ["0,8 ×", "4 ×"] },
  "ground-height": { text: "Écarte le sol sous le bijou : l'ombre s'éloigne et s'adoucit.", pair: ["0 mm", "12 mm"] },
  "ground-opacity": { text: "La force de l'ombre ou du reflet au sol.", pair: ["0,2", "1"] },
  "ground-render-to-depth": { text: "Le bord du sol miroir se fond dans le fond, sans ligne d'horizon.", pair: ["Sans", "Avec"] },
  "ground-limit-camera": { text: "La caméra ne passe jamais sous le sol quand on tourne le bijou." },
  "shadow-frames": { text: "Le nombre d'images qui forment l'ombre douce : plus, une ombre plus lisse.", pair: ["2", "120"] },
  "shadow-color": { text: "La couleur de l'ombre douce.", pair: ["Noir", "Brun"] },
  "shadow-intensity": { text: "La force de la lumière qui dessine l'ombre douce.", pair: ["0,3", "2,5"] },
  "shadow-direction": { text: "D'où vient la lumière qui dessine l'ombre : l'ombre part du côté opposé.", pair: ["Du dessus", "De côté"] },
  "shadow-radius": { text: "La taille de la source de lumière : grande, une ombre plus floue.", pair: ["0,2", "3"] },
  "shadow-bias": { text: "Un petit décalage qui évite des rayures dans l'ombre ; trop haut, l'ombre se décolle du bijou.", pair: ["0", "0,01"] },
  "shadow-focus": { text: "La netteté de l'ombre : haut, une ombre franche ; bas, un voile doux tout autour.", pair: ["0", "1"] },
  "shadow-spread": { text: "Le nombre de petites lumières qui forment l'ombre : plus, une ombre plus douce.", pair: ["1", "16"] },
  "mirror-color": { text: "La couleur du sol miroir.", pair: ["Noir", "Brun"] },
  "mirror-roughness": { text: "Le poli du sol miroir : bas, un reflet net ; haut, un reflet terne.", pair: ["0", "1"] },
  "mirror-metalness": { text: "Le sol comme du métal (reflet coloré) ou comme de la pierre polie.", pair: ["0", "1"] },
  "mirror-blur": { text: "Le flou du reflet au sol : 0, un miroir net ; 1, un sol satiné.", pair: ["0", "1"] },
  "light-color": { text: "La couleur de cette lumière." },
  "light-intensity": { text: "La force de cette lumière.", pair: ["0", "4"] },
  "light-position": { text: "La place de cette lumière autour du bijou (gauche-droite, bas-haut, arrière-avant)." },
  "light-angle": { text: "L'ouverture du cône du spot : petit, un rond de lumière serré." },

  /* ---------- Rendu ---------- */
  progressive: { text: "Le nombre d'images que le moteur mélange une fois le bijou immobile : plus, une image plus lisse, comme une photo.", pair: ["4", "128"] },
  taa: { text: "Lisse les éclats qui scintillent pendant que le bijou tourne (sans effet sur une image immobile)." },

  /* ---------- Effets ---------- */
  ssr: { text: "Le bijou se reflète sur lui-même (le métal reflète les pierres et les griffes voisines).", pair: ["Sans", "Avec"] },
  "ssr-intensity": { text: "La force de ces reflets.", pair: ["0", "3"] },
  "ssr-boost": { text: "Renforce une couleur dans ces reflets (rouge, vert, bleu).", pair: ["0,3", "3"] },
  "ssr-auto-radius": { text: "La portée des reflets suit la taille du bijou. Sans : une portée fixe, réglée juste en dessous.", pair: ["Sans", "Avec"] },
  "ssr-radius": { text: "Jusqu'où le métal va chercher ce qu'il reflète.", pair: ["0,1", "4"] },
  "ssr-power": { text: "Plus haut : seuls les reflets les plus francs restent.", pair: ["0,3", "3"] },
  "ssr-tolerance": { text: "Bouche les petits trous des reflets ; trop haut, des reflets apparaissent là où il n'y en a pas.", pair: ["0", "2"] },
  "ssr-steps": { text: "La précision des reflets : plus, des reflets plus complets mais plus lents.", pair: ["4", "64"] },
  "ssr-ignore-front": { text: "Ignore les reflets qui reviennent vers vous (souvent faux).", pair: ["Sans", "Avec"] },
  "ssr-front-factor": { text: "Jusqu'où ces reflets vers vous sont retirés.", pair: ["−1", "1"] },
  tonemap: { text: "La façon de ramener la lumière à l'écran. ACES : le rendu photo conseillé ; Neutre : des couleurs plus fidèles.", pair: ["ACES", "Neutre"] },
  exposure: { text: "La luminosité de toute l'image, comme le réglage d'un appareil photo.", pair: ["0,5", "2,2"] },
  saturation: { text: "La force des couleurs : 0, noir et blanc ; plus haut, des couleurs plus vives.", pair: ["0", "1,5"] },
  contrast: { text: "L'écart entre les parties sombres et claires. 1,01 à 1,05 conseillé.", pair: ["0,85", "1,2"] },
  clip: { text: "Retire le fond : l'image s'enregistre en PNG transparent (le damier montre le vide).", pair: ["Sans", "Avec"] },
  bloom: { text: "Une lueur douce autour des éclats les plus forts.", pair: ["Sans", "Avec"] },
  "bloom-threshold": { text: "À partir de quelle force de lumière un éclat rayonne : bas, beaucoup d'éclats rayonnent.", pair: ["0,8", "6"] },
  "bloom-soft-threshold": { text: "Le passage entre ce qui rayonne et ce qui ne rayonne pas : plus haut, plus progressif.", pair: ["0", "2"] },
  "bloom-intensity": { text: "La force de la lueur.", pair: ["0", "1,5"] },
  "bloom-radius": { text: "La taille de la lueur autour de chaque éclat.", pair: ["0", "1"] },
  "bloom-power": { text: "Plus haut : la lueur reste sur les éclats les plus forts.", pair: ["0,2", "4"] },
  "bloom-iterations": { text: "La portée de la lueur : 0 l'éteint ; plus, une lueur plus large.", pair: ["0", "7"] },
  "bloom-debug": { text: "Contrôle : ne montre que ce qui rayonne, pour régler le seuil.", pair: ["Sans", "Avec"] },
  ao: { text: "Assombrit doucement les creux (sous les griffes, entre les maillons) : plus de relief.", pair: ["Sans", "Avec"] },
  "ao-intensity": { text: "La force de ces ombres dans les creux.", pair: ["0", "6"] },
  "ao-radius": { text: "La taille des creux assombris.", pair: ["2", "80"] },
  dof: { text: "Comme en photo : une partie du bijou nette, le reste flou.", pair: ["Sans", "Avec"] },
  "dof-blur": { text: "La force du flou hors de la zone nette.", pair: ["0,1", "2"] },
  "dof-aperture": { text: "La profondeur de la zone nette : bas, une tranche fine ; haut, presque tout est net.", pair: ["0,05", "1"] },
  "dof-focus": { text: "Cliquez ce bouton, puis sur le bijou : l'endroit cliqué devient net. « Le centre » revient au milieu du bijou." },
  "scene-lut": { text: "Une teinte d'ensemble pour toute l'image, comme un filtre photo : chaude, froide, vive, douce…", pair: ["Aucune", "Vif"] },
  "scene-lut-intensity": { text: "La force de cette teinte.", pair: ["0,2", "1"] },
  vignette: { text: "Assombrit doucement les coins de l'image.", pair: ["Sans", "Avec"] },
  "vignette-offset": { text: "Jusqu'où l'assombrissement entre dans l'image.", pair: ["0", "1"] },
  "vignette-darkness": { text: "La force de l'assombrissement des coins.", pair: ["0", "1"] },
  chromatic: { text: "Un léger liseré coloré sur les bords, comme un objectif photo.", pair: ["Sans", "Avec"] },
  "chromatic-offset": { text: "La largeur du liseré coloré.", pair: ["0", "0,004"] },
  grain: { text: "Un grain de film léger sur toute l'image.", pair: ["Sans", "Avec"] },
  "grain-intensity": { text: "La force du grain.", pair: ["0", "0,15"] },

  /* ---------- Vues de caméra ---------- */
  "views-duration": { text: "Le temps pour passer d'une vue à la suivante." },
  "views-ease": { text: "Le mouvement entre deux vues : doux au départ et à l'arrivée, ou constant." },
  "views-interpolation": { text: "Le trajet de la caméra : autour du bijou (conseillé) ou en ligne droite." },
  "views-pause": { text: "Le temps d'arrêt sur chaque vue pendant la visite guidée." },
  "views-loop": { text: "La visite guidée recommence au début après la dernière vue." },
  "seek-on-scroll": { text: "Sur la page de la pièce, la caméra passe d'une vue à l'autre quand on fait défiler la page." },

  /* ---------- Configurateur ---------- */
  "config-part": { text: "Les parties du bijou que change ce configurateur." },
  "config-add": { text: "Ajoute une matière que le client pourra choisir." },
};

/** The help of a control: its own key, else the key without a trailing number or side (« light-intensity-2 », « zoom-near-portrait »). */
export function helpOf(key: string | undefined): (Help & { key: string }) | null {
  if (!key) return null;
  const own = HELP[key];
  if (own) return { ...own, key };
  const base = key.replace(/-(\d+|portrait|landscape|[xyz])$/, "");
  const found = HELP[base];
  return found ? { ...found, key: base } : null;
}

/** The two images of a help (made by scripts/settings-audit.ts). */
export function helpImage(key: string, side: "a" | "b"): string {
  return "/media/3d-lib/help/" + key + "-" + side + ".webp";
}
