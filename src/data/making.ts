/*
 * "The Making of a Masterpiece" (feedback of Yoni, 21/11/2026): only the real steps of each piece. A step shows a photo or
 * a film of THAT piece (its sketch, its casting, its setting, its polishing, its own box), chosen after looking at every
 * file of the folders of Yoni and the frames of every film (src/data/pieces.ts, `making`); a step without one is left
 * out, and a piece without any has no section. No more images of the atelier repeated from piece to piece. When the piece
 * has a complete making-of (a professional edit of its whole fabrication), it comes first: its film of "Enter the
 * Atelier" (src/data/atelier.ts, "making").
 */
import { resolveAtelier, type Film, type PieceAtelier } from "./atelier.js";
import { st } from "./sources.js";
import { MAKING_STEPS, type MakingStep, type MediaItem, type Piece } from "./types.js";

/**
 * The pieces whose making-of film ("Enter the Atelier") is a complete making-of: a professional edit of their whole
 * fabrication, recognised on the finished piece at its end (not a phone clip of one step, not the edit of the finished
 * piece, not a delivery). Looked at frame by frame on 21/11/2026.
 */
export const COMPLETE_MAKING_OF = new Set<string>([
  "rose-iced-cuban-chain", // 01/f (= 08/v09)
  "thorns-and-roses-crucifix", // 05/v02 (= 08/v13)
  "kevin-schade-dragon-ball-pendant", // 13/v01 (= 08/v01)
  "noah-okafor-octagon-pendant", // 17/v02
  "panther-champion-pendant", // 19/v01 (= 08/v06, "LASANA吊坠")
  "jesus-piece-red-flowers", // 20/v01
  "malik-tillman-cross-pendant", // 21/v02 (= 08/v12, 08/v17)
  "campione-d-italia-2023-2024", // 25/v02 (= 08/v22)
  "marcus-thuram-ruby-t-necklace", // 26/v02 (= 08/v16)
  "marcus-thuram-t-serpent-pendant", // 08/v14
  "vfb-stuttgart-dfb-pokal-2025", // 08/v05 (= 29/v02)
  "noah-okafor-oka-pendant", // 34/v02 (= 08/v23)
  "brt-flower-chain", // 36/v02 (= 08/v15)
  "deniz-undav-l-pendant", // 38/v01
  "samuel-ballet-jesus-piece", // 08/v21
]);

/** A complete making-of found in the stories only (story, number of its file): the piece has no atelier of its own. */
const STORY_MAKING_OF: Record<string, [string, number]> = {
  // The Butterfly chain: its raw pendant, its setting, its back, the finished chain (story 07/10).
  "michy-batshuayi-butterfly-chain": ["michy-batshuayi", 10],
};

/** A film of the stories as a film of the atelier (played full screen by src/components/AtelierRoom.tsx). */
function storyFilm(m: MediaItem): Film {
  return { src: m.src, mobile: m.src, width: m.width ?? 720, height: m.height ?? 1280, duration: m.duration ?? 0, audio: m.audio ?? false, posters: m.poster ? [m.poster] : [], poster: 0, source: "story", light: true };
}

/** The complete making-of that opens the section, if any. */
export function completeMakingOf(slug: string, atelier: PieceAtelier | null | undefined): Film | null {
  const story = STORY_MAKING_OF[slug];
  if (story) {
    const m = st(story[0], story[1]);
    return m && m.type === "video" ? storyFilm(m) : null;
  }
  if (!COMPLETE_MAKING_OF.has(slug)) return null;
  return resolveAtelier(slug, atelier)?.making ?? null;
}

/** Its own box is not shown as its last step (doubt: CLAUDE.md, the box may belong to another piece of the same owner). */
const BOX_NOT_ITS_OWN = new Set(["noah-okafor-octagon-pendant", "tanguy-nianzou-fam-medallion"]);

/** The real steps of a piece, in their order: its own photo or film of each, its own box for the last one. */
export function makingSteps(piece: Pick<Piece, "slug" | "making">, box?: MediaItem): { step: MakingStep; item: MediaItem }[] {
  const ownBox = BOX_NOT_ITS_OWN.has(piece.slug) ? undefined : box;
  return MAKING_STEPS.map((step) => ({ step, item: piece.making[step] ?? (step === "delivery" ? ownBox : undefined) })).filter((s): s is { step: MakingStep; item: MediaItem } => s.item !== undefined && s.item.src !== "");
}
