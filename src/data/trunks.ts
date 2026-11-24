/*
 * The Signature Trunks that open and close again (Yoni, 21 and 22/11/2026): each box first closed; at a click it opens in
 * the film of its opening, its piece, cut out of its photo, rises from it and floats above it; at "Close" its piece goes
 * back into it and it closes in the film of its closing (src/components/TrunkReveal.tsx). Its images, films and
 * professional photos: scripts/trunk-media.mjs, src/data/trunks.generated.json (every name carries its version).
 */
import generated from "./trunks.generated.json" with { type: "json" };

export type TrunkPhoto = { src: string; width: number; height: number; file: string };

export type TrunkOpening = {
  /** "/media/trunks/<box>": its images "<base>/closed-<w>.<version>" and "<base>/open-<w>.<version>", AVIF and WebP, square. */
  base: string;
  /** Its staging: "v3" (23/11/2026: a black marble base, a golden light from above, its real piece inside), "v2" (older). */
  set?: string;
  /** The fingerprint of its files, in every name. */
  version: string;
  widths: number[];
  size: number;
  /** The film of its opening (square, silent), from the closed image to the open one, and of its closing, back. */
  opening: string;
  closing: string;
  duration: number;
  closingDuration: number;
  /** Its professional photos (its gallery, the page of its piece). */
  photos?: TrunkPhoto[];
  /**
   * One staging for every trunk (24/11/2026): its marble base measured on its closed image, and the square kept of its
   * images and films (shares of the original square: its corner x, y and its side), scripts/trunk-media.mjs.
   */
  marble?: { left: number; right: number; top: number; width: number; center: number };
  frame?: { x: number; y: number; size: number };
};

const OPENINGS = generated.trunks as Record<string, TrunkOpening>;

/**
 * Where the light comes out of each open box (shares of the square), looked at on its open image, and where its piece
 * floats once it has risen from it (its middle, and its size: a share of the square).
 */
const PLACES: Record<string, { light: [number, number]; float?: [number, number, number] }> = {
  // The v3 images (23/11/2026), measured on each open image: the light comes from the piece lying in the box (the place it
  // rises from), then it floats in front of the open lid, above the button "Close" and away from "Watch again" (top right).
  // The Dragon Ball trunk opens like a book: its pendant hangs in its right half; it comes out in front of its hook.
  "dragon-ball-trunk": { light: [0.62, 0.55], float: [0.6, 0.47, 0.46] },
  // The cube: The Hand stands lit inside it, under its raised top.
  "the-hand-cube": { light: [0.5, 0.53], float: [0.5, 0.38, 0.34] },
  sirius: { light: [0.49, 0.55], float: [0.5, 0.32, 0.38] },
  "tulips-on-tour": { light: [0.53, 0.55], float: [0.5, 0.32, 0.36] },
  // The two displays: the ring on its cushion, under the raised glass; it rises a little above it.
  "dfb-pokal-2025-display": { light: [0.49, 0.42], float: [0.5, 0.28, 0.27] },
  "world-cup-display": { light: [0.5, 0.36], float: [0.5, 0.27, 0.26] },
  "brt-coral-case": { light: [0.5, 0.57] },
  // Its new images (24/11/2026, the same trunk as the Butterfly, the photo in its lid): the octagon pendant lies in the middle
  // of its compartments, among the tennis chains; it rises from there.
  "okafor-trunk": { light: [0.5, 0.57], float: [0.5, 0.33, 0.36] },
  "butterfly-trunk": { light: [0.46, 0.58], float: [0.5, 0.33, 0.38] },
  // Still in their v2 images (off the page of the trunks until their v3 files arrive).
  "signature-trunk": { light: [0.5, 0.52] },
  "photo-case": { light: [0.38, 0.66] },
  "trophy-trunk": { light: [0.5, 0.63] },
  "campione-d-italia-case": { light: [0.5, 0.66], float: [0.5, 0.36, 0.4] },
};

/**
 * The staging of the page of the trunks (Yoni, 23/11/2026): only the boxes made again in it are shown there, so that the
 * page has one staging; a box still in an older one waits for its files (it stays on the page of its piece and its person).
 */
export const TRUNK_SET = "v3";

export type Trunk = TrunkOpening & { light: [number, number]; float: [number, number, number] };

/** The opening of a box, if it has one. */
export function trunkOf(slug: string): Trunk | null {
  const opening = OPENINGS[slug];
  if (!opening) return null;
  const place = PLACES[slug];
  const light = place?.light ?? [0.5, 0.55];
  const float = place?.float ?? [light[0], Math.max(0.3, light[1] - 0.28), 0.42];
  // The places are measured on the original images: they follow the frame of the staging (the piece rises from the same
  // place in the box as before).
  const f = opening.frame ?? { x: 0, y: 0, size: 1 };
  const at = (x: number, y: number): [number, number] => [(x - f.x) / f.size, (y - f.y) / f.size];
  const [fx, fy] = at(float[0], float[1]);
  const size = float[2] / f.size;
  // A box shown larger by the staging (the two displays, the cube): its piece still floats whole inside the square.
  return { ...opening, light: at(light[0], light[1]), float: [fx, Math.max(fy, size / 2 + 0.04), size] };
}

/** Whether a box is on the page of the trunks: it opens in its film, in the staging of the page. */
export const onTrunksPage = (slug: string): boolean => OPENINGS[slug]?.set === TRUNK_SET;

/** One of its two images, at one width ("closed", 720, "webp" -> "/media/trunks/<box>/closed-720.<version>.webp"). */
export function trunkImage(trunk: TrunkOpening, which: "closed" | "open", width: number, ext: "avif" | "webp"): string {
  return trunk.base + "/" + which + "-" + width + "." + trunk.version + "." + ext;
}

/** The professional photos of a box, in their order, or none. */
export function trunkPhotos(slug: string): TrunkPhoto[] {
  return OPENINGS[slug]?.photos ?? [];
}
