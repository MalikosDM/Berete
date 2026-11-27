/*
 * The texts beside the pieces of the home page (Yoni, 26/11/2026: "this jewel, on the right or on the left, and the descriptive
 * writing beside it, instead of empty space here and there"; "I will work on all the texts and send them"). Each block of the
 * home page that shows one piece (the house, The Mechanism, the two championship rings) sets the piece on one side and, on the
 * other, a short text: by default the presentation sentence of the piece on its own page (its line, translated with the
 * catalogue), or the text written in the admin (« Textes de l'accueil »), language by language (empty = the line of the piece).
 *
 * Kept on the server (table ServerSetting, key HOME_TEXTS_KEY, a JSON { <block>: { <lang>: text } }: in the backups, kept
 * through updates); read by the page from /api/home-texts (server/routes/home-texts.ts). The version without its server
 * (Vercel) shows the lines of the pieces.
 */
import { SPECIAL_PROJECT } from "./pieces.js";

export const HOME_LANGS = ["en", "fr", "es", "de", "nl", "ar"] as const;
export type HomeLang = (typeof HOME_LANGS)[number];
/** The texts written in the admin: block → language → text (a missing language: the line of the piece). */
export type HomeTexts = Record<string, Partial<Record<HomeLang, string>>>;

/** The piece of the house (the Butterfly pendant on its chain, on the black bust) and the piece of The Mechanism. */
export const HOUSE_PIECE = "michy-batshuayi-butterfly-pendant";
export const MECHANISM_PIECE = "kevin-schade-dragon-ball-pendant";

export type HomeBlock = {
  /** Its name in the base and on the page (data-home-text). */
  id: string;
  /** The piece it shows (its line is the text by default). */
  piece: string;
  /** Its name in the admin (French, as the admin). */
  label: string;
};

/** The blocks of the home page with one piece, in their order on the page. */
export const HOME_BLOCKS: HomeBlock[] = [
  { id: "house", piece: HOUSE_PIECE, label: "La Maison (en haut de la page)" },
  { id: "mechanism", piece: MECHANISM_PIECE, label: "Le mécanisme" },
  ...SPECIAL_PROJECT.map((r, i) => ({ id: "ring-" + r.slug, piece: r.slug, label: "Grande commande " + (i + 1) })),
];

export const HOME_TEXTS_KEY = "home.texts";
/** A text beside a piece stays short (one or two sentences). */
export const HOME_TEXT_MAX = 400;

/** What the base or the admin gives, kept only where it is valid: known blocks and languages, trimmed, not empty. */
export function cleanHomeTexts(value: unknown): HomeTexts {
  const out: HomeTexts = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) return out;
  for (const block of HOME_BLOCKS) {
    const given = (value as Record<string, unknown>)[block.id];
    if (given === null || typeof given !== "object" || Array.isArray(given)) continue;
    const texts: Partial<Record<HomeLang, string>> = {};
    for (const lang of HOME_LANGS) {
      const text = (given as Record<string, unknown>)[lang];
      if (typeof text !== "string") continue;
      const clean = text.replace(/\s+/g, " ").trim().slice(0, HOME_TEXT_MAX);
      if (clean) texts[lang] = clean;
    }
    if (Object.keys(texts).length > 0) out[block.id] = texts;
  }
  return out;
}
