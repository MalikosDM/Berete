import { useParams } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import Count from "@/components/Count";
import { MediaView } from "@/components/Media";
import PieceCard from "@/components/PieceCard";
import Reveal from "@/components/Reveal";
import SplitHeading from "@/components/SplitHeading";
import { COLLECTIONS, collectionBySlug, piecesOfType, type Collection } from "@/data/collections";
import { RENAMED_PIECES } from "@/data/pieces";
import { collectionWords, Link, Navigate, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { waLink } from "@/lib/site";

/**
 * /creations/:slug is a collection ("pendants", "chains"...) or, for the old
 * addresses of the site, a piece: then it leads to /pieces/:slug.
 */
export function CreationsParam() {
  const { slug = "" } = useParams();
  const collection = collectionBySlug(slug);
  if (collection) return <CollectionPage collection={collection} />;
  return <Navigate to={slug ? "/pieces/" + (RENAMED_PIECES[slug] ?? slug) : "/creations"} replace />;
}

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.8)]";

/** One collection: an opening with its name, then every piece of this type. */
function CollectionPage({ collection }: { collection: Collection }) {
  const { t } = useI18n();
  const words = collectionWords(t, collection.slug, collection);
  const cat = useCatalogue();
  const pieces = piecesOfType(cat, collection.type);
  const hero = pieces.find((p) => p.slug === collection.hero) ?? pieces[0];
  const others = COLLECTIONS.filter((c) => c.slug !== collection.slug && piecesOfType(cat, c.type).length > 0);

  return (
    <>
      {/* Opening */}
      <section aria-labelledby="collection-title" className="relative isolate flex min-h-svh flex-col justify-end overflow-hidden bg-ink">
        {hero ? (
          <div aria-hidden="true" className="relative flex h-[46svh] shrink-0 items-center justify-center px-6 pt-24 md:absolute md:inset-0 md:-z-10 md:h-auto md:justify-end md:px-16 md:pt-28 md:pb-24 lg:px-24">
            <div className="h-full w-full md:w-[55%]">
              <MediaView item={hero.cover} alt="" fit="contain" priority sizes="(max-width: 767px) 60vw, 55vw" />
            </div>
          </div>
        ) : null}
        <div aria-hidden="true" className="absolute inset-0 -z-10 hidden md:block md:bg-linear-to-r md:from-ink md:via-ink/70 md:to-transparent rtl:md:bg-linear-to-l" />
        <div className="mx-auto w-full max-w-[1600px] px-5 pt-6 pb-16 sm:px-8 lg:px-12 lg:pb-24">
          <Link to="/creations" className="inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-bone hover:text-rose-light">
            <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" /> {t.common.allCreations}
          </Link>
          <div className={"mt-8 " + shadow}>
            <SplitHeading as="h1" id="collection-title" eyebrow={t.collections.collection} className="text-[clamp(2.75rem,9vw,7.5rem)] tracking-[0.12em]">
              {words.name}
            </SplitHeading>
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-xl text-lg text-bone lg:text-xl">{words.intro}</p>
              <p className="mt-6 inline-flex items-baseline gap-3 text-base uppercase tracking-[0.2em] text-mist" data-count>
                <Count text={t.collections.count(pieces.length)} numberClassName="text-rose-gold font-display text-3xl tracking-normal" />
              </p>
            </Reveal>
          </div>
          <div className="rule-rose mt-12 origin-left animate-draw rtl:origin-right" aria-hidden="true" />
        </div>
      </section>

      {/* The pieces */}
      <section aria-label={t.collections.listLabel(words.name)} className="mx-auto max-w-[1600px] px-5 pt-12 pb-28 sm:px-8 lg:px-12 lg:pt-20 lg:pb-40">
        {pieces.length === 0 ? (
          <div className="border border-white/15 p-10 text-center">
            <p className="title-caps text-2xl tracking-[0.14em]">{t.common.newPiecesTitle}</p>
            <p className="mt-4 text-lg text-bone">{t.common.newPiecesText}</p>
            <Link to="/contact" className="mt-8 inline-flex min-h-12 items-center bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink hover:bg-rose-light">
              {t.common.startPiece}
            </Link>
          </div>
        ) : (
          <ul className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-12 lg:gap-y-24">
            {pieces.map((p, i) => (
              <li key={p.slug} className={i % 3 === 1 ? "lg:mt-28" : ""}>
                <Reveal delay={(i % 3) * 0.12}>
                  <PieceCard piece={p} />
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Other collections and the next step */}
      <section aria-labelledby="other-collections" className="border-t border-white/10">
        <div className="mx-auto grid max-w-[1600px] gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-32">
          <div>
            <h2 id="other-collections" className="eyebrow">
              {t.collections.others}
            </h2>
            <ul className="mt-6">
              {others.map((c) => (
                <li key={c.slug} className="border-b border-white/15">
                  <Link to={"/creations/" + c.slug} className="group flex min-h-16 items-center justify-between gap-4 py-4">
                    <span className="title-caps text-[clamp(1.75rem,4vw,3rem)] tracking-[0.1em] text-white group-hover:text-rose-light">{collectionWords(t, c.slug, c).name}</span>
                    <span className="flex items-center gap-4 text-base text-mist">
                      {piecesOfType(cat, c.type).length}
                      <ArrowRight className="size-5 text-white group-hover:text-rose-light rtl:-scale-x-100" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:ps-12">
            <p className="title-caps text-[clamp(2rem,4vw,3.25rem)] tracking-[0.1em]">{t.collections.ctaTitle}</p>
            <p className="mt-6 max-w-md text-lg text-bone">{t.collections.ctaText}</p>
            <a href={waLink(t.whatsapp.hello)} target="_blank" rel="noreferrer" className="mt-10 inline-flex min-h-14 items-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:bg-rose-light">
              <BrandIcon name="whatsapp" className="size-5" /> {t.collections.ctaButton}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
