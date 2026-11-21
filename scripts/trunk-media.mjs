#!/usr/bin/env node
/**
 * The opening of the Signature Trunks (feedback of Yoni, 21/11/2026): for each trunk, its image closed, its image open and
 * the film of its opening (6 s, square, from the closed image to the open one), made by Yoni in the same staging (a base
 * of black marble, the same angle, the same light). Read from the external disk (never modified), written for the web:
 *   public/media/trunks/<box>/closed-<w>.{avif,webp}, open-<w>.{avif,webp}   (720, 1080, 1440 px, square)
 *   public/media/trunks/<box>/opening.mp4                                   (1080 px square, H.264, silent, light)
 *   public/media/boxes/<box>/closed.webp, open.webp (1600 px, and their smaller copies): its photos on the page of the
 *                                                                           trunks, for a trunk whose photos they replace
 * and src/data/trunks.generated.json. The originals never go in Git.
 *
 *   npm run trunks                      (every trunk)
 *   npm run trunks -- --only=sirius     (one trunk, by the file name of Yoni; the others stay as they are)
 *
 * BERETE_DISK gives another disk, BERETE_TRUNK_DIR another folder.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { makeSizes } from "./media-sizes.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DISK = process.env.BERETE_DISK ?? "/Volumes/Disque externe";
const SOURCE = process.env.BERETE_TRUNK_DIR ?? join(DISK, "Berete - Dossiers icloud", "00 Contexte Yoni", "Ecrins IA (ouverture)");
const OUT = join(ROOT, "public", "media", "trunks");
const DATA = join(ROOT, "src", "data", "trunks.generated.json");
const WIDTHS = [720, 1080, 1440];
const VIDEO = 1080;
/** The photos of a trunk on the page of the trunks (its gallery), when its images replace its old photos. */
const PHOTOS = new Set(["sirius"]);
const PHOTO = 1600;
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);

/** The file name of Yoni -> the address of the box (src/data/pieces.ts, BOXES). The Dragon Ball trunk has none (rights). */
const TRUNKS = [
  ["signature", "signature-trunk"],
  ["sirius", "sirius"],
  ["tulips", "tulips-on-tour"],
  ["butterfly", "butterfly-trunk"],
  ["okafor", "okafor-trunk"],
  ["inter", "campione-d-italia-case"],
  ["nz", "nz-travel-case"],
];

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) throw new Error(cmd + " failed: " + args.join(" "));
}

const duration = (file) => Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).stdout.toString().trim());

if (!existsSync(SOURCE)) {
  console.error("Folder of the trunks not found (plug the disk in): " + SOURCE);
  process.exit(1);
}
// One trunk alone: the others keep what was made for them.
const trunks = ONLY.length > 0 && existsSync(DATA) ? JSON.parse(readFileSync(DATA, "utf8")).trunks : {};
for (const [name, slug] of TRUNKS) {
  if (ONLY.length > 0 && !ONLY.includes(name)) continue;
  const dir = join(OUT, slug);
  await mkdir(dir, { recursive: true });
  for (const state of ["closed", "open"]) {
    const src = join(SOURCE, name + "-" + state + ".jpg");
    for (const w of WIDTHS) {
      const img = sharp(src).resize(w, w, { fit: "cover", kernel: "lanczos3" });
      await img.clone().avif({ quality: 55, effort: 6 }).toFile(join(dir, state + "-" + w + ".avif"));
      await img.clone().webp({ quality: 78, effort: 6 }).toFile(join(dir, state + "-" + w + ".webp"));
    }
  }
  const film = join(SOURCE, name + "-ouverture.mp4");
  const out = join(dir, "opening.mp4");
  // Silent, square, every frame kept (it must end exactly on the open image), light enough for a phone.
  run("ffmpeg", ["-loglevel", "error", "-y", "-i", film, "-an", "-vf", "scale=" + VIDEO + ":" + VIDEO + ":flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-maxrate", "2200k", "-bufsize", "4400k", "-profile:v", "high", "-movflags", "+faststart", "-map_metadata", "-1", out]);
  trunks[slug] = { base: "/media/trunks/" + slug, widths: WIDTHS, video: "/media/trunks/" + slug + "/opening.mp4", size: VIDEO, duration: Math.round(duration(out) * 100) / 100 };
  if (PHOTOS.has(name)) {
    const photos = join(ROOT, "public", "media", "boxes", slug);
    await mkdir(photos, { recursive: true });
    for (const state of ["closed", "open"]) await sharp(join(SOURCE, name + "-" + state + ".jpg")).resize(PHOTO, PHOTO, { fit: "cover", kernel: "lanczos3" }).webp({ quality: 82, effort: 6 }).toFile(join(photos, state + ".webp"));
    trunks[slug].photos = ["closed", "open"].map((state) => ({ src: "/media/boxes/" + slug + "/" + state + ".webp", width: PHOTO, height: PHOTO }));
  }
  console.log("  + " + slug + " (" + trunks[slug].duration + " s)");
}
// In the order of the list, whatever was made first.
const ordered = Object.fromEntries(TRUNKS.map(([, slug]) => slug).filter((slug) => trunks[slug]).map((slug) => [slug, trunks[slug]]));
await writeFile(DATA, JSON.stringify({ trunks: ordered }, null, 1) + "\n");
// The smaller copies of the photos (phones, thumbnails).
await makeSizes();
console.log("  = src/data/trunks.generated.json");
