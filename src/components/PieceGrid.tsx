import { ArrowRight } from "lucide-react";
import PieceThumb from "@/components/PieceThumb";
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
export default function PieceGrid({ pieces }: { pieces: Piece[]; showType?: boolean }) {
  const { t } = useI18n();
  const cat = useCatalogue();
  const madeFor = useMadeFor();
  return (
    <ul data-creations-grid className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
      {pieces.map((p, i) => (
        <li key={p.slug} className="flex">
          <Link to={"/pieces/" + p.slug} data-piece-card={p.slug} className="group flex w-full flex-col">
            <span data-thumb-frame className="relative block aspect-[4/5] overflow-hidden bg-ink">
              <span className="absolute inset-0 transition-opacity duration-700 group-hover:opacity-90">
                <PieceThumb piece={p} eager={i < 4} priority={i === 0} sizes="(max-width: 767px) 46vw, (max-width: 1023px) 30vw, 22vw" />
              </span>
              <span aria-hidden="true" className="bg-rose-gold absolute bottom-0 start-0 h-px w-0 transition-[width] duration-700 ease-out group-hover:w-full" />
            </span>
            {/* Its whole name, never cut (24/11/2026). */}
            <span data-card-title data-piece-name className="title-caps mt-4 block text-base leading-[1.25] tracking-[0.06em] text-white [text-wrap:balance] transition-colors duration-500 group-hover:text-rose-light lg:text-[1.0625rem]">
              {p.title}
            </span>
            <CardLine piece={p} who={madeFor(cat, p)} />
            <span data-enter-world data-cta className="card-enter mt-auto pt-1 text-white group-hover:text-rose-light">
              <EnterWorld text={t.common.enterWorld} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The line under the name of every card (one format everywhere, 25/11/2026): its type, then « · » and its mention when it has
 * one (« Created exclusively for … », « A Berete Signature »); on a phone, its type alone.
 */
export function CardLine({ piece, who }: { piece: Piece; who: string; showType?: boolean }) {
  const { t } = useI18n();
  const named = who !== t.common.privateCollector;
  const words = SIGNATURE_PIECES.includes(piece.slug) ? t.common.signature : named ? t.common.madeFor(who, piece.type) : "";
  return (
    <span data-card-line className="mt-1.5 mb-2 block text-base leading-normal text-mist">
      {t.types[piece.type]}
      {words ? <span className="max-sm:hidden"> · {words}</span> : null}
    </span>
  );
}

/** « Enter the World → » of a card: its arrow held to its last word (never alone at the other end of the card). */
export function EnterWorld({ text }: { text: string }) {
  const i = text.lastIndexOf(" ");
  return (
    <span>
      {i > 0 ? text.slice(0, i + 1) : null}
      <span className="whitespace-nowrap">
        {i > 0 ? text.slice(i + 1) : text}
        {"\u00a0"}
        <ArrowRight className="inline size-3.5 align-[-0.1em] rtl:-scale-x-100" aria-hidden="true" />
      </span>
    </span>
  );
}
