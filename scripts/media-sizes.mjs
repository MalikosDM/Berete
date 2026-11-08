// Smaller copies of the photos of public/media, for the screens that show them small
// (phones, thumbnails, story bubbles): "cover.webp" gets "cover.w640.webp" and
// "cover.w160.webp" when it is wide enough. The site offers them to the browser
// (srcset, src/lib/responsive.ts), which takes the lightest one that stays sharp.
//
// npm run media:sizes (also run at the end of npm run import-media). Only the
// missing or outdated copies are made. Needs ffmpeg (with libwebp) on the PATH.
import { spawn } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const MEDIA = fileURLToPath(new URL("../public/media", import.meta.url));

/** The widths of the copies, and their quality. The same rule as src/lib/responsive.ts. */
export const SIZES = [
  { width: 160, quality: 75 },
  { width: 640, quality: 78 },
];
/** A copy is made only for a photo at least this much wider (a copy almost as big would not help). */
export const MARGIN = 1.25;

const COPY = /\.w\d+\.webp$/;

/** The copy of a photo at one width: "a/cover.webp" -> "a/cover.w640.webp". */
export const sizedPath = (file, width) => file.replace(/\.webp$/, ".w" + width + ".webp");

/** Whether a file is one of these copies, and the photo it comes from. */
export const copyOf = (file) => (COPY.test(file) ? file.replace(COPY, ".webp") : null);

/** Width of a WebP file, read from its header. */
function webpWidth(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return 0;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8 ") return buf.readUInt16LE(26) & 0x3fff;
  if (chunk === "VP8L") return 1 + (((buf[22] & 0x3f) << 8) | buf[21]);
  if (chunk === "VP8X") return 1 + buf.readUIntLE(24, 3);
  return 0;
}

async function photos(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    // The frames of the scroll films are drawn in a canvas at their own size.
    if (entry.isDirectory()) {
      if (!entry.name.startsWith("frames-")) out.push(...(await photos(p)));
    } else if (entry.name.endsWith(".webp") && !COPY.test(entry.name)) out.push(p);
  }
  return out;
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(cmd + " failed: " + err.slice(-500)))));
  });
}

async function newer(a, b) {
  try {
    return (await stat(a)).mtimeMs >= (await stat(b)).mtimeMs;
  } catch {
    return false;
  }
}

export async function makeSizes() {
  const files = await photos(MEDIA);
  const jobs = [];
  for (const file of files) {
    const width = webpWidth(await readFile(file).then((b) => b.subarray(0, 32)));
    for (const size of SIZES) {
      if (width < size.width * MARGIN) continue;
      const out = sizedPath(file, size.width);
      if (await newer(out, file)) continue;
      jobs.push({ file, out, size });
    }
  }
  let i = 0;
  const worker = async () => {
    while (i < jobs.length) {
      const { file, out, size } = jobs[i++];
      await run("ffmpeg", ["-v", "error", "-y", "-i", file, "-vf", "scale=" + size.width + ":-2:flags=lanczos", "-c:v", "libwebp", "-quality", String(size.quality), "-compression_level", "6", out]);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log("media sizes: " + files.length + " photos, " + jobs.length + " copies made" + (jobs.length ? " (" + jobs.map((j) => relative(MEDIA, j.out)).slice(0, 3).join(", ") + (jobs.length > 3 ? "…" : "") + ")" : ""));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await makeSizes();
