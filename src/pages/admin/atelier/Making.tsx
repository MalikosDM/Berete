import { useState } from "react";
import { Check, CircleCheck, CircleDot, Circle, LoaderCircle, PackageCheck } from "lucide-react";
import { adminCall, btn, btnMain, inputCls } from "../ui";
import type { Section } from "./ProjectPage";
import { areaCls, Block, ErrorLine, labelCls, Saved, STEPS_FR, Tag, useFail, useFlash, when } from "./shared";

/*
 * The order and the making. « Accepter la commande » once the client approved the design priced by the quotation and
 * accepted that quotation; the making is authorized only when the order is accepted AND the deposit received (the server
 * decides). Then the ten steps: the current one set with a short note (the client reads it), the client told by e-mail or
 * not. From « Fabrication lancée » (the third step) the buttons wait for the making to be authorized.
 */

export default function Making({ token, project: p, reload, onExpired }: Section) {
  const [err, fail, setErr] = useFail(onExpired);
  const [saved, flash] = useFlash();
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);

  const q = p.quotes.find((x) => x.id === p.currentQuoteId) ?? null;
  const approved = Boolean(q && p.versions.find((v) => v.id === q.versionId)?.approved);
  const accepted = q?.status === "accepted";
  const canAccept = approved && accepted && !p.order.acceptedAt;
  const production = Boolean(p.order.productionAt);

  const acceptOrder = async () => {
    setBusy("order");
    setErr("");
    try {
      const r = await adminCall(token, "POST", "/api/admin/atelier/projects/" + p.id + "/order");
      await reload();
      flash(r.production ? "order-production" : "order");
    } catch (x) {
      fail(x);
    } finally {
      setBusy("");
    }
  };

  const setStep = async (step: number) => {
    setBusy("step" + step);
    setErr("");
    try {
      await adminCall(token, "PUT", "/api/admin/atelier/projects/" + p.id + "/step", { step, note: note.trim(), notify });
      setNote("");
      await reload();
      flash("step");
    } catch (x) {
      fail(x);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <Block id="commande" title="Commande" intro="La fabrication ne démarre que quand la commande est acceptée ET l'acompte reçu." data-order>
        <ul className="grid gap-2 text-base">
          <Check2 ok={approved} text={approved ? "Le client a validé le design chiffré par le devis" : "Le client n'a pas encore validé le design chiffré par le devis"} />
          <Check2 ok={accepted} text={accepted ? "Le client a accepté le devis Q" + q?.number : q ? "Le devis Q" + q.number + " attend l'accord du client" : "Aucun devis envoyé"} />
          <Check2 ok={Boolean(p.order.acceptedAt)} text={p.order.acceptedAt ? "Commande acceptée par Berete le " + when(p.order.acceptedAt) : "Commande pas encore acceptée par Berete"} />
          <Check2 ok={Boolean(p.money?.depositPaid)} text={p.money?.depositPaid ? "Acompte reçu" : "Acompte pas encore reçu"} />
          <Check2 ok={production} text={production ? "Fabrication autorisée le " + when(p.order.productionAt) : "Fabrication pas encore autorisée"} />
        </ul>
        {!p.order.acceptedAt ? (
          <div className="grid gap-2">
            <button type="button" className={btnMain + " justify-self-start"} onClick={() => void acceptOrder()} disabled={!canAccept || busy === "order"} data-accept-order>
              {busy === "order" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <PackageCheck className="size-4" aria-hidden="true" />} Accepter la commande
            </button>
            {!canAccept ? <p className="text-base text-mist">Le bouton s'active quand le client a validé le design et accepté le devis.</p> : null}
          </div>
        ) : null}
        <Saved show={saved === "order"} text="Commande acceptée : la fabrication démarrera dès que l'acompte sera reçu" />
        <Saved show={saved === "order-production"} text="Commande acceptée : la fabrication est autorisée" />
      </Block>

      <Block id="fabrication" title="Fabrication" intro="Les dix étapes que le client suit. Choisissez l'étape atteinte ; votre mot apparaît sous l'étape chez le client." data-making>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className={labelCls}>
            Un mot pour le client (facultatif, en anglais de préférence)
            <textarea name="stepNote" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={600} className={inputCls + " " + areaCls} placeholder="The stones are being set." />
          </label>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base text-white">
            <input type="checkbox" name="notify" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-5 accent-[#e8b4a0]" />
            Prévenir le client par e-mail
          </label>
        </div>
        {!production ? <p className="text-base text-rose-light">À partir de « {STEPS_FR[2]} », il faut la commande acceptée et l'acompte reçu.</p> : null}
        <ErrorLine text={err} />
        <Saved show={saved === "step"} text="Étape enregistrée" />
        <ol className="grid gap-2">
          {p.steps.map((s) => {
            const locked = s.index >= 2 && !production;
            const Icon = s.state === "done" ? CircleCheck : s.state === "current" ? CircleDot : Circle;
            return (
              <li key={s.index} className={"flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between " + (s.state === "current" ? "border-rose-light" : "border-white/10")} data-step={s.index} data-step-state={s.state}>
                <span className="flex min-w-0 items-start gap-3">
                  <Icon className={"mt-1 size-5 shrink-0 " + (s.state === "pending" ? "text-mist" : "text-rose-light")} aria-hidden="true" />
                  <span className="min-w-0 text-base">
                    <span className="block text-white">
                      {s.index + 1}. {STEPS_FR[s.index]} <span className="text-mist">· « {s.label} » chez le client</span>
                    </span>
                    {s.updatedAt ? <span className="mt-1 block text-mist">Le {when(s.updatedAt)}</span> : null}
                    {s.note ? <span className="mt-1 block whitespace-pre-line text-bone">{s.note}</span> : null}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {s.state === "current" ? <Tag tone="good">Étape actuelle</Tag> : null}
                  <button type="button" className={btn} onClick={() => void setStep(s.index)} disabled={locked || busy === "step" + s.index} data-set-step={s.index}>
                    {busy === "step" + s.index ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                    {s.index < p.step ? "Changer le mot" : s.index === p.step ? "Mettre à jour" : "Étape atteinte"}
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      </Block>
    </>
  );
}

function Check2({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-start gap-3">
      {ok ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-rose-light" aria-hidden="true" /> : <Circle className="mt-0.5 size-5 shrink-0 text-mist" aria-hidden="true" />}
      <span className={ok ? "text-white" : "text-bone"}>{text}</span>
    </li>
  );
}
