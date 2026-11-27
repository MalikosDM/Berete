#!/usr/bin/env node
/**
 * The chapters at the top of The Atelier ("01 The Birth of Form"…, src/i18n/ui/*.ts atelier.steps), as filmed moments
 * (Yoni, 27/11/2026: "les images sont toujours là, on devait encore arranger cette partie"): each chapter shows a short
 * moment of a making-of film already on the site (public/media/films/<piece>/making.mp4, scripts/film-media.mjs), the
 * moment that shows what the chapter says. Chosen by eye on 27/11/2026, from contact sheets of every making-of film (one
 * frame a second, then four a second around the candidates, then frame by frame at the cuts).
 *
 * Each clip, silent (no sound track at all), in the warm black and white of the atelier (WARM_BW of scripts/hd-media.mjs,
 * the same as its opening film and its former photos: no blue bench in the palette), looping on the page:
 *   public/media/atelier-chapters/<key>.<v>.mp4                 computers: 1080 x 720, a band of the vertical film (H.264)
 *   public/media/atelier-chapters/<key>-mobile.<v>.mp4          phones (and any screen taller than wide): 720 x 1280, whole
 *   public/media/atelier-chapters/<key>-poster.<v>.webp         its image before it plays (a frame of the clip itself)
 *   public/media/atelier-chapters/<key>-poster-mobile.<v>.webp  the same frame, for phones
 * and src/data/atelier-chapters.generated.json (read by src/components/AtelierChapters.tsx). <v>: a fingerprint of the
 * files (no cache keeps an old one). Its own folder: scripts/import-media.mjs prunes public/media/atelier.
 *
 *   npm run atelier-chapters
 *   npm run atelier-chapters -- --only=<key>,<key>      (the other chapters keep their files and their entry)
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WARM_BW } from "./hd-media.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const FILMS = join(ROOT, "public", "media", "films");
const OUT = join(ROOT, "public", "media", "atelier-chapters");
const DATA = join(ROOT, "src", "data", "atelier-chapters.generated.json");

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;

/** The computer version: a band of the vertical film (1080 x 1920), as wide as the film. */
const WIDE = { w: 1080, h: 720 };
/** The phone version: the whole vertical film. */
const TALL = { w: 720, h: 1280 };

/**
 * One chapter: its film (the making-of of a piece, public/media/films/<film>/making.mp4), the part kept (seconds of that
 * film, cut on its own cuts) and the frame used as its image (seconds into the clip). `y`: where the computer band starts
 * in the vertical film (0 at the top, 1200 at most), shot by shot ([second into the clip, y]), so the jewel stays in the
 * upper middle of a wide screen (the text of the chapter sits on the dark bottom).
 */
export const CHAPTERS = [
  {
    // 01 The Birth of Form, "The model becomes raw metal: a pendant before its first stone.": the octagon of Noah Okafor in
    // raw gold, held at the bench before any stone (its frame, then the whole pendant with its rose gold N, the seats of the
    // stones still empty). Making-of 17/v02, 10.62 to 14.70 s (two shots).
    key: "01-birth-of-form",
    film: "noah-okafor-octagon-pendant",
    from: 10.62,
    to: 14.7,
    y: [
      [0, 640],
      [2.19, 580],
    ],
    poster: 3.1,
  },
  {
    // 02 Precision in Every Detail, "Link by link, a bracelet takes shape on the bench.": the links of the BRT Flower chain in
    // raw rose gold, one after the other in the fingers at the bench (a hole drilled, a link ground, a joint fitted).
    // Making-of 36/v02, 4.20 to 9.56 s (four shots).
    key: "02-precision",
    film: "brt-flower-chain",
    from: 4.2,
    to: 9.56,
    y: [
      [0, 470],
      [1.56, 700],
      [3.2, 600],
      [4.24, 560],
    ],
    poster: 0.8,
  },
  {
    // 03 The Pursuit of Brilliance, "Each link is polished by hand, so only the stones are seen.": the same chain, set, held
    // against the polishing wheel link by link, its flower polished with a felt disc, its clasp at the wheel.
    // Making-of 36/v02, 21.76 to 27.60 s (four shots).
    key: "03-brilliance",
    film: "brt-flower-chain",
    from: 21.76,
    to: 27.6,
    y: [
      [0, 820],
      [1.48, 930],
      [2.6, 560],
      [4.24, 930],
    ],
    poster: 3.4,
  },
  {
    // 04 The Final Refinement, "A signature piece in the making, checked under the lamp.": the championship ring of VfB
    // Stuttgart turned in the fingers under the lamp of the bench, its side, then its crest. Making-of 08/v05, 21.64 to
    // 25.85 s (three shots; the film fades to black right after).
    key: "04-refinement",
    film: "vfb-stuttgart-dfb-pokal-2025",
    from: 21.64,
    to: 25.85,
    y: [
      [0, 900],
      [1.19, 450],
      [3.03, 600],
    ],
    poster: 3.6,
  },
];

function run(args) {
  const r = spawnSync("ffmpeg", ["-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) throw new Error("ffmpeg failed: " + args.join(" "));
}

function probe(file, entries) {
  return spawnSync("ffprobe", ["-v", "error", ...entries, "-of", "csv=p=0", file], { encoding: "utf8" }).stdout.trim();
}

/** The band of each shot: "if(lt(t,1.56),470,if(lt(t,3.2),700,…))" (t: seconds into the clip). */
function bandY(steps) {
  const max = 1920 - WIDE.h;
  const clamp = (y) => Math.max(0, Math.min(max, Math.round(y)));
  let expr = String(clamp(steps[steps.length - 1][1]));
  for (let i = steps.length - 2; i >= 0; i--) expr = "if(lt(t\\," + steps[i + 1][0] + ")\\," + clamp(steps[i][1]) + "\\," + expr + ")";
  return expr;
}

async function chapter(c) {
  const src = join(FILMS, c.film, "making.mp4");
  if (!existsSync(src)) throw new Error("Missing film: " + src);
  const [sw, sh] = probe(src, ["-select_streams", "v:0", "-show_entries", "stream=width,height"]).split(",").map(Number);
  if (sw !== 1080 || sh !== 1920) throw new Error(c.film + ": expected a vertical film of 1080 x 1920, found " + sw + " x " + sh);
  const tmp = join(OUT, "." + c.key + ".tmp");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const cut = "trim=start=" + c.from + ":end=" + c.to + ",setpts=PTS-STARTPTS";
  const common = ["-an", "-sn", "-dn", "-map_metadata", "-1", "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];
  const wide = join(tmp, "wide.mp4");
  const tall = join(tmp, "tall.mp4");
  // The trim filter cuts on the exact frames (a seek before the input would start on the nearest key frame).
  run(["-i", src, "-vf", cut + ",crop=" + WIDE.w + ":" + WIDE.h + ":0:" + bandY(c.y) + "," + WARM_BW + ",format=yuv420p", ...common, "-crf", "23", "-maxrate", "2000k", "-bufsize", "4000k", wide]);
  run(["-i", src, "-vf", cut + ",scale=" + TALL.w + ":" + TALL.h + ":flags=lanczos," + WARM_BW + ",format=yuv420p", ...common, "-crf", "26", "-maxrate", "1300k", "-bufsize", "2600k", tall]);
  // Its image: a frame of the clip itself (the same crop, the same light).
  const poster = join(tmp, "poster.webp");
  const posterTall = join(tmp, "poster-mobile.webp");
  run(["-ss", String(c.poster), "-i", wide, "-frames:v", "1", "-c:v", "libwebp", "-quality", "82", poster]);
  run(["-ss", String(c.poster), "-i", tall, "-frames:v", "1", "-c:v", "libwebp", "-quality", "80", posterTall]);
  for (const f of [wide, tall]) if (probe(f, ["-show_entries", "stream=codec_type"]).split("\n").some((t) => t !== "video")) throw new Error(f + ": a track other than the picture");
  const hash = createHash("sha256");
  for (const file of [wide, tall, poster, posterTall]) hash.update(readFileSync(file));
  const v = hash.digest("hex").slice(0, 10);
  for (const old of await readdir(OUT)) if (old.startsWith(c.key + ".") || old.startsWith(c.key + "-")) await rm(join(OUT, old));
  const names = { video: c.key + "." + v + ".mp4", mobile: c.key + "-mobile." + v + ".mp4", poster: c.key + "-poster." + v + ".webp", posterMobile: c.key + "-poster-mobile." + v + ".webp" };
  await rename(wide, join(OUT, names.video));
  await rename(tall, join(OUT, names.mobile));
  await rename(poster, join(OUT, names.poster));
  await rename(posterTall, join(OUT, names.posterMobile));
  await rm(tmp, { recursive: true, force: true });
  const duration = Number(probe(join(OUT, names.video), ["-show_entries", "format=duration"]));
  const kb = (n) => Math.round(readFileSync(join(OUT, n)).length / 1024) + " KB";
  console.log("  + " + c.key + " (" + v + ", " + duration.toFixed(2) + " s; " + kb(names.video) + " / " + kb(names.mobile) + ")");
  const base = "/media/atelier-chapters/";
  return {
    key: c.key,
    video: base + names.video,
    mobile: base + names.mobile,
    poster: base + names.poster,
    posterMobile: base + names.posterMobile,
    width: WIDE.w,
    height: WIDE.h,
    mobileWidth: TALL.w,
    mobileHeight: TALL.h,
    duration: Math.round(duration * 100) / 100,
    source: c.film + "/making " + c.from + "–" + c.to + " s",
  };
}

await mkdir(OUT, { recursive: true });
let previous = [];
try {
  previous = JSON.parse(readFileSync(DATA, "utf8"));
} catch {
  /* first run */
}
const out = [];
for (const c of CHAPTERS) {
  if (ONLY && !ONLY.has(c.key)) {
    const kept = previous.find((p) => p.key === c.key);
    if (kept) out.push(kept);
    continue;
  }
  out.push(await chapter(c));
}
await writeFile(DATA, JSON.stringify(out, null, 1) + "\n");
console.log("  = src/data/atelier-chapters.generated.json");
