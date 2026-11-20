#!/usr/bin/env node
/**
 * Media import for the Berete Jewellers site.
 *
 * Reads the owner's folders, writes optimised files to public/media/ and the
 * data files the site reads (src/data/stories.generated.json and
 * src/data/media.generated.json). Safe to run again after adding files: every
 * output has a fixed name, finished outputs are skipped, and files whose
 * source disappeared are removed.
 *
 *   npm run import-media                 # everything
 *   npm run import-media -- --only=stories,site,scroll,brand,sketches,hd,films,house,players
 *   npm run import-media -- --force      # re-encode everything
 *
 * Source folders: all on the external disk (BERETE_DISK, default "/Volumes/Disque externe"), each one overridable with
 * its environment variable. The disk must be connected: a missing source stops the run before anything is written
 * (a missing folder would otherwise empty its part of public/media).
 *   BERETE_STORIES_DIR  <disk>/Berete - Stories  (the Instagram highlights, one "NN Name" folder each, "00 Couvertures")
 *   BERETE_SITE_DIR     <disk>/Berete - Envoi ODORO  (the photos and films of the site)
 *   BERETE_LOGO_FILE    <disk>/Berete - Stories/berete_jewellers-cropped.svg
 *   BERETE_BOUTIQUE_DIR <disk>/Berete - Boutique Bijoutier (export ODORO)
 *   BERETE_SKETCHES_DIR <disk>/Berete - Croquis/Croquis main de Yoni (site)  (one "<slug of the piece>.jpg" per
 *                       piece, the hand of Yoni drawing it in his atelier: step "The Original Vision" of "The Making of
 *                       a Masterpiece"; section "sketches")
 *   BERETE_OLD_SKETCHES_DIR <disk>/Berete - Croquis  (the first sketches, before 20/11/2026: kept for a piece the
 *                       folder above does not have)
 *   BERETE_HOUSE_DIR    <disk>/Berete - La Maison  (the personal photos of Yoni for The House: one
 *                       "<place>.jpg" per place, "portrait", "citation-1", "chapitre-03"..., src/data/house.ts;
 *                       section "house")
 *   BERETE_HD_DIR       <disk>/Berete - Dossiers icloud  (the high-resolution
 *                       photos and videos of Yoni, chosen in scripts/hd-media.mjs; section "hd"; the films of the
 *                       atelier, making-of and finished piece, chosen in scripts/film-media.mjs; section "films")
 *   BERETE_PLAYERS_DIR  <BERETE_HD_DIR>/00 Contexte Yoni/Photos joueurs en maillot  (the players in their jersey, one
 *                       folder per person; photos and crops chosen in scripts/player-media.mjs; section "players")
 *
 * The main photos of the pieces taken from the stories (frames, crops) and
 * the photos of the boxes are listed in scripts/piece-media.mjs.
 *
 * Needs ffmpeg and ffprobe (with libx264 and libwebp) on the PATH.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { cpus, tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { copyOf, makeSizes } from "./media-sizes.mjs";
import { fileURLToPath } from "node:url";
import { BOUTIQUE_VIDEOS, PORTRAITS, STILLS } from "./piece-media.mjs";
import { HD } from "./hd-media.mjs";
import { FILMS, KIND_WORDS } from "./film-media.mjs";
import sharp from "sharp";
import { PLAYERS } from "./player-media.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const MEDIA = join(PUBLIC, "media");
const DATA = join(ROOT, "src", "data");
const CACHE_FILE = join(ROOT, "scripts", ".import-media-cache.json");

/** The external disk that holds every file of the project (since 19/11/2026: CLAUDE.md, "Où sont les fichiers"). */
const DISK = process.env.BERETE_DISK ?? join("/Volumes", "Disque externe");
const STORIES_DIR = process.env.BERETE_STORIES_DIR ?? join(DISK, "Berete - Stories");
const SITE_DIR = process.env.BERETE_SITE_DIR ?? join(DISK, "Berete - Envoi ODORO");
const LOGO_FILE = process.env.BERETE_LOGO_FILE ?? join(DISK, "Berete - Stories", "berete_jewellers-cropped.svg");
const BOUTIQUE_DIR = process.env.BERETE_BOUTIQUE_DIR ?? join(DISK, "Berete - Boutique Bijoutier (export ODORO)");
const SKETCHES_DIR = process.env.BERETE_SKETCHES_DIR ?? join(DISK, "Berete - Croquis", "Croquis main de Yoni (site)");
const OLD_SKETCHES_DIR = process.env.BERETE_OLD_SKETCHES_DIR ?? join(DISK, "Berete - Croquis");
const HOUSE_DIR = process.env.BERETE_HOUSE_DIR ?? join(DISK, "Berete - La Maison");
const HD_DIR = process.env.BERETE_HD_DIR ?? join(DISK, "Berete - Dossiers icloud");
const PLAYERS_DIR = process.env.BERETE_PLAYERS_DIR ?? join(HD_DIR, "00 Contexte Yoni", "Photos joueurs en maillot");

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const onlyArg = args.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;
const runs = (section) => ONLY === null || ONLY.has(section);

/* ---------- Encoding settings ---------- */

const VIDEO = { maxW: 720, maxH: 1280, crf: 26, audio: "128k", maxFps: 30 };
const PHOTO = { maxW: 1080, quality: 80 };
const POSTER = { maxW: 720, quality: 72 };
const FRAMES = {
  // The full resolution of the films (1920 x 1080): drawn on large and retina screens, a smaller frame looks soft.
  desktop: { w: 1920, h: 1080, quality: 75, fps: 24 },
  // Portrait phones: the centre of the frame at its own size (608 x 1080), at half the frame rate.
  mobile: { w: 608, h: 1080, quality: 65, fps: 12 },
};
// A warm black and white, so the blue bench of the atelier stays in the palette.
const WARM_BW = "format=gray,format=rgb24,colorchannelmixer=rr=1:gg=0.93:bb=0.82";

/* ---------- Where each photo of the site goes (from the phrase_a_coller.txt files) ---------- */

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const SITE_GROUPS = [
  { key: "atelier", folder: "03 - Atelier", numbers: range(2, 5), filter: WARM_BW },
  { key: "pieces/vfb-stuttgart-dfb-pokal-2025", folder: "04 - Capsule VfB Stuttgart", numbers: range(1, 11) },
  { key: "pieces/campione-d-italia-2023-2024", folder: "05 - Capsule Inter", numbers: range(1, 3) },
  { key: "pieces/the-hand", folder: "06 - Pendentifs", numbers: range(1, 6) },
  // "White Hands": the celebration of Kenan Yildiz (his stories show it).
  { key: "pieces/kenan-yildiz-celebration-pendant", folder: "06 - Pendentifs", numbers: [7] },
  // "T-Serpent": the pendant of Marcus Thuram (story "Thuram").
  { key: "pieces/marcus-thuram-t-serpent-pendant", folder: "06 - Pendentifs", numbers: [8, 9] },
  // "The Jersey": the pendant of Noah Okafor.
  { key: "pieces/noah-okafor-jersey-pendant", folder: "06 - Pendentifs", numbers: [10] },
  // "RS": the AS of Angelo Stiller (story "Angelo Stiller", @angelo.stiller).
  { key: "pieces/angelo-stiller-as-pendant", folder: "06 - Pendentifs", numbers: range(11, 15) },
  // "Butterfly": the chain of Michy Batshuayi.
  { key: "pieces/michy-batshuayi-butterfly-chain", folder: "07 - Chaines", numbers: range(1, 4) },
  { key: "pieces/sirius", folder: "07 - Chaines", numbers: [5] },
  { key: "boxes/sirius", folder: "08 - Ecrins", numbers: range(1, 3) },
  { key: "boxes/tulips-on-tour", folder: "08 - Ecrins", numbers: [4] },
];

const SITE_VIDEOS = [{ key: "atelier/setting", folder: "03 - Atelier", number: 1, audio: false }];

const SCROLL_VIDEOS = [
  { key: "home", file: join("01 - Video accueil + prompt", "video_accueil.mp4"), start: 1.2 },
  { key: "process", file: join("02 - Video process", "video_process.mp4"), start: 0 },
];

/* Never read: rights not confirmed. */
const FORBIDDEN = "99 - NE PAS ENVOYER";

/* ---------- Small helpers ---------- */

const IMAGE_EXT = /\.(jpe?g|png|webp|heic)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v)$/i;

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const pad2 = (n) => String(n).padStart(2, "0");
const pad4 = (n) => String(n).padStart(4, "0");
const webPath = (abs) => "/" + relative(PUBLIC, abs).split("\\").join("/");

function run(cmd, argv) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, argv, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolvePromise(out) : reject(new Error(cmd + " failed (" + code + "): " + err.slice(-800)))));
  });
}

async function probe(file) {
  const json = JSON.parse(await run("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file]));
  const v = json.streams.find((s) => s.codec_type === "video");
  const a = json.streams.find((s) => s.codec_type === "audio");
  const [num, den] = String(v?.avg_frame_rate || v?.r_frame_rate || "0/1").split("/").map(Number);
  return {
    width: v ? Number(v.width) : 0,
    height: v ? Number(v.height) : 0,
    fps: den ? num / den : 0,
    duration: Number(json.format?.duration ?? v?.duration ?? 0),
    hasAudio: Boolean(a),
  };
}

async function pool(items, size, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.max(1, size) }, async () => {
    while (queue.length > 0) await worker(queue.shift());
  });
  await Promise.all(runners);
}

/* ---------- Cache: an output is redone only when its source or its recipe changed ---------- */

let cache = {};
try {
  cache = JSON.parse(await readFile(CACHE_FILE, "utf8"));
} catch {
  cache = {};
}
const produced = new Set();
let encoded = 0;
let skipped = 0;

async function upToDate(out, src, recipe) {
  if (FORCE || !existsSync(out)) return false;
  const s = await stat(src);
  const entry = cache[relative(ROOT, out)];
  if (entry) return entry.size === s.size && entry.mtime === Math.round(s.mtimeMs) && entry.recipe === recipe;
  // No cache yet (fresh copy of the project): a file newer than its source is kept, and remembered.
  if ((await stat(out)).mtimeMs < s.mtimeMs) return false;
  await remember(out, src, recipe);
  return true;
}

async function remember(out, src, recipe) {
  const s = await stat(src);
  cache[relative(ROOT, out)] = { size: s.size, mtime: Math.round(s.mtimeMs), recipe };
}

/** Produces `out` from `src` with ffmpeg, unless it is already up to date. */
async function produce(out, src, recipe, ffmpegArgs) {
  produced.add(out);
  if (await upToDate(out, src, recipe)) {
    skipped += 1;
    return;
  }
  await mkdir(dirname(out), { recursive: true });
  await run("ffmpeg", ["-v", "error", "-y", ...ffmpegArgs, out]);
  await remember(out, src, recipe);
  encoded += 1;
  console.log("  + " + relative(ROOT, out));
}

/* ---------- Recipes ---------- */

async function photo(src, out, filter = "") {
  const scale = "scale='min(" + PHOTO.maxW + ",iw)':-2:flags=lanczos";
  const vf = filter ? filter + "," + scale : scale;
  const recipe = "photo:" + PHOTO.maxW + ":" + PHOTO.quality + ":" + vf;
  await produce(out, src, recipe, ["-i", src, "-vf", vf, "-frames:v", "1", "-c:v", "libwebp", "-quality", String(PHOTO.quality), "-compression_level", "6"]);
  const p = await probe(out);
  return { type: "image", src: webPath(out), width: p.width, height: p.height };
}

async function poster(src, out) {
  const vf = "scale='min(" + POSTER.maxW + ",iw)':-2:flags=lanczos";
  await produce(out, src, "poster:" + vf + ":" + POSTER.quality, ["-i", src, "-vf", vf, "-frames:v", "1", "-c:v", "libwebp", "-quality", String(POSTER.quality)]);
  return webPath(out);
}

async function video(src, out, { audio = true } = {}) {
  const info = await probe(src);
  const filters = ["scale=w='min(" + VIDEO.maxW + ",iw)':h='min(" + VIDEO.maxH + ",ih)':force_original_aspect_ratio=decrease:force_divisible_by=2"];
  if (info.fps > VIDEO.maxFps + 0.5) filters.push("fps=" + VIDEO.maxFps);
  const keepAudio = audio && info.hasAudio;
  const recipe = "video:" + JSON.stringify(VIDEO) + ":" + filters.join(",") + ":" + keepAudio;
  const argv = ["-i", src, "-map", "0:v:0"];
  if (keepAudio) argv.push("-map", "0:a:0");
  argv.push("-vf", filters.join(","), "-c:v", "libx264", "-preset", "medium", "-crf", String(VIDEO.crf), "-profile:v", "high", "-pix_fmt", "yuv420p");
  if (keepAudio) argv.push("-c:a", "aac", "-b:a", VIDEO.audio, "-ac", "2");
  else argv.push("-an");
  argv.push("-movflags", "+faststart");
  await produce(out, src, recipe, argv);
  const p = await probe(out);
  const posterFile = out.replace(/\.mp4$/, "-poster.webp");
  return {
    type: "video",
    src: webPath(out),
    poster: await poster(out, posterFile),
    width: p.width,
    height: p.height,
    duration: Math.round(p.duration * 100) / 100,
    audio: p.hasAudio,
  };
}

/* ---------- Stories ---------- */

async function importStories() {
  if (!existsSync(STORIES_DIR)) {
    console.warn("Stories folder not found, skipped: " + STORIES_DIR);
    return null;
  }
  console.log("Stories: " + STORIES_DIR);
  const entries = await readdir(STORIES_DIR, { withFileTypes: true });
  const folders = entries
    .filter((e) => e.isDirectory())
    .map((e) => /^(\d{2}) (.+)$/.exec(e.name))
    .filter((m) => m !== null && m[1] !== "00")
    .map((m) => ({ number: Number(m[1]), folder: m[0], title: m[2].trim(), slug: slugify(m[2]) }))
    .sort((a, b) => a.number - b.number);

  const coversDir = join(STORIES_DIR, "00 Couvertures");
  const covers = existsSync(coversDir) ? await readdir(coversDir) : [];

  const jobs = [];
  const stories = [];
  for (const f of folders) {
    const dir = join(STORIES_DIR, f.folder);
    const files = (await readdir(dir))
      .map((name) => ({ name, m: /\s-\s(\d{2,3})\.([a-z0-9]+)$/i.exec(name) }))
      .filter((x) => x.m !== null && (IMAGE_EXT.test(x.name) || VIDEO_EXT.test(x.name)))
      .map((x) => ({ name: x.name, n: Number(x.m[1]) }))
      .sort((a, b) => a.n - b.n);
    const outDir = join(MEDIA, "stories", f.slug);
    const story = { number: f.number, slug: f.slug, folderTitle: f.title, cover: "", media: new Array(files.length) };
    stories.push(story);
    files.forEach((file, i) => {
      const src = join(dir, file.name);
      const isVideo = VIDEO_EXT.test(file.name);
      const out = join(outDir, pad2(file.n) + (isVideo ? ".mp4" : ".webp"));
      jobs.push({
        heavy: isVideo,
        go: async () => {
          const item = isVideo ? await video(src, out) : await photo(src, out);
          story.media[i] = { n: file.n, ...item };
        },
      });
    });
    const coverName = covers.find((c) => c.startsWith(pad2(f.number) + " ") && IMAGE_EXT.test(c));
    if (coverName) {
      jobs.push({
        heavy: false,
        go: async () => {
          const out = join(outDir, "cover.webp");
          await produce(out, join(coversDir, coverName), "cover:q82", ["-i", join(coversDir, coverName), "-vf", "scale='min(400,iw)':-2", "-c:v", "libwebp", "-quality", "82"]);
          story.cover = webPath(out);
        },
      });
    }
  }

  const cores = cpus().length;
  await pool(jobs.filter((j) => !j.heavy), cores, (j) => j.go());
  await pool(jobs.filter((j) => j.heavy), Math.max(1, Math.floor(cores / 4)), (j) => j.go());

  for (const s of stories) {
    if (!s.cover) {
      const first = s.media.find((m) => m.type === "image");
      s.cover = first ? first.src : (s.media[0]?.poster ?? "");
    }
  }
  return stories;
}

/* ---------- Site photos and videos ---------- */

async function filesByNumber(folder) {
  const dir = join(SITE_DIR, folder);
  if (folder.includes(FORBIDDEN) || !existsSync(dir)) return new Map();
  const map = new Map();
  for (const name of await readdir(dir)) {
    const m = /^(\d{2})[_ -]/.exec(name);
    if (m && (IMAGE_EXT.test(name) || VIDEO_EXT.test(name))) map.set(Number(m[1]), join(dir, name));
  }
  return map;
}

async function importSite() {
  if (!existsSync(SITE_DIR)) {
    console.warn("Site folder not found, skipped: " + SITE_DIR);
    return null;
  }
  console.log("Site photos: " + SITE_DIR);
  const groups = {};
  const jobs = [];
  for (const g of SITE_GROUPS) {
    const files = await filesByNumber(g.folder);
    const list = [];
    groups[g.key] = list;
    g.numbers.forEach((n, i) => {
      const src = files.get(n);
      if (!src) return;
      const out = join(MEDIA, g.key, pad2(i + 1) + ".webp");
      jobs.push(async () => {
        list[i] = await photo(src, out, g.filter);
      });
    });
  }
  const videos = {};
  for (const v of SITE_VIDEOS) {
    const src = (await filesByNumber(v.folder)).get(v.number);
    if (!src) continue;
    jobs.push(async () => {
      videos[v.key] = await video(src, join(MEDIA, v.key + ".mp4"), { audio: v.audio });
    });
  }
  await pool(jobs, cpus().length, (j) => j());
  for (const k of Object.keys(groups)) groups[k] = groups[k].filter(Boolean);
  return { groups, videos };
}

/* ---------- Photos made from the stories and the Boutique folder (scripts/piece-media.mjs) ---------- */

async function listDir(dir) {
  return existsSync(dir) ? readdir(dir) : [];
}

/** "story:03/21", "boutique:8497...", "site:06/07" -> the file on disk, or null. */
async function sourceOf(ref) {
  const [kind, rest = ""] = ref.split(/:(.+)/);
  if (kind === "story" || kind === "site") {
    const [nn, mm] = rest.split("/");
    const root = kind === "story" ? STORIES_DIR : SITE_DIR;
    const folder = (await listDir(root)).find((n) => n.startsWith(nn + (kind === "story" ? " " : " - ")) && !n.includes(FORBIDDEN));
    if (!folder) return null;
    const pattern = kind === "story" ? new RegExp("\\s-\\s" + mm + "\\.[a-z0-9]+$", "i") : new RegExp("^" + mm + "[_ -]");
    const file = (await listDir(join(root, folder))).find((n) => pattern.test(n) && (IMAGE_EXT.test(n) || VIDEO_EXT.test(n)));
    return file ? join(root, folder, file) : null;
  }
  if (kind === "boutique") {
    const file = (await listDir(BOUTIQUE_DIR)).find((n) => n.startsWith(rest));
    return file ? join(BOUTIQUE_DIR, file) : null;
  }
  return null;
}

const frac = (v) => Number(v).toFixed(4);

/** One photo: a frame of a video or a photo, masked then cropped, encoded like every photo. */
async function still(src, out, { at, crop, mask = [] }) {
  // Masks are drawn in RGB so that black stays pure black.
  const filters = mask.length > 0 ? ["format=rgb24"] : [];
  filters.push(...mask.map(([x, y, w, h]) => "drawbox=x=iw*" + frac(x) + ":y=ih*" + frac(y) + ":w=iw*" + frac(w) + ":h=ih*" + frac(h) + ":color=black:t=fill"));
  if (crop) {
    const [x, y, w, h] = crop;
    filters.push("crop=iw*" + frac(w) + ":ih*" + frac(h) + ":iw*" + frac(x) + ":ih*" + frac(y));
  }
  filters.push("scale='min(" + PHOTO.maxW + ",iw)':-2:flags=lanczos");
  const vf = filters.join(",");
  const seek = VIDEO_EXT.test(src) ? ["-ss", String(at ?? 0)] : [];
  const recipe = "still:" + (at ?? "") + ":" + vf + ":" + PHOTO.quality;
  await produce(out, src, recipe, [...seek, "-i", src, "-vf", vf, "-frames:v", "1", "-c:v", "libwebp", "-quality", String(PHOTO.quality), "-compression_level", "6"]);
  const p = await probe(out);
  return { type: "image", src: webPath(out), width: p.width, height: p.height };
}

async function importStills() {
  const stills = {};
  const jobs = [];
  for (const s of [...STILLS, ...PORTRAITS]) {
    const src = await sourceOf(s.from);
    if (!src) {
      console.warn("  ! source not found for " + s.key + " (" + s.from + ")");
      continue;
    }
    jobs.push({ heavy: false, go: async () => (stills[s.key] = await still(src, join(MEDIA, s.key + ".webp"), s)) });
  }
  for (const v of BOUTIQUE_VIDEOS) {
    const src = await sourceOf(v.from);
    if (!src) {
      console.warn("  ! source not found for " + v.key + " (" + v.from + ")");
      continue;
    }
    jobs.push({ heavy: true, go: async () => (stills[v.key] = await video(src, join(MEDIA, v.key + ".mp4"))) });
  }
  await pool(jobs.filter((j) => !j.heavy), cpus().length, (j) => j.go());
  await pool(jobs.filter((j) => j.heavy), 1, (j) => j.go());
  // Same order as the list, whatever finished first.
  return Object.fromEntries([...STILLS, ...PORTRAITS, ...BOUTIQUE_VIDEOS].filter((s) => stills[s.key]).map((s) => [s.key, stills[s.key]]));
}

/* ---------- Sketches: step "The Original Vision" of "The Making of a Masterpiece", one per piece ---------- */

/**
 * The hand of Yoni drawing the piece (3:4, about 3600 x 4800): sharp on a phone, on a retina screen and in full screen.
 * The browser takes a lighter copy when it is enough (w1080, w640, w160: scripts/media-sizes.mjs).
 */
const SKETCH = { maxW: 1440, maxH: 1920, quality: 80 };

async function sketchPhoto(src, out) {
  const vf = "scale=w='min(" + SKETCH.maxW + ",iw)':h='min(" + SKETCH.maxH + ",ih)':force_original_aspect_ratio=decrease:flags=lanczos";
  await produce(out, src, "sketch:" + vf + ":" + SKETCH.quality, ["-i", src, "-vf", vf, "-frames:v", "1", "-c:v", "libwebp", "-quality", String(SKETCH.quality), "-compression_level", "6"]);
  const p = await probe(out);
  return { type: "image", src: webPath(out), width: p.width, height: p.height };
}

/** The "<slug>.jpg" files of a folder of sketches (files starting with "_", an overview of the folder, are skipped). */
async function sketchFiles(dir) {
  if (!existsSync(dir)) return [];
  return (await readdir(dir)).filter((n) => IMAGE_EXT.test(n) && !n.startsWith("_") && !n.startsWith(".")).sort();
}

/**
 * "<slug of the piece>.jpg" -> public/media/sketches/<slug>.webp. The hand of Yoni (BERETE_SKETCHES_DIR) first; a piece
 * it does not have keeps its first sketch of before (BERETE_OLD_SKETCHES_DIR), encoded as it was.
 */
async function importSketches() {
  if (!existsSync(SKETCHES_DIR)) {
    console.warn("Sketches folder not found, skipped: " + SKETCHES_DIR);
    return null;
  }
  console.log("Sketches: " + SKETCHES_DIR);
  const jobs = new Map();
  for (const name of await sketchFiles(SKETCHES_DIR)) {
    const slug = slugify(name.replace(IMAGE_EXT, ""));
    jobs.set(slug, () => sketchPhoto(join(SKETCHES_DIR, name), join(MEDIA, "sketches", slug + ".webp")));
  }
  const hands = jobs.size;
  const older = [];
  for (const name of await sketchFiles(OLD_SKETCHES_DIR)) {
    const slug = slugify(name.replace(IMAGE_EXT, ""));
    if (jobs.has(slug)) continue;
    older.push(slug);
    jobs.set(slug, () => photo(join(OLD_SKETCHES_DIR, name), join(MEDIA, "sketches", slug + ".webp")));
  }
  console.log("  " + hands + " drawn by the hand of Yoni" + (older.length ? ", " + older.length + " kept from before: " + older.join(", ") : ""));
  const sketches = {};
  await pool([...jobs.keys()], cpus().length, async (slug) => {
    sketches[slug] = await jobs.get(slug)();
  });
  // In the order of the slugs, whatever finished first.
  return Object.fromEntries(Object.keys(sketches).sort().map((slug) => [slug, sketches[slug]]));
}

/* ---------- High-resolution photos and videos of Yoni (scripts/hd-media.mjs) ---------- */

/** Photos: sharp on a large screen (the browser takes a smaller copy when it is enough, scripts/media-sizes.mjs). */
const HD_PHOTO = { maxW: 1440, maxH: 2160, quality: 78 };
/** The photos of a draft (unpublished, seen in the admin): smaller. */
const HD_DRAFT_PHOTO = { maxW: 1080, maxH: 1620, quality: 78 };
/** Videos: H.264, 720p (enough for a gallery, light on a phone), silent, 12 seconds at most, about 1.2 Mbit/s at most. */
const HD_VIDEO = { long: 1280, short: 720, crf: 28, maxrate: "1200k", maxFps: 30, maxSeconds: 12 };

/** "p7", "v1" or "f" of folder "NN" -> the file on disk, or null. */
async function hdSource(folder, ref) {
  const dir = (await listDir(HD_DIR)).find((n) => n.startsWith(folder + " "));
  if (!dir) return null;
  const kind = ref[0];
  const n = pad2(Number(ref.slice(1)));
  const sub = kind === "p" ? "Photos" : kind === "v" ? "Videos" : "Fabrication";
  const files = await listDir(join(HD_DIR, dir, sub));
  const pattern = kind === "p" ? new RegExp(" - " + n + "\\.(jpe?g|png|heic)$", "i") : kind === "v" ? new RegExp(" - video " + n + "( \\(720p\\))?\\.(mp4|mov|m4v)$", "i") : VIDEO_EXT;
  const file = files.find((f) => pattern.test(f));
  return file ? join(HD_DIR, dir, sub, file) : null;
}

const hdName = (ref) => (ref === "f" ? "f" : ref[0] + pad2(Number(ref.slice(1))));

async function hdPhoto(src, out, filter = "", draft = false) {
  const size = draft ? HD_DRAFT_PHOTO : HD_PHOTO;
  const scale = "scale=w='min(" + size.maxW + ",iw)':h='min(" + size.maxH + ",ih)':force_original_aspect_ratio=decrease:flags=lanczos";
  const vf = filter ? filter + "," + scale : scale;
  const recipe = "hd-photo:" + vf + ":" + size.quality;
  let input = src;
  // An iPhone photo (HEIC, made of tiles) goes through a JPEG first (sips, macOS): ffmpeg cannot filter its tiles simply.
  if (/\.heic$/i.test(src) && !(await upToDate(out, src, recipe))) {
    input = join(tmpdir(), "berete-" + process.pid + "-" + Math.random().toString(36).slice(2) + ".jpg");
    await run("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "95", "-Z", "2400", src, "--out", input]);
  }
  try {
    await produce(out, src, recipe, ["-i", input, "-vf", vf, "-frames:v", "1", "-c:v", "libwebp", "-quality", String(size.quality), "-compression_level", "6"]);
  } finally {
    if (input !== src) await rm(input, { force: true });
  }
  const p = await probe(out);
  return { type: "image", src: webPath(out), width: p.width, height: p.height };
}

async function hdVideo(src, out, filter = "") {
  const info = await probe(src);
  const { long, short } = HD_VIDEO;
  // The long side and the short side at most HD_VIDEO's (the frames are already turned upright).
  const filters = [
    "scale=w='if(gt(iw,ih),min(iw," + long + "),-2)':h='if(gt(iw,ih),-2,min(ih," + long + "))'",
    "scale=w='if(gt(iw,ih),-2,min(iw," + short + "))':h='if(gt(iw,ih),min(ih," + short + "),-2)':flags=lanczos",
  ];
  if (filter) filters.unshift(filter);
  if (info.fps > HD_VIDEO.maxFps + 0.5) filters.push("fps=" + HD_VIDEO.maxFps);
  filters.push("format=yuv420p");
  const vf = filters.join(",");
  await produce(out, src, "hd-video:" + JSON.stringify(HD_VIDEO) + ":" + vf, ["-i", src, "-t", String(HD_VIDEO.maxSeconds), "-map", "0:v:0", "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", String(HD_VIDEO.crf), "-maxrate", HD_VIDEO.maxrate, "-bufsize", "2400k", "-profile:v", "high", "-an", "-movflags", "+faststart"]);
  const p = await probe(out);
  return {
    type: "video",
    src: webPath(out),
    poster: await poster(out, out.replace(/\.mp4$/, "-poster.webp")),
    width: p.width,
    height: p.height,
    duration: Math.round(p.duration * 100) / 100,
    audio: false,
  };
}

async function importHd() {
  if (!existsSync(HD_DIR)) {
    console.warn("HD folder not found, skipped: " + HD_DIR);
    return null;
  }
  console.log("High-resolution photos and videos: " + HD_DIR);
  const out = {};
  const jobs = [];
  // A folder of the site fed by two folders of Yoni: the files of the second one are named "<its number>-p02".
  const firstFolder = {};
  for (const entry of HD) firstFolder[entry.dir] ??= entry.folder;
  for (const entry of HD) {
    const group = (out[entry.dir] ??= {});
    for (const ref of entry.items) {
      const src = await hdSource(entry.folder, ref);
      if (!src) {
        console.warn("  ! not found: folder " + entry.folder + ", " + ref);
        continue;
      }
      const isVideo = ref[0] !== "p";
      const name = (entry.folder === firstFolder[entry.dir] ? "" : entry.folder + "-") + hdName(ref);
      const file = join(MEDIA, "hd", entry.dir, name + (isVideo ? ".mp4" : ".webp"));
      group[name] = null;
      jobs.push({ heavy: isVideo, go: async () => (group[name] = isVideo ? await hdVideo(src, file, entry.filter) : await hdPhoto(src, file, entry.filter, entry.draft === true)) });
    }
  }
  const cores = cpus().length;
  await pool(jobs.filter((j) => !j.heavy), cores, (j) => j.go());
  await pool(jobs.filter((j) => j.heavy), Math.max(1, Math.floor(cores / 4)), (j) => j.go());
  for (const group of Object.values(out)) for (const [k, v] of Object.entries(group)) if (!v) delete group[k];
  return out;
}

/* ---------- The films of "Enter the Atelier": making-of and finished piece (scripts/film-media.mjs) ---------- */

/**
 * Computers: the film at its own size, up to 1080 x 1920 (a light 720p copy stays 720p: nothing is invented); phones: a
 * lighter copy, 720p from a high-quality film, else 540p. H.264 with its sound (AAC), the index at the start of the file
 * (+faststart: the film starts as soon as its first seconds arrive, the rest follows) and a key frame every 2 seconds.
 */
const FILM = {
  desktop: { short: 1080, long: 1920, crf: 23, maxrate: (short) => (short > 720 ? "4500k" : "2500k"), audio: "128k" },
  mobile: { crf: 24, maxrate: (short) => (short > 540 ? "1500k" : "1200k"), audio: "96k" },
  maxFps: 30,
  /** Frames offered as the image of the film (the admin chooses one; by default the sharpest well-lit one). */
  posters: 6,
  posterLong: 1280,
};

async function filmDir(folder) {
  return (await listDir(HD_DIR)).find((n) => n.startsWith(folder + " ")) ?? null;
}

/**
 * A file of "Videos HD/" is taken only once it is whole: not written in the last 3 minutes (a download in progress),
 * readable, and as long as its copy of "Videos/" when there is one. Else the copy of "Videos/" serves until next time.
 */
async function wholeHd(file, other) {
  try {
    if (Date.now() - (await stat(file)).mtimeMs < 3 * 60_000) throw new Error("still being written");
    const info = await probe(file);
    if (!(info.duration > 0.5) || !info.width) throw new Error("unreadable");
    if (other && Math.abs((await probe(other)).duration - info.duration) > 1.5) throw new Error("shorter than its copy");
    return true;
  } catch (error) {
    console.warn("  ! Videos HD not used yet (" + error.message + "): " + file.split("/").slice(-3).join("/"));
    return false;
  }
}

/** "25/v02" or "01/f" -> the best copy of that film on disk ("Videos HD/", else "Videos/", else its "(720p)"), or null. */
async function filmSource(ref) {
  const [folder, item = ""] = ref.split("/");
  const dir = await filmDir(folder);
  if (!dir) return null;
  if (item === "f") {
    const files = (await listDir(join(HD_DIR, dir, "Fabrication"))).filter((f) => VIDEO_EXT.test(f)).sort();
    return files[0] ? join(HD_DIR, dir, "Fabrication", files[0]) : null;
  }
  const n = pad2(Number(item.slice(1)));
  const files = await listDir(join(HD_DIR, dir, "Videos"));
  const full = files.find((f) => new RegExp(" - video " + n + "\\.(mp4|mov|m4v)$", "i").test(f));
  const light = files.find((f) => new RegExp(" - video " + n + " \\(720p\\)\\.(mp4|mov|m4v)$", "i").test(f));
  const file = full ?? light;
  const copy = file ? join(HD_DIR, dir, "Videos", file) : null;
  const hd = (await listDir(join(HD_DIR, dir, "Videos HD"))).filter((f) => VIDEO_EXT.test(f) && new RegExp(" - video " + n + "(?!\\d)", "i").test(f)).sort()[0];
  if (hd && (await wholeHd(join(HD_DIR, dir, "Videos HD", hd), copy))) return join(HD_DIR, dir, "Videos HD", hd);
  return copy;
}

/** The film of "Videos HD/" of a folder named after its kind (its original name kept), or null. */
async function namedFilm(folder, kind) {
  const dir = await filmDir(folder);
  if (!dir) return null;
  const file = (await listDir(join(HD_DIR, dir, "Videos HD"))).filter((f) => VIDEO_EXT.test(f) && KIND_WORDS[kind].test(f)).sort()[0];
  return file && (await wholeHd(join(HD_DIR, dir, "Videos HD", file), null)) ? join(HD_DIR, dir, "Videos HD", file) : null;
}

/** The scale filter: the short side at most `short`, the long side at most `long`, never larger than the film. */
const fit = (short, long) => "scale=w='trunc(iw*min(1,min(" + short + "/min(iw,ih)," + long + "/max(iw,ih)))/2)*2':h=-2:flags=lanczos";

async function filmCopy(src, out, info, { short, long, crf, maxrate, audio }) {
  const filters = [fit(short, long)];
  const fps = info.fps > FILM.maxFps + 0.5 ? FILM.maxFps : Math.round(info.fps) || 30;
  if (info.fps > FILM.maxFps + 0.5) filters.push("fps=" + FILM.maxFps);
  filters.push("format=yuv420p");
  const vf = filters.join(",");
  const rate = maxrate(Math.min(info.width, info.height, short));
  const argv = ["-i", src, "-map", "0:v:0"];
  if (info.hasAudio) argv.push("-map", "0:a:0");
  argv.push("-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-maxrate", rate, "-bufsize", parseInt(rate, 10) * 2 + "k", "-g", String(fps * 2), "-keyint_min", String(fps), "-profile:v", "high");
  if (info.hasAudio) argv.push("-c:a", "aac", "-b:a", audio, "-ac", "2");
  else argv.push("-an");
  argv.push("-movflags", "+faststart");
  await produce(out, src, "film:" + [vf, crf, rate, audio, info.hasAudio].join(":"), argv);
  return probe(out);
}

async function film(src, base, { light, label, pick, sharpPhone = false }) {
  const info = await probe(src);
  const shortSide = Math.min(info.width, info.height);
  // The finished piece opens the page of the piece: on a phone it keeps 720p when the film has it.
  const mobileShort = shortSide > 720 || (sharpPhone && shortSide >= 720) ? 720 : Math.min(540, shortSide);
  const mobile = await filmCopy(src, base + ".m.mp4", info, { ...FILM.mobile, short: mobileShort, long: Math.round((mobileShort * 16) / 9) });
  // A film no page shows yet (a draft): its light copy serves everywhere.
  const desktop = light ? null : await filmCopy(src, base + ".mp4", info, FILM.desktop);
  const main = desktop ?? mobile;
  // Its images: frames spread over the film, from the original (sharp), the sharpest well-lit one first by default.
  const posters = [];
  const scores = [];
  for (let i = 0; i < FILM.posters; i += 1) {
    const at = info.duration * (0.1 + (0.8 * i) / (FILM.posters - 1));
    const out = base + "-" + (i + 1) + ".webp";
    const vf = "scale=w='trunc(iw*min(1," + FILM.posterLong + "/max(iw,ih))/2)*2':h=-2:flags=lanczos";
    await produce(out, src, "film-poster:" + at.toFixed(2) + ":" + vf, ["-ss", at.toFixed(2), "-i", src, "-frames:v", "1", "-vf", vf, "-c:v", "libwebp", "-quality", "80"]);
    const stats = await sharp(out).stats();
    const light = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;
    scores.push(stats.sharpness * Math.min(1, Math.max(0.15, (light - 18) / 50)));
    posters.push(webPath(out));
  }
  const poster = pick >= 1 && pick <= posters.length ? pick - 1 : scores.indexOf(Math.max(...scores));
  return {
    src: webPath(desktop ? base + ".mp4" : base + ".m.mp4"),
    mobile: webPath(base + ".m.mp4"),
    width: main.width,
    height: main.height,
    duration: Math.round(main.duration * 100) / 100,
    audio: main.hasAudio,
    posters,
    poster,
    source: label + " · " + (shortSide >= 1080 ? "HD " + shortSide + "p" : shortSide + "p"),
    light,
  };
}

async function importFilms() {
  if (!existsSync(HD_DIR)) {
    console.warn("HD folder not found, skipped: " + HD_DIR);
    return null;
  }
  console.log("Films of the atelier: " + HD_DIR);
  const out = {};
  const jobs = [];
  for (const entry of FILMS) {
    const found = {};
    for (const kind of ["making", "reveal"]) {
      const named = entry.folder ? await namedFilm(entry.folder, kind) : null;
      const file = named ?? (entry[kind] ? await filmSource(entry[kind]) : null);
      if (!file) {
        if (entry[kind]) console.warn("  ! not found: " + entry[kind] + " (" + entry.slug + ", " + kind + ")");
        continue;
      }
      found[kind] = { file, label: named ? entry.folder + "/" + named.split("/").pop() : entry[kind] };
    }
    for (const [kind, { file, label }] of Object.entries(found)) {
      const light = entry.draft === true;
      const pick = entry.poster?.[kind];
      const sharpPhone = kind === "reveal" && !light;
      jobs.push(async () => ((out[entry.slug] ??= {})[kind] = await film(file, join(MEDIA, "films", entry.slug, kind), { light, label, pick, sharpPhone })));
    }
  }
  await pool(jobs, Math.max(1, Math.floor(cpus().length / 4)), (go) => go());
  // In the order of the list, the making-of first, whatever finished first.
  return Object.fromEntries(
    FILMS.filter((e) => out[e.slug]).map((e) => [e.slug, Object.fromEntries(["making", "reveal"].filter((k) => out[e.slug][k]).map((k) => [k, out[e.slug][k]]))]),
  );
}

/* ---------- The House: the personal photos of Yoni, one per place of the page (src/data/house.ts) ---------- */

async function importHouse() {
  if (!existsSync(HOUSE_DIR)) {
    console.warn("House folder not found, skipped: " + HOUSE_DIR);
    return null;
  }
  console.log("The House: " + HOUSE_DIR);
  const files = (await readdir(HOUSE_DIR)).filter((n) => IMAGE_EXT.test(n) && !n.startsWith(".")).sort();
  const photos = {};
  await pool(files, cpus().length, async (name) => {
    const key = slugify(name.replace(IMAGE_EXT, ""));
    if (!/^(portrait|citation-[1-3]|chapitre-\d{2})$/.test(key)) {
      console.warn("  ! ignored (not a place of the page): " + name);
      return;
    }
    photos[key] = await hdPhoto(join(HOUSE_DIR, name), join(MEDIA, "house", key + ".webp"));
  });
  return Object.fromEntries(Object.keys(photos).sort().map((k) => [k, photos[k]]));
}

/* ---------- The players: their portraits, from the photos of Yoni in their jersey (scripts/player-media.mjs) ---------- */

/** 4:5, at most 1080 x 1350, never larger than the part of the photo kept. */
const PLAYER_PHOTO = { maxW: 1080, quality: 82 };
/**
 * One light look for the whole series: deeper blacks, a little warmth (the rose gold of the site) in the shadows and the
 * middle tones only, so that the whites and the colours of the jerseys stay theirs, a soft vignette, and a touch of
 * sharpness after the resize.
 */
const PLAYER_GRADE = "curves=all='0/0 0.07/0.035 0.5/0.5 0.93/0.95 1/1',colorbalance=rs=0.025:bs=-0.025:rm=0.012:bm=-0.012,eq=saturation=0.97,vignette=angle=PI/7,unsharp=5:5:0.3:5:5:0";

/** The part of a photo kept (fractions of it), in pixels: exactly 4:5 and inside the photo; and the size of the file. */
function portraitBox(width, height, [x, y, w, h]) {
  let cw = Math.round(w * width);
  let ch = Math.round(h * height);
  if (cw * 5 > ch * 4) cw = Math.floor((ch * 4) / 5);
  else ch = Math.floor((cw * 5) / 4);
  const left = Math.max(0, Math.min(width - cw, Math.round(x * width)));
  const top = Math.max(0, Math.min(height - ch, Math.round(y * height)));
  // A multiple of 8 wide: its height (5/4 of it) is then whole and even.
  const outW = Math.min(PLAYER_PHOTO.maxW, Math.floor(cw / 8) * 8);
  return { crop: cw + ":" + ch + ":" + left + ":" + top, scale: outW + ":" + (outW * 5) / 4 };
}

async function playerPhoto(src, out, crop) {
  const recipe = "player:" + crop.join(",") + ":" + PLAYER_PHOTO.maxW + ":" + PLAYER_PHOTO.quality + ":" + PLAYER_GRADE;
  if (await upToDate(out, src, recipe)) {
    produced.add(out);
    skipped += 1;
  } else {
    let input = src;
    // An iPhone photo (HEIC) goes through a JPEG first (sips, macOS), at its full size.
    if (/\.heic$/i.test(src)) {
      input = join(tmpdir(), "berete-" + process.pid + "-" + Math.random().toString(36).slice(2) + ".jpg");
      await run("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "95", src, "--out", input]);
    }
    try {
      const { width, height } = await probe(input);
      const box = portraitBox(width, height, crop);
      const vf = "crop=" + box.crop + ",scale=" + box.scale + ":flags=lanczos," + PLAYER_GRADE;
      await produce(out, src, recipe, ["-i", input, "-vf", vf, "-frames:v", "1", "-c:v", "libwebp", "-quality", String(PLAYER_PHOTO.quality), "-compression_level", "6"]);
    } finally {
      if (input !== src) await rm(input, { force: true });
    }
  }
  const p = await probe(out);
  return { type: "image", src: webPath(out), width: p.width, height: p.height };
}

/** By person: the main portrait first ("<slug>.webp"), then the other photos ("<slug>-2.webp"...). */
async function importPlayers() {
  if (!existsSync(PLAYERS_DIR)) {
    console.warn("Players folder not found, skipped: " + PLAYERS_DIR);
    return null;
  }
  console.log("Players: " + PLAYERS_DIR);
  const folders = new Map((await readdir(PLAYERS_DIR, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => [slugify(e.name), e.name]));
  const found = {};
  const jobs = [];
  for (const { slug, photos } of PLAYERS) {
    const folder = folders.get(slug);
    if (!folder) {
      console.warn("  ! folder not found for " + slug);
      continue;
    }
    const files = await readdir(join(PLAYERS_DIR, folder));
    const list = (found[slug] = []);
    photos.forEach((photo, i) => {
      const name = files.find((f) => new RegExp(" - " + pad2(photo.n) + "\\.(jpe?g|png|webp|heic)$", "i").test(f));
      if (!name) {
        console.warn("  ! not found: " + folder + " - " + pad2(photo.n));
        return;
      }
      const out = join(MEDIA, "players", slug + (i === 0 ? "" : "-" + (i + 1)) + ".webp");
      jobs.push(async () => (list[i] = await playerPhoto(join(PLAYERS_DIR, folder, name), out, photo.crop)));
    });
  }
  await pool(jobs, cpus().length, (j) => j());
  // In the order of the list, whatever finished first.
  return Object.fromEntries(PLAYERS.map(({ slug }) => [slug, (found[slug] ?? []).filter(Boolean)]).filter(([, list]) => list.length > 0));
}

/* ---------- Scroll-driven videos: WebP frame sequences + an all-intra fallback ---------- */

async function frameSet(src, dir, start, set, crop) {
  const vf = (crop ? "crop=ih*9/16:ih," : "") + "scale=" + set.w + ":" + set.h + ":flags=lanczos,fps=" + set.fps;
  const recipe = "frames:" + start + ":" + vf + ":" + set.quality;
  // The first frame stands for the whole sequence in the cache.
  const marker = join(dir, pad4(1) + ".webp");
  let count;
  if (await upToDate(marker, src, recipe)) {
    count = (await readdir(dir)).filter((n) => n.endsWith(".webp")).length;
    skipped += 1;
  } else {
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    await run("ffmpeg", ["-v", "error", "-y", "-ss", String(start), "-i", src, "-an", "-vf", vf, "-c:v", "libwebp", "-quality", String(set.quality), "-compression_level", "5", join(dir, "%04d.webp")]);
    await remember(marker, src, recipe);
    count = (await readdir(dir)).filter((n) => n.endsWith(".webp")).length;
    encoded += 1;
    console.log("  + " + relative(ROOT, dir) + " (" + count + " frames)");
  }
  for (let i = 1; i <= count; i++) produced.add(join(dir, pad4(i) + ".webp"));
  return { count, width: set.w, height: set.h, path: webPath(dir) + "/" };
}

async function importScroll() {
  const out = {};
  for (const v of SCROLL_VIDEOS) {
    const src = join(SITE_DIR, v.file);
    if (!existsSync(src)) {
      console.warn("Scroll video not found, skipped: " + src);
      continue;
    }
    console.log("Scroll video: " + v.key);
    const base = join(MEDIA, v.key);
    const desktop = await frameSet(src, join(base, "frames-desktop"), v.start, FRAMES.desktop, false);
    const mobile = await frameSet(src, join(base, "frames-mobile"), v.start, FRAMES.mobile, true);
    const scrub = join(base, "scrub.mp4");
    await produce(scrub, src, "scrub:" + v.start + ":g1:crf30:960", ["-ss", String(v.start), "-i", src, "-an", "-vf", "scale=960:540:flags=lanczos", "-c:v", "libx264", "-g", "1", "-crf", "30", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]);
    out[v.key] = { desktop, mobile, video: webPath(scrub), poster: desktop.path + "0001.webp" };
  }
  return out;
}

/* ---------- Logo: the owner's SVG, filled with the metallic rose gold ---------- */

async function importBrand() {
  if (!existsSync(LOGO_FILE)) {
    console.warn("Logo not found, skipped: " + LOGO_FILE);
    return;
  }
  console.log("Logo: " + LOGO_FILE);
  const svg = await readFile(LOGO_FILE, "utf8");
  const gradient =
    '<defs><linearGradient id="bj-rose-gold" gradientUnits="userSpaceOnUse" x1="270" y1="195" x2="606" y2="437">' +
    '<stop offset="0" stop-color="#9C5B4F"/><stop offset="0.5" stop-color="#E8B4A0"/><stop offset="1" stop-color="#B76E79"/></linearGradient></defs>';
  const filled = svg
    .replace(/fill:\s*#[0-9a-f]{3,6}/gi, "fill:url(#bj-rose-gold)")
    .replace(/(<svg[^>]*>)/, "$1" + gradient);
  // The mark alone (diamond and BRT): the same drawing, framed above the name.
  const mark = filled.replace(/viewBox="[^"]*"/, 'viewBox="358 193 217 160"');
  const dir = join(MEDIA, "brand");
  await mkdir(dir, { recursive: true });
  for (const [name, content] of [
    ["logo.svg", filled],
    ["logo-mark.svg", mark],
  ]) {
    const out = join(dir, name);
    produced.add(out);
    const old = existsSync(out) ? await readFile(out, "utf8") : "";
    if (old !== content) {
      await writeFile(out, content);
      console.log("  + " + relative(ROOT, out));
    }
  }
}

/* ---------- Pruning: files of a section whose source is gone ---------- */

async function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(p)));
    else out.push(p);
  }
  return out;
}

async function prune(dirs) {
  for (const dir of dirs) {
    for (const file of await listFiles(dir)) {
      // The smaller copies of a photo still on the site stay (scripts/media-sizes.mjs).
      const original = copyOf(file);
      if (!produced.has(file) && !(original && produced.has(original)) && !file.endsWith(".DS_Store")) {
        await rm(file);
        delete cache[relative(ROOT, file)];
        console.log("  - " + relative(ROOT, file));
      }
    }
  }
}

async function writeJson(file, value) {
  const text = JSON.stringify(value, null, 2) + "\n";
  const old = existsSync(file) ? await readFile(file, "utf8") : "";
  if (old !== text) {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, text);
    console.log("  = " + relative(ROOT, file));
  }
}

/* ---------- Main ---------- */

// Every source the asked sections read must be there (the disk connected), before anything is written: a section whose
// folder is missing would otherwise empty its part of public/media.
const SOURCES = [
  ["brand", LOGO_FILE],
  ["stories", STORIES_DIR],
  ["site", SITE_DIR],
  ["site", BOUTIQUE_DIR],
  ["scroll", SITE_DIR],
  ["sketches", SKETCHES_DIR],
  ["house", HOUSE_DIR],
  ["hd", HD_DIR],
  ["films", HD_DIR],
  ["players", PLAYERS_DIR],
];
const missing = [...new Set(SOURCES.filter(([section, path]) => runs(section) && !existsSync(path)).map(([, path]) => path))];
if (missing.length > 0) {
  console.error("Source not found, nothing was changed:\n  " + missing.join("\n  "));
  if (!existsSync(DISK)) console.error("The external disk is not connected (" + DISK + "): plug it in, or set BERETE_DISK.");
  process.exit(1);
}

const pruneDirs = [];
await mkdir(DATA, { recursive: true });

if (runs("brand")) {
  await importBrand();
  pruneDirs.push(join(MEDIA, "brand"));
}

if (runs("stories")) {
  const stories = await importStories();
  if (stories !== null) {
    await writeJson(join(DATA, "stories.generated.json"), { stories });
    pruneDirs.push(join(MEDIA, "stories"));
  }
}

const mediaFile = join(DATA, "media.generated.json");
let media = { groups: {}, videos: {}, stills: {}, scroll: {}, sketches: {} };
try {
  media = { ...media, ...JSON.parse(await readFile(mediaFile, "utf8")) };
} catch {
  /* first run */
}
if (runs("site")) {
  const site = await importSite();
  if (site !== null) {
    media.groups = site.groups;
    media.videos = site.videos;
    console.log("Photos of the pieces and boxes (scripts/piece-media.mjs)");
    media.stills = await importStills();
    pruneDirs.push(join(MEDIA, "atelier"), join(MEDIA, "pieces"), join(MEDIA, "boxes"), join(MEDIA, "portraits"));
  }
}
if (runs("sketches")) {
  const sketches = await importSketches();
  if (sketches !== null) {
    media.sketches = sketches;
    pruneDirs.push(join(MEDIA, "sketches"));
  }
}
if (runs("house")) {
  const house = await importHouse();
  if (house !== null) {
    media.house = house;
    pruneDirs.push(join(MEDIA, "house"));
  }
}
if (runs("players")) {
  const players = await importPlayers();
  if (players !== null) {
    media.players = players;
    pruneDirs.push(join(MEDIA, "players"));
  }
}
if (runs("hd")) {
  const hd = await importHd();
  if (hd !== null) {
    media.hd = hd;
    pruneDirs.push(join(MEDIA, "hd"));
  }
}
if (runs("films")) {
  const films = await importFilms();
  if (films !== null) {
    media.films = films;
    pruneDirs.push(join(MEDIA, "films"));
  }
}
if (runs("scroll")) {
  media.scroll = await importScroll();
  pruneDirs.push(...SCROLL_VIDEOS.map((v) => join(MEDIA, v.key)));
}
await writeJson(mediaFile, media);

await prune(pruneDirs);
await writeFile(CACHE_FILE, JSON.stringify(cache, null, 1));
await makeSizes();
console.log("Done: " + encoded + " encoded, " + skipped + " already up to date.");
