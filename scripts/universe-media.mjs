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

async function write(image, base) {
  await image.clone().avif({ quality: 52, effort: 6 }).toFile(base + ".avif");
  await image.clone().webp({ quality: 74, effort: 6 }).toFile(base + ".webp");
}

async function backdrop(b) {
  const file = await master(b);
  const { width, height } = await sharp(file).metadata();
  for (const w of WIDTHS) await write(sharp(file).resize({ width: w }), join(OUT, b.id + "-" + w));
  if (b.mobileFile) {
    // Its own portrait for phones: 9:16, from the middle of it.
    const src = join(SOURCE, b.mobileFile);
    if (!existsSync(src)) throw new Error("AI background not found: " + src);
    for (const mw of MOBILE_WIDTHS) await write(sharp(src).resize({ width: mw, height: Math.round((mw * 16) / 9), fit: "cover", kernel: "lanczos3" }), join(OUT, b.id + "-m-" + mw));
    console.log("  + " + b.id + " (" + width + " x " + height + ", its own portrait)");
    // portrait: made for a whole phone screen, it also surrounds the stories of its piece (src/components/stories/StoryViewer.tsx).
    return { name: b.name, ratio: Math.round((width / height) * 1000) / 1000, focusX: b.focus[0], focusY: b.focus[1], widths: WIDTHS, mobileWidths: MOBILE_WIDTHS, portrait: true, core: b.core, mobileCore: b.mobileCore, moon: b.moon, mobileMoon: b.mobileMoon };
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
for (const b of BACKDROPS) if (!only || only.includes(b.id)) backdrops[b.id] = await backdrop(b);
// In the order of the list.
backdrops = Object.fromEntries(BACKDROPS.filter((b) => backdrops[b.id]).map((b) => [b.id, backdrops[b.id]]));
if (!only) await fonts();
await writeFile(DATA, JSON.stringify({ backdrops }, null, 1) + "\n");
console.log("  = src/data/universes.generated.json");
