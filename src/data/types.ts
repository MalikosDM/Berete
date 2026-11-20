import type { Film, FilmKind, PieceAtelier } from "./atelier.js";
import type { PieceDetailPoints } from "./details3d.js";
import type { PieceShowcase } from "./showcase.js";
import type { PieceTheme } from "./themes.js";

/*
 * The one data model of the site: stories, people (players, clubs,
 * personalities), pieces and boxes. The front, the API and the admin all use
 * these types. Default content lives in ./catalogue.ts; the database starts
 * from it and the admin edits it from there.
 */

export type MediaItem = {
  type: "image" | "video";
  src: string;
  /** First frame of a video, shown while it loads. */
  poster?: string;
  width?: number;
  height?: number;
  /** Seconds, for videos. */
  duration?: number;
  /** Whether the video has a sound track. */
  audio?: boolean;
  alt?: string;
  caption?: string;
  /** A jewel shot on black: blended into the page without a frame. */
  onBlack?: boolean;
};

/**
 * Texts written in the admin for another language, by field ("title",
 * "story"...). A field left empty uses the translation of the site
 * (src/i18n/content), else the English text.
 */
export type Translations = Partial<Record<"fr" | "es" | "de" | "nl" | "ar", Record<string, string>>>;

export type Story = {
  slug: string;
  title: string;
  /** Square image of the bubble. */
  cover: string;
  media: MediaItem[];
  /** Slugs of the people this story belongs to (players, clubs, personalities). */
  people: string[];
  /** A piece shown in the story: adds a "View the piece" button. */
  pieceSlug: string | null;
  /** An article about the story: the main button becomes "Read the Feature". */
  articleUrl: string | null;
  translations?: Translations;
};

export type PersonKind = "player" | "club" | "personality";

export type Person = {
  slug: string;
  name: string;
  kind: PersonKind;
  number: number | null;
  club: string | null;
  /** Profile photo (uploaded in the admin). Empty: the best photo of the person found in the stories, else initials. */
  portrait: string | null;
  /** Instagram username, without the @. Empty: no link. */
  instagram: string | null;
  bio: string;
  translations?: Translations;
};

export const PIECE_TYPES = ["chain", "pendant", "ring", "bracelet", "watch"] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

/** The steps of "The Making of a Masterpiece", in order. */
export const MAKING_STEPS = ["sketch", "raw", "setting", "polishing", "delivery"] as const;
export type MakingStep = (typeof MAKING_STEPS)[number];
/** Photos or videos of this piece for some steps; the others show the atelier. */
export type Making = Partial<Record<MakingStep, MediaItem>>;

export type Spec = { label: string; value: string };
/**
 * One symbol of a piece and its meaning ("The Art of Detail" of the page), with the photo of the gallery that shows it (its
 * address), if one does.
 */
export type Detail = { title: string; text: string; photo: string | null };
export type Press = { outlet: string; title: string; url: string | null; image: string | null };

export type Piece = {
  slug: string;
  title: string;
  type: PieceType;
  /** One line under the title. */
  line: string;
  /** The longer text of the piece page. */
  story: string;
  client: string | null;
  /** The client may be named on the site. */
  clientPublic: boolean;
  cover: MediaItem;
  /** Detail photos and videos, in order. */
  gallery: MediaItem[];
  /** Handover to the client: team photo, showcase... */
  handover: MediaItem[];
  specs: Spec[];
  /** The symbols of the piece, one by one ("The details"). */
  details: Detail[];
  press: Press[];
  /** Slugs of the people who wear or received it. */
  people: string[];
  /** The custom box made for it, if any. */
  boxSlug: string | null;
  featured: boolean;
  /** Provisional texts, to be checked with the client. */
  draft: boolean;
  /**
   * Shown on the site. An unpublished piece is kept (the admin can publish it again) but appears nowhere: its address
   * leads to the page of its player, else to the creations.
   */
  published: boolean;
  /** The universe of its page (src/data/themes.ts); null: the universe of the house. */
  theme: PieceTheme | null;
  /** How its opening shows the jewel: one cut-out view or a showcase of several (src/data/showcase.ts); null: by the rule. */
  showcase: PieceShowcase | null;
  /** Its atelier: the making-of and the finished piece played full screen (src/data/atelier.ts); null: its own films. */
  atelier: PieceAtelier | null;
  /** "The Art of Detail" in 3D: the points of its model tied to its details (src/data/details3d.ts); null: none placed. */
  detailPoints: PieceDetailPoints | null;
  making: Making;
  translations?: Translations;
};

export type Box = {
  slug: string;
  name: string;
  description: string;
  images: MediaItem[];
  /** The piece this box was made for, if it has a page. */
  pieceSlug: string | null;
  translations?: Translations;
};

/** The personal photos of Yoni on the page The House, by chapter (src/data/house.ts); a chapter without one shows none. */
export type HousePhotos = Record<string, MediaItem>;

export type Catalogue = {
  stories: Story[];
  people: Person[];
  pieces: Piece[];
  boxes: Box[];
  /** Sent by the API (photos uploaded in the admin); the site falls back to the photos of the folder (media.house). */
  house?: HousePhotos;
};

/* Shapes of the files written by scripts/import-media.mjs. */

export type GeneratedStory = {
  number: number;
  slug: string;
  folderTitle: string;
  cover: string;
  media: (MediaItem & { n: number })[];
};

export type FrameSet = { count: number; width: number; height: number; path: string };
export type ScrollMedia = { desktop: FrameSet; mobile: FrameSet; video: string; poster: string };

export type GeneratedMedia = {
  groups: Record<string, MediaItem[]>;
  videos: Record<string, MediaItem>;
  /** Photos made from the stories and the Boutique folder (scripts/piece-media.mjs), by key. */
  stills: Record<string, MediaItem>;
  scroll: Record<string, ScrollMedia>;
  /** The first sketch of each piece (step "The Vision" of "The Making of a Masterpiece"), by slug of the piece. */
  sketches?: Record<string, MediaItem>;
  /** A photo of each person, cropped on them, until a profile photo is uploaded (scripts/portraits.mjs), by slug. */
  portraits?: Record<string, MediaItem>;
  /** The high-resolution photos and videos of Yoni (scripts/hd-media.mjs), by folder then file ("p07", "v01"). */
  hd?: Record<string, Record<string, MediaItem>>;
  /** The personal photos of Yoni for The House, by chapter (folder "Berete - La Maison"). */
  house?: HousePhotos;
  /**
   * The photos of each person in their jersey (scripts/player-media.mjs), by slug, cropped 4:5: the first is their
   * portrait, the others go to "In Pictures" on their page.
   */
  players?: Record<string, MediaItem[]>;
  /** The films of "Enter the Atelier" (scripts/film-media.mjs), by piece then kind: its making-of, its finished piece. */
  films?: Record<string, Partial<Record<FilmKind, Film>>>;
};
