import { useSearchParams } from "react-router";
import { ArrowRight } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import PieceGrid from "@/components/PieceGrid";
import { COLLECTIONS, collectionPath, piecesOfCollection, subcategoriesOf } from "@/data/collections";
import type { PieceType } from "@/data/types";
import { collectionWords, Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";

/**
 * Every piece, filterable by type, then by sub-category (Pendants > Jesus Pieces, ?category=pendants&sub=jesus-pieces), in a
 * grid of equal cards, 3 by 3 (src/components/PieceGrid.tsx; Yoni, 23/11/2026: no carousel any more). Each opens
 * /pieces/:slug.
 */
export default function Creations() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const { pieces } = cat;
  const ALL: { key: PieceType | "all"; param: string; label: string }[] = [
    { key: "all", param: "", label: t.creations.all },
    ...COLLECTIONS.map((c) => ({ key: c.type, param: c.slug, label: collectionWords(t, c.slug, c).name })),
  ];
  const [params, setParams] = useSearchParams();
  // Only the types that have pieces get a filter.
  const FILTERS = ALL.filter((f) => f.key === "all" || pieces.some((p) => p.type === f.key));
  const raw = (params.get("category") ?? "").toLowerCase();
  const active = ALL.find((f) => f.param === raw || f.key === raw)?.key ?? "all";
  const collection = COLLECTIONS.find((c) => c.type === active);
  // The sub-categories of the chosen collection (Pendants: Jesus Pieces), and the one chosen.
  const subs = collection ? subcategoriesOf(cat, collection.type) : [];
  const sub = subs.find((s) => s.slug === (params.get("sub") ?? "").toLowerCase());
  const list = sub ? piecesOfCollection(cat, sub) : active === "all" ? pieces : pieces.filter((p) => p.type === active);
  const collectionName = collection ? collectionWords(t, collection.slug, collection).name : "";

  const select = (param: string, subSlug = "") => {
    const next = new URLSearchParams(params);
    if (param === "") next.delete("category");
    else next.set("category", param);
    if (subSlug === "") next.delete("sub");
    else next.set("sub", subSlug);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  return (
    <>
      <PageIntro eyebrow={t.creations.eyebrow} title={t.creations.title} lead={t.creations.lead} compact />

      <section aria-label={t.creations.listLabel} className="wrap pb-20  lg:pb-28">
        <div role="group" aria-label={t.creations.filterLabel} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTERS.map((f) => {
            const on = f.key === active;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => select(f.param)}
                aria-pressed={on}
                data-filter={f.key}
                className={"inline-flex min-h-12 shrink-0 items-center border px-4 text-base font-normal uppercase tracking-[0.14em] transition-colors lg:min-h-10 lg:text-[0.75rem] " + (on ? "border-rose-light text-rose-light" : "border-white/20 text-white hover:border-rose-light hover:text-rose-light")}
              >
                {f.label}
                <span data-filter-count className="ms-2.5 text-mist">{f.key === "all" ? pieces.length : pieces.filter((p) => p.type === f.key).length}</span>
              </button>
            );
          })}
        </div>

        {collection && subs.length > 0 ? (
          // Inside the chosen collection, its sub-categories (Pendants: all of them, Jesus Pieces).
          <div role="group" aria-label={t.collections.subLabel(collectionName)} data-subfilters className="no-scrollbar -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
            {[null, ...subs].map((s) => {
              const on = (s?.slug ?? "") === (sub?.slug ?? "");
              return (
                <button
                  key={s?.slug ?? "all"}
                  type="button"
                  onClick={() => select(collection.slug, s?.slug ?? "")}
                  aria-pressed={on}
                  data-subfilter={s?.slug ?? "all"}
                  className={"inline-flex min-h-12 shrink-0 items-center gap-2.5 px-4 text-base font-normal uppercase tracking-[0.12em] transition-colors lg:min-h-10 lg:text-[0.75rem] " + (on ? "bg-rose-light/10 text-rose-light" : "text-bone hover:text-rose-light")}
                >
                  <span aria-hidden="true" className={"h-px w-3 " + (on ? "bg-rose-light" : "bg-white/40")} />
                  {s ? collectionWords(t, s.slug, s).name : t.collections.subAll(collectionName)}
                  <span className="text-mist">{s ? piecesOfCollection(cat, s).length : pieces.filter((p) => p.type === collection.type).length}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {collection && list.length > 0 ? (
          <Link to={collectionPath(sub ?? collection)} data-cta className="btn-secondary mt-3">
            {sub ? collectionWords(t, sub.slug, sub).name : collectionName} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        ) : null}

        <div className="mt-6 lg:mt-8" aria-live="polite">
          {list.length === 0 ? (
            <div className="border border-white/15 p-10 text-center">
              <p className="title-caps text-2xl tracking-[0.14em]">{t.common.newPiecesTitle}</p>
              <p className="mt-4 text-base text-bone">{t.common.newPiecesText}</p>
              <Link to="/contact" data-cta className="btn-primary mt-8">
                {t.common.startPiece}
              </Link>
            </div>
          ) : (
            <PieceGrid key={active + "/" + (sub?.slug ?? "")} pieces={list} showType={active === "all"} />
          )}
        </div>
      </section>
    </>
  );
}
