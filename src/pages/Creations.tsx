import { useSearchParams } from "react-router";
import { ArrowRight } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import PieceCard from "@/components/PieceCard";
import Reveal from "@/components/Reveal";
import { COLLECTIONS } from "@/data/collections";
import type { PieceType } from "@/data/types";
import { collectionWords, Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";

/**
 * Every piece, filterable by type. Each card opens /pieces/:slug. A dense grid (asked by Yoni, 20/11/2026): six pieces on
 * the first screen of a computer (1440 × 900) and about six more at each scroll, two columns on a phone.
 */
export default function Creations() {
  const { t } = useI18n();
  const { pieces } = useCatalogue();
  const ALL: { key: PieceType | "all"; param: string; label: string }[] = [
    { key: "all", param: "", label: t.creations.all },
    ...COLLECTIONS.map((c) => ({ key: c.type, param: c.slug, label: collectionWords(t, c.slug, c).name })),
  ];
  const [params, setParams] = useSearchParams();
  // Only the types that have pieces get a filter.
  const FILTERS = ALL.filter((f) => f.key === "all" || pieces.some((p) => p.type === f.key));
  const raw = (params.get("category") ?? "").toLowerCase();
  const active = ALL.find((f) => f.param === raw || f.key === raw)?.key ?? "all";
  const list = active === "all" ? pieces : pieces.filter((p) => p.type === active);
  const collection = COLLECTIONS.find((c) => c.type === active);

  const select = (param: string) => {
    const next = new URLSearchParams(params);
    if (param === "") next.delete("category");
    else next.set("category", param);
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
                className={"inline-flex min-h-12 shrink-0 items-center border px-6 text-base font-semibold uppercase tracking-[0.16em] transition-colors " + (on ? "border-rose-light text-rose-light" : "border-white/25 text-white hover:border-rose-light hover:text-rose-light")}
              >
                {f.label}
                <span className="ms-3 text-mist">{f.key === "all" ? pieces.length : pieces.filter((p) => p.type === f.key).length}</span>
              </button>
            );
          })}
        </div>

        {collection && list.length > 0 ? (
          <Link to={"/creations/" + collection.slug} className="mt-4 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-white hover:text-rose-light">
            {t.creations.enterCollection(collectionWords(t, collection.slug, collection).name)} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
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
            <ul data-creations-grid className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-y-10 xl:grid-cols-6">
              {list.map((p, i) => (
                <li key={p.slug}>
                  <Reveal delay={(i % 6) * 0.05}>
                    <PieceCard piece={p} eager={i < 6} priority={i === 0} showType={active === "all"} compact />
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
