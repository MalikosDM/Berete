/* The collections: one per type of jewel, at /creations/<slug>. */
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
    hero: "michy-batshuayi-butterfly-chain",
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

/** A collection is shown on the home page from this number of pieces. */
export const MIN_PIECES = 2;

export function collectionBySlug(slug: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}

export function collectionOf(type: PieceType): Collection {
  return COLLECTIONS.find((c) => c.type === type) ?? COLLECTIONS[0]!;
}

export function piecesOfType(cat: Catalogue, type: PieceType): Piece[] {
  return cat.pieces.filter((p) => p.type === type);
}

/** The collections with at least `min` pieces, in their order. */
export function visibleCollections(cat: Catalogue, min = MIN_PIECES): { collection: Collection; pieces: Piece[]; hero: Piece }[] {
  return COLLECTIONS.map((collection) => {
    const pieces = piecesOfType(cat, collection.type);
    const hero = pieces.find((p) => p.slug === collection.hero) ?? pieces[0];
    return { collection, pieces, hero };
  }).filter((c): c is { collection: Collection; pieces: Piece[]; hero: Piece } => c.hero !== undefined && c.pieces.length >= min);
}
