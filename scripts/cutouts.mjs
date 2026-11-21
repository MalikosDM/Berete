#!/usr/bin/env node
/**
 * The cutouts of the pieces: each view of a piece detached from its background, for the opening of its page (the
 * showcase, src/components/Showcase.tsx) and the admin page "Détourages".
 *
 *   npm run cutouts                 # every piece
 *   npm run cutouts -- --only=<slug>,<slug>
 *   npm run cutouts -- --force      # redo the working photos and the masks too
 *
 * 1. The original photo (HD folders of Yoni on the external disk, else the photo of the site) is reduced to 3600 px at
 *    most (.local/cutouts/<slug>/<id>.jpg; the originals never go in Git).
 * 2. macOS lifts the subject (scripts/cutout-mask.swift, built once into .local/bin/cutout-mask): its mask.
 * 3. scripts/cutouts.py redraws the edges from the photo, decontaminates them, fades a chain that leaves the photo, crops
 *    with a margin and checks the result.
 * 4. Each cutout is written in WebP with transparency at 480, 960 and 1600 px (never wider than itself):
 *    public/media/cutouts/<slug>/<id>-<w>.webp, and listed in src/data/cutouts.generated.json.
 * The disk must be connected for the HD photos (BERETE_DISK, default "/Volumes/Disque externe").
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DISK = process.env.BERETE_DISK ?? "/Volumes/Disque externe";
const HD_DIR = join(DISK, "Berete - Dossiers icloud");
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
 * The views of each piece, the main one first: "hd:<folder>/<photo>" (an HD photo of Yoni), or a photo of the site.
 * kind: face, profile, back, detail, worn. mode "luma": a jewel on a dark bust (only its light is kept). solo: one object
 * only (a reflection on a mirror under it goes). stones: a coloured stone as dark as the background is kept.
 * note: what to look at by eye (French, shown in the admin).
 */
const VIEWS = {
  "kevin-schade-dragon-ball-pendant": [
    { id: "p19", kind: "face", from: "hd:13/p19" },
    { id: "p18", kind: "detail", from: "hd:13/p18" },
    { id: "p06", kind: "back", from: "hd:13/p06" },
  ],
  "michy-batshuayi-butterfly-chain": [
    { id: "p54", kind: "face", from: "hd:23/p54", mode: "luma" },
    { id: "p68", kind: "detail", from: "hd:23/p68" },
    { id: "p60", kind: "profile", from: "hd:23/p60", mode: "luma" },
  ],
  "campione-d-italia-2023-2024": [
    { id: "p40", kind: "face", from: "hd:25/p40" },
    { id: "p43", kind: "detail", from: "hd:25/p43", solo: true },
    { id: "p15", kind: "profile", from: "hd:25/p15" },
    { id: "p44", kind: "detail", from: "hd:25/p44" },
    { id: "p11", kind: "profile", from: "hd:25/p11" },
  ],
  // The ring open on its trophy first: whole in its photo (the front view p17 leaves it on the right: faded there).
  "vfb-stuttgart-dfb-pokal-2025": [
    { id: "p13", kind: "detail", from: "hd:29/p13" },
    { id: "p17", kind: "face", from: "hd:29/p17" },
    { id: "p16", kind: "profile", from: "hd:29/p16" },
    { id: "p12", kind: "profile", from: "hd:29/p12" },
    { id: "p14", kind: "detail", from: "hd:29/p14" },
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
    { id: "p03", kind: "worn", from: "hd:18/p3", mode: "luma" },
  ],
  "malik-tillman-cross-pendant": [
    { id: "p17", kind: "face", from: "hd:21/p17" },
    { id: "p03", kind: "back", from: "hd:21/p3" },
    { id: "p06", kind: "worn", from: "hd:21/p6", mode: "luma" },
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
    { id: "p05", kind: "face", from: "hd:05/p5", solo: true },
    { id: "p06", kind: "back", from: "hd:05/p6", solo: true },
  ],
  // Its polished sides mirror the black background: the front view only (the angled views look cut by a black block).
  "baguette-cross-pendant": [{ id: "p12", kind: "face", from: "hd:06/p12" }],
  // "Bouzou" (folder 14), the pendant of Loïs Openda (21/11/2026).
  "lois-openda-script-pendant": [{ id: "p21", kind: "face", from: "hd:14/p21", solo: true }],
  // The oval eternity band and the panther stand on a mirror that the cutout keeps (a reflection stuck to the jewel):
  // they open on their photo.
  "crown-of-thorns-jesus-piece": [
    { id: "p12", kind: "face", from: "hd:15/p12", solo: true },
    { id: "p11", kind: "profile", from: "hd:15/p11", solo: true },
    { id: "p18", kind: "back", from: "hd:15/p18", solo: true },
  ],
  // Its back carries the first names of a family: never cut out (the front only).
  "celestial-initial-medallion": [
    { id: "p07", kind: "face", from: "hd:22/p7", solo: true },
    { id: "p16", kind: "profile", from: "hd:22/p16" },
  ],
  // The pieces without HD photos: the best photo of the site (stories at 1080 px).
  "marcus-thuram-thorned-t-pendant": [{ id: "cover", kind: "face", from: "/media/pieces/marcus-thuram-thorned-t-pendant/cover.webp" }],
  // Its HD photos (folder 38, 20/11/2026): macOS may see the angel only, the whole letter is kept by its light.
  "deniz-undav-l-pendant": [
    { id: "p10", kind: "face", from: "hd:38/p10", mode: "luma" },
    { id: "p08", kind: "profile", from: "hd:38/p8", mode: "luma" },
    { id: "p02", kind: "back", from: "hd:38/p2", mode: "luma" },
  ],
  "samuel-ballet-jesus-piece": [
    { id: "s02", kind: "face", from: "/media/stories/samuel-ballet/02.webp" },
    { id: "s06", kind: "back", from: "/media/stories/samuel-ballet/06.webp" },
  ],
  "malik-tillman-tm-pendant": [{ id: "cover", kind: "face", from: "/media/pieces/malik-tillman-tm-pendant/cover.webp" }],
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

async function prepare(slug, view) {
  const dir = join(WORK, slug);
  await mkdir(dir, { recursive: true });
  const work = join(dir, view.id + ".jpg");
  const mask = join(dir, view.id + ".mask.png");
  let source;
  if (view.from.startsWith("hd:")) {
    const f = await hdFile(view.from.slice(3));
    source = "Dossiers icloud/" + f.label;
    if (FORCE || !existsSync(work)) execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "95", "-Z", "3600", f.path, "--out", work], { stdio: "ignore" });
  } else {
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
  await writeFile(jobFile, JSON.stringify(jobs.map(({ view, work, mask, out, mode }) => ({ work, mask, out, mode, solo: !!view.solo, stones: !!view.stones }))));
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
    for (const w of uniq) {
      await sharp(job.out).resize({ width: w, kernel: "lanczos3" }).webp({ quality: 86, alphaQuality: 95, effort: 5 }).toFile(join(outDir, job.view.id + "-" + w + ".webp"));
    }
    const top = uniq[uniq.length - 1];
    const notes = [];
    if (r.onEdge.length) notes.push("touche le bord (" + r.onEdge.join(", ") + ")");
    if (r.haze > 0.35) notes.push("contour vaporeux à vérifier");
    if (job.view.note) notes.push(job.view.note);
    const refused = REFUSED[slug + "/" + job.view.id];
    if (refused) notes.push(refused);
    list.push({
      id: job.view.id,
      kind: job.view.kind,
      width: top,
      height: Math.round((top * r.height) / r.width),
      widths: uniq,
      fade: r.fade.length ? r.fade : null,
      clean: r.onEdge.length === 0 && r.haze <= 0.35 && !refused,
      source: job.source,
      note: notes.join(" ; "),
    });
    console.log("  " + job.view.id + " " + r.width + "x" + r.height + (r.fade.length ? " fade " + r.fade.join(",") : "") + (r.onEdge.length ? " ON EDGE " + r.onEdge.join(",") : "") + " haze " + r.haze + (r.dark ? "" : " (light background)"));
  }
  data.views[slug] = list;
}
// Pieces no longer listed lose their cutouts.
for (const slug of Object.keys(data.views)) if (!VIEWS[slug]) delete data.views[slug];
await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
console.log("  = src/data/cutouts.generated.json");
