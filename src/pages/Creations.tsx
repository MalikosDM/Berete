import { Link, Navigate, useParams, useSearchParams } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { MediaView } from "@/components/Media";
import PageIntro from "@/components/PageIntro";
import Reveal from "@/components/Reveal";
import { TYPE_LABELS } from "@/data/relations";
import type { PieceType } from "@/data/types";
import { useCatalogue } from "@/lib/catalogue";

const FILTERS: { key: PieceType | "all"; param: string; label: string }[] = [
  { key: "all", param: "", label: "All" },
  { key: "chain", param: "chains", label: "Chains" },
  { key: "pendant", param: "pendants", label: "Pendants" },
  { key: "ring", param: "rings", label: "Rings" },
  { key: "bracelet", param: "bracelets", label: "Bracelets" },
  { key: "watch", param: "watches", label: "Watches" },
];

/** Every piece, filterable by type. Each card opens /pieces/:slug. */
export default function Creations() {
  const { pieces } = useCatalogue();
  const [params, setParams] = useSearchParams();
  const raw = (params.get("category") ?? "").toLowerCase();
  const active = FILTERS.find((f) => f.param === raw || f.key === raw)?.key ?? "all";
  const list = active === "all" ? pieces : pieces.filter((p) => p.type === active);

  const select = (param: string) => {
    const next = new URLSearchParams(params);
    if (param === "") next.delete("category");
    else next.set("category", param);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  return (
    <>
      <PageIntro eyebrow="Creations" title="The Creations" lead="Chains, pendants, rings, bracelets and watches. Each piece is drawn for one person, one club, one moment, then crafted in Dubai." />

      <section aria-label="All pieces" className="mx-auto max-w-[1600px] px-5 pb-28 sm:px-8 lg:px-12 lg:pb-36">
        <div role="group" aria-label="Filter the pieces" className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
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
              </button>
            );
          })}
        </div>

        <div className="mt-12 lg:mt-16" aria-live="polite">
          {list.length === 0 ? (
            <div className="border border-white/15 p-10 text-center">
              <p className="title-caps text-2xl tracking-[0.14em]">New pieces are being crafted</p>
              <p className="mt-4 text-lg text-bone">This collection will be revealed soon. Start yours in the meantime.</p>
              <Link to="/contact" className="mt-8 inline-flex min-h-12 items-center bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink hover:bg-rose-light">
                Start your piece
              </Link>
            </div>
          ) : (
            <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
              {list.map((p, i) => (
                <li key={p.slug}>
                  <Reveal delay={(i % 3) * 0.08}>
                    <Link to={"/pieces/" + p.slug} className="group block">
                      <span className="relative block aspect-[4/5] overflow-hidden bg-ink">
                        <span className="absolute inset-0 p-4 transition-transform duration-[1.6s] ease-out group-hover:scale-105">
                          <MediaView item={p.cover} alt={p.title} fit="contain" eager={i < 3} />
                        </span>
                        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-rose-light/20 to-transparent transition-transform duration-[1.6s] ease-out group-hover:translate-x-full" />
                      </span>
                      <span className="mt-5 flex items-start justify-between gap-4">
                        <span className="min-w-0">
                          <span className="title-caps block text-2xl tracking-[0.08em] break-words text-white [text-wrap:balance] group-hover:text-rose-light sm:text-3xl">{p.title}</span>
                          <span className="mt-2 block text-base text-mist">
                            {TYPE_LABELS[p.type]}
                            {p.clientPublic && p.client ? " · " + p.client : ""}
                          </span>
                        </span>
                        <ArrowUpRight className="size-6 shrink-0 text-white transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-rose-light" aria-hidden="true" />
                      </span>
                    </Link>
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

/** Old /creations/:slug addresses lead to the single piece page. */
export function CreationRedirect() {
  const { slug = "" } = useParams();
  return <Navigate to={slug ? "/pieces/" + slug : "/creations"} replace />;
}
