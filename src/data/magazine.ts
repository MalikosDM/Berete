/*
 * The page of a piece as a magazine (Yoni, 25/11/2026). After the film of the finished piece and its story, the photos go
 * from the whole to the detail, like a funnel:
 *   1. four photos of the whole piece: its main photo, then its front, its profile, its back when it has them;
 *   2. then the photos of its details, each small, with its paragraph beside it, at most five;
 *   3. every other photo behind "See more".
 * A paragraph beside a detail is always a sentence the house already wrote for the piece (its story, its details), never a
 * new one: each one goes with the photo that shows it best (looked at photo by photo). A sentence moved beside its photo
 * leaves the story at the top, so that it is read once. The words follow the language of the page: a sentence is found by
 * its place in its paragraph; when a translation cuts the paragraph into a different number of sentences, the whole
 * paragraph goes beside the photo.
 *
 * The order of the photos is proposed here (the order of the files and the fingerprints of the views); Yoni changes it in the
 * admin (« Photos de « Sous tous les angles », dans l'ordre ») and his order comes first (adminOrdered).
 */
import { fileBase } from "./pageMedia.js";
import { storyBlocks, type StoryBlock } from "./story.js";
import type { MediaItem, Piece } from "./types.js";
import { YONI } from "./yoni2711.js";

/** A sentence of the house: a paragraph of the story (counted among the paragraphs, from 0), or some of its sentences; or a detail. */
export type TextRef = { story: number; sentences?: number[] } | { detail: number };

/** A photo of a detail (its file in the folder of the piece: "p09") and the words beside it. */
export type Explain = {
  /** Its file in the folder of the piece ("p09"), or in the folder of another piece ("baguette-cuban-chain/p06": its chain). */
  photo: string;
  texts: TextRef[];
  /** The strongest moment of the section (the mechanism of the Inter ring): its photo larger. */
  big?: boolean;
};

/** At most five photos with their paragraph: no endless page (25/11/2026). */
export const MAX_BLOCKS = 5;

/** The photos of the details and their sentences, piece by piece (each photo looked at, each sentence taken as written). */
export const EXPLAIN: Record<string, Explain[]> = {
  // The details of Yoni's texts (26-27/11/2026, src/data/yoni2711.ts), each beside the close-up that shows it (looked at photo by
  // photo). The Dragon Ball pendant and the pendant of Kenan Yildiz have none: their vision stays whole beside their film.
  // The stars and diamonds around the crest, the stripes, the tricolour and its inscriptions, TIKUS and the 9 of Marcus Thuram's
  // ring, the Serie A emblem and its 20, the crown worn as a pendant beside the opened ring and its trophy (the strongest).
  "campione-d-italia-2023-2024": [
    { photo: "p52", texts: [{ detail: 0 }] },
    { photo: "p53", texts: [{ detail: 1 }] },
    { photo: "p12", texts: [{ detail: 2 }] },
    { photo: "p50", texts: [{ detail: 3 }] },
    { photo: "p15", texts: [{ detail: 4 }] },
    { photo: "p45", texts: [{ detail: 5 }], big: true },
  ],
  // The celebration, the Swiss emblem and the Nigerian flag, the stripes, OKA 4, the crown, the settings of the arms and sleeves,
  // the Safi Link, the pendant on its bust as a trophy.
  "noah-okafor-jersey-pendant": [
    { photo: "p16", texts: [{ detail: 0 }] },
    { photo: "p17", texts: [{ detail: 1 }] },
    { photo: "p15", texts: [{ detail: 2 }] },
    { photo: "p09", texts: [{ detail: 3 }] },
    { photo: "p04", texts: [{ detail: 4 }] },
    { photo: "p11", texts: [{ detail: 5 }] },
    { photo: "p03", texts: [{ detail: 6 }] },
    { photo: "p02", texts: [{ detail: 7 }] },
  ],
  // The camouflage on the O, the two maps, the football, the settings of the O and the K, the links of its two-tone Cuban.
  "noah-okafor-oka-pendant": [
    { photo: "p06", texts: [{ detail: 0 }] },
    { photo: "p04", texts: [{ detail: 1 }] },
    { photo: "p03", texts: [{ detail: 2 }] },
    { photo: "p09", texts: [{ detail: 3 }] },
    { photo: "baguette-cuban-chain/p06", texts: [{ detail: 4 }] },
  ],
  // The O of white gold, the N of rose gold, the two golds together, the double row of its tennis chain.
  "noah-okafor-octagon-pendant": [
    { photo: "p03", texts: [{ detail: 0 }] },
    { photo: "p04", texts: [{ detail: 1 }] },
    { photo: "p06", texts: [{ detail: 2 }] },
    { photo: "two-row-tennis-chain/p03", texts: [{ detail: 3 }] },
  ],
  // The panther, jaws open, claws polished black, on its belt; the story of the night stays at the top.
  "panther-champion-pendant": [{ photo: "p05", texts: [{ story: 0 }] }],
  // The back of the cross and its BRT mark.
  "malik-tillman-cross-pendant": [{ photo: "p03", texts: [{ story: 0, sentences: [1] }] }],
  // The jersey of a player's ring (his name and number), the crest in its shield of red stones, the cup under the crown.
  "vfb-stuttgart-dfb-pokal-2025": [
    { photo: "p11", texts: [{ detail: 0 }] },
    { photo: "p20", texts: [{ detail: 1 }] },
    { photo: "p14", texts: [{ detail: 2 }] },
  ],
  // The mosaic of the T, the Float Setting at its edges, the Serpent Bezel Setting of the 9, the ruby eye, the T and the 9.
  "marcus-thuram-t-serpent-pendant": [
    { photo: "p14", texts: [{ detail: 0 }] },
    { photo: "p16", texts: [{ detail: 1 }] },
    { photo: "p06", texts: [{ detail: 2 }] },
    { photo: "p02", texts: [{ detail: 3 }] },
    { photo: "p12", texts: [{ detail: 4 }] },
  ],
  // The back and its BRT mark in rose gold, the bail on its tennis chain.
  "angelo-stiller-as-pendant": [
    { photo: "p01", texts: [{ story: 0, sentences: [1] }] },
    { photo: "p04", texts: [{ story: 0, sentences: [2] }] },
  ],
  // The back engraved around the BRT mark.
  "samuel-ballet-jesus-piece": [{ photo: "06", texts: [{ story: 0, sentences: [1] }] }],
  // The polished letters among the roses and their marquise diamonds.
  "tanguy-nianzou-fam-medallion": [{ photo: "06", texts: [{ story: 0, sentences: [1] }] }],
  // The back: the BRT mark and the word Faith.
  "lois-openda-script-pendant": [{ photo: "p12", texts: [{ story: 0, sentences: [1] }] }],
  // The figure in coloured stones among the tulips, the wheel in baguettes raised over the diamonds, the engraved back.
  "tulips-on-tour-medallion": [
    { photo: "p16", texts: [{ story: 1, sentences: [1] }] },
    { photo: "p12", texts: [{ story: 2 }] },
    { photo: "p06", texts: [{ story: 3, sentences: [0] }] },
  ],
  // The engraved back and its BRT mark.
  "michy-batshuayi-butterfly-pendant": [{ photo: "p69", texts: [{ story: 0, sentences: [1] }] }],
  // The clasp, a flower of marquise diamonds around the BRT mark; the story of the chain stays at the top.
  "the-safi-link": [{ photo: "clasp", texts: [{ story: 1 }] }],
  // Chain and plate in their trunk, on its red lining.
  sirius: [{ photo: "p04", texts: [{ story: 0, sentences: [3] }] }],
  // The back carved with stars and the BRT mark.
  "thorns-and-roses-crucifix": [{ photo: "p06", texts: [{ story: 0, sentences: [1] }] }],
  // The back: arms carved with stars, the BRT mark at their crossing.
  "baguette-cross-pendant": [{ photo: "p03", texts: [{ story: 0, sentences: [1] }] }],
  // The carved back and its BRT mark in white gold.
  "crown-of-thorns-jesus-piece": [{ photo: "p17", texts: [{ story: 0, sentences: [2] }] }],
  // The bail crowned with a marquise flower, over the border of marquise diamonds.
  "celestial-initial-medallion": [{ photo: "p06", texts: [{ story: 0, sentences: [1] }] }],
  // The back carved with stars, the BRT mark at its centre.
  "jesus-piece-red-flowers": [{ photo: "p05", texts: [{ story: 0, sentences: [1] }] }],
  // A flower of round diamonds and its marquise leaves on the twisted links, the clasp around the BRT mark.
  "brt-flower-chain": [
    { photo: "p15", texts: [{ story: 0, sentences: [1] }] },
    { photo: "p11", texts: [{ story: 0, sentences: [2] }] },
  ],
  // The domed clasp, BRT and the diamond of the house in rose gold.
  "baguette-cuban-chain": [{ photo: "p10", texts: [{ story: 0, sentences: [1] }] }],
  // The flat clasp set around the BRT mark.
  "rose-iced-cuban-chain": [{ photo: "p03", texts: [{ story: 0, sentences: [1] }] }],
  // The domed clasp, BRT raised in polished gold.
  "wide-rose-iced-cuban-chain": [{ photo: "p03", texts: [{ story: 0, sentences: [1] }] }],
  // The domed clasp, BRT and the diamond of the house in rose gold.
  "white-iced-cuban-chain": [{ photo: "p01", texts: [{ story: 0, sentences: [1] }] }],
  // The BRT mark inside the band.
  "oval-eternity-band": [{ photo: "p04", texts: [{ story: 0, sentences: [1] }] }],
  // A fleur-de-lis under First World Cup Game, the green enamel along the shank; the top of the ring stays at the top.
  "bosnia-and-herzegovina-world-cup-2026-ring": [
    { photo: "b04462", texts: [{ story: 1, sentences: [0] }] },
    { photo: "b04470", texts: [{ story: 1, sentences: [1] }] },
  ],
};

/**
 * The photos of the whole piece chosen by eye, where the views written for the photos would mislead (a close-up written as a
 * profile): only these, in this order.
 */
export const OVERVIEW: Record<string, string[]> = {
  // « Every Angle » of Yoni's pages (26-27/11/2026): four photos chosen first, the whole piece from the front always first (even
  // when the opening shows it too), then See More. The jersey pendant of Noah Okafor has none (its page goes from its vision to
  // its details): its other photos come after its details.
  "kevin-schade-dragon-ball-pendant": ["p18", "p20", "p09", "p06"],
  "vfb-stuttgart-dfb-pokal-2025": ["p17", "p16", "p19", "p22"],
  "campione-d-italia-2023-2024": ["p55", "p01", "p06", "p41"],
  "kenan-yildiz-celebration-pendant": ["p07", "p06", "p02", "p03"],
  "noah-okafor-oka-pendant": ["p05", "p08", "p07", "p14"],
  "noah-okafor-jersey-pendant": [],
  "noah-okafor-octagon-pendant": ["p09", "p01", "p10", "p05"],
  // Its front, three-quarters for the relief, its back, the macro of its scales and its ruby.
  "marcus-thuram-t-serpent-pendant": ["p08", "p17", "p04", "p01"],
};

/** The sentences of a paragraph (as the browser cuts them in the language of the page). */
export function sentencesOf(text: string, lang = "en"): string[] {
  const Segmenter = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: "sentence" }) => { segment(t: string): Iterable<{ segment: string }> } }).Segmenter;
  const parts = Segmenter ? [...new Segmenter(lang, { granularity: "sentence" }).segment(text)].map((s) => s.segment) : text.split(/(?<=[.!?؟])\s+/);
  return parts.map((s) => s.trim()).filter(Boolean);
}

/** The paragraphs of a story (its titles and closing quote left aside). */
const paragraphsOf = (story: string) => storyBlocks(story).filter((b) => b.kind === "paragraph").map((b) => b.text);

/** The views of a photo that show the piece whole (src/data/views.ts). */
const WHOLE = new Set(["front", "whole", "angle", "side", "back", "bust"]);

export type MagazineBlock = { item: MediaItem; texts: { title?: string; text: string }[]; big?: boolean };

export type Magazine = {
  /** The four photos of the whole piece. */
  overview: MediaItem[];
  /** The photos of its details, each with its words. */
  blocks: MagazineBlock[];
  /** Every other photo and film, behind "See more". */
  rest: MediaItem[];
  /** The story at the top, without the sentences moved beside their photo. */
  story: StoryBlock[];
  /** The details already told beside their photo (src/data/types.ts Detail, by their place). */
  usedDetails: Set<number>;
};

/**
 * Whether Yoni ordered the photos of the piece himself in the admin: its list in the base is not the one of the catalogue.
 * His order then comes first, as he gave it.
 */
export function adminOrdered(own: Pick<Piece, "gallery"> | undefined, catalogue: Pick<Piece, "gallery"> | undefined): boolean {
  if (!own || !catalogue) return false;
  const a = own.gallery.map((m) => m.src).join("|");
  const b = catalogue.gallery.map((m) => m.src).join("|");
  return a !== b;
}

/**
 * The page of the piece as a magazine: its story at the top, then its photos from the whole to the detail. `items` are its
 * photos and films in the order of the page (each once: src/data/pageMedia.ts); `english` its texts in English (to know how
 * the house cut them into sentences); `ordered`: the order of the admin, kept as it is.
 */
export function magazineOf(
  piece: Pick<Piece, "slug" | "story" | "details">,
  english: Pick<Piece, "story" | "details"> | undefined,
  items: MediaItem[],
  { lang = "en", ordered = false, sameViews = [] as string[][], extra = [] as MediaItem[] } = {},
): Magazine {
  const paragraphs = paragraphsOf(piece.story);
  const source = english ? paragraphsOf(english.story) : paragraphs;
  // Its photos by file; `extra`: photos it may still show beside a detail or first in Every Angle (the photos of its opening, a
  // photo of its chain in the folder of the chain), by file and by "folder/file".
  const folderFile = (m: MediaItem) => (m.src.split("/").slice(-2, -1)[0] ?? "") + "/" + fileBase(m.src);
  const byFile = new Map<string, MediaItem>([...extra.flatMap((m) => [[fileBase(m.src), m], [folderFile(m), m]] as [string, MediaItem][]), ...items.map((m) => [fileBase(m.src), m] as [string, MediaItem])]);
  // The sentences taken, paragraph by paragraph ("all": the whole paragraph).
  const taken = new Map<number, Set<number> | "all">();
  const usedDetails = new Set<number>();
  const blocks: MagazineBlock[] = [];
  // At most five sentences of its story beside photos; every detail of Yoni beside its photo.
  const wanted = (EXPLAIN[piece.slug] ?? []).filter((e) => byFile.has(e.photo)).slice(0, Math.max(MAX_BLOCKS, piece.details.length));
  // The story at the top always keeps a paragraph of its own: never all of it beside the photos.
  const storyRefs = wanted.flatMap((e) => e.texts).filter((r): r is { story: number; sentences?: number[] } => "story" in r);
  const whole = new Set(storyRefs.filter((r) => !r.sentences).map((r) => r.story));
  const keepFirst = paragraphs.length > 0 && paragraphs.every((_, i) => whole.has(i));
  for (const e of wanted) {
    const texts: { title?: string; text: string }[] = [];
    for (const r of e.texts) {
      if ("detail" in r) {
        const d = piece.details[r.detail];
        if (!d || usedDetails.has(r.detail)) continue;
        usedDetails.add(r.detail);
        texts.push({ title: d.title, text: d.text });
        continue;
      }
      const p = paragraphs[r.story];
      if (p === undefined || (keepFirst && r.story === 0)) continue;
      if (taken.get(r.story) === "all") continue;
      const here = sentencesOf(p, lang);
      const there = sentencesOf(source[r.story] ?? p, "en");
      if (r.sentences && here.length === there.length && r.sentences.every((s) => s < here.length)) {
        const set = (taken.get(r.story) as Set<number> | undefined) ?? new Set<number>();
        const fresh = r.sentences.filter((s) => !set.has(s));
        if (fresh.length === 0) continue;
        fresh.forEach((s) => set.add(s));
        taken.set(r.story, set.size === here.length ? "all" : set);
        texts.push({ text: fresh.map((s) => here[s]).join(" ") });
      } else {
        // A translation cut otherwise: the whole paragraph, once (its sentences already given elsewhere are not repeated) —
        // unless the story at the top would be left without any paragraph: then the sentence stays in the story.
        const left = paragraphs.filter((_, i) => i !== r.story && taken.get(i) !== "all").length;
        if (left === 0) continue;
        taken.set(r.story, "all");
        texts.push({ text: p });
      }
    }
    if (texts.length > 0) blocks.push({ item: byFile.get(e.photo)!, texts, ...(e.big ? { big: true } : {}) });
  }
  // A paragraph given whole beside one photo, and some of its sentences beside another: the whole wins, the other goes.
  for (const b of blocks) b.texts = b.texts.filter((t, i, all) => all.findIndex((x) => x.text === t.text) === i);

  // The story at the top: what was not moved beside a photo; a title left without its paragraphs goes with them.
  let n = -1;
  const top: StoryBlock[] = [];
  for (const b of storyBlocks(piece.story)) {
    if (b.kind !== "paragraph") {
      top.push(b);
      continue;
    }
    n += 1;
    const t = taken.get(n);
    if (t === "all") continue;
    if (t) {
      const left = sentencesOf(b.text, lang).filter((_, i) => !t.has(i));
      if (left.length > 0) top.push({ kind: "paragraph", text: left.join(" ") });
      continue;
    }
    top.push(b);
  }
  const story = top.filter((b, i) => b.kind !== "title" || (top[i + 1] !== undefined && top[i + 1]!.kind === "paragraph"));

  // The photos of the whole: in the order of the admin when Yoni gave one; else its main photo, then its front, its profile,
  // its back, then the next photos of the whole piece (never two photos of the same view).
  const inBlocks = new Set(blocks.map((b) => b.item.src));
  const pool = items.filter((m) => !inBlocks.has(m.src));
  const photos = pool.filter((m) => m.type !== "video");
  const viewOf = new Map<string, number>();
  sameViews.forEach((names, i) => names.forEach((name) => viewOf.set(name, i)));
  const overview: MediaItem[] = [];
  const seenViews = new Set<number>();
  const add = (m: MediaItem | undefined) => {
    if (!m || overview.includes(m) || overview.length >= 4) return;
    const v = viewOf.get(fileBase(m.src));
    if (v !== undefined && seenViews.has(v)) return;
    if (v !== undefined) seenViews.add(v);
    overview.push(m);
  };
  if (OVERVIEW[piece.slug] && YONI[piece.slug]) {
    // Yoni's choice (26-27/11/2026) wins over every order: his four photos, from its photos or from its opening.
    for (const name of OVERVIEW[piece.slug]!) {
      const m = pool.find((x) => fileBase(x.src) === name) ?? (inBlocks.has(byFile.get(name)?.src ?? "") ? undefined : byFile.get(name));
      if (m && !overview.includes(m)) overview.push(m);
    }
  } else if (ordered) {
    overview.push(...pool.slice(0, 4));
  } else if (OVERVIEW[piece.slug]) {
    for (const name of OVERVIEW[piece.slug]!) add(pool.find((m) => fileBase(m.src) === name));
  } else {
    const onBlack = (m: MediaItem) => m.onBlack !== false;
    add(photos.find((m) => onBlack(m) && (!m.view || WHOLE.has(m.view))) ?? photos[0]);
    for (const kinds of [["front"], ["side", "angle"], ["back"]]) add(photos.find((m) => onBlack(m) && !overview.includes(m) && m.view !== undefined && kinds.includes(m.view)));
    for (const m of photos) if (!m.view || WHOLE.has(m.view)) add(m);
    for (const m of pool) add(m);
    // Photos all of one view (their fingerprints alike): the others still fill the row, rather than one photo alone.
    for (const m of [...photos, ...pool]) if (overview.length < 4 && !overview.includes(m)) overview.push(m);
  }
  const rest = pool.filter((m) => !overview.includes(m));
  return { overview, blocks, rest, story, usedDetails };
}
