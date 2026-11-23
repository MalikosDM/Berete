#!/usr/bin/env node
/**
 * Photos sent by Yoni outside the folders of the pieces (23/11/2026), for the site:
 *   - the studio images of three pieces that had no clean photo of the jewel alone (00 Contexte Yoni/Pieces sans photo pro
 *     (IA)/): the cover and the first photo of their page (JL of Jamie Leweling, TM of Malik Tillman, Thorned T of Marcus
 *     Thuram), their older photos after them;
 *   - the photos of the Bosnia and Herzegovina ring, retouched on black (00 Contexte Yoni/Bague Bosnie (retouche fond noir)/),
 *     in the order of Yoni; each framed on the ring (the black around it trimmed, an even margin kept, 4:5).
 * Read on the external disk (never modified), written for the web with their version in their name (no cache keeps an
 * older one): public/media/extra/<piece>/<name>.<v>.webp (1600 px on the long side) and its copies .w160, .w640, .w1080
 * (src/lib/responsive.ts), listed in src/data/extra.generated.json. The originals never go in Git.
 *
 *   npm run extra-media
 *
 * BERETE_DISK gives another disk.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { MARGIN, SIZES, sizedPath } from "./media-sizes.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DISK = process.env.BERETE_DISK ?? "/Volumes/Disque externe";
const YONI = join(DISK, "Berete - Dossiers icloud", "00 Contexte Yoni");
const OUT = join(ROOT, "public", "media", "extra");
const DATA = join(ROOT, "src", "data", "extra.generated.json");
const LONG = 1600;

const STUDIO = "Pieces sans photo pro (IA)";
const BOSNIA = "Bague Bosnie (retouche fond noir)";
/** The order of Yoni (23/11/2026): the face first. */
const BOSNIA_ORDER = ["04497", "04499", "04512", "04509", "04487", "04504", "04506", "04507", "04508", "04513", "04514", "04462", "04467", "04469", "04470", "04478", "04489"];

/** Each piece: its photos, [name on the site, file in 00 Contexte Yoni, framed on the jewel]. */
const PIECES = {
  "jamie-leweling-jl-pendant": [["studio", join(STUDIO, "jamie-leweling-jl-pendant-studio-ia.jpg"), false]],
  "malik-tillman-tm-pendant": [["studio", join(STUDIO, "malik-tillman-tm-pendant-studio-ia.jpg"), false]],
  "marcus-thuram-thorned-t-pendant": [["studio", join(STUDIO, "marcus-thuram-thorned-t-pendant-studio-ia.jpg"), false]],
  "bosnia-and-herzegovina-world-cup-2026-ring": BOSNIA_ORDER.map((n) => ["b" + n, join(BOSNIA, "bosnie-" + n + "-fond-noir.jpg"), true]),
};

/** The photo framed on the jewel: the black around it trimmed, then an even margin, in a 4:5 frame (black). */
async function framed(file) {
  const img = sharp(file).rotate();
  const { width, height } = await img.metadata();
  const { info } = await img.clone().trim({ background: "#000000", threshold: 28 }).toBuffer({ resolveWithObject: true });
  const left = -(info.trimOffsetLeft ?? 0);
  const top = -(info.trimOffsetTop ?? 0);
  const w = info.width;
  const h = info.height;
  // 4:5 around the jewel, with a margin of a fifth of its larger side.
  let fw = Math.max(w, (h * 4) / 5) * 1.4;
  let fh = (fw * 5) / 4;
  fw = Math.round(Math.min(fw, width));
  fh = Math.round(Math.min(fh, height));
  const cx = left + w / 2;
  const cy = top + h / 2;
  const x = Math.round(Math.min(width - fw, Math.max(0, cx - fw / 2)));
  const y = Math.round(Math.min(height - fh, Math.max(0, cy - fh / 2)));
  return sharp(await img.clone().extract({ left: x, top: y, width: fw, height: fh }).toBuffer());
}

for (const photos of Object.values(PIECES)) {
  for (const [, file] of photos) {
    if (!existsSync(join(YONI, file))) {
      console.error("Not found (plug the disk in): " + join(YONI, file));
      process.exit(1);
    }
  }
}
await mkdir(OUT, { recursive: true });
const data = {};
for (const [slug, photos] of Object.entries(PIECES)) {
  const dir = join(OUT, slug);
  const tmp = join(OUT, "." + slug + ".tmp");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const made = [];
  for (const [name, file, frame] of photos) {
    const src = join(YONI, file);
    const img = frame ? await framed(src) : sharp(src).rotate();
    const out = join(tmp, name + ".webp");
    const { width, height } = await img.clone().resize(LONG, LONG, { fit: "inside", kernel: "lanczos3" }).webp({ quality: 84, effort: 6 }).toFile(out);
    for (const size of SIZES) {
      if (width < size.width * MARGIN) continue;
      await img.clone().resize(size.width, null, { kernel: "lanczos3" }).webp({ quality: size.quality, effort: 6 }).toFile(sizedPath(out, size.width));
    }
    made.push({ name, width, height });
  }
  // Its version: a fingerprint of every file made for it, in every name.
  const files = (await readdir(tmp)).sort();
  const hash = createHash("sha256");
  for (const f of files) hash.update(f + "\0").update(readFileSync(join(tmp, f)));
  const v = hash.digest("hex").slice(0, 10);
  for (const f of files) await rename(join(tmp, f), join(tmp, f.replace(/^([^.]+)\./, "$1." + v + ".")));
  await rm(dir, { recursive: true, force: true });
  await rename(tmp, dir);
  data[slug] = Object.fromEntries(made.map((m) => [m.name, { src: "/media/extra/" + slug + "/" + m.name + "." + v + ".webp", width: m.width, height: m.height }]));
  console.log("  + " + slug + " (" + v + ", " + made.length + " photo" + (made.length > 1 ? "s" : "") + ")");
}
await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
console.log("  = src/data/extra.generated.json");
