#!/usr/bin/env node
/**
 * The pictures of the pages themselves (Yoni, call of 23-24/11/2026), read on the external disk (never modified) and written
 * for the web with their version in their name (no cache keeps an older one):
 *   - home:     the opening of the home page, one photo full screen: the Sirius trunk open, the BRT logo on the box, the
 *               chain and its pendant in their display (00 Contexte Yoni/Accueil (photo ecrin)/accueil-ecrin-sirius-
 *               desktop.jpg, its vertical version -mobile.jpg for phones), in several widths, AVIF and WebP;
 *   - sphere:   the sphere of the Dragon Ball pendant that turns, a loop of 1.5 s in a square (folder 13, Videos/HD hero),
 *               copied as it is (no new encoding, no sound) with its first image;
 *   - journey:  the pictures of the steps of The Bespoke Journey that are not already on the site (00 Contexte Yoni/Bespoke
 *               Journey (images)/: the private consultation, the editorial shoot), and the 3D drawing of the Inter ring (a
 *               frame of its making-of, already on the site).
 * public/media/pages/<name>-<width>.<v>.<avif|webp>, listed in src/data/pages.generated.json. The originals never go in Git.
 *
 *   npm run page-media
 *   npm run page-media -- --only=home,sphere,journey
 *
 * BERETE_DISK gives another disk.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DISK = process.env.BERETE_DISK ?? "/Volumes/Disque externe";
const ICLOUD = join(DISK, "Berete - Dossiers icloud");
const YONI = join(ICLOUD, "00 Contexte Yoni");
const OUT = join(ROOT, "public", "media", "pages");
const DATA = join(ROOT, "src", "data", "pages.generated.json");

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;

/** Each picture: its name, its file, its widths, and the part of it kept (shares of its width and height), if any. */
const PICTURES = {
  home: [
    ["hero-desktop", join(YONI, "Accueil (photo ecrin)", "accueil-ecrin-sirius-desktop.jpg"), [1280, 1920, 2560, 3200]],
    // Phones (25/11/2026): the vertical version cut the trunk; the photo of computers, framed on the two cases (10 % to 93 %
    // of its width, its whole height), so that both stay whole and centred on an iPhone.
    ["hero-phone", join(YONI, "Accueil (photo ecrin)", "accueil-ecrin-sirius-desktop.jpg"), [720, 1080, 1440, 1920], { crop: [0.1, 0, 0.83, 1] }],
  ],
  journey: [
    ["journey-consultation", join(YONI, "Bespoke Journey (images)", "01-consultation-privee.jpg"), [480, 800, 1200]],
    ["journey-shoot", join(YONI, "Bespoke Journey (images)", "05-shooting-editorial.jpg"), [480, 800, 1200]],
  ],
};
/** The 3D drawing of the Inter ring, a frame of its making-of (already on the site, 25/v02 at 3.8 s): its lower half. */
const CAD = { film: join(ROOT, "public", "media", "films", "campione-d-italia-2023-2024", "making.mp4"), at: 3.8, crop: { left: 152, top: 1010, width: 776, height: 870 } };
const SPHERE = join(ICLOUD, "13 Pendentif sculpte or jaune et rose", "Videos", "HD hero", "13 Dragon Ball - rotation sphere (boucle 1,5 s, carre 600).mp4");

const data = existsSync(DATA) ? JSON.parse(readFileSync(DATA, "utf8")) : {};
const want = (k) => !ONLY || ONLY.has(k);
await mkdir(OUT, { recursive: true });

const fingerprint = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);

/** Removes the earlier files of a name (another version). */
async function clear(name) {
  for (const f of await readdir(OUT)) if (f.startsWith(name + "-") || f.startsWith(name + ".")) await rm(join(OUT, f));
}

for (const [key, list] of Object.entries(PICTURES)) {
  if (!want(key)) continue;
  for (const [name, file, widths, options = {}] of list) {
    if (!existsSync(file)) throw new Error("Missing: " + file + " (is the disk plugged in?)");
    const original = readFileSync(file);
    const full = await sharp(original).rotate().metadata();
    const [cx, cy, cw, ch] = options.crop ?? [0, 0, 1, 1];
    const region = { left: Math.round(cx * full.width), top: Math.round(cy * full.height), width: Math.round(cw * full.width), height: Math.round(ch * full.height) };
    const meta = { width: region.width, height: region.height };
    const v = fingerprint(Buffer.concat([original, Buffer.from(JSON.stringify(options.crop ? [widths, options] : widths))]));
    await clear(name);
    const srcs = { avif: [], webp: [] };
    for (const w of widths.filter((w) => w <= meta.width)) {
      const base = sharp(await sharp(original).rotate().extract(region).toBuffer()).resize({ width: w, withoutEnlargement: true });
      const webp = name + "-" + w + "." + v + ".webp";
      const avif = name + "-" + w + "." + v + ".avif";
      await base.clone().webp({ quality: 82 }).toFile(join(OUT, webp));
      await base.clone().avif({ quality: 58, effort: 4 }).toFile(join(OUT, avif));
      srcs.webp.push({ w, src: "/media/pages/" + webp });
      srcs.avif.push({ w, src: "/media/pages/" + avif });
      console.log("  + public/media/pages/" + webp + " (+ avif)");
    }
    data[name] = { width: meta.width, height: meta.height, ...srcs, src: srcs.webp.at(-1).src };
  }
}

if (want("journey")) {
  if (!existsSync(CAD.film)) throw new Error("Missing: " + CAD.film);
  const frame = execFileSync("ffmpeg", ["-v", "error", "-ss", String(CAD.at), "-i", CAD.film, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], { maxBuffer: 64 << 20 });
  const cut = await sharp(frame).extract(CAD.crop).toBuffer();
  const v = fingerprint(cut);
  await clear("journey-cad");
  const srcs = { avif: [], webp: [] };
  for (const w of [480, 776]) {
    const base = sharp(cut).resize({ width: w });
    const webp = "journey-cad-" + w + "." + v + ".webp";
    const avif = "journey-cad-" + w + "." + v + ".avif";
    await base.clone().webp({ quality: 82 }).toFile(join(OUT, webp));
    await base.clone().avif({ quality: 58, effort: 4 }).toFile(join(OUT, avif));
    srcs.webp.push({ w, src: "/media/pages/" + webp });
    srcs.avif.push({ w, src: "/media/pages/" + avif });
  }
  data["journey-cad"] = { width: CAD.crop.width, height: CAD.crop.height, ...srcs, src: srcs.webp.at(-1).src };
  console.log("  + public/media/pages/journey-cad-*." + v + ".webp");
}

if (want("sphere")) {
  if (!existsSync(SPHERE)) throw new Error("Missing: " + SPHERE);
  const v = fingerprint(readFileSync(SPHERE));
  await clear("dragon-ball-sphere");
  const video = "dragon-ball-sphere." + v + ".mp4";
  const poster = "dragon-ball-sphere." + v + ".webp";
  // Copied as it is (H.264, 600 × 600, 1.5 s): no sound, its index at the start (it plays at once).
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", SPHERE, "-map", "0:v:0", "-c", "copy", "-an", "-movflags", "+faststart", join(OUT, video)]);
  const frame = execFileSync("ffmpeg", ["-v", "error", "-i", SPHERE, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], { maxBuffer: 64 << 20 });
  await sharp(frame).webp({ quality: 82 }).toFile(join(OUT, poster));
  data.sphere = { video: "/media/pages/" + video, poster: "/media/pages/" + poster, width: 600, height: 600 };
  console.log("  + public/media/pages/" + video);
}

await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
console.log("  = src/data/pages.generated.json");
