/*
 * The making of the piece (data-steps), like a parcel tracking: the ten steps of Yoni (Design Approved … Delivered), each
 * done, in progress or to come, with the day of its last update and the word of the atelier; the delivery date or window only
 * when Berete set one (never a promise otherwise).
 */
import { Check, Truck } from "lucide-react";
import { useI18n } from "@/i18n";
import { day, type Project } from "@/lib/atelier";
import { SectionHead } from "../ui";

export function MakingSection({ p }: { p: Project }) {
  const { t, intl } = useI18n();
  const w = t.privateAtelier.making;
  const from = p.delivery?.from ?? null;
  const to = p.delivery?.to ?? null;
  const when = from && to && from !== to ? w.between(day(from, intl), day(to, intl)) : from || to ? w.on(day(from ?? to, intl)) : "";

  return (
    <section id="making" data-project-section="making" className="scroll-mt-28 border-t border-white/10 py-16 lg:py-20" aria-labelledby="making-title">
      <SectionHead id="making-title" eyebrow="04" title={w.title} />
      <p className="mt-4 max-w-2xl text-base text-bone">{w.intro}</p>

      <div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20">
        <ol data-steps data-step-reached={p.step}>
          {p.steps.map((s, i) => {
            const last = i === p.steps.length - 1;
            return (
              <li key={s.index} className="flex gap-5" data-step={s.index} data-state={s.state} aria-current={s.state === "current" ? "step" : undefined}>
                <span className="flex flex-col items-center" aria-hidden="true">
                  <span
                    className={
                      "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors " +
                      (s.state === "done" ? "border-rose-light bg-rose-light text-ink" : s.state === "current" ? "border-rose-light shadow-[0_0_0_6px_rgba(232,180,160,0.12)]" : "border-white/25")
                    }
                  >
                    {s.state === "done" ? <Check className="size-3" strokeWidth={2.5} /> : s.state === "current" ? <span className="size-2 rounded-full bg-rose-light" /> : null}
                  </span>
                  {!last ? <span className={"my-2 w-px flex-1 " + (s.state === "done" ? "bg-rose-light/60" : "bg-white/12")} /> : null}
                </span>
                <div className={"min-w-0 " + (!last ? "pb-8" : "")}>
                  <p className={"text-xs font-medium uppercase tracking-[0.22em] " + (s.state === "pending" ? "text-white/50" : "text-rose-light")}>
                    <span className="tabular-nums">{String(s.index + 1).padStart(2, "0")}</span>
                    <span className="mx-2 opacity-60">·</span>
                    {w.state[s.state]}
                  </p>
                  <h3 className={"title-caps mt-2 text-base break-words " + (s.state === "current" ? "text-white" : s.state === "done" ? "text-bone" : "text-white/50")}>{w.steps[s.index] ?? s.label}</h3>
                  {s.updatedAt ? <p className="mt-1 text-sm text-mist">{w.updated(day(s.updatedAt, intl))}</p> : null}
                  {s.note ? <p className="mt-2 max-w-prose text-base whitespace-pre-line text-bone" dir="auto">{s.note}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>

        {when ? (
          <div className="lg:sticky lg:top-32 lg:self-start" data-delivery>
            <div className="border border-white/10 px-6 py-6">
              <p className="eyebrow flex items-center gap-3">
                <Truck className="size-4" aria-hidden="true" /> {w.delivery}
              </p>
              <p className="title-caps t-sub mt-4 tracking-[0.1em] text-white">{when}</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
