#!/usr/bin/env node
/**
 * The cutouts of the pieces: each view of a piece detached from its background, for the opening of its page (the
 * showcase, src/components/Showcase.tsx) and the admin page "Détourages".
 *
 *   npm run cutouts                 # every piece
 *   npm run cutouts -- --only=<slug>,<slug>
 *   npm run cutouts -- --force      # redo the working photos and the masks too
 *
 * 1. The original photo (HD folders of Yoni on the external disk, a file of "00 Contexte Yoni", a photo sent on WhatsApp,
 *    a story of the folder "Berete - Stories" or one image of its film, else the photo of the site), cropped if asked, is
 *    reduced to 3600 px at most (.local/cutouts/<slug>/<id>.jpg; the originals never go in Git).
 * 2. macOS lifts the subject (scripts/cutout-mask.swift, built once into .local/bin/cutout-mask): its mask.
 * 3. scripts/cutouts.py redraws the edges from the photo, decontaminates them, fades a chain that leaves the photo, crops
 *    with a margin and checks the result.
 * 4. Each cutout is written in WebP with transparency at 480, 960 and 1600 px (never wider than itself), its version
 *    (the start of a sha256 of its files) in every name so that a redone cutout gets new addresses (the site caches
 *    /media): public/media/cutouts/<slug>/<id>-<w>.<version>.webp, listed in src/data/cutouts.generated.json. The
 *    files of a view redone are replaced; a piece no longer listed loses its folder. The views of the other
 *    pieces are left as they are (an old file without version is renamed with its version).
 * The HD photos are read from the external disk (BERETE_DISK, default "/Volumes/Disque externe"); BERETE_WA_DIR gives
 * another folder for the photos sent on WhatsApp (default: "Yoni envoie whatsapp" on the Desktop). Without the disk
 * (28/11/2026) the script still runs: a view whose original cannot be read is made again from its working photo and mask
 * of .local/cutouts when they are there, else it keeps its files as they are (never removed); the views read from the
 * repository ("local:", the photos of the site) are made as usual.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DISK = process.env.BERETE_DISK ?? "/Volumes/Disque externe";
const HD_DIR = join(DISK, "Berete - Dossiers icloud");
const YONI_DIR = join(HD_DIR, "00 Contexte Yoni");
const STORIES_DIR = join(DISK, "Berete - Stories");
const WA_DIR = process.env.BERETE_WA_DIR ?? join(homedir(), "Desktop", "Yoni envoie whatsapp");
// The working photos and masks (BERETE_CUTOUTS_WORK: another folder, a temporary one when the Mac is short of room).
const WORK = process.env.BERETE_CUTOUTS_WORK ?? join(ROOT, ".local", "cutouts");
const TOOL = join(ROOT, ".local", "bin", "cutout-mask");
const OUT = join(ROOT, "public", "media", "cutouts");
const DATA = join(ROOT, "src", "data", "cutouts.generated.json");
const WIDTHS = [480, 960, 1600];

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const onlyArg = args.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;
// --preview=<folder>: the views of --only written there (one 1600 px WebP each, <folder>/<slug>/<id>.webp) to look at them;
// public/media/cutouts and the list are left as they are.
const previewArg = args.find((a) => a.startsWith("--preview="));
const PREVIEW = previewArg ? previewArg.slice(10) : null;

/*
 * The views of each piece, the main one first: "hd:<folder>/<photo>" (an HD photo of Yoni), "yoni:<path>" (a file of
 * "00 Contexte Yoni"), "wa:<file>" (a photo sent on WhatsApp), "story:<folder>/<n>" (a story of "Berete - Stories", its
 * image; "story:25/02@6.75": the image of its film at 6.75 s), "png:<path>" (a file of "00 Contexte Yoni" already cut
 * out by hand, transparent: kept as it is, no mask), "local:<path>" (a file of the repository, an original kept in .local/
 * that never goes in Git), or a photo of the site ("/media/…"; a film of the site: "/media/…/05.mp4@8.33", its image at
 * 8.33 s; a loupe copy "….loupe.<v>.webp" is the largest copy of a photo the site has). kind: face, profile, back,
 * detail, worn. A photo sent on WhatsApp, a story, a local file or a photo of the site is never enlarged.
 * - mode "luma": a jewel on a dark bust (only its light is kept). solo: one object only (a reflection on a mirror under
 *   it goes). stones: a coloured stone as dark as the background is kept. crop: [x0, y0, x1, y1] (fractions of the
 *   photo), when the photo shows something else beside the jewel.
 * - ring: a ring on black, kept whole by its light (macOS misses its band in the shadow: the bottom of the rings was cut);
 *   a ring never leaves its photo: one that touches its edge is not clean. whole: the same for another jewel that macOS
 *   sees only in part (level: the least light kept, above a velvet whose threads catch the light). fill: the holes of its outline filled (the
 *   inside of its band, dark); a number: its outline also made convex from that fraction of its height down (a band open
 *   on a side). floor: the line where it stands on a mirror (a fraction of the height, or [x, y] points): below goes.
 * - neutral: a white-metal jewel on skin (a watch on a wrist), kept by its neutral light, the skin left out. seed: [x, y]
 *   (fractions of the photo, after the crop): only the part of the jewel at that point (a watch, not the chain beside it).
 * - A jewel that leaves its photo (a chain going up) is cut clean at the border of the image, flush with it (no margin on that
 *   side; listed in `cut` of the list: the page puts that border at the edge of its frame). Never a fade (27/11/2026: a chain
 *   that dissolves into transparency looks badly cut on any background). cut: { top: 0.3 }: the line (a fraction of the height
 *   of the photo) above which everything goes, the image starting exactly there: the ends of a chain behind the neck of a bust,
 *   or a chain that leaves the photo on its sides, cut below that place so that only the top is cut. keepEdge: true, or the
 *   sides ["right"]: a jewel that only touches the edge of its photo there keeps its margin (not a cut). fadeAt: [[x, y, r]]
 *   a tiny fade around a point (fractions of the photo): where a ring touches its mirror.
 * - The edge on a dark background is redrawn from the jewel next to it (scripts/cutouts.py, defringe; edge: its width in
 *   pixels of a 3600 px photo, 9 by default; defringe: false to keep the edge as it is): never a dark rim or a halo. peel: a
 *   light level (or [level, depth]): the flat black regions no lighter than the background by that much that reach the outside
 *   go (black stains stuck under a jewel). drop: boxes [x0, y0, x1, y1] or polygons [[x, y], ...] (fractions of the photo)
 *   where nothing is the jewel (a part of the piece seen behind it, joined to it). harden: a soft outline made crisp (a part
 *   out of focus, a dim link kept by its light half transparent): true, or the half width of the ramp around 0.5.
 * - hug: a number of pixels (of a 3600 px photo): the jewel kept only that close to the outline of macOS (a lit backdrop seen
 *   between its parts, a grey panel behind it, is not taken for its edge).
 * - solid: polygons [[x, y], ...] (fractions of the photo) known to be the jewel through and through (a face of it as dark as
 *   the background, whose edge came out ragged): made opaque there, its colours those of the photo.
 * - lift: { areas: [polygons], amount, soften } (28/11/2026, the dark underside of the AngeL): in those areas the darkest
 *   tones are lifted a little (amount: the most added to a black pixel, 0.1 = a tenth of white; a pixel lit at 0.5 or more
 *   is untouched, so the glints of the stones and the colours stay), and the outline there is softened over soften pixels
 *   of a 3600 px photo (a dark face against a bright backdrop no longer reads as a black contour).
 * - level (on black): the least light kept, so that a dim surface in the shadow does not stay as a grey smudge. clear: a
 *   light level: the black seen through the gaps of a chain, filled by macOS, cleared (a jewel without black parts).
 *   near (mode "luma"): the colour of a half-transparent edge taken from the jewel next to it, not brightened. holes: a
 *   fraction: the holes of its outline smaller than that part of its box filled (dark stones), not the larger ones.
 * - clean: false: never shown (with its reason in note). note: what to look at by eye (French, shown in the admin).
 * A view that cannot be clean is not listed here at all (it never reaches the site, nor the admin).
 * Every view was looked at one by one (on a checkerboard and on black) on 23/11/2026, then again on grey and on a light
 * background (control sheets in verification/cutouts/) the evening of 23/11/2026.
 */
const VIEWS = {
  // Since 27/11/2026 no view fades any more (a chain that dissolves looks badly cut on any background): a chain leaving its photo
  // is cut clean at the border of the image (cut), the line chosen below the place where its strands leave the photo or go
  // behind the neck of the bust, so that only the top is cut; the page puts that border at the top of its frame.
  "kevin-schade-dragon-ball-pendant": [
    // Its chain leaves the photo at the top (cut there); the black seen through the openings of the coils cleared.
    { id: "p19", kind: "face", from: "hd:13/p19", clear: 0.05 },
    // Its bail touches the top of the photo.
    { id: "p18", kind: "detail", from: "hd:13/p18", clear: 0.05 },
    // Its chain leaves the photo at the top and on the right: cut under the clasp.
    { id: "p06", kind: "back", from: "hd:13/p06", clear: 0.05, cut: { top: 0.1 } },
  ],
  // Since 22/11/2026 the pendant (alone, then on its chain) and the chain alone are two pieces.
  // The pendant on its chain, on the black bust, first (asked by Yoni, 23/11/2026: the hero of its page and of the home
  // page); its photo is the largest there is of it (2160 x 3240, p53 is the same shot). The two ends of the chain go behind
  // the neck of the bust: cut below that place.
  // p68, the pendant alone: from its photo at full resolution (cropped on the pendant), so that its 1600 px file comes
  // from a cutout twice as large.
  "michy-batshuayi-butterfly-pendant": [
    { id: "p54", kind: "face", from: "hd:23/p54", mode: "luma", cut: { top: 0.26 } },
    { id: "p68", kind: "detail", from: "hd:23/p68", crop: [0, 0.2, 1, 0.88] },
  ],
  "butterfly-chain": [{ id: "p60", kind: "face", from: "hd:23/p60", mode: "luma" }],
  // The rings whole (23/11/2026, the bottom of their band was cut): only photos where the whole ring is inside the frame
  // (p40, p43, p15, p11 left it, or lost their band in the shadow). p54 stands on a mirror (cut where it stands); the ring
  // open on its trophy (p04) lies beside its pendant: cropped on it. The black stones of the bezel (as dark as the background)
  // kept whole (holes); the face view cut along the bottom of its bezel (floor): below, the shank in the shadow and out of focus
  // came out in torn black pieces.
  "campione-d-italia-2023-2024": [
    { id: "p08", kind: "face", from: "hd:25/p8", ring: true, solo: true, holes: 0.004, floor: [[0, 0.44], [0.16, 0.45], [0.19, 0.49], [0.23, 0.517], [0.28, 0.54], [0.33, 0.555], [0.45, 0.561], [0.55, 0.562], [0.63, 0.557], [0.68, 0.551], [0.73, 0.536], [0.77, 0.514], [0.81, 0.484], [0.85, 0.45], [1, 0.44]] },
    { id: "p13", kind: "profile", from: "hd:25/p13", ring: true, solo: true, fill: true },
    { id: "p54", kind: "profile", from: "hd:25/p54", ring: true, solo: true, fill: true, fadeAt: [[0.186, 0.6, 0.012], [0.197, 0.601, 0.012]], floor: [[0, 0.6], [0.2, 0.607], [0.3, 0.616], [0.45, 0.626], [0.58, 0.63], [0.68, 0.624], [0.78, 0.612], [0.9, 0.6], [1, 0.6]] },
    // Under the end of its band, a white piece of what lies beside it (cut along the rounded end of the band).
    { id: "p04", kind: "detail", from: "hd:25/p4", solo: true, crop: [0, 0.22, 0.52, 0.58], floor: [[0, 1], [0.772, 1], [0.774, 0.588], [0.79, 0.581], [0.82, 0.577], [0.845, 0.576], [0.853, 0.572], [0.859, 0.563], [0.863, 0.55], [0.866, 1], [1, 1]] },
    { id: "p44", kind: "detail", from: "hd:25/p44", level: 0.12 },
  ],
  // The ring with its crest first (macOS lifts the front ring only: whole). Its sides with the names: the inside of the
  // band, a mirror of the black background, kept (fill), its outline made convex only below its row of stars (from 42 % of
  // its height: from 33 %, the black of the background under the overhanging stars stayed stuck to its side). The polished
  // outside of the band mirrors the black studio: that black is metal, kept. The other photos (p17, p16, p14, p11, p06) leave the ring on the
  // right: not used.
  "vfb-stuttgart-dfb-pokal-2025": [
    { id: "p13", kind: "face", from: "hd:29/p13", level: 0.12 },
    { id: "p12", kind: "profile", from: "hd:29/p12", ring: true, solo: true, fill: 0.42 },
    { id: "p18", kind: "profile", from: "hd:29/p18", ring: true, solo: true, fill: 0.42 },
  ],
  // The oval eternity band (folder 10), cut out at last (27/11/2026): standing on its mirror, cut where it stands (floor),
  // the inside of its band kept open, its back in the shadow redrawn by the light of the stones.
  "oval-eternity-band": [
    { id: "p02", kind: "face", from: "hd:10/p2", ring: true, solo: true, floor: 0.705 },
    { id: "p01", kind: "profile", from: "hd:10/p1", ring: true, solo: true, fill: true, floor: 0.505 },
    { id: "p03", kind: "detail", from: "hd:10/p3", ring: true, solo: true, floor: 0.7 },
  ],
  // Retouched on black by Yoni (23/11/2026): cropped around the ring (small in its photo) for a larger cutout. The dark
  // inside of the band and its black enamel kept whole (fill).
  "bosnia-and-herzegovina-world-cup-2026-ring": [
    { id: "b04497", kind: "face", from: "yoni:Bague Bosnie (retouche fond noir)/bosnie-04497-fond-noir.jpg", ring: true, solo: true, crop: [0.15, 0.12, 0.9, 0.72] },
    { id: "b04504", kind: "profile", from: "yoni:Bague Bosnie (retouche fond noir)/bosnie-04504-fond-noir.jpg", ring: true, solo: true, fill: true, crop: [0.15, 0.15, 0.9, 0.85] },
    { id: "b04470", kind: "detail", from: "yoni:Bague Bosnie (retouche fond noir)/bosnie-04470-fond-noir.jpg", ring: true, solo: true, fill: true, crop: [0.15, 0.12, 0.9, 0.8] },
    { id: "b04506", kind: "profile", from: "yoni:Bague Bosnie (retouche fond noir)/bosnie-04506-fond-noir.jpg", ring: true, solo: true, fill: true, crop: [0.15, 0.15, 0.9, 0.85] },
  ],
  "noah-okafor-jersey-pendant": [
    // Its chain leaves the photo at the top (cut there).
    { id: "p20", kind: "face", from: "hd:32/p20", mode: "luma" },
    // Its back: the chain leaves the top (cut there; the jersey only touches the right edge: its margin kept), the dark stones
    // of its hem kept (holes), the black of the bust under it left out (level).
    { id: "p06", kind: "back", from: "hd:32/p06", mode: "luma", near: true, keepEdge: ["right"], holes: 0.01, level: 0.12 },
    // On the bust: the ends of the chain go behind its neck: cut below.
    { id: "p02", kind: "worn", from: "hd:32/p2", mode: "luma", near: true, cut: { top: 0.11 } },
  ],
  // p17 shows the whole plate (its right side only touches the edge of the photo: its margin kept; the chain leaves the top).
  // p05 was not cut out (its "O" and its "A" seemed to leave the photo); 28/11/2026: the copy of the site holds the whole plate,
  // 30 to 40 px from the sides of the photo ("alone" below).
  // 28/11/2026: the whole piece, its Cuban chain closed (clasp at the top) and its plate, laid in its black case at the reveal
  // (p18, the largest copy of the site: 3200 px), cropped on the case (the phone held beside it left out: drop).
  "noah-okafor-oka-pendant": [
    { id: "p17", kind: "face", from: "hd:34/p17", keepEdge: ["right"] },
    { id: "p18", kind: "face", from: "/media/hd/noah-okafor-oka-pendant/p18.loupe.8ab52ac7cc.webp", crop: [0.2, 0.345, 0.8, 0.64], drop: [[0, 0, 0.22, 0.035], [0, 0, 0.12, 0.06], [0.86, 0, 1, 0.2]], whole: true, level: 0.1, peel: 0.03 },
    // 28/11/2026: the pendant alone, whole with its bail, from its studio photo from the front on the bust (p05, the copy of the
    // site: 1440 px, the plate 1370 px wide), its chain taken away. Its bail is a straight bar of baguettes laid over the chain:
    // everything beside it down to the gap between the chain and the top of the plate (y 740–750) goes (drop, along the edges
    // of the bar measured on the photo, a pixel inside them), the bar itself solid along those cuts. Nothing is invented.
    // (p18, the whole piece in its case, is a phone photo: two links of its chain turned on their edge are pure black there, so
    // the chain reads as broken in two places at the top.)
    {
      id: "alone",
      kind: "face",
      from: "/media/hd/noah-okafor-oka-pendant/p05.webp",
      // (The dark notch of the plate under the bail, around its hinge pin, is kept as the photo shows it: cleared, the bail and
      // its pin read as loose from the plate.)
      drop: [
        [[0, 0], [0.4719, 0], [0.4719, 0.2752], [0.4698, 0.4136], [0, 0.4136]],
        [[0.5407, 0], [1, 0], [1, 0.4136], [0.54, 0.4136], [0.5407, 0.2752]],
        [0.47, 0, 0.541, 0.2735],
      ],
      solid: [[[0.4719, 0.2757], [0.5407, 0.2757], [0.54, 0.4136], [0.4698, 0.4136]]],
    },
  ],
  "noah-okafor-octagon-pendant": [
    { id: "p09", kind: "face", from: "hd:17/p9" },
    { id: "p10", kind: "back", from: "hd:17/p10" },
    { id: "p01", kind: "worn", from: "hd:17/p1", mode: "luma", near: true, holes: 0.004 },
    // p02 no more (27/11/2026): its double tennis chain crosses the whole photo above the bail, it can only be cut on three sides.
  ],
  "kenan-yildiz-celebration-pendant": [
    { id: "p07", kind: "face", from: "hd:11/p7" },
    { id: "p06", kind: "profile", from: "hd:11/p6" },
    { id: "p04", kind: "detail", from: "hd:11/p4", level: 0.1 },
    { id: "p02", kind: "profile", from: "hd:11/p2", harden: true },
  ],
  // Its other whole photo stands on a mirror (the reflection would float under the jewel): one view.
  "marcus-thuram-t-serpent-pendant": [{ id: "p08", kind: "face", from: "hd:27/p8", solo: true }],
  "angelo-stiller-as-pendant": [
    // The black seen through the openings of the letters cleared (macOS fills them); on the front, a grey sliver left alone
    // in the opening of the R goes (largest).
    { id: "p11", kind: "face", from: "hd:18/p11", clear: 0.12, largest: true },
    { id: "p10", kind: "back", from: "hd:18/p10", clear: 0.12 },
    // p03 (on the bust) is not cut out: the top of the bust stays in grey around the chain. p07 no more (27/11/2026): its tennis
    // chain crosses the whole photo above the bail, it can only be cut on three sides.
  ],
  "malik-tillman-cross-pendant": [
    // The black between the round stones of its border cleared; its chain crosses the photo at the top (cut under the place
    // where it leaves the sides). Not cut out: p03 (its right arm leaves the photo, blurred) and p06 (on the bust: its chain in
    // scattered pieces, plates of the bust around it).
    // Alone, its diamond-shaped bail whole (28/11/2026: « The Sculptural Bail » passed under the menu, the chain leaving the
    // screen with it): its chain taken away along the two upper edges of the bail, from the loupe copy of p17 (3200 px). The
    // opening of its page (src/data/pieces.ts).
    {
      id: "alone",
      kind: "face",
      from: "/media/hd/malik-tillman-cross-pendant/p17.loupe.f9c9fbb0f8.webp",
      clear: 0.06,
      drop: [
        [[0, 0], [0.497, 0], [0.497, 0.096], [0.35, 0.193], [0.35, 0.27], [0, 0.27]],
        [[0.497, 0], [1, 0], [1, 0.27], [0.65, 0.27], [0.65, 0.19], [0.497, 0.096]],
      ],
    },
    { id: "p17", kind: "face", from: "hd:21/p17", clear: 0.06, cut: { top: 0.09 } },
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
  // dark as the velvet: kept (stones). The links of the necklace, dim by their light, made crisp (harden: they stayed half
  // transparent); the edge of the drop redrawn wider (edge).
  "marcus-thuram-ruby-t-necklace": [
    { id: "p01", kind: "face", from: "hd:26/p1", mode: "luma", stones: true, harden: true },
    { id: "p02", kind: "detail", from: "hd:26/p2", stones: true, clear: 0.06, cut: { top: 0.07 } },
    { id: "p12", kind: "detail", from: "hd:26/p12", stones: true, edge: 14 },
  ],
  "the-safi-link": [
    // On the bust: the colour of its edges taken from the chain itself, its ends behind the neck cut below that place.
    { id: "p07", kind: "face", from: "hd:16/p7", mode: "luma", near: true, cut: { top: 0.29 } },
    { id: "p05", kind: "profile", from: "hd:16/p5", mode: "luma", near: true, cut: { top: 0.3 } },
    // The dark shadow on the velvet under its flower (it stayed stuck under its walls as black stains) cut along the bottom of
    // the walls of its petals (floor, traced on the photo brightened, 27/11/2026).
    { id: "p02", kind: "detail", from: "hd:16/p2", floor: [[0, 0.56], [0.12, 0.565], [0.16, 0.58], [0.2, 0.61], [0.24, 0.665], [0.3, 0.685], [0.34, 0.705], [0.36, 0.73], [0.47, 0.738], [0.52, 0.748], [0.57, 0.748], [0.6, 0.735], [0.65, 0.72], [0.69, 0.705], [0.75, 0.7], [0.8, 0.64], [0.85, 0.53], [0.88, 0.46], [1, 0.44]] },
  ],
  // The pieces published on 20/11/2026: their photos of the whole jewel on plain black (the chains are all on a bust).
  // On black glass, the reflection under the jewel goes (solo).
  // 28/11/2026 (Yoni: the jewel of the opening whole, never cut by the top of the screen): the pendant alone, whole with its
  // bail, its chain taken away. Its bail is a straight bar laid over the chain (the links pass behind it): everything beside
  // the bail down to the gap above its two hinge blocks goes (drop: two polygons along the edges of the bar, measured on the
  // photo, a pixel inside them; the chain ends 75 px above the blocks), above the bar only the black of the velvet. Nothing is
  // invented: the bar, its top and the pendant are the photo. "film": the pendant alone on black in its film (1.8 s: the
  // sharpest frame where it is whole, its bail open), kept as a second view.
  "ampersand-initials-pendant": [
    {
      id: "alone",
      kind: "face",
      from: "/media/hd/ampersand-initials-pendant/p07.loupe.6bff1269e3.webp",
      clear: 0.06,
      drop: [
        [[0, 0], [0.4632, 0], [0.4632, 0.2248], [0.4655, 0.3938], [0, 0.3938]],
        [[0.5429, 0], [1, 0], [1, 0.3938], [0.5452, 0.3938], [0.5429, 0.2248]],
        [0.46, 0, 0.545, 0.2225],
      ],
      // The bar itself solid along those cut edges (the dark gaps between its diamonds next to the cut went transparent).
      solid: [[[0.4632, 0.2245], [0.5429, 0.2245], [0.5452, 0.4064], [0.4655, 0.4064]]],
    },
    { id: "film", kind: "face", from: "/media/films/ampersand-initials-pendant/reveal.mp4@1.8", solo: true },
    // On its chain (the view of its opening until 28/11/2026): its Cuban chain leaves the photo at the top and on the right, cut at
    // the top of its bail; the black seen through the openings of its « & », beside its E and under its bail (filled by macOS)
    // cleared, from the loupe copy of the same photo (3200 px).
    { id: "p07", kind: "face", from: "/media/hd/ampersand-initials-pendant/p07.loupe.6bff1269e3.webp", cut: { top: 0.22 }, clear: 0.06 },
  ],
  "thorns-and-roses-crucifix": [
    // Cut right under its last baguettes (a black strip of the mirror stayed under it).
    { id: "p05", kind: "face", from: "hd:05/p5", solo: true, floor: 0.8945 },
    { id: "p06", kind: "back", from: "hd:05/p6", solo: true, floor: 0.868 },
  ],
  // Its polished sides mirror the black background: the front view only (the angled views look cut by a black block).
  // The black walls under its arms (its own sides, but they read as a shadow stuck to it) cleared, with the pieces of
  // their scalloped rim: only the front of the cross stays.
  "baguette-cross-pendant": [{ id: "p12", kind: "face", from: "hd:06/p12", clear: 0.1, largest: true }],
  // "Bouzou" (folder 14), the pendant of Loïs Openda (21/11/2026).
  "lois-openda-script-pendant": [{ id: "p21", kind: "face", from: "hd:14/p21", solo: true }],
  "crown-of-thorns-jesus-piece": [
    // Its lowest stones touch their reflection: cut along them, the black between them cleared.
    { id: "p12", kind: "face", from: "hd:15/p12", solo: true, clear: 0.06, floor: [[0, 0.95], [0.55, 0.95], [0.65, 0.941], [0.7, 0.934], [0.72, 0.93], [0.735, 0.93], [0.7475, 0.9365], [0.76, 0.93], [0.78, 0.926], [1, 0.926]] },
    { id: "p11", kind: "profile", from: "hd:15/p11", solo: true },
    { id: "p18", kind: "back", from: "hd:15/p18", solo: true },
  ],
  // Its back carries the first names of a family: never cut out (the front only).
  "celestial-initial-medallion": [
    { id: "p07", kind: "face", from: "hd:22/p7", solo: true },
    { id: "p16", kind: "profile", from: "hd:22/p16" },
  ],
  // The panther of Lasana Keita (folder 19), cut out at last (27/11/2026): standing on a mirror, cut where it stands (floor).
  "panther-champion-pendant": [
    { id: "p10", kind: "face", from: "hd:19/p10", solo: true, floor: 0.7 },
    { id: "p09", kind: "back", from: "hd:19/p9", solo: true, floor: 0.8 },
  ],
  // The L of Deniz Undav (folder 38), cut out at last (27/11/2026): macOS lifts its cherub only, so the whole jewel is kept by
  // its light (whole, the least light 0.1: a faint thread of the backdrop above it stayed), the dark stones of the underside of
  // its foot kept whole (holes). Its back: the back of the cherub, dark behind the L, peeking out as a loose crescent, left out
  // (drop, along the edge of the L).
  // 28/11/2026: the underside of its foot, the real underside of the L in the shadow (dark pavé), read as a black contour on its
  // bright sky; its bottom edge came out ragged (its stones as dark as the backdrop). That face made solid down to the true edge
  // of the foot (floor, measured on the photo), its darkest tones lifted a little and its outline softened (lift), the left side
  // of the bar too: the diamonds, the rose gold of the cherub and the shadows otherwise as they are.
  "deniz-undav-l-pendant": [
    {
      id: "p10",
      kind: "face",
      from: "hd:38/p10",
      whole: true,
      solo: true,
      level: 0.1,
      holes: 0.003,
      floor: [[0, 0.887], [0.18, 0.8869], [0.26, 0.8867], [0.375, 0.8862], [0.525, 0.8856], [0.66, 0.8839], [0.76, 0.8826], [1, 0.8826]],
      solid: [[[0.184, 0.81], [0.83, 0.81], [0.83, 0.833], [0.751, 0.8875], [0.184, 0.8875]]],
      lift: {
        areas: [
          [[0.184, 0.826], [0.84, 0.826], [0.84, 0.833], [0.755, 0.892], [0.17, 0.892]],
          [[0.165, 0.3], [0.205, 0.3], [0.205, 0.892], [0.165, 0.892]],
        ],
        amount: 0.09,
        soften: 2,
      },
    },
    { id: "p02", kind: "back", from: "hd:38/p2", whole: true, solo: true, level: 0.1, drop: [[[0.785, 0.66], [0.774, 0.7], [0.748, 0.8], [0.724, 0.89], [0.716, 0.92], [1, 0.92], [1, 0.66]]] },
  ],
  // The Jesus piece with its crown of red flowers (folder 20), on a light mirror: by the outline of macOS on the photo; the dark
  // rail of its stand under it cut along the bottom of its pavé (floor).
  "jesus-piece-red-flowers": [
    { id: "p06", kind: "face", from: "hd:20/p6", solo: true, floor: [[0, 0.85], [0.4, 0.842], [0.5, 0.83], [0.6, 0.818], [0.7, 0.806], [0.8, 0.792], [0.88, 0.782], [0.92, 0.776], [1, 0.77]] },
    { id: "p05", kind: "back", from: "hd:20/p5", solo: true },
  ],
  // The same piece, under the name it had before Yoni removed it (19/11/2026, unpublished): the same photos.
  "marcus-thuram-jesus-piece": [
    { id: "p06", kind: "face", from: "hd:20/p6", solo: true, floor: [[0, 0.85], [0.4, 0.842], [0.5, 0.83], [0.6, 0.818], [0.7, 0.806], [0.8, 0.792], [0.88, 0.782], [0.92, 0.776], [1, 0.77]] },
    { id: "p05", kind: "back", from: "hd:20/p5", solo: true },
  ],
  // The pieces without a clean photo of the jewel alone: the studio image sent by Yoni (23/11/2026), made by AI: never shown
  // as the piece (src/data/showcase.ts, isAiView), kept for the admin only.
  // 28/11/2026: its real image, the sharpest moment of its film (story 05 of « Thuram SS23 », 8.33 s: the T upright and whole
  // with its bail, on black cloth); its studio image made by AI kept for the admin only.
  "marcus-thuram-thorned-t-pendant": [
    { id: "v05", kind: "face", from: "/media/stories/thuram-ss23/05.mp4@8.33", solo: true },
    { id: "studio", kind: "face", from: "yoni:Pieces sans photo pro (IA)/marcus-thuram-thorned-t-pendant-studio-ia.jpg" },
  ],
  // Its real studio photos on black (WhatsApp, 23/11/2026; they replace its studio image): the front view first (the left
  // corner of the J touches the edge of the photo: its cut kept sharp, its margin kept), then the pendant turned to the left.
  "jamie-leweling-jl-pendant": [
    { id: "front", kind: "face", from: "wa:WhatsApp Image 2026-11-23 at 09.50.36.jpeg", solo: true, keepEdge: true, note: "le coin gauche du J touche le bord de la photo (coupé net)" },
    { id: "left", kind: "profile", from: "wa:WhatsApp Image 2026-11-23 at 09.50.35.jpeg", solo: true, clear: 0.05 },
  ],
  // Its back (story 06) is not cut out: the dark side of the plate along its bottom edge comes out ragged and speckled.
  "samuel-ballet-jesus-piece": [{ id: "s02", kind: "face", from: "/media/stories/samuel-ballet/02.webp" }],
  // 28/11/2026: its real photo, standing on a black mirror (story 05 of « Malik Tillman II », the largest copy of the photo of its
  // cover: 1290 x 2293), cut where its two feet stand on their reflection (floor); its studio image made by AI kept for the admin.
  "malik-tillman-tm-pendant": [
    { id: "s05", kind: "face", from: "/media/stories/malik-tillman-ii/05.loupe.0830ddd49e.webp", solo: true, floor: 0.783, hug: 4 },
    { id: "studio", kind: "face", from: "yoni:Pieces sans photo pro (IA)/malik-tillman-tm-pendant-studio-ia.jpg" },
  ],
  // The FAM medallion: its real photo (the cover of its page: on its Cuban chain against a blue wall), the chain cut above
  // its bail; its studio image made by AI kept for the admin only.
  // 28/11/2026: its professional photos at last (.local/yoni-2811/fam/, scripts/yoni-2811-media.mjs): the front view on its dark
  // bust (fam-06), the medallion, its bail and its Cuban chain up to the top of the photo, where the chain is cut clean.
  "tanguy-nianzou-fam-medallion": [
    { id: "f06", kind: "face", from: "local:.local/yoni-2811/fam/fam-06.jpeg" },
    { id: "cover", kind: "face", from: "/media/pieces/tanguy-nianzou-fam-medallion/cover.webp", solo: true, cut: { top: 0.25 } },
    { id: "studio", kind: "face", from: "yoni:Pieces sans photo pro (IA)/tanguy-nianzou-fam-medallion-studio-ia.jpg" },
  ],
  // The clover of Eljero Elia (stories 04 and 05, 27/11/2026): the front and the side.
  "eljero-elia-clover-medallion": [
    { id: "s04", kind: "face", from: "story:26/4", solo: true },
    { id: "s05", kind: "profile", from: "story:26/5", solo: true },
  ],
  // Its HD photos (folder 37, 20/11/2026): the plate alone first (asked by Yoni, 23/11/2026: the piece alone in hero; p28
  // is its only photo of the whole plate face on), the chain and its plate on the bust (by its light).
  // 24/11/2026 (Yoni): the plate straightened (it leaned to the left by 1.1°), its back no more (the page stays on Sirius).
  sirius: [
    { id: "p28", kind: "face", from: "hd:37/p28", clear: 0.06, rotate: 1.12 },
    { id: "p27", kind: "worn", from: "hd:37/p27", mode: "luma", solo: true, near: true, cut: { top: 0.22 } },
  ],
  // BRT Flowers, one sheet (24/11/2026): its chain alone, whole, from the front on the bust (folder 37, the chain of Sirius).
  "brt-flower-chain": [{ id: "s29", kind: "face", from: "hd:37/p29", mode: "luma", solo: true, near: true, cut: { top: 0.29 } }],
  // The chains on a bust (27/11/2026): by their light, their ends behind the neck cut below that place.
  "baguette-cuban-chain": [
    { id: "p05", kind: "face", from: "hd:30/p5", mode: "luma", solo: true, near: true, cut: { top: 0.3 } },
    { id: "p03", kind: "profile", from: "hd:30/p3", mode: "luma", solo: true, near: true, cut: { top: 0.31 } },
  ],
  "rose-iced-cuban-chain": [
    { id: "p02", kind: "face", from: "hd:01/p2", mode: "luma", solo: true, near: true, cut: { top: 0.31 } },
    { id: "p01", kind: "profile", from: "hd:01/p1", mode: "luma", solo: true, near: true, cut: { top: 0.36 } },
  ],
  "wide-rose-iced-cuban-chain": [
    { id: "p01", kind: "face", from: "hd:02/p1", mode: "luma", solo: true, near: true, cut: { top: 0.22 } },
    { id: "p06", kind: "back", from: "hd:02/p6", mode: "luma", solo: true, near: true, cut: { top: 0.19 } },
  ],
  "two-tone-iced-cuban-chain": [{ id: "p08", kind: "face", from: "hd:31/p8", mode: "luma", solo: true, near: true, cut: { top: 0.26 } }],
  // The Infinity Link (folder 09): on a dark grey velvet bust, by its light above the velvet (level), the lit edges of the
  // shoulders of the bust left out (drop), its ends behind the neck cut.
  "pear-link-chain": [{ id: "p01", kind: "face", from: "hd:09/p1", mode: "luma", solo: true, near: true, level: 0.28, cut: { top: 0.255 }, drop: [[0, 0.2, 0.24, 1], [0.765, 0.2, 1, 1]] }],
  // The same chain under the address it had for a day (unpublished): the same photo.
  "infinity-link-chain": [{ id: "p01", kind: "face", from: "hd:09/p1", mode: "luma", solo: true, near: true, level: 0.28, cut: { top: 0.255 }, drop: [[0, 0.2, 0.24, 1], [0.765, 0.2, 1, 1]] }],
  "cross-infinity-chain": [{ id: "p09", kind: "face", from: "hd:07/p9", mode: "luma", solo: true, near: true, cut: { top: 0.33 } }],
  // The chains published on 24/11/2026, whole from the front on the bust.
  "two-row-tennis-chain": [
    { id: "p04", kind: "face", from: "hd:03/p4", mode: "luma", solo: true, near: true, cut: { top: 0.24 } },
    { id: "p01", kind: "face", from: "hd:03/p1", mode: "luma", solo: true, near: true, cut: { top: 0.28 } },
  ],
  "white-iced-cuban-chain": [{ id: "p02", kind: "face", from: "hd:33/p2", mode: "luma", solo: true, near: true, crop: [0, 0.215, 1, 0.74], cut: { top: 0.11 } }],
  // The Inter Milan pendant (the top of the Inter ring on a chain, WhatsApp 23/11/2026): on black, by its light; its chain
  // leaves the photo at the top (cut there).
  // Its photo sent on WhatsApp can no longer be read on the Mac (27/11/2026): the copy of the site (900 px, the same photo).
  "campione-d-italia-pendant": [{ id: "black", kind: "face", from: "/media/extra/campione-d-italia-pendant/black.6ee0e75501.webp", mode: "luma", near: true, holes: 0.003 }],
  // The pieces removed by Yoni (19/11/2026, unpublished), cut out all the same (27/11/2026) from the only photos there are.
  // Their chains cut at the top (JACK: above the horns of its head, where its chain leaves the photo on the right too; the
  // Flâneur: at its bail). The JC and the 999 are cut by their photo (the C on the right; the 999 on three sides): kept with
  // their margin, not clean (never shown). Not cut out: the NZ ring (held between gloved fingers that fill its band) and the
  // signet ring (on a hand, the skin and the sleeve around it): no clean outline without inventing.
  "tanguy-nianzou-nz-pendant": [{ id: "cover", kind: "face", from: "/media/pieces/tanguy-nianzou-nz-pendant/cover.webp", solo: true, cut: { top: 0.25 } }],
  "jeff-chabot-jc-pendant": [{ id: "cover", kind: "face", from: "/media/pieces/jeff-chabot-jc-pendant/cover.webp", solo: true, clean: false, keepEdge: ["right"], note: "le C sort de la photo à droite" }],
  "sidney-eweka-999-pendant": [{ id: "cover", kind: "face", from: "/media/pieces/sidney-eweka-999-pendant/cover.webp", solo: true, clean: false, keepEdge: ["left", "right", "bottom"], note: "le 999 sort de la photo à gauche, à droite et en bas" }],
  "jack-nameplate-pendant": [{ id: "cover", kind: "face", from: "/media/pieces/jack-nameplate-pendant/cover.webp", solo: true, cut: { top: 0.43 }, clean: false, note: "photo floue de 634 px (story) : le bord sombre de la banderole reste en liseré, jamais montré" }],
  "flaneur-medallion": [{ id: "cover", kind: "face", from: "/media/pieces/flaneur-medallion/cover.webp", solo: true, cut: { top: 0.1 } }],
  // The studio images sent by Yoni the evening of 23/11/2026 (00 Contexte Yoni/Pieces sans photo pro (IA)/), made by AI: never
  // shown as the piece, kept for the admin only.
  "tajon-buchanan-iced-watch": [{ id: "studio", kind: "face", from: "yoni:Pieces sans photo pro (IA)/tajon-buchanan-iced-watch-studio-ia.jpg", level: 0.12, fadeAt: [[0.87, 0.31, 0.07], [0.715, 0.775, 0.06]] }],
  // 28/11/2026: its real photo (its cover: on a black cushion, its Cuban chain and a bangle beside it): the watch alone (seed), its
  // bracelet down to where it goes round the cushion; its studio image made by AI kept for the admin only.
  "marcus-thuram-skeleton-watch": [
    { id: "cover", kind: "face", from: "/media/pieces/marcus-thuram-skeleton-watch/cover.webp", crop: [0.12, 0.17, 0.78, 0.97], solo: true, holes: 0.02, edge: 20 },
    { id: "studio", kind: "face", from: "yoni:Pieces sans photo pro (IA)/marcus-thuram-skeleton-watch-studio-ia.jpg" },
  ],
  "radja-nainggolan-iced-watch": [{ id: "studio", kind: "face", from: "yoni:Pieces sans photo pro (IA)/radja-nainggolan-iced-watch-studio-ia.jpg" }],
  "kevin-schade-twisted-chain": [{ id: "studio", kind: "face", from: "yoni:Pieces sans photo pro (IA)/kevin-schade-twisted-chain-studio-ia.jpg", clear: 0.06 }],
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

/** A story of "Berete - Stories" ("25/02", "25/02@6.75": the image of its film at 6.75 s): its file and the time asked. */
async function storyFile(ref) {
  const [path, at] = ref.split("@");
  const [folder, n] = path.split("/");
  const dir = (await readdir(STORIES_DIR)).find((d) => d.startsWith(folder + " "));
  if (!dir) throw new Error("Story folder not found: " + folder);
  const file = (await readdir(join(STORIES_DIR, dir))).find((f) => new RegExp(" - " + pad2(Number(n)) + "\\.(jpe?g|png|heic|mp4|mov)$", "i").test(f));
  if (!file) throw new Error("Story not found: " + ref);
  return { path: join(STORIES_DIR, dir, file), label: dir + "/" + file + (at ? " @ " + at + " s" : ""), at: at ? Number(at) : null };
}

/** The working photo of a photo sent on WhatsApp or of a story: cropped if asked, never enlarged, 3600 px at most. */
async function workPhotoAsIs(file, work, crop) {
  let img = sharp(file).rotate();
  if (crop) {
    const { width, height } = await img.metadata();
    const [x0, y0, x1, y1] = crop;
    const left = Math.round(x0 * width);
    const top = Math.round(y0 * height);
    img = sharp(await img.extract({ left, top, width: Math.round(x1 * width) - left, height: Math.round(y1 * height) - top }).toBuffer());
  }
  await img.resize({ width: 3600, height: 3600, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" }).jpeg({ quality: 95 }).toFile(work);
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

/** Whether a source is read from the external disk (or the folder of the photos sent on WhatsApp). */
const offDisk = (from) => /^(hd|yoni|png|story|wa):/.test(from);

async function prepare(slug, view, old) {
  const dir = join(WORK, slug);
  await mkdir(dir, { recursive: true });
  const work = join(dir, view.id + ".jpg");
  const mask = join(dir, view.id + ".mask.png");
  let source;
  // Without the disk (28/11/2026): its working photo and its mask made before, when they are both there (the same photo
  // reduced to 3600 px), else the view cannot be made now (its files are kept).
  if (offDisk(view.from) && !view.from.startsWith("wa:") && !existsSync(HD_DIR)) {
    if (!view.from.startsWith("png:") && existsSync(work) && existsSync(mask) && !FORCE) {
      return { work, mask, out: join(dir, view.id + ".cut.png"), mode: view.mode ?? "mask", source: old?.source ?? view.from };
    }
    throw new Error("the external disk is not connected");
  }
  if (view.from.startsWith("local:")) {
    // A file of the repository (an original kept in .local/, never in Git), never enlarged.
    const file = join(ROOT, view.from.slice(6));
    if (!existsSync(file)) throw new Error("File not found: " + view.from.slice(6));
    source = view.from.slice(6);
    if (FORCE || !existsSync(work)) await workPhotoAsIs(file, work, view.crop);
  } else if (view.from.startsWith("hd:")) {
    const f = await hdFile(view.from.slice(3));
    source = "Dossiers icloud/" + f.label;
    if (FORCE || !existsSync(work)) {
      await workPhoto(f.path, work, view.crop);
      // A photo that leans (Sirius, 24/11/2026): straightened first (degrees, clockwise; its size kept, black corners).
      if (view.rotate) {
        const { width, height } = await sharp(work).metadata();
        const turned = await sharp(work).rotate(view.rotate, { background: "#000000" }).toBuffer();
        const t = await sharp(turned).metadata();
        await sharp(turned).extract({ left: Math.round((t.width - width) / 2), top: Math.round((t.height - height) / 2), width, height }).jpeg({ quality: 97 }).toFile(work + ".tmp.jpg");
        await rename(work + ".tmp.jpg", work);
      }
    }
  } else if (view.from.startsWith("yoni:")) {
    const file = join(YONI_DIR, view.from.slice(5));
    if (!existsSync(file)) throw new Error("File of 00 Contexte Yoni not found: " + view.from);
    source = "Dossiers icloud/00 Contexte Yoni/" + view.from.slice(5);
    if (FORCE || !existsSync(work)) await workPhoto(file, work, view.crop);
  } else if (view.from.startsWith("png:")) {
    // Already cut out by hand (a transparent PNG of "00 Contexte Yoni"): no mask, kept as it is (3600 px at most).
    const file = join(YONI_DIR, view.from.slice(4));
    if (!existsSync(file)) throw new Error("File of 00 Contexte Yoni not found: " + view.from);
    const png = join(dir, view.id + ".png");
    if (FORCE || !existsSync(png)) await sharp(file).resize({ width: 3600, height: 3600, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" }).png().toFile(png);
    return { work: png, mask: null, out: join(dir, view.id + ".cut.png"), mode: "png", source: "Dossiers icloud/00 Contexte Yoni/" + view.from.slice(4) };
  } else if (view.from.startsWith("wa:")) {
    const file = join(WA_DIR, view.from.slice(3));
    if (!existsSync(file)) throw new Error("Photo sent on WhatsApp not found: " + file);
    source = "WhatsApp/" + view.from.slice(3);
    if (FORCE || !existsSync(work)) await workPhotoAsIs(file, work, view.crop);
  } else if (view.from.startsWith("story:")) {
    const f = await storyFile(view.from.slice(6));
    source = "Stories/" + f.label;
    if (FORCE || !existsSync(work)) {
      if (f.at === null) await workPhotoAsIs(f.path, work, view.crop);
      else {
        // One image of its film, at its own size.
        const still = work.replace(/\.jpg$/, ".still.png");
        execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(f.at), "-i", f.path, "-frames:v", "1", still], { stdio: "ignore" });
        await workPhotoAsIs(still, work, view.crop);
        await rm(still, { force: true });
      }
    }
  } else {
    // A photo of the site (a story at 1080 px, a loupe copy up to 3200 px): never enlarged. A film of the site: one image of
    // it ("/media/…/05.mp4@8.33"), at its own size.
    source = "site " + view.from;
    const [path, at] = view.from.split("@");
    const file = join(ROOT, "public", path);
    if (!existsSync(file)) throw new Error("File of the site not found: " + path);
    if (FORCE || !existsSync(work)) {
      if (at !== undefined) {
        const still = work.replace(/\.jpg$/, ".still.png");
        execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", at, "-i", file, "-frames:v", "1", still], { stdio: "ignore" });
        await workPhotoAsIs(still, work, view.crop);
        await rm(still, { force: true });
      } else if (view.crop) await workPhotoAsIs(file, work, view.crop);
      else await sharp(file).jpeg({ quality: 97 }).toFile(work);
    }
  }
  if (FORCE || !existsSync(mask)) {
    const r = spawnSync(TOOL, [work, mask], { encoding: "utf8" });
    if (r.status !== 0) {
      // No subject found: a jewel on a bust is kept by its light alone (the whole photo is "near"); else the view goes.
      if ((view.mode ?? "mask") !== "luma" && !view.neutral) return null;
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
  console.warn("The external disk is not connected (" + DISK + "): the views read from it are made from their working photo of .local/cutouts when it is there, else left as they are.");
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
  const before = data.views[slug] ?? [];
  // A view that cannot be made now (its original not readable: the disk, a file the Mac does not let us open) keeps its files
  // as they are when it has them; without them, the piece keeps all its cut-outs as they are.
  const kept = new Map();
  let unreadable = null;
  for (const view of views) {
    const old = before.find((v) => v.id === view.id);
    let job;
    try {
      job = await prepare(slug, view, old);
    } catch (e) {
      const why = view.id + ": " + (e instanceof Error ? e.message : String(e));
      const files = old ? old.widths.map((w) => join(OUT, slug, old.id + "-" + w + (old.version ? "." + old.version : "") + ".webp")) : [];
      if (old && files.every((f) => existsSync(f))) {
        kept.set(view.id, old);
        console.warn("  = " + why + " (kept as it is)");
        continue;
      }
      unreadable = why;
      break;
    }
    if (job) jobs.push({ view, ...job });
    else console.warn("  ! " + view.id + ": no subject found by macOS, view left out");
  }
  if (unreadable) {
    console.warn("  ! " + unreadable + " (its cut-outs are left as they are)");
    continue;
  }
  if (!jobs.length) continue;
  const jobFile = join(WORK, slug, "jobs.json");
  await writeFile(
    jobFile,
    JSON.stringify(
      jobs.map(({ view, work, mask, out, mode }) => ({ work, mask, out, mode, solo: !!view.solo, stones: !!view.stones, ring: !!(view.ring || view.whole), fill: view.fill ?? false, floor: view.floor ?? null, level: view.level ?? null, neutral: !!view.neutral, seed: view.seed ?? null, keepEdge: view.keepEdge ?? false, cut: view.cut ?? null, near: !!view.near, fadeAt: view.fadeAt ?? null, clear: view.clear ?? null, holes: view.holes ?? null, largest: !!view.largest, peel: view.peel ?? null, edge: view.edge ?? null, defringe: view.defringe ?? true, drop: view.drop ?? null, harden: view.harden ?? null, solid: view.solid ?? null, lift: view.lift ?? null, hug: view.hug ?? null })),
    ),
  );
  const py = spawnSync("python3", [join(ROOT, "scripts", "cutouts.py"), jobFile], { encoding: "utf8", maxBuffer: 1 << 24 });
  if (py.status !== 0) throw new Error(py.stderr);
  const reports = py.stdout.trim().split("\n").map((l) => JSON.parse(l));
  if (PREVIEW) {
    await mkdir(join(PREVIEW, slug), { recursive: true });
    for (const [i, job] of jobs.entries()) {
      const r = reports[i];
      if (r.error) console.warn("  ! " + job.view.id + ": " + r.error);
      else {
        await sharp(job.out).resize({ width: Math.min(1600, r.width), kernel: "lanczos3" }).webp({ quality: 88, alphaQuality: 100, effort: 4 }).toFile(join(PREVIEW, slug, job.view.id + ".webp"));
        await rm(job.out, { force: true });
        console.log("  " + job.view.id + " " + r.width + "x" + r.height + (r.cut.length ? " cut " + r.cut.join(",") : "") + (r.onEdge.length ? " ON EDGE " + r.onEdge.join(",") : ""));
      }
    }
    continue;
  }
  const outDir = join(OUT, slug);
  await mkdir(outDir, { recursive: true });
  // The files of the views redone go (the views kept keep theirs; the end of the script removes any other file of the folder).
  const redone = new Set(jobs.map((j) => j.view.id));
  for (const f of await readdir(outDir)) if (redone.has(f.replace(/-\d+(\.[0-9a-f]{10})?\.webp$/, ""))) await rm(join(outDir, f), { force: true });
  const made = new Map();
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
    // The cut-out at full size is only a step (tens of megabytes): gone once its files are written.
    await rm(job.out, { force: true });
    const top = uniq[uniq.length - 1];
    const notes = [];
    if (r.onEdge.length) notes.push("touche le bord (" + r.onEdge.join(", ") + ")");
    if (r.haze > 0.35) notes.push("contour vaporeux à vérifier");
    // A ring never leaves its photo: cut by its edge, it is not shown.
    const cutRing = (job.view.ring || job.view.whole) && r.cut.length > 0;
    if (cutRing) notes.push((job.view.ring ? "la bague" : "le bijou") + " touche le bord de la photo (" + r.cut.join(", ") + ")");
    if (job.view.note) notes.push(job.view.note);
    const refused = REFUSED[slug + "/" + job.view.id];
    if (refused) notes.push(refused);
    made.set(job.view.id, {
      id: job.view.id,
      kind: job.view.kind,
      width: top,
      height: Math.round((top * r.height) / r.width),
      widths: uniq,
      version,
      cut: r.cut.length ? r.cut : null,
      clean: r.onEdge.length === 0 && r.haze <= 0.35 && !refused && !cutRing && job.view.clean !== false,
      source: job.source,
      note: notes.join(" ; "),
    });
    console.log("  " + job.view.id + " " + r.width + "x" + r.height + (r.cut.length ? " cut " + r.cut.join(",") : "") + (r.onEdge.length ? " ON EDGE " + r.onEdge.join(",") : "") + " haze " + r.haze + (r.dark ? "" : " (light background)"));
  }
  // In the order of the list: the views made now, the views kept as they were.
  data.views[slug] = views.map((v) => made.get(v.id) ?? kept.get(v.id)).filter(Boolean);
  // Written after each piece: an interrupted run never leaves the list behind the files.
  if (!ONLY || ONLY.size > 1) await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
}
if (PREVIEW) process.exit(0);
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
