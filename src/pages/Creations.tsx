import { useSearchParams } from "react-router";
import { ArrowRight } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import PieceCard from "@/components/PieceCard";
import Reveal from "@/components/Reveal";
import { COLLECTIONS } from "@/data/collections";
import type { PieceType } from "@/data/types";
import { collectionWords, Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";

/** Every piece, filterable by type. Each card opens /pieces/:slug. */
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
      <PageIntro eyebrow={t.creations.eyebrow} title={t.creations.title} lead={t.creations.lead} />

      <section aria-label={t.creations.listLabel} className="mx-auto max-w-[1600px] px-5 pb-28 sm:px-8 lg:px-12 lg:pb-36">
        <div role="group" aria-label={t.creations.filterLabel} className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
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
          <Link to={"/creations/" + collection.slug} className="mt-8 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-white hover:text-rose-light">
            {t.creations.enterCollection(collectionWords(t, collection.slug, collection).name)} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        ) : null}

        <div className="mt-12 lg:mt-16" aria-live="polite">
          {list.length === 0 ? (
            <div className="border border-white/15 p-10 text-center">
              <p className="title-caps text-2xl tracking-[0.14em]">{t.common.newPiecesTitle}</p>
              <p className="mt-4 text-lg text-bone">{t.common.newPiecesText}</p>
              <Link to="/contact" className="mt-8 inline-flex min-h-12 items-center bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink hover:bg-rose-light">
                {t.common.startPiece}
              </Link>
            </div>
          ) : (
            <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
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
