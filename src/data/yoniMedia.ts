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
  /** The film of the AngeL Pendant (Deniz Undav), whole, with its music. */
  angelFilm?: YoniFilm;
  /** Pieces worn: Deniz Undav with the AngeL Pendant; the JL pendant on the 14 mm Cuban chain (caption « JL + 14 mm Cuban »). */
  worn?: { angelUndav?: MediaItem; jlCuban?: MediaItem };
  /** The films of the finished pieces of 28/11/2026, whole, with their music: the Jesus Piece of Samuel Ballet, the cross of Malik Tillman, the jersey of Noah Okafor. */
  balletFilm?: YoniFilm;
  tillmanFilm?: YoniFilm;
  jerseyFilm?: YoniFilm;
  /** The centre of Malik Tillman's cross spinning: a silent loop (no audio track), square, 720 px, one copy (no `mobile`). */
  tillmanSpin?: YoniFilm;
  /** Stills of the film of the Jesus Piece of Samuel Ballet (it has no studio photo), each with what it shows. */
  balletStills?: YoniStill[];
};

/** What a still shows: the piece from the front, in three quarters, its crown, its face, the claws of its crown, crown and face together, or another view (See More). */
export type StillKind = "front" | "threequarter" | "crown" | "face" | "claws" | "crownface" | "other";
export type YoniStill = MediaItem & { kind: StillKind };

export const YONI_MEDIA: YoniMedia = media as YoniMedia;

/** A film of the script as the film frame of the site reads it. */
export function filmData(f: YoniFilm | undefined, start?: number): FeatureFilmData | null {
  if (!f?.src || !f.poster || !f.width || !f.height) return null;
  return { video: f.src, mobile: f.mobile, poster: f.poster, width: f.width, height: f.height, audio: f.audio, start };
}

/** The first film of a page when it is one of Yoni's films (« The Vision Behind the Creation »), by the address of the piece. */
export const YONI_FILMS: Record<string, () => YoniFilm | undefined> = {
  "campione-d-italia-2023-2024": () => YONI_MEDIA.interFilm,
  "deniz-undav-l-pendant": () => YONI_MEDIA.angelFilm,
  "samuel-ballet-jesus-piece": () => YONI_MEDIA.balletFilm,
  "malik-tillman-cross-pendant": () => YONI_MEDIA.tillmanFilm,
  "noah-okafor-jersey-pendant": () => YONI_MEDIA.jerseyFilm,
};
