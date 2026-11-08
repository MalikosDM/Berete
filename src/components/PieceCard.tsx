import { ArrowUpRight } from "lucide-react";
import { MediaView } from "@/components/Media";
import type { Piece } from "@/data/types";
import { Link, useI18n, useMadeFor } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";

type Props = { piece: Piece; eager?: boolean; showType?: boolean; className?: string };

/** One piece in a grid: the jewel framed on black, its name, who it was made for. */
export default function PieceCard({ piece, eager = false, showType = false, className = "" }: Props) {
  const cat = useCatalogue();
  const { t } = useI18n();
  const madeFor = useMadeFor();
  return (
    <Link to={"/pieces/" + piece.slug} data-piece-card={piece.slug} className={"group block " + className}>
      <span className="relative block aspect-[4/5] overflow-hidden bg-ink">
        <span className="absolute inset-0 p-5 transition-transform duration-[1.8s] ease-out group-hover:scale-[1.06] sm:p-6">
          <MediaView item={piece.cover} alt={piece.cover.alt ?? piece.title} fit="contain" eager={eager} />
        </span>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-rose-light/15 to-transparent transition-transform duration-[1.6s] ease-out group-hover:translate-x-full" />
        <span aria-hidden="true" className="bg-rose-gold absolute bottom-0 start-0 h-px w-0 transition-[width] duration-700 ease-out group-hover:w-full" />
      </span>
      <span className="mt-5 flex items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="title-caps block text-[clamp(1.375rem,2vw,1.875rem)] tracking-[0.06em] break-words text-white [text-wrap:balance] transition-colors group-hover:text-rose-light">{piece.title}</span>
          <span className="mt-2 block text-base text-mist">
            {showType ? t.types[piece.type] + " · " : ""}
            {t.common.madeFor(madeFor(cat, piece))}
          </span>
        </span>
        <ArrowUpRight className="mt-1 size-6 shrink-0 text-white transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-rose-light rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  );
}
