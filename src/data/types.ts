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
  /** An article about the story: the main button becomes "Read the article". */
  articleUrl: string | null;
};

export type PersonKind = "player" | "club" | "personality";

export type Person = {
  slug: string;
  name: string;
  kind: PersonKind;
  number: number | null;
  club: string | null;
  /** Portrait photo. Empty: the cover of the person's first story is used. */
  portrait: string | null;
  bio: string;
};

export const PIECE_TYPES = ["chain", "pendant", "ring", "bracelet", "watch"] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

export type Spec = { label: string; value: string };
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
  press: Press[];
  /** Slugs of the people who wear or received it. */
  people: string[];
  /** The custom box made for it, if any. */
  boxSlug: string | null;
  featured: boolean;
};

export type Box = {
  slug: string;
  name: string;
  description: string;
  images: MediaItem[];
  /** The piece this box was made for, if it has a page. */
  pieceSlug: string | null;
};

export type Catalogue = {
  stories: Story[];
  people: Person[];
  pieces: Piece[];
  boxes: Box[];
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
  scroll: Record<string, ScrollMedia>;
};
