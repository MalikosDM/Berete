import { useParams } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import Count from "@/components/Count";
import { MediaView } from "@/components/Media";
import PieceGrid from "@/components/PieceGrid";
import Reveal from "@/components/Reveal";
import SplitHeading from "@/components/SplitHeading";
import { COLLECTIONS, collectionBySlug, collectionOf, collectionPath, isSub, piecesOfCollection, subcategoriesOf, subcategoryByOldSlug, subcategoryBySlug, type AnyCollection } from "@/data/collections";
import { RENAMED_PIECES } from "@/data/pieces";
import { collectionWords, Link, Navigate, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { waLink } from "@/lib/site";
import { useWhatsAppMessage } from "@/lib/whatsapp";

/**
 * /creations/:slug is a collection ("pendants", "chains"...) or, for the old addresses of the site, a sub-category
 * ("jesus-pieces", until 22/11/2026: it leads to /creations/pendants/jesus-pieces) or a piece (it leads to /pieces/:slug).
 */
export function CreationsParam() {
  const { slug = "" } = useParams();
  const collection = collectionBySlug(slug);
  if (collection) return <CollectionPage collection={collection} />;
  const moved = subcategoryByOldSlug(slug);
  if (moved) return <Navigate to={collectionPath(moved)} replace />;
  return <Navigate to={slug ? "/pieces/" + (RENAMED_PIECES[slug] ?? slug) : "/creations"} replace />;
}

/** /creations/:slug/:sub is a sub-category of a collection (Pendants > Jesus Pieces); anything else leads to the collection. */
export function CreationsSubParam() {
  const { slug = "", sub = "" } = useParams();
  const found = subcategoryBySlug(slug, sub);
  if (found) return <CollectionPage collection={found} />;
  return <Navigate to={collectionBySlug(slug) ? "/creations/" + slug : "/creations"} replace />;
}

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.8)]";

/**
 * One collection (every piece of a type) or one of its sub-categories (Pendants > Jesus Pieces): an opening with its name,
 * the tabs of its sub-categories when it has some, then its pieces in a grid, 3 by 3 (src/components/PieceGrid.tsx).
 */
function CollectionPage({ collection }: { collection: AnyCollection }) {
  const { t } = useI18n();
  const waMessage = useWhatsAppMessage();
  const words = collectionWords(t, collection.slug, collection);
  const cat = useCatalogue();
  const pieces = piecesOfCollection(cat, collection);
  const hero = pieces.find((p) => p.slug === collection.hero) ?? pieces[0];
  const parent = isSub(collection) ? collectionOf(collection.parent) : collection;
  const parentName = collectionWords(t, parent.slug, parent).name;
  const subs = subcategoriesOf(cat, parent.type);
  // The other collections; from a sub-category, its own collection too.
  const others = COLLECTIONS.filter((c) => (isSub(collection) || c.slug !== collection.slug) && piecesOfCollection(cat, c).length > 0);

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
            <SplitHeading as="h1" id="collection-title" eyebrow={isSub(collection) ? parentName : t.collections.collection} className="text-[clamp(2.75rem,9vw,7.5rem)] tracking-[0.12em]">
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
        {subs.length > 0 ? (
          // Its sub-categories (Pendants: all of them, Jesus Pieces), each at its own address.
          <nav aria-label={t.collections.subLabel(parentName)} data-subcategories className="no-scrollbar -mx-5 mb-12 flex gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0 lg:mb-16">
            {[parent, ...subs].map((c) => {
              const on = c.slug === collection.slug;
              return (
                <Link
                  key={c.slug}
                  to={collectionPath(c)}
                  aria-current={on ? "page" : undefined}
                  data-subcategory={c.slug}
                  className={"inline-flex min-h-12 shrink-0 items-center border px-6 text-base font-semibold uppercase tracking-[0.16em] transition-colors " + (on ? "border-rose-light text-rose-light" : "border-white/25 text-white hover:border-rose-light hover:text-rose-light")}
                >
                  {isSub(c) ? collectionWords(t, c.slug, c).name : t.collections.subAll(parentName)}
                  <span className="ms-3 text-mist">{piecesOfCollection(cat, c).length}</span>
                </Link>
              );
            })}
          </nav>
        ) : null}
        {pieces.length === 0 ? (
          <div className="border border-white/15 p-10 text-center">
            <p className="title-caps text-2xl tracking-[0.14em]">{t.common.newPiecesTitle}</p>
            <p className="mt-4 text-lg text-bone">{t.common.newPiecesText}</p>
            <Link to="/contact" className="mt-8 inline-flex min-h-12 items-center bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink hover:bg-rose-light">
              {t.common.startPiece}
            </Link>
          </div>
        ) : (
          <PieceGrid pieces={pieces} showType={false} />
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
                  <Link to={collectionPath(c)} className="group flex min-h-16 items-center justify-between gap-4 py-4">
                    <span className="title-caps text-[clamp(1.75rem,4vw,3rem)] tracking-[0.1em] text-white group-hover:text-rose-light">{collectionWords(t, c.slug, c).name}</span>
                    <span className="flex items-center gap-4 text-base text-mist">
                      {piecesOfCollection(cat, c).length}
                      <ArrowRight className="size-5 text-white group-hover:text-rose-light rtl:-scale-x-100" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:ps-12">
            <h2 className="title-caps text-[clamp(2rem,4vw,3.25rem)] tracking-[0.1em]">{t.collections.ctaTitle}</h2>
            <p className="mt-6 max-w-md text-lg text-bone">{t.collections.ctaText}</p>
            <a href={waLink(waMessage)} target="_blank" rel="noreferrer" className="mt-10 inline-flex min-h-14 items-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:bg-rose-light">
              <BrandIcon name="whatsapp" className="size-5" /> {t.collections.ctaButton}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
