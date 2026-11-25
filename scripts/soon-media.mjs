// The files of the page « Coming soon » of the site under construction (server/door.ts), in public/soon: the only files a
// visitor without access may load. npm run soon
//   monogram.svg   the monogram BRT and its diamond (public/media/brand/monogram.<v>.svg) in fine lines of rose gold
//   preview.jpg    the image of the previews of a link (WhatsApp, iMessage): the monogram on black, 1200 × 630
//   favicon.svg    the mark of the logo
//   *.woff2        the two fonts of the site (Cormorant Garamond 300 and its italic, Manrope 400 and 500), latin
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const OUT = "public/soon";
const BRAND = "public/media/brand";
await mkdir(OUT, { recursive: true });

const source = (await readdir(BRAND)).find((f) => /^monogram\.[0-9a-f]{10}\.svg$/.test(f));
if (!source) throw new Error("No monogram in " + BRAND + " (npm run brand)");
const svg = await readFile(join(BRAND, source), "utf8");
const rose = (width) => svg.replace(/\.st0\{[^}]*\}/, ".st0{fill:none;stroke:url(#bj-rose-gold);stroke-width:" + width + ";stroke-linejoin:round;stroke-linecap:round}");
await writeFile(join(OUT, "monogram.svg"), rose(0.85));

// The preview: the monogram in the middle of a black image, a little thicker (it is seen small), a soft light behind it.
const [, , vw, vh] = (/viewBox="([^"]+)"/.exec(svg)?.[1] ?? "0 0 216 159.5").split(/\s+/).map(Number);
const width = 380;
const height = Math.round((width * vh) / vw);
const mark = await sharp(Buffer.from(rose(1.1)), { density: 600 }).resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
const glow = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#B76E79" stop-opacity="0.16"/><stop offset="1" stop-color="#0A0A0A" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="630" fill="#0A0A0A"/><ellipse cx="600" cy="315" rx="430" ry="260" fill="url(#g)"/></svg>',
);
await sharp(glow)
  .composite([{ input: mark, left: Math.round((1200 - width) / 2), top: Math.round((630 - height) / 2) }])
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(join(OUT, "preview.jpg"));

await copyFile(join(BRAND, "logo-mark.svg"), join(OUT, "favicon.svg"));
const FONTS = {
  "cormorant-garamond-300.woff2": "@fontsource/cormorant-garamond/files/cormorant-garamond-latin-300-normal.woff2",
  "cormorant-garamond-300-italic.woff2": "@fontsource/cormorant-garamond/files/cormorant-garamond-latin-300-italic.woff2",
  "manrope-400.woff2": "@fontsource/manrope/files/manrope-latin-400-normal.woff2",
  "manrope-500.woff2": "@fontsource/manrope/files/manrope-latin-500-normal.woff2",
};
for (const [name, from] of Object.entries(FONTS)) await copyFile(join("node_modules", from), join(OUT, name));
console.log("public/soon : " + (await readdir(OUT)).join(", "));
