import { useParams } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import Count from "@/components/Count";
import { MediaView } from "@/components/Media";
import PieceGrid from "@/components/PieceGrid";
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
      {/* Opening: compact (Yoni, 24/11/2026: no image that takes the whole screen), the name, its words, one piece. */}
      <section aria-labelledby="collection-title" className="relative isolate overflow-hidden bg-ink">
        <div className="mx-auto grid max-w-[1400px] items-end gap-6 px-5 pt-24 pb-10 sm:px-8 desk:pt-32 md:grid-cols-12 lg:px-12 lg:pb-12">
          <div className={"md:col-span-7 " + shadow}>
            <Link to="/creations" className="inline-flex min-h-12 items-center gap-2 text-base font-normal uppercase tracking-[0.16em] text-bone hover:text-rose-light lg:min-h-10 lg:text-[0.8125rem]">
              <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" /> {t.common.allCreations}
            </Link>
            <div className="mt-6">
              <SplitHeading as="h1" id="collection-title" eyebrow={isSub(collection) ? parentName : t.collections.collection} className="t-hero tracking-[0.12em]">
                {words.name}
              </SplitHeading>
              <p className="mt-4 max-w-xl text-base text-bone">{words.intro}</p>
              <p className="mt-4 inline-flex items-baseline gap-3 text-base uppercase tracking-[0.2em] text-mist lg:text-[0.8125rem]" data-count>
                <Count text={t.collections.count(pieces.length)} numberClassName="text-rose-gold font-display text-2xl tracking-normal" />
              </p>
            </div>
          </div>
          {hero ? (
            // On a phone, a collection with categories shows them first (its piece of the opening waits on larger screens).
            <div aria-hidden="true" className={"relative mx-auto h-[30svh] w-full max-w-sm md:col-span-5 md:h-[40svh] md:max-h-[22rem] " + (!isSub(collection) && subs.length > 0 ? "max-md:hidden" : "")}>
              <MediaView item={hero.cover} alt="" fit="contain" priority sizes="(max-width: 767px) 60vw, 30vw" />
            </div>
          ) : null}
        </div>
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
          <div className="rule-rose origin-left animate-draw rtl:origin-right" aria-hidden="true" />
        </div>
      </section>

      {/* A collection with categories (the pendants, the chains): its categories first, then all its pieces (Yoni, 24/11/2026). */}
      {!isSub(collection) && subs.length > 0 ? (
        <section aria-labelledby="collection-categories" data-categories className="mx-auto max-w-[1400px] px-5 pt-10 sm:px-8 lg:px-12 lg:pt-12">
          <h2 id="collection-categories" className="eyebrow">{t.collections.categories}</h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
            {subs.map((c) => {
              const list = piecesOfCollection(cat, c);
              const face = list.find((p) => p.slug === c.hero) ?? list[0];
              return (
                <li key={c.slug}>
                  <Link to={collectionPath(c)} data-category={c.slug} className="group block">
                    <span className="relative block aspect-square overflow-hidden border border-white/10 bg-ink-soft">
                      {face ? (
                        <span className="absolute inset-0 p-4 transition-transform duration-[1.4s] ease-out group-hover:scale-[1.05]">
                          <MediaView item={face.cover} alt="" fit="contain" sizes="(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 18vw" />
                        </span>
                      ) : null}
                    </span>
                    <span className="title-caps mt-3 block text-base leading-snug tracking-[0.1em] text-white group-hover:text-rose-light lg:text-[0.9375rem]">{collectionWords(t, c.slug, c).name}</span>
                    <span className="mt-0.5 block text-base text-mist lg:text-[0.8125rem]">{t.collections.count(list.length)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* The pieces */}
      <section aria-label={t.collections.listLabel(words.name)} className="mx-auto max-w-[1400px] px-5 pt-10 pb-20 sm:px-8 lg:px-12 lg:pt-14 lg:pb-28">
        {isSub(collection) && subs.length > 0 ? (
          // Inside a category: the other categories of its collection, each at its own address.
          <nav aria-label={t.collections.subLabel(parentName)} data-subcategories className="no-scrollbar -mx-5 mb-8 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0 lg:mb-10">
            {[parent, ...subs].map((c) => {
              const on = c.slug === collection.slug;
              return (
                <Link
                  key={c.slug}
                  to={collectionPath(c)}
                  aria-current={on ? "page" : undefined}
                  data-subcategory={c.slug}
                  className={"inline-flex min-h-12 shrink-0 items-center border px-4 text-base font-normal uppercase tracking-[0.14em] transition-colors lg:min-h-10 lg:text-[0.75rem] " + (on ? "border-rose-light text-rose-light" : "border-white/20 text-white hover:border-rose-light hover:text-rose-light")}
                >
                  {isSub(c) ? collectionWords(t, c.slug, c).name : t.collections.subAll(parentName)}
                  <span className="ms-2.5 text-mist">{piecesOfCollection(cat, c).length}</span>
                </Link>
              );
            })}
          </nav>
        ) : !isSub(collection) && subs.length > 0 ? (
          <h2 className="eyebrow mb-6">{t.collections.subAll(parentName)}</h2>
        ) : null}
        {pieces.length === 0 ? (
          <div className="border border-white/15 p-10 text-center">
            <p className="title-caps text-2xl tracking-[0.14em]">{t.common.newPiecesTitle}</p>
            <p className="mt-4 text-base text-bone">{t.common.newPiecesText}</p>
            <Link to="/contact" className="mt-8 inline-flex min-h-12 items-center bg-white px-6 text-base font-medium uppercase tracking-[0.16em] text-ink hover:bg-rose-light lg:min-h-11 lg:text-[0.8125rem]">
              {t.common.startPiece}
            </Link>
          </div>
        ) : (
          <PieceGrid pieces={pieces} showType={false} />
        )}
      </section>

      {/* Other collections and the next step */}
      <section aria-labelledby="other-collections" className="border-t border-white/10">
        <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-20">
          <div>
            <h2 id="other-collections" className="eyebrow">
              {t.collections.others}
            </h2>
            <ul className="mt-6">
              {others.map((c) => (
                <li key={c.slug} className="border-b border-white/15">
                  <Link to={collectionPath(c)} className="group flex min-h-14 items-center justify-between gap-4 py-3">
                    <span className="title-caps t-sub tracking-[0.1em] text-white group-hover:text-rose-light">{collectionWords(t, c.slug, c).name}</span>
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
            <h2 className="title-caps t-title tracking-[0.1em]">{t.collections.ctaTitle}</h2>
            <p className="mt-6 max-w-md text-base text-bone">{t.collections.ctaText}</p>
            <a href={waLink(waMessage)} target="_blank" rel="noreferrer" className="mt-8 inline-flex min-h-12 items-center gap-3 bg-white px-6 text-base font-medium uppercase tracking-[0.14em] text-ink transition-colors hover:bg-rose-light lg:min-h-11 lg:text-[0.8125rem]">
              <BrandIcon name="whatsapp" className="size-5" /> {t.collections.ctaButton}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
