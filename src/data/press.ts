/*
 * The press (Yoni, 23/11/2026): the articles about the house, in his order, on the page In the Spotlight (/press), in the
 * band of the home page and in the capsule of the piece they tell (the VfB ring, the Inter ring). Their headlines stay in
 * the language of the article. An article without its address waits (BILD, first, until Yoni sends its link): it is shown
 * nowhere. Each link was opened on 23/11/2026.
 */
import { INTER, VFB } from "./pieces.js";

export type PressArticle = {
  outlet: string;
  /** The headline, as the newspaper wrote it. */
  title: string;
  /** Its day of publication (YYYY-MM-DD). */
  date: string;
  url: string | null;
  /** Its language (the headline is read in it). */
  lang: "de" | "en";
  /** The pieces it tells. */
  pieces: string[];
};

export const PRESS: PressArticle[] = [
  // Its place is kept, first; Yoni sends its link.
  { outlet: "BILD", title: "", date: "2025-09-24", url: null, lang: "de", pieces: [VFB] },
  // Second (Yoni, 23/11/2026): its headline, day and link are awaited.
  { outlet: "sport.de", title: "", date: "", url: null, lang: "de", pieces: [VFB] },
  {
    outlet: "Goal.com Deutschland",
    title: "Schon vor dem Pokalsieg in Auftrag gegeben! Spieler des VfB Stuttgart beschenken sich mit 30.000-Euro-Ringen selbst",
    date: "2025-09-23",
    url: "https://www.goal.com/de/listen/schon-vor-dem-pokalsieg-in-auftrag-gegeben-spieler-des-vfb-stuttgart-beschenken-sich-mit-30-000-euro-ringen-selbst/blt0b22e7272e3216d5",
    lang: "de",
    pieces: [VFB],
  },
  {
    outlet: "Stuttgarter Nachrichten",
    title: "Knapp 10.000 Euro pro Stück: Klunker aus Gold und Diamanten",
    date: "2025-09-24",
    url: "https://www.stuttgarter-nachrichten.de/inhalt.knapp-10000-euro-pro-stueck-klunker-aus-gold-und-diamanten-vfb-stars-belohnen-sich-fuer-dfb-pokalsieg.5567564a-2323-4440-84ae-ff5988d47a1c.html",
    lang: "de",
    pieces: [VFB],
  },
  {
    outlet: "Daily Mail",
    title: "Marko Arnautovic, Marcus Thuram and Hakan Calhanoglu commission diamond rings for their Inter Milan teammates",
    date: "2024-05-29",
    url: "https://www.dailymail.co.uk/sport/football/article-13472573/Marko-Arnautovic-Marcus-Thuram-Hakan-Calhanoglu-commission-diamond-rings-Inter-Milan-teammates-clubs-20th-Scudetto-title.html",
    lang: "en",
    pieces: [INTER],
  },
];

export type PublishedArticle = PressArticle & { url: string };

/** The articles shown: those with their address, in the order of Yoni. */
export const publishedPress = (): PublishedArticle[] => PRESS.filter((a): a is PublishedArticle => Boolean(a.url && a.title));

/** The articles of one piece. */
export const pressOfPiece = (slug: string): PublishedArticle[] => publishedPress().filter((a) => a.pieces.includes(slug));
