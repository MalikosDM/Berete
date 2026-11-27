/*
 * The photos and films of Yoni's contents of 26-27/11/2026 (scripts/yoni-2711-media.mjs → yoni2711.generated.json): the final
 * film of the Inter ring, the hand-over of the rings to the players (an edit and the whole film), the photos of that day, the
 * reveal of Noah Okafor's jersey pendant in Dubai. A part not made yet (its files not here) is missing from the file: the page simply shows less.
 */
import type { FeatureFilmData } from "./featureFilms.js";
import media from "./yoni2711.generated.json" with { type: "json" };
import type { MediaItem } from "./types.js";

/** A film as the script writes it: its photo shape, its phone version. */
export type YoniFilm = MediaItem & { mobile?: string };

export type YoniMedia = {
  interFilm?: YoniFilm;
  interHandoverFull?: YoniFilm;
  interHandoverEdit?: YoniFilm;
  interPhotos?: { yoniWithPlayers?: MediaItem | null; photo2?: MediaItem | null; firstFour?: MediaItem[]; rest?: MediaItem[] };
  okaforReveal?: { film?: YoniFilm; portrait?: MediaItem; group?: MediaItem; fitting?: MediaItem };
};

export const YONI_MEDIA: YoniMedia = media as YoniMedia;

/** A film of the script as the film frame of the site reads it. */
export function filmData(f: YoniFilm | undefined): FeatureFilmData | null {
  if (!f?.src || !f.poster || !f.width || !f.height) return null;
  return { video: f.src, mobile: f.mobile, poster: f.poster, width: f.width, height: f.height, audio: f.audio };
}
