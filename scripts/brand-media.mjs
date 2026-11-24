#!/usr/bin/env node
/**
 * The name of the house, drawn in the letters of its logo (feedback of Yoni, 23/11/2026: "BERETE JEWELLERS" seen everywhere,
 * in the same typography as the logo). Cut from the logo the site already has (public/media/brand/logo.svg, written by
 * npm run import-media from the owner's file), so the letters are exactly those of the logo:
 *   public/media/brand/wordmark.<v>.svg   BERETE JEWELLERS, on one line (beside the mark in the menu)
 *   public/media/brand/berete.<v>.svg     BERETE alone (the very discreet watermark behind the capsules)
 * and src/data/brand.generated.json (their addresses). <v>: a fingerprint of the file, so no cache keeps an old one.
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
for (const old of await readdir(DIR)) if (/^(wordmark|berete|logo-sharp)\.[0-9a-f]{10}\.svg$/.test(old)) await rm(join(DIR, old));
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
