/*
 * The texts of the page The House (/about): the story of Yoni Berete, founder of the house, in chapters, and his three
 * quotes. The French is his own text (fr.ts); every other language translates it, chapter for chapter, paragraph for
 * paragraph (the same number of each: the page places the quotes and the photos by their position, src/data/house.ts).
 */
export type HouseTexts = {
  name: string;
  /** "Founder & Creative Director". */
  role: string;
  /** "Two worlds. One legacy. A singular vision." */
  tagline: string;
  chapters: { title: string; paragraphs: string[] }[];
  /** 01 The Identity, 02 The Philosophy, 03 The Journey. */
  quotes: { label: string; text: string }[];
  /** The last line of the story, before the signature of the house. */
  closing: string;
  /** "Made by us. Inspired by you.", as Yoni ends his story, in the words of each language (24/11/2026: no sentence left in English). */
  signature: string;
};
