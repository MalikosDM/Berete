#!/usr/bin/env node
/**
 * The mechanisms of the house (Yoni, 23/11/2026: "Engineering the Extraordinary", page The Atelier, and the Dragon Ball
 * section of the home page): a short film of each, from the folders of Yoni on the external disk (never modified).
 *   public/media/mechanisms/<key>.<v>.mp4         H.264, silent, square, light (played at a click, or while on screen)
 *   public/media/mechanisms/<key>-poster.<v>.webp its image before it plays
 *   public/media/mechanisms/<key>.<v>.webp        a still of a film (a step of The Bespoke Journey)
 * and src/data/mechanisms.generated.json. <v>: a fingerprint of the files (no cache keeps an old one). Originals never go
 * in Git.
 * Also two films taken whole, at the size of their source (never enlarged), each from ONE line to change when a better file
 * arrives (then npm run mechanisms -- --only=<key>):
 *   - "dragon-ball-hero": the professional film of the finished Dragon Ball pendant (the piece, its trunk that opens, the
 *     sphere that turns), shown large on the home page and at the top of its page, with its sound: DRAGON_BALL_HERO_SOURCE;
 *     a version for computers (its full quality) and a lighter one for phones;
 *   - "tillman-cross-spin": the cross of Malik Tillman whose centre is turned by hand ("The mechanism" of its page, and
 *     The Atelier): TILLMAN_CROSS_SOURCE, silent.
 * The Dragon Ball pendant no longer turns under the pointer (Yoni, 23/11/2026: the lens shows photos only).
 *
 *   npm run mechanisms
 *   npm run mechanisms -- --only=<key>,<key>      (the other keys keep their files and their entry)
 *
 * BERETE_DISK gives another disk.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { MARGIN, SIZES, sizedPath } from "./media-sizes.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DISK = process.env.BERETE_DISK ?? "/Volumes/Disque externe";
const ICLOUD = join(DISK, "Berete - Dossiers icloud");
const STORIES = join(DISK, "Berete - Stories");
const OUT = join(ROOT, "public", "media", "mechanisms");
const DATA = join(ROOT, "src", "data", "mechanisms.generated.json");

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;

/**
 * ============================================================================================================
 * THE TWO LINES TO CHANGE when Yoni sends the originals (then npm run mechanisms -- --only=<key>):
 * - the film of the finished Dragon Ball pendant (key "dragon-ball-hero"): today its copy of the iCloud album, 720 x 1280,
 *   25 s (23/11/2026); Yoni sends the original in 1080p ProRes;
 * - the cross of Malik Tillman whose centre turns (key "tillman-cross-spin"): today the story Collectors 14, 720 x 1280,
 *   17 s (worn, then a hand turns its centre); Yoni sends it in HD.
 * ============================================================================================================
 */
const DRAGON_BALL_HERO_SOURCE = join(ICLOUD, "13 Pendentif sculpte or jaune et rose", "Videos", "HD hero", "13 Dragon Ball - video hero pro (Yoni 23-11).mp4");
const TILLMAN_CROSS_SOURCE = join(STORIES, "09 Collectors", "09 Collectors - 14.mp4");

/** The films taken whole: their source, whether their sound is kept, the moment of their image before they play. */
const WHOLE = [
  // Its image: the pendant almost whole, from its sphere to the dragons, on black (3.5 s).
  { key: "dragon-ball-hero", src: DRAGON_BALL_HERO_SOURCE, audio: true, poster: 3.5 },
  // Its image: the cross whole, worn (1 s).
  { key: "tillman-cross-spin", src: TILLMAN_CROSS_SOURCE, audio: false, poster: 1 },
];

/**
 * Each film: its source, the square kept (after the rotation of the phone), the part kept (seconds) and the moment of its
 * image. Looked at frame by frame (23/11/2026).
 */
const FILMS = [
  {
    // The Spirit Bomb of the Dragon Ball pendant turned by a finger at the bench, before the setting (folder 13, video 02,
    // 480 x 848, a phone): the only film that shows its rotation.
    key: "dragon-ball-sphere",
    src: join(ICLOUD, "13 Pendentif sculpte or jaune et rose", "Videos", "13 Pendentif sculpte or jaune et rose - video 02.mp4"),
    crop: "480:480:0:250",
    from: 0,
    to: 14,
    poster: 6,
  },
];

/**
 * Stills taken from a film (4:5, 1080 x 1350): the steps of The Bespoke Journey (Yoni, 23/11/2026) that have no photo of
 * their own. Looked at frame by frame.
 */
const STILLS = [
  // The design validated: the printed sheet of the six views of the Dragon Ball pendant, in colour (folder 13, video 01,
  // its film of the finished piece, at 7.3 s).
  { key: "journey-design", src: join(ICLOUD, "13 Pendentif sculpte or jaune et rose", "Videos", "13 Pendentif sculpte or jaune et rose - video 01.mp4"), at: 7.3 },
];

function run(args) {
  const r = spawnSync("ffmpeg", ["-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) throw new Error("ffmpeg failed: " + args.join(" "));
}

/** Width and height of a film. */
function sizeOf(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file], { encoding: "utf8" });
  const [width, height] = r.stdout.trim().split(",").map(Number);
  return { width, height };
}

/**
 * A film whole, at the size of its source (never enlarged): for computers its picture as it is (copied, nothing lost, when
 * it is already H.264), for phones a lighter copy (the same size, a lower rate); ready to start before it is all loaded; its
 * sound kept if asked; its image, sharp.
 */
async function whole({ key, src, audio, poster: at }) {
  if (!existsSync(src)) {
    console.error("Not found (plug the disk in): " + src);
    process.exit(1);
  }
  const tmp = join(OUT, "." + key + ".tmp");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const film = join(tmp, key + ".mp4");
  const mobile = join(tmp, key + "-mobile.mp4");
  const poster = join(tmp, key + "-poster.webp");
  const sound = audio ? ["-c:a", "aac", "-b:a", "160k"] : ["-an"];
  const common = ["-vf", "format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-movflags", "+faststart", "-map_metadata", "-1"];
  const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,pix_fmt", "-of", "csv=p=0", src], { encoding: "utf8" }).stdout.trim();
  const copy = probe === "h264,yuv420p";
  if (copy) run(["-i", src, "-c:v", "copy", ...(audio ? ["-c:a", "copy"] : ["-an"]), "-movflags", "+faststart", "-map_metadata", "-1", film]);
  else run(["-i", src, ...common, "-crf", "17", "-maxrate", "8000k", "-bufsize", "16000k", ...sound, film]);
  run(["-i", src, ...common, "-crf", "23", "-maxrate", "1800k", "-bufsize", "3600k", ...(audio ? ["-c:a", "aac", "-b:a", "128k"] : ["-an"]), mobile]);
  run(["-ss", String(at), "-i", src, "-frames:v", "1", "-quality", "90", poster]);
  const hash = createHash("sha256");
  for (const file of [film, mobile, poster]) hash.update(readFileSync(file));
  const v = hash.digest("hex").slice(0, 10);
  for (const old of await readdir(OUT)) if (old.startsWith(key + ".") || old.startsWith(key + "-poster.") || old.startsWith(key + "-mobile.")) await rm(join(OUT, old));
  await rename(film, join(OUT, key + "." + v + ".mp4"));
  await rename(mobile, join(OUT, key + "-mobile." + v + ".mp4"));
  await rename(poster, join(OUT, key + "-poster." + v + ".webp"));
  await rm(tmp, { recursive: true, force: true });
  const { width, height } = sizeOf(join(OUT, key + "." + v + ".mp4"));
  const duration = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(OUT, key + "." + v + ".mp4")], { encoding: "utf8" }).stdout.trim());
  console.log("  + " + key + " (" + v + ", " + width + " x " + height + ", " + duration.toFixed(1) + " s)");
  const base = "/media/mechanisms/" + key;
  return { video: base + "." + v + ".mp4", mobile: base + "-mobile." + v + ".mp4", poster: base + "-poster." + v + ".webp", width, height, duration: Math.round(duration * 10) / 10, audio };
}

await mkdir(OUT, { recursive: true });
let data = {};
try {
  data = JSON.parse(readFileSync(DATA, "utf8"));
} catch {
  /* first run */
}
const runs = (key) => !ONLY || ONLY.has(key);
for (const f of FILMS) {
  if (!runs(f.key)) continue;
  if (!existsSync(f.src)) {
    console.error("Not found (plug the disk in): " + f.src);
    process.exit(1);
  }
  const tmp = join(OUT, "." + f.key + ".tmp");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const film = join(tmp, f.key + ".mp4");
  const poster = join(tmp, f.key + "-poster.webp");
  run(["-ss", String(f.from), "-to", String(f.to), "-i", f.src, "-an", "-vf", "crop=" + f.crop + ",scale=480:480:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-maxrate", "1000k", "-bufsize", "2000k", "-movflags", "+faststart", "-map_metadata", "-1", film]);
  run(["-ss", String(f.poster), "-i", f.src, "-frames:v", "1", "-vf", "crop=" + f.crop + ",scale=480:480:flags=lanczos", "-quality", "80", poster]);
  const hash = createHash("sha256");
  for (const file of [film, poster]) hash.update(readFileSync(file));
  const v = hash.digest("hex").slice(0, 10);
  // The files of an older version go.
  for (const old of await readdir(OUT)) if (old.startsWith(f.key + ".") || old.startsWith(f.key + "-poster.")) await rm(join(OUT, old));
  await rename(film, join(OUT, f.key + "." + v + ".mp4"));
  await rename(poster, join(OUT, f.key + "-poster." + v + ".webp"));
  await rm(tmp, { recursive: true, force: true });
  data[f.key] = { video: "/media/mechanisms/" + f.key + "." + v + ".mp4", poster: "/media/mechanisms/" + f.key + "-poster." + v + ".webp", width: 480, height: 480 };
  console.log("  + " + f.key + " (" + v + ")");
}
for (const f of STILLS) {
  if (!runs(f.key)) continue;
  if (!existsSync(f.src)) {
    console.error("Not found (plug the disk in): " + f.src);
    process.exit(1);
  }
  const tmp = join(OUT, "." + f.key + ".webp");
  run(["-ss", String(f.at), "-i", f.src, "-frames:v", "1", "-vf", "scale=1080:1920:flags=lanczos,crop=1080:1350:0:285", "-quality", "82", tmp]);
  const v = createHash("sha256").update(readFileSync(tmp)).digest("hex").slice(0, 10);
  for (const old of await readdir(OUT)) if (old.startsWith(f.key + ".")) await rm(join(OUT, old));
  const final = join(OUT, f.key + "." + v + ".webp");
  await rename(tmp, final);
  // Its smaller copies, named as the site expects them (src/lib/responsive.ts).
  for (const size of SIZES) if (1080 >= size.width * MARGIN) await sharp(final).resize(size.width).webp({ quality: size.quality, effort: 6 }).toFile(sizedPath(final, size.width));
  data[f.key] = { image: "/media/mechanisms/" + f.key + "." + v + ".webp", width: 1080, height: 1350 };
  console.log("  + " + f.key + " (" + v + ")");
}
for (const f of WHOLE) if (runs(f.key)) data[f.key] = await whole(f);
// The Dragon Ball pendant that turned under the pointer: gone (23/11/2026).
if (data["dragon-ball-spin"]) {
  delete data["dragon-ball-spin"];
  for (const old of await readdir(OUT)) if (old.startsWith("dragon-ball-spin")) await rm(join(OUT, old));
}
await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
console.log("  = src/data/mechanisms.generated.json");
