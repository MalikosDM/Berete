#!/usr/bin/env node
/**
 * Photos sent by Yoni outside the folders of the pieces (23/11/2026), for the site:
 *   - the studio images of two pieces that had no clean photo of the jewel alone (00 Contexte Yoni/Pieces sans photo pro
 *     (IA)/): the cover and the first photo of their page (TM of Malik Tillman, Thorned T of Marcus Thuram), their older
 *     photos after them;
 *   - the real studio photos of the JL pendant of Jamie Leweling, sent on WhatsApp (they replace its studio image), the
 *     best front view first;
 *   - the photos of the Bosnia and Herzegovina ring, retouched on black (00 Contexte Yoni/Bague Bosnie (retouche fond noir)/),
 *     in the order of Yoni;
 *   - the Inter Milan pendant (the top of the Inter ring worn on a chain): on black, and worn (WhatsApp);
 *   - the real photos of the Campione d'Italia case, for its gallery (WhatsApp), whole;
 *   - the photos of Yoni for the page The House (WhatsApp), whole;
 *   - the large image at the top of the page of the trunks: the Dragon Ball trunk closed, its artwork and the BRT mark
 *     (00 Contexte Yoni/Ecrins IA (ouverture) v3/dragon-ball-trunk/closed.jpg), whole.
 *   - the evening of 23/11/2026 (WhatsApp): the Butterfly trunk open on its chain, the trunks of Keita and of Malik Tillman,
 *     Keita at the boutique, and a film: the setting of the wings of the Butterfly (copied as it was sent, without sound).
 * A photo on black of a whole jewel is framed on it (the black around it trimmed, an even margin kept, 4:5); a close-up
 * that fills its photo, a photo of a box, of a person or of a scene is kept whole (resized only: nothing cut away, never
 * an artwork of a piece or of a box).
 * Read on the external disk and in the WhatsApp folder of the Desktop (never modified), written for the web with their
 * version in their name (no cache keeps an older one): public/media/extra/<key>/<name>.<v>.webp (1600 px on the long side)
 * and its copies .w160, .w640, .w1080 (src/lib/responsive.ts), listed in src/data/extra.generated.json. The originals never
 * go in Git.
 *
 *   npm run extra-media
 *   npm run extra-media -- --only=<key>,<key>      (the other keys keep their files and their entry)
 *
 * BERETE_DISK gives another disk, BERETE_WA_DIR another folder for the photos sent on WhatsApp.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { MARGIN, SIZES, sizedPath } from "./media-sizes.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DISK = process.env.BERETE_DISK ?? "/Volumes/Disque externe";
const YONI = join(DISK, "Berete - Dossiers icloud", "00 Contexte Yoni");
const WA = process.env.BERETE_WA_DIR ?? join(homedir(), "Desktop", "Yoni envoie whatsapp");
const STORIES = join(DISK, "Berete - Stories");
const OUT = join(ROOT, "public", "media", "extra");
const DATA = join(ROOT, "src", "data", "extra.generated.json");
const LONG = 1600;

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;

const STUDIO = "Pieces sans photo pro (IA)";
const BOSNIA = "Bague Bosnie (retouche fond noir)";
/** The order of Yoni (23/11/2026): the face first. */
const BOSNIA_ORDER = ["04497", "04499", "04512", "04509", "04487", "04504", "04506", "04507", "04508", "04513", "04514", "04462", "04467", "04469", "04470", "04478", "04489"];
/** A photo sent on WhatsApp on 23/11/2026, by the time in its name ("09.50.36 (2)"). */
const wa = (time) => "wa:WhatsApp Image 2026-11-23 at " + time + ".jpeg";
/** A story of "Berete - Stories" ("<folder>/<file>"). */
const story = (file) => "story:" + file;
/** A video sent on WhatsApp on 23/11/2026. */
const waVideo = (time) => "wa:WhatsApp Video 2026-11-23 at " + time + ".mp4";

/*
 * Each key (a piece, "boxes/<box>", "house", "players/<person>"): its photos, [name on the site, file, how]. The file: a
 * path in 00 Contexte Yoni, "wa:<file>" (the WhatsApp folder) or "story:<folder>/<file>" (Berete - Stories). How: "frame"
 * (a whole jewel on black, framed on it in 4:5), [x, y, w, h] (the part kept, fractions of the photo), else the photo
 * whole (a transparent PNG keeps its transparency).
 */
const PIECES = {
  "malik-tillman-tm-pendant": [["studio", join(STUDIO, "malik-tillman-tm-pendant-studio-ia.jpg")]],
  "marcus-thuram-thorned-t-pendant": [["studio", join(STUDIO, "marcus-thuram-thorned-t-pendant-studio-ia.jpg")]],
  // The real studio photos of the JL (23/11/2026), looked at one by one; "09.50.36 (5)" is the same file as (3): left out.
  // On black: the front view (the left corner of the J touches the edge of the photo), the pendant turned to the left
  // (its bail on the left, the only one with black all around it), turned to the right (its bail touches the right edge),
  // then the close-ups, kept whole: the J and its bail, the baguettes, the foot of the L, the back with the BRT mark. Last,
  // the two on dark red velvet (not black): the whole pendant, a close-up.
  "jamie-leweling-jl-pendant": [
    ["front", wa("09.50.36"), "frame"],
    ["left", wa("09.50.35"), "frame"],
    ["right", wa("09.50.36 (2)"), "frame"],
    ["bail", wa("09.50.36 (3)")],
    ["baguettes", wa("09.50.36 (6)")],
    ["foot", wa("09.50.36 (7)")],
    ["back", wa("09.50.36 (8)")],
    ["velvet", wa("09.50.36 (1)")],
    ["velvet-detail", wa("09.50.36 (4)")],
  ],
  "bosnia-and-herzegovina-world-cup-2026-ring": BOSNIA_ORDER.map((n) => ["b" + n, join(BOSNIA, "bosnie-" + n + "-fond-noir.jpg"), "frame"]),
  // The top of the Inter ring worn as a pendant (23/11/2026): on black, its chain leaving the photo at the top (4:5 around
  // the pendant, the chain above it), and worn on a black T-shirt (whole).
  "campione-d-italia-pendant": [
    ["black", wa("09.43.30"), [0, 0.1484, 1, 0.7031]],
    ["worn", wa("09.42.43")],
  ],
  // The real Campione d'Italia case, open on the ring, the medal and the card, then closed (23/11/2026): whole.
  "boxes/campione-d-italia-case": [
    ["p1", wa("09.36.59")],
    ["p2", wa("09.36.59 (1)")],
    ["p3", wa("09.36.59 (2)")],
    ["p4", wa("09.36.59 (3)")],
    ["p5", wa("09.36.59 (4)")],
    ["p6", wa("09.36.59 (5)")],
  ],
  // Yoni for The House (23/11/2026), whole. Not "09.34.58" (an evening, a person not identified).
  house: [
    ["desk-smile", wa("00.50.54")],
    ["loupe", wa("00.50.56")],
    ["desk-tray", wa("09.59.50")],
    ["desk-smile-wide", wa("09.59.50 (1)")],
    ["desk-scale", wa("09.59.50 (2)")],
    ["desk-pointing", wa("09.59.50 (3)")],
    ["inter-case-open", wa("09.34.18")],
    ["inter-case-closed", wa("09.34.18 (1)")],
    ["inter-ring", wa("09.34.18 (2)")],
    ["inter-rings", wa("09.40.13")],
  ],
  // The top of the page of the trunks: the Dragon Ball trunk closed, lit from above (23/11/2026, its v3 image), whole.
  "boxes/hero": [["dragon-ball-closed", join("Ecrins IA (ouverture) v3", "dragon-ball-trunk", "closed.jpg")]],
  // The evening of 23/11/2026 (WhatsApp, 16 h 25 to 17 h 22), looked at one by one, every photo whole:
  // the Butterfly trunk open, its chain and its pendant inside; the best first (open, from the front).
  "boxes/butterfly-trunk": [
    ["open-front", wa("16.36.49")],
    ["open-tray", wa("16.36.50 (1)")],
    ["tray-front", wa("16.36.50")],
    ["chain", wa("16.36.50 (2)")],
    ["lid", wa("16.36.49 (1)")],
  ],
  // The trunk of Keita (« celle de Keita »): its face with his photograph and his belts, then its face BRT.
  "boxes/keita-trunk": [
    ["face", wa("16.25.47")],
    ["brt", wa("16.26.17")],
    ["brt-above", wa("16.26.17 (1)")],
  ],
  // The trunk of Malik Tillman (« Malik tilman »): its face with his photograph « USA », its face in grey python with the
  // BRT mark, then open (black suede, the BRT mark in its lid, a round place held by straps), beside its tray.
  "boxes/tillman-trunk": [
    ["face", wa("16.33.43 (2)")],
    ["brt", wa("16.33.43 (3)")],
    ["open", wa("16.33.43")],
    ["open-tray", wa("16.33.43 (1)")],
  ],
  // Keita at the boutique of the house, with his trunk: his photos, and "Worn by" of the panther.
  "players/keita-losene": [["boutique", wa("16.50.18")]],
  // The setting of the wings of the Butterfly pendant (« Sertissage papillon »), the film of its step "setting": whole,
  // silent, its first frame as its poster.
  "michy-batshuayi-butterfly-pendant": [["setting", waVideo("16.32.56"), "video"]],
  // The studio images sent the evening of 23/11/2026 (Pieces sans photo pro (IA)), whole: the first photo of their gallery
  // (their cutout, scripts/cutouts.mjs, opens their page).
  "kevin-schade-twisted-chain": [["studio", join(STUDIO, "kevin-schade-twisted-chain-studio-ia.jpg")]],
  "radja-nainggolan-iced-watch": [["studio", join(STUDIO, "radja-nainggolan-iced-watch-studio-ia.jpg")]],
  "tajon-buchanan-iced-watch": [["studio", join(STUDIO, "tajon-buchanan-iced-watch-studio-ia.jpg")]],
  "marcus-thuram-skeleton-watch": [["studio", join(STUDIO, "marcus-thuram-skeleton-watch-studio-ia.jpg")]],
  "tanguy-nianzou-fam-medallion": [["studio", join(STUDIO, "tanguy-nianzou-fam-medallion-studio-ia.jpg")]],
  // The L of Deniz Undav cut out by hand (transparent PNG): whole, its transparency kept (WebP with alpha).
  "deniz-undav-l-pendant": [["studio", join(STUDIO, "deniz-undav-l-pendant-detoure.png")]],
  // Marcus Thuram with Kanye West and a third person, wearing his T (story 20/06): the photo only, without the frame of the
  // Instagram post around it; its right edge trimmed so that the "several photos" icon of Instagram in its corner goes.
  "players/marcus-thuram": [["kanye", story("20 Thuram SS23/20 Thuram SS23 - 06.jpg"), [0.0589, 0.1901, 0.8078, 0.6188]]],
};

const sourceOf = (file) => (file.startsWith("wa:") ? join(WA, file.slice(3)) : file.startsWith("story:") ? join(STORIES, file.slice(6)) : join(YONI, file));

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
  // Larger than the photo on one side: still 4:5, smaller on the other side.
  if (Math.abs(fw / fh - 0.8) > 0.01) {
    if (fw / fh > 0.8) fw = Math.round((fh * 4) / 5);
    else fh = Math.round((fw * 5) / 4);
  }
  const cx = left + w / 2;
  const cy = top + h / 2;
  const x = Math.round(Math.min(width - fw, Math.max(0, cx - fw / 2)));
  const y = Math.round(Math.min(height - fh, Math.max(0, cy - fh / 2)));
  return sharp(await img.clone().extract({ left: x, top: y, width: fw, height: fh }).toBuffer());
}

/** The part of a photo kept, [x, y, w, h] in fractions of it. */
async function cropped(file, [x, y, w, h]) {
  const img = sharp(file).rotate();
  const { width, height } = await img.metadata();
  const left = Math.round(x * width);
  const top = Math.round(y * height);
  return sharp(await img.clone().extract({ left, top, width: Math.min(width - left, Math.round(w * width)), height: Math.min(height - top, Math.round(h * height)) }).toBuffer());
}

/**
 * A film, whole: its picture as it was sent when it is already H.264 (copied, nothing lost), else H.264 at its own size in
 * high quality; its sound removed (a step of the making-of plays silent), ready to start before it is all loaded; its
 * poster: an early frame, in WebP.
 */
async function video(src, dir, name) {
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,pix_fmt,width,height:stream_side_data=rotation:format=duration", "-of", "json", src], { encoding: "utf8" }));
  const out = join(dir, name + ".mp4");
  const h264 = probe.streams[0].codec_name === "h264" && probe.streams[0].pix_fmt === "yuv420p";
  const encode = h264 ? ["-c:v", "copy"] : ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high"];
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-an", ...encode, "-movflags", "+faststart", "-map_metadata", "-1", out]);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "0.3", "-i", out, "-frames:v", "1", "-c:v", "libwebp", "-quality", "88", join(dir, name + "-poster.webp")]);
  const { width, height } = probe.streams[0];
  const rotated = Math.abs(Number(probe.streams[0].side_data_list?.[0]?.rotation ?? 0)) === 90;
  return { name, video: true, width: rotated ? height : width, height: rotated ? width : height, duration: Math.round(Number(probe.format.duration) * 10) / 10 };
}

const keys = Object.keys(PIECES).filter((k) => !ONLY || ONLY.has(k));
for (const key of keys) {
  for (const [, file] of PIECES[key]) {
    if (!existsSync(sourceOf(file))) {
      console.error("Not found (plug the disk in, or check the WhatsApp folder): " + sourceOf(file) + "\nNothing was changed.");
      process.exit(1);
    }
  }
}
let data = {};
try {
  data = JSON.parse(readFileSync(DATA, "utf8"));
} catch {
  /* first run */
}
await mkdir(OUT, { recursive: true });
for (const key of keys) {
  const photos = PIECES[key];
  const dir = join(OUT, key);
  const tmp = join(dirname(dir), "." + basename(dir) + ".tmp");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const made = [];
  for (const [name, file, how] of photos) {
    const src = sourceOf(file);
    if (how === "video") {
      made.push(await video(src, tmp, name));
      continue;
    }
    const img = how === "frame" ? await framed(src) : Array.isArray(how) ? await cropped(src, how) : sharp(src).rotate();
    const out = join(tmp, name + ".webp");
    const { width, height } = await img.clone().resize(LONG, LONG, { fit: "inside", kernel: "lanczos3", withoutEnlargement: true }).webp({ quality: 84, effort: 6 }).toFile(out);
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
  await mkdir(dirname(dir), { recursive: true });
  await rename(tmp, dir);
  const base = "/media/extra/" + key + "/";
  data[key] = Object.fromEntries(
    made.map((m) => [
      m.name,
      m.video
        ? { type: "video", src: base + m.name + "." + v + ".mp4", poster: base + m.name + "-poster." + v + ".webp", width: m.width, height: m.height, duration: m.duration, audio: false }
        : { src: base + m.name + "." + v + ".webp", width: m.width, height: m.height },
    ]),
  );
  console.log("  + " + key + " (" + v + ", " + made.length + " photo" + (made.length > 1 ? "s" : "") + ")");
}
// A key no longer listed loses its files and its entry.
for (const key of Object.keys(data)) {
  if (!PIECES[key]) {
    delete data[key];
    await rm(join(OUT, key), { recursive: true, force: true });
    console.log("  - " + key);
  }
}
await writeFile(DATA, JSON.stringify(Object.fromEntries(Object.keys(PIECES).filter((k) => data[k]).map((k) => [k, data[k]])), null, 1) + "\n");
console.log("  = src/data/extra.generated.json");
