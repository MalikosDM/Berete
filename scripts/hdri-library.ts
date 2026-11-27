/**
 * Our own HDR lighting library (26/11/2026), made by code (src/viewer/hdri/library.ts), written as Radiance .hdr files:
 *   - public/hdri/berete/<id>.hdr, 2048 × 1024 (computers), and <id>-1k.hdr, 1024 × 512 (phones): RGBE, 32 bits per pixel,
 *     new-style run-length scanlines (a lighting of the stones is almost all black: a few dozen kilobytes);
 *   - src/data/hdri.generated.json: { id: { v, bytes, bytes1k } }, v = 8 characters of the hash of both files, for the
 *     addresses /hdri/berete/<id>.hdr?v=… (src/viewer/hdri/index.ts);
 *   - ~/Downloads/_verif-3d/hdri-planche.png: the 20 lightings, tone-mapped, each with a chrome ball seen from the default
 *     camera (its centre shows what is on the camera's side), to check their look.
 * Each file is read back with three's own HDRLoader and compared with the pixels it was made from.
 *
 *   npx tsx scripts/hdri-library.ts
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import { FloatType } from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { HDRI, hdriPixels } from "../src/viewer/hdri/library";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT_DIR = join(ROOT, "public", "hdri", "berete");
const OUT_JSON = join(ROOT, "src", "data", "hdri.generated.json");
const VERIF_DIR = join(homedir(), "Downloads", "_verif-3d-v3");

/* ---------- Radiance RGBE ---------- */

/**
 * Linear RGB → RGBE bytes, the mantissas as three's HDRLoader reads them back (value = byte · 2^(e − 128) / 255): the
 * shared exponent is the smallest power of two at or above the brightest channel.
 */
function toRgbe(px: Float32Array, count: number): Uint8Array {
  const out = new Uint8Array(count * 4);
  for (let i = 0; i < count; i++) {
    const r = Math.max(0, px[i * 3]!);
    const g = Math.max(0, px[i * 3 + 1]!);
    const b = Math.max(0, px[i * 3 + 2]!);
    const m = Math.max(r, g, b);
    if (m < 1e-30) continue;
    let e = Math.ceil(Math.log2(m));
    while (2 ** e < m) e++;
    while (2 ** (e - 1) >= m) e--;
    const scale = 255 / 2 ** e;
    out[i * 4] = Math.min(255, Math.round(r * scale));
    out[i * 4 + 1] = Math.min(255, Math.round(g * scale));
    out[i * 4 + 2] = Math.min(255, Math.round(b * scale));
    out[i * 4 + 3] = e + 128;
  }
  return out;
}

/** One channel of one scanline, run-length coded (Greg Ward's scheme: runs of 4 or more, literal stretches of up to 128). */
function rle(data: Uint8Array, out: number[]): void {
  const n = data.length;
  const MIN_RUN = 4;
  let cur = 0;
  while (cur < n) {
    let begin = cur;
    let run = 0;
    let previous = 0;
    // The next run of 4 or more equal bytes, if any.
    while (run < MIN_RUN && begin < n) {
      begin += run;
      previous = run;
      run = 1;
      while (begin + run < n && run < 127 && data[begin] === data[begin + run]) run++;
    }
    // A short run just before it is written as a run too.
    if (previous > 1 && previous === begin - cur) {
      out.push(128 + previous, data[cur]!);
      cur = begin;
    }
    while (cur < begin) {
      const count = Math.min(128, begin - cur);
      out.push(count);
      for (let k = 0; k < count; k++) out.push(data[cur + k]!);
      cur += count;
    }
    if (run >= MIN_RUN) {
      out.push(128 + run, data[begin]!);
      cur += run;
    }
  }
}

function encodeHdr(px: Float32Array, width: number, height: number, id: string): Uint8Array {
  const rgbe = toRgbe(px, width * height);
  const header = "#?RADIANCE\n# Berete Jewellers lighting '" + id + "', made by code (scripts/hdri-library.ts)\nFORMAT=32-bit_rle_rgbe\n\n-Y " + height + " +X " + width + "\n";
  const chunks: Uint8Array[] = [new TextEncoder().encode(header)];
  const channel = new Uint8Array(width);
  for (let y = 0; y < height; y++) {
    const out: number[] = [2, 2, width >> 8, width & 0xff];
    for (let c = 0; c < 4; c++) {
      for (let x = 0; x < width; x++) channel[x] = rgbe[(y * width + x) * 4 + c]!;
      rle(channel, out);
    }
    chunks.push(Uint8Array.from(out));
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const file = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    file.set(c, at);
    at += c.length;
  }
  return file;
}

/** Reads the file back with three's HDRLoader and checks it against its pixels: every pixel within one step of its mantissa. */
function check(file: Uint8Array, px: Float32Array, width: number, height: number, id: string): void {
  const parsed = new HDRLoader().setDataType(FloatType).parse(file.slice().buffer) as { width: number; height: number; data: Float32Array };
  if (parsed.width !== width || parsed.height !== height) throw new Error(id + ": read back as " + parsed.width + " × " + parsed.height);
  let worst = 0;
  for (let i = 0; i < width * height; i++) {
    const m = Math.max(px[i * 3]!, px[i * 3 + 1]!, px[i * 3 + 2]!);
    for (let c = 0; c < 3; c++) {
      const error = Math.abs(parsed.data[i * 4 + c]! - px[i * 3 + c]!) / Math.max(m, 1e-6);
      if (error > worst) worst = error;
    }
  }
  // One step of the mantissa: 1/255 of the power of two above the brightest channel, at most 2/255 of that channel.
  if (worst > 2 / 255 + 1e-6) throw new Error(id + ": read back with an error of " + (worst * 100).toFixed(2) + " %");
}

/* ---------- The contact sheet ---------- */

/** ACES filmic curve (Narkowicz), then sRGB, 0–255. */
function display(v: number): number {
  const x = Math.max(0, v);
  const t = Math.min(1, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14));
  const s = t <= 0.0031308 ? 12.92 * t : 1.055 * t ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, s) * 255);
}

/** The lighting shrunk to `w` × `h`, each block keeping its brightest pixel (a pin light stays visible). */
function thumbnail(px: Float32Array, width: number, height: number, w: number, h: number): Buffer {
  const out = Buffer.alloc(w * h * 3);
  const fx = width / w;
  const fy = height / h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = -1;
      let at = 0;
      for (let yy = Math.floor(y * fy); yy < Math.floor((y + 1) * fy); yy++) {
        for (let xx = Math.floor(x * fx); xx < Math.floor((x + 1) * fx); xx++) {
          const i = (yy * width + xx) * 3;
          const l = px[i]! + px[i + 1]! + px[i + 2]!;
          if (l > best) {
            best = l;
            at = i;
          }
        }
      }
      for (let c = 0; c < 3; c++) out[(y * w + x) * 3 + c] = display(px[at + c]!);
    }
  }
  return out;
}

/** A chrome ball seen from the default camera (at +Z, looking towards −Z): its centre shows what is on the camera's side. */
function chromeBall(px: Float32Array, width: number, height: number, size: number): Buffer {
  const out = Buffer.alloc(size * size * 3, 18);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = ((x + 0.5) / size) * 2 - 1;
      const sy = 1 - ((y + 0.5) / size) * 2;
      const d = sx * sx + sy * sy;
      if (d > 1) continue;
      const nz = Math.sqrt(1 - d);
      // The view (0, 0, −1) reflected on the normal (sx, sy, nz).
      const rx = 2 * nz * sx;
      const ry = 2 * nz * sy;
      const rz = -1 + 2 * nz * nz;
      // Back to the image: u = 0.25 + λ / 360 with λ = atan2(x, −z), row 0 at the top.
      const lon = Math.atan2(rx, -rz) / (2 * Math.PI);
      const u = (((0.25 + lon) % 1) + 1) % 1;
      const v = 0.5 - Math.asin(Math.max(-1, Math.min(1, ry))) / Math.PI;
      const c = Math.min(width - 1, Math.floor(u * width));
      const r = Math.min(height - 1, Math.floor(v * height));
      const i = (r * width + c) * 3;
      for (let k = 0; k < 3; k++) out[(y * size + x) * 3 + k] = display(px[i + k]! * 0.9);
    }
  }
  return out;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ---------- The run ---------- */

const ids = Object.keys(HDRI);
mkdirSync(OUT_DIR, { recursive: true });
// Files of lightings no longer in the library go.
for (const name of readdirSync(OUT_DIR)) {
  const id = name.replace(/(-1k)?\.hdr$/, "");
  if (name.endsWith(".hdr") && !HDRI[id]) rmSync(join(OUT_DIR, name));
}

const manifest: Record<string, { v: string; bytes: number; bytes1k: number }> = {};
const TILE_W = 384;
const TILE_H = 192;
const BALL = 192;
const CELL_W = TILE_W + BALL + 24;
const CELL_H = TILE_H + 40;
const COLS = 4;
const sheetW = CELL_W * COLS + 16;
const sheetH = CELL_H * Math.ceil(ids.length / COLS) + 16;
const tiles: OverlayOptions[] = [];
let labels = "";
let total = 0;

for (const [n, id] of ids.entries()) {
  const started = Date.now();
  const big = hdriPixels(id, 2048, 1024);
  const small = hdriPixels(id, 1024, 512);
  const file = encodeHdr(big, 2048, 1024, id);
  const file1k = encodeHdr(small, 1024, 512, id);
  check(file, big, 2048, 1024, id);
  check(file1k, small, 1024, 512, id + "-1k");
  writeFileSync(join(OUT_DIR, id + ".hdr"), file);
  writeFileSync(join(OUT_DIR, id + "-1k.hdr"), file1k);
  const v = createHash("sha256").update(file).update(file1k).digest("hex").slice(0, 8);
  manifest[id] = { v, bytes: file.length, bytes1k: file1k.length };
  total += file.length + file1k.length;

  const x = 8 + (n % COLS) * CELL_W;
  const y = 8 + Math.floor(n / COLS) * CELL_H;
  tiles.push({ input: thumbnail(big, 2048, 1024, TILE_W, TILE_H), raw: { width: TILE_W, height: TILE_H, channels: 3 }, left: x, top: y + 30 });
  tiles.push({ input: chromeBall(big, 2048, 1024, BALL), raw: { width: BALL, height: BALL, channels: 3 }, left: x + TILE_W + 8, top: y + 30 });
  const info = HDRI[id]!;
  labels += '<text x="' + x + '" y="' + (y + 22) + '" fill="#e8b4a0" font-size="17" font-family="Helvetica, Arial, sans-serif">' + escapeXml(id + " · " + info.name + " (" + info.kind + ")") + "</text>";
  console.log(id.padEnd(14), (file.length / 1024).toFixed(0).padStart(6) + " Ko", (file1k.length / 1024).toFixed(0).padStart(5) + " Ko (1k)", v, Date.now() - started + " ms");
}

writeFileSync(OUT_JSON, JSON.stringify(manifest, null, 2) + "\n");
console.log("total", (total / 1024 / 1024).toFixed(2) + " Mo", "→", OUT_DIR);

mkdirSync(VERIF_DIR, { recursive: true });
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + sheetW + '" height="' + sheetH + '">' + labels + "</svg>";
await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: "#141210" } })
  .composite([...tiles, { input: Buffer.from(svg), left: 0, top: 0 }])
  .png()
  .toFile(join(VERIF_DIR, "hdri-planche.png"));
console.log("planche →", join(VERIF_DIR, "hdri-planche.png"));
