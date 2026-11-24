import { ArrowRight } from "lucide-react";
import { MediaView } from "@/components/Media";
import type { Piece } from "@/data/types";
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
              <span className="absolute inset-0 p-3 transition-transform duration-[1.8s] ease-out group-hover:scale-[1.05] sm:p-5">
                <MediaView item={p.cover} alt={p.cover.alt ?? p.title} fit="contain" eager={i < 4} priority={i === 0} sizes="(max-width: 767px) 46vw, (max-width: 1023px) 30vw, 22vw" />
              </span>
              <span aria-hidden="true" className="bg-rose-gold absolute bottom-0 start-0 h-px w-0 transition-[width] duration-700 ease-out group-hover:w-full" />
            </span>
            <span data-card-title className="title-caps mt-4 line-clamp-2 block min-h-[2.5em] text-base leading-[1.25] tracking-[0.06em] text-white [text-wrap:balance] transition-colors group-hover:text-rose-light lg:text-[1.0625rem]">
              {p.title}
            </span>
            <span className="mt-1.5 line-clamp-2 block min-h-[3em] text-base leading-normal text-mist lg:text-[0.875rem]">
              {showType ? t.types[p.type] + " · " : ""}
              {t.common.madeFor(madeFor(cat, p))}
            </span>
            <span data-enter-world className="mt-2 inline-flex min-h-11 items-center gap-2 text-[0.8125rem] font-normal uppercase tracking-[0.14em] text-white transition-colors group-hover:text-rose-light max-sm:text-base max-sm:tracking-[0.06em] lg:min-h-10 lg:text-[0.75rem]">
              {t.common.enterWorld}
              <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
