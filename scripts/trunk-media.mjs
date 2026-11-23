#!/usr/bin/env node
/**
 * The Signature Trunks (Yoni, 22/11/2026): every box opens and closes again in its own films, in the same square frame
 * (src/components/TrunkReveal.tsx); its professional photos stay in its gallery ("x photos") and on the page of its piece.
 *
 * Each box has its folder in 00 Contexte Yoni/Ecrins IA (ouverture) v3/<folder>/ (square, silent; Yoni, 23/11/2026: every
 * trunk in the same staging, a black marble base, a golden light from above, a fixed camera, 6 s, its real piece inside),
 * or still in "... v2/" for the boxes not made again yet (set "v2": kept off the page of the trunks, src/data/trunks.ts):
 *   closed.jpg, open.jpg          the box closed, open
 *   ouverture.mp4                 from closed to open
 *   fermeture.mp4                 from open to closed (the same film backwards)
 * and, for some, its professional photos in 00 Contexte Yoni/Boites (photos pro)/<folder>/ (01, 02, ...).
 *
 * Read from the external disk (never modified), written for the web, every name carrying the version of the box (a
 * fingerprint of what was made for it: nobody keeps an old file in a cache):
 *   public/media/trunks/<box>/closed-<w>.<v>.{avif,webp}, open-<w>.<v>.{avif,webp}   (720, 1080, 1440 px, square)
 *   public/media/trunks/<box>/opening.<v>.mp4, closing.<v>.mp4                     (1080 px square, H.264, silent)
 *   public/media/trunks/<box>/photo-NN.<v>.webp (1600 px on the long side, and its copies .w160, .w640, .w1080): its
 *                                               professional photos (never in media/boxes: npm run import-media
 *                                               empties what it did not make there)
 * and src/data/trunks.generated.json. The folder of a box is emptied first (nothing of an older opening stays), and a
 * folder of public/media/trunks that is no box of the list any more is removed. The originals never go in Git.
 *
 *   npm run trunks                                   (every box)
 *   npm run trunks -- --only=sirius,the-hand-cube    (some boxes, by their address; the others stay as they are)
 *
 * BERETE_DISK gives another disk.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { MARGIN, SIZES, sizedPath } from "./media-sizes.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DISK = process.env.BERETE_DISK ?? "/Volumes/Disque externe";
const YONI = join(DISK, "Berete - Dossiers icloud", "00 Contexte Yoni");
/** The folders of the films, by staging: "v3" (23/11/2026, on the page of the trunks), "v2" (the boxes waiting for theirs). */
const SETS = { v3: join(YONI, "Ecrins IA (ouverture) v3"), v2: join(YONI, "Ecrins IA (ouverture) v2") };
const PRO = join(YONI, "Boites (photos pro)");
const OUT = join(ROOT, "public", "media", "trunks");
const DATA = join(ROOT, "src", "data", "trunks.generated.json");
const WIDTHS = [720, 1080, 1440];
const VIDEO = 1080;
const PHOTO = 1600;
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);

/**
 * Each box, in the order of the page: its address (src/data/pieces.ts, BOXES), its staging (the folder of its films: v3 for
 * the 9 boxes made again on 23/11/2026, v2 for the 4 waiting for their v3 files: signature-trunk, photo-case, trophy-trunk,
 * campione-d-italia-case), the folder of its films, of its photos. A box gets "v3" the day its v3 folder arrives.
 */
const BOXES = [
  { slug: "signature-trunk", set: "v2", film: "signature-trunk", pro: "signature-trunk" },
  { slug: "sirius", set: "v3", film: "sirius", pro: "sirius" },
  { slug: "tulips-on-tour", set: "v3", film: "tulips-on-tour", pro: "tulips-on-tour" },
  { slug: "dragon-ball-trunk", set: "v3", film: "dragon-ball-trunk", pro: "dragon-ball-trunk" },
  { slug: "the-hand-cube", set: "v3", film: "the-hand-cube", pro: "the-hand-cube" },
  { slug: "dfb-pokal-2025-display", set: "v3", film: "dfb-pokal-2025-display", pro: "vfb-pokal-vitrine" },
  { slug: "world-cup-display", set: "v3", film: "world-cup-display", pro: "bosnie-vitrine-coupe-du-monde" },
  { slug: "photo-case", set: "v2", film: "photo-case", pro: "malle-photo-allemagne" },
  { slug: "brt-coral-case", set: "v3", film: "malle-brt-corail", pro: "malle-brt-corail" },
  { slug: "trophy-trunk", set: "v2", film: "malle-photo-coupe-rouge", pro: "malle-photo-coupe-rouge" },
  // No professional photos: their gallery keeps their real photos (src/data/pieces.ts).
  { slug: "campione-d-italia-case", set: "v2", film: "campione-d-italia-case" },
  { slug: "butterfly-trunk", set: "v3", film: "butterfly-trunk" },
  { slug: "okafor-trunk", set: "v3", film: "okafor-trunk" },
];

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) throw new Error(cmd + " failed: " + args.join(" "));
}
const duration = (file) => Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).stdout.toString().trim());

/** The professional photos of a box, in their order ("01-fermee.jpg", ...). */
const proPhotos = (folder) => (folder && existsSync(join(PRO, folder)) ? readdirSync(join(PRO, folder)).filter((f) => /^\d\d.*\.jpe?g$/i.test(f)).sort() : []);

/** "closed-720.webp" -> "closed-720.<v>.webp", "photo-01.w640.webp" -> "photo-01.<v>.w640.webp". */
const versioned = (file, v) => file.replace(/^([^.]+)\./, "$1." + v + ".");

async function writeSquare(file, dir, state) {
  for (const w of WIDTHS) {
    const img = sharp(file).resize(w, w, { fit: "cover", kernel: "lanczos3" });
    await img.clone().avif({ quality: 55, effort: 6 }).toFile(join(dir, state + "-" + w + ".avif"));
    await img.clone().webp({ quality: 78, effort: 6 }).toFile(join(dir, state + "-" + w + ".webp"));
  }
}

/** A film of the box: silent, square, every frame kept (it starts and ends on its images), light enough for a phone. */
function writeFilm(src, out) {
  run("ffmpeg", ["-loglevel", "error", "-y", "-i", src, "-an", "-vf", "scale=" + VIDEO + ":" + VIDEO + ":flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-maxrate", "2200k", "-bufsize", "4400k", "-profile:v", "high", "-movflags", "+faststart", "-map_metadata", "-1", out]);
  return Math.round(duration(out) * 100) / 100;
}

if (!existsSync(SETS.v3)) {
  console.error("Folder of the trunks not found (plug the disk in): " + SETS.v3);
  process.exit(1);
}
for (const box of BOXES) {
  if (ONLY.length > 0 && !ONLY.includes(box.slug)) continue;
  for (const f of ["closed.jpg", "open.jpg", "ouverture.mp4", "fermeture.mp4"]) {
    if (!existsSync(join(SETS[box.set], box.film, f))) {
      console.error(box.slug + ": " + join(SETS[box.set], box.film, f) + " is missing");
      process.exit(1);
    }
  }
}
// Some boxes alone: the others keep what was made for them.
const made = ONLY.length > 0 && existsSync(DATA) ? JSON.parse(readFileSync(DATA, "utf8")).trunks : {};
for (const box of BOXES) {
  if (ONLY.length > 0 && !ONLY.includes(box.slug)) continue;
  const dir = join(OUT, box.slug);
  const tmp = join(OUT, "." + box.slug + ".tmp");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const src = join(SETS[box.set], box.film);
  for (const state of ["closed", "open"]) await writeSquare(join(src, state + ".jpg"), tmp, state);
  const openingDuration = writeFilm(join(src, "ouverture.mp4"), join(tmp, "opening.mp4"));
  const closingDuration = writeFilm(join(src, "fermeture.mp4"), join(tmp, "closing.mp4"));
  // Its professional photos, for its gallery.
  const photos = [];
  for (const file of proPhotos(box.pro)) {
    const name = file.slice(0, 2);
    const out = join(tmp, "photo-" + name + ".webp");
    const img = sharp(join(PRO, box.pro, file)).rotate();
    const { width, height } = await img.clone().resize(PHOTO, PHOTO, { fit: "inside", kernel: "lanczos3" }).webp({ quality: 82, effort: 6 }).toFile(out);
    // Its smaller copies, named as the site expects them (src/lib/responsive.ts).
    for (const size of SIZES) {
      if (width < size.width * MARGIN) continue;
      await img.clone().resize(size.width, null, { kernel: "lanczos3" }).webp({ quality: size.quality, effort: 6 }).toFile(sizedPath(out, size.width));
    }
    photos.push({ name: "photo-" + name + ".webp", width, height, file: file.replace(/\.jpe?g$/i, "") });
  }
  // Its version: a fingerprint of every file made for it.
  const files = (await readdir(tmp)).sort();
  const hash = createHash("sha256");
  for (const f of files) hash.update(f + "\0").update(readFileSync(join(tmp, f)));
  const v = hash.digest("hex").slice(0, 10);
  for (const f of files) await rename(join(tmp, f), join(tmp, versioned(f, v)));
  await rm(dir, { recursive: true, force: true });
  await rename(tmp, dir);
  const base = "/media/trunks/" + box.slug;
  const entry = {
    base,
    set: box.set,
    version: v,
    widths: WIDTHS,
    size: WIDTHS[WIDTHS.length - 1],
    opening: base + "/" + versioned("opening.mp4", v),
    closing: base + "/" + versioned("closing.mp4", v),
    duration: openingDuration,
    closingDuration,
  };
  if (photos.length > 0) entry.photos = photos.map(({ name, ...p }) => ({ src: base + "/" + versioned(name, v), ...p }));
  made[box.slug] = entry;
  console.log("  + " + box.slug + " (" + v + ", films " + openingDuration + " s / " + closingDuration + " s" + (photos.length ? ", " + photos.length + " photos" : "") + ")");
}
// A folder that is no box of the list any more (an old box, an interrupted run).
const slugs = new Set(BOXES.map((b) => b.slug));
for (const d of await readdir(OUT)) {
  if (!slugs.has(d)) {
    await rm(join(OUT, d), { recursive: true, force: true });
    console.log("  - " + d);
  }
}
// In the order of the list, whatever was made first; a box no longer in it is dropped.
const ordered = Object.fromEntries(BOXES.map((b) => b.slug).filter((slug) => made[slug]).map((slug) => [slug, made[slug]]));
await writeFile(DATA, JSON.stringify({ trunks: ordered }, null, 1) + "\n");
console.log("  = src/data/trunks.generated.json");
