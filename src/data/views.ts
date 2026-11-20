/*
 * What a photo of a gallery shows ("view" of a MediaItem), chosen photo by photo when the folders of Yoni were sorted
 * (scripts/hd-media.mjs). Its words are the caption of the photo; its text for a screen reader is the title of the piece
 * and these words ("Two-Row Tennis Chain · The clasp"), made in the language of the page (src/i18n/content.ts), so it
 * follows the piece when it is renamed in the admin. Translated in src/i18n/content/<lang>.ts like any text.
 */
export const VIEWS = {
  front: "Front view",
  angle: "Three-quarter view",
  side: "In profile",
  whole: "The whole piece",
  bust: "On the bust",
  detail: "Close-up",
  setting: "The setting",
  links: "The links",
  clasp: "The clasp",
  bail: "The bail",
  mechanism: "The mechanism",
  inside: "Inside",
  light: "In the light",
  back: "The back",
  engraving: "The engraving",
  mark: "The BRT mark",
  worn: "Worn",
  hand: "In the hand",
  case: "In its case",
  film: "In motion",
} as const;

export type View = keyof typeof VIEWS;

export const isView = (v: unknown): v is View => typeof v === "string" && Object.hasOwn(VIEWS, v);

/** The text of a photo with a view: "<title> · <its words>". */
export const viewAlt = (title: string, words: string) => title + " · " + words;
