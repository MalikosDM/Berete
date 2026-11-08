/* The links between stories, people and pieces, computed from the catalogue. */
import type { Catalogue, MediaItem, Person, Piece, PieceType, Story } from "./types.js";

export const TYPE_LABELS: Record<PieceType, string> = {
  chain: "Chain",
  pendant: "Pendant",
  ring: "Ring",
  bracelet: "Bracelet",
  watch: "Watch",
};

export function storiesOf(cat: Catalogue, personSlug: string): Story[] {
  return cat.stories.filter((s) => s.people.includes(personSlug));
}

export function piecesOf(cat: Catalogue, personSlug: string): Piece[] {
  return cat.pieces.filter((p) => p.people.includes(personSlug));
}

export function peopleOf(cat: Catalogue, piece: Piece): Person[] {
  return piece.people.map((slug) => cat.people.find((p) => p.slug === slug)).filter((p): p is Person => p !== undefined);
}

/** The players of a club page. */
export function membersOf(cat: Catalogue, club: Person): Person[] {
  if (club.kind !== "club") return [];
  return cat.people.filter((p) => p.kind === "player" && p.club === club.name);
}

/** The visual of a piece for one person: their own ring when there is one ("Deniz Undav · 26"), else the cover. */
export function pieceVisualFor(piece: Piece, person: Person | null): MediaItem {
  if (person) {
    const own = piece.gallery.find((m) => m.caption?.startsWith(person.name));
    if (own) return own;
  }
  return piece.cover;
}

/** Portrait of a person: their photo, else the cover of their first story, else their own piece. */
export function portraitOf(cat: Catalogue, person: Person): string {
  if (person.portrait) return person.portrait;
  const story = storiesOf(cat, person.slug).find((s) => s.cover !== "");
  if (story) return story.cover;
  for (const piece of piecesOf(cat, person.slug)) {
    const own = piece.gallery.find((m) => m.caption?.startsWith(person.name));
    if (own) return own.src;
  }
  return "";
}

/** Who a piece was made for, in a few words: "Kevin Schade", "VfB Stuttgart", "A private collector". */
export function madeFor(cat: Catalogue, piece: Piece): string {
  const people = peopleOf(cat, piece);
  const named = people.filter((p) => p.kind !== "club");
  if (named.length > 0) return named.map((p) => p.name).join(", ");
  if (people.length > 0) return people.map((p) => p.name).join(", ");
  if (piece.clientPublic && piece.client) return piece.client;
  return "A private collector";
}

/** Every photo or video of a piece: opening, details, handover and making. */
export function mediaOfPiece(piece: Piece): MediaItem[] {
  return [piece.cover, ...piece.gallery, ...piece.handover, ...Object.values(piece.making).filter((m): m is MediaItem => m !== undefined)];
}

/** The piece shown in each photo or video of the stories (by file), for "See the piece". */
export function pieceByMedia(cat: Catalogue): Map<string, string> {
  const map = new Map<string, string>();
  for (const piece of cat.pieces) {
    for (const m of mediaOfPiece(piece)) if (m.src && !map.has(m.src)) map.set(m.src, piece.slug);
  }
  return map;
}

/** Other pieces of the same type, the ones made for the same people first. */
export function similarPieces(cat: Catalogue, piece: Piece, count = 4): Piece[] {
  const same = cat.pieces.filter((p) => p.type === piece.type && p.slug !== piece.slug);
  const shared = (p: Piece) => p.people.some((x) => piece.people.includes(x));
  return [...same.filter(shared), ...same.filter((p) => !shared(p))].slice(0, count);
}

/** The stories in which the photos or videos of a piece appear, then the stories of its people. */
export function storiesOfPiece(cat: Catalogue, piece: Piece): Story[] {
  const files = new Set(mediaOfPiece(piece).map((m) => m.src));
  const direct = cat.stories.filter((s) => s.pieceSlug === piece.slug || s.media.some((m) => files.has(m.src)));
  const viaPeople = cat.stories.filter((s) => !direct.includes(s) && s.people.some((x) => piece.people.includes(x)));
  return [...direct, ...viaPeople];
}

export function findPiece(cat: Catalogue, slug: string): Piece | undefined {
  return cat.pieces.find((p) => p.slug === slug);
}

export function findPerson(cat: Catalogue, slug: string): Person | undefined {
  return cat.people.find((p) => p.slug === slug);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
