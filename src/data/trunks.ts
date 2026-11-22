/*
 * The opening of the Signature Trunks (Yoni, 21 and 22/11/2026): each box first closed, then, at a click, it opens, in the
 * film of its opening (made by Yoni) or from one real photo to another, a light coming out of it; then its piece, cut out
 * of its photo, rises from it and stays floating above it (src/components/TrunkReveal.tsx). Its images, films and
 * professional photos: scripts/trunk-media.mjs, src/data/trunks.generated.json.
 */
import generated from "./trunks.generated.json" with { type: "json" };

export type TrunkPhoto = { src: string; width: number; height: number; file: string };

export type TrunkOpening = {
  /** "/media/trunks/<box>": its images "<base>/closed-<w>" and "<base>/open-<w>", AVIF and WebP, square. */
  base: string;
  widths: number[];
  size: number;
  /** The film of its opening (square, silent), from the closed image to the open one. None: it opens from its photos. */
  video?: string;
  duration?: number;
  /** Its professional photos (the page of the trunks, the page of its piece). */
  photos?: TrunkPhoto[];
};

const OPENINGS = generated.trunks as Record<string, TrunkOpening>;

/**
 * Where the light comes out of each open box (shares of the square), looked at on its open image, and where its piece
 * floats once it has risen from it (its middle, and its size: a share of the square).
 */
const PLACES: Record<string, { light: [number, number]; float?: [number, number, number] }> = {
  "signature-trunk": { light: [0.5, 0.45] },
  sirius: { light: [0.5, 0.62], float: [0.5, 0.33, 0.42] },
  "tulips-on-tour": { light: [0.5, 0.6], float: [0.5, 0.31, 0.42] },
  "dragon-ball-trunk": { light: [0.56, 0.5], float: [0.5, 0.35, 0.46] },
  "the-hand-cube": { light: [0.5, 0.62], float: [0.5, 0.33, 0.46] },
  "dfb-pokal-2025-display": { light: [0.53, 0.47], float: [0.5, 0.29, 0.4] },
  "world-cup-display": { light: [0.5, 0.45] },
  "photo-case": { light: [0.45, 0.6] },
  "brt-coral-case": { light: [0.5, 0.62] },
  "trophy-trunk": { light: [0.5, 0.6] },
  "campione-d-italia-case": { light: [0.48, 0.72], float: [0.52, 0.36, 0.42] },
  "butterfly-trunk": { light: [0.33, 0.64], float: [0.45, 0.31, 0.42] },
  "okafor-trunk": { light: [0.5, 0.6], float: [0.5, 0.32, 0.42] },
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

/** The professional photos of a box, in their order, or none. */
export function trunkPhotos(slug: string): TrunkPhoto[] {
  return OPENINGS[slug]?.photos ?? [];
}
