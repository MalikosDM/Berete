#!/usr/bin/env node
/**
 * The files of Yoni of 27/11/2026, for the site:
 *   - Inter Milan, two shared iCloud albums (downloaded in their original quality, 2160 x 3840 HEVC, 30 im/s, with music):
 *       album A "INTER MILAN .mp4": the presentation film of the Campione d'Italia ring (42.7 s): the ring on black, its
 *         details labelled, its top worn as a pendant, then the players celebrating the title, the BRT x Inter card;
 *       album B "1127 (1).mp4": the film of the handover of the rings at the Inter training centre (49.8 s), already edited
 *         (music, cuts). The albums hold nothing else: no photo (27/11/2026).
 *     Made from them: the two films whole; a shorter cut of the handover (its best moments, EDIT below: the album holds one
 *     film of 49.8 s, so no cut of 60 to 90 s is possible); stills of the handover film (4K frames, the sharpest of each
 *     moment, STILLS below), standing in for photos until Yoni sends his photos of the day.
 *   - Noah Okafor, the reveal of his jersey pendant in Dubai (WhatsApp, 27/11/2026): the film whole (48.9 s, 720 x 1280, with
 *     music, never shortened), a close portrait, the four of them on the sofa (cropped a little tighter, the four whole) and
 *     the fitting of the chain.
 *
 * Read first from "$BERETE_DISK/Berete - Dossiers icloud/00 Contexte Yoni/Yoni 27-11/" when that folder exists, else from
 * .local/yoni-2711/ (same layout: icloud-inter-film/, icloud-inter-livraison/, okafor-dubai/; the originals never go in
 * Git and are never modified). Written for the web with a version (a fingerprint of the files of the group) in every name:
 *   public/media/yoni-2711/<group>/<name>.<v>.mp4          film for computers (H.264, up to 1080 x 1920, 4.5 Mbit/s at most)
 *   public/media/yoni-2711/<group>/<name>-mobile.<v>.mp4   its copy for phones (720 x 1280, 1.5 Mbit/s at most)
 *   public/media/yoni-2711/<group>/<name>-poster.<v>.webp  its image before it plays (+ .w160 / .w640 copies)
 *   public/media/yoni-2711/<group>/<name>.<v>.webp         a photo, 1600 px on its long side (+ .w160 / .w640 / .w1080)
 *   public/media/yoni-2711/<group>/<name>.<v>.loupe.webp   its loupe copy (scripts/loupe.mjs), in src/data/loupe.generated.json
 * and src/data/yoni2711.generated.json (MediaItem of src/data/types.ts; a film also has `mobile`, as FeatureFilmData).
 *
 *   node scripts/yoni-2711-media.mjs
 *   node scripts/yoni-2711-media.mjs --only=inter-film,inter-handover,inter-photos,okafor-dubai
 *
 * The films keep their sound track (music): the site never plays a film with its sound before a click.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { LOUPE, LOUPE_MARGIN, saveLoupes } from "./loupe.mjs";
import { MARGIN, SIZES, sizedPath } from "./media-sizes.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DISK = process.env.BERETE_DISK ?? "/Volumes/Disque externe";
const DISK_DIR = join(DISK, "Berete - Dossiers icloud", "00 Contexte Yoni", "Yoni 27-11");
const LOCAL_DIR = join(ROOT, ".local", "yoni-2711");
const SRC = existsSync(DISK_DIR) ? DISK_DIR : LOCAL_DIR;
const OUT = join(ROOT, "public", "media", "yoni-2711");
const WEB = "/media/yoni-2711/";
const DATA = join(ROOT, "src", "data", "yoni2711.generated.json");
/** The long side of the page copy of a photo (as scripts/extra-media.mjs). */
const LONG = 1600;

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;

const INTER_FILM = join(SRC, "icloud-inter-film", "inter-milan-ring-presentation-film-original.mp4");
const INTER_HANDOVER = join(SRC, "icloud-inter-livraison", "inter-milan-handover-film-original.mp4");
/**
 * The reveal of Noah Okafor in Dubai, sent on WhatsApp on 27/11/2026 and copied with clear names into okafor-dubai/:
 *   "WhatsApp Video 2026-11-27 at 00.30.56.mp4"     -> okafor-dubai-reveal-film.mp4     (48.9 s, 720 x 1280, 25 im/s, music)
 *   "WhatsApp Image 2026-11-27 at 00.34.33.jpeg"    -> okafor-dubai-portrait-pendant.jpeg (1320 x 2868: he holds the pendant)
 *   "WhatsApp Image 2026-11-27 at 00.49.17.jpeg"    -> okafor-dubai-group-four.jpeg      (3071 x 4606: the four, arms crossed)
 *   "WhatsApp Image 2026-11-27 at 00.34.33 (1).jpeg" -> okafor-dubai-fitting-chain.jpeg  (3414 x 5120: the chain fastened)
 */
const OKAFOR = {
  film: join(SRC, "okafor-dubai", "okafor-dubai-reveal-film.mp4"),
  portrait: join(SRC, "okafor-dubai", "okafor-dubai-portrait-pendant.jpeg"),
  group: join(SRC, "okafor-dubai", "okafor-dubai-group-four.jpeg"),
  fitting: join(SRC, "okafor-dubai", "okafor-dubai-fitting-chain.jpeg"),
};

/** The films, as the films of the atelier (scripts/import-media.mjs, FILM): computers up to 1080p, phones 720p. */
const FILM = {
  desktop: { short: 1080, long: 1920, crf: 23, maxrate: (short) => (short > 720 ? 4500 : 2500), audio: "128k" },
  mobile: { short: 720, long: 1280, crf: 24, maxrate: () => 1500, audio: "96k" },
  maxFps: 30,
};

/**
 * The cut of the handover (album B), its best moments in their order: the players receive their boxes, open them, put on
 * their rings, their reactions; the arrival at the training centre, the walks and the man alone at the end left out. Each
 * [in, out] in seconds of the original, inside one shot or across a cut of the original (its shots: 7.67, 10.83, 12.17,
 * 13.70, 14.40, 16.20, 17.27, 20.33, 21.53, 22.67, 23.80, 25.73, 27.17, 27.80, 29.00, 30.87, 32.37, 34.33, 35.73, 37.40,
 * 38.97, 40.77, 43.47, 44.00, 47.00 = the BRT x Inter card). Simple cuts. Its music: the music of the original, continuous,
 * from EDIT_MUSIC[0] (the beat starts at 7.70 s), then crossfaded (EDIT_FADE s) into the last seconds of the original, so that
 * it ends with the card as the film does.
 */
const EDIT = [
  [7.68, 10.8], // a man in a beige suit and black gloves hands a box to a man in a grey tracksuit, who opens it
  [12.2, 13.67], // three men pose, one shows his ring
  [14.43, 21.5], // the ring on a finger; a player in a black tracksuit receives his box; an embrace; a player in a black T-shirt shows his ring; the ring put on his finger
  [22.7, 25.7], // laughter with a seated man in a black hoodie; an embrace with a young man in a white T-shirt
  [27.2, 30.83], // a player in a denim jacket and black cap opens his box; a man in a dark shirt looks at his ring
  [32.4, 34.3], // a handshake with a player in a white T-shirt
  [35.77, 38.93], // smiles, the box open; the ring in its box, the BRT mark and the name of its player inside
  [44.03, 49.77], // the man in the beige suit holds out his ring to the camera; the BRT x Inter card
];
const EDIT_MUSIC = [7.68, 46.4];
const EDIT_FADE = 0.6;

/**
 * The stills of the handover film (album B has no photo): 4K frames, each the sharpest of its moment (blur measured frame by
 * frame, then looked at). [name, second, alt]. The first four for the first row, the others for "View All Moments". Left out:
 * the moments the site already has as photos (the man in the grey tracksuit = 25/p17, the three men posing = story
 * inter-squad 02), a second frame of the same person, the arrival and the walks.
 */
const STILLS = {
  firstFour: [
    ["ring-shown", 20.0, "A man in a beige suit and black gloves points at the ring an Inter player in a black T-shirt has just put on; both smile in front of the Inter backdrop"],
    ["box-open-smiles", 36.87, "A man in a beige suit holds a ring box while a player in a white T-shirt shows his open box with the ring inside; both smile in front of the Inter backdrop"],
    ["box-opened", 28.87, "An Inter player in a denim jacket and a black cap opens the box of his ring, beside a man in a beige suit and black gloves"],
    ["ring-on-finger", 15.17, "The Campione d'Italia ring on a finger, against black"],
  ],
  rest: [
    ["box-received", 16.4, "A man in a beige suit and black gloves and a player in a black tracksuit hold the box of the ring together, in front of the Inter backdrop"],
    ["embrace", 17.47, "A player in a black T-shirt embraces a man in a beige suit, in front of the Inter backdrop"],
    ["ring-put-on", 20.6, "A man in a beige suit and black gloves puts the ring on the finger of a player in a black T-shirt"],
    ["laughter", 23.23, "A man in a beige suit laughs with a seated man in a black hoodie"],
    ["embrace-young-player", 24.43, "A man in a beige suit embraces a young man in a white T-shirt"],
    ["ring-looked-at", 30.13, "A man in a dark shirt looks at the ring in his open box, beside a man in a beige suit holding the box of the rings"],
    ["handshake", 32.93, "A man in a beige suit and a player in a white T-shirt shake hands in front of the Inter backdrop"],
    ["ring-in-box", 37.57, "A Campione d'Italia ring in its open black box; the BRT mark, a name and the number 23 are printed inside"],
    ["box-held", 40.53, "A man in a beige suit and black gloves holds a Berete Jewellers box in front of the Inter backdrop"],
    ["ring-to-camera", 45.4, "A man in a beige suit holds out his hand to the camera, the Campione d'Italia ring on his finger"],
  ],
};

/** The images of the films (seconds): never a black frame. */
const POSTERS = {
  interFilm: 1.2, // the ring whole, three quarters, on black glass
  interHandoverFull: 20.0, // a player shows his ring, the man in the beige suit points at it
  interHandoverEdit: 36.87, // smiles, the box open
  okafor: 32.0, // Noah Okafor, arms crossed, wearing the pendant
};

/** The group photo of Okafor: the part kept, [x, y, w, h] in fractions (the empty top trimmed; the legs touch the sides and the bottom). */
const GROUP_CROP = [0, 0.15, 1, 0.85];

const ALT = {
  interFilm:
    "Presentation film of the Inter Milan Campione d'Italia ring: the ring on black with its details labelled (twenty diamonds and twenty stars, the Italian flag, the name and number of the player), its top worn as a pendant, then Inter players celebrating the twentieth title",
  interHandoverFull:
    "Film of the handover of the Campione d'Italia rings at the Inter Milan training centre: a man in a beige suit and black gloves hands the boxes to the players in front of the Inter backdrop; they open them and put on their rings",
  interHandoverEdit: "The handover of the Campione d'Italia rings at the Inter Milan training centre: the players receive their boxes, open them and put on their rings",
  okaforFilm: "The reveal of Noah Okafor's jersey pendant in Dubai: the arrival at night, the setting of the stones, the pendant taken from its case and worn",
  okaforPortrait: "Noah Okafor holds the jersey pendant he wears, set with diamonds, on its chain",
  okaforGroup: "Four men in a hotel suite in Dubai, three seated on a sofa with their arms crossed and one standing behind them; the man in the middle wears the jersey pendant",
  okaforFitting: "A man fastens a diamond chain around Noah Okafor's neck in a hotel suite",
};

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(cmd + " failed: " + (r.stderr ?? "").slice(-600));
  return r.stdout;
}
const ffmpeg = (args) => run("ffmpeg", ["-v", "error", "-y", ...args]);

function probe(file) {
  const j = JSON.parse(run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,pix_fmt,width,height,r_frame_rate,bit_rate:format=duration,bit_rate", "-of", "json", file]));
  const v = j.streams.find((s) => s.codec_type === "video");
  const [n, d] = v.r_frame_rate.split("/").map(Number);
  return { codec: v.codec_name, pix: v.pix_fmt, width: v.width, height: v.height, fps: n / d, duration: Number(j.format.duration), bitrate: Number(j.format.bit_rate), hasAudio: j.streams.some((s) => s.codec_type === "audio") };
}

/** The scale filter: the short side at most `short`, the long side at most `long`, never larger than the film. */
const fit = (short, long) => "scale=w='trunc(iw*min(1,min(" + short + "/min(iw,ih)," + long + "/max(iw,ih)))/2)*2':h=-2:flags=lanczos";

/** The encoder arguments of one copy of a film (H.264 high, BT.709, key frame every 2 s, index at the start). */
function encodeArgs(info, copy, audio) {
  const fps = info.fps > FILM.maxFps + 0.5 ? FILM.maxFps : Math.round(info.fps) || 30;
  const short = Math.min(info.width, info.height, copy.short);
  const rate = copy.maxrate(short);
  return {
    vf: [fit(copy.short, copy.long), ...(info.fps > FILM.maxFps + 0.5 ? ["fps=" + FILM.maxFps] : []), "format=yuv420p"].join(","),
    out: [
      "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-crf", String(copy.crf), "-maxrate", rate + "k", "-bufsize", rate * 2 + "k",
      "-g", String(fps * 2), "-keyint_min", String(fps), "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      ...(audio ? ["-c:a", "aac", "-b:a", copy.audio, "-ac", "2"] : ["-an"]),
      "-write_tmcd", "0", "-map_metadata", "-1", "-movflags", "+faststart",
    ],
  };
}

/**
 * A film whole: for computers its picture copied as it is when it already is H.264 within the limits (nothing lost), else
 * H.264 up to 1080p; for phones a 720p copy; its sound kept; its image (a frame of the original, 1080 px wide at most).
 */
function wholeFilm(src, dir, name, posterAt) {
  const info = probe(src);
  const film = join(dir, name + ".mp4");
  const mobile = join(dir, name + "-mobile.mp4");
  const short = Math.min(info.width, info.height);
  const asIs = info.codec === "h264" && info.pix === "yuv420p" && short <= FILM.desktop.short && info.bitrate <= FILM.desktop.maxrate(short) * 1000 && info.fps <= FILM.maxFps + 0.5;
  if (asIs) ffmpeg(["-i", src, "-map", "0:v:0", ...(info.hasAudio ? ["-map", "0:a:0", "-c:a", "copy"] : ["-an"]), "-c:v", "copy", "-map_metadata", "-1", "-movflags", "+faststart", film]);
  else {
    const d = encodeArgs(info, FILM.desktop, info.hasAudio);
    ffmpeg(["-i", src, "-map", "0:v:0", ...(info.hasAudio ? ["-map", "0:a:0"] : []), "-vf", d.vf, ...d.out, film]);
  }
  const m = encodeArgs(info, FILM.mobile, info.hasAudio);
  ffmpeg(["-i", src, "-map", "0:v:0", ...(info.hasAudio ? ["-map", "0:a:0"] : []), "-vf", m.vf, ...m.out, mobile]);
  return { film, mobile, poster: posterFrom(src, dir, name, posterAt), audio: info.hasAudio };
}

/** The cut of the handover: EDIT, its music continuous (EDIT_MUSIC), for computers and for phones. */
function editFilm(src, dir, name, posterAt) {
  const info = probe(src);
  const total = EDIT.reduce((s, [a, b]) => s + (b - a), 0);
  const tail = info.duration - EDIT_MUSIC[1];
  const head = total - tail + EDIT_FADE;
  const graph = (vf) =>
    EDIT.map(([a, b], i) => "[0:v]trim=start=" + a + ":end=" + b + ",setpts=PTS-STARTPTS[v" + i + "]").join(";") +
    ";" + EDIT.map((_, i) => "[v" + i + "]").join("") + "concat=n=" + EDIT.length + ":v=1:a=0," + vf + "[v]" +
    ";[0:a]atrim=start=" + EDIT_MUSIC[0] + ":end=" + (EDIT_MUSIC[0] + head).toFixed(3) + ",asetpts=PTS-STARTPTS,afade=t=in:d=0.02[a0]" +
    ";[0:a]atrim=start=" + EDIT_MUSIC[1] + ",asetpts=PTS-STARTPTS[a1]" +
    ";[a0][a1]acrossfade=d=" + EDIT_FADE + ":c1=tri:c2=tri,atrim=end=" + total.toFixed(3) + "[a]";
  const out = {};
  for (const [key, copy, file] of [["film", FILM.desktop, join(dir, name + ".mp4")], ["mobile", FILM.mobile, join(dir, name + "-mobile.mp4")]]) {
    const e = encodeArgs(info, copy, true);
    ffmpeg(["-i", src, "-filter_complex", graph(e.vf), "-map", "[v]", "-map", "[a]", ...e.out, file]);
    out[key] = file;
  }
  return { ...out, poster: posterFrom(src, dir, name, posterAt), audio: true };
}

/** A frame of a film, lossless, in its own colours (BT.709). */
function frame(src, at, png) {
  ffmpeg(["-ss", String(at), "-i", src, "-frames:v", "1", "-vf", "scale=in_color_matrix=bt709:in_range=tv,format=rgb24", png]);
  return png;
}

/** The image of a film: a frame of the original, 1080 px wide at most, WebP, with its smaller copies. */
function posterFrom(src, dir, name, at) {
  const png = frame(src, at, join(dir, "." + name + "-poster.png"));
  return { png, out: join(dir, name + "-poster.webp") };
}

async function writePoster({ png, out }) {
  const img = sharp(png).resize(1080, 1920, { fit: "inside", withoutEnlargement: true, kernel: "lanczos3" });
  const { width } = await img.clone().webp({ quality: 84, effort: 6 }).toFile(out);
  for (const size of SIZES) if (width >= size.width * MARGIN) await sharp(out).resize(size.width, null, { kernel: "lanczos3" }).webp({ quality: size.quality, effort: 6 }).toFile(sizedPath(out, size.width));
  await rm(png, { force: true });
}

/** A photo: its page copy (LONG px), its smaller copies, its loupe copy (none when the original is hardly larger). */
async function photo(input, dir, name, crop) {
  let img = sharp(input).rotate();
  if (crop) {
    const { width, height } = await sharp(await img.clone().toBuffer()).metadata();
    const [x, y, w, h] = crop;
    const left = Math.round(x * width);
    const top = Math.round(y * height);
    img = sharp(await img.clone().extract({ left, top, width: Math.min(width - left, Math.round(w * width)), height: Math.min(height - top, Math.round(h * height)) }).toBuffer());
  }
  const out = join(dir, name + ".webp");
  const { width, height } = await img.clone().resize(LONG, LONG, { fit: "inside", kernel: "lanczos3", withoutEnlargement: true }).webp({ quality: 84, effort: 6 }).toFile(out);
  for (const size of SIZES) {
    if (width < size.width * MARGIN) continue;
    await img.clone().resize(size.width, null, { kernel: "lanczos3" }).webp({ quality: size.quality, effort: 6 }).toFile(sizedPath(out, size.width));
  }
  const zoom = join(dir, name + ".loupe.webp");
  const z = await img.clone().resize(LOUPE.long, LOUPE.long, { fit: "inside", kernel: "lanczos3", withoutEnlargement: true }).webp({ quality: LOUPE.quality, effort: 6 }).toFile(zoom);
  const kept = Math.max(z.width, z.height) >= Math.max(width, height) * LOUPE_MARGIN;
  if (!kept) await rm(zoom, { force: true });
  return { name, width, height, zoom: kept ? { width: z.width, height: z.height } : null };
}

/**
 * Makes one group in a temporary folder, versions every name with a fingerprint of all its files, then swaps it in place of
 * the old folder. `make(tmp)` returns its entries; `describe(v)` turns them into the JSON. Returns the JSON and the loupes.
 */
async function group(key, make) {
  const dir = join(OUT, key);
  const tmp = join(OUT, "." + key + ".tmp");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const describe = await make(tmp);
  const files = (await readdir(tmp)).filter((f) => !f.startsWith(".")).sort();
  const hash = createHash("sha256");
  for (const f of files) hash.update(f + "\0").update(readFileSync(join(tmp, f)));
  const v = hash.digest("hex").slice(0, 10);
  for (const f of files) await rename(join(tmp, f), join(tmp, f.replace(/^([^.]+)\./, "$1." + v + ".")));
  await rm(dir, { recursive: true, force: true });
  await rename(tmp, dir);
  const base = WEB + key + "/";
  const loupes = new Map();
  const at = (name, ext) => base + name + "." + v + "." + ext;
  const filmItem = (name, extra) => {
    const p = probe(join(dir, name + "." + v + ".mp4"));
    return { type: "video", src: at(name, "mp4"), mobile: at(name + "-mobile", "mp4"), poster: at(name + "-poster", "webp"), width: p.width, height: p.height, duration: Math.round(p.duration * 100) / 100, audio: p.hasAudio, ...extra, onBlack: false };
  };
  const photoItem = (m, alt) => {
    const src = at(m.name, "webp");
    if (m.zoom) loupes.set(src, { src: base + m.name + "." + v + ".loupe.webp", ...m.zoom });
    return { type: "image", src, width: m.width, height: m.height, alt, onBlack: false };
  };
  const json = describe({ filmItem, photoItem });
  const size = files.reduce((s, f) => s + readFileSync(join(dir, f.replace(/^([^.]+)\./, "$1." + v + "."))).length, 0);
  console.log("  + " + key + " (" + v + ", " + files.length + " files, " + (size / 1e6).toFixed(1) + " MB)");
  return { json, loupes, prefix: base };
}

function need(...files) {
  const missing = files.filter((f) => !existsSync(f));
  if (missing.length) {
    console.error("Not found:\n  " + missing.join("\n  ") + "\n(read from " + SRC + ")");
    return false;
  }
  return true;
}

const GROUPS = {
  "inter-film": async () =>
    need(INTER_FILM) &&
    group("inter-film", async (tmp) => {
      const f = wholeFilm(INTER_FILM, tmp, "presentation", POSTERS.interFilm);
      await writePoster(f.poster);
      return ({ filmItem }) => ({ interFilm: filmItem("presentation", { alt: ALT.interFilm }) });
    }),
  "inter-handover": async () =>
    need(INTER_HANDOVER) &&
    group("inter-handover", async (tmp) => {
      const full = wholeFilm(INTER_HANDOVER, tmp, "handover", POSTERS.interHandoverFull);
      await writePoster(full.poster);
      const edit = editFilm(INTER_HANDOVER, tmp, "highlights", POSTERS.interHandoverEdit);
      await writePoster(edit.poster);
      return ({ filmItem }) => ({
        interHandoverFull: filmItem("handover", { alt: ALT.interHandoverFull }),
        interHandoverEdit: filmItem("highlights", { alt: ALT.interHandoverEdit }),
      });
    }),
  "inter-photos": async () =>
    need(INTER_HANDOVER) &&
    group("inter-photos", async (tmp) => {
      const made = {};
      for (const [row, list] of Object.entries(STILLS)) {
        made[row] = [];
        for (const [name, at, alt] of list) {
          const png = frame(INTER_HANDOVER, at, join(tmp, "." + name + ".png"));
          made[row].push([await photo(png, tmp, name), alt]);
          await rm(png, { force: true });
        }
      }
      return ({ photoItem }) => ({
        interPhotos: {
          // Not in the two albums (27/11/2026): Yoni with Marcus Thuram and Marko Arnautović in front of the Inter wall, and
          // the player in a black-and-blue Inter jacket with his hand on his face. Asked to Malik.
          yoniWithPlayers: null,
          photo2: null,
          firstFour: made.firstFour.map(([m, alt]) => photoItem(m, alt)),
          rest: made.rest.map(([m, alt]) => photoItem(m, alt)),
        },
      });
    }),
  "okafor-dubai": async () =>
    need(...Object.values(OKAFOR)) &&
    group("okafor-dubai", async (tmp) => {
      const f = wholeFilm(OKAFOR.film, tmp, "reveal", POSTERS.okafor);
      await writePoster(f.poster);
      const portrait = await photo(OKAFOR.portrait, tmp, "portrait");
      const groupPhoto = await photo(OKAFOR.group, tmp, "group", GROUP_CROP);
      const fitting = await photo(OKAFOR.fitting, tmp, "fitting");
      return ({ filmItem, photoItem }) => ({
        okaforReveal: {
          film: filmItem("reveal", { alt: ALT.okaforFilm }),
          portrait: photoItem(portrait, ALT.okaforPortrait),
          group: photoItem(groupPhoto, ALT.okaforGroup),
          fitting: photoItem(fitting, ALT.okaforFitting),
        },
      });
    }),
};

console.log("Yoni 27/11: " + SRC);
await mkdir(OUT, { recursive: true });
let data = {};
try {
  data = JSON.parse(readFileSync(DATA, "utf8"));
} catch {
  /* first run */
}
const loupes = new Map();
const prefixes = [];
let failed = false;
for (const [key, makeGroup] of Object.entries(GROUPS)) {
  if (ONLY && !ONLY.has(key)) continue;
  const made = await makeGroup();
  if (!made) {
    failed = true;
    continue;
  }
  Object.assign(data, made.json);
  for (const [k, value] of made.loupes) loupes.set(k, value);
  prefixes.push(made.prefix);
}
const ORDER = ["interFilm", "interHandoverFull", "interHandoverEdit", "interPhotos", "okaforReveal"];
await writeFile(DATA, JSON.stringify(Object.fromEntries(ORDER.filter((k) => data[k]).map((k) => [k, data[k]])), null, 1) + "\n");
console.log("  = src/data/yoni2711.generated.json");
if (prefixes.length) await saveLoupes(loupes, prefixes);
if (failed) process.exitCode = 1;
