/*
 * The smaller copies of the photos of the site (scripts/media-sizes.mjs makes
 * them: "cover.webp" has "cover.w640.webp" and "cover.w160.webp" when it is
 * wide enough). Given the width a photo takes on screen (`sizes`), the browser
 * downloads the lightest copy that stays sharp. Photos uploaded from /admin
 * have no copies and stay as they are; a missing copy falls back to the photo
 * itself (Img, src/components/Media.tsx).
 */
import { media } from "@/data/sources";

/** The same widths and margin as scripts/media-sizes.mjs. */
const SIZES = [160, 640, 1080];
const MARGIN = 1.25;

/** Common widths on screen, for `sizes`. */
export const SIZES_FOR = {
  /** A photo across the screen on phones, half of it from tablets. */
  half: "(max-width: 767px) 100vw, 50vw",
  /** The jewel of a card in a grid of 1, 2 then 3 columns (inside its margins). */
  grid3: "(max-width: 639px) 80vw, (max-width: 1023px) 40vw, 26vw",
  /** The jewel of a card of the dense grid of the creations: 2, 3, 4 then 6 columns. */
  grid6: "(max-width: 639px) 46vw, (max-width: 1023px) 31vw, (max-width: 1279px) 23vw, 15vw",
  /** A thumbnail of about 6rem. */
  thumb: "96px",
};

/**
 * The `sizes` of a photo that fills a frame of ratio `frame` (width / height, "cover"): a photo wider than its frame is drawn
 * wider than the frame (its sides cut), so the browser must take a copy as wide as the photo drawn, not as the frame
 * (24/11/2026: a landscape photo in a frame of 4:5 was drawn from too small a copy).
 */
export function coverSizes(sizes: string, width: number | undefined, height: number | undefined, frame: number): string {
  if (!width || !height) return sizes;
  const k = width / height / frame;
  if (k <= 1.02) return sizes;
  const f = Math.round(k * 100) / 100;
  return sizes
    .split(",")
    .map((part) => {
      const m = /^(\s*(?:\([^)]*\)\s+)?)(.+?)\s*$/.exec(part);
      return m ? m[1] + "calc(" + m[2] + " * " + f + ")" : part;
    })
    .join(",");
}

function sized(src: string, width: number): string {
  return src.replace(/\.webp$/, ".w" + width + ".webp");
}

/**
 * The srcset of a photo of public/media, when it has smaller copies. `width`
 * is the photo's own width (unknown: no copies are offered).
 */
export function srcSetOf(src: string, width: number | undefined): string | undefined {
  if (!width || !src.startsWith("/media/") || src.includes("/frames-") || !src.endsWith(".webp")) return undefined;
  const copies = SIZES.filter((w) => width >= w * MARGIN);
  if (copies.length === 0) return undefined;
  return [...copies.map((w) => sized(src, w) + " " + w + "w"), src + " " + width + "w"].join(", ");
}

/** The width of a story cover (scripts/import-media.mjs makes them 400 px wide). */
const STORY_COVER_WIDTH = 400;

/** The widths of the portraits of the people (photos in their jersey, crops of the stories), by address. */
const PORTRAIT_WIDTHS = new Map<string, number | undefined>([
  ...Object.values(media.players ?? {})
    .flat()
    .map((m): [string, number | undefined] => [m.src, m.width]),
  ...Object.entries(media.stills ?? {})
    .filter(([key]) => key.startsWith("portraits/"))
    .map(([, m]): [string, number | undefined] => [m.src, m.width]),
]);

/** The srcset of a story cover or of the portrait of a person, else none. */
export function coverSrcSet(src: string): string | undefined {
  if (/^\/media\/stories\/[^/]+\/cover\.webp$/.test(src)) return srcSetOf(src, STORY_COVER_WIDTH);
  return srcSetOf(src, PORTRAIT_WIDTHS.get(src));
}
