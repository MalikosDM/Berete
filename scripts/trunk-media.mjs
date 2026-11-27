#!/usr/bin/env node
/**
 * The Signature Trunks (Yoni, 22/11/2026): every box opens and closes again in its own films, in the same square frame
 * (src/components/TrunkReveal.tsx); its professional photos stay in its gallery ("x photos") and on the page of its piece.
 *
 * Each box has its folder in 00 Contexte Yoni/Ecrins IA (ouverture) v3/<folder>/ (square, silent; Yoni, 23/11/2026: every
 * trunk in the same staging, a black marble base, a golden light from above, a fixed camera, 6 s, its real piece inside),
 * or still in "... v2/" for the boxes not made again yet (set "v2": kept off the page of the trunks, src/data/trunks.ts):
 *   closed.jpg, open.jpg          the box closed, open
 *   ouverture.mp4                 from closed to open
 *   fermeture.mp4                 from open to closed (the same film backwards)
 * and, for some, its professional photos in 00 Contexte Yoni/Boites (photos pro)/<folder>/ (01, 02, ...).
 *
 * Read from the external disk (never modified), written for the web, every name carrying the version of the box (a
 * fingerprint of what was made for it: nobody keeps an old file in a cache):
 *   public/media/trunks/<box>/closed-<w>.<v>.{avif,webp}, open-<w>.<v>.{avif,webp}   (720, 1080, 1440 px, square)
 *   public/media/trunks/<box>/opening.<v>.mp4, closing.<v>.mp4                     (1080 px square, H.264, silent)
 *   public/media/trunks/<box>/photo-NN.<v>.webp (1600 px on the long side, and its copies .w160, .w640, .w1080): its
 *                                               professional photos (never in media/boxes: npm run import-media
 *                                               empties what it did not make there)
 * and src/data/trunks.generated.json. The folder of a box is emptied first (nothing of an older opening stays), and a
 * folder of public/media/trunks that is no box of the list any more is removed. The originals never go in Git.
 *
 *   npm run trunks                                   (every box)
 *   npm run trunks -- --only=sirius,the-hand-cube    (some boxes, by their address; the others stay as they are)
 *
 * BERETE_DISK gives another disk. The two glass displays are first set on the staging of the reference by
 * scripts/trunk-staging.py (python3 with OpenCV; STAGED below).
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { MARGIN, SIZES, sizedPath } from "./media-sizes.mjs";
import { LOUPE, LOUPE_MARGIN, saveLoupes } from "./loupe.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DISK = process.env.BERETE_DISK ?? "/Volumes/Disque externe";
const YONI = join(DISK, "Berete - Dossiers icloud", "00 Contexte Yoni");
/** The folders of the films, by staging: "v3" (23/11/2026, on the page of the trunks), "v2" (the boxes waiting for theirs). */
const SETS = { v3: join(YONI, "Ecrins IA (ouverture) v3"), v2: join(YONI, "Ecrins IA (ouverture) v2") };
const PRO = join(YONI, "Boites (photos pro)");
const OUT = join(ROOT, "public", "media", "trunks");
const DATA = join(ROOT, "src", "data", "trunks.generated.json");
const WIDTHS = [720, 1080, 1440];
const VIDEO = 1080;
const PHOTO = 1600;
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);

/**
 * Each box, in the order of the page: its address (src/data/pieces.ts, BOXES), its staging (the folder of its films: v3 for
 * the 9 boxes made again on 23/11/2026, v2 for the 4 waiting for their v3 files: signature-trunk, photo-case, trophy-trunk,
 * campione-d-italia-case), the folder of its films, of its photos. A box gets "v3" the day its v3 folder arrives.
 */
// (Only the folders of this list are read: "_anciens" (the old files kept by Yoni) and "A LIRE.txt" are no boxes.)
const BOXES = [
  { slug: "signature-trunk", set: "v2", film: "signature-trunk", pro: "signature-trunk" },
  { slug: "sirius", set: "v3", film: "sirius", pro: "sirius" },
  { slug: "tulips-on-tour", set: "v3", film: "tulips-on-tour", pro: "tulips-on-tour" },
  { slug: "dragon-ball-trunk", set: "v3", film: "dragon-ball-trunk", pro: "dragon-ball-trunk" },
  { slug: "the-hand-cube", set: "v3", film: "the-hand-cube", pro: "the-hand-cube" },
  { slug: "dfb-pokal-2025-display", set: "v3", film: "dfb-pokal-2025-display", pro: "vfb-pokal-vitrine" },
  { slug: "world-cup-display", set: "v3", film: "world-cup-display", pro: "bosnie-vitrine-coupe-du-monde" },
  { slug: "photo-case", set: "v2", film: "photo-case", pro: "malle-photo-allemagne" },
  { slug: "brt-coral-case", set: "v3", film: "malle-brt-corail", pro: "malle-brt-corail" },
  { slug: "trophy-trunk", set: "v2", film: "malle-photo-coupe-rouge", pro: "malle-photo-coupe-rouge" },
  // No professional photos: their gallery keeps their real photos (src/data/pieces.ts).
  { slug: "campione-d-italia-case", set: "v2", film: "campione-d-italia-case" },
  { slug: "butterfly-trunk", set: "v3", film: "butterfly-trunk" },
  { slug: "okafor-trunk", set: "v3", film: "okafor-trunk" },
];

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) throw new Error(cmd + " failed: " + args.join(" "));
}
const duration = (file) => Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).stdout.toString().trim());

/** The professional photos of a box, in their order ("01-fermee.jpg", ...). */
const proPhotos = (folder) => (folder && existsSync(join(PRO, folder)) ? readdirSync(join(PRO, folder)).filter((f) => /^\d\d.*\.jpe?g$/i.test(f)).sort() : []);

/*
 * One staging for every trunk (Yoni, 24/11/2026: "la même taille et posés de la même manière, sur exactement le même fond"):
 * the marble base of each box is measured on its closed.jpg, then the square is cropped (a zoom and a shift) so that, on
 * every trunk, the base has the width of the base of the Butterfly Trunk (the reference), the top of its plateau stands at
 * the same height, and the base is centred. The camera of the four files of a box is fixed: the same frame for its two
 * images and its two films.
 *
 * The measure: the zone of the base (left, right, the axis of its top, its bottom), read on a fine grid of closed.jpg (2 %),
 * is refined by sharp — the strongest horizontal edge of the silhouette in a window of ±2.5 % around each side, row by row,
 * and the first row where both sides reach the widest (the top of the plateau) — and the refined value is kept when it falls
 * within 1.2 % of the zone (a sharp edge), else the zone (a reflection or a vein took the edge). `top` (optional): the top of
 * the box itself, read on the grid, so that a tall box is never cut by the square (the zoom is then lowered, said in the log).
 * A new image arriving with the same name (the four boxes to bring onto the black marble) is measured again at the next run.
 */
const BASES = {
  "butterfly-trunk": { zone: [0.13, 0.855, 0.745, 0.83], top: 0.47 },
  "okafor-trunk": { zone: [0.13, 0.855, 0.745, 0.83], top: 0.15 },
  sirius: { zone: [0.1, 0.905, 0.77, 0.89], top: 0.33 },
  "tulips-on-tour": { zone: [0.13, 0.865, 0.735, 0.81], top: 0.45 },
  "dragon-ball-trunk": { zone: [0.195, 0.805, 0.84, 0.9], top: 0.215 },
  "the-hand-cube": { zone: [0.225, 0.775, 0.765, 0.83], top: 0.27 },
  // The two glass displays stand on the staging of the reference (STAGED below): their base is the plinth of the reference.
  "dfb-pokal-2025-display": { zone: [0.13, 0.855, 0.745, 0.83], top: 0.24 },
  "world-cup-display": { zone: [0.13, 0.855, 0.745, 0.83], top: 0.24 },
  "brt-coral-case": { zone: [0.095, 0.9, 0.74, 0.86], top: 0.33 },
};
/** The reference (the Butterfly Trunk): the share of the square its base takes, the height of its plateau, the centre. */
const REFERENCE = "butterfly-trunk";
/*
 * The two glass displays (Yoni, 27/11/2026): rendered with a camera at eye level, their plinth seen edge on, no crop could
 * give them the plinth of the others (it stayed wider, flatter and lower). Their four files are first set on the real staging
 * of the reference (its closed image: its marble plinth, its wall, its golden light; the display moved onto it, its glass and
 * its films kept: scripts/trunk-staging.py), in a temporary folder of the Mac, then made like every box.
 */
const STAGED = new Set(["dfb-pokal-2025-display", "world-cup-display"]);
/** The least room above a box (a share of the square). */
const HEADROOM = 0.05;

/** The marble base of a box, measured on its closed image (shares of the image). */
async function measureBase(file, zone) {
  const N = 1024;
  const { data } = await sharp(file).resize(N, N).greyscale().gamma(2.2, 1).linear(2.2, 0).blur(1.5).raw().toBuffer({ resolveWithObject: true });
  const L = (x, y) => data[Math.max(0, Math.min(N - 1, y)) * N + Math.max(0, Math.min(N - 1, x))];
  const [zl, zr, za, zb] = zone;
  const win = Math.round(0.025 * N);
  const edges = [];
  for (let y = Math.round((za - 0.03) * N); y <= Math.round(zb * N); y++) {
    let l = 0, r = 0, gl = 0, gr = 0;
    for (let x = Math.round(zl * N) - win; x <= Math.round(zl * N) + win; x++) {
      const g = Math.abs(L(x + 3, y) - L(x - 3, y));
      if (g > gl) [gl, l] = [g, x];
    }
    for (let x = Math.round(zr * N) - win; x <= Math.round(zr * N) + win; x++) {
      const g = Math.abs(L(x - 3, y) - L(x + 3, y));
      if (g > gr) [gr, r] = [g, x];
    }
    edges.push({ y, l, r, gl, gr });
  }
  const high = (k) => edges.map((e) => e[k]).sort((a, b) => a - b)[Math.floor(edges.length * 0.9)];
  const strong = edges.filter((e) => e.gl > high("gl") * 0.4 && e.gr > high("gr") * 0.4);
  const ls = strong.map((e) => e.l).sort((a, b) => a - b);
  const rs = strong.map((e) => e.r).sort((a, b) => a - b);
  const left = ls[Math.floor(ls.length * 0.15)] / N;
  const right = rs[Math.floor(rs.length * 0.85)] / N;
  const tol = 0.012;
  const topRow = strong.find((e) => e.l / N <= left + tol && e.r / N >= right - tol);
  const keep = (measured, read) => (measured !== undefined && Math.abs(measured - read) <= tol ? measured : read);
  const base = { left: keep(left, zl), right: keep(right, zr), top: keep(topRow ? topRow.y / N : undefined, za) };
  return { ...base, width: base.right - base.left, center: (base.left + base.right) / 2 };
}

/** The square kept of a box (shares of its image: its corner and its side; outside the image, the ground is extended). */
function frameOf(base, ref, top) {
  let size = base.width / ref.width;
  const fit = top === undefined ? size : Math.max(size, (base.top - top) / (ref.top - HEADROOM));
  const lowered = fit > size + 1e-6;
  size = fit;
  return { x: base.center - 0.5 * size, y: base.top - ref.top * size, size, lowered };
}

/** An image cropped to the frame; what lies outside the image is its ground mirrored (no empty band). */
async function framed(file, frame, width) {
  const px = (v) => Math.round(v * width);
  const x = px(frame.x), y = px(frame.y), size = px(frame.size);
  const pad = Math.max(0, -x, -y, x + size - width, y + size - width);
  // (sharp extracts before it extends: the extended image is made first.)
  const img = pad > 0 ? sharp(await sharp(file).extend({ top: pad, bottom: pad, left: pad, right: pad, extendWith: "mirror" }).toBuffer()) : sharp(file);
  return { img, region: { left: x + pad, top: y + pad, width: size, height: size }, pad };
}

/** "closed-720.webp" -> "closed-720.<v>.webp", "photo-01.w640.webp" -> "photo-01.<v>.w640.webp". */
const versioned = (file, v) => file.replace(/^([^.]+)\./, "$1." + v + ".");

async function writeSquare(file, dir, state, frame) {
  const { width } = await sharp(file).metadata();
  const { img: source, region } = await framed(file, frame, width);
  const cropped = await source.extract(region).toBuffer();
  for (const w of WIDTHS) {
    const img = sharp(cropped).resize(w, w, { fit: "cover", kernel: "lanczos3" });
    await img.clone().avif({ quality: 55, effort: 6 }).toFile(join(dir, state + "-" + w + ".avif"));
    await img.clone().webp({ quality: 78, effort: 6 }).toFile(join(dir, state + "-" + w + ".webp"));
  }
}

/** A film of the box: silent, square, every frame kept (it starts and ends on its images), light enough for a phone. */
function writeFilm(src, out, frame) {
  const width = Number(spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width", "-of", "csv=p=0", src]).stdout.toString().trim());
  const px = (v) => Math.round(v * width / 2) * 2;
  const x = px(frame.x), y = px(frame.y), size = px(frame.size);
  const pad = Math.max(0, -x, -y, x + size - width, y + size - width);
  // The same frame as its images: its ground mirrored beyond the film when the frame goes past it.
  const crop = (pad > 0 ? "pad=" + (width + 2 * pad) + ":" + (width + 2 * pad) + ":" + pad + ":" + pad + ",fillborders=left=" + pad + ":right=" + pad + ":top=" + pad + ":bottom=" + pad + ":mode=mirror," : "") + "crop=" + size + ":" + size + ":" + (x + pad) + ":" + (y + pad) + ",";
  run("ffmpeg", ["-loglevel", "error", "-y", "-i", src, "-an", "-vf", crop + "scale=" + VIDEO + ":" + VIDEO + ":flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-maxrate", "2200k", "-bufsize", "4400k", "-profile:v", "high", "-movflags", "+faststart", "-map_metadata", "-1", out]);
  return Math.round(duration(out) * 100) / 100;
}

if (!existsSync(SETS.v3)) {
  console.error("Folder of the trunks not found (plug the disk in): " + SETS.v3);
  process.exit(1);
}
for (const box of BOXES) {
  if (ONLY.length > 0 && !ONLY.includes(box.slug)) continue;
  for (const f of ["closed.jpg", "open.jpg", "ouverture.mp4", "fermeture.mp4"]) {
    if (!existsSync(join(SETS[box.set], box.film, f))) {
      console.error(box.slug + ": " + join(SETS[box.set], box.film, f) + " is missing");
      process.exit(1);
    }
  }
}
const round = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "number" ? Math.round(v * 10000) / 10000 : v]));
// The reference of the staging: the base of the Butterfly Trunk, measured on its closed image.
const refBox = BOXES.find((b) => b.slug === REFERENCE);
const reference = await measureBase(join(SETS[refBox.set], refBox.film, "closed.jpg"), BASES[REFERENCE].zone);
console.log("  reference " + REFERENCE + ": base " + Math.round(reference.width * 1000) / 10 + " % wide, plateau at " + Math.round(reference.top * 1000) / 10 + " %");
// Some boxes alone: the others keep what was made for them.
const made = ONLY.length > 0 && existsSync(DATA) ? JSON.parse(readFileSync(DATA, "utf8")).trunks : {};
/** The loupe copies of the photos of the boxes made now (scripts/loupe.mjs), by address of their photo; and those boxes. */
const loupes = new Map();
const loupeBoxes = [];
for (const box of BOXES) {
  if (ONLY.length > 0 && !ONLY.includes(box.slug)) continue;
  const dir = join(OUT, box.slug);
  const tmp = join(OUT, "." + box.slug + ".tmp");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  let src = join(SETS[box.set], box.film);
  // A glass display: its files on the staging of the reference first (a temporary folder, removed below).
  const staged = STAGED.has(box.slug) ? await mkdtemp(join(tmpdir(), "berete-staging-")) : null;
  if (staged) {
    const r = spawnSync("python3", ["-I", join(ROOT, "scripts", "trunk-staging.py"), box.slug, src, join(SETS[refBox.set], refBox.film), staged], { stdio: ["ignore", "inherit", "inherit"] });
    if (r.status !== 0) throw new Error("scripts/trunk-staging.py failed for " + box.slug);
    src = staged;
  }
  // Its frame: its base measured, set against the base of the reference (the v2 boxes keep their whole square).
  let frame = { x: 0, y: 0, size: 1 };
  let marble = null;
  if (BASES[box.slug]) {
    marble = await measureBase(join(src, "closed.jpg"), BASES[box.slug].zone);
    // A glass display stands on the plinth of the reference, pixel for pixel: it takes its measure, not a new one (the edge of
    // this plinth is soft enough for the refinement to fall a little elsewhere on a resampled copy).
    if (staged) marble = reference;
    frame = frameOf(marble, reference, BASES[box.slug].top);
    if (frame.lowered) console.log("  ! " + box.slug + ": zoom lowered so that the whole box stays in the square (its base " + Math.round((marble.width / frame.size) * 100) + " % of the square instead of " + Math.round(reference.width * 100) + " %)");
  }
  for (const state of ["closed", "open"]) await writeSquare(join(src, state + ".jpg"), tmp, state, frame);
  const openingDuration = writeFilm(join(src, "ouverture.mp4"), join(tmp, "opening.mp4"), frame);
  const closingDuration = writeFilm(join(src, "fermeture.mp4"), join(tmp, "closing.mp4"), frame);
  if (staged) await rm(staged, { recursive: true, force: true });
  // Its professional photos, for its gallery.
  const photos = [];
  for (const file of proPhotos(box.pro)) {
    const name = file.slice(0, 2);
    const out = join(tmp, "photo-" + name + ".webp");
    const img = sharp(join(PRO, box.pro, file)).rotate();
    const { width, height } = await img.clone().resize(PHOTO, PHOTO, { fit: "inside", kernel: "lanczos3" }).webp({ quality: 82, effort: 6 }).toFile(out);
    // Its smaller copies, named as the site expects them (src/lib/responsive.ts).
    for (const size of SIZES) {
      if (width < size.width * MARGIN) continue;
      await img.clone().resize(size.width, null, { kernel: "lanczos3" }).webp({ quality: size.quality, effort: 6 }).toFile(sizedPath(out, size.width));
    }
    // Its loupe copy (scripts/loupe.mjs): for the viewer only, when its original is larger than its copy.
    const zoom = join(tmp, "photo-" + name + ".loupe.webp");
    const z = await img.clone().resize(LOUPE.long, LOUPE.long, { fit: "inside", kernel: "lanczos3", withoutEnlargement: true }).webp({ quality: LOUPE.quality, effort: 6 }).toFile(zoom);
    const kept = Math.max(z.width, z.height) >= Math.max(width, height) * LOUPE_MARGIN;
    if (!kept) await rm(zoom, { force: true });
    photos.push({ name: "photo-" + name + ".webp", width, height, file: file.replace(/\.jpe?g$/i, ""), zoom: kept ? { width: z.width, height: z.height } : null });
  }
  // Its version: a fingerprint of every file made for it.
  const files = (await readdir(tmp)).sort();
  const hash = createHash("sha256");
  for (const f of files) hash.update(f + "\0").update(readFileSync(join(tmp, f)));
  const v = hash.digest("hex").slice(0, 10);
  for (const f of files) await rename(join(tmp, f), join(tmp, versioned(f, v)));
  await rm(dir, { recursive: true, force: true });
  await rename(tmp, dir);
  const base = "/media/trunks/" + box.slug;
  const entry = {
    base,
    set: box.set,
    version: v,
    widths: WIDTHS,
    size: WIDTHS[WIDTHS.length - 1],
    opening: base + "/" + versioned("opening.mp4", v),
    closing: base + "/" + versioned("closing.mp4", v),
    duration: openingDuration,
    closingDuration,
    // The base measured on its closed image, and the square kept of its images and films (shares of the original square):
    // the places of its light and of its piece (src/data/trunks.ts) follow the same frame.
    ...(marble ? { marble: round(marble), frame: round({ x: frame.x, y: frame.y, size: frame.size }) } : {}),
    // On the staging of the reference (its images and films are the display set on the plinth of the reference).
    ...(staged ? { staged: REFERENCE } : {}),
  };
  if (photos.length > 0) entry.photos = photos.map(({ name, zoom: _zoom, ...p }) => ({ src: base + "/" + versioned(name, v), ...p }));
  for (const p of photos) if (p.zoom) loupes.set(base + "/" + versioned(p.name, v), { src: base + "/" + versioned(p.name.replace(/\.webp$/, ".loupe.webp"), v), ...p.zoom });
  loupeBoxes.push(base + "/");
  made[box.slug] = entry;
  console.log("  + " + box.slug + " (" + v + ", films " + openingDuration + " s / " + closingDuration + " s" + (photos.length ? ", " + photos.length + " photos" : "") + ")");
}
// A folder that is no box of the list any more (an old box, an interrupted run).
const slugs = new Set(BOXES.map((b) => b.slug));
for (const d of await readdir(OUT)) {
  if (!slugs.has(d)) {
    await rm(join(OUT, d), { recursive: true, force: true });
    console.log("  - " + d);
  }
}
// In the order of the list, whatever was made first; a box no longer in it is dropped.
const ordered = Object.fromEntries(BOXES.map((b) => b.slug).filter((slug) => made[slug]).map((slug) => [slug, made[slug]]));
await writeFile(DATA, JSON.stringify({ trunks: ordered }, null, 1) + "\n");
console.log("  = src/data/trunks.generated.json");
await saveLoupes(loupes, loupeBoxes);
