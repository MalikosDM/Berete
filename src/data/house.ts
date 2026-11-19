/*
 * The page The House (/about): the story of Yoni Berete in chapters (texts: src/i18n/house/<language>.ts) and the places
 * of his personal photos. Every chapter, the three quotes and the portrait have a place for a photo, shown only when
 * there is one (never an empty frame). A photo is added either from the admin (tab "La Maison") or by dropping a file
 * named after its place ("portrait.jpg", "citation-1.jpg", "chapitre-03.jpg"...) in the folder "Berete - La Maison" of
 * the Desktop, then npm run import-media.
 */
import { media } from "./sources.js";
import type { Catalogue, MediaItem } from "./types.js";

/** The 12 chapters of the story, in order (the texts give them in the same order). */
export const HOUSE_CHAPTERS = 12;

/** After which chapter (0 = the first) each quote stands: 01 The Identity, 02 The Philosophy, 03 The Journey. */
export const HOUSE_QUOTES_AFTER = [1, 6, 10] as const;

/** The places of the photos: the portrait at the top, each quote, each chapter. */
export const housePhotoKey = {
  portrait: "portrait",
  quote: (i: number) => "citation-" + (i + 1),
  chapter: (i: number) => "chapitre-" + String(i + 1).padStart(2, "0"),
};

/** Every place, in the order of the page, with its name in the admin (French). */
export const HOUSE_PHOTO_PLACES: { key: string; name: string }[] = (() => {
  const places = [{ key: housePhotoKey.portrait, name: "Portrait (en haut de la page)" }];
  for (let i = 0; i < HOUSE_CHAPTERS; i++) {
    places.push({ key: housePhotoKey.chapter(i), name: "Chapitre " + (i + 1) });
    const q = HOUSE_QUOTES_AFTER.indexOf(i as (typeof HOUSE_QUOTES_AFTER)[number]);
    if (q >= 0) places.push({ key: housePhotoKey.quote(q), name: "Citation " + (q + 1) + (q === 0 ? " · L'Identité" : q === 1 ? " · La Philosophie" : " · Le Parcours") });
  }
  return places;
})();

/** The photo of a place: the one sent from the admin, else the file of the folder, else none. */
export function housePhoto(cat: Catalogue, key: string): MediaItem | null {
  const own = cat.house?.[key];
  if (own?.src) return own;
  return media.house?.[key] ?? null;
}
