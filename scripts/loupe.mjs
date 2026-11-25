/**
 * The "loupe" copy of the photos that open in the viewer (Malik, 24/11/2026: a photo opened and zoomed showed pixels and
 * blur instead of the stones). The copy of a page stays as it is (1440 x 2160 at most for the HD photos); beside it, the
 * viewer (src/components/Lightbox.tsx) loads, only once the photo is opened, a copy taken from the original of the disk:
 * up to LOUPE.long px on its long side (never enlarged beyond the original), WebP of quality LOUPE.quality, scaled with
 * lanczos (its sharpness kept). A photo whose original is hardly larger than its copy (a WhatsApp photo of 1080 x 1920)
 * gets none: its copy already is the whole photo.
 *
 * Made by the scripts that make the photos (import-media, extra-media, trunk-media), with their own crops and colours:
 *   <photo>.loupe.<v>.webp     beside a photo of import-media (<v>: a fingerprint of its original and of its recipe)
 *   <photo>.<v>.loupe.webp     beside a photo of extra-media or trunk-media (the version of their folder)
 * and listed in src/data/loupe.generated.json ({ "<address of the photo>": { src, width, height } }), which the viewer loads
 * when it opens (never in the pages).
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "src", "data", "loupe.generated.json");

/** The long side and the quality of the loupe copy (24/11/2026: 3200 px, quality 86; 2800 / 84 if it weighed over 600 MB). */
export const LOUPE = { long: 3200, quality: 86 };
/** A loupe copy is made only when it shows at least this much more than the copy of the page. */
export const LOUPE_MARGIN = 1.1;

/** Whether a file is a loupe copy (never given smaller copies, never pruned while its photo stays). */
export const isLoupe = (file) => /\.loupe(\.[0-9a-f]{10})?\.webp$/.test(file);

/** "a/p07.webp" -> "a/p07.loupe.<v>.webp". */
export const loupePath = (file, v) => file.replace(/\.webp$/, ".loupe." + v + ".webp");

/** Whether an original of `width` x `height` deserves a loupe copy beside a copy whose long side is `shown`. */
export const worthLoupe = (width, height, shown) => Math.min(LOUPE.long, Math.max(width, height)) >= shown * LOUPE_MARGIN;

/** The size of the loupe copy of an original of `width` x `height` (its long side LOUPE.long at most, never enlarged). */
export function loupeSize(width, height) {
  const k = Math.min(1, LOUPE.long / Math.max(width, height));
  return { width: Math.round(width * k), height: Math.round(height * k) };
}

/** A fingerprint of an original (its size and its date) and of a recipe: the version in the name of its loupe copy. */
export async function fingerprint(src, recipe) {
  const s = await stat(src);
  return createHash("sha256")
    .update(src + "\0" + s.size + "\0" + Math.round(s.mtimeMs) + "\0" + recipe + "\0" + JSON.stringify(LOUPE))
    .digest("hex")
    .slice(0, 10);
}

/** Width and height of an image file (sips reads every format of macOS, HEIC included; ffprobe the others). */
export async function imageSize(file) {
  const out = await capture("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]).catch(() => "");
  const w = Number(/pixelWidth: (\d+)/.exec(out)?.[1]);
  const h = Number(/pixelHeight: (\d+)/.exec(out)?.[1]);
  if (w && h) return { width: w, height: h };
  const probe = await capture("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file]);
  const [pw, ph] = probe.trim().split(",").map(Number);
  return { width: pw, height: ph };
}

function capture(cmd, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolvePromise(out) : reject(new Error(cmd + " failed: " + err.slice(-300)))));
  });
}

/** The ffmpeg filter that brings a picture to its loupe size (its long side LOUPE.long at most, never enlarged). */
export const LOUPE_SCALE = "scale=w='if(gt(iw,ih),min(" + LOUPE.long + ",iw),-2)':h='if(gt(iw,ih),-2,min(" + LOUPE.long + ",ih))':flags=lanczos";

/**
 * Writes the list of the loupe copies: the entries of the folders a script has just made (`prefixes`, web addresses such as
 * "/media/hd/") are replaced by `entries` (address of the photo -> its loupe copy); the others are kept.
 */
export async function saveLoupes(entries, prefixes) {
  let data = {};
  try {
    data = JSON.parse(await readFile(DATA, "utf8"));
  } catch {
    /* first run */
  }
  for (const key of Object.keys(data)) if (prefixes.some((p) => key.startsWith(p))) delete data[key];
  for (const [key, value] of entries) if (value) data[key] = value;
  const sorted = Object.fromEntries(Object.keys(data).sort().map((k) => [k, data[k]]));
  const text = JSON.stringify(sorted, null, 1) + "\n";
  const old = existsSync(DATA) ? await readFile(DATA, "utf8") : "";
  if (old !== text) {
    await writeFile(DATA, text);
    console.log("  = src/data/loupe.generated.json (" + Object.keys(sorted).length + " photos)");
  }
}
