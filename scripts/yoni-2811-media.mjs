#!/usr/bin/env node
/**
 * The photos of Yoni of 28/11/2026, for the site:
 *   - the FAM Medallion of Tanguy Nianzou (tanguy-nianzou-fam-medallion): 12 professional photos (fam-01 … fam-12.jpeg),
 *     looked at one by one on 28/11/2026: whole views on a dark bust, close-ups of the roses and the marquise-cut diamonds of
 *     the flowers, the edge, the back with the BRT emblem, the clasp of its chain, two photos where it is worn.
 *
 * Read first from "$BERETE_DISK/Berete - Dossiers icloud/00 Contexte Yoni/Yoni 28-11/" when that folder exists, else from
 * .local/yoni-2811/ (same layout: fam/; the originals never go in Git and are never modified). Written for the web with a
 * version (a fingerprint of the files of the group) in every name, as scripts/yoni-2711-media.mjs:
 *   public/media/yoni-2811/<group>/<name>.<v>.webp         a photo, 1600 px on its long side (+ .w160 / .w640 / .w1080)
 *   public/media/yoni-2811/<group>/<name>.<v>.loupe.webp   its loupe copy (scripts/loupe.mjs), in src/data/loupe.generated.json
 * and src/data/yoni2811.generated.json: { fam: [{ type, src, width, height, alt, kind, onBlack }] } in the order of FAM below
 * (kind: front, threequarter, centre, back, roses, pears, clasp, worn, other; alt: what is seen, in English).
 *
 *   node scripts/yoni-2811-media.mjs
 *   node scripts/yoni-2811-media.mjs --only=fam
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { LOUPE, LOUPE_MARGIN, saveLoupes } from "./loupe.mjs";
import { MARGIN, SIZES, sizedPath } from "./media-sizes.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DISK = process.env.BERETE_DISK ?? "/Volumes/Disque externe";
const DISK_DIR = join(DISK, "Berete - Dossiers icloud", "00 Contexte Yoni", "Yoni 28-11");
const LOCAL_DIR = join(ROOT, ".local", "yoni-2811");
const SRC = existsSync(DISK_DIR) ? DISK_DIR : LOCAL_DIR;
const OUT = join(ROOT, "public", "media", "yoni-2811");
const WEB = "/media/yoni-2811/";
const DATA = join(ROOT, "src", "data", "yoni2811.generated.json");
/** The long side of the page copy of a photo (as scripts/extra-media.mjs). */
const LONG = 1600;

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;

/**
 * The 12 photos of the FAM Medallion, in the order of the page (the whole front view first): [file, name, kind, alt]. The
 * stones in the flowers are marquise-cut (pointed at both ends, in rose-gold bezels on the stems), as its text says.
 * fam-01 is the only small one (1066 x 1600): no loupe copy.
 */
const FAM = [
  ["fam-06.jpeg", "front", "front", "The FAM medallion from the front on a dark bust: a round medallion paved with diamonds inside a fluted rose gold rim, the word FAM in polished rose gold gothic letters among rose gold roses, hanging from a diamond-set bail on a diamond-set Cuban chain"],
  ["fam-02.jpeg", "front-bust", "front", "The FAM medallion from the front on a dark leather bust, its diamond-set bail and Cuban chain above it"],
  ["fam-03.jpeg", "front-chain", "front", "The FAM medallion hanging from its diamond-set Cuban chain, seen from the front on a dark bust"],
  ["fam-08.jpeg", "centre", "centre", "The FAM medallion up close from the front: the polished rose gold letters FAM, rose gold roses and marquise-cut diamonds over the diamond pavé, inside its fluted rim"],
  ["fam-11.jpeg", "three-quarter", "threequarter", "The FAM medallion turned to the side on a dark bust, showing the depth of its fluted rose gold rim"],
  ["fam-05.jpeg", "angle-chain", "threequarter", "The FAM medallion seen at an angle on a dark bust, its diamond-set Cuban chain rising to the neck"],
  ["fam-01.jpeg", "edge", "other", "The edge of the FAM medallion up close: its fluted rose gold rim with a row of round diamonds around it, rose gold roses and marquise-cut diamonds on the face"],
  ["fam-04.jpeg", "roses", "roses", "Close-up of the top of the medallion: rose gold roses on a thorned stem with leaves, marquise-cut diamonds in rose gold bezels, the diamond pavé and the polished letters FAM"],
  ["fam-07.jpeg", "back", "back", "The back of the FAM medallion in rose gold, worked in a honeycomb of hexagonal cells around the BRT diamond emblem"],
  ["fam-09.jpeg", "clasp", "clasp", "The box clasp of the diamond-set Cuban chain, engraved with the BRT diamond emblem, reflected in black glass, the back of the medallion behind it"],
  ["fam-10.jpeg", "worn", "worn", "The FAM medallion worn on its diamond-set Cuban chain beside the NZ pendant, over a woven tapestry top"],
  ["fam-12.jpeg", "worn-hand", "worn", "The FAM medallion and the NZ pendant worn over a woven tapestry top, a hand in the foreground"],
];

/** A photo: its page copy (LONG px), its smaller copies, its loupe copy (none when the original is hardly larger). */
async function photo(input, dir, name) {
  const img = sharp(input).rotate();
  const out = join(dir, name + ".webp");
  const { width, height } = await img.clone().resize(LONG, LONG, { fit: "inside", kernel: "lanczos3", withoutEnlargement: true }).webp({ quality: 84, effort: 6 }).toFile(out);
  for (const size of SIZES) {
    if (width < size.width * MARGIN) continue;
    await img.clone().resize(size.width, null, { kernel: "lanczos3" }).webp({ quality: size.quality, effort: 6 }).toFile(sizedPath(out, size.width));
  }
  const zoom = join(dir, name + ".loupe.webp");
  const z = await img.clone().resize(LOUPE.long, LOUPE.long, { fit: "inside", kernel: "lanczos3", withoutEnlargement: true }).webp({ quality: LOUPE.quality, effort: 6 }).toFile(zoom);
  const kept = Math.max(z.width, z.height) >= Math.max(width, height) * LOUPE_MARGIN;
  if (!kept) await rm(zoom, { force: true });
  return { name, width, height, zoom: kept ? { width: z.width, height: z.height } : null };
}

/**
 * Makes one group in a temporary folder, versions every name with a fingerprint of all its files, then swaps it in place of
 * the old folder. Returns its entries and its loupe copies.
 */
async function group(key, make) {
  const dir = join(OUT, key);
  const tmp = join(OUT, "." + key + ".tmp");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const made = await make(tmp);
  const files = (await readdir(tmp)).filter((f) => !f.startsWith(".")).sort();
  const hash = createHash("sha256");
  for (const f of files) hash.update(f + "\0").update(readFileSync(join(tmp, f)));
  const v = hash.digest("hex").slice(0, 10);
  for (const f of files) await rename(join(tmp, f), join(tmp, f.replace(/^([^.]+)\./, "$1." + v + ".")));
  await rm(dir, { recursive: true, force: true });
  await rename(tmp, dir);
  const base = WEB + key + "/";
  const loupes = new Map();
  const items = made.map(([m, kind, alt]) => {
    const src = base + m.name + "." + v + ".webp";
    if (m.zoom) loupes.set(src, { src: base + m.name + "." + v + ".loupe.webp", ...m.zoom });
    return { type: "image", src, width: m.width, height: m.height, alt, kind, onBlack: false };
  });
  const size = files.reduce((s, f) => s + readFileSync(join(dir, f.replace(/^([^.]+)\./, "$1." + v + "."))).length, 0);
  console.log("  + " + key + " (" + v + ", " + files.length + " files, " + (size / 1e6).toFixed(1) + " MB)");
  return { items, loupes, prefix: base };
}

const GROUPS = {
  fam: async () => {
    const missing = FAM.map(([f]) => join(SRC, "fam", f)).filter((f) => !existsSync(f));
    if (missing.length) {
      console.error("Not found:\n  " + missing.join("\n  "));
      return null;
    }
    return group("fam", async (tmp) => {
      const made = [];
      for (const [file, name, kind, alt] of FAM) made.push([await photo(join(SRC, "fam", file), tmp, name), kind, alt]);
      return made;
    });
  },
};

console.log("Yoni 28/11: " + SRC);
await mkdir(OUT, { recursive: true });
let data = {};
try {
  data = JSON.parse(readFileSync(DATA, "utf8"));
} catch {
  /* first run */
}
const loupes = new Map();
const prefixes = [];
let failed = false;
for (const [key, makeGroup] of Object.entries(GROUPS)) {
  if (ONLY && !ONLY.has(key)) continue;
  const made = await makeGroup();
  if (!made) {
    failed = true;
    continue;
  }
  data[key] = made.items;
  for (const [k, value] of made.loupes) loupes.set(k, value);
  prefixes.push(made.prefix);
}
await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
console.log("  = src/data/yoni2811.generated.json");
if (prefixes.length) await saveLoupes(loupes, prefixes);
if (failed) process.exitCode = 1;
