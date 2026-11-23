/*
 * The photos and videos written by scripts/import-media.mjs, as catalogue
 * items: the folders of the site, the photos made for the pieces, and the
 * files of the stories (a piece can show a story file without a copy).
 */
import extras from "./extra.generated.json" with { type: "json" };
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

/**
 * A high-resolution photo or video sent by Yoni (scripts/hd-media.mjs): the folder of the site and the file ("p07",
 * "v01"), or null when it is missing. Shot on black: blended into the page, unless `texts` says otherwise.
 */
/**
 * A photo sent apart by Yoni (scripts/extra-media.mjs, src/data/extra.generated.json): the studio image of a piece, the
 * photos of the Bosnia ring. Null when it was not made.
 */
export function extra(slug: string, name: string, texts: Partial<MediaItem> = {}): MediaItem | null {
  const m = (extras as Record<string, Record<string, { src: string; width: number; height: number }>>)[slug]?.[name];
  return m ? { type: "image", onBlack: true, ...m, ...texts } : null;
}

export function yoni(dir: string, file: string, texts: Partial<MediaItem> = {}): MediaItem | null {
  // "p6" and "p06" name the same file.
  const key = file.replace(/^(\d\d-)?([pv])(\d+)$/, (_all, pre: string | undefined, kind: string, n: string) => (pre ?? "") + kind + n.padStart(2, "0"));
  const m = media.hd?.[dir]?.[key];
  return m ? { onBlack: true, ...m, ...texts } : null;
}

/** The gallery of a folder of hd (scripts/hd-media.mjs): its files in their order, with what each shows; [] when none. */
export function hdGallery(dir: string): { file: string; view?: string }[] {
  return media.galleries?.[dir] ?? [];
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
