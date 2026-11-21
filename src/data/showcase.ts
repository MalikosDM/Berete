/*
 * The opening of a piece: its jewel cut out of its photos (scripts/cutouts.mjs, src/data/cutouts.generated.json), in one
 * view or in a showcase of several views (src/components/Showcase.tsx). A piece without a cutout keeps its photo.
 *
 * The admin chooses per piece (PieceShowcase, "Vitrine" in the editor): one view or the showcase, which views and in
 * which order; the page "Détourages" excludes a view everywhere. Without a choice: the showcase for the five priority
 * universes and wherever there are at least 3 clean views, else the main view alone.
 */
import cutouts from "./cutouts.generated.json" with { type: "json" };

export const CUTOUT_KINDS = ["face", "profile", "back", "detail", "worn"] as const;
export type CutoutKind = (typeof CUTOUT_KINDS)[number];

export type CutoutView = {
  id: string;
  kind: CutoutKind;
  /** Size of the largest file. */
  width: number;
  height: number;
  /** The widths of its files: /media/cutouts/<slug>/<id>-<w>.webp. */
  widths: number[];
  /** The sides where the jewel leaves its photo and fades out (a chain going up). */
  fade: string[] | null;
  /** It passed the automatic checks and the look. */
  clean: boolean;
  /** Its original photo, and what to look at by eye (French). */
  source: string;
  note: string;
};

export const CUTOUTS = cutouts.views as Record<string, CutoutView[]>;

/** What a piece (or the admin) writes. */
export type PieceShowcase = {
  /** "single": the main view alone; "multi": the showcase. None: chosen by the rule above. */
  mode?: "single" | "multi";
  /** The views used, in their order (the first one is the main one). None: every clean view, in the order of the cutouts. */
  views?: string[];
  /** Views refused (the page "Détourages"): never shown. */
  excluded?: string[];
  /** "large": the main view much larger (the whole height of the opening on a computer, a taller frame on a phone). */
  size?: "large";
};

/** The five priority universes (Dragon Ball, Butterfly, Inter, VfB, Noah Okafor): the showcase by default. */
export const SHOWCASE_BY_DEFAULT = new Set([
  "kevin-schade-dragon-ball-pendant",
  "michy-batshuayi-butterfly-chain",
  "campione-d-italia-2023-2024",
  "vfb-stuttgart-dfb-pokal-2025",
  "noah-okafor-jersey-pendant",
  "noah-okafor-oka-pendant",
  "noah-okafor-octagon-pendant",
]);

export const MAX_VIEWS = 5;

export const cutoutSrc = (slug: string, v: CutoutView, w: number) => "/media/cutouts/" + slug + "/" + v.id + "-" + w + ".webp";
export const cutoutSrcSet = (slug: string, v: CutoutView) => v.widths.map((w) => cutoutSrc(slug, v, w) + " " + w + "w").join(", ");
export const cutoutLargest = (slug: string, v: CutoutView) => cutoutSrc(slug, v, v.widths[v.widths.length - 1]!);

export type ResolvedShowcase = { mode: "photo" | "single" | "multi"; views: CutoutView[]; large: boolean };

/** How the opening of a piece shows its jewel. */
export function resolveShowcase(slug: string, showcase: PieceShowcase | null | undefined): ResolvedShowcase {
  const all = CUTOUTS[slug] ?? [];
  const large = showcase?.size === "large";
  const excluded = new Set(showcase?.excluded ?? []);
  const usable = all.filter((v) => v.clean && !excluded.has(v.id));
  const chosen = showcase?.views?.length
    ? showcase.views.map((id) => all.find((v) => v.id === id)).filter((v): v is CutoutView => !!v && !excluded.has(v.id))
    : usable;
  if (chosen.length === 0) return { mode: "photo", views: [], large };
  const mode = showcase?.mode ?? (SHOWCASE_BY_DEFAULT.has(slug) || usable.length >= 3 ? "multi" : "single");
  if (mode === "single" || chosen.length < 2) return { mode: "single", views: [chosen[0]!], large };
  return { mode: "multi", views: chosen.slice(0, MAX_VIEWS), large };
}

const ID = /^[a-z0-9-]{1,40}$/;
const ids = (v: unknown): string[] | null => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && ID.test(x)))].slice(0, 40) : null);

/** A showcase as stored: only the known parts, without the empty ones. */
export function cleanShowcase(value: unknown): PieceShowcase | null {
  if (value === null || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const out: PieceShowcase = {};
  if (v.mode === "single" || v.mode === "multi") out.mode = v.mode;
  const views = ids(v.views);
  if (views?.length) out.views = views;
  const excluded = ids(v.excluded);
  if (excluded?.length) out.excluded = excluded;
  if (v.size === "large") out.size = "large";
  return Object.keys(out).length > 0 ? out : null;
}
