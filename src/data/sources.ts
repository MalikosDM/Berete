/*
 * The photos and videos written by scripts/import-media.mjs, as catalogue
 * items: the folders of the site, the photos made for the pieces, and the
 * files of the stories (a piece can show a story file without a copy).
 */
import generatedStories from "./stories.generated.json" with { type: "json" };
import generatedMedia from "./media.generated.json" with { type: "json" };
import type { GeneratedMedia, GeneratedStory, MediaItem } from "./types.js";

export const media = generatedMedia as unknown as GeneratedMedia;
export const storyFiles = (generatedStories as unknown as { stories: GeneratedStory[] }).stories;

/** Photos of one folder of the import ("pieces/the-hand", "atelier"...), with their texts. */
export function group(key: string, texts: (Partial<MediaItem> | undefined)[] = [], onBlack = true): MediaItem[] {
  return (media.groups[key] ?? []).map((m, i) => ({ onBlack, ...m, ...(texts[i] ?? {}) }));
}

/** A photo made by scripts/piece-media.mjs ("pieces/<slug>/cover"), or null when it is missing. */
export function still(key: string, texts: Partial<MediaItem> = {}): MediaItem | null {
  const m = media.stills?.[key];
  return m ? { ...m, ...texts } : null;
}

/** The first sketch of a piece (scripts/import-media.mjs, folder "Berete - Croquis"), or null when there is none. */
export function sketch(slug: string, texts: Partial<MediaItem> = {}): MediaItem | null {
  const m = media.sketches?.[slug];
  return m ? { ...m, ...texts } : null;
}

/** File number `n` of a story ("kevin-schade", 21), or null when it is missing. */
export function st(slug: string, n: number, texts: Partial<MediaItem> = {}): MediaItem | null {
  const found = storyFiles.find((s) => s.slug === slug)?.media.find((m) => m.n === n);
  if (!found) return null;
  const { n: _n, ...item } = found;
  return { ...item, ...texts };
}

/** The items that exist, in order. */
export function list(...items: (MediaItem | null | undefined)[]): MediaItem[] {
  return items.filter((m): m is MediaItem => m !== null && m !== undefined && m.src !== "");
}
