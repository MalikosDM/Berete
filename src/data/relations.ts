/* The links between stories, people and pieces, computed from the catalogue. */
import type { Catalogue, MediaItem, Person, Piece, PieceType, Story } from "./types.js";

export const TYPE_LABELS: Record<PieceType, string> = {
  chain: "Chain",
  pendant: "Pendant",
  ring: "Championship ring",
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
