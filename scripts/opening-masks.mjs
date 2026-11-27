#!/usr/bin/env node
/**
 * The soft outline of a jewel photographed on black, for the opening of its page (26/11/2026): the pendant L of Deniz Undav
 * opens on its real photo (no cut-out keeps both its L and the shadows of its cherub, 25/11/2026), and the black of the
 * photo showed as a rectangle over the sky of its world. Its outline, taken from the photo itself, keeps the jewel whole
 * (its dark faces and the shadows of the cherub inside it) with a thin dark edge that melts into the world: no rectangle.
 *   public/media/opening-masks/<name>.<v>.webp   an alpha mask (the photo's size ratio), used as the CSS mask of the photo
 *   src/data/opening-masks.generated.json        the address of each photo -> its mask
 * Read from the photos of the site (public/media), never from the external disk. <v>: a fingerprint of the mask.
 *
 *   node scripts/opening-masks.mjs
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT = join(ROOT, "public", "media", "opening-masks");
const DATA = join(ROOT, "src", "data", "opening-masks.generated.json");

/**
 * Each photo: its address on the site, the name of its mask, and (in pixels of a 480 px wide copy) the brightness above which
 * a pixel belongs to the jewel (the velvet behind is 0–5, its folds up to 14), the gaps closed inside the jewel, the dark edge
 * kept around it and the softness of that edge. Looked at on the sky of its world (1440, 1280, iPhone).
 */
const MASKS = [{ photo: "/media/hd/deniz-undav-l-pendant/p10.webp", name: "deniz-undav-l-pendant-p10", threshold: 18, close: 10, grow: 6, feather: 5 }];

const WIDTH = 480;
const INF = 1e20;

/** Squared distance of each pixel to the nearest pixel that is set (Felzenszwalb & Huttenlocher). */
function distance(set, w, h) {
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const pass = (len) => {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) ** 2 + f[v[k]];
    }
  };
  const grid = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) grid[i] = set[i] ? 0 : INF;
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    pass(h);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    pass(w);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
  }
  return grid;
}

const grow = (set, w, h, r) => distance(set, w, h).map((d) => (d <= r * r ? 1 : 0));
const shrink = (set, w, h, r) => distance(set.map((s) => (s ? 0 : 1)), w, h).map((d) => (d > r * r ? 1 : 0));

/** The parts of the jewel (4-connected), the small specks of the velvet left out (under 2 % of the largest part). */
function mainParts(set, w, h) {
  const label = new Int32Array(w * h);
  const sizes = [0];
  const stack = [];
  for (let i = 0; i < w * h; i++) {
    if (!set[i] || label[i]) continue;
    const id = sizes.length;
    let size = 0;
    label[i] = id;
    stack.push(i);
    while (stack.length) {
      const p = stack.pop();
      size++;
      const x = p % w;
      for (const q of [p - w, p + w, x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1]) {
        if (q >= 0 && q < w * h && set[q] && !label[q]) {
          label[q] = id;
          stack.push(q);
        }
      }
    }
    sizes.push(size);
  }
  const largest = Math.max(...sizes);
  return set.map((_, i) => (label[i] && sizes[label[i]] >= largest * 0.02 ? 1 : 0));
}

/** The holes inside the jewel filled: the background is what can be reached from the edge of the photo. */
function fillHoles(set, w, h) {
  const out = new Uint8Array(w * h).fill(1);
  const stack = [];
  const visit = (p) => {
    if (out[p] && !set[p]) {
      out[p] = 0;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    visit(x);
    visit((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    visit(y * w);
    visit(y * w + w - 1);
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    if (p >= w) visit(p - w);
    if (p < (h - 1) * w) visit(p + w);
    if (x > 0) visit(p - 1);
    if (x < w - 1) visit(p + 1);
  }
  return out;
}

await mkdir(OUT, { recursive: true });
const data = {};
for (const m of MASKS) {
  const { data: lum, info } = await sharp(join(ROOT, "public", m.photo)).resize(WIDTH).removeAlpha().greyscale().extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let set = Uint8Array.from(lum, (v) => (v > m.threshold ? 1 : 0));
  set = shrink(grow(set, w, h, m.close), w, h, m.close);
  set = fillHoles(mainParts(set, w, h), w, h);
  set = grow(set, w, h, m.grow);
  const alpha = await sharp(Buffer.from(set.map((s) => s * 255)), { raw: { width: w, height: h, channels: 1 } }).blur(m.feather).extractChannel(0).raw().toBuffer();
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) rgba[i * 4 + 3] = alpha[i];
  const file = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).webp({ lossless: true, effort: 6 }).toBuffer();
  const v = createHash("sha256").update(file).digest("hex").slice(0, 10);
  for (const old of await readdir(OUT)) if (old.startsWith(m.name + ".")) await rm(join(OUT, old));
  await writeFile(join(OUT, m.name + "." + v + ".webp"), file);
  data[m.photo] = "/media/opening-masks/" + m.name + "." + v + ".webp";
  console.log("  + " + m.name + " (" + v + ", " + w + " x " + h + ", " + Math.round(file.length / 1024) + " Ko)");
}
await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
console.log("  = src/data/opening-masks.generated.json");
// Only the masks listed here stay.
for (const old of await readdir(OUT)) if (!Object.values(data).some((u) => u.endsWith("/" + old))) await rm(join(OUT, old));
