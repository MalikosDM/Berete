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
 *   - Deniz Undav, the film of the AngeL Pendant (shared iCloud album of Yoni « Video AngeL pendant », 27/11/2026: one item,
 *     downloaded in its original quality, "EAZY_Jewelry Craftsmanship_20241223 109215 L吊坠__Final cut 成品视频1080p_25FPS.mp4",
 *     1080 x 1920 H.264, 25 im/s, 24.76 s, 55.4 MB, with music): the film whole, never shortened. Looked at frame by frame
 *     (27/11/2026): real footage of the finished pendant (macro shots of the pavé, the rose-gold angel, the engraved back with
 *     the BRT mark, the pendant in a gloved hand); its last 1.8 s (23.0 s to the end) are a card with the BRT logo on black.
 *   - Two photos where the pieces are worn (WhatsApp of Yoni, 27/11/2026, copied with clear names into worn/): Deniz Undav
 *     wearing the AngeL Pendant, the DFB-Pokal in his arms; the JL pendant worn on the 14 mm Cuban chain (Yoni: « JL + 14 mm
 *     Cuban »). Both 1290 x 1597, whole (no border to remove): their page copy already is the whole photo, so no loupe copy.
 *
 * The films of Yoni of 28/11/2026, three shared iCloud albums of one item each, downloaded in their original quality (the
 * album's ckdatabasews records, CPLMaster `resOriginalRes`, read with a headless Chromium; size checked against the record):
 *   - Samuel Ballet, the Jesus Piece: "2E5101D8-DC67-4512-AD43-A76284B3131B.mov", 2160 x 3840 H.264, 60 im/s, 12.98 s, 89.9 MB,
 *     with music -> ballet-film/ballet-jesus-piece-film-original.mov. Looked at frame by frame: real footage on black velvet
 *     (the piece whole 0.5-2.3 s, its bail and hinge 2.4-2.9 s, bail, crown and face 3.0-4.6 s, sideways 4.7-6.1 s, profile
 *     6.3-7.9 s, face and crown 8.0-9.6 s, the piece on the BRT velvet 9.6-12.4 s, the BRT card from 12.45 s).
 *   - Malik Tillman, the cross pendant (album « MT — Nexus Cross »): "1127 (1)(2).mp4", 2160 x 3840 HEVC 10 bit, 30 im/s, 23.1 s,
 *     97.6 MB, with music -> tillman-film/tillman-nexus-cross-film-original.mp4. Real footage: the cross held in a gloved hand,
 *     its centre disc spinning (0.07-1.27 s and 11.07-12.43 s, where it slows down until MT can be read), the infinity links
 *     (1.3-6.3 s, mirrored by the edit from 3.5 s), the bail (6.4-8.8 s), the MT disc (8.9-11.0 s and 18.8-20.45 s), the chain
 *     (12.5-16 s), the clasp and its BRT mark (16-17.3 s), the engraved back (17.4-18.7 s), the cross whole (20.5-22.15 s), the
 *     BRT card from 22.2 s. A faint outline of the BRT mark is laid over the centre of many shots by the edit.
 *   - Noah Okafor, the jersey pendant (album « Finish piece video T shirt »): "1127 (1)(1).mp4", 2160 x 3840 HEVC 10 bit,
 *     30 im/s, 23.53 s, 93.6 MB, with music -> jersey-film/okafor-jersey-pendant-film-original.mp4. Real footage: almost black
 *     until 3.4 s (the jersey in the dark, glints), close-ups (3.5-6 s), the pendant on its chain on a black bust (6.5-8.6 s),
 *     the chain (9-10.5 s), the jersey turning on black (11-13.3 s, front and back side by side), the flags and OKA in close-up
 *     (13.4-19.4 s), the jersey turning on black (19.45-22.05 s), the BRT card from 22.1 s.
 *   Made from them: the three films whole, stills of the Jesus Piece (it has no studio photo: BALLET_STILLS) and a silent loop
 *   of the spinning centre of the cross (SPIN).
 *
 * Read first from "$BERETE_DISK/Berete - Dossiers icloud/00 Contexte Yoni/Yoni 27-11/" when that folder exists, else from
 * .local/yoni-2711/ (same layout: icloud-inter-film/, icloud-inter-livraison/, okafor-dubai/, inter/, angel-film/, worn/; the originals never go in
 * Git and are never modified); the films of 28/11 from ".../Yoni 28-11/" else .local/yoni-2811/ (ballet-film/, tillman-film/,
 * jersey-film/). Written for the web with a version (a fingerprint of the files of the group) in every name:
 *   public/media/yoni-2711/<group>/<name>.<v>.mp4          film for computers (H.264, up to 1080 x 1920, 4.5 Mbit/s at most)
 *   public/media/yoni-2711/<group>/<name>-mobile.<v>.mp4   its copy for phones (720 x 1280, 1.5 Mbit/s at most)
 *   public/media/yoni-2711/<group>/<name>-poster.<v>.webp  its image before it plays (+ .w160 / .w640 copies)
 *   public/media/yoni-2711/<group>/<name>.<v>.webp         a photo, 1600 px on its long side (+ .w160 / .w640 / .w1080)
 *   public/media/yoni-2711/<group>/<name>.<v>.loupe.webp   its loupe copy (scripts/loupe.mjs), in src/data/loupe.generated.json
 * and src/data/yoni2711.generated.json (MediaItem of src/data/types.ts; a film also has `mobile`, as FeatureFilmData).
 *
 *   node scripts/yoni-2711-media.mjs
 *   node scripts/yoni-2711-media.mjs --only=inter-film,inter-handover,inter-photos,inter,okafor-dubai,angel-film,worn
 *   node scripts/yoni-2711-media.mjs --only=ballet-film,tillman-film,jersey-film,tillman-spin,ballet-stills
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
/** The films of 28/11/2026 (header). */
const DISK_DIR_2811 = join(DISK, "Berete - Dossiers icloud", "00 Contexte Yoni", "Yoni 28-11");
const SRC_2811 = existsSync(DISK_DIR_2811) ? DISK_DIR_2811 : join(ROOT, ".local", "yoni-2811");
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
/** The two photos of Yoni for the Inter page (27/11/2026), with clear names in inter/. */
const INTER_EXTRA = {
  yoni: join(SRC, "inter", "yoni-thuram-arnautovic-milan.jpeg"),
  photo2: join(SRC, "inter", "photo-2-champion-trophee.jpeg"),
};
/** The film of the AngeL Pendant (album « Video AngeL pendant »), and the two photos where the pieces are worn. */
const ANGEL_FILM = join(SRC, "angel-film", "angel-pendant-film-original.mp4");
const WORN = {
  angelUndav: join(SRC, "worn", "angel-pendant-porte-undav-dfb.jpeg"),
  jlCuban: join(SRC, "worn", "jl-pendant-cuban-14mm-porte.jpeg"),
};
/** The three films of 28/11 (header). */
const BALLET_FILM = join(SRC_2811, "ballet-film", "ballet-jesus-piece-film-original.mov");
const TILLMAN_FILM = join(SRC_2811, "tillman-film", "tillman-nexus-cross-film-original.mp4");
const JERSEY_FILM = join(SRC_2811, "jersey-film", "okafor-jersey-pendant-film-original.mp4");
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
  interFilm: 19, // the ring whole from its side, lit (28/11/2026, evening: 1.2 s was too dark, 42/255)
  interHandoverFull: 20.0, // a player shows his ring, the man in the beige suit points at it
  interHandoverEdit: 36.87, // smiles, the box open
  okafor: 32.0, // Noah Okafor, arms crossed, wearing the pendant
  angel: 9.1, // the L whole and its rose-gold angel, sharp, from the front (mean luminance 0.30)
  // The Jesus Piece in three quarters: the bail, the crown of pear diamonds, the face and beard in relief; the sharpest frame
  // of its shot (mean luminance 0.24). The piece whole (0.5-2.3 s) is darker (0.15 at most): it is the first still instead.
  ballet: 4.2,
  // The cross whole from the front, MT readable on its centre disc, on black (mean luminance 0.26); a gloved hand only shows
  // dimly at the top, out of focus, behind the bail.
  tillman: 21.2,
  // The jersey whole, three quarters, arms crossed, the Swiss flag and the green sleeve (mean luminance 0.27); its other
  // whole views (20.5-22 s) are darker (0.15).
  jersey: 19.5,
};

/**
 * The stills of the Jesus Piece of Samuel Ballet (it has no studio photo), each the sharpest frame of its moment (blur
 * measured frame by frame in the 4K original, then looked at). [name, second, kind, alt, { crop: [x, y, w, h] in fractions
 * of the frame, rotate: degrees }]. Kinds: front, threequarter, crown, face, claws, crownface, other (See More).
 */
const BALLET_STILLS = [
  ["front", 2.2, "front", "The Samuel Ballet Jesus Piece whole on black velvet: the face set with diamonds, the crown of pear diamonds and the bail"],
  ["threequarter", 4.2, "threequarter", "The Jesus Piece in three-quarter view: the bail, the crown of pear diamonds and the sculpted face and beard in relief"],
  ["crown", 9.05, "crown", "Close-up of the white-gold crown of the Jesus Piece and its pear diamonds", { crop: [0, 0, 1, 0.3] }],
  ["face", 9.05, "face", "Close-up of the rose-gold face of the Jesus Piece: the eyes, the nose and the beard in a mosaic of diamonds", { crop: [0, 0.22, 1, 0.6] }],
  ["claws", 7.7, "claws", "Macro of the crown of the Jesus Piece: the white-gold claws holding each pear diamond", { crop: [0.38, 0.02, 0.62, 0.42] }],
  ["crown-face", 9.5, "crownface", "The crown of pear diamonds above the face and beard of the Jesus Piece"],
  // (28/11/2026) Two more close-ups, so that Every Angle and The Art of Detail never show the same picture: the crown from
  // above the bail, and the mosaic of the eyes and the nose.
  ["crown-macro", 3.5, "crown", "Macro of the crown of the Jesus Piece: thirty-two pear-shaped diamonds in white gold, above the rose-gold face", { crop: [0.08, 0.3, 0.92, 0.37] }],
  ["face-mosaic", 8.6, "face", "The mosaic of the face of the Jesus Piece: round diamonds of varying sizes around the eyes and the nose", { crop: [0.1, 0.24, 0.9, 0.46] }],
  ["bail-hinge", 2.9, "other", "The bail of the Jesus Piece and its rose-gold hinge, beside the crown of pear diamonds"],
  ["sideways", 5.85, "other", "The Jesus Piece seen sideways: the crown of pear diamonds and the face paved with diamonds"],
  ["profile", 7.7, "other", "The Jesus Piece in profile: the relief of the nose and the beard beneath the crown of pear diamonds"],
  // Filmed from above, lying on the velvet upside down: turned the right way up.
  ["on-velvet", 10.8, "other", "The Jesus Piece lying on black velvet, seen from above: the bail, the crown and the face set with diamonds", { rotate: 180 }],
];

/**
 * The silent loop of the spinning centre of Malik Tillman's cross, from its first shot (frames 2 to 38 of the original, 0.07 to
 * 1.27 s: the cross held in a gloved hand, the disc spinning fast). The cross drifts a little with the hand: each frame is
 * followed (shift found by comparing the ring around the disc with the middle frame, the disc itself left out) and a square of
 * `size` px of the original is cut around the disc, then brought to `out` px. The film is 25 im/s in 30 (one frame in six
 * repeated): the repeats are dropped, the loop is 25 im/s. Seamless: its last `fade` frames are crossfaded into its first
 * ones; the loop played `cycles` times in the file. H.264 without any audio track.
 */
const SPIN = { frames: [2, 38], centre: [1013, 1823], window: 1500, size: 1080, out: 720, fade: 6, cycles: 3, fps: 25, disc: 210, ring: 600, search: 8 };

/**
 * The rate of the pictures of the films of 28/11 (repeated frames counted in the originals): the Jesus Piece is 25 im/s
 * spread over 60 (each picture shown 2 or 3 times: repeats dropped, then 25 im/s); the cross is 25 im/s in 30 (one picture
 * in six repeated: dropped). The jersey is a true 30 im/s.
 */
const CADENCE = {
  // A short film (13 s) of sparkling close-ups: its rate buffer one second only, so that it stays within the limits.
  ballet: { vf: "mpdecimate,fps=25", fps: 25, buffer: 1 },
  tillman: { vf: "decimate=cycle=6", fps: 25 },
};

/** The group photo of Okafor: the part kept, [x, y, w, h] in fractions (the empty top trimmed; the legs touch the sides and the bottom). */
// The four men whole (their legs and shoes reach the bottom and the sides of the photo): only the empty wall above them goes.
const GROUP_CROP = [0, 0.2, 1, 1];

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
  interYoni: "Yoni Berete with Marko Arnautović and Marcus Thuram in front of the Inter backdrop in Milan, the case of the ring in his hands",
  interPhoto2: "An Inter player in a black-and-blue jacket and a Campione cap, his hand on his face, the Serie A trophy before him",
  angelFilm:
    "Film of the AngeL Pendant: the L set with diamonds and its rose-gold angel, close-ups of the pavé and of the angel, the engraved back with the BRT mark, the pendant in a gloved hand, then the Berete Jewellers card",
  wornAngelUndav: "Deniz Undav in a white VfB Stuttgart hoodie, wearing the AngeL Pendant and holding the DFB-Pokal trophy",
  wornJlCuban: "The JL pendant worn on the 14 mm Cuban chain, with a winner's medal, by a man in sunglasses and a VfB Stuttgart blazer",
  balletFilm:
    "Film of the Samuel Ballet Jesus Piece: the pendant on black velvet, its crown of pear diamonds, its rose-gold face and beard set with diamonds, its bail, then the piece on the Berete Jewellers velvet and the BRT card",
  tillmanFilm:
    "Film of Malik Tillman's cross pendant: the cross in a gloved hand, its centre disc spinning, the infinity links of its chain, the diamond-shaped bail, the MT disc, the clasp with the rose-gold BRT mark, the engraved back, then the cross whole on black",
  jerseyFilm:
    "Film of Noah Okafor's jersey pendant: the jersey set with diamonds in the dark, the pendant on its chain on a black bust, the green sleeve, the Swiss flag and OKA in close-up, then the jersey turning on black",
  tillmanSpin: "The centre of Malik Tillman's cross: its round disc spinning between the diamond-set arms",
};
/** The captions of Yoni, word for word. */
const CAPTION = { jlCuban: "JL + 14 mm Cuban" };

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
function encodeArgs(info, copy, audio, cadence) {
  const fps = cadence ? cadence.fps : info.fps > FILM.maxFps + 0.5 ? FILM.maxFps : Math.round(info.fps) || 30;
  const short = Math.min(info.width, info.height, copy.short);
  const rate = copy.maxrate(short);
  return {
    // setparams: a film without colour tags (the AngeL film) keeps BT.709 on its frames, else the encoder writes them unknown.
    vf: [fit(copy.short, copy.long), ...(cadence ? [cadence.vf] : info.fps > FILM.maxFps + 0.5 ? ["fps=" + FILM.maxFps] : []), "format=yuv420p", "setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709"].join(","),
    out: [
      "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-crf", String(copy.crf), "-maxrate", rate + "k", "-bufsize", rate * (cadence?.buffer ?? 2) + "k",
      "-g", String(fps * 2), "-keyint_min", String(fps), "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      ...(audio ? ["-c:a", "aac", "-b:a", copy.audio, "-ac", "2"] : ["-an"]),
      "-write_tmcd", "0", "-map_metadata", "-1", "-movflags", "+faststart",
    ],
  };
}

/**
 * A film whole: for computers its picture copied as it is when it already is H.264 within the limits (nothing lost), else
 * H.264 up to 1080p; for phones a 720p copy; its sound kept; its image (a frame of the original, 1080 px wide at most).
 * `cadence` (CADENCE): a film whose pictures are repeated to fill a higher frame rate is brought back to its own rate (each
 * picture once), so that it moves evenly.
 */
function wholeFilm(src, dir, name, posterAt, cadence) {
  const info = probe(src);
  const film = join(dir, name + ".mp4");
  const mobile = join(dir, name + "-mobile.mp4");
  const short = Math.min(info.width, info.height);
  const asIs = !cadence && info.codec === "h264" && info.pix === "yuv420p" && short <= FILM.desktop.short && info.bitrate <= FILM.desktop.maxrate(short) * 1000 && info.fps <= FILM.maxFps + 0.5;
  if (asIs) ffmpeg(["-i", src, "-map", "0:v:0", ...(info.hasAudio ? ["-map", "0:a:0", "-c:a", "copy"] : ["-an"]), "-c:v", "copy", "-map_metadata", "-1", "-movflags", "+faststart", film]);
  else {
    const d = encodeArgs(info, FILM.desktop, info.hasAudio, cadence);
    ffmpeg(["-i", src, "-map", "0:v:0", ...(info.hasAudio ? ["-map", "0:a:0"] : []), "-vf", d.vf, ...d.out, film]);
  }
  const m = encodeArgs(info, FILM.mobile, info.hasAudio, cadence);
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

/** A still of a film: its frame (lossless), turned or cut if asked, then as a photo (page copy, smaller copies, loupe copy). */
async function still(film, at, dir, name, { crop, rotate } = {}) {
  let png = frame(film, at, join(dir, "." + name + ".png"));
  if (rotate) {
    const turned = join(dir, "." + name + "-turned.png");
    await sharp(png).rotate(rotate).toFile(turned);
    await rm(png, { force: true });
    png = turned;
  }
  const made = await photo(png, dir, name, crop);
  await rm(png, { force: true });
  return made;
}

/** The loop of the spinning centre of the cross (SPIN): `name`.mp4 (out x out, no audio track) and its image. */
async function spinLoop(src, dir, name) {
  const [first, last] = SPIN.frames;
  const W = SPIN.window;
  const x0 = SPIN.centre[0] - W / 2;
  const y0 = SPIN.centre[1] - W / 2;
  const raw = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", src, "-vf", "select='between(n\\," + first + "\\," + last + ")',crop=" + W + ":" + W + ":" + x0 + ":" + y0 + ",scale=in_color_matrix=bt709:in_range=tv,format=rgb24", "-fps_mode", "passthrough", "-f", "rawvideo", "-"],
    { maxBuffer: 1 << 30 },
  );
  if (raw.status !== 0) throw new Error("ffmpeg failed: " + raw.stderr.toString().slice(-400));
  const size = W * W * 3;
  const n = raw.stdout.length / size;
  if (n !== last - first + 1) throw new Error("spin: " + n + " frames read, " + (last - first + 1) + " expected");
  const all = Array.from({ length: n }, (_, i) => raw.stdout.subarray(i * size, (i + 1) * size));
  // Grey at half size, to follow the cross.
  const H = W / 2;
  const allGrey = all.map((f) => {
    const g = new Float32Array(H * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < H; x++) {
        let s = 0;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const p = ((2 * y + dy) * W + 2 * x + dx) * 3;
          s += 0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2];
        }
        g[y * H + x] = s / 4;
      }
    return g;
  });
  // The repeated frames dropped (each picture once).
  const keep = all.map((_, i) => {
    if (i === 0) return true;
    let d = 0;
    for (let p = 0; p < H * H; p += 7) d += Math.abs(allGrey[i][p] - allGrey[i - 1][p]);
    return d / Math.ceil((H * H) / 7) > 0.5;
  });
  const frames = all.filter((_, i) => keep[i]);
  const grey = allGrey.filter((_, i) => keep[i]);
  const count = frames.length;
  console.log("    spin: " + n + " frames, " + (n - count) + " repeats dropped");
  // The ring around the disc (half size), every other pixel: what is compared from frame to frame.
  const c = H / 2;
  const ring = [];
  for (let y = 0; y < H; y += 2)
    for (let x = 0; x < H; x += 2) {
      const r = Math.hypot(x - c, y - c);
      if (r > SPIN.disc / 2 && r < SPIN.ring / 2) ring.push(y * H + x, x, y);
    }
  const ref = Math.floor(count / 2);
  const cost = (g, dx, dy) => {
    let s = 0;
    let k = 0;
    for (let i = 0; i < ring.length; i += 3) {
      const x = ring[i + 1] + dx;
      const y = ring[i + 2] + dy;
      if (x < 0 || y < 0 || x >= H || y >= H) continue;
      s += Math.abs(grey[ref][ring[i]] - g[y * H + x]);
      k++;
    }
    return s / k;
  };
  const shift = new Array(count);
  shift[ref] = [0, 0];
  const follow = (i, from) => {
    const [sx, sy] = from;
    let best = [Infinity, 0, 0];
    for (let dy = -SPIN.search; dy <= SPIN.search; dy++)
      for (let dx = -SPIN.search; dx <= SPIN.search; dx++) {
        const v = cost(grey[i], Math.round(sx) + dx, Math.round(sy) + dy);
        if (v < best[0]) best = [v, Math.round(sx) + dx, Math.round(sy) + dy];
      }
    const [, bx, by] = best;
    // Below the pixel: a parabola through the costs beside the best one.
    const sub = (a, b, m) => (a + b - 2 * m === 0 ? 0 : (0.5 * (a - b)) / (a + b - 2 * m));
    const m = best[0];
    return [bx + sub(cost(grey[i], bx - 1, by), cost(grey[i], bx + 1, by), m), by + sub(cost(grey[i], bx, by - 1), cost(grey[i], bx, by + 1), m)];
  };
  for (let i = ref + 1; i < count; i++) shift[i] = follow(i, shift[i - 1]);
  for (let i = ref - 1; i >= 0; i--) shift[i] = follow(i, shift[i + 1]);
  console.log("    spin: shifts (px of the original) " + shift.map(([x, y]) => (2 * x).toFixed(1) + "," + (2 * y).toFixed(1)).join(" "));
  // The square around the disc, at `out` px.
  const S = SPIN.size;
  const O = SPIN.out;
  const cut = [];
  for (let i = 0; i < count; i++) {
    const left = Math.round(W / 2 + 2 * shift[i][0] - S / 2);
    const top = Math.round(W / 2 + 2 * shift[i][1] - S / 2);
    if (left < 0 || top < 0 || left + S > W || top + S > W) throw new Error("spin: frame " + i + " leaves the window");
    cut.push(await sharp(frames[i], { raw: { width: W, height: W, channels: 3 } }).extract({ left, top, width: S, height: S }).resize(O, O, { kernel: "lanczos3" }).raw().toBuffer());
  }
  // Seamless: the last frames crossfaded into the first ones.
  const F = SPIN.fade;
  const L = count - F;
  const loop = [];
  for (let j = 0; j < L; j++) {
    if (j >= F) {
      loop.push(cut[j]);
      continue;
    }
    const w = (j + 1) / (F + 1);
    const a = cut[L + j];
    const b = cut[j];
    const m = Buffer.alloc(a.length);
    for (let p = 0; p < a.length; p++) m[p] = Math.round(a[p] * (1 - w) + b[p] * w);
    loop.push(m);
  }
  const film = join(dir, name + ".mp4");
  const stream = Buffer.concat(Array.from({ length: SPIN.cycles }, () => loop).flat());
  const enc = spawnSync(
    "ffmpeg",
    [
      "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", O + "x" + O, "-r", String(SPIN.fps), "-i", "-",
      "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709",
      "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-crf", "23", "-maxrate", "1200k", "-bufsize", "1200k", "-g", String(SPIN.fps),
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-an", "-map_metadata", "-1", "-movflags", "+faststart", film,
    ],
    { input: stream, maxBuffer: 1 << 26 },
  );
  if (enc.status !== 0) throw new Error("ffmpeg failed: " + enc.stderr.toString().slice(-400));
  const png = join(dir, "." + name + "-poster.png");
  await sharp(loop[Math.floor(L / 2)], { raw: { width: O, height: O, channels: 3 } }).png().toFile(png);
  return { film, poster: { png, out: join(dir, name + "-poster.webp") } };
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
  const photoItem = (m, alt, extra) => {
    const src = at(m.name, "webp");
    if (m.zoom) loupes.set(src, { src: base + m.name + "." + v + ".loupe.webp", ...m.zoom });
    return { type: "image", src, width: m.width, height: m.height, alt, ...extra, onBlack: false };
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
          yoniWithPlayers: data.interPhotos?.yoniWithPlayers ?? null,
          photo2: data.interPhotos?.photo2 ?? null,
          firstFour: made.firstFour.map(([m, alt]) => photoItem(m, alt)),
          rest: made.rest.map(([m, alt]) => photoItem(m, alt)),
        },
      });
    }),
  // The two photos of Yoni sent on WhatsApp (27/11/2026), copied with clear names into inter/: Yoni Berete with Marcus Thuram and
  // Marko Arnautović in front of the Inter wall, with the case (beside « The Story Behind the Ring »); « photo 2 », the player in
  // an Inter jacket and a « Campione » cap, his hand on his face, the trophy before him (among the four photos of the hand-over).
  inter: async () =>
    need(INTER_EXTRA.yoni, INTER_EXTRA.photo2) &&
    group("inter", async (tmp) => {
      // The three men whole, without the empty wall above them.
      const yoni = await photo(INTER_EXTRA.yoni, tmp, "yoni-thuram-arnautovic", [0, 0.26, 1, 0.985]);
      const p2 = await photo(INTER_EXTRA.photo2, tmp, "champion-trophy");
      return ({ photoItem }) => ({
        interPhotos: {
          ...(data.interPhotos ?? {}),
          yoniWithPlayers: photoItem(yoni, ALT.interYoni),
          photo2: photoItem(p2, ALT.interPhoto2),
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
  "angel-film": async () =>
    need(ANGEL_FILM) &&
    group("angel-film", async (tmp) => {
      const f = wholeFilm(ANGEL_FILM, tmp, "angel-pendant", POSTERS.angel);
      await writePoster(f.poster);
      return ({ filmItem }) => ({ angelFilm: filmItem("angel-pendant", { alt: ALT.angelFilm }) });
    }),
  "ballet-film": async () =>
    need(BALLET_FILM) &&
    group("ballet-film", async (tmp) => {
      const f = wholeFilm(BALLET_FILM, tmp, "jesus-piece", POSTERS.ballet, CADENCE.ballet);
      await writePoster(f.poster);
      return ({ filmItem }) => ({ balletFilm: filmItem("jesus-piece", { alt: ALT.balletFilm }) });
    }),
  "tillman-film": async () =>
    need(TILLMAN_FILM) &&
    group("tillman-film", async (tmp) => {
      const f = wholeFilm(TILLMAN_FILM, tmp, "cross", POSTERS.tillman, CADENCE.tillman);
      await writePoster(f.poster);
      return ({ filmItem }) => ({ tillmanFilm: filmItem("cross", { alt: ALT.tillmanFilm }) });
    }),
  "jersey-film": async () =>
    need(JERSEY_FILM) &&
    group("jersey-film", async (tmp) => {
      const f = wholeFilm(JERSEY_FILM, tmp, "jersey", POSTERS.jersey);
      await writePoster(f.poster);
      return ({ filmItem }) => ({ jerseyFilm: filmItem("jersey", { alt: ALT.jerseyFilm }) });
    }),
  "tillman-spin": async () =>
    need(TILLMAN_FILM) &&
    group("tillman-spin", async (tmp) => {
      const f = await spinLoop(TILLMAN_FILM, tmp, "spin");
      await writePoster(f.poster);
      return ({ filmItem }) => {
        // One copy only (720 px), for computers and phones alike.
        const { mobile, ...item } = filmItem("spin", { alt: ALT.tillmanSpin });
        return { tillmanSpin: item };
      };
    }),
  "ballet-stills": async () =>
    need(BALLET_FILM) &&
    group("ballet-stills", async (tmp) => {
      const made = [];
      for (const [name, at, kind, alt, how] of BALLET_STILLS) made.push([await still(BALLET_FILM, at, tmp, name, how), alt, kind]);
      return ({ photoItem }) => ({ balletStills: made.map(([m, alt, kind]) => photoItem(m, alt, { kind })) });
    }),
  worn: async () =>
    need(...Object.values(WORN)) &&
    group("worn", async (tmp) => {
      const angel = await photo(WORN.angelUndav, tmp, "angel-undav");
      const jl = await photo(WORN.jlCuban, tmp, "jl-cuban");
      return ({ photoItem }) => ({
        worn: {
          angelUndav: photoItem(angel, ALT.wornAngelUndav),
          jlCuban: photoItem(jl, ALT.wornJlCuban, { caption: CAPTION.jlCuban }),
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
const ORDER = ["interFilm", "interHandoverFull", "interHandoverEdit", "interPhotos", "okaforReveal", "angelFilm", "worn", "balletFilm", "tillmanFilm", "jerseyFilm", "tillmanSpin", "balletStills"];
// A key written by someone else (not in ORDER) is kept, after the others.
const keys = [...ORDER.filter((k) => data[k]), ...Object.keys(data).filter((k) => !ORDER.includes(k))];
await writeFile(DATA, JSON.stringify(Object.fromEntries(keys.map((k) => [k, data[k]])), null, 1) + "\n");
console.log("  = src/data/yoni2711.generated.json");
if (prefixes.length) await saveLoupes(loupes, prefixes);
if (failed) process.exitCode = 1;
