import { ArrowRight, ArrowUpRight } from "lucide-react";
import { MediaView } from "@/components/Media";
import { SIZES_FOR } from "@/lib/responsive";
import type { Piece } from "@/data/types";
import { Link, useI18n, useMadeFor } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { usePieceModels } from "@/lib/models";

type Props = { piece: Piece; eager?: boolean; priority?: boolean; showType?: boolean; className?: string; compact?: boolean };

/** The first letter in capital: "a private collector" as the line of a card. */
const capital = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

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
          <span className="absolute inset-0 p-3 transition-transform duration-[1.8s] ease-out group-hover:scale-[1.06] lg:p-4">
            <MediaView item={piece.cover} alt={piece.cover.alt ?? piece.title} fit="contain" eager={eager} priority={priority} sizes={SIZES_FOR.grid6} />
          </span>
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-rose-light/15 to-transparent transition-transform duration-[1.6s] ease-out group-hover:translate-x-full" />
          <span aria-hidden="true" className="bg-rose-gold absolute bottom-0 start-0 h-px w-0 transition-[width] duration-700 ease-out group-hover:w-full" />
          {in3d ? (
            <span data-card-3d className="absolute end-2 top-2 border border-rose-light/60 bg-ink/70 px-2 py-0.5 text-base font-semibold tracking-[0.16em] text-white backdrop-blur-sm">
              <span aria-hidden="true">3D</span>
              <span className="sr-only">{t.viewer.available}</span>
            </span>
          ) : null}
        </span>
        <span className="mt-3 block">
          <span className="title-caps block text-base leading-snug tracking-[0.05em] break-words text-white [text-wrap:balance] transition-colors group-hover:text-rose-light lg:text-[1.0625rem]">{piece.title}</span>
          <span className="mt-1 block text-base leading-snug text-mist">
            {showType ? <span className="sr-only">{t.types[piece.type] + " · "}</span> : null}
            <span className="sr-only">{t.piece.madeFor + " "}</span>
            {capital(madeFor(cat, piece))}
          </span>
          {/* The signature button of every piece. */}
          {/* Its arrow follows its last word, on two lines too (a narrow card of a phone). */}
          <span data-enter-world className="mt-2 block py-2 text-base leading-snug font-semibold text-rose-light transition-colors group-hover:text-white">
            {t.common.enterWorld}
            <ArrowRight className="ms-1.5 inline size-4 align-[-0.15em] transition-transform duration-500 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden="true" />
          </span>
        </span>
      </Link>
    );
  }
  return (
    <Link to={"/pieces/" + piece.slug} data-piece-card={piece.slug} className={"group block " + className}>
      <span className="relative block aspect-[4/5] overflow-hidden bg-ink">
        <span className="absolute inset-0 p-5 transition-transform duration-[1.8s] ease-out group-hover:scale-[1.06] sm:p-6">
          <MediaView item={piece.cover} alt={piece.cover.alt ?? piece.title} fit="contain" eager={eager} priority={priority} sizes={SIZES_FOR.grid3} />
        </span>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-rose-light/15 to-transparent transition-transform duration-[1.6s] ease-out group-hover:translate-x-full" />
        <span aria-hidden="true" className="bg-rose-gold absolute bottom-0 start-0 h-px w-0 transition-[width] duration-700 ease-out group-hover:w-full" />
        {/* The pieces the jeweller attached a 3D model to. */}
        {in3d ? (
          <span data-card-3d className="absolute end-3 top-3 border border-rose-light/60 bg-ink/70 px-3 py-1 text-base font-semibold tracking-[0.16em] text-white backdrop-blur-sm">
            <span aria-hidden="true">3D</span>
            <span className="sr-only">{t.viewer.available}</span>
          </span>
        ) : null}
      </span>
      <span className="mt-5 flex items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="title-caps block text-[clamp(1.375rem,2vw,1.875rem)] tracking-[0.06em] break-words text-white [text-wrap:balance] transition-colors group-hover:text-rose-light">{piece.title}</span>
          <span className="mt-2 block text-base text-mist">
            {showType ? t.types[piece.type] + " · " : ""}
            {t.common.madeFor(madeFor(cat, piece))}
          </span>
          {/* The signature button of every piece. */}
          <span data-enter-world className="mt-4 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-white transition-colors group-hover:text-rose-light">
            {t.common.enterWorld}
            <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden="true" />
          </span>
        </span>
        <ArrowUpRight className="mt-1 size-6 shrink-0 text-white transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-rose-light rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  );
}
