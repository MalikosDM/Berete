import { FileText } from "lucide-react";
import { btn } from "../ui";
import type { Section } from "./ProjectPage";
import { Block, money, PAYMENT_KIND_FR, PAYMENT_STATUS_FR, Tag, when } from "./shared";

/*
 * The money of a project, as the server counts it (the page never computes an amount): the total of the accepted quotation,
 * the design fee paid at the start, the payments confirmed by Stripe, what remains, the deposit (50 %, the design fee
 * counting towards it). Then every payment, with its state and its receipt, and whether the client can pay online now.
 */

const BLOCK_FR: Record<string, string> = {
  off: "Le paiement en ligne est coupé (Réglages) : le client ne voit pas de bouton pour payer.",
  keys: "Les clés Stripe ne sont pas encore réglées sur le serveur : le client ne peut pas payer en ligne.",
  quote: "Le client pourra payer une fois un devis accepté.",
  approve: "Le client doit d'abord valider la version du design chiffrée par le devis.",
  paid: "Tout est payé.",
};

export default function Payments({ project: p }: Section) {
  const m = p.money;
  const options = p.payment.options;

  return (
    <Block id="paiements" title="Paiements" intro="Les montants sont calculés par le serveur. Un paiement n'est confirmé que par Stripe : jamais à la main." data-payments>
      {m ? (
        <dl className="grid gap-x-6 gap-y-2 text-base sm:grid-cols-[16rem_1fr]" data-money>
          <dt className="text-mist">Total du devis accepté</dt>
          <dd className="text-white">{money(m.total, m.currency)}</dd>
          <dt className="text-mist">Frais de design payés au départ</dt>
          <dd className="text-white">{money(m.designFee, m.currency)}</dd>
          <dt className="text-mist">Paiements reçus</dt>
          <dd className="text-white">{money(m.paid, m.currency)}</dd>
          <dt className="text-mist">Total déjà reçu</dt>
          <dd className="text-white">{money(m.credited, m.currency)}</dd>
          <dt className="text-mist">Reste à payer</dt>
          <dd className="text-white">{money(m.remaining, m.currency)}</dd>
          <dt className="text-mist">Acompte (50 %)</dt>
          <dd className={m.depositPaid ? "text-rose-light" : "text-white"}>{m.depositPaid ? "Reçu" : "Reste " + money(m.deposit, m.currency) + " à recevoir"}</dd>
        </dl>
      ) : (
        <p className="text-base text-mist">Les montants apparaîtront quand le client aura accepté un devis.</p>
      )}

      <div className="grid gap-2 border-t border-white/10 pt-4">
        <p className="text-base text-white">Paiement en ligne {p.payment.testMode ? <Tag>Mode test Stripe</Tag> : null}</p>
        {p.payment.block ? (
          <p className="text-base text-bone">{BLOCK_FR[p.payment.block] ?? p.payment.block}</p>
        ) : (
          <p className="text-base text-bone">
            Le client peut payer maintenant :{" "}
            {options.map((o, i) => (
              <span key={o.kind}>
                {i > 0 ? " ou " : ""}
                {PAYMENT_KIND_FR[o.kind] ?? o.kind} ({money(o.amount, p.currency)})
              </span>
            ))}
            {p.payment.methods.includes("bank_transfer") ? ", par carte ou virement bancaire." : ", par carte (Apple Pay et Google Pay compris)."}
          </p>
        )}
      </div>

      <div className="grid gap-3 border-t border-white/10 pt-4">
        <p className="text-base text-white">Tous les paiements</p>
        {p.payments.length === 0 ? (
          <p className="text-base text-mist">Aucun paiement pour l'instant.</p>
        ) : (
          <ul className="grid gap-2">
            {p.payments.map((x) => (
              <li key={x.id} className="flex flex-col gap-3 border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between" data-payment={x.status}>
                <span className="min-w-0 text-base">
                  <span className="block text-white">
                    {PAYMENT_KIND_FR[x.kind] ?? x.kind} · {money(x.amountCents, x.currency)}
                  </span>
                  <span className="mt-1 block text-mist">
                    {x.paidAt ? "Payé le " + when(x.paidAt) : "Commencé le " + when(x.createdAt)}
                    {x.method ? " · " + (x.method === "Bank transfer" ? "virement bancaire" : x.method === "Card" ? "carte" : x.method) : ""}
                    {x.receiptNumber ? " · reçu " + x.receiptNumber : ""}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-3">
                  <Tag tone={x.status === "paid" ? "good" : x.status === "review" ? "wait" : "neutral"}>{PAYMENT_STATUS_FR[x.status] ?? x.status}</Tag>
                  {x.receiptUrl ? (
                    <a href={x.receiptUrl} target="_blank" rel="noreferrer" className={btn}>
                      <FileText className="size-4" aria-hidden="true" /> Reçu
                    </a>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Block>
  );
}
