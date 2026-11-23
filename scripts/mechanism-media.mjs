#!/usr/bin/env node
/**
 * The mechanisms of the house (Yoni, 23/11/2026: "Engineering the Extraordinary", page The Atelier, and the Dragon Ball
 * section of the home page): a short film of each, from the folders of Yoni on the external disk (never modified).
 *   public/media/mechanisms/<key>.<v>.mp4         H.264, silent, square, light (played at a click, or while on screen)
 *   public/media/mechanisms/<key>-poster.<v>.webp its image before it plays
 *   public/media/mechanisms/<key>.<v>.webp        a still of a film (a step of The Bespoke Journey)
 * and src/data/mechanisms.generated.json. <v>: a fingerprint of the files (no cache keeps an old one). Originals never go
 * in Git.
 *
 *   npm run mechanisms
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
const OUT = join(ROOT, "public", "media", "mechanisms");
const DATA = join(ROOT, "src", "data", "mechanisms.generated.json");

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

await mkdir(OUT, { recursive: true });
const data = {};
for (const f of FILMS) {
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
await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
console.log("  = src/data/mechanisms.generated.json");
