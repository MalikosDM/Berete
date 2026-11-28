/*
 * "Every Angle" (feedback of Yoni, 21/11/2026): every photo and film of a piece came with its text, a small title and one
 * or two sentences. Since 23/11/2026 (Yoni: no text that describes what is already seen) the gallery shows only the title,
 * as a short caption, and only on the few photos where it teaches something (a hidden mechanism, a meaning, an engraving,
 * the piece worn by its player); every "text" is empty and is not shown. Written photo by photo
 * after looking at each one (src/data/angles.json, by piece then by the address of the photo, in English): they say what
 * the photo shows, or what the house already told (story, client, details); no figure that does not come from Yoni, the
 * coloured stones by their colour only. The other languages translate them in src/i18n/content/angles/<lang>.json, keyed
 * by the English text, like every text of the catalogue.
 *
 * Yoni changes them in the admin (« Sous tous les angles »): a title and a text per photo, and their translations if he
 * wants his own. A photo the admin never wrote for keeps the text of the catalogue; one emptied in the admin has none.
 */
import texts from "./angles.json" with { type: "json" };
import type { Angle, MediaItem, Piece, PieceAngles } from "./types.js";

export const ANGLE_LANGUAGES = ["fr", "es", "de", "nl", "ar"] as const;

/** The texts of the catalogue, by piece then by photo. */
export const DEFAULT_ANGLES = texts as Record<string, PieceAngles>;

/** The texts of a piece: those it holds (the admin), over those of the catalogue for its other photos. */
export function anglesOf(slug: string, own: PieceAngles | null | undefined): PieceAngles {
  return { ...DEFAULT_ANGLES[slug], ...own };
}

/** The text of one photo; null when it has none (a photo added in the admin and not written, or one emptied there). */
export function angleOf(piece: Pick<Piece, "angles">, src: string): Angle | null {
  const a = piece.angles[src];
  return a && (a.title.trim() !== "" || a.text.trim() !== "") ? a : null;
}

/**
 * Whether Yoni wrote the caption of a photo himself in the admin (25/11/2026: what he changes there shows on the site): its
 * title differs from the one of the catalogue. The site shows only these captions, under the photo and full screen.
 */
export function ownCaption(english: Pick<Piece, "slug" | "angles"> | undefined, src: string): boolean {
  const a = english?.angles[src];
  if (!english || !a || a.title.trim() === "") return false;
  return a.title.trim() !== (DEFAULT_ANGLES[english.slug]?.[src]?.title ?? "").trim();
}

/** The words of a photo that show it worn or held (its English text, as written in the catalogue). */
const WORN_TEXT = /\b(wearing|worn by|being worn|worn for the first|worn on|held in|held up|gloved hand|on (his|the) wrist|at the house)\b|, worn\b/i;

/**
 * A photo or a film of the piece worn, held in a hand, tried on (Yoni, 23/11/2026: "Every Angle" shows only the piece on
 * black; these go to "Worn by", the same block on every piece). Judged on the English texts of the catalogue.
 */
export function isWorn(m: MediaItem): boolean {
  return m.view === "worn" || m.view === "hand" || AMATEUR_FILMS.has(m.src) || WORN_TEXT.test(m.alt ?? "") || WORN_TEXT.test(m.caption ?? "") || /^Worn by\b/.test(m.caption ?? "");
}

/** The addresses of the photos of a piece (as written in English in the catalogue) worn or held. */
export function wornSet(piece: Pick<Piece, "cover" | "gallery"> | undefined): Set<string> {
  return new Set([piece?.cover, ...(piece?.gallery ?? [])].filter((m): m is MediaItem => Boolean(m?.src && isWorn(m))).map((m) => m.src));
}

/**
 * The photos of "Every Angle": every photo and film of the piece, its opening photo first when the opening shows the jewel
 * cut out (the photo itself is then seen nowhere else), or when the piece has no other photo (a watch). `worn`: the
 * addresses of its photos worn or held (isWorn, judged on the English catalogue), left out (they go to "Worn by").
 */
export function anglePhotos(piece: Pick<Piece, "cover" | "gallery">, openingIsPhoto: boolean, worn: Set<string> = new Set()): MediaItem[] {
  const withCover = piece.cover.src && (!openingIsPhoto || piece.gallery.length === 0);
  const all = (withCover ? [piece.cover, ...piece.gallery] : piece.gallery).filter((m) => !worn.has(m.src));
  const unique = all.filter((m, i) => m.src && all.findIndex((x) => x.src === m.src) === i);
  // The photos and the professional films first, in their order; the amateur films at the end.
  return [...unique.filter((m) => !AMATEUR_FILMS.has(m.src)), ...unique.filter((m) => AMATEUR_FILMS.has(m.src))];
}

/**
 * The films of the galleries that are no professional edit (a phone video, the piece held in a hand, tried on, in its
 * box), looked at frame by frame on 21/11/2026: at the end of "Every Angle" (feedback of Yoni), after the photos and the
 * studio films. A film added in the admin keeps its place.
 */
export const AMATEUR_FILMS = new Set([
  // The panther in a gloved hand, a phone film (23/11/2026: it came second).
  "/media/hd/panther-champion-pendant/v03.mp4",
  "/media/stories/kevin-schade/22.mp4",
  "/media/stories/noah-okafor-ii/03.mp4",
  // (28/11/2026, evening: the story of the Thorned T, the T turning on velvet, is no longer one of them: never worn, it showed
  // under « Created exclusively for » the same image as the first photo of Every Angle; it waits behind See More.)
  "/media/hd/angelo-stiller-as-pendant/v02.mp4",
  "/media/stories/samuel-ballet/05.mp4",
  "/media/stories/samuel-ballet/03.mp4",
  "/media/stories/nz/05.mp4",
  "/media/stories/eljero-elia/02.mp4",
  "/media/stories/collectors/54.mp4",
  "/media/hd/michy-batshuayi-butterfly-chain/v15.mp4",
  "/media/hd/michy-batshuayi-butterfly-chain/v09.mp4",
  "/media/hd/michy-batshuayi-butterfly-chain/v03.mp4",
  "/media/stories/thuram/13.mp4",
  "/media/stories/kevin-schade/14.mp4",
  "/media/hd/ampersand-initials-pendant/v02.mp4",
  "/media/hd/panther-champion-pendant/08-v08.mp4",
  "/media/hd/celestial-initial-medallion/v07.mp4",
]);

/** How many photos "Every Angle" shows before "See N more": all of them up to ANGLES_MANY, else the first ANGLES_FIRST. */
export const ANGLES_FIRST = 9;
export const ANGLES_MANY = 12;
export const anglesShownFirst = (count: number) => (count <= ANGLES_MANY ? count : ANGLES_FIRST);

/** The known parts only, for the base (an emptied entry is kept: that photo has no text). */
export function cleanAngles(v: unknown): PieceAngles {
  const out: PieceAngles = {};
  if (v === null || typeof v !== "object") return out;
  for (const [src, raw] of Object.entries(v as Record<string, unknown>)) {
    if (!src || src.length > 500 || raw === null || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim().slice(0, 200) : "";
    const text = typeof r.text === "string" ? r.text.trim().slice(0, 1000) : "";
    const translations: NonNullable<Angle["translations"]> = {};
    if (r.translations && typeof r.translations === "object") {
      for (const l of ANGLE_LANGUAGES) {
        const t = (r.translations as Record<string, unknown>)[l];
        if (!t || typeof t !== "object") continue;
        const tt = t as Record<string, unknown>;
        const own = {
          ...(typeof tt.title === "string" && tt.title.trim() ? { title: tt.title.trim().slice(0, 200) } : {}),
          ...(typeof tt.text === "string" && tt.text.trim() ? { text: tt.text.trim().slice(0, 1000) } : {}),
        };
        if (Object.keys(own).length > 0) translations[l] = own;
      }
    }
    out[src] = { title, text, ...(Object.keys(translations).length > 0 ? { translations } : {}) };
  }
  return out;
}
