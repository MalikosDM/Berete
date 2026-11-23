/* The links between stories, people and pieces, computed from the catalogue. */
import { extrasOf, media } from "./sources.js";
import type { Box, Catalogue, MediaItem, Person, Piece, PieceType, Story } from "./types.js";

export const TYPE_LABELS: Record<PieceType, string> = {
  chain: "Chain",
  pendant: "Pendant",
  ring: "Ring",
  bracelet: "Bracelet",
  watch: "Watch",
};

/**
 * The catalogue the visitors see: the published pieces only. An unpublished piece (removed from the catalogue, or a
 * draft waiting for its name) is kept in the admin but appears nowhere: not in the lists, the similar pieces, the
 * stories ("Enter the World"), the boxes, the search engines. A person whose pieces are all unpublished leaves the circle
 * of the house (their page leads to /players); people who never had a piece (stories only) stay. An unpublished box
 * (removed by Yoni) appears nowhere either: not on the page of the trunks, nor on the page of its piece.
 */
export function publicCatalogue(cat: Catalogue): Catalogue {
  const hidden = new Set(cat.pieces.filter((p) => p.published === false).map((p) => p.slug));
  const hiddenBoxes = new Set(cat.boxes.filter((b) => b.published === false).map((b) => b.slug));
  if (hidden.size === 0 && hiddenBoxes.size === 0) return cat;
  const pieces = cat.pieces.filter((p) => !hidden.has(p.slug)).map((p) => (p.boxSlug && hiddenBoxes.has(p.boxSlug) ? { ...p, boxSlug: null } : p));
  const gone = new Set(cat.people.filter((person) => cat.pieces.some((p) => p.people.includes(person.slug)) && !pieces.some((p) => p.people.includes(person.slug))).map((p) => p.slug));
  return {
    ...cat,
    pieces: pieces.map((p) => (p.people.some((x) => gone.has(x)) ? { ...p, people: p.people.filter((x) => !gone.has(x)) } : p)),
    people: cat.people.filter((p) => !gone.has(p.slug)),
    stories: cat.stories.map((s) => (s.pieceSlug && hidden.has(s.pieceSlug)) || s.people.some((x) => gone.has(x)) ? { ...s, pieceSlug: s.pieceSlug && hidden.has(s.pieceSlug) ? null : s.pieceSlug, people: s.people.filter((x) => !gone.has(x)) } : s),
    boxes: cat.boxes.filter((b) => !hiddenBoxes.has(b.slug)).map((b) => (b.pieceSlug && hidden.has(b.pieceSlug) ? { ...b, pieceSlug: null } : b)),
  };
}

/**
 * Where the old address of an unpublished piece leads: the page of its first player still in the circle, else the
 * creations (also for an unknown address). In the language of the address (prefix "/fr" or "").
 */
export function removedPieceTarget(full: Catalogue, slug: string): string | null {
  const piece = full.pieces.find((p) => p.slug === slug);
  if (!piece || piece.published !== false) return null;
  const shown = publicCatalogue(full);
  const person = piece.people.map((x) => shown.people.find((p) => p.slug === x)).find((p) => p !== undefined && p.kind !== "club" && shown.pieces.some((q) => q.people.includes(p.slug)));
  return person ? "/players/" + person.slug : "/creations";
}

/** Whether a person left the circle (all their pieces unpublished): their page leads to /players. */
export function leftTheCircle(full: Catalogue, slug: string): boolean {
  return full.people.some((p) => p.slug === slug) && !publicCatalogue(full).people.some((p) => p.slug === slug);
}

export function storiesOf(cat: Catalogue, personSlug: string): Story[] {
  return cat.stories.filter((s) => s.people.includes(personSlug));
}

export function piecesOf(cat: Catalogue, personSlug: string): Piece[] {
  return cat.pieces.filter((p) => p.people.includes(personSlug));
}

/**
 * The trunks of a person (Yoni, 23/11/2026): those of their pieces, and a trunk tied to them before its piece is known
 * (BOX_PEOPLE of src/data/pieces.ts: the trunk of Malik Tillman).
 */
export function boxesOf(cat: Catalogue, personSlug: string, boxPeople: Record<string, string[]> = {}): Box[] {
  const pieces = piecesOf(cat, personSlug);
  const slugs = new Set(pieces.map((p) => p.boxSlug).filter((b): b is string => Boolean(b)));
  return cat.boxes.filter((b) => slugs.has(b.slug) || (b.pieceSlug !== null && pieces.some((p) => p.slug === b.pieceSlug)) || (boxPeople[b.slug] ?? []).includes(personSlug));
}

/**
 * Where a click on a person leads (Yoni, 23/11/2026): always to their own page, /players/<slug>: their portrait, who they
 * are, all their pieces, their photos and moments; from there the visitor enters the world of a piece.
 */
export function personHref(_cat: Catalogue, person: Person): string {
  return "/players/" + person.slug;
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

/**
 * Portrait of a person: their profile photo (admin; by default their photo in their jersey, scripts/player-media.mjs),
 * else that photo in their jersey, else the best photo of them found in the stories, cropped on them
 * (scripts/piece-media.mjs, PORTRAITS); "" when there is none: the site shows their initials. Never a photo of a jewel.
 */
export function portraitOf(_cat: Catalogue, person: Person): string {
  if (person.portrait) return person.portrait;
  return media.players?.[person.slug]?.[0]?.src ?? media.stills?.["portraits/" + person.slug]?.src ?? "";
}

/** The other photos of a person in their jersey ("In Pictures" on their page): all of them but the portrait shown. */
export function photosOf(cat: Catalogue, person: Person): MediaItem[] {
  const shown = portraitOf(cat, person);
  // Then the photos sent apart (Keita at the boutique of the house, 23/11/2026: scripts/extra-media.mjs, "players/<slug>").
  return [...(media.players?.[person.slug] ?? []), ...extrasOf("players/" + person.slug)].filter((m) => m.src !== shown);
}

/** The Instagram profile of a person, or null. */
export function instagramOf(person: Person): string | null {
  return person.instagram ? "https://www.instagram.com/" + encodeURIComponent(person.instagram) + "/" : null;
}

/**
 * Who a piece was made for, in a few words: "Kevin Schade", "VfB Stuttgart", "A private collector". A client named on
 * the site comes first (the Inter ring was made for the club, its players come after).
 */
export function madeFor(cat: Catalogue, piece: Piece, privateCollector = "A private collector", join: (names: string[]) => string = (names) => names.join(", ")): string {
  if (piece.clientPublic && piece.client) return piece.client;
  const people = peopleOf(cat, piece);
  const named = people.filter((p) => p.kind !== "club");
  if (named.length > 0) return join(named.map((p) => p.name));
  if (people.length > 0) return join(people.map((p) => p.name));
  return privateCollector;
}

/** Every photo or video of a piece: opening, details, handover and making. */
export function mediaOfPiece(piece: Piece): MediaItem[] {
  return [piece.cover, ...piece.gallery, ...piece.handover, ...Object.values(piece.making).filter((m): m is MediaItem => m !== undefined)];
}

/** The piece shown in each photo or video of the stories (by file), for "Enter the World". */
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
  // Arabic letters do not stand alone as initials: the first one only.
  if (/[\u0600-\u06ff]/.test(name)) return name.trim().charAt(0);
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
