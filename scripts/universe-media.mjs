#!/usr/bin/env node
/**
 * The files of the universes of the pieces (src/data/themes.ts), for the site:
 *   - the AI backgrounds: the proposals of the client (external disk, never modified), enlarged to 2560 px by a
 *     super-resolution model (scripts/universe-upscale.py, masters kept in .local/universes, never in Git), then written
 *     for the web in AVIF and WebP, landscape at 3 widths and a portrait crop for phones centred on the heart of the image;
 *   - the title fonts (free licence, OFL), copied from the @fontsource packages to public/fonts/universe with their licences.
 * Writes src/data/universes.generated.json.
 *
 *   npm run universes
 *   npm run universes -- --only=genkidama     one background only (the others and the fonts stay as they are)
 *
 * The AI backgrounds are read on the external disk (BERETE_DISK, default "/Volumes/Disque externe"); BERETE_UNIVERSE_DIR
 * gives another folder.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DISK = process.env.BERETE_DISK ?? "/Volumes/Disque externe";
const SOURCE = process.env.BERETE_UNIVERSE_DIR ?? join(DISK, "Berete - Dossiers icloud", "00 Contexte Yoni", "Univers IA (propositions)");
const MASTERS = join(ROOT, ".local", "universes");
const OUT = join(ROOT, "public", "media", "universes");
const FONTS = join(ROOT, "public", "fonts", "universe");
const DATA = join(ROOT, "src", "data", "universes.generated.json");

const WIDTHS = [960, 1600, 2560];
const MOBILE_WIDTHS = [720, 1080];
/** On phones the piece sits in the top third of the screen: the heart of the image goes there. */
const MOBILE_AT_Y = 0.32;

/**
 * Each AI background: its file, its name in the admin, the heart of the image (placed behind the piece on computers) and
 * the point the portrait crop of the phones is centred on.
 */
const BACKDROPS = [
  { id: "dragon", file: "Dragon Ball - aura energie.png", name: "Aura d'énergie (Dragon Ball)", focus: [0.5, 0.48], mobile: [0.5, 0.48] },
  // 21/11/2026: the violet forest under the moon (its own portrait for phones). moon: the centre and the radius of the moon
  // (shares of the width), where it shines, barely (src/components/Universe.tsx, effect "moon").
  {
    id: "butterfly",
    file: "butterfly-foret-desktop.jpg",
    mobileFile: "butterfly-foret-mobile.jpg",
    name: "Forêt violette au clair de lune (Butterfly)",
    focus: [0.62, 0.5],
    mobile: [0.5, 0.5],
    moon: [0.7105, 0.1125, 0.0475],
    mobileMoon: [0.4985, 0.1255, 0.167],
  },
  { id: "inter", file: "Inter Milan - stade de nuit.png", name: "Stade de nuit (Inter Milan)", focus: [0.5, 0.5], mobile: [0.5, 0.42] },
  // 21/11/2026: the stadium at night, red flares and golden confetti (its own portrait for phones).
  { id: "vfb", file: "vfb-stade-desktop.jpg", mobileFile: "vfb-stade-mobile.jpg", name: "Stade de nuit, fumigènes rouges et confettis dorés (VfB Stuttgart)", focus: [0.6, 0.48], mobile: [0.5, 0.5] },
  { id: "tunnel", file: "Noah Okafor - tunnel vestiaire.png", name: "Tunnel du vestiaire (Noah Okafor)", focus: [0.5, 0.55], mobile: [0.5, 0.5] },
  // Black, the sphere of light at the top (20/11/2026: large enough as they are, never enlarged; a portrait of its own
  // for phones). core: the centre and the radius of the sphere (share of the width), for its glow and the particles
  // that rise to it (src/components/Universe.tsx, "genkidama").
  {
    id: "genkidama",
    file: "dragon-ball-genkidama-desktop.jpg",
    mobileFile: "dragon-ball-genkidama-mobile.jpg",
    name: "Genkidama, sphère de lumière (Dragon Ball)",
    focus: [0.5, 0.42],
    mobile: [0.5, 0.5],
    core: [0.5, 0.148, 0.15],
    mobileCore: [0.5, 0.223, 0.26],
  },
];

/**
 * The 15 universes of 21/11/2026 (Yoni): each image in two versions, "<id>-desktop.jpg" and "<id>-mobile.jpg" (its own
 * portrait for phones). focus: the heart of the computer image, placed behind the piece.
 * spots: the lights of the image that come alive (src/components/Universe.tsx, effect "scene"), on the computer image (d)
 * and on the phone image (m): x and sizes as shares of the width, y and heights as shares of the height (see SPOT_PARAMS
 * there for the meaning of each number, by kind); tone: their colour. A spot without "m" is not drawn on a phone.
 * regions: where some effects of the canvas happen (src/components/universe/fx.ts), [left, top, right, bottom].
 */
const scene = (id, name, focus, extra = {}) => ({ id, file: id + "-desktop.jpg", mobileFile: id + "-mobile.jpg", name, focus, mobile: [0.5, 0.5], ...extra });
const SCENES = [
  scene("arene", "Arène de combat, projecteur doré (Lasana Keita)", [0.64, 0.55], {
    spots: [
      { k: "cone", tone: "gold", d: [0.643, 0.01, 0.3, 0.62, 0], m: [0.5, 0.01, 0.78, 0.5, 0] },
      { k: "glow", tone: "gold", d: [0.643, 0.03, 0.07], m: [0.5, 0.025, 0.17] },
    ],
  }),
  scene("bianconero", "Stade en noir et blanc, rayures de lumière (Kenan Yildiz)", [0.66, 0.5], {
    spots: [0.42, 0.515, 0.64, 0.765, 0.885].map((x) => ({ k: "beam", tone: "white", d: [x, 0, 0.05, 0.8] })).concat(
      [0.18, 0.395, 0.605, 0.805].map((x) => ({ k: "beam", tone: "white", m: [x, 0, 0.075, 0.7] })),
    ),
    regions: { crowd: { d: [0.4, 0.44, 1, 0.76], m: [0, 0.64, 1, 0.81] } },
  }),
  scene("serpent", "Temple sombre, serpents dorés, lueur rouge (Marcus Thuram)", [0.66, 0.5], {
    spots: [{ k: "glow", tone: "red", d: [0.79, 0.5, 0.12], m: [0.5, 0.93, 0.4] }],
    regions: { path: { d: [0.42, 0.12, 0.98, 0.86], m: [0.08, 0.1, 0.92, 0.72] } },
  }),
  scene("sirius", "Ciel étoilé, l'étoile Sirius (Sirius)", [0.62, 0.5], {
    spots: [{ k: "star", tone: "blue", d: [0.732, 0.299, 0.035], m: [0.498, 0.173, 0.085] }],
  }),
  // The sails of its two windmills turn (computer image: they are drawn by the site, the painted ones removed from a copy
  // of the image by scripts/universe-inpaint.py; on a phone the windmill is under the texts, it stays as painted).
  scene("tulipes", "Champ de tulipes au crépuscule, moulins (Tulips on Tour)", [0.66, 0.55], {
    sails: ["0.8215,0.1823,0.062,-85,177,9", "0.6129,0.2467,0.028,-82,178,11"],
    spots: [
      { k: "glow", tone: "warm", d: [0.86, 0.29, 0.16], m: [0.5, 0.61, 0.42] },
      { k: "sails", d: [0.8215, 0.1823, 0.062], i: 0 },
      { k: "sails", d: [0.6129, 0.2467, 0.028], i: 1 },
    ],
  }),
  scene("flaneur", "Rue de Paris la nuit sous la pluie (Flâneur)", [0.6, 0.5], {
    spots: [
      { k: "glow", tone: "warm", d: [0.411, 0.136, 0.05], m: [0.249, 0.198, 0.12] },
      { k: "glow", tone: "warm", d: [0.418, 0.425, 0.016], m: [0.27, 0.442, 0.035] },
      { k: "ripples", tone: "warm", d: [0.3, 0.68, 0.7, 0.32], m: [0, 0.64, 1, 0.36] },
    ],
    regions: { lamp: { d: [0.34, 0.06, 0.48, 0.34], m: [0.1, 0.12, 0.42, 0.4] } },
  }),
  scene("trefle", "Jardin émeraude, trèfles et rosée (Eljero Elia)", [0.66, 0.55], {
    spots: [{ k: "glow", tone: "green", d: [0.66, 0.12, 0.17], m: [0.55, 0.04, 0.4] }],
    regions: { dew: { d: [0.42, 0.5, 0.95, 0.86], m: [0, 0.62, 1, 1] } },
  }),
  scene("the-hand", "Rideau de velours rouge, faisceau de lumière (The Hand)", [0.68, 0.5], {
    spots: [
      { k: "glow", tone: "warm", d: [0.75, 0.18, 0.06], m: [0.46, 0, 0.16] },
      { k: "folds", d: [0.46, 0, 0.18, 1], m: [0, 0, 0.36, 1] },
      { k: "folds", d: [0.78, 0, 0.2, 1], m: [0.64, 0, 0.36, 1] },
    ],
    regions: { beam: { d: [0.6, 0.16, 0.8, 0.66], m: [0.36, 0, 0.6, 0.46] } },
  }),
  scene("forge", "Forge, or en fusion, étincelles (Kevin Schade)", [0.64, 0.55], {
    spots: [
      { k: "glow", tone: "fire", d: [0.66, 0.53, 0.1], m: [0.49, 0.9, 0.3] },
      { k: "heat", d: [0.58, 0.22, 0.16, 0.3], m: [0.28, 0.58, 0.44, 0.3] },
    ],
    regions: { fire: { d: [0.62, 0.5, 0.71, 0.57], m: [0.38, 0.86, 0.6, 0.94] } },
  }),
  scene("sacre", "Cathédrale, rayons à travers les vitraux (Lumière sacrée)", [0.62, 0.5], {
    spots: [{ k: "rays", tone: "warm", d: [0.76, 0.38, 0.42, 50], m: [0.52, 0.2, 0.86, 19] }],
  }),
  scene("roses", "Roseraie de nuit (Roseraie)", [0.66, 0.5], {
    spots: [{ k: "glow", tone: "white", d: [0.53, 0.01, 0.12], m: [0.4, 0.08, 0.3] }],
    regions: { dew: { d: [0.45, 0.15, 1, 0.98], m: [0, 0.28, 1, 0.98] } },
  }),
  scene("velours", "Salon de velours, bougies (Velours rubis)", [0.7, 0.5], {
    spots: [
      ...[[0.589, 0.262], [0.625, 0.35], [0.644, 0.31], [0.94, 0.352], [0.897, 0.405]].map(([x, y], i) => ({ k: "flame", tone: "warm", d: [x, y, 0.012], i })),
      ...[[0.437, 0.575], [0.503, 0.625], [0.539, 0.588], [0.989, 0.66]].map(([x, y], i) => ({ k: "flame", tone: "warm", m: [x, y, 0.03], i })),
      { k: "wisp", d: [0.822, 0.585, 0.028], m: [0.853, 0.765, 0.07] },
    ],
  }),
  scene("facettes", "Salle de miroirs facettés (Facettes)", [0.6, 0.5]),
  scene("mecanique", "Mouvement de montre géant (Mécanique)", [0.7, 0.5], {
    spots: [
      { k: "spin", d: [0.845, 0.165, 0.11], m: [0.17, 0.12, 0.2] },
      { k: "spin", d: [0.928, 0.565, 0.1] },
      { k: "swing", d: [0.545, 0.632, 0.12], m: [0.6, 0.835, 0.19] },
      { k: "swing", m: [0.79, 0.185, 0.17] },
    ],
  }),
  scene("n14", "Ciel doux, une constellation qui dessine un N (N14)", [0.66, 0.5], {
    // The stars of the N, in the order they light up (the tail, the first leg, the diagonal, the last leg).
    spots: [
      ...[[0.548, 0.728], [0.613, 0.711], [0.622, 0.669], [0.68, 0.317], [0.629, 0.254], [0.659, 0.263], [0.726, 0.369], [0.712, 0.447], [0.76, 0.632], [0.811, 0.337], [0.822, 0.269], [0.843, 0.233]].map(([x, y], i) => ({ k: "star", tone: "rose", seq: true, d: [x, y, 0.016], i })),
      ...[[0.384, 0.316], [0.383, 0.14], [0.496, 0.229], [0.605, 0.315], [0.606, 0.142]].map(([x, y], i) => ({ k: "star", tone: "rose", seq: true, m: [x, y, 0.045], i })),
    ],
  }),
];
BACKDROPS.push(...SCENES);

/*
 * The night of Lasana Keita (21/11/2026, the celebration of the "Black Panther" after a knockout in the first round, out
 * of the cage to the front row): three images that follow one another slowly behind his panther, the knockout (the
 * panther of smoke leaping), the open cage (the path of light to a seat of the front row), the celebration (his silhouette
 * from behind, applauding himself before the crowd). The phone image of the celebration shows him sitting in the cage:
 * its phone portrait is a crop of the computer image instead, around his silhouette (mobileCrop: its centre, share of
 * the width). Each image has its spotlight; the crowd of the celebration has its camera flashes (region "crowd").
 */
const KEITA = [
  scene("keita-ko", "Le KO : la panthère de fumée qui bondit (Lasana Keita)", [0.64, 0.4], {
    spots: [
      { k: "cone", tone: "gold", d: [0.643, 0, 0.3, 0.62, 0], m: [0.58, 0, 0.7, 0.45, 0] },
      { k: "glow", tone: "gold", d: [0.643, 0.02, 0.07], m: [0.58, 0.01, 0.17] },
    ],
  }),
  {
    ...scene("keita-cage", "La cage ouverte, le chemin de lumière (Lasana Keita)", [0.63, 0.55], {
      spots: [
        { k: "cone", tone: "gold", d: [0.635, 0.08, 0.26, 0.7, 0], m: [0.58, 0, 0.62, 0.55, 0] },
        { k: "glow", tone: "gold", d: [0.635, 0.1, 0.06], m: [0.58, 0.01, 0.16] },
      ],
    }),
    file: "keita-cage-ouverte-desktop.jpg",
    mobileFile: "keita-cage-ouverte-mobile.jpg",
  },
  {
    ...scene("keita-tribune", "La célébration : il s'applaudit face à la foule (Lasana Keita)", [0.67, 0.5], {
      spots: [
        { k: "cone", tone: "gold", d: [0.64, 0, 0.32, 0.6, 0], m: [0.55, 0, 0.8, 0.5, 0] },
        { k: "glow", tone: "gold", d: [0.64, 0.02, 0.08], m: [0.55, 0.01, 0.2] },
      ],
      regions: { crowd: { d: [0.22, 0.4, 1, 0.72], m: [0, 0.42, 1, 0.75] } },
    }),
    mobileFile: null,
    mobileCrop: 0.665,
  },
];
BACKDROPS.push(...KEITA);

/*
 * The Hand (21/11/2026): an endless space of blue and black, a sphere of light like an eclipse, lines of light rushing to
 * it, rings of light, a mirror floor. core: the centre and the radius of the sphere (share of the width), on the computer
 * image and on the phone one: the piece stands before it, its light breathes, the lines rush to it, the rings ripple from it
 * (effect "void"). Nothing of the animation it recalls (no character, no logo, no font, no name of the work).
 */
BACKDROPS.push({
  ...scene("infini", "Espace infini bleu, sphère de lumière et anneaux (The Hand)", [0.711, 0.39]),
  file: "vide-infini-desktop.jpg",
  mobileFile: "vide-infini-mobile.jpg",
  core: [0.711, 0.388, 0.078],
  mobileCore: [0.5, 0.383, 0.233],
});

/*
 * Sirius, since 21/11/2026 (it replaces the starry sky): a Japanese night, a blood moon, a pagoda, oni masks with red eyes,
 * lightning in the clouds. Its lights: the moon breathing; the eyes of each mask that glow now and then (eye: both eyes of
 * one mask share their number i, so they light up together); a flash in the clouds around each painted bolt (flash).
 * Measured on the images of Yoni (crops with a grid, 21/11/2026).
 */
const EYES_D = [
  [0.4681, 0.5453, 0.012, 0],
  [0.5099, 0.5299, 0.012, 0],
  [0.8392, 0.6806, 0.012, 1],
  [0.8857, 0.7102, 0.012, 1],
];
const EYES_M = [
  [0.8999, 0.2791, 0.017, 0],
  [0.955, 0.2643, 0.017, 0],
  [0.0618, 0.3638, 0.016, 1],
  [0.1153, 0.3792, 0.016, 1],
  [0.1867, 0.6078, 0.01, 2],
  [0.2114, 0.605, 0.01, 2],
  [0.7694, 0.5738, 0.014, 3],
  [0.8132, 0.5778, 0.014, 3],
  [0.5553, 0.7316, 0.01, 4],
  [0.5772, 0.7367, 0.01, 4],
  [0.0784, 0.7682, 0.014, 5],
  [0.1234, 0.7587, 0.014, 5],
  [0.7973, 0.8159, 0.019, 6],
  [0.8875, 0.8296, 0.019, 6],
];
BACKDROPS.push(
  scene("sirius-japon", "Nuit japonaise, lune de sang, pagode, masques oni (Sirius)", [0.668, 0.42], {
    spots: [
      { k: "glow", tone: "red", d: [0.668, 0.2945, 0.13], m: [0.5, 0.152, 0.3] },
      ...EYES_D.map(([x, y, r, i]) => ({ k: "eye", tone: "red", d: [x, y, r], i })),
      ...EYES_M.map(([x, y, r, i]) => ({ k: "eye", tone: "red", m: [x, y, r], i })),
      { k: "flash", tone: "storm", d: [0.48, 0.31, 0.075], m: [0.21, 0.205, 0.17], i: 0 },
      { k: "flash", tone: "storm", d: [0.886, 0.29, 0.075], m: [0.78, 0.17, 0.17], i: 1 },
    ],
  }),
);

/** Backdrops made of several images that follow one another in a slow fade (src/components/Universe.tsx): hold = seconds each. */
const SEQUENCES = [{ id: "keita", name: "La nuit de Lasana Keita : KO, cage ouverte, célébration (séquence)", frames: ["keita-ko", "keita-cage", "keita-tribune"], hold: 8 }];

/** The title fonts: package, file (latin letters only: the titles of the site), and the part of Yuji Boku that holds 力. */
const FONT_FILES = [
  ["shojumaru", "shojumaru-latin-400-normal"],
  ["italiana", "italiana-latin-400-normal"],
  ["cinzel", "cinzel-latin-600-normal"],
  ["grenze-gotisch", "grenze-gotisch-latin-600-normal"],
  ["big-shoulders-display", "big-shoulders-display-latin-700-normal"],
  ["pirata-one", "pirata-one-latin-400-normal"],
  ["marcellus-sc", "marcellus-sc-latin-400-normal"],
  ["bodoni-moda", "bodoni-moda-latin-500-italic"],
  ["michroma", "michroma-latin-400-normal"],
  ["poiret-one", "poiret-one-latin-400-normal"],
  ["fraunces", "fraunces-latin-600-italic"],
  ["syncopate", "syncopate-latin-700-normal"],
  ["tenor-sans", "tenor-sans-latin-400-normal"],
  ["yuji-boku", "yuji-boku-115-400-normal"],
];

async function master(b) {
  const src = join(SOURCE, b.file);
  if (!existsSync(src)) throw new Error("AI background not found: " + src);
  // Already wider than the largest file of the site: used as it is (never the enlarged master of a former image).
  if (((await sharp(src).metadata()).width ?? 0) >= WIDTHS[WIDTHS.length - 1]) return src;
  const file = join(MASTERS, b.id + ".png");
  if (existsSync(file)) return file;
  await mkdir(MASTERS, { recursive: true });
  console.log("Enlarging " + b.file + " (a few minutes)");
  const r = spawnSync("python3", ["-I", join(ROOT, "scripts", "universe-upscale.py"), src, file], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("upscale failed: " + b.file);
  return file;
}

/** The computer image without the sails of its windmills (b.sails): a copy made once, kept with the masters. */
async function withoutSails(b) {
  const src = join(SOURCE, b.file);
  const file = join(MASTERS, b.id + "-without-sails.png");
  if (existsSync(file)) return file;
  await mkdir(MASTERS, { recursive: true });
  const r = spawnSync("python3", ["-I", join(ROOT, "scripts", "universe-inpaint.py"), src, file, ...b.sails], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("removing the sails failed: " + b.file);
  return file;
}

async function write(image, base) {
  await image.clone().avif({ quality: 52, effort: 6 }).toFile(base + ".avif");
  await image.clone().webp({ quality: 74, effort: 6 }).toFile(base + ".webp");
}

async function backdrop(b) {
  const file = b.sails ? await withoutSails(b) : await master(b);
  const { width, height } = await sharp(file).metadata();
  for (const w of WIDTHS) await write(sharp(file).resize({ width: w }), join(OUT, b.id + "-" + w));
  if (b.mobileCrop) {
    // Its phone portrait cropped from the computer image (9:16 of its full height), around a point (share of the width).
    const w = Math.round((height * 9) / 16);
    const left = Math.round(Math.min(width - w, Math.max(0, b.mobileCrop * width - w / 2)));
    for (const mw of MOBILE_WIDTHS) await write(sharp(file).extract({ left, top: 0, width: w, height }).resize({ width: mw, height: Math.round((mw * 16) / 9), kernel: "lanczos3" }), join(OUT, b.id + "-m-" + mw));
    console.log("  + " + b.id + " (" + width + " x " + height + ", portrait cropped at " + b.mobileCrop + ")");
    return { name: b.name, ratio: Math.round((width / height) * 1000) / 1000, focusX: b.focus[0], focusY: b.focus[1], widths: WIDTHS, mobileWidths: MOBILE_WIDTHS, portrait: true, spots: b.spots, regions: b.regions };
  }
  if (b.mobileFile) {
    // Its own portrait for phones: 9:16, from the middle of it.
    const src = join(SOURCE, b.mobileFile);
    if (!existsSync(src)) throw new Error("AI background not found: " + src);
    for (const mw of MOBILE_WIDTHS) await write(sharp(src).resize({ width: mw, height: Math.round((mw * 16) / 9), fit: "cover", kernel: "lanczos3" }), join(OUT, b.id + "-m-" + mw));
    console.log("  + " + b.id + " (" + width + " x " + height + ", its own portrait)");
    // portrait: made for a whole phone screen, it also surrounds the stories of its piece (src/components/stories/StoryViewer.tsx).
    return { name: b.name, ratio: Math.round((width / height) * 1000) / 1000, focusX: b.focus[0], focusY: b.focus[1], widths: WIDTHS, mobileWidths: MOBILE_WIDTHS, portrait: true, core: b.core, mobileCore: b.mobileCore, moon: b.moon, mobileMoon: b.mobileMoon, spots: b.spots, regions: b.regions };
  }
  // The portrait of the phones: 9:16, the heart of the image a third from the top.
  const [fx, fy] = b.mobile;
  const h = Math.floor(Math.min(height, (fy * height) / MOBILE_AT_Y, ((1 - fy) * height) / (1 - MOBILE_AT_Y)));
  const w = Math.floor((h * 9) / 16);
  const left = Math.round(Math.min(width - w, Math.max(0, fx * width - w / 2)));
  const top = Math.round(Math.min(height - h, Math.max(0, fy * height - MOBILE_AT_Y * h)));
  for (const mw of MOBILE_WIDTHS) {
    await write(sharp(file).extract({ left, top, width: w, height: h }).resize({ width: mw, height: Math.round((mw * 16) / 9), kernel: "lanczos3" }), join(OUT, b.id + "-m-" + mw));
  }
  console.log("  + " + b.id + " (" + width + " x " + height + ", portrait from " + w + " x " + h + ")");
  return { name: b.name, ratio: Math.round((width / height) * 1000) / 1000, focusX: b.focus[0], focusY: b.focus[1], widths: WIDTHS, mobileWidths: MOBILE_WIDTHS };
}

async function fonts() {
  await rm(FONTS, { recursive: true, force: true });
  await mkdir(FONTS, { recursive: true });
  const licences = [];
  for (const [pkg, file] of FONT_FILES) {
    const dir = join(ROOT, "node_modules", "@fontsource", pkg);
    await copyFile(join(dir, "files", file + ".woff2"), join(FONTS, file + ".woff2"));
    const licence = (await readdir(dir)).find((n) => /^LICEN[CS]E/i.test(n));
    if (licence) licences.push("=== " + pkg + " (" + file + ".woff2) ===\n\n" + (await readFile(join(dir, licence), "utf8")).trim());
  }
  await writeFile(join(FONTS, "LICENSES.txt"), "Fonts of the universes of the pieces: SIL Open Font License, Version 1.1.\n\n" + licences.join("\n\n") + "\n");
  console.log("  + " + FONT_FILES.length + " fonts in public/fonts/universe");
}

await mkdir(OUT, { recursive: true });
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",") ?? null;
let backdrops = {};
if (only) {
  try {
    backdrops = JSON.parse(await readFile(DATA, "utf8")).backdrops ?? {};
  } catch {
    /* first run */
  }
}
for (const b of BACKDROPS) if (!only || only.includes(b.id) || SEQUENCES.some((q) => only.includes(q.id) && q.frames.includes(b.id))) backdrops[b.id] = await backdrop(b);
// A sequence: the sizes of its first image, its images in their order.
for (const q of SEQUENCES) {
  const first = backdrops[q.frames[0]];
  if (first && q.frames.every((f) => backdrops[f])) backdrops[q.id] = { ...first, name: q.name, sequence: q.frames, hold: q.hold, spots: undefined, regions: undefined, portrait: q.frames.every((f) => backdrops[f].portrait) };
}
// In the order of the list.
const order = [...BACKDROPS.map((b) => b.id), ...SEQUENCES.map((q) => q.id)];
backdrops = Object.fromEntries(order.filter((id) => backdrops[id]).map((id) => [id, backdrops[id]]));
if (!only) await fonts();
await writeFile(DATA, JSON.stringify({ backdrops }, null, 1) + "\n");
console.log("  = src/data/universes.generated.json");
