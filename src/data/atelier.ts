/*
 * "Enter the Atelier": the films of a piece, its making-of (its fabrication, filmed at the bench) and its finished piece
 * ("The Final Reveal"), prepared by scripts/import-media.mjs (section "films", list in scripts/film-media.mjs) and played
 * full screen by src/components/AtelierRoom.tsx, from the page of the piece and from the page The Atelier.
 *
 * The admin chooses per piece (PieceAtelier, "L'atelier" in the editor): the film of each kind, any prepared film (by
 * default its own) or none, and the image shown before it plays. A piece without a making-of has no atelier: its page
 * shows no passage and the page The Atelier leaves it out.
 */
import { media } from "./sources.js";

export const FILM_KINDS = ["making", "reveal"] as const;
export type FilmKind = (typeof FILM_KINDS)[number];

export type Film = {
  /** The film for computers (up to 1080p). */
  src: string;
  /** Its lighter copy for phones (720p or 540p). */
  mobile: string;
  width: number;
  height: number;
  /** Seconds. */
  duration: number;
  /** Whether it has a sound track (music, voices). */
  audio: boolean;
  /** Frames of the film offered as its image (the admin chooses one). */
  posters: string[];
  /** The image used by default: the sharpest well-lit frame. */
  poster: number;
  /** Its original ("25/v02" of the folders of Yoni) and its quality ("HD 1080p", "720p"), for the admin. */
  source: string;
  /** Only its light copy was made (a draft, or a finished piece without its making-of). */
  light: boolean;
};

/** The prepared films, by piece then kind. */
export const FILMS = (media.films ?? {}) as Record<string, Partial<Record<FilmKind, Film>>>;

/** What a piece (or the admin) writes. */
export type PieceAtelier = {
  /** The film of each kind, "<slug>/<kind>" of FILMS; null: none; absent: its own. */
  making?: string | null;
  reveal?: string | null;
  /** The image shown before the making-of plays (a frame of it, or a photo); absent: the frame chosen by default. */
  poster?: string;
};

export type ResolvedAtelier = { making: Film; reveal: Film | null; poster: string };

export const filmId = (slug: string, kind: FilmKind) => slug + "/" + kind;

export function filmOf(id: string): Film | null {
  const [slug = "", kind = ""] = id.split("/");
  return (FILM_KINDS as readonly string[]).includes(kind) ? (FILMS[slug]?.[kind as FilmKind] ?? null) : null;
}

/** The atelier of a piece: its films and its image; null when it has no making-of (no passage, no place on The Atelier). */
export function resolveAtelier(slug: string, atelier: PieceAtelier | null | undefined): ResolvedAtelier | null {
  const pick = (kind: FilmKind): Film | null => {
    const chosen = atelier?.[kind];
    if (chosen === null) return null;
    return chosen ? filmOf(chosen) : (FILMS[slug]?.[kind] ?? null);
  };
  const making = pick("making");
  if (!making) return null;
  return { making, reveal: pick("reveal"), poster: atelier?.poster || making.posters[making.poster] || making.posters[0] || "" };
}

/** "0:48", "1:05". */
export const filmTime = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};

const ID = /^[a-z0-9-]{1,100}\/(making|reveal)$/;
const IMAGE = /^\/[\w\-./%]{1,300}\.(webp|jpe?g|png|avif)$/i;

/** An atelier as stored: only the known parts, without the empty ones. */
export function cleanAtelier(value: unknown): PieceAtelier | null {
  if (value === null || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const out: PieceAtelier = {};
  for (const kind of FILM_KINDS) {
    const x = v[kind];
    if (x === null) out[kind] = null;
    else if (typeof x === "string" && ID.test(x)) out[kind] = x;
  }
  if (typeof v.poster === "string" && IMAGE.test(v.poster) && !v.poster.includes("..")) out.poster = v.poster;
  return Object.keys(out).length > 0 ? out : null;
}
