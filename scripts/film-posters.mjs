#!/usr/bin/env node
/**
 * The image of the first film of a piece page, chosen by eye in the film itself (27/11/2026: never a dark frame, never a box
 * instead of the piece): a sharp, bright image of the finished piece. The frame is taken from the web copy of the film at the
 * second given here, written beside it with a fingerprint in its name, and becomes its image in the data of the site:
 *   films (src/data/media.generated.json, films.<slug>.<kind>): added to its images and chosen;
 *   mechanisms (src/data/mechanisms.generated.json, <key>): its poster.
 *   node scripts/film-posters.mjs
 * (scripts/film-media.mjs keeps the same seconds in `posterAt`, read by scripts/import-media.mjs when the films are redone.)
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { FILMS } from "./film-media.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC = join(ROOT, "public");

/** The mechanisms (scripts/mechanism-media.mjs): the second of their image. The cross of Malik Tillman, close and lit. */
export const MECHANISM_POSTER_AT = { "tillman-cross-spin": 10 };

function frame(video, at, out) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", String(at), "-i", video, "-frames:v", "1", "-vf", "scale=w='trunc(iw*min(1,1600/max(iw,ih))/2)*2':h=-2:flags=lanczos", "-c:v", "libwebp", "-quality", "82", out]);
  if (r.status !== 0) throw new Error("ffmpeg: " + r.stderr);
}

async function poster(video, at, dir, stem) {
  const tmp = join(dir, "." + stem + ".tmp.webp");
  frame(video, at, tmp);
  const v = createHash("sha256").update(readFileSync(tmp)).digest("hex").slice(0, 10);
  // The former image of this kind made here goes (a new second, a new name).
  for (const f of readdirSync(dir)) if (f.startsWith(stem + ".") && f.endsWith(".webp")) unlinkSync(join(dir, f));
  const out = join(dir, stem + "." + v + ".webp");
  writeFileSync(out, readFileSync(tmp));
  await sharp(tmp).resize(160).webp({ quality: 70 }).toFile(join(dir, stem + "." + v + ".w160.webp"));
  unlinkSync(tmp);
  return out.slice(PUBLIC.length);
}

// The films of the pieces.
const mediaPath = join(ROOT, "src", "data", "media.generated.json");
const media = JSON.parse(readFileSync(mediaPath, "utf8"));
for (const entry of FILMS) {
  for (const [kind, at] of Object.entries(entry.posterAt ?? {})) {
    const film = media.films?.[entry.slug]?.[kind];
    if (!film) continue;
    const dir = join(PUBLIC, "media", "films", entry.slug);
    const video = join(PUBLIC, film.src ?? "");
    if (!existsSync(video)) throw new Error("not found: " + video);
    const src = await poster(video, at, dir, kind + "-poster");
    film.posters = [...film.posters.filter((p) => !p.includes("/" + kind + "-poster.")), src];
    film.poster = film.posters.length - 1;
    console.log("  " + entry.slug + " " + kind + " @" + at + "s -> " + src);
  }
}
writeFileSync(mediaPath, JSON.stringify(media, null, 2) + "\n");

// The mechanisms.
const mechPath = join(ROOT, "src", "data", "mechanisms.generated.json");
const mech = JSON.parse(readFileSync(mechPath, "utf8"));
for (const [key, at] of Object.entries(MECHANISM_POSTER_AT)) {
  const m = mech[key];
  if (!m) continue;
  const video = join(PUBLIC, m.video);
  const src = await poster(video, at, join(PUBLIC, "media", "mechanisms"), key + "-frame");
  m.poster = src;
  console.log("  " + key + " @" + at + "s -> " + src);
}
writeFileSync(mechPath, JSON.stringify(mech, null, 1) + "\n");
