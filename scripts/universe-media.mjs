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
  { id: "butterfly", file: "Butterfly - metamorphose.png", name: "Métamorphose (chrysalide et papillons)", focus: [0.66, 0.55], mobile: [0.74, 0.42] },
  { id: "inter", file: "Inter Milan - stade de nuit.png", name: "Stade de nuit (Inter Milan)", focus: [0.5, 0.5], mobile: [0.5, 0.42] },
  { id: "vfb", file: "VfB Stuttgart - finale fumee rouge.png", name: "Finale, fumée rouge (VfB Stuttgart)", focus: [0.5, 0.5], mobile: [0.5, 0.4] },
  { id: "tunnel", file: "Noah Okafor - tunnel vestiaire.png", name: "Tunnel du vestiaire (Noah Okafor)", focus: [0.5, 0.55], mobile: [0.5, 0.5] },
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
  const file = join(MASTERS, b.id + ".png");
  if (existsSync(file)) return file;
  const src = join(SOURCE, b.file);
  if (!existsSync(src)) throw new Error("AI background not found: " + src);
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
const backdrops = {};
for (const b of BACKDROPS) backdrops[b.id] = await backdrop(b);
await fonts();
await writeFile(DATA, JSON.stringify({ backdrops }, null, 1) + "\n");
console.log("  = src/data/universes.generated.json");
