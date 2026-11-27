/*
 * "Enter the Atelier": the films of a piece, its making-of (its fabrication, filmed at the bench) and its finished piece
 * ("The Final Reveal"), prepared by scripts/import-media.mjs (section "films", list in scripts/film-media.mjs) and played
 * full screen by src/components/AtelierRoom.tsx, from the page of the piece and from the page The Atelier.
 *
 * The admin chooses per piece (PieceAtelier, "L'atelier" in the editor): the film of each kind, any prepared film (by
 * default its own) or none, and the image shown before it plays. A piece without a making-of has no atelier: its page
 * shows no passage and the page The Atelier leaves it out.
 */
import { SUBCATEGORIES } from "./collections.js";
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
/**
 * The film of the finished piece that opens the page of a piece (src/components/PieceFilm.tsx): its "reveal" (the admin may
 * choose another, or none), and its image (the one chosen for that film).
 */
export function resolveReveal(slug: string, atelier: PieceAtelier | null | undefined): { film: Film; poster: string } | null {
  const chosen = atelier?.reveal;
  if (chosen === null) return null;
  const film = chosen ? filmOf(chosen) : (FILMS[slug]?.reveal ?? null);
  if (!film) return null;
  return { film, poster: film.posters[film.poster] || film.posters[0] || "" };
}

export function resolveAtelier(slug: string, atelier: PieceAtelier | null | undefined): ResolvedAtelier | null {
  const pick = (kind: FilmKind): Film | null => {
    const chosen = atelier?.[kind];
    if (chosen === null) return null;
    return chosen ? filmOf(chosen) : (FILMS[slug]?.[kind] ?? null);
  };
  const making = pick("making");
  if (!making) return null;
  // The same film for both (a piece whose only film is the edit of its finished piece, shown in its atelier): played once.
  const reveal = pick("reveal");
  return { making, reveal: reveal && reveal.source !== making.source ? reveal : null, poster: atelier?.poster || making.posters[making.poster] || making.posters[0] || "" };
}

/**
 * "Up next" in the atelier of The Atelier (27/11/2026, as on YouTube): the other making-of films after the one watched, the
 * closest first: a piece of the same person (the same player or club; his own pieces before a piece of a whole team), then
 * of the same category (Jesus Pieces, Cross…), then of the same collection (pendants, chains, rings…), then the others; in
 * the order of the page within each.
 */
export function upNextOrder<T extends { slug: string; type: string; people: string[] }>(current: T, films: T[]): T[] {
  const people = new Set(current.people);
  const groups = SUBCATEGORIES.filter((s) => s.pieces.includes(current.slug));
  const rank = (p: T) => {
    if (p.people.some((x) => people.has(x))) return 0;
    if (groups.some((g) => g.pieces.includes(p.slug))) return 1;
    if (p.type === current.type) return 2;
    return 3;
  };
  return films
    .filter((p) => p.slug !== current.slug)
    .map((p, i) => {
      const r = rank(p);
      return { p, i, r, size: r === 0 ? p.people.length : 0 };
    })
    .sort((a, b) => a.r - b.r || a.size - b.size || a.i - b.i)
    .map((x) => x.p);
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
