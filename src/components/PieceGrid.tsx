import { ArrowRight } from "lucide-react";
import { MediaView } from "@/components/Media";
import type { Piece } from "@/data/types";
import { SIGNATURE_PIECES } from "@/data/pieces";
import { Link, useI18n, useMadeFor } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";

/**
 * Every creation of a list (All, a collection, a sub-category) in a grid of cards all of the same size (Yoni, 23/11/2026:
 * back to the grid, everything aligned and symmetrical; 24/11/2026: four on a row on a computer, smaller, three on a tablet,
 * two on a phone): the same frame for every photo, a name on two lines at most, the line under it on two lines kept, so that
 * the names, the lines and the ways in stand at the same height on every card.
 */
export default function PieceGrid({ pieces, showType }: { pieces: Piece[]; showType: boolean }) {
  const { t } = useI18n();
  const cat = useCatalogue();
  const madeFor = useMadeFor();
  return (
    <ul data-creations-grid className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
      {pieces.map((p, i) => (
        <li key={p.slug} className="flex">
          <Link to={"/pieces/" + p.slug} data-piece-card={p.slug} className="group flex w-full flex-col">
            <span className="relative block aspect-[4/5] overflow-hidden bg-ink">
              <span className="absolute inset-0 p-3 transition-opacity duration-700 group-hover:opacity-90 sm:p-5">
                <MediaView item={p.cover} alt={p.cover.alt ?? p.title} fit="contain" eager={i < 4} priority={i === 0} sizes="(max-width: 767px) 46vw, (max-width: 1023px) 30vw, 22vw" />
              </span>
              <span aria-hidden="true" className="bg-rose-gold absolute bottom-0 start-0 h-px w-0 transition-[width] duration-700 ease-out group-hover:w-full" />
            </span>
            {/* Its whole name, never cut (24/11/2026). */}
            <span data-card-title data-piece-name className="title-caps mt-4 block text-base leading-[1.25] tracking-[0.06em] text-white [text-wrap:balance] transition-colors duration-500 group-hover:text-rose-light lg:text-[1.0625rem]">
              {p.title}
            </span>
            <CardLine piece={p} who={madeFor(cat, p)} showType={showType} />
            <span data-enter-world data-cta className="btn-secondary mt-auto pt-1 text-white group-hover:text-rose-light">
              {t.common.enterWorld}
              <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The line under the name of a card (24/11/2026): the one it was created for when the house may name them, "A Berete
 * Signature" for a chain of the house; nothing for a piece made for a private collector (said on its own page only).
 */
export function CardLine({ piece, who, showType }: { piece: Piece; who: string; showType?: boolean }) {
  const { t } = useI18n();
  const named = who !== t.common.privateCollector;
  const words = SIGNATURE_PIECES.includes(piece.slug) ? t.common.signature : named ? t.common.madeFor(who, piece.type) : "";
  const line = [showType ? t.types[piece.type] : "", words].filter(Boolean).join(" · ");
  return line ? <span data-card-line className="mt-1.5 mb-2 block text-base leading-normal text-mist">{line}</span> : <span className="mb-2 block" />;
}
