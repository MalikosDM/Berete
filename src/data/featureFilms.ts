/*
 * The films shown large in their own section (Yoni, 22-23/11/2026), from scripts/mechanism-media.mjs: the film of the
 * finished Dragon Ball pendant (the piece, its trunk that opens, its Spirit Bomb that turns) at the top of its page and on
 * the home page; the cross of Malik Tillman whose centre turns ("The mechanism" of its page, and The Atelier). A piece
 * without one has no such section.
 */
import films from "./mechanisms.generated.json" with { type: "json" };
import { storyBlocks } from "./story.js";
import type { Piece } from "./types.js";

/** A film of scripts/mechanism-media.mjs: its file for computers, a lighter one for phones, its image, its size, its sound. */
export type FeatureFilmData = { video: string; mobile?: string; poster: string; width: number; height: number; audio?: boolean };

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
export function featureFilmOf(slug: string): { film: FeatureFilmData; kind: "film" | "mechanism" } | null {
  const entry = FEATURE_FILMS[slug];
  const film = entry ? featureFilm(entry.key) : null;
  return entry && film ? { film, kind: entry.kind } : null;
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
