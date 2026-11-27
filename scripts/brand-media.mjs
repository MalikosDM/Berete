#!/usr/bin/env node
/**
 * The name of the house, drawn in the letters of its logo (feedback of Yoni, 23/11/2026: "BERETE JEWELLERS" seen everywhere,
 * in the same typography as the logo). Cut from the logo the site already has (public/media/brand/logo.svg, written by
 * npm run import-media from the owner's file), so the letters are exactly those of the logo:
 *   public/media/brand/wordmark.<v>.svg   BERETE JEWELLERS, on one line (beside the mark in the menu)
 *   public/media/brand/berete.<v>.svg     BERETE alone (the watermark of before, no longer shown since 24/11/2026)
 *   public/media/brand/monogram.<v>.svg   the BRT and the diamond alone, in fine lines (the monogram in the background of the
 *                                         pages, src/components/Monogram.tsx)
 * and src/data/brand.generated.json (their addresses). <v>: a fingerprint of the file, so no cache keeps an old one.
 * Also src/data/monogram-lines.generated.json: the lines of the monogram one by one (the intro of the house draws them).
 *
 *   npm run brand
 */
import { createHash } from "node:crypto";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIR = join(ROOT, "public", "media", "brand");
const DATA = join(ROOT, "src", "data", "brand.generated.json");

const logo = await readFile(join(DIR, "logo.svg"), "utf8");
/** The frames of the name in the drawing of the logo (its letters sit between y 405 and 438). */
const FRAMES = {
  wordmark: "271 405 335 33",
  berete: "271 405 126 29",
};
const out = {};
for (const old of await readdir(DIR)) if (/^(wordmark|berete|logo-sharp|monogram)\.[0-9a-f]{10}\.svg$/.test(old)) await rm(join(DIR, old));
{
  // The logo drawn sharp at small sizes (Yoni, 24/11/2026: blurred on black in the menu): an <img> of the vector file (never a
  // mask, which Safari draws at a low resolution), its fine lines a little thicker (an outline in the same rose gold), so the
  // diamond never fades away on black at 60 to 160 px.
  const svg = logo.replace(".st0{fill:url(#bj-rose-gold);}", ".st0{fill:url(#bj-rose-gold);stroke:url(#bj-rose-gold);stroke-width:1.5;stroke-linejoin:round}");
  if (svg === logo) throw new Error("logo.svg: its style .st0 was not found");
  const v = createHash("sha256").update(svg).digest("hex").slice(0, 10);
  await writeFile(join(DIR, "logo-sharp." + v + ".svg"), svg);
  out.sharp = { src: "/media/brand/logo-sharp." + v + ".svg", ratio: Math.round((335.5 / 242.5) * 1000) / 1000 };
  console.log("  + public/media/brand/logo-sharp." + v + ".svg");
}
{
  // The monogram (24/11/2026: BRT and its diamond in place of the name BERETE in the background): the letters BRT and the
  // diamond of the logo (drawn between x 360 and 573, y 195 and 351), their outlines only, in fine white lines (the page gives
  // them their colour and their light).
  const box = "358.5 193 216 159.5";
  const svg = logo
    .replace(".st0{fill:url(#bj-rose-gold);}", ".st0{fill:none;stroke:#fff;stroke-width:0.6;stroke-linejoin:round}")
    .replace(/viewBox="[^"]*"/, 'viewBox="' + box + '"');
  if (!svg.includes("stroke-width:0.6")) throw new Error("logo.svg: its style .st0 was not found");
  const v = createHash("sha256").update(svg).digest("hex").slice(0, 10);
  await writeFile(join(DIR, "monogram." + v + ".svg"), svg);
  const [x0, y0, w, h] = box.split(" ").map(Number);
  out.monogram = { src: "/media/brand/monogram." + v + ".svg", ratio: Math.round((w / h) * 1000) / 1000 };
  console.log("  + public/media/brand/monogram." + v + ".svg");
  // Its lines one by one, for the intro of the house (src/components/Preloader.tsx, 27/11/2026: the monogram draws itself):
  // every closed line of the drawings that start inside the frame of the monogram (the letters of the name start below it),
  // each its own path, so each one is drawn from its start to its end; the outline of each drawing (the diamond, B, R, T)
  // first, then the lines inside them (the facets of the diamond), a line without length left out.
  const drawings = [];
  for (const [, d] of logo.matchAll(/<path[^>]*?class="st0"[^>]*?\sd="([^"]+)"/g)) {
    const start = d.match(/^\s*M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/);
    if (!start || Number(start[1]) < x0 || Number(start[1]) > x0 + w || Number(start[2]) < y0 || Number(start[2]) > y0 + h) continue;
    if (/m/.test(d)) throw new Error("logo.svg: a relative move in the monogram, its lines cannot be split");
    const parts = d.replace(/\s+/g, " ").trim().split(/(?=M)/).map((part) => part.trim());
    // Without length: every point of the line is its start (M x,y then segments that never leave it).
    drawings.push(parts.filter((part) => new Set(part.match(/-?\d*\.?\d+/g)).size > 2));
  }
  const lines = [...drawings.map((parts) => parts[0]), ...drawings.flatMap((parts) => parts.slice(1))].filter(Boolean);
  if (lines.length === 0) throw new Error("logo.svg: no line of the monogram found");
  await writeFile(join(ROOT, "src", "data", "monogram-lines.generated.json"), JSON.stringify({ viewBox: box, outlines: drawings.length, lines }, null, 1) + "\n");
  console.log("  = src/data/monogram-lines.generated.json (" + lines.length + " lines)");
}
for (const [name, box] of Object.entries(FRAMES)) {
  // Only the letters of the name: the diamond and BRT are drawn above y 360 (outside the frame), cut by the viewBox.
  const svg = logo.replace(/viewBox="[^"]*"/, 'viewBox="' + box + '"').replace(/<svg /, '<svg preserveAspectRatio="xMinYMid meet" ');
  const v = createHash("sha256").update(svg).digest("hex").slice(0, 10);
  const file = name + "." + v + ".svg";
  await writeFile(join(DIR, file), svg);
  const [, , w, h] = box.split(" ").map(Number);
  out[name] = { src: "/media/brand/" + file, ratio: Math.round((w / h) * 1000) / 1000 };
  console.log("  + public/media/brand/" + file);
}
await writeFile(DATA, JSON.stringify(out, null, 1) + "\n");
console.log("  = src/data/brand.generated.json");
