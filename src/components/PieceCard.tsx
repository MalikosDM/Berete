import { ArrowRight } from "lucide-react";
import { MediaView } from "@/components/Media";
import { SIZES_FOR } from "@/lib/responsive";
import type { Piece } from "@/data/types";
import { Link, useI18n, useMadeFor } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { usePieceModels } from "@/lib/models";
import { CardLine } from "@/components/PieceGrid";

type Props = { piece: Piece; eager?: boolean; priority?: boolean; showType?: boolean; className?: string; compact?: boolean };

/**
 * One piece in a grid: the jewel framed on black, its name, who it was made for. `compact`: a card of the dense grid of
 * the page Créations (six on a row on a computer, two on a phone): its name, the name of the one it was made for, and its
 * way in, in smaller letters (never under 16 px).
 */
export default function PieceCard({ piece, eager = false, priority = false, showType = false, className = "", compact = false }: Props) {
  const cat = useCatalogue();
  const { t } = useI18n();
  const madeFor = useMadeFor();
  const in3d = Boolean(usePieceModels()?.[piece.slug]);
  if (compact) {
    return (
      <Link to={"/pieces/" + piece.slug} data-piece-card={piece.slug} data-compact className={"group block " + className}>
        <span className="relative block aspect-[4/5] overflow-hidden bg-ink">
          <span className="absolute inset-0 p-3 transition-opacity duration-700 group-hover:opacity-90 lg:p-4">
            <MediaView item={piece.cover} alt={piece.cover.alt ?? piece.title} fit="contain" eager={eager} priority={priority} sizes={SIZES_FOR.grid6} />
          </span>
          <span aria-hidden="true" className="bg-rose-gold absolute bottom-0 start-0 h-px w-0 transition-[width] duration-700 ease-out group-hover:w-full" />
          {in3d ? (
            <span data-card-3d className="absolute end-2 top-2 border border-rose-light/60 bg-ink/70 px-2 py-0.5 text-base font-medium tracking-[0.16em] text-white backdrop-blur-sm">
              <span aria-hidden="true">3D</span>
              <span className="sr-only">{t.viewer.available}</span>
            </span>
          ) : null}
        </span>
        <span className="mt-3 block">
          <span data-piece-name className="title-caps block text-base leading-snug tracking-[0.05em] break-words text-white [text-wrap:balance] transition-colors duration-500 group-hover:text-rose-light lg:text-[1.0625rem]">{piece.title}</span>
          <CardLine piece={piece} who={madeFor(cat, piece)} showType={showType} />
          {/* The signature button of every piece. */}
          <span data-enter-world data-cta className="btn-secondary text-rose-light group-hover:text-white">
            {t.common.enterWorld}
            <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
          </span>
        </span>
      </Link>
    );
  }
  return (
    <Link to={"/pieces/" + piece.slug} data-piece-card={piece.slug} className={"group block " + className}>
      <span className="relative block aspect-[4/5] overflow-hidden bg-ink">
        <span className="absolute inset-0 p-5 transition-opacity duration-700 group-hover:opacity-90 sm:p-6">
          <MediaView item={piece.cover} alt={piece.cover.alt ?? piece.title} fit="contain" eager={eager} priority={priority} sizes={SIZES_FOR.grid3} />
        </span>
        <span aria-hidden="true" className="bg-rose-gold absolute bottom-0 start-0 h-px w-0 transition-[width] duration-700 ease-out group-hover:w-full" />
        {/* The pieces the jeweller attached a 3D model to. */}
        {in3d ? (
          <span data-card-3d className="absolute end-3 top-3 border border-rose-light/60 bg-ink/70 px-3 py-1 text-base font-medium tracking-[0.16em] text-white backdrop-blur-sm">
            <span aria-hidden="true">3D</span>
            <span className="sr-only">{t.viewer.available}</span>
          </span>
        ) : null}
      </span>
      <span className="mt-4 block">
        <span data-piece-name className="title-caps block text-base tracking-[0.06em] break-words text-white [text-wrap:balance] transition-colors duration-500 group-hover:text-rose-light lg:text-[1.0625rem]">{piece.title}</span>
        <CardLine piece={piece} who={madeFor(cat, piece)} showType={showType} />
        {/* The signature button of every piece. */}
        <span data-enter-world data-cta className="btn-secondary text-white group-hover:text-rose-light">
          {t.common.enterWorld}
          <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
