/*
 * The page The House (/about): the story of Yoni Berete in chapters (texts: src/i18n/house/<language>.ts) and the places
 * of his personal photos. Every chapter, the three quotes and the portrait have a place for a photo; a quote without its
 * photo has none (never an empty frame), a chapter without his own photo shows an image of the house (23/11/2026). A photo is added either from the admin (tab "La Maison") or by dropping a file
 * named after its place ("portrait.jpg", "citation-1.jpg", "chapitre-03.jpg"...) in the folder "Berete - La Maison" of
 * the external disk, then npm run import-media.
 */
import { extra, media } from "./sources.js";
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

/** An image of the house, decorative (its text is the chapter beside it). */
const plain = (m: MediaItem | null | undefined): MediaItem | null => (m?.src ? { ...m, alt: "", caption: undefined } : null);

/**
 * One image per chapter (Yoni, 23/11/2026): his own photos where they fit the chapter (sent on WhatsApp,
 * scripts/extra-media.mjs), and for his early years an image of the house (his hand drawing, the atelier).
 */
const own = (name: string): MediaItem | null => plain(extra("house", name, { onBlack: false }));
const CHAPTER_IMAGES: (() => MediaItem | null)[] = [
  () => plain(media.sketches?.["campione-d-italia-2023-2024"]),
  () => plain(media.groups["atelier"]?.[0]),
  () => plain(media.groups["atelier"]?.[1]),
  // His own photos (Yoni, 23/11/2026): the loupe on a stone, the tray of diamonds at his desk, at Inter with the Campione
  // case, his head in his hands among four Inter rings. Not the photo of an evening with a person not known.
  () => own("loupe"),
  () => own("desk-tray"),
  () => own("desk-pointing"),
  () => own("desk-scale"),
  () => own("desk-smile"),
  () => own("inter-rings"),
  () => own("inter-case-open"),
  () => own("desk-smile-wide"),
  () => own("inter-ring"),
];

/** The photo of a chapter: his own (the admin, the folder), else the image of the house chosen for it. */
export function houseChapterPhoto(cat: Catalogue, i: number): MediaItem | null {
  return housePhoto(cat, housePhotoKey.chapter(i)) ?? CHAPTER_IMAGES[i]?.() ?? null;
}
