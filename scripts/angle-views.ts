/**
 * The photos of a piece that show almost the same view (audit of 24/11/2026: three of the first four photos of the Inter ring
 * were its front): every photo of every piece gets a fingerprint (its picture brought to 16 × 16 grey, its contrast evened),
 * and the photos whose fingerprints are close are one view. Written to src/data/angle-views.generated.json, only the views of
 * two photos or more ({ slug: [["p08", "p40"], ...] }, by the name of the file); Every Angle (src/data/pageMedia.ts) never
 * puts two photos of one view among its first four.
 *
 *   npx tsx scripts/angle-views.ts
 */
import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { defaultCatalogue } from "../src/data/catalogue";
import { fileBase } from "../src/data/pageMedia";
import { publicCatalogue } from "../src/data/relations";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT = join(ROOT, "src", "data", "angle-views.generated.json");
/** Two photos closer than this are one view (mean difference of their evened 16 × 16 pictures, in standard deviations). */
const SAME = Number(process.env.SAME ?? 0.42);
const N = 16;

async function fingerprint(file: string): Promise<Float32Array> {
  const { data } = await sharp(file).resize(N, N, { fit: "fill" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const v = Float32Array.from(data);
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length) || 1;
  return v.map((x) => (x - mean) / sd);
}

const distance = (a: Float32Array, b: Float32Array) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i]! - b[i]!);
  return s / a.length;
};

const cat = publicCatalogue(defaultCatalogue);
const out: Record<string, string[][]> = {};
for (const piece of cat.pieces) {
  const photos = [piece.cover, ...piece.gallery].filter((m) => m.type !== "video" && m.src && existsSync(join(ROOT, "public", m.src)));
  const seen = new Set<string>();
  const items: { name: string; fp: Float32Array }[] = [];
  for (const m of photos) {
    const name = fileBase(m.src);
    if (seen.has(name)) continue;
    seen.add(name);
    items.push({ name, fp: await fingerprint(join(ROOT, "public", m.src)) });
  }
  // One view: the photos linked by a chain of close fingerprints (single linkage).
  const group = items.map((_, i) => i);
  const root = (i: number): number => (group[i] === i ? i : (group[i] = root(group[i]!)));
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if (distance(items[i]!.fp, items[j]!.fp) < SAME) group[root(i)] = root(j);
  const views = new Map<number, string[]>();
  items.forEach((it, i) => views.set(root(i), [...(views.get(root(i)) ?? []), it.name]));
  const shared = [...views.values()].filter((v) => v.length > 1);
  if (shared.length > 0) out[piece.slug] = shared;
  if (process.env.VERBOSE && shared.length) console.log(piece.slug, JSON.stringify(shared));
}
writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log("  = src/data/angle-views.generated.json (" + Object.keys(out).length + " pieces with photos of one view)");
