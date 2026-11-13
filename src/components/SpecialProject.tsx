import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { MediaView } from "@/components/Media";
import { SPECIAL_PROJECT } from "@/data/pieces";
import type { MediaItem, Piece } from "@/data/types";
import { Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";

/** A photo of the piece by its address (in the language of the page), else null. */
function photoOf(piece: Piece, src: string): MediaItem | null {
  if (!src) return null;
  return [piece.cover, ...piece.gallery].find((m) => m.src === src) ?? null;
}

function Ring({ piece, trophy, closed, open }: { piece: Piece; trophy: string; closed: MediaItem; open: MediaItem | null }) {
  const { t } = useI18n();
  const [lifted, setLifted] = useState(false);
  const lift = lifted ? t.home.closeTop : t.home.liftTop;
  return (
    <li data-special-ring={piece.slug} className="flex flex-col bg-ink">
      <div className="group relative h-[58svh] min-h-80 w-full overflow-hidden sm:h-[64svh] lg:h-[72svh]">
        <span className={"absolute inset-0 p-4 transition-opacity duration-700 sm:p-8 " + (lifted && open ? "opacity-0" : open ? "md:group-hover:opacity-0" : "")}>
          <MediaView item={closed} fit="contain" sizes="(max-width: 767px) 100vw, 50vw" />
        </span>
        {open ? (
          <span className={"absolute inset-0 p-4 transition-opacity duration-700 sm:p-8 " + (lifted ? "opacity-100" : "opacity-0 md:group-hover:opacity-100")}>
            <MediaView item={open} fit="contain" sizes="(max-width: 767px) 100vw, 50vw" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col px-5 pt-6 pb-12 sm:px-10 lg:pb-16">
        <p className="eyebrow">{piece.client ?? piece.title}</p>
        <h3 className="title-caps mt-4 text-[clamp(1.875rem,3.4vw,3.25rem)] leading-[1.05] tracking-[0.08em] text-white [text-wrap:balance]">{trophy}</h3>
        {piece.line ? <p className="mt-4 max-w-md text-lg text-bone">{piece.line}</p> : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            to={"/pieces/" + piece.slug}
            aria-label={t.home.special.discover + " · " + piece.title}
            className="inline-flex min-h-14 items-center justify-center gap-3 border border-rose-light/80 px-8 text-base font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-rose-light hover:text-ink"
          >
            {t.home.special.discover}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
          {open ? (
            <button
              type="button"
              onClick={() => setLifted((v) => !v)}
              aria-pressed={lifted}
              aria-label={lift + " · " + piece.title}
              className="inline-flex min-h-12 items-center gap-3 px-2 text-base font-medium uppercase tracking-[0.2em] text-bone transition-colors hover:text-rose-light"
            >
              <span aria-hidden="true" className="bg-rose-gold block h-px w-10" />
              {lift}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/**
 * The special project of the house, right after the film of the home page: the championship rings of Inter Milan and
 * VfB Stuttgart side by side. Both open onto their trophy (hover, or "Lift the top" on a phone); each leads to its page.
 */
export default function SpecialProject() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const rings = SPECIAL_PROJECT.map((r) => {
    const piece = cat.pieces.find((p) => p.slug === r.slug);
    return piece ? { ...r, piece, closedItem: photoOf(piece, r.closed) ?? piece.cover, openItem: photoOf(piece, r.open) } : null;
  }).filter((r) => r !== null);
  if (rings.length === 0) return null;

  return (
    <section aria-labelledby="special-title" data-special-project className="border-b border-white/10 bg-ink">
      <div className="mx-auto max-w-[1600px] px-5 pt-24 pb-10 sm:px-8 lg:px-12 lg:pt-32 lg:pb-14">
        <p className="eyebrow">{t.home.special.eyebrow}</p>
        <h2 id="special-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.14em] [text-wrap:balance]">
          {t.home.special.title}
        </h2>
        <p className="mt-6 max-w-2xl text-lg text-bone md:text-xl">{t.home.special.lead}</p>
      </div>
      <ul className="mx-auto grid max-w-[1600px] gap-px bg-white/10 md:grid-cols-2">
        {rings.map((r) => (
          <Ring key={r.slug} piece={r.piece} trophy={r.trophy} closed={r.closedItem} open={r.openItem} />
        ))}
      </ul>
    </section>
  );
}
