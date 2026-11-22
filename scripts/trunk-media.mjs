#!/usr/bin/env node
/**
 * The Signature Trunks (Yoni, 22/11/2026): every box first closed, then open, in the same square frame
 * (src/components/TrunkReveal.tsx), and its real photos on the page of the trunks and on the page of its piece.
 *
 *  - "film": the opening made by Yoni (00 Contexte Yoni/Ecrins IA (ouverture) v2/<folder>/: closed.jpg, open.jpg and
 *    ouverture.mp4, square, silent): its two images and its film.
 *  - "photos": no film; it opens from one real photo to another (closed, then open), a light coming out of the box. From
 *    its professional photos (00 Contexte Yoni/Boites (photos pro)/<folder>/: 01 closed, 03 open), or for the boxes of
 *    before, from the real photos and films they already had (a frame of a film of the delivery).
 *    A photo that is not square is set whole in the square on its own background, blurred and darkened, its edges
 *    fading into it (nothing of the box is cut).
 *
 * Read from the external disk (never modified), written for the web:
 *   public/media/trunks/<box>/closed-<w>.{avif,webp}, open-<w>.{avif,webp}    (720, 1080, 1440 px, square)
 *   public/media/trunks/<box>/opening.mp4                                    ("film": 1080 px square, H.264, silent)
 *   public/media/trunks/<box>/photo-NN.webp (1600 px on the long side, and its copies of 160, 640, 1080 px): its
 *                                                                            professional photos (never in media/boxes:
 *                                                                            npm run import-media empties what it did not make there)
 * and src/data/trunks.generated.json. The originals never go in Git.
 *
 *   npm run trunks                          (every box)
 *   npm run trunks -- --only=sirius,the-hand-cube   (some boxes, by their address; the others stay as they are)
 *
 * BERETE_DISK gives another disk.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { MARGIN, SIZES, sizedPath } from "./media-sizes.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DISK = process.env.BERETE_DISK ?? "/Volumes/Disque externe";
const ICLOUD = join(DISK, "Berete - Dossiers icloud");
const YONI = join(ICLOUD, "00 Contexte Yoni");
const FILMS = join(YONI, "Ecrins IA (ouverture) v2");
const PRO = join(YONI, "Boites (photos pro)");
const STORIES = join(DISK, "Berete - Stories");
const OUT = join(ROOT, "public", "media", "trunks");
const DATA = join(ROOT, "src", "data", "trunks.generated.json");
const WIDTHS = [720, 1080, 1440];
const SQUARE = 2048;
const VIDEO = 1080;
const PHOTO = 1600;
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);

/**
 * Each box, in the order of the page: its address (src/data/pieces.ts, BOXES), the folder of its film, the folder of its
 * professional photos, and for a box that opens from photos, its closed and open images:
 *   "03"                          its professional photo 03 (by its number)
 *   { video, at, crop }           a frame of a film (at, in seconds), cropped to the box (shares of the frame: x, y, w, h)
 *   { file }                      another photo of the disk
 * `zoom` enlarges a photo that is not square in its square (its black edges cut first), `y` moves it (shares).
 */
const BOXES = [
  { slug: "signature-trunk", film: "signature-trunk", pro: "signature-trunk" },
  { slug: "sirius", film: "sirius", pro: "sirius" },
  { slug: "tulips-on-tour", film: "tulips-on-tour", pro: "tulips-on-tour" },
  { slug: "dragon-ball-trunk", pro: "dragon-ball-trunk", closed: "01", open: "03" },
  { slug: "the-hand-cube", pro: "the-hand-cube", closed: "01", open: "03" },
  { slug: "dfb-pokal-2025-display", pro: "vfb-pokal-vitrine", closed: "01", open: "03" },
  // Its 03 shows its side with the coat of arms, closed: its 04 shows it open (the glass lifted).
  { slug: "world-cup-display", pro: "bosnie-vitrine-coupe-du-monde", closed: "01", open: "04" },
  { slug: "photo-case", pro: "malle-photo-allemagne", closed: "01", open: "03" },
  { slug: "brt-coral-case", film: "malle-brt-corail", pro: "malle-brt-corail" },
  { slug: "trophy-trunk", film: "malle-photo-coupe-rouge", pro: "malle-photo-coupe-rouge" },
  // The boxes of before: their real photos (their old openings drawn by an AI invented their inside: removed).
  {
    slug: "campione-d-italia-case",
    closed: { file: join(ICLOUD, "25 Pendentif Inter Milan", "Photos", "25 Pendentif Inter Milan - 20.jpg") },
    open: { file: join(ICLOUD, "25 Pendentif Inter Milan", "Photos", "25 Pendentif Inter Milan - 22.jpg") },
  },
  {
    // The film of the delivery of Michy Batshuayi (HD): he lifts the lid, then the pendant in its trunk.
    slug: "butterfly-trunk",
    closed: { video: join(ICLOUD, "23 Chaine or rose", "Videos HD", "23 Chaine or rose - video 01 - MICHYV3.mp4"), at: 0.2, crop: [0, 0.4, 1, 0.5625] },
    open: { video: join(ICLOUD, "23 Chaine or rose", "Videos HD", "23 Chaine or rose - video 01 - MICHYV3.mp4"), at: 4.0, crop: [0, 0.42, 1, 0.5625] },
  },
  {
    // The story of the delivery of Noah Okafor: the lid with its photograph, then the tennis chains inside.
    slug: "okafor-trunk",
    closed: { video: join(STORIES, "11 Noah Okafor II", "11 Noah Okafor II - 03.mp4"), at: 0, crop: [0, 0.22, 1, 0.5625] },
    open: { video: join(STORIES, "11 Noah Okafor II", "11 Noah Okafor II - 03.mp4"), at: 7, crop: [0, 0.22, 1, 0.5625] },
  },
];

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) throw new Error(cmd + " failed: " + args.join(" "));
}
const duration = (file) => Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).stdout.toString().trim());

/** The professional photos of a box, in their order ("01-fermee.jpg", ...). */
const proPhotos = (folder) => (folder ? readdirSync(join(PRO, folder)).filter((f) => /^\d\d.*\.jpe?g$/i.test(f)).sort() : []);

/** One frame of a film, as a buffer (PNG). */
function frame(video, at) {
  const r = spawnSync("ffmpeg", ["-loglevel", "error", "-ss", String(at), "-i", video, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], { maxBuffer: 1 << 28 });
  if (r.status !== 0 || r.stdout.length === 0) throw new Error("no frame at " + at + " s of " + video);
  return r.stdout;
}

/** The source of a closed or open image, as a buffer. */
async function source(box, which) {
  const s = box[which];
  if (typeof s === "string") {
    const file = proPhotos(box.pro).find((f) => f.startsWith(s));
    if (!file) throw new Error(box.slug + ": no photo " + s);
    return readFileSync(join(PRO, box.pro, file));
  }
  if (s.file) return readFileSync(s.file);
  const img = sharp(frame(s.video, s.at));
  const { width, height } = await img.metadata();
  const [x, y, w, h] = s.crop;
  // The crop of a vertical film: as wide as the frame, as tall as it is wide (square).
  const left = Math.round(x * width);
  const cw = Math.round(w * width);
  const top = Math.round(y * height);
  const ch = Math.min(height - top, Math.round(h * height));
  return img.extract({ left, top, width: cw, height: ch }).png().toBuffer();
}

/**
 * A photo set whole in a square: on its own background (the photo covering the square, blurred and darkened), its edges
 * fading into it where it does not reach the sides.
 */
async function squared(buf, size, zoom = 1, dy = 0) {
  const meta = await sharp(buf).rotate().metadata();
  const w0 = meta.autoOrient?.width ?? meta.width;
  const h0 = meta.autoOrient?.height ?? meta.height;
  const scale = (size / Math.max(w0, h0)) * zoom;
  const w = Math.round(w0 * scale);
  const h = Math.round(h0 * scale);
  const base = sharp(buf).rotate();
  const bg = await base.clone().resize(size, size, { fit: "cover" }).blur(size / 28).modulate({ brightness: 0.5 }).toBuffer();
  const fg = await base.clone().resize(w, h, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer();
  // Its edges fade where the photo stops inside the square.
  const fx = w < size ? Math.round(w * 0.1) : 0;
  const fy = h < size ? Math.round(h * 0.1) : 0;
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const ay = fy ? Math.min(1, y / fy, (h - 1 - y) / fy) : 1;
    for (let x = 0; x < w; x++) {
      const ax = fx ? Math.min(1, x / fx, (w - 1 - x) / fx) : 1;
      const a = Math.max(0, Math.min(ax, ay));
      const i = (y * w + x) * 3;
      const o = (y * w + x) * 4;
      rgba[o] = fg[i];
      rgba[o + 1] = fg[i + 1];
      rgba[o + 2] = fg[i + 2];
      rgba[o + 3] = Math.round(255 * a * a * (3 - 2 * a));
    }
  }
  // Centred (a photo larger than the square after its zoom is cut evenly, moved by dy).
  const left = Math.round((size - w) / 2);
  const top = Math.round((size - h) / 2 + dy * size);
  const piece = sharp(rgba, { raw: { width: w, height: h, channels: 4 } });
  const cut = { left: Math.max(0, -left), top: Math.max(0, -top) };
  const vis = { width: Math.min(w - cut.left, size - Math.max(0, left)), height: Math.min(h - cut.top, size - Math.max(0, top)) };
  const layer = await piece.extract({ left: cut.left, top: cut.top, width: vis.width, height: vis.height }).png().toBuffer();
  return sharp(bg).composite([{ input: layer, left: Math.max(0, left), top: Math.max(0, top) }]).png().toBuffer();
}

async function writeSquare(buf, dir, state) {
  for (const w of WIDTHS) {
    const img = sharp(buf).resize(w, w, { fit: "cover", kernel: "lanczos3" });
    await img.clone().avif({ quality: 55, effort: 6 }).toFile(join(dir, state + "-" + w + ".avif"));
    await img.clone().webp({ quality: 78, effort: 6 }).toFile(join(dir, state + "-" + w + ".webp"));
  }
}

if (!existsSync(FILMS) || !existsSync(PRO)) {
  console.error("Folders of the trunks not found (plug the disk in): " + FILMS + " / " + PRO);
  process.exit(1);
}
// Some boxes alone: the others keep what was made for them.
const made = ONLY.length > 0 && existsSync(DATA) ? JSON.parse(readFileSync(DATA, "utf8")).trunks : {};
for (const box of BOXES) {
  if (ONLY.length > 0 && !ONLY.includes(box.slug)) continue;
  const dir = join(OUT, box.slug);
  // What an earlier opening left (the images and films drawn by an AI of the boxes of before).
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const entry = { base: "/media/trunks/" + box.slug, widths: WIDTHS, size: WIDTHS[WIDTHS.length - 1] };
  if (box.film) {
    const src = join(FILMS, box.film);
    for (const state of ["closed", "open"]) await writeSquare(readFileSync(join(src, state + ".jpg")), dir, state);
    const out = join(dir, "opening.mp4");
    // Silent, square, every frame kept (it ends on the open image), light enough for a phone.
    run("ffmpeg", ["-loglevel", "error", "-y", "-i", join(src, "ouverture.mp4"), "-an", "-vf", "scale=" + VIDEO + ":" + VIDEO + ":flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-maxrate", "2200k", "-bufsize", "4400k", "-profile:v", "high", "-movflags", "+faststart", "-map_metadata", "-1", out]);
    entry.video = entry.base + "/opening.mp4";
    entry.duration = Math.round(duration(out) * 100) / 100;
  } else {
    for (const state of ["closed", "open"]) {
      const s = box[state];
      await writeSquare(await squared(await source(box, state), SQUARE, s.zoom ?? box.zoom ?? 1, s.y ?? 0), dir, state);
    }
  }
  // Its professional photos, for its pages.
  const photos = [];
  for (const file of proPhotos(box.pro)) {
    const name = file.slice(0, 2);
    const out = join(dir, "photo-" + name + ".webp");
    const img = sharp(join(PRO, box.pro, file)).rotate();
    const info = await img.clone().resize(PHOTO, PHOTO, { fit: "inside", kernel: "lanczos3" }).webp({ quality: 82, effort: 6 }).toFile(out);
    const { width, height } = info;
    // Its smaller copies, named as the site expects them (src/lib/responsive.ts).
    for (const size of SIZES) {
      if (width < size.width * MARGIN) continue;
      await img.clone().resize(size.width, null, { kernel: "lanczos3" }).webp({ quality: size.quality, effort: 6 }).toFile(sizedPath(out, size.width));
    }
    photos.push({ src: entry.base + "/photo-" + name + ".webp", width, height, file: file.replace(/\.jpe?g$/i, "") });
  }
  if (photos.length > 0) entry.photos = photos;
  made[box.slug] = entry;
  console.log("  + " + box.slug + (entry.video ? " (film " + entry.duration + " s)" : " (photos)") + (photos.length ? ", " + photos.length + " photos" : ""));
}
// In the order of the list, whatever was made first; a box no longer in it is dropped.
const ordered = Object.fromEntries(BOXES.map((b) => b.slug).filter((slug) => made[slug]).map((slug) => [slug, made[slug]]));
await writeFile(DATA, JSON.stringify({ trunks: ordered }, null, 1) + "\n");
console.log("  = src/data/trunks.generated.json");
