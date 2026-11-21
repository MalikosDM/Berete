/*
 * The opening of the Signature Trunks (feedback of Yoni, 21/11/2026): each trunk first closed, then, at a click, the film of
 * its opening (scripts/trunk-media.mjs, src/data/trunks.generated.json), and it stays open with the button to create one's
 * own (src/components/TrunkReveal.tsx). The Dragon Ball trunk has no film (rights not confirmed): it keeps its photos.
 */
import generated from "./trunks.generated.json" with { type: "json" };

export type TrunkFilm = {
  /** "/media/trunks/<box>": its images "<base>/closed-<w>" and "<base>/open-<w>", AVIF and WebP. */
  base: string;
  widths: number[];
  /** The film of its opening (square, silent), from the closed image to the open one. */
  video: string;
  size: number;
  duration: number;
  /** Its two images as photos of the page of the trunks (closed, open), when they replace its old photos. */
  photos?: { src: string; width: number; height: number }[];
};

const FILMS = generated.trunks as Record<string, TrunkFilm>;

/**
 * Where the light comes out of each open trunk (shares of the square), looked at on its open image: the golden glow
 * gathers there, and the button to create one's own appears there.
 */
const LIGHT: Record<string, [number, number]> = {
  "signature-trunk": [0.5, 0.48],
  // The trunk with the horned mask (images of 21/11/2026): its red suede, beside the open door.
  sirius: [0.51, 0.53],
  "tulips-on-tour": [0.53, 0.57],
  "butterfly-trunk": [0.5, 0.6],
  "okafor-trunk": [0.55, 0.6],
  "campione-d-italia-case": [0.5, 0.6],
  "nz-travel-case": [0.5, 0.62],
};

export type Trunk = TrunkFilm & { light: [number, number] };

/** The opening of a box, if it has one. */
export function trunkOf(slug: string): Trunk | null {
  const film = FILMS[slug];
  return film ? { ...film, light: LIGHT[slug] ?? [0.5, 0.55] } : null;
}

/** The images of a trunk as its photos (closed, open), or none. */
export function trunkPhotos(slug: string): { src: string; width: number; height: number }[] {
  return FILMS[slug]?.photos ?? [];
}
