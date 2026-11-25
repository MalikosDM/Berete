/**
 * The thumbnails of the pieces (the cards of The Creations, of the home page, of the profiles, « All creations » under a
 * piece), all on the same black (audit of 24/11/2026): each card shows the jewel at the same share of its frame, centred.
 * For every published piece:
 *   - its cut-out of the opening (transparent, scripts/cutouts.mjs) when it has one: where the jewel is, read on its alpha;
 *   - else its cover photo, whose edges fade into the page: where the jewel is, read against the background of the photo
 *     (its border), or given by hand in BOX when a reflection or a stand would count as the jewel.
 * Written to src/data/thumbs.generated.json ({ slug: { kind, src, srcSet?, width, height, box: [x, y, w, h] } }, the box in
 * shares of the image), read by src/components/PieceThumb.tsx.
 *
 *   npx tsx scripts/thumbs.ts
 */
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { defaultCatalogue } from "../src/data/catalogue";
import { publicCatalogue } from "../src/data/relations";
import { cutoutSrc, resolveShowcase } from "../src/data/showcase";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT = join(ROOT, "src", "data", "thumbs.generated.json");

/** Boxes given by hand (shares of the photo): the jewel without its reflection or its stand. */
const BOX: Record<string, [number, number, number, number]> = {
  // The panther and its belt, without their reflection in the mirror under them.
  "panther-champion-pendant": [0.06, 0.1, 0.85, 0.63],
  // The ring, without its reflection.
  "oval-eternity-band": [0.13, 0.21, 0.74, 0.52],
  // The Jesus piece, its light floor left out (the frame fades its foot).
  "jesus-piece-red-flowers": [0.1, 0.12, 0.8, 0.64],
};

type Box = [number, number, number, number];
const round = (b: Box): Box => b.map((v) => Math.round(v * 10000) / 10000) as Box;

/** Where the jewel is in a cut-out: its pixels that are not transparent. */
async function alphaBox(file: string): Promise<Box> {
  const { data, info } = await sharp(file).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  return bounds(info.width, info.height, (x, y) => data[y * info.width + x]! > 24);
}

/** Where the jewel is in a photo: the pixels far from the colour of its border (its background). */
async function contentBox(file: string): Promise<Box> {
  const { data, info } = await sharp(file).resize(400).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (x: number, y: number) => [data[(y * w + x) * 3]!, data[(y * w + x) * 3 + 1]!, data[(y * w + x) * 3 + 2]!];
  const border: number[][] = [];
  for (let x = 0; x < w; x += 2) border.push(px(x, 0), px(x, h - 1));
  for (let y = 0; y < h; y += 2) border.push(px(0, y), px(w - 1, y));
  const median = [0, 1, 2].map((c) => border.map((p) => p[c]!).sort((a, b) => a - b)[Math.floor(border.length / 2)]!);
  return bounds(w, h, (x, y) => {
    const p = px(x, y);
    return Math.max(Math.abs(p[0]! - median[0]!), Math.abs(p[1]! - median[1]!), Math.abs(p[2]! - median[2]!)) > 38;
  });
}

/** The box (shares of the image) of the rows and columns where at least a few pixels belong to the jewel. */
function bounds(w: number, h: number, inside: (x: number, y: number) => boolean): Box {
  const rows = new Array(h).fill(0);
  const cols = new Array(w).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) {
    rows[y]++;
    cols[x]++;
  }
  const minRow = Math.max(1, w * 0.004);
  const minCol = Math.max(1, h * 0.004);
  const first = (a: number[], min: number) => a.findIndex((v) => v >= min);
  const last = (a: number[], min: number) => a.length - 1 - [...a].reverse().findIndex((v) => v >= min);
  const y0 = first(rows, minRow), y1 = last(rows, minRow), x0 = first(cols, minCol), x1 = last(cols, minCol);
  if (y0 < 0 || x0 < 0) return [0, 0, 1, 1];
  return [x0 / w, y0 / h, (x1 - x0 + 1) / w, (y1 - y0 + 1) / h];
}

const cat = publicCatalogue(defaultCatalogue);
const out: Record<string, unknown> = {};
for (const piece of cat.pieces) {
  const sc = resolveShowcase(piece.slug, piece.showcase);
  if (sc.mode !== "photo" && sc.views[0]) {
    const v = sc.views[0];
    const w = v.widths.includes(960) ? 960 : v.widths[v.widths.length - 1]!;
    const src = cutoutSrc(piece.slug, v, w);
    out[piece.slug] = {
      kind: "cutout",
      src: cutoutSrc(piece.slug, v, v.widths[v.widths.length - 1]!),
      srcSet: v.widths.map((x) => cutoutSrc(piece.slug, v, x) + " " + x + "w").join(", "),
      width: v.width,
      height: v.height,
      box: round(BOX[piece.slug] ?? (await alphaBox(join(ROOT, "public", src)))),
    };
  } else {
    const c = piece.cover;
    out[piece.slug] = { kind: "photo", src: c.src, width: c.width, height: c.height, box: round(BOX[piece.slug] ?? (await contentBox(join(ROOT, "public", c.src)))) };
  }
}
writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log("  = src/data/thumbs.generated.json (" + Object.keys(out).length + " pieces, " + Object.values(out).filter((e) => (e as { kind: string }).kind === "cutout").length + " cut-outs)");
