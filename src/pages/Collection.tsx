import { useParams } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import Count from "@/components/Count";
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
  const parent = isSub(collection) ? collectionOf(collection.parent) : collection;
  const parentName = collectionWords(t, parent.slug, parent).name;
  const subs = subcategoriesOf(cat, parent.type);
  // The other collections; from a sub-category, its own collection too.
  const others = COLLECTIONS.filter((c) => (isSub(collection) || c.slug !== collection.slug) && piecesOfCollection(cat, c).length > 0);

  return (
    <>
      {/* Opening: compact (Yoni, 24/11/2026: no image that takes the whole screen), the name, its words, one piece. */}
      <section aria-labelledby="collection-title" className="relative isolate overflow-hidden bg-ink">
        <div className="wrap grid items-end gap-6 pt-24 pb-10 desk:pt-32 md:grid-cols-12  lg:pb-12">
          <div className={"md:col-span-7 " + shadow}>
            <Link to="/creations" data-cta className="btn-secondary text-bone">
              <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" /> {t.common.allCreations}
            </Link>
            <div className="mt-6">
              <SplitHeading as="h1" id="collection-title" eyebrow={isSub(collection) ? parentName : undefined} className="t-hero tracking-[0.12em]">
                {words.name}
              </SplitHeading>
              <p className="mt-4 max-w-xl text-base text-bone">{words.intro}</p>
              <p className="mt-4 inline-flex items-baseline gap-3 text-base uppercase tracking-[0.2em] text-mist lg:text-[0.75rem]" data-count>
                <Count text={t.collections.count(pieces.length)} numberClassName="text-rose-gold font-display text-2xl tracking-normal" />
              </p>
            </div>
          </div>
          {/* No photo in the opening: the photos of its pieces come right after it, each once on the page (24/11/2026). */}
        </div>
        <div className="wrap">
          <div className="rule-rose" aria-hidden="true" />
        </div>
      </section>

      {/* A collection with categories (the pendants, the chains): its categories first, then all its pieces (Yoni, 24/11/2026). */}
      {!isSub(collection) && subs.length > 0 ? (
        <section aria-labelledby="collection-categories" data-categories className="wrap pt-10  lg:pt-12">
          <h2 id="collection-categories" className="eyebrow">{t.collections.categories}</h2>
          {/* Their names and their number, without a photo: the photos of their pieces come right after (each photo once on
              the page, 24/11/2026). */}
          <ul className="mt-6 grid border-t border-white/12 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
            {subs.map((c) => (
              <li key={c.slug} className="border-b border-white/12">
                <Link to={collectionPath(c)} data-category={c.slug} className="group flex min-h-14 items-center justify-between gap-4 py-3">
                  <span className="title-caps t-sub tracking-[0.1em] text-white transition-colors duration-500 group-hover:text-rose-light">{collectionWords(t, c.slug, c).name}</span>
                  <span className="flex items-center gap-3 text-base text-mist">
                    {piecesOfCollection(cat, c).length}
                    <ArrowRight className="size-4 text-white transition-colors duration-500 group-hover:text-rose-light rtl:-scale-x-100" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* The pieces */}
      <section aria-label={t.collections.listLabel(words.name)} className="wrap pt-10 pb-20  lg:pt-14 lg:pb-28">
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
            <Link to="/contact" data-cta className="btn-primary mt-8">
              {t.common.startPiece}
            </Link>
          </div>
        ) : (
          <PieceGrid pieces={pieces} showType={false} />
        )}
      </section>

      {/* Other collections and the next step */}
      <section aria-labelledby="other-collections" className="border-t border-white/10">
        <div className="wrap grid gap-12 py-16 lg:grid-cols-2  lg:py-20">
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
            <h2 className="title-caps tracking-[0.12em] t-title ">{t.collections.ctaTitle}</h2>
            <p className="mt-6 max-w-md text-base text-bone">{t.collections.ctaText}</p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-x-8">
              <Link to="/contact" data-cta className="btn-primary">
                {t.collections.ctaButton}
              </Link>
              <a href={waLink(waMessage)} target="_blank" rel="noreferrer" data-cta className="btn-secondary">
                <BrandIcon name="whatsapp" className="size-4" /> {t.common.whatsapp}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
