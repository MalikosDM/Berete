/*
 * The payment of a commission (data-payment), only once the final design is approved and the quotation accepted: the total,
 * what is already received (the design fee included), what remains, and the exact amount of each option the server offers
 * (« PAY 50% DEPOSIT », « PAY 100% », then the balance): the server opens the page of Stripe, the card never passes here. When
 * the payment online is not open (switched off, or the keys of Stripe missing): « Contact BERETE to confirm your commission ».
 * Back from Stripe (?payment=done): the page waits for the notification of Stripe (the only confirmation of a payment).
 */
import { useState } from "react";
import { Check, FileText, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n";
import { day, money, pay, type PayOption, type Project } from "@/lib/atelier";
import { Msg, SectionHead, Spinner, WhatsAppLink } from "../ui";

export type Return = { kind: "done"; confirmed: boolean; slow: boolean } | { kind: "cancelled" } | null;

export function PaymentSection({ p, returned, onChanged, onOut }: { p: Project; returned: Return; onChanged: () => Promise<void>; onOut: () => void }) {
  const { t, intl } = useI18n();
  const w = t.privateAtelier.payment;
  const [busy, setBusy] = useState<PayOption | null>(null);
  const [note, setNote] = useState("");
  const m = p.money;
  const block = p.payment.block;
  const fmt = (cents: number, currency = p.currency) => money(cents, currency, intl);

  const start = async (option: PayOption) => {
    setBusy(option);
    setNote("");
    const a = await pay(p.id, option);
    if (a.state === "ok") {
      window.location.assign(a.url);
      return;
    }
    setBusy(null);
    if (a.state === "out") return onOut();
    if (a.state === "unavailable") setNote(w.unavailable);
    else if (a.state === "error" || a.state === "bad" || a.state === "missing") setNote(t.privateAtelier.error);
    await onChanged();
  };

  return (
    <section id="payment" data-project-section="payment" className="scroll-mt-28 border-t border-white/10 py-16 lg:py-20" aria-labelledby="payment-title">
      <div data-payment data-block={block ?? "none"}>
        <SectionHead id="payment-title" eyebrow="03" title={w.title} />

        {returned?.kind === "done" ? (
          <p role="status" className="mt-8 flex items-start gap-3 border border-rose-light/40 px-5 py-4 text-base text-white" data-payment-done data-confirmed={returned.confirmed ? "true" : undefined}>
            {returned.confirmed ? <Check className="mt-0.5 size-5 shrink-0 text-rose-light" aria-hidden="true" /> : <Spinner className="mt-0.5 size-5 shrink-0 text-rose-light" />}
            <span>
              {returned.confirmed ? w.confirmed : w.done}
              {!returned.confirmed && returned.slow ? <span className="mt-2 block text-sm text-mist">{w.slow}</span> : null}
            </span>
          </p>
        ) : returned?.kind === "cancelled" ? (
          <p role="status" className="mt-8 border border-white/15 px-5 py-4 text-base text-bone" data-payment-cancelled>
            {w.cancelled}
          </p>
        ) : null}

        {!m ? (
          <p className="piece-text mt-8 max-w-2xl" data-payment-locked>
            {w.locked}
          </p>
        ) : (
          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
            <dl className="grid content-start border-t border-white/10">
              <div className="flex items-baseline justify-between gap-6 border-b border-white/10 py-4">
                <dt className="text-base text-bone">{w.total}</dt>
                <dd className="text-end text-lg text-white tabular-nums" data-money-total>
                  <bdi>{fmt(m.total, m.currency)}</bdi>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-6 border-b border-white/10 py-4">
                <dt className="text-base text-bone">{w.credited}</dt>
                <dd className="text-end text-base text-bone tabular-nums" data-money-credited>
                  <bdi>{fmt(m.credited, m.currency)}</bdi>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-6 border-b border-white/10 py-4">
                <dt className="text-base text-white">{w.remaining}</dt>
                <dd className="text-end text-lg text-white tabular-nums" data-money-remaining>
                  <bdi>{fmt(m.remaining, m.currency)}</bdi>
                </dd>
              </div>
            </dl>

            <div className="min-w-0">
              {block === "paid" ? (
                <p className="flex items-start gap-3 text-base text-white" data-payment-paid-all>
                  <Check className="mt-0.5 size-5 shrink-0 text-rose-light" aria-hidden="true" /> {w.paidAll}
                </p>
              ) : block === "off" || block === "keys" ? (
                <div data-payment-contact={block}>
                  <WhatsAppLink message={w.contactMessage(p.title)} className="btn-primary w-full sm:w-auto">
                    {w.contact}
                  </WhatsAppLink>
                </div>
              ) : p.payment.options.length > 0 ? (
                <div className="grid gap-4">
                  {p.payment.options.map((o) => (
                    <button
                      key={o.kind}
                      type="button"
                      onClick={() => void start(o.kind)}
                      disabled={busy !== null}
                      data-pay-option={o.kind}
                      className="group flex min-h-16 w-full items-center justify-between gap-4 border border-rose-light/55 px-6 py-4 text-start transition-colors hover:border-rose-light disabled:opacity-60"
                    >
                      <span className="text-sm font-medium uppercase tracking-[0.18em] text-white group-hover:text-rose-light">{w.options[o.kind]}</span>
                      <span className="flex items-center gap-3 text-lg text-white tabular-nums" data-pay-amount>
                        {busy === o.kind ? <Spinner /> : null}
                        <bdi>{fmt(o.amount, m.currency)}</bdi>
                      </span>
                    </button>
                  ))}
                  {busy ? (
                    <p role="status" className="text-sm text-mist">
                      {w.redirecting}
                    </p>
                  ) : null}
                  <p className="mt-2 flex items-start gap-3 text-sm text-mist">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-rose-light" aria-hidden="true" />
                    <span>
                      {w.secure}
                      {p.payment.methods.includes("bank_transfer") ? " " + w.transfer : ""}
                    </span>
                  </p>
                  {p.payment.testMode ? (
                    <p className="text-sm text-rose-light" data-payment-test>
                      {w.testMode}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {note ? <Msg tone="error" className="mt-4">{note}</Msg> : null}
            </div>
          </div>
        )}

        {p.payments.length > 0 ? (
          <div className="mt-14">
            <h3 className="text-xs font-medium uppercase tracking-[0.22em] text-mist">{w.received}</h3>
            <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
              {p.payments.map((x) => (
                <li key={x.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between" data-paid={x.kind}>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-4">
                      <span className="text-base text-white tabular-nums">{fmt(x.amountCents, x.currency)}</span>
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-rose-light">{w.kinds[x.kind] ?? x.kind}</span>
                    </p>
                    <p className="mt-1 text-sm text-mist">{[x.paidAt ? w.paidOn(day(x.paidAt, intl)) : "", x.method ?? ""].filter(Boolean).join(" · ")}</p>
                  </div>
                  {x.receiptUrl ? (
                    <a href={x.receiptUrl} target="_blank" rel="noreferrer" className="btn-secondary shrink-0" data-receipt>
                      <FileText className="size-4" aria-hidden="true" /> {w.receipt(x.receiptNumber ?? "")}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
