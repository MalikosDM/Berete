#!/usr/bin/env node
/**
 * The cutouts of the pieces: each view of a piece detached from its background, for the opening of its page (the
 * showcase, src/components/Showcase.tsx) and the admin page "Détourages".
 *
 *   npm run cutouts                 # every piece
 *   npm run cutouts -- --only=<slug>,<slug>
 *   npm run cutouts -- --force      # redo the working photos and the masks too
 *
 * 1. The original photo (HD folders of Yoni on the external disk, a file of "00 Contexte Yoni", else the photo of the
 *    site), cropped if asked, is reduced to 3600 px at most (.local/cutouts/<slug>/<id>.jpg; the originals never go in
 *    Git).
 * 2. macOS lifts the subject (scripts/cutout-mask.swift, built once into .local/bin/cutout-mask): its mask.
 * 3. scripts/cutouts.py redraws the edges from the photo, decontaminates them, fades a chain that leaves the photo, crops
 *    with a margin and checks the result.
 * 4. Each cutout is written in WebP with transparency at 480, 960 and 1600 px (never wider than itself), its version
 *    (the start of a sha256 of its files) in every name so that a redone cutout gets new addresses (the site caches
 *    /media): public/media/cutouts/<slug>/<id>-<w>.<version>.webp, listed in src/data/cutouts.generated.json. The
 *    folder of a piece redone is emptied first; a piece no longer listed loses its folder. The views of the other
 *    pieces are left as they are (an old file without version is renamed with its version).
 * The disk must be connected for the HD photos (BERETE_DISK, default "/Volumes/Disque externe").
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DISK = process.env.BERETE_DISK ?? "/Volumes/Disque externe";
const HD_DIR = join(DISK, "Berete - Dossiers icloud");
const YONI_DIR = join(HD_DIR, "00 Contexte Yoni");
const WORK = join(ROOT, ".local", "cutouts");
const TOOL = join(ROOT, ".local", "bin", "cutout-mask");
const OUT = join(ROOT, "public", "media", "cutouts");
const DATA = join(ROOT, "src", "data", "cutouts.generated.json");
const WIDTHS = [480, 960, 1600];

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const onlyArg = args.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;

/*
 * The views of each piece, the main one first: "hd:<folder>/<photo>" (an HD photo of Yoni), "yoni:<path>" (a file of
 * "00 Contexte Yoni"), or a photo of the site. kind: face, profile, back, detail, worn.
 * - mode "luma": a jewel on a dark bust (only its light is kept). solo: one object only (a reflection on a mirror under
 *   it goes). stones: a coloured stone as dark as the background is kept. crop: [x0, y0, x1, y1] (fractions of the
 *   photo), when the photo shows something else beside the jewel.
 * - ring: a ring on black, kept whole by its light (macOS misses its band in the shadow: the bottom of the rings was cut);
 *   a ring never leaves its photo: one that touches its edge is not clean. whole: the same for another jewel that macOS
 *   sees only in part (level: the least light kept, above a velvet whose threads catch the light). fill: the holes of its outline filled (the
 *   inside of its band, dark); a number: its outline also made convex from that fraction of its height down (a band open
 *   on a side). floor: the line where it stands on a mirror (a fraction of the height, or [x, y] points): below goes.
 * - clean: false: never shown (with its reason in note). note: what to look at by eye (French, shown in the admin).
 * Every view was looked at one by one (on a checkerboard and on black) on 23/11/2026.
 */
const VIEWS = {
  "kevin-schade-dragon-ball-pendant": [
    { id: "p19", kind: "face", from: "hd:13/p19" },
    { id: "p18", kind: "detail", from: "hd:13/p18" },
    { id: "p06", kind: "back", from: "hd:13/p06" },
  ],
  // Since 22/11/2026 the pendant (alone, then on its chain) and the chain alone are two pieces.
  // p68, the pendant alone, is also the large image of the home page on black: from its photo at full resolution
  // (cropped on the pendant), so that its 1600 px file comes from a cutout twice as large.
  "michy-batshuayi-butterfly-pendant": [
    { id: "p68", kind: "face", from: "hd:23/p68", crop: [0, 0.2, 1, 0.88] },
    { id: "p54", kind: "worn", from: "hd:23/p54", mode: "luma" },
  ],
  "butterfly-chain": [{ id: "p60", kind: "face", from: "hd:23/p60", mode: "luma" }],
  // The rings whole (23/11/2026, the bottom of their band was cut): only photos where the whole ring is inside the frame
  // (p40, p43, p15, p11 left it, or lost their band in the shadow). p54 stands on a mirror (cut where it stands); the ring
  // open on its trophy (p04) lies beside its pendant: cropped on it.
  "campione-d-italia-2023-2024": [
    { id: "p08", kind: "face", from: "hd:25/p8", ring: true, solo: true },
    { id: "p13", kind: "profile", from: "hd:25/p13", ring: true, solo: true },
    { id: "p54", kind: "profile", from: "hd:25/p54", ring: true, solo: true, floor: [[0, 0.6], [0.2, 0.607], [0.3, 0.616], [0.45, 0.626], [0.58, 0.63], [0.68, 0.624], [0.78, 0.612], [0.9, 0.6], [1, 0.6]] },
    { id: "p04", kind: "detail", from: "hd:25/p4", solo: true, crop: [0, 0.22, 0.52, 0.58] },
    { id: "p44", kind: "detail", from: "hd:25/p44" },
  ],
  // The ring with its crest first (macOS lifts the front ring only: whole). Its sides with the names: the inside of the
  // band, a mirror of the black background, kept (fill). The other photos (p17, p16, p14, p11, p06) leave the ring on the
  // right: not used.
  "vfb-stuttgart-dfb-pokal-2025": [
    { id: "p13", kind: "face", from: "hd:29/p13" },
    { id: "p12", kind: "profile", from: "hd:29/p12", ring: true, solo: true, fill: 0.33 },
    { id: "p18", kind: "profile", from: "hd:29/p18", ring: true, solo: true, fill: 0.33 },
  ],
  // The band standing, then from the side, then lying down: on a mirror, cut where it stands (its reflection is joined to
  // it, solo was not enough).
  "oval-eternity-band": [
    { id: "p02", kind: "face", from: "hd:10/p2", ring: true, solo: true, floor: 0.713 },
    { id: "p03", kind: "profile", from: "hd:10/p3", ring: true, solo: true, floor: 0.748 },
    { id: "p01", kind: "detail", from: "hd:10/p1", ring: true, solo: true, floor: [[0, 0.53], [0.22, 0.538], [0.5, 0.554], [0.7, 0.548], [0.85, 0.538], [1, 0.53]] },
  ],
  // Retouched on black by Yoni (23/11/2026): cropped around the ring (small in its photo) for a larger cutout.
  "bosnia-and-herzegovina-world-cup-2026-ring": [
    { id: "b04497", kind: "face", from: "yoni:Bague Bosnie (retouche fond noir)/bosnie-04497-fond-noir.jpg", ring: true, solo: true, crop: [0.15, 0.12, 0.9, 0.72] },
    { id: "b04504", kind: "profile", from: "yoni:Bague Bosnie (retouche fond noir)/bosnie-04504-fond-noir.jpg", ring: true, solo: true, crop: [0.15, 0.15, 0.9, 0.85] },
    { id: "b04470", kind: "detail", from: "yoni:Bague Bosnie (retouche fond noir)/bosnie-04470-fond-noir.jpg", ring: true, solo: true, crop: [0.15, 0.12, 0.9, 0.8] },
    { id: "b04506", kind: "profile", from: "yoni:Bague Bosnie (retouche fond noir)/bosnie-04506-fond-noir.jpg", ring: true, solo: true, crop: [0.15, 0.15, 0.9, 0.85] },
  ],
  "noah-okafor-jersey-pendant": [
    { id: "p20", kind: "face", from: "hd:32/p20", mode: "luma" },
    { id: "p06", kind: "back", from: "hd:32/p06", mode: "luma" },
    { id: "p02", kind: "worn", from: "hd:32/p2", mode: "luma" },
  ],
  // p17 shows the whole plate (on p05 the "O" touches the edge of the photo: faded on that side).
  "noah-okafor-oka-pendant": [
    { id: "p17", kind: "face", from: "hd:34/p17" },
    { id: "p05", kind: "detail", from: "hd:34/p5", note: "le « O » touche le bord de la photo : fondu à gauche" },
  ],
  "noah-okafor-octagon-pendant": [
    { id: "p09", kind: "face", from: "hd:17/p9" },
    { id: "p10", kind: "back", from: "hd:17/p10" },
    { id: "p02", kind: "detail", from: "hd:17/p2" },
    { id: "p01", kind: "worn", from: "hd:17/p1", mode: "luma" },
  ],
  "kenan-yildiz-celebration-pendant": [
    { id: "p07", kind: "face", from: "hd:11/p7" },
    { id: "p06", kind: "profile", from: "hd:11/p6" },
    { id: "p04", kind: "detail", from: "hd:11/p4" },
    { id: "p02", kind: "profile", from: "hd:11/p2" },
  ],
  // Its other whole photo stands on a mirror (the reflection would float under the jewel): one view.
  "marcus-thuram-t-serpent-pendant": [{ id: "p08", kind: "face", from: "hd:27/p8", solo: true }],
  "angelo-stiller-as-pendant": [
    { id: "p11", kind: "face", from: "hd:18/p11" },
    { id: "p10", kind: "back", from: "hd:18/p10" },
    { id: "p07", kind: "detail", from: "hd:18/p7" },
    { id: "p03", kind: "worn", from: "hd:18/p3", mode: "luma", clean: false, note: "le haut du buste (cou, épaules) reste en gris autour de la chaîne" },
  ],
  "malik-tillman-cross-pendant": [
    { id: "p17", kind: "face", from: "hd:21/p17" },
    { id: "p03", kind: "back", from: "hd:21/p3", clean: false, note: "le bras droit de la croix sort de la photo, flou : il se dissout en gris" },
    { id: "p06", kind: "worn", from: "hd:21/p6", mode: "luma", clean: false, note: "des plaques du buste restent autour de la chaîne" },
  ],
  // Its photos lying down stand on a mirror: the hand upright only.
  "the-hand": [
    { id: "p07", kind: "face", from: "hd:12/p7", solo: true },
    { id: "p04", kind: "detail", from: "hd:12/p4" },
  ],
  "tulips-on-tour-medallion": [
    { id: "p21", kind: "face", from: "hd:24/p21" },
    { id: "p06", kind: "back", from: "hd:24/p6" },
  ],
  // The whole necklace first (asked by Yoni, 20/11/2026), the T and its drop beside it. Its red pear-shaped stone is as
  // dark as the velvet: kept (stones).
  "marcus-thuram-ruby-t-necklace": [
    { id: "p01", kind: "face", from: "hd:26/p1", mode: "luma", stones: true },
    { id: "p02", kind: "detail", from: "hd:26/p2", stones: true },
    { id: "p12", kind: "detail", from: "hd:26/p12", stones: true },
  ],
  "the-safi-link": [
    { id: "p07", kind: "face", from: "hd:16/p7", mode: "luma" },
    { id: "p05", kind: "profile", from: "hd:16/p5", mode: "luma" },
    { id: "p02", kind: "detail", from: "hd:16/p2" },
  ],
  // The pieces published on 20/11/2026: their photos of the whole jewel on plain black (the chains are all on a bust).
  // On black glass, the reflection under the jewel goes (solo).
  "ampersand-initials-pendant": [{ id: "p07", kind: "face", from: "hd:04/p7" }],
  "thorns-and-roses-crucifix": [
    { id: "p05", kind: "face", from: "hd:05/p5", solo: true, floor: 0.898 },
    { id: "p06", kind: "back", from: "hd:05/p6", solo: true, floor: 0.868 },
  ],
  // Its polished sides mirror the black background: the front view only (the angled views look cut by a black block).
  // The dark wall under its arms is its own side, with its scalloped rim: kept (cut by its light, the rim floats).
  "baguette-cross-pendant": [{ id: "p12", kind: "face", from: "hd:06/p12" }],
  // "Bouzou" (folder 14), the pendant of Loïs Openda (21/11/2026).
  "lois-openda-script-pendant": [{ id: "p21", kind: "face", from: "hd:14/p21", solo: true }],
  // The panther stands on a mirror that the cutout keeps (a reflection stuck to the jewel): it opens on its photo. Here,
  // the reflection under the front view is cut where it stands (floor).
  "crown-of-thorns-jesus-piece": [
    { id: "p12", kind: "face", from: "hd:15/p12", solo: true, floor: [[0, 0.95], [0.55, 0.95], [0.65, 0.941], [1, 0.939]] },
    { id: "p11", kind: "profile", from: "hd:15/p11", solo: true },
    { id: "p18", kind: "back", from: "hd:15/p18", solo: true },
  ],
  // Its back carries the first names of a family: never cut out (the front only).
  "celestial-initial-medallion": [
    { id: "p07", kind: "face", from: "hd:22/p7", solo: true },
    { id: "p16", kind: "profile", from: "hd:22/p16" },
  ],
  // The pieces without a clean photo of the jewel alone: the studio image sent by Yoni (23/11/2026) first, then the best
  // photo of the site (stories at 1080 px).
  "marcus-thuram-thorned-t-pendant": [
    { id: "studio", kind: "face", from: "yoni:Pieces sans photo pro (IA)/marcus-thuram-thorned-t-pendant-studio-ia.jpg" },
    { id: "cover", kind: "face", from: "/media/pieces/marcus-thuram-thorned-t-pendant/cover.webp" },
  ],
  "jamie-leweling-jl-pendant": [{ id: "studio", kind: "face", from: "yoni:Pieces sans photo pro (IA)/jamie-leweling-jl-pendant-studio-ia.jpg" }],
  // Its HD photos (folder 38): macOS sees the angel only on the front view, and by its light alone (luma) the letter lost
  // the dark stones of its foot: the whole letter kept by its light above the velvet (level), its foot made solid (fill).
  // The two others are whole for macOS.
  "deniz-undav-l-pendant": [
    { id: "p10", kind: "face", from: "hd:38/p10", whole: true, solo: true, level: 0.08, fill: 0.8 },
    { id: "p08", kind: "profile", from: "hd:38/p8", solo: true },
    { id: "p02", kind: "back", from: "hd:38/p2", solo: true },
  ],
  "samuel-ballet-jesus-piece": [
    { id: "s02", kind: "face", from: "/media/stories/samuel-ballet/02.webp" },
    { id: "s06", kind: "back", from: "/media/stories/samuel-ballet/06.webp" },
  ],
  "malik-tillman-tm-pendant": [
    { id: "studio", kind: "face", from: "yoni:Pieces sans photo pro (IA)/malik-tillman-tm-pendant-studio-ia.jpg" },
    { id: "cover", kind: "face", from: "/media/pieces/malik-tillman-tm-pendant/cover.webp" },
  ],
  "tanguy-nianzou-fam-medallion": [{ id: "cover", kind: "face", from: "/media/pieces/tanguy-nianzou-fam-medallion/cover.webp" }],
  "eljero-elia-clover-medallion": [
    { id: "s04", kind: "face", from: "/media/stories/eljero-elia/04.webp" },
    { id: "s05", kind: "profile", from: "/media/stories/eljero-elia/05.webp" },
  ],
  // Its HD photos (folder 37, 20/11/2026): the chain and its plate on the bust (by its light), the plate, its back.
  sirius: [
    { id: "p27", kind: "face", from: "hd:37/p27", mode: "luma", solo: true },
    { id: "p28", kind: "detail", from: "hd:37/p28" },
    { id: "p26", kind: "back", from: "hd:37/p26" },
  ],
  // BRT Flower (folder 36): its chain leaves the photo on three sides and its ends come out torn: it opens on its photo.
};

/** Views refused after a look (they stay out of the site), with the reason. */
const REFUSED = {};

const pad2 = (n) => String(n).padStart(2, "0");

/** The version of a view: the start of a sha256 over its files (name and content), then put in each name. */
async function versionFiles(files) {
  const hash = createHash("sha256");
  for (const f of files) hash.update(f.slice(f.lastIndexOf("/") + 1) + "\0").update(readFileSync(f));
  const v = hash.digest("hex").slice(0, 10);
  for (const f of files) await rename(f, f.replace(/\.webp$/, "." + v + ".webp"));
  return v;
}

async function hdFile(ref) {
  const [folder, photo] = ref.split("/");
  const dir = (await readdir(HD_DIR)).find((n) => n.startsWith(folder + " "));
  if (!dir) throw new Error("HD folder not found: " + folder);
  const n = pad2(Number(photo.slice(1)));
  const files = await readdir(join(HD_DIR, dir, "Photos"));
  const file = files.find((f) => new RegExp(" - " + n + "\\.(jpe?g|png|heic)$", "i").test(f));
  if (!file) throw new Error("HD photo not found: " + ref);
  return { path: join(HD_DIR, dir, "Photos", file), label: dir + "/" + file };
}

/** The working photo: the original (converted by macOS, HEIC included), cropped if asked, 3600 px at most. */
async function workPhoto(file, work, crop) {
  if (!crop) {
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "95", "-Z", "3600", file, "--out", work], { stdio: "ignore" });
    return;
  }
  const full = work.replace(/\.jpg$/, ".full.jpg");
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "97", file, "--out", full], { stdio: "ignore" });
  const { width, height } = await sharp(full).metadata();
  const [x0, y0, x1, y1] = crop;
  const left = Math.round(x0 * width);
  const top = Math.round(y0 * height);
  await sharp(full)
    .extract({ left, top, width: Math.round(x1 * width) - left, height: Math.round(y1 * height) - top })
    .resize({ width: 3600, height: 3600, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
    .jpeg({ quality: 95 })
    .toFile(work);
  await rm(full, { force: true });
}

async function prepare(slug, view) {
  const dir = join(WORK, slug);
  await mkdir(dir, { recursive: true });
  const work = join(dir, view.id + ".jpg");
  const mask = join(dir, view.id + ".mask.png");
  let source;
  if (view.from.startsWith("hd:")) {
    const f = await hdFile(view.from.slice(3));
    source = "Dossiers icloud/" + f.label;
    if (FORCE || !existsSync(work)) await workPhoto(f.path, work, view.crop);
  } else if (view.from.startsWith("yoni:")) {
    const file = join(YONI_DIR, view.from.slice(5));
    if (!existsSync(file)) throw new Error("File of 00 Contexte Yoni not found: " + view.from);
    source = "Dossiers icloud/00 Contexte Yoni/" + view.from.slice(5);
    if (FORCE || !existsSync(work)) await workPhoto(file, work, view.crop);
  } else {
    // A photo of the site (a story at 1080 px): never enlarged.
    source = "site " + view.from;
    if (FORCE || !existsSync(work)) await sharp(join(ROOT, "public", view.from)).jpeg({ quality: 97 }).toFile(work);
  }
  if (FORCE || !existsSync(mask)) {
    const r = spawnSync(TOOL, [work, mask], { encoding: "utf8" });
    if (r.status !== 0) {
      // No subject found: a jewel on a bust is kept by its light alone (the whole photo is "near"); else the view goes.
      if ((view.mode ?? "mask") !== "luma") return null;
      const { width, height } = await sharp(work).metadata();
      await sharp({ create: { width, height, channels: 3, background: "#ffffff" } }).grayscale().png().toFile(mask);
    }
  }
  return { work, mask, out: join(dir, view.id + ".cut.png"), mode: view.mode ?? "mask", source };
}

if (!existsSync(TOOL)) {
  await mkdir(join(ROOT, ".local", "bin"), { recursive: true });
  execFileSync("swiftc", ["-O", join(ROOT, "scripts", "cutout-mask.swift"), "-o", TOOL], { stdio: "inherit" });
}
if (!existsSync(HD_DIR)) {
  console.error("The external disk is not connected (" + DISK + "): plug it in, or set BERETE_DISK. Nothing was changed.");
  process.exit(1);
}

let data = { views: {} };
try {
  data = JSON.parse(await (await import("node:fs/promises")).readFile(DATA, "utf8"));
} catch {
  /* first run */
}

for (const [slug, views] of Object.entries(VIEWS)) {
  if (ONLY && !ONLY.has(slug)) continue;
  console.log(slug);
  const jobs = [];
  for (const view of views) {
    const job = await prepare(slug, view);
    if (job) jobs.push({ view, ...job });
    else console.warn("  ! " + view.id + ": no subject found by macOS, view left out");
  }
  const jobFile = join(WORK, slug, "jobs.json");
  await writeFile(
    jobFile,
    JSON.stringify(
      jobs.map(({ view, work, mask, out, mode }) => ({ work, mask, out, mode, solo: !!view.solo, stones: !!view.stones, ring: !!(view.ring || view.whole), fill: view.fill ?? false, floor: view.floor ?? null, level: view.level ?? null })),
    ),
  );
  const py = spawnSync("python3", [join(ROOT, "scripts", "cutouts.py"), jobFile], { encoding: "utf8", maxBuffer: 1 << 24 });
  if (py.status !== 0) throw new Error(py.stderr);
  const reports = py.stdout.trim().split("\n").map((l) => JSON.parse(l));
  const outDir = join(OUT, slug);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const list = [];
  for (const [i, job] of jobs.entries()) {
    const r = reports[i];
    if (r.error) {
      console.warn("  ! " + job.view.id + ": " + r.error);
      continue;
    }
    const widths = WIDTHS.filter((w) => w < r.width);
    if (!widths.length || r.width < WIDTHS[WIDTHS.length - 1]) widths.push(Math.min(r.width, WIDTHS[WIDTHS.length - 1]));
    const uniq = [...new Set(widths)].sort((a, b) => a - b);
    const files = [];
    for (const w of uniq) {
      const file = join(outDir, job.view.id + "-" + w + ".webp");
      await sharp(job.out).resize({ width: w, kernel: "lanczos3" }).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(file);
      files.push(file);
    }
    const version = await versionFiles(files);
    const top = uniq[uniq.length - 1];
    const notes = [];
    if (r.onEdge.length) notes.push("touche le bord (" + r.onEdge.join(", ") + ")");
    if (r.haze > 0.35) notes.push("contour vaporeux à vérifier");
    // A ring never leaves its photo: cut by its edge, it is not shown.
    const cutRing = (job.view.ring || job.view.whole) && r.fade.length > 0;
    if (cutRing) notes.push((job.view.ring ? "la bague" : "le bijou") + " touche le bord de la photo (" + r.fade.join(", ") + ")");
    if (job.view.note) notes.push(job.view.note);
    const refused = REFUSED[slug + "/" + job.view.id];
    if (refused) notes.push(refused);
    list.push({
      id: job.view.id,
      kind: job.view.kind,
      width: top,
      height: Math.round((top * r.height) / r.width),
      widths: uniq,
      version,
      fade: r.fade.length ? r.fade : null,
      clean: r.onEdge.length === 0 && r.haze <= 0.35 && !refused && !cutRing && job.view.clean !== false,
      source: job.source,
      note: notes.join(" ; "),
    });
    console.log("  " + job.view.id + " " + r.width + "x" + r.height + (r.fade.length ? " fade " + r.fade.join(",") : "") + (r.onEdge.length ? " ON EDGE " + r.onEdge.join(",") : "") + " haze " + r.haze + (r.dark ? "" : " (light background)"));
  }
  data.views[slug] = list;
}
// Pieces no longer listed lose their cutouts (and their folder).
for (const slug of Object.keys(data.views)) if (!VIEWS[slug]) delete data.views[slug];
for (const d of await readdir(OUT)) {
  if (!VIEWS[d] || !data.views[d]) {
    await rm(join(OUT, d), { recursive: true, force: true });
    console.log("  - " + d);
  }
}
// Views made before the versions (or left by an interrupted run): their files renamed with their version, any other
// file of the folder removed. Nothing else is redone.
for (const [slug, list] of Object.entries(data.views)) {
  const dir = join(OUT, slug);
  const keep = new Set();
  for (const v of list) {
    if (!v.version) {
      const files = v.widths.map((w) => join(dir, v.id + "-" + w + ".webp"));
      if (files.every((f) => existsSync(f))) v.version = await versionFiles(files);
      else console.warn("  ! " + slug + "/" + v.id + ": files missing, run npm run cutouts -- --only=" + slug);
    }
    for (const w of v.widths) keep.add(v.id + "-" + w + (v.version ? "." + v.version : "") + ".webp");
  }
  for (const f of existsSync(dir) ? await readdir(dir) : []) if (!keep.has(f)) await rm(join(dir, f), { force: true });
}
await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
console.log("  = src/data/cutouts.generated.json");
