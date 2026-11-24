import { ArrowUpRight } from "lucide-react";
import Count from "@/components/Count";
import { MediaView } from "@/components/Media";
import Reveal from "@/components/Reveal";
import { visibleCollections } from "@/data/collections";
import { collectionWords, Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";

/**
 * The collections of the house, one card per type of jewel with at least two pieces: its finest photo whole, with air
 * around it, then its name and the number of pieces. Smaller since 21/11/2026 (feedback of Yoni: far less zoomed, several
 * at once, space around and between them): four in a row on a computer, two on a phone.
 */
export default function CollectionTiles() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const tiles = visibleCollections(cat);
  if (tiles.length === 0) return null;
  const columns = tiles.length >= 5 ? "md:grid-cols-3 lg:grid-cols-5" : tiles.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3";

  return (
    <section aria-labelledby="collections-title" data-collections className="bg-ink">
      <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-5 px-5 pt-20 pb-10 sm:flex-row sm:items-end sm:px-8 lg:px-12 lg:pt-24 lg:pb-12">
        <div>
          <p className="eyebrow">{t.collections.eyebrow}</p>
          <h2 id="collections-title" className="title-caps mt-4 t-title tracking-[0.14em]">
            {t.collections.title}
          </h2>
        </div>
        <Link to="/creations" className="inline-flex min-h-12 items-center gap-2 text-base font-medium uppercase tracking-[0.2em] text-white hover:text-rose-light">
          {t.common.allCreations} <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </div>

      <ul className={"mx-auto grid max-w-[1600px] grid-cols-2 gap-x-4 gap-y-8 px-5 pb-20 sm:gap-x-6 sm:px-8 lg:gap-x-8 lg:px-12 lg:pb-28 xl:gap-x-10 " + columns}>
        {tiles.map(({ collection, pieces, hero }, i) => {
          const name = collectionWords(t, collection.slug, collection).name;
          return (
            <li key={collection.slug}>
              <Reveal className="h-full" delay={i * 0.06}>
                <Link to={"/creations/" + collection.slug} data-collection-tile={collection.slug} className="group flex h-full flex-col">
                  {/* The jewel whole, with air around it (no crop on the jewel). */}
                  <span className="relative block aspect-[4/5] overflow-hidden border border-white/10 bg-ink transition-colors duration-500 group-hover:border-rose-light/50">
                    <span className="absolute inset-0 p-4 transition-transform duration-[2.4s] ease-out group-hover:scale-105 sm:p-6 lg:p-8">
                      <MediaView item={hero.cover} alt={t.collections.tileAlt(name, hero.title)} fit="contain" sizes="(max-width: 767px) 44vw, 22vw" />
                    </span>
                  </span>
                  {/* Its name, then the number of its pieces below it: every card the same, whatever the length of the words. */}
                  <span className="mt-4 flex flex-col gap-1">
                    <span className="title-caps block t-sub tracking-[0.1em] text-white transition-colors duration-500 group-hover:text-rose-light">{name}</span>
                    <span className="font-display text-lg" data-count>
                      <Count text={t.collections.count(pieces.length)} numberClassName="text-rose-gold" wordClassName="text-rose-light text-base uppercase tracking-[0.16em]" />
                    </span>
                  </span>
                  <span aria-hidden="true" className="relative mt-3 block h-px w-full bg-white/15">
                    <span className="bg-rose-gold absolute inset-y-0 start-0 w-0 transition-[width] duration-[1.2s] ease-out group-hover:w-full" />
                  </span>
                  <span className="mt-2 inline-flex min-h-12 items-center gap-2 text-base font-medium uppercase tracking-[0.16em] text-white group-hover:text-rose-light">
                    {t.collections.explore} <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                  </span>
                </Link>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
