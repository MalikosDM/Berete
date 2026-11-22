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
};

const OPENINGS = generated.trunks as Record<string, TrunkOpening>;

/**
 * Where the light comes out of each open box (shares of the square), looked at on its open image, and where its piece
 * floats once it has risen from it (its middle, and its size: a share of the square).
 */
const PLACES: Record<string, { light: [number, number]; float?: [number, number, number] }> = {
  "signature-trunk": { light: [0.5, 0.52] },
  sirius: { light: [0.5, 0.74], float: [0.5, 0.36, 0.4] },
  "tulips-on-tour": { light: [0.55, 0.7], float: [0.52, 0.36, 0.4] },
  "dragon-ball-trunk": { light: [0.5, 0.58], float: [0.5, 0.4, 0.42] },
  "the-hand-cube": { light: [0.5, 0.6], float: [0.5, 0.45, 0.4] },
  "dfb-pokal-2025-display": { light: [0.5, 0.52], float: [0.5, 0.31, 0.38] },
  "world-cup-display": { light: [0.5, 0.56] },
  "photo-case": { light: [0.38, 0.66] },
  "brt-coral-case": { light: [0.6, 0.64] },
  "trophy-trunk": { light: [0.5, 0.63] },
  "campione-d-italia-case": { light: [0.5, 0.66], float: [0.5, 0.36, 0.4] },
  "butterfly-trunk": { light: [0.55, 0.56], float: [0.52, 0.3, 0.4] },
  "okafor-trunk": { light: [0.5, 0.68], float: [0.5, 0.34, 0.42] },
};

export type Trunk = TrunkOpening & { light: [number, number]; float: [number, number, number] };

/** The opening of a box, if it has one. */
export function trunkOf(slug: string): Trunk | null {
  const opening = OPENINGS[slug];
  if (!opening) return null;
  const place = PLACES[slug];
  const light = place?.light ?? [0.5, 0.55];
  return { ...opening, light, float: place?.float ?? [light[0], Math.max(0.3, light[1] - 0.28), 0.42] };
}

/** One of its two images, at one width ("closed", 720, "webp" -> "/media/trunks/<box>/closed-720.<version>.webp"). */
export function trunkImage(trunk: TrunkOpening, which: "closed" | "open", width: number, ext: "avif" | "webp"): string {
  return trunk.base + "/" + which + "-" + width + "." + trunk.version + "." + ext;
}

/** The professional photos of a box, in their order, or none. */
export function trunkPhotos(slug: string): TrunkPhoto[] {
  return OPENINGS[slug]?.photos ?? [];
}
