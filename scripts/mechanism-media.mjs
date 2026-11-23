#!/usr/bin/env node
/**
 * The mechanisms of the house (Yoni, 23/11/2026: "Engineering the Extraordinary", page The Atelier, and the Dragon Ball
 * section of the home page): a short film of each, from the folders of Yoni on the external disk (never modified).
 *   public/media/mechanisms/<key>.<v>.mp4         H.264, silent, square, light (played at a click, or while on screen)
 *   public/media/mechanisms/<key>-poster.<v>.webp its image before it plays
 *   public/media/mechanisms/<key>.<v>.webp        a still of a film (a step of The Bespoke Journey)
 * and src/data/mechanisms.generated.json. <v>: a fingerprint of the files (no cache keeps an old one). Originals never go
 * in Git.
 * Also the Dragon Ball pendant that turns, played while the pointer is on the piece (its page): "dragon-ball-spin", at the
 * resolution of its source (never enlarged nor reduced), silent, a loop without a jump. Its source is DRAGON_BALL_SPIN_SOURCE
 * below: when the professional HD film of Yoni arrives, change only that path and run npm run mechanisms -- --only=
 * dragon-ball-spin (the film is then taken whole, at its own size; give it a window in SPIN_WINDOWS if only a part turns).
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
 * THE SOURCE OF THE DRAGON BALL PENDANT THAT TURNS (key "dragon-ball-spin"): the one line to change when the
 * professional HD film of Yoni arrives (then: npm run mechanisms -- --only=dragon-ball-spin).
 * Today (23/11/2026, every film of the piece looked at frame by frame): the story of Kevin Schade 03/12 (720 x 1280, the
 * best there is): the finished pendant held by its bail, on the black tray of the house, turns from the front to its
 * side and on to its other side. Folder 13 has no film of it turning (video 01: the making-of, the sphere filmed close
 * but not turning; video 02: the raw piece turned by a finger at the bench); stories 07 and 22: the camera moves along
 * it, or it is handled on its chain.
 * ============================================================================================================
 */
const DRAGON_BALL_SPIN_SOURCE = join(STORIES, "03 Kevin Schade", "03 Kevin Schade - 12.mp4");

/**
 * The part of a source that turns, by source: from/to (seconds), the part of the image kept (ffmpeg crop, w:h:x:y), and
 * pingpong (played forward then backward: a loop without a jump). A source not listed is taken whole.
 * Story 03/12: from the front (2.3 s) through its side (5 s) to its other side (8.3 s), then back: the caption of the story
 * ("Final choice. No doubt.", from 1170 px down) left out by the crop, the pendant whole in every image (down to 1070 px).
 */
const SPIN_WINDOWS = {
  [join(STORIES, "03 Kevin Schade", "03 Kevin Schade - 12.mp4")]: { from: 2.3, to: 8.3, crop: "720:1120:0:0", pingpong: true },
};

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

/** The Dragon Ball pendant that turns: at the size of its source, silent, H.264, its index at the start, a loop. */
async function spin(key, src) {
  if (!existsSync(src)) {
    console.error("Not found (plug the disk in): " + src);
    process.exit(1);
  }
  const w = SPIN_WINDOWS[src] ?? {};
  const tmp = join(OUT, "." + key + ".tmp");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const film = join(tmp, key + ".mp4");
  const poster = join(tmp, key + "-poster.webp");
  const window = w.from !== undefined ? ["-ss", String(w.from), "-to", String(w.to)] : [];
  const crop = w.crop ? "crop=" + w.crop + "," : "";
  // Forward, then backward without its two ends (each already shown): the last image leads back to the first.
  const graph = w.pingpong
    ? "[0:v]" + crop + "format=yuv420p,split[a][b];[b]trim=start_frame=1,setpts=PTS-STARTPTS,reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1:a=0[v]"
    : "[0:v]" + crop + "format=yuv420p[v]";
  run([...window, "-i", src, "-an", "-filter_complex", graph, "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-maxrate", "3000k", "-bufsize", "6000k", "-profile:v", "high", "-movflags", "+faststart", "-map_metadata", "-1", film]);
  run(["-ss", String(w.from ?? 0), "-i", src, "-frames:v", "1", "-vf", crop ? crop.slice(0, -1) : "null", "-quality", "85", poster]);
  const hash = createHash("sha256");
  for (const file of [film, poster]) hash.update(readFileSync(file));
  const v = hash.digest("hex").slice(0, 10);
  for (const old of await readdir(OUT)) if (old.startsWith(key + ".") || old.startsWith(key + "-poster.")) await rm(join(OUT, old));
  await rename(film, join(OUT, key + "." + v + ".mp4"));
  await rename(poster, join(OUT, key + "-poster." + v + ".webp"));
  await rm(tmp, { recursive: true, force: true });
  const { width, height } = sizeOf(join(OUT, key + "." + v + ".mp4"));
  console.log("  + " + key + " (" + v + ", " + width + " x " + height + ")");
  return { video: "/media/mechanisms/" + key + "." + v + ".mp4", poster: "/media/mechanisms/" + key + "-poster." + v + ".webp", width, height };
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
if (runs("dragon-ball-spin")) data["dragon-ball-spin"] = await spin("dragon-ball-spin", DRAGON_BALL_SPIN_SOURCE);
await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
console.log("  = src/data/mechanisms.generated.json");
