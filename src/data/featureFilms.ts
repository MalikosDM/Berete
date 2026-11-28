/*
 * The films shown large in their own section (Yoni, 22-23/11/2026), from scripts/mechanism-media.mjs: the film of the
 * finished Dragon Ball pendant (the piece, its trunk that opens, its Spirit Bomb that turns) at the top of its page and on
 * the home page; the cross of Malik Tillman whose centre turns ("The mechanism" of its page, and The Atelier). A piece
 * without one has no such section.
 */
import films from "./mechanisms.generated.json" with { type: "json" };
import { storyBlocks } from "./story.js";
import type { Piece } from "./types.js";

/**
 * A film of scripts/mechanism-media.mjs: its file for computers, a lighter one for phones, its image, its size, its sound;
 * `start`: the second it starts at and loops back to, past an opening on black (never a black box on the page).
 */
export type FeatureFilmData = { video: string; mobile?: string; poster: string; width: number; height: number; audio?: boolean; start?: number };

/**
 * The second a film of the finished piece plays from (and loops back to) on its page, past its opening on black (27/11/2026:
 * never a dark film beside « The Vision »): the pendant of Kenan Yildiz, the jersey of Noah Okafor.
 */
// (28/11/2026: the new film of the jersey is black until 4.7 s; the film of the VfB ring opens on its trunk and the player
// until 6.5 s, that of Loïs Openda on a black trunk until 2.8 s: each plays from the piece.)
// (28/11/2026, evening: the jersey from 5.0 s, its first image the OKA up close and lit — 4.75 s was still almost black, 47/255.)
export const PLAY_FROM: Record<string, number> = {
  "kenan-yildiz-celebration-pendant": 5.7,
  "noah-okafor-jersey-pendant": 5,
  "vfb-stuttgart-dfb-pokal-2025": 6.55,
  "lois-openda-script-pendant": 3.6,
  // (28/11/2026, evening) Every first film starts on an image where the piece is seen, never on black (measured frame by frame:
  // its first image ≥ 30/255, tests/corrections2811.spec.ts).
  "angelo-stiller-as-pendant": 2.9,
  "baguette-cuban-chain": 5.1,
  "brt-flower-chain": 1.9,
  "celestial-initial-medallion": 0.7,
  "deniz-undav-l-pendant": 0.9,
  "kevin-schade-dragon-ball-pendant": 2.2,
  "michy-batshuayi-butterfly-pendant": 4.9,
  "panther-champion-pendant": 2,
  "samuel-ballet-jesus-piece": 0.3,
  "sirius": 0.4,
  "the-hand": 0.6,
  "thorns-and-roses-crucifix": 1.3,
  "tulips-on-tour-medallion": 0.3,
};

/** The film of each piece, by its key in mechanisms.generated.json; "film": the finished piece, "mechanism": how it moves. */
export const FEATURE_FILMS: Record<string, { key: string; kind: "film" | "mechanism" }> = {
  "kevin-schade-dragon-ball-pendant": { key: "dragon-ball-hero", kind: "film" },
  "malik-tillman-cross-pendant": { key: "tillman-cross-spin", kind: "mechanism" },
};

/** A film of the mechanisms by its key, if it was made. */
export function featureFilm(key: string): FeatureFilmData | null {
  const f = (films as Record<string, Partial<FeatureFilmData>>)[key];
  return f?.video && f.poster && f.width && f.height ? (f as FeatureFilmData) : null;
}

/** The film of a piece and its kind, or null. */
/** The films of the galleries that are the same film as a feature film (never shown twice on a page): none today. */
const SAME_AS: Record<string, string[]> = {};

export function featureFilmOf(slug: string): { film: FeatureFilmData; kind: "film" | "mechanism"; same: string[] } | null {
  const entry = FEATURE_FILMS[slug];
  const film = entry ? featureFilm(entry.key) : null;
  // Its start past its black opening (PLAY_FROM, 28/11/2026) when one is set for the piece.
  return entry && film ? { film: PLAY_FROM[slug] !== undefined ? { ...film, start: PLAY_FROM[slug] } : film, kind: entry.kind, same: [film.video, ...(SAME_AS[entry.key] ?? [])] } : null;
}

/**
 * The paragraphs of the story of a piece that say what its film shows, in the language of the page: those of its English
 * story that start with the given words, taken at the same place in its translated story (the paragraphs match one to one).
 */
export function storyLines(local: Piece, english: Piece | undefined, starts: string[]): string[] {
  const en = storyBlocks(english?.story ?? "").filter((b) => b.kind === "paragraph");
  const here = storyBlocks(local.story).filter((b) => b.kind === "paragraph");
  return starts.map((s) => en.findIndex((b) => b.text.startsWith(s))).filter((i) => i >= 0 && here[i]).map((i) => here[i]!.text);
}

/** The sentences of the Dragon Ball pendant on its Spirit Bomb that turns (its story, 23/11/2026). */
export const DRAGON_BALL_MOTION = ["But to us, energy was never meant", "We therefore engineered the diamond-set Spirit Bomb"];
