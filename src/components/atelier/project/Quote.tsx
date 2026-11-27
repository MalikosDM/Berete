/*
 * The quotation of a commission (data-project-section="quote"): the one in force in full (materials, price, fees, total, the
 * design fee already paid deducted, the lead time, the schedule, Yoni's terms as they were frozen with it, its PDF and the
 * fingerprint of that PDF), « ACCEPT QUOTATION » after a confirmation, or why it cannot be accepted yet; then the earlier
 * ones (replaced). Only what the server gives: the lines and their amounts are those of the PDF.
 */
import { useState, type ReactNode } from "react";
import { Check, FileText } from "lucide-react";
import { useI18n } from "@/i18n";
import { acceptQuote, day, money, type Project, type Quote } from "@/lib/atelier";
import { ConfirmDialog, Msg, SectionHead } from "../ui";

export function QuoteSection({ p, onChanged, onOut }: { p: Project; onChanged: () => Promise<void>; onOut: () => void }) {
  const { t, intl } = useI18n();
  const w = t.privateAtelier.quote;
  const current = p.quotes.find((q) => q.id === p.currentQuoteId) ?? null;
  const history = p.quotes.filter((q) => q.id !== p.currentQuoteId);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const fmt = (cents: number) => money(cents, p.currency, intl);

  const accept = async () => {
    if (!current) return;
    setBusy(true);
    setNote("");
    const a = await acceptQuote(p.id, current.id);
    setBusy(false);
    setConfirm(false);
    if (a.state === "out") return onOut();
    if (a.state === "approve-first") setNote(w.approveFirst);
    else if (a.state === "terms-missing") setNote(w.termsMissing);
    else if (a.state === "changed") setNote(w.changed);
    else if (a.state !== "ok") setNote(t.privateAtelier.error);
    await onChanged();
  };

  return (
    <section id="quote" data-project-section="quote" className="scroll-mt-28 border-t border-white/10 py-16 lg:py-20" aria-labelledby="quote-title">
      <SectionHead id="quote-title" eyebrow="02" title={w.title} />

      {!current && history.length === 0 ? <p className="piece-text mt-8 max-w-2xl">{w.none}</p> : null}

      {current ? (
        <article className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20" data-quote={current.number} data-status={current.status} data-current-quote>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <h3 className="title-caps t-sub tracking-[0.12em] text-white">{w.label(current.number)}</h3>
              <StatusTag q={current} />
            </div>
            <p className="mt-3 text-sm text-mist">
              {[current.versionNumber ? w.forVersion(current.versionNumber) : "", current.sentAt ? w.sentOn(day(current.sentAt, intl)) : ""].filter(Boolean).join(" · ")}
            </p>

            {current.materials.trim() ? (
              <Block title={w.materials}>
                <p className="piece-text whitespace-pre-line" dir="auto">{current.materials}</p>
              </Block>
            ) : null}

            <div className="mt-9">
              <dl className="grid gap-0 border-t border-white/10" data-quote-lines>
                <Row label={w.price} value={fmt(current.priceCents)} />
                {current.feesCents ? <Row label={current.feesLabel.trim() || w.fees} value={fmt(current.feesCents)} /> : null}
                <Row label={w.total} value={fmt(current.totalCents)} strong data="total" />
                {p.designFee.cents ? <Row label={w.designFee} value={"− " + fmt(p.designFee.cents)} /> : null}
                {p.designFee.cents ? <Row label={w.remaining} value={fmt(Math.max(0, current.totalCents - p.designFee.cents))} strong /> : null}
              </dl>
            </div>

            {current.leadTime.trim() ? (
              <Block title={w.leadTime}>
                <p className="piece-text whitespace-pre-line" dir="auto">{current.leadTime}</p>
              </Block>
            ) : null}
            {current.schedule.trim() ? (
              <Block title={w.schedule}>
                <p className="piece-text whitespace-pre-line" dir="auto">{current.schedule}</p>
              </Block>
            ) : null}
          </div>

          <div className="min-w-0 lg:sticky lg:top-32 lg:self-start">
            {current.terms.trim() ? (
              <div>
                <h4 className="text-xs font-medium uppercase tracking-[0.22em] text-mist">{w.terms}</h4>
                <div className="mt-3 max-h-80 overflow-y-auto border border-white/10 bg-ink-soft px-5 py-4 text-base leading-relaxed whitespace-pre-line text-bone" tabIndex={0} dir="auto" data-quote-terms>
                  {current.terms}
                </div>
              </div>
            ) : null}

            {current.pdfUrl ? (
              <div className="mt-8">
                <a href={current.pdfUrl} target="_blank" rel="noreferrer" className="btn-secondary" data-quote-pdf>
                  <FileText className="size-4" aria-hidden="true" /> {w.pdf}
                </a>
                {current.sha256 ? (
                  <p className="mt-2 text-xs text-mist">
                    {w.fingerprint}
                    <span className="mt-1 block font-mono text-[0.6875rem] leading-snug break-all text-mist/80" data-quote-sha>
                      {current.sha256}
                    </span>
                  </p>
                ) : null}
              </div>
            ) : null}

            {current.status === "sent" ? (
              <div className="mt-10">
                <button type="button" onClick={() => setConfirm(true)} disabled={p.canAccept !== "ok"} data-accept-quote className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
                  {w.accept}
                </button>
                {p.canAccept === "approve-first" || p.canAccept === "terms-missing" ? (
                  <p className="mt-4 text-base text-bone" data-quote-blocked={p.canAccept}>
                    {p.canAccept === "approve-first" ? w.approveFirst : w.termsMissing}
                  </p>
                ) : null}
              </div>
            ) : current.status === "accepted" ? (
              <p className="mt-10 flex items-start gap-3 border border-rose-light/40 px-5 py-4 text-base text-white" data-quote-accepted>
                <Check className="mt-0.5 size-5 shrink-0 text-rose-light" aria-hidden="true" />
                {w.acceptedOn(day(current.acceptedAt, intl))}
              </p>
            ) : null}
            {note ? <Msg tone="error" className="mt-4">{note}</Msg> : null}
          </div>
        </article>
      ) : null}

      {history.length > 0 ? (
        <div className="mt-14">
          <h3 className="text-xs font-medium uppercase tracking-[0.22em] text-mist">{w.history}</h3>
          <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {history.map((q) => (
              <li key={q.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between" data-quote={q.number} data-status={q.status}>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-base text-white">{w.label(q.number)}</span>
                    <StatusTag q={q} />
                  </p>
                  <p className="mt-1 text-sm text-mist">
                    {[q.versionNumber ? w.forVersion(q.versionNumber) : "", q.sentAt ? w.sentOn(day(q.sentAt, intl)) : "", q.supersededAt ? w.supersededOn(day(q.supersededAt, intl)) : "", fmt(q.totalCents)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {q.pdfUrl ? (
                  <a href={q.pdfUrl} target="_blank" rel="noreferrer" className="btn-secondary shrink-0" data-history-pdf>
                    <FileText className="size-4" aria-hidden="true" /> {w.pdf}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {confirm && current ? (
        <ConfirmDialog kind="accept-quote" title={w.confirmTitle} yes={w.confirmYes} busy={busy} onYes={() => void accept()} onNo={() => setConfirm(false)}>
          <p>{w.confirmBody(current.number, fmt(current.totalCents))}</p>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}

function StatusTag({ q }: { q: Quote }) {
  const { t } = useI18n();
  const w = t.privateAtelier.quote;
  return <span className={"text-xs font-medium uppercase tracking-[0.2em] " + (q.status === "superseded" ? "text-mist" : "text-rose-light")}>{w.status[q.status]}</span>;
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-9">
      <h4 className="text-xs font-medium uppercase tracking-[0.22em] text-mist">{title}</h4>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Row({ label, value, strong = false, data }: { label: string; value: string; strong?: boolean; data?: "total" }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-white/10 py-3">
      <dt className={"text-base " + (strong ? "text-white" : "text-bone")}>{label}</dt>
      <dd className={"text-end tabular-nums " + (strong ? "text-lg text-white" : "text-base text-bone")} data-quote-total={data === "total" ? "" : undefined}>
        <bdi>{value}</bdi>
      </dd>
    </div>
  );
}
