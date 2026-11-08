import { ArrowUpRight } from "lucide-react";
import Count from "@/components/Count";
import { MediaView } from "@/components/Media";
import Reveal from "@/components/Reveal";
import { visibleCollections } from "@/data/collections";
import { collectionWords, Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";

/**
 * The collections of the house, one large tile per type of jewel with at
 * least two pieces: its finest photo, its name, the number of pieces.
 */
export default function CollectionTiles() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const tiles = visibleCollections(cat);
  if (tiles.length === 0) return null;

  return (
    <section aria-labelledby="collections-title" data-collections className="bg-ink">
      <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-6 px-5 pt-24 pb-12 sm:flex-row sm:items-end sm:px-8 lg:px-12 lg:pt-32 lg:pb-16">
        <div>
          <p className="eyebrow">{t.collections.eyebrow}</p>
          <h2 id="collections-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">
            {t.collections.title}
          </h2>
        </div>
        <Link to="/creations" className="inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] text-white hover:text-rose-light">
          {t.common.allCreations} <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </div>

      <ul className="grid gap-px bg-white/10 md:grid-cols-2">
        {tiles.map(({ collection, pieces, hero }, i) => {
          const name = collectionWords(t, collection.slug, collection).name;
          return (
          <li key={collection.slug} className={"bg-ink " + (tiles.length % 2 === 1 && i === 0 ? "md:col-span-2" : "")}>
            <Reveal className="h-full">
              <Link
                to={"/creations/" + collection.slug}
                data-collection-tile={collection.slug}
                className="group relative flex h-[78svh] flex-col justify-end overflow-hidden bg-ink md:h-[88svh]"
              >
                <span className="absolute inset-0 flex items-center justify-center p-8 pb-40 transition-transform duration-[2.4s] ease-out group-hover:scale-110 sm:p-12 sm:pb-44">
                  <MediaView item={hero.cover} alt={t.collections.tileAlt(name, hero.title)} fit="contain" eager={i < 2} />
                </span>
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-ink via-ink/80 to-transparent" />
                <span className="relative block p-6 sm:p-10">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <span className="title-caps block text-[clamp(2.25rem,5vw,4.5rem)] tracking-[0.1em] text-white transition-colors duration-500 group-hover:text-rose-light">{name}</span>
                    <span className="shrink-0 font-display text-2xl" data-count>
                      <Count text={t.collections.count(pieces.length)} numberClassName="text-rose-gold" wordClassName="text-rose-light text-base uppercase tracking-[0.2em]" />
                    </span>
                  </span>
                  <span aria-hidden="true" className="relative mt-5 block h-px w-full bg-white/15">
                    <span className="bg-rose-gold absolute inset-y-0 start-0 w-0 transition-[width] duration-[1.2s] ease-out group-hover:w-full" />
                  </span>
                  <span className="mt-5 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] text-white group-hover:text-rose-light">
                    {t.collections.explore} <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                  </span>
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
