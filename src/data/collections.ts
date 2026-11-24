/* The collections: one per type of jewel, at /creations/<slug>; and their categories (inside the pendants and the chains). */
import type { Catalogue, Piece, PieceType } from "./types.js";

export type Collection = {
  type: PieceType;
  /** Address: /creations/<slug>. */
  slug: string;
  name: string;
  intro: string;
  /** The piece whose photo opens the collection. */
  hero: string;
};

export const COLLECTIONS: Collection[] = [
  {
    type: "pendant",
    slug: "pendants",
    name: "Pendants",
    intro: "Initials, emblems, celebrations: each pendant tells one story, sculpted in volume and set stone by stone.",
    hero: "kevin-schade-dragon-ball-pendant",
  },
  {
    type: "chain",
    slug: "chains",
    name: "Chains",
    intro: "Links drawn one by one, from butterflies to infinity knots, made to be worn alone or with a pendant.",
    hero: "butterfly-chain",
  },
  {
    type: "ring",
    slug: "rings",
    name: "Rings",
    intro: "Championship rings for a whole squad, and signet rings made for one hand.",
    hero: "vfb-stuttgart-dfb-pokal-2025",
  },
  {
    type: "bracelet",
    slug: "bracelets",
    name: "Bracelets",
    intro: "Bracelets made to measure, link by link.",
    hero: "",
  },
  {
    type: "watch",
    slug: "watches",
    name: "Watches",
    intro: "Watches set with diamonds from the case to the bracelet.",
    hero: "marcus-thuram-skeleton-watch",
  },
];

/**
 * A sub-category: some pieces of a collection gathered by what they show, at /creations/<collection>/<slug>, shown inside
 * its collection (a tab on the page of the collection, a filter of the page Créations, under its collection in the menu).
 * Jesus Pieces (asked by Yoni, 21/11/2026; inside the pendants since 22/11/2026): every Jesus piece of the house, the face of
 * Christ or Christ on the cross. He says there are five; four are on the site (the fifth is to be found in his photos:
 * CLAUDE.md). Until 22/11/2026 it was a theme at /creations/jesus-pieces: that address leads here.
 */
export type SubCategory = Omit<Collection, "type"> & { parent: PieceType; pieces: string[] };

export const SUBCATEGORIES: SubCategory[] = [
  // The categories of the pendants (Yoni, 24/11/2026): one presses Pendants and sees the categories first, then the pieces.
  // A pendant that fits none stays in "All pendants" only. The list is Yoni's to confirm (CLAUDE.md).
  {
    parent: "pendant",
    slug: "celebration",
    name: "Celebration Pendants",
    intro: "The goal celebrations of the players, sculpted in diamonds: a gesture on the pitch, kept for good.",
    hero: "kenan-yildiz-celebration-pendant",
    pieces: ["kenan-yildiz-celebration-pendant", "noah-okafor-jersey-pendant", "kevin-schade-dragon-ball-pendant", "panther-champion-pendant"],
  },
  {
    parent: "pendant",
    slug: "cross",
    name: "Cross Pendants",
    intro: "Crosses drawn by the house, framed in baguettes or set stone by stone.",
    hero: "malik-tillman-cross-pendant",
    pieces: ["malik-tillman-cross-pendant", "baguette-cross-pendant", "thorns-and-roses-crucifix"],
  },
  {
    parent: "pendant",
    slug: "name",
    name: "Name Pendants",
    intro: "A name, or the initials of a name, drawn in gold and set with diamonds.",
    hero: "noah-okafor-oka-pendant",
    pieces: ["noah-okafor-oka-pendant", "noah-okafor-octagon-pendant", "angelo-stiller-as-pendant", "jamie-leweling-jl-pendant", "malik-tillman-tm-pendant", "lois-openda-script-pendant", "ampersand-initials-pendant", "tanguy-nianzou-fam-medallion"],
  },
  {
    parent: "pendant",
    slug: "letter",
    name: "Letter Pendants",
    intro: "One letter, and the whole story of the one who wears it.",
    hero: "marcus-thuram-t-serpent-pendant",
    pieces: ["marcus-thuram-t-serpent-pendant", "marcus-thuram-thorned-t-pendant", "deniz-undav-l-pendant", "celestial-initial-medallion"],
  },
  {
    parent: "pendant",
    slug: "jesus-pieces",
    name: "Jesus Pieces",
    // The words of Yoni (23/11/2026).
    intro: "From the streets of New York to Biggie making it legendary, the Jesus piece became one of the most recognizable symbols in the culture. We're not changing that story just adding our part to it.",
    hero: "crown-of-thorns-jesus-piece",
    pieces: ["crown-of-thorns-jesus-piece", "samuel-ballet-jesus-piece", "jesus-piece-red-flowers", "thorns-and-roses-crucifix"],
  },
  // The categories of the chains (proposed to Yoni, 24/11/2026).
  {
    parent: "chain",
    slug: "signature",
    name: "Signature Chains",
    intro: "The chains of the house, drawn by Berete: the Safi Link and BRT Flowers.",
    hero: "the-safi-link",
    pieces: ["the-safi-link", "brt-flower-chain", "sirius"],
  },
  {
    parent: "chain",
    slug: "cuban",
    name: "Cuban Chains",
    intro: "The Cuban link, iced with diamonds, from one width to another.",
    hero: "rose-iced-cuban-chain",
    pieces: ["rose-iced-cuban-chain", "wide-rose-iced-cuban-chain", "baguette-cuban-chain", "white-iced-cuban-chain", "two-tone-iced-cuban-chain"],
  },
  {
    parent: "chain",
    slug: "tennis",
    name: "Tennis Chains",
    intro: "A line of diamonds, stone after stone.",
    hero: "two-row-tennis-chain",
    pieces: ["two-row-tennis-chain"],
  },
  {
    parent: "chain",
    slug: "infinity",
    name: "Infinity Chains",
    intro: "Links drawn in the shape of infinity.",
    hero: "infinity-link-chain",
    pieces: ["infinity-link-chain", "cross-infinity-chain", "pear-link-chain"],
  },
];

/** The pieces shown first in their collection (Yoni, 24/11/2026: the Safi Link, the second signature of the house, first among the chains). */
export const FIRST_IN_COLLECTION = ["the-safi-link", "brt-flower-chain"];

export type AnyCollection = Collection | SubCategory;
export const isSub = (c: AnyCollection): c is SubCategory => "parent" in c;

/** The published pieces of a collection or a sub-category (only the pieces of its collection), in their order. */
export function piecesOfCollection(cat: Catalogue, c: AnyCollection): Piece[] {
  if (!isSub(c)) return piecesOfType(cat, c.type);
  return c.pieces.map((slug) => cat.pieces.find((p) => p.slug === slug)).filter((p): p is Piece => p !== undefined && p.type === c.parent);
}

/** The sub-categories of a type of jewel that have pieces on the site. */
export function subcategoriesOf(cat: Catalogue, type: PieceType): SubCategory[] {
  return SUBCATEGORIES.filter((s) => s.parent === type && piecesOfCollection(cat, s).length > 0);
}

/** The address of a collection (/creations/pendants) or of a sub-category (/creations/pendants/jesus-pieces). */
export function collectionPath(c: AnyCollection): string {
  return isSub(c) ? "/creations/" + collectionOf(c.parent).slug + "/" + c.slug : "/creations/" + c.slug;
}

/** A sub-category from its address, under its collection. */
export function subcategoryBySlug(collectionSlug: string, slug: string): SubCategory | undefined {
  const parent = collectionBySlug(collectionSlug);
  return parent ? SUBCATEGORIES.find((s) => s.parent === parent.type && s.slug === slug) : undefined;
}

/** A sub-category under its old address /creations/<slug> (Jesus Pieces until 22/11/2026). */
export function subcategoryByOldSlug(slug: string): SubCategory | undefined {
  return SUBCATEGORIES.find((s) => s.slug === slug);
}

/** A collection is shown on the home page from this number of pieces. */
export const MIN_PIECES = 2;

export function collectionBySlug(slug: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}

export function collectionOf(type: PieceType): Collection {
  return COLLECTIONS.find((c) => c.type === type) ?? COLLECTIONS[0]!;
}

export function piecesOfType(cat: Catalogue, type: PieceType): Piece[] {
  const rank = (p: Piece) => {
    const i = FIRST_IN_COLLECTION.indexOf(p.slug);
    return i < 0 ? FIRST_IN_COLLECTION.length : i;
  };
  return cat.pieces.filter((p) => p.type === type).sort((a, b) => rank(a) - rank(b));
}

/** The collections with at least `min` pieces, in their order. */
export function visibleCollections(cat: Catalogue, min = MIN_PIECES): { collection: Collection; pieces: Piece[]; hero: Piece }[] {
  return COLLECTIONS.map((collection) => {
    const pieces = piecesOfType(cat, collection.type);
    const hero = pieces.find((p) => p.slug === collection.hero) ?? pieces[0];
    return { collection, pieces, hero };
  }).filter((c): c is { collection: Collection; pieces: Piece[]; hero: Piece } => c.hero !== undefined && c.pieces.length >= min);
}
