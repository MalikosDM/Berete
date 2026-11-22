import { useSearchParams } from "react-router";
import { ArrowRight } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import PieceCard from "@/components/PieceCard";
import Reveal from "@/components/Reveal";
import { COLLECTIONS, collectionPath, piecesOfCollection, subcategoriesOf } from "@/data/collections";
import type { PieceType } from "@/data/types";
import { collectionWords, Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";

/**
 * Every piece, filterable by type, then by sub-category (Pendants > Jesus Pieces, ?category=pendants&sub=jesus-pieces). Each
 * card opens /pieces/:slug. Three pieces on a row on a computer, larger (asked by Yoni, 22/11/2026: the dense grid of six
 * was too small), two on a tablet, one on a phone.
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

      <section aria-label={t.creations.listLabel} className="mx-auto max-w-[1600px] px-4 pb-28 sm:px-8 lg:px-12 lg:pb-36">
        <div role="group" aria-label={t.creations.filterLabel} className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTERS.map((f) => {
            const on = f.key === active;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => select(f.param)}
                aria-pressed={on}
                data-filter={f.key}
                className={"inline-flex min-h-12 shrink-0 items-center border px-6 text-base font-semibold uppercase tracking-[0.16em] transition-colors " + (on ? "border-rose-light text-rose-light" : "border-white/25 text-white hover:border-rose-light hover:text-rose-light")}
              >
                {f.label}
                <span data-filter-count className="ms-3 text-mist">{f.key === "all" ? pieces.length : pieces.filter((p) => p.type === f.key).length}</span>
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
                  className={"inline-flex min-h-12 shrink-0 items-center gap-2.5 px-5 text-base font-semibold uppercase tracking-[0.14em] transition-colors " + (on ? "bg-rose-light/10 text-rose-light" : "text-bone hover:text-rose-light")}
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
          <Link to={collectionPath(sub ?? collection)} className="mt-4 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-white hover:text-rose-light">
            {t.creations.enterCollection(sub ? collectionWords(t, sub.slug, sub).name : collectionName)} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        ) : null}

        <div className="mt-6 lg:mt-8" aria-live="polite">
          {list.length === 0 ? (
            <div className="border border-white/15 p-10 text-center">
              <p className="title-caps text-2xl tracking-[0.14em]">{t.common.newPiecesTitle}</p>
              <p className="mt-4 text-lg text-bone">{t.common.newPiecesText}</p>
              <Link to="/contact" className="mt-8 inline-flex min-h-12 items-center bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink hover:bg-rose-light">
                {t.common.startPiece}
              </Link>
            </div>
          ) : (
            <ul data-creations-grid className="grid grid-cols-1 gap-y-14 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-20">
              {list.map((p, i) => (
                <li key={p.slug}>
                  <Reveal delay={(i % 3) * 0.08}>
                    <PieceCard piece={p} eager={i < 3} priority={i === 0} showType={active === "all"} />
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
