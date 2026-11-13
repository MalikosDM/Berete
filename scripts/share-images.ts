/*
 * The images shown when a page of the site is shared (WhatsApp, Instagram, iMessage...): 1200 x 630 JPEG.
 *   npm run media:share
 * - public/media/share/brand.jpg: the logo in rose gold on black, with a jewel (every page without its own);
 * - public/media/share/pieces/<slug>.jpg: the main photo of each piece, on black, with the logo.
 * They hold no words, so one image serves every language. Writes src/data/share.generated.json (read by the head of
 * the pages, src/extensions/seo/extras.ts). Run again after new pieces or new main photos: only the changed ones are
 * redone. Drawn by Chromium (Playwright), from the photos already in public/media.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { defaultCatalogue } from "../src/data/catalogue.js";
import { SPECIAL_PROJECT } from "../src/data/pieces.js";
import type { MediaItem } from "../src/data/types.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(PUBLIC, "media", "share");
const DATA = path.join(ROOT, "src", "data", "share.generated.json");
const CACHE = path.join(ROOT, "scripts", ".share-images-cache.json");
const W = 1200;
const H = 630;
/** Bump to redo every image after a change of the layout. */
const LAYOUT = 2;

type Share = { src: string; width: number; height: number };

const mime = (file: string) => (file.endsWith(".svg") ? "image/svg+xml" : file.endsWith(".woff2") ? "font/woff2" : file.endsWith(".jpg") || file.endsWith(".jpeg") ? "image/jpeg" : "image/webp");
const dataUrl = (file: string) => "data:" + mime(file) + ";base64," + fs.readFileSync(file).toString("base64");
const publicFile = (src: string) => path.join(PUBLIC, src.split("?")[0]!);

/** The still photo of an item: the photo itself, the poster of a video. */
function stillOf(item: MediaItem): string | null {
  const src = item.type === "video" ? item.poster : item.src;
  return src && src.startsWith("/") && fs.existsSync(publicFile(src)) ? publicFile(src) : null;
}

const font = dataUrl(path.join(ROOT, "node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-300-normal.woff2"));
const logo = dataUrl(path.join(PUBLIC, "media/brand/logo.svg"));

const page = (body: string) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Cormorant; src: url(${font}) format("woff2"); font-weight: 300; }
* { margin: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; background: #0a0a0a; overflow: hidden; }
.fill { position: absolute; inset: 0; }
.blur { width: 100%; height: 100%; object-fit: cover; filter: blur(40px) brightness(0.32) saturate(0.8); transform: scale(1.15); }
.jewel { position: absolute; top: 32px; bottom: 32px; left: 50%; transform: translateX(-50%); height: ${H - 64}px; max-width: 760px; object-fit: contain; }
/* The edges of a photo melt into the black: no frame around the jewel. */
.soft { -webkit-mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 66%, transparent 100%); mask-image: radial-gradient(ellipse 50% 50% at 50% 50%, #000 66%, transparent 100%); }
.veil { background: radial-gradient(ellipse at center, rgba(10,10,10,0) 40%, rgba(10,10,10,0.75) 100%); }
.mark { position: absolute; left: 44px; bottom: 40px; width: 150px; }
.line { position: absolute; left: 44px; right: 44px; bottom: 22px; height: 1px; background: linear-gradient(90deg, #9c5b4f, #e8b4a0 50%, #b76e79); opacity: 0.55; }
.brand-logo { position: absolute; left: 96px; top: 50%; transform: translateY(-58%); width: 400px; }
.brand-city { position: absolute; left: 100px; top: 452px; font-family: Cormorant; font-weight: 300; font-size: 30px; letter-spacing: 0.5em; color: #f4f2ef; opacity: 0.8; }
.brand-rule { position: absolute; left: 100px; top: 432px; width: 120px; height: 1px; background: linear-gradient(90deg, #9c5b4f, #e8b4a0, #b76e79); }
.brand-jewel { position: absolute; right: 40px; top: 24px; height: ${H - 48}px; width: 600px; object-fit: contain; }
.glow { background: radial-gradient(circle at 75% 50%, rgba(232,180,160,0.14), rgba(10,10,10,0) 55%); }
</style></head><body>${body}</body></html>`;

function pieceHtml(photo: string, onBlack: boolean): string {
  const src = dataUrl(photo);
  return page(`
    ${onBlack ? "" : `<div class="fill"><img class="blur" src="${src}"></div>`}
    <div class="fill veil"></div>
    <img class="jewel soft" src="${src}">
    <img class="mark" src="${logo}">
    <div class="line"></div>`);
}

function brandHtml(photo: string): string {
  return page(`
    <div class="fill glow"></div>
    <img class="brand-jewel soft" src="${dataUrl(photo)}">
    <img class="brand-logo" src="${logo}">
    <div class="brand-rule"></div>
    <div class="brand-city">DUBAI</div>`);
}

const cache: Record<string, string> = fs.existsSync(CACHE) ? (JSON.parse(fs.readFileSync(CACHE, "utf8")) as Record<string, string>) : {};
const fingerprint = (...parts: (string | number | boolean)[]) => createHash("sha1").update(parts.join("|")).digest("hex");
const fileStamp = (file: string) => file + ":" + fs.statSync(file).size + ":" + fs.statSync(file).mtimeMs;

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
let made = 0;

async function render(out: string, html: string, key: string): Promise<Share> {
  const file = path.join(OUT, out);
  const rel = "/media/share/" + out;
  if (cache[rel] === key && fs.existsSync(file)) return { src: rel, width: W, height: H };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await tab.setContent(html, { waitUntil: "load" });
  await tab.evaluate(() => document.fonts.ready.then(() => undefined));
  await tab.screenshot({ path: file, type: "jpeg", quality: 84 });
  cache[rel] = key;
  made += 1;
  console.log("  + public" + rel);
  return { src: rel, width: W, height: H };
}

// The brand image: the first ring of the special project, shut, on black.
const ring = defaultCatalogue.pieces.find((p) => p.slug === SPECIAL_PROJECT[1]?.slug) ?? defaultCatalogue.pieces[0]!;
const ringPhoto = stillOf(ring.cover);
if (!ringPhoto) throw new Error("share-images: no photo for the brand image");
const brand = await render("brand.jpg", brandHtml(ringPhoto), fingerprint(LAYOUT, "brand", fileStamp(ringPhoto)));

const pieces: Record<string, Share> = {};
for (const p of defaultCatalogue.pieces) {
  const photo = stillOf(p.cover);
  if (!photo) {
    console.warn("  ! no main photo for " + p.slug + ": the brand image is used");
    continue;
  }
  pieces[p.slug] = await render("pieces/" + p.slug + ".jpg", pieceHtml(photo, p.cover.onBlack === true), fingerprint(LAYOUT, p.slug, fileStamp(photo), p.cover.onBlack === true));
}
await browser.close();

// Images of pieces that no longer exist are removed.
const keep = new Set([brand.src, ...Object.values(pieces).map((s) => s.src)]);
const dir = path.join(OUT, "pieces");
for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
  const rel = "/media/share/pieces/" + name;
  if (!keep.has(rel)) {
    fs.rmSync(path.join(dir, name));
    delete cache[rel];
    console.log("  - public" + rel);
  }
}

fs.writeFileSync(DATA, JSON.stringify({ brand, pieces }, null, 1) + "\n");
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1) + "\n");
console.log("share images: " + made + " made, " + (Object.keys(pieces).length + 1 - made) + " already up to date");
