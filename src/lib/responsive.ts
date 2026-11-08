/*
 * The smaller copies of the photos of the site (scripts/media-sizes.mjs makes
 * them: "cover.webp" has "cover.w640.webp" and "cover.w160.webp" when it is
 * wide enough). Given the width a photo takes on screen (`sizes`), the browser
 * downloads the lightest copy that stays sharp. Photos uploaded from /admin
 * have no copies and stay as they are; a missing copy falls back to the photo
 * itself (Img, src/components/Media.tsx).
 */

/** The same widths and margin as scripts/media-sizes.mjs. */
const SIZES = [160, 640];
const MARGIN = 1.25;

/** Common widths on screen, for `sizes`. */
export const SIZES_FOR = {
  /** A photo across the screen on phones, half of it from tablets. */
  half: "(max-width: 767px) 100vw, 50vw",
  /** The jewel of a card in a grid of 1, 2 then 3 columns (inside its margins). */
  grid3: "(max-width: 639px) 80vw, (max-width: 1023px) 40vw, 26vw",
  /** A thumbnail of about 6rem. */
  thumb: "96px",
};

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

/** The srcset of a story cover (also the portrait of most people), else none. */
export function coverSrcSet(src: string): string | undefined {
  return /^\/media\/stories\/[^/]+\/cover\.webp$/.test(src) ? srcSetOf(src, STORY_COVER_WIDTH) : undefined;
}
