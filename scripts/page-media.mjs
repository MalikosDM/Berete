#!/usr/bin/env node
/**
 * The pictures of the pages themselves (Yoni, call of 23-24/11/2026), read on the external disk (never modified) and written
 * for the web with their version in their name (no cache keeps an older one):
 *   - home:     the opening of the home page, one photo full screen: the Sirius trunk open, the BRT logo on the box, the
 *               chain and its pendant in their display (00 Contexte Yoni/Accueil (photo ecrin)/accueil-ecrin-sirius-
 *               desktop.jpg), in several widths, AVIF and WebP. Since 28/11/2026 its ground is extended all around
 *               (scripts/hero-extend.py: the trunk untouched, the black and the floor go on and end in the black of the page),
 *               and its data say where the original photo lies in it (`original`, pixels): the page draws that rectangle at
 *               the size and place it always had, the larger image overflows around it. Phones: the same image, kept between
 *               10 % and 93 % of the width of the photo (the two cases, whole), with its ground above and below;
 *   - sphere:   the sphere of the Dragon Ball pendant that turns, a loop of 1.5 s in a square (folder 13, Videos/HD hero),
 *               copied as it is (no new encoding, no sound) with its first image;
 *   - journey:  the pictures of the steps of The Bespoke Journey that are not already on the site (00 Contexte Yoni/Bespoke
 *               Journey (images)/: the private consultation, the editorial shoot), and the 3D drawing of the Inter ring (a
 *               frame of its making-of, already on the site).
 *   - loops:    the short silent loops of The Mechanism on the home page (28/11/2026), cut from films already on the site:
 *               the clover medallion of Eljero Elia, the finger that sets its centre turning (its story film, 5.75 s to
 *               10.75 s, a square around the medallion), with its first image.
 * public/media/pages/<name>-<width>.<v>.<avif|webp>, listed in src/data/pages.generated.json. The originals never go in Git.
 *
 *   npm run page-media
 *   npm run page-media -- --only=home,sphere,journey
 *
 * BERETE_DISK gives another disk. HERO_SOURCE gives another file for the photo of the opening (the disk unplugged, 28/11/2026:
 * its largest copy of the site, 3200 px, kept in .local/hero-2811/source-3200.webp; the original is 5504 px).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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
  journey: [
    ["journey-consultation", join(YONI, "Bespoke Journey (images)", "01-consultation-privee.jpg"), [480, 800, 1200]],
    ["journey-shoot", join(YONI, "Bespoke Journey (images)", "05-shooting-editorial.jpg"), [480, 800, 1200]],
  ],
};
/** The 3D drawing of the Inter ring, a frame of its making-of (already on the site, 25/v02 at 3.8 s): its lower half. */
const CAD = { film: join(ROOT, "public", "media", "films", "campione-d-italia-2023-2024", "making.mp4"), at: 3.8, crop: { left: 152, top: 1010, width: 776, height: 870 } };
/** The loops of The Mechanism (a film of the site, where it starts, how long, the square kept [x, y, size], its size). */
const LOOPS = {
  "clover-spin": { film: join(ROOT, "public", "media", "stories", "eljero-elia", "02.mp4"), from: 5.75, length: 5, crop: [0, 370, 720], size: 400 },
};
const SPHERE = join(ICLOUD, "13 Pendentif sculpte or jaune et rose", "Videos", "HD hero", "13 Dragon Ball - rotation sphere (boucle 1,5 s, carre 600).mp4");

/**
 * The photo of the opening: its file, the widths of the original photo served on computers (the larger image is wider by as
 * much as its ground), and on phones the part kept (10 % to 93 % of its width: the two cases whole and centred, 25/11/2026).
 */
const HERO = process.env.HERO_SOURCE ? resolve(process.env.HERO_SOURCE) : join(YONI, "Accueil (photo ecrin)", "accueil-ecrin-sirius-desktop.jpg");
const HERO_WIDTHS = [1280, 1920, 2560, 3200];
const HERO_PHONE = { from: 0.1, width: 0.83, widths: [720, 1080, 1440, 1920] };

const data = existsSync(DATA) ? JSON.parse(readFileSync(DATA, "utf8")) : {};
const want = (k) => !ONLY || ONLY.has(k);
await mkdir(OUT, { recursive: true });

const fingerprint = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);

/** Removes the earlier files of a name (another version). */
async function clear(name) {
  for (const f of await readdir(OUT)) if (f.startsWith(name + "-") || f.startsWith(name + ".")) await rm(join(OUT, f));
}

if (want("home")) {
  if (!existsSync(HERO)) throw new Error("Missing: " + HERO + " (is the disk plugged in? else HERO_SOURCE=<file>)");
  const original = readFileSync(HERO);
  const script = readFileSync(join(ROOT, "scripts", "hero-extend.py"));
  const v = fingerprint(Buffer.concat([original, script, Buffer.from(JSON.stringify([HERO_WIDTHS, HERO_PHONE]))]));
  // The larger image, lossless, for the time of the encoding (a file of the system's temporary folder, removed after).
  const png = join(tmpdir(), "berete-hero-" + v + ".png");
  const json = png.replace(/\.png$/, ".json");
  const flat = join(tmpdir(), "berete-hero-src-" + v + ".png");
  await sharp(original).rotate().png({ compressionLevel: 1 }).toFile(flat);
  execFileSync("python3", ["-I", join(ROOT, "scripts", "hero-extend.py"), flat, png, json], { stdio: ["ignore", "inherit", "inherit"] });
  const ext = JSON.parse(readFileSync(json, "utf8"));
  const o = ext.original;
  const big = readFileSync(png);
  rmSync(png);
  rmSync(json);
  rmSync(flat);
  const variants = [
    // Computers: the whole larger image; its widths follow those of the original photo inside it.
    { name: "hero-desktop", region: { left: 0, top: 0, width: ext.width, height: ext.height }, original: o, widths: HERO_WIDTHS.filter((w) => w <= o.width).map((w) => Math.round((w * ext.width) / o.width)) },
    // Phones: the two cases, the whole height (the ground above and below), the screen as wide as the part kept.
    (() => {
      const left = o.x + Math.round(HERO_PHONE.from * o.width);
      const width = Math.round(HERO_PHONE.width * o.width);
      return { name: "hero-phone", region: { left, top: 0, width, height: ext.height }, original: { x: 0, y: o.y, width, height: o.height }, widths: HERO_PHONE.widths.filter((w) => w <= width) };
    })(),
  ];
  for (const { name, region, original: rect, widths } of variants) {
    await clear(name);
    const cut = await sharp(big).extract(region).toBuffer();
    const srcs = { avif: [], webp: [] };
    for (const w of widths) {
      const base = sharp(cut).resize({ width: w, kernel: "lanczos3" });
      const webp = name + "-" + w + "." + v + ".webp";
      const avif = name + "-" + w + "." + v + ".avif";
      await base.clone().webp({ quality: 82 }).toFile(join(OUT, webp));
      await base.clone().avif({ quality: 58, effort: 4 }).toFile(join(OUT, avif));
      srcs.webp.push({ w, src: "/media/pages/" + webp });
      srcs.avif.push({ w, src: "/media/pages/" + avif });
      console.log("  + public/media/pages/" + webp + " (+ avif)");
    }
    data[name] = { width: region.width, height: region.height, original: rect, ...srcs, src: srcs.webp.at(-1).src };
  }
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

if (want("loops")) {
  for (const [name, l] of Object.entries(LOOPS)) {
    if (!existsSync(l.film)) throw new Error("Missing: " + l.film);
    const v = fingerprint(Buffer.concat([readFileSync(l.film), Buffer.from(JSON.stringify(l))]));
    await clear(name);
    const video = name + "." + v + ".mp4";
    const poster = name + "." + v + ".webp";
    const [x, y, side] = l.crop;
    // H.264, no sound, its index at the start (it plays at once), light (it plays only while it is on screen).
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(l.from), "-t", String(l.length), "-i", l.film, "-an", "-vf", "crop=" + side + ":" + side + ":" + x + ":" + y + ",scale=" + l.size + ":" + l.size, "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", join(OUT, video)]);
    const frame = execFileSync("ffmpeg", ["-v", "error", "-i", join(OUT, video), "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], { maxBuffer: 64 << 20 });
    await sharp(frame).webp({ quality: 82 }).toFile(join(OUT, poster));
    data[name] = { video: "/media/pages/" + video, poster: "/media/pages/" + poster, width: l.size, height: l.size };
    console.log("  + public/media/pages/" + video);
  }
}

await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
console.log("  = src/data/pages.generated.json");
