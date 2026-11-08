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
 *   npm run import-media -- --only=stories,site,scroll,brand
 *   npm run import-media -- --force      # re-encode everything
 *
 * Source folders (override with the environment variables):
 *   BERETE_STORIES_DIR  ~/Desktop/Berete - Stories
 *   BERETE_SITE_DIR     ~/Desktop/01 Audiovisuel/Berete - Envoi ODORO
 *   BERETE_LOGO_FILE    ~/Desktop/berete_jewellers-cropped.svg
 *   BERETE_BOUTIQUE_DIR ~/Desktop/02 Projets/Sites clients/Boutique Bijoutier
 *
 * The main photos of the pieces taken from the stories (frames, crops) and
 * the photos of the boxes are listed in scripts/piece-media.mjs.
 *
 * Needs ffmpeg and ffprobe (with libx264 and libwebp) on the PATH.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { cpus, homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BOUTIQUE_VIDEOS, STILLS } from "./piece-media.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const MEDIA = join(PUBLIC, "media");
const DATA = join(ROOT, "src", "data");
const CACHE_FILE = join(ROOT, "scripts", ".import-media-cache.json");

const DESKTOP = join(homedir(), "Desktop");
const STORIES_DIR = process.env.BERETE_STORIES_DIR ?? join(DESKTOP, "Berete - Stories");
const SITE_DIR = process.env.BERETE_SITE_DIR ?? join(DESKTOP, "01 Audiovisuel", "Berete - Envoi ODORO");
const LOGO_FILE = process.env.BERETE_LOGO_FILE ?? join(DESKTOP, "berete_jewellers-cropped.svg");
const BOUTIQUE_DIR = process.env.BERETE_BOUTIQUE_DIR ?? join(DESKTOP, "02 Projets", "Sites clients", "Boutique Bijoutier");

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
  desktop: { w: 1280, h: 720, quality: 65, fps: 24 },
  // Portrait phones: the centre of the frame, at half the frame rate.
  mobile: { w: 504, h: 896, quality: 55, fps: 12 },
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
  for (const s of STILLS) {
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
  return Object.fromEntries([...STILLS, ...BOUTIQUE_VIDEOS].filter((s) => stills[s.key]).map((s) => [s.key, stills[s.key]]));
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
      if (!produced.has(file) && !file.endsWith(".DS_Store")) {
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
let media = { groups: {}, videos: {}, stills: {}, scroll: {} };
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
    pruneDirs.push(join(MEDIA, "atelier"), join(MEDIA, "pieces"), join(MEDIA, "boxes"));
  }
}
if (runs("scroll")) {
  media.scroll = await importScroll();
  pruneDirs.push(...SCROLL_VIDEOS.map((v) => join(MEDIA, v.key)));
}
await writeJson(mediaFile, media);

await prune(pruneDirs);
await writeFile(CACHE_FILE, JSON.stringify(cache, null, 1));
console.log("Done: " + encoded + " encoded, " + skipped + " already up to date.");
