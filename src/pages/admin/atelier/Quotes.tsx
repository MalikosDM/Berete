import { useState, type FormEvent } from "react";
import { Check, FileText, LoaderCircle, Plus, Send } from "lucide-react";
import { adminCall, btn, btnMain, inputCls } from "../ui";
import type { Section } from "./ProjectPage";
import { areaCls, Block, centsToText, deviceOf, labelCls, money, QUOTE_STATUS_FR, Saved, Tag, toCents, useFail, useFlash, when, type QuoteView } from "./shared";

/*
 * The quotations: a draft says which published version it prices, the materials and features, the final price, possible
 * fees and their name, the lead time and the schedule of payments. « Envoyer au client » freezes it as a PDF (its
 * fingerprint kept) with Yoni's commercial terms of that day; a quotation sent never changes: a new one replaces it (the
 * old one is marked « remplacé ») and asks for a new acceptance. Without the commercial terms written, nothing is sent: a
 * clear message leads to the settings.
 */

type Form = { versionId: string; materials: string; price: string; fees: string; feesLabel: string; leadTime: string; schedule: string };

const formOf = (q: QuoteView | null, versionId: string): Form =>
  q
    ? { versionId: q.versionId ?? "", materials: q.materials, price: q.priceCents ? centsToText(q.priceCents) : "", fees: q.feesCents ? centsToText(q.feesCents) : "", feesLabel: q.feesLabel, leadTime: q.leadTime, schedule: q.schedule }
    : { versionId, materials: "", price: "", fees: "", feesLabel: "", leadTime: "", schedule: "" };

function bodyOf(f: Form): Record<string, unknown> | string {
  const price = toCents(f.price);
  const fees = toCents(f.fees);
  if (price === null) return "Le prix n'est pas un nombre (exemple : 12500 ou 12500,50).";
  if (fees === null) return "Les frais ne sont pas un nombre (exemple : 250).";
  return { versionId: f.versionId || null, materials: f.materials.trim(), priceCents: price, feesCents: fees, feesLabel: f.feesLabel.trim(), leadTime: f.leadTime.trim(), schedule: f.schedule.trim() };
}

export default function Quotes({ token, project: p, reload, onExpired, termsWritten, openSettings }: Section & { termsWritten: boolean; openSettings: () => void }) {
  const [err, fail, setErr] = useFail(onExpired);
  const [sendErr, setSendErr] = useState<{ number: number; text: string } | null>(null);
  const [saved, flash] = useFlash();
  const [busy, setBusy] = useState("");
  const published = p.versions.filter((v) => v.publishedAt);
  const defaultVersion = p.latestVersionId ?? published[0]?.id ?? "";

  const send = async (q: QuoteView) => {
    setBusy("s" + q.id);
    setSendErr(null);
    setErr("");
    try {
      await adminCall(token, "POST", "/api/admin/atelier/projects/" + p.id + "/quotes/" + q.id + "/send");
      await reload();
      flash("sent");
    } catch (x) {
      if (x instanceof Error && x.message === "expired") return onExpired();
      setSendErr({ number: q.number, text: x instanceof Error ? x.message : "Envoi impossible." });
    } finally {
      setBusy("");
    }
  };

  const termsLink = (
    <button type="button" onClick={openSettings} className="inline-flex min-h-12 items-center text-base text-white underline underline-offset-4 hover:text-rose-light" data-terms-link>
      Écrire mes conditions commerciales (Réglages)
    </button>
  );

  return (
    <Block id="devis" title="Devis" intro="Un devis envoyé est figé en PDF, avec vos conditions commerciales du jour. Pour changer quelque chose, faites un nouveau devis : l'ancien sera marqué « remplacé »." data-quotes>
      {!termsWritten ? (
        <div className="grid gap-1 border border-rose-light bg-rose-deep/25 p-4" data-terms-missing>
          <p className="text-base text-white">Vos conditions commerciales ne sont pas encore écrites : aucun devis ne peut être envoyé ni accepté par un client.</p>
          {termsLink}
        </div>
      ) : null}

      <NewQuote key={p.quotes.length + "-" + defaultVersion} token={token} projectId={p.id} p={p} defaultVersion={defaultVersion} onCreated={() => void reload().then(() => flash("created"))} fail={fail} />
      {err ? (
        <p role="alert" className="text-base text-rose-light">
          {err}
        </p>
      ) : null}
      <Saved show={saved === "created"} text="Brouillon du devis créé" />
      <Saved show={saved === "sent"} text="Devis envoyé : le client est prévenu" />
      <Saved show={saved === "draft"} text="Brouillon enregistré" />

      {p.quotes.length === 0 ? <p className="text-base text-mist">Aucun devis pour l'instant.</p> : null}
      <ul className="grid gap-4">
        {p.quotes.map((q) => (
          <li key={q.id} className={"grid gap-4 border p-4 sm:p-5 " + (q.status === "superseded" ? "border-white/10 opacity-70" : "border-white/15")} data-quote={q.number} data-quote-status={q.status}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base text-white">
                  Devis Q{q.number}
                  {q.versionNumber ? " · version " + q.versionNumber : ""}
                </p>
                <p className="mt-1 text-base text-mist">
                  {q.status === "draft"
                    ? "Brouillon : le client ne le voit pas"
                    : q.status === "superseded"
                      ? "Envoyé le " + when(q.sentAt) + " · remplacé le " + when(q.supersededAt)
                      : q.status === "accepted"
                        ? "Envoyé le " + when(q.sentAt) + " · accepté le " + when(q.acceptedAt)
                        : "Envoyé le " + when(q.sentAt) + " · en attente de l'accord du client"}
                </p>
              </div>
              <Tag tone={q.status === "accepted" ? "good" : q.status === "sent" ? "wait" : "neutral"}>{QUOTE_STATUS_FR[q.status]}</Tag>
            </div>

            {q.status === "draft" ? (
              <DraftQuote token={token} projectId={p.id} q={q} p={p} onSaved={() => void reload().then(() => flash("draft"))} fail={fail} />
            ) : (
              <QuoteSummary q={q} currency={p.currency} />
            )}

            {q.status === "draft" ? (
              <div className="grid gap-3 border-t border-white/10 pt-4">
                <p className="text-base text-mist">« Envoyer au client » fige ce devis en PDF : il ne pourra plus être modifié.</p>
                <button type="button" className={btnMain + " justify-self-start"} onClick={() => void send(q)} disabled={busy === "s" + q.id} data-send-quote={q.number}>
                  {busy === "s" + q.id ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />} Envoyer au client
                </button>
                {sendErr && sendErr.number === q.number ? (
                  <div role="alert" className="grid gap-1 border border-rose-light bg-rose-deep/25 p-4" data-quote-error>
                    <p className="text-base text-white">{sendErr.text}</p>
                    {/conditions/i.test(sendErr.text) ? termsLink : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {q.status === "accepted" && q.acceptedEmail ? (
              <p className="border-t border-white/10 pt-3 text-base text-bone" data-quote-acceptance>
                Accepté le {when(q.acceptedAt)} par {q.acceptedEmail} · adresse IP {q.acceptedIp || "inconnue"} · {deviceOf(q.acceptedUa)}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </Block>
  );
}

function QuoteSummary({ q, currency }: { q: QuoteView; currency: string }) {
  return (
    <div className="grid gap-3">
      <dl className="grid gap-x-6 gap-y-2 text-base sm:grid-cols-[12rem_1fr]">
        <dt className="text-mist">Prix final</dt>
        <dd className="text-white">{money(q.priceCents, currency)}</dd>
        {q.feesCents > 0 ? (
          <>
            <dt className="text-mist">{q.feesLabel || "Frais"}</dt>
            <dd className="text-white">{money(q.feesCents, currency)}</dd>
          </>
        ) : null}
        <dt className="text-mist">Total</dt>
        <dd className="text-white">{money(q.totalCents, currency)}</dd>
        {q.materials ? (
          <>
            <dt className="text-mist">Matières et caractéristiques</dt>
            <dd className="whitespace-pre-line text-bone">{q.materials}</dd>
          </>
        ) : null}
        {q.leadTime ? (
          <>
            <dt className="text-mist">Délai</dt>
            <dd className="whitespace-pre-line text-bone">{q.leadTime}</dd>
          </>
        ) : null}
        {q.schedule ? (
          <>
            <dt className="text-mist">Échéancier</dt>
            <dd className="whitespace-pre-line text-bone">{q.schedule}</dd>
          </>
        ) : null}
      </dl>
      {q.pdfUrl ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <a href={q.pdfUrl} target="_blank" rel="noreferrer" className={btn + " justify-self-start"} data-quote-pdf>
            <FileText className="size-4" aria-hidden="true" /> Ouvrir le PDF
          </a>
          {q.sha256 ? (
            <span className="text-base break-all text-mist" title="Empreinte du PDF : elle prouve que le fichier n'a pas changé depuis son envoi.">
              Empreinte : {q.sha256.slice(0, 16)}…
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The fields of a quotation (new or draft). */
function QuoteFields({ f, set, p }: { f: Form; set: (f: Form) => void; p: Section["project"] }) {
  return (
    <>
      <label className={labelCls}>
        Version chiffrée
        <select name="versionId" value={f.versionId} onChange={(e) => set({ ...f, versionId: e.target.value })} className={inputCls}>
          <option value="">— Choisir la version —</option>
          {p.versions.map((v) => (
            <option key={v.id} value={v.id}>
              Version {v.number}
              {v.publishedAt ? " (publiée le " + new Date(v.publishedAt).toLocaleDateString("fr-FR") + ")" : " (brouillon : à publier avant l'envoi)"}
            </option>
          ))}
        </select>
      </label>
      <label className={labelCls}>
        Matières et caractéristiques (le client le lit, en anglais)
        <textarea name="materials" value={f.materials} onChange={(e) => set({ ...f, materials: e.target.value })} rows={4} maxLength={6000} className={inputCls + " " + areaCls} placeholder="18k rose gold, round brilliant diamonds…" />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelCls}>
          Prix final ({p.currency})
          <input name="price" inputMode="decimal" value={f.price} onChange={(e) => set({ ...f, price: e.target.value })} className={inputCls} placeholder="12500" />
        </label>
        <label className={labelCls}>
          Frais en plus ({p.currency}, facultatif)
          <input name="fees" inputMode="decimal" value={f.fees} onChange={(e) => set({ ...f, fees: e.target.value })} className={inputCls} placeholder="0" />
        </label>
        <label className={labelCls}>
          Nom de ces frais
          <input name="feesLabel" value={f.feesLabel} onChange={(e) => set({ ...f, feesLabel: e.target.value })} className={inputCls} maxLength={160} placeholder="Insured delivery" />
        </label>
      </div>
      <label className={labelCls}>
        Délai
        <textarea name="leadTime" value={f.leadTime} onChange={(e) => set({ ...f, leadTime: e.target.value })} rows={2} maxLength={2000} className={inputCls + " " + areaCls} placeholder="About ten weeks after the deposit." />
      </label>
      <label className={labelCls}>
        Échéancier des paiements
        <textarea name="schedule" value={f.schedule} onChange={(e) => set({ ...f, schedule: e.target.value })} rows={3} maxLength={4000} className={inputCls + " " + areaCls} placeholder="50% deposit (the design fee counts towards it), balance before delivery." />
      </label>
      <p className="text-base text-mist">Les frais de design déjà payés ({money(p.designFee.cents, p.currency)}) comptent automatiquement dans l'acompte de 50 %.</p>
    </>
  );
}

function NewQuote({ token, projectId, p, defaultVersion, onCreated, fail }: { token: string; projectId: string; p: Section["project"]; defaultVersion: string; onCreated: () => void; fail: (x: unknown) => void }) {
  const [f, setF] = useState<Form>(() => formOf(null, defaultVersion));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    const body = bodyOf(f);
    if (typeof body === "string") return setErr(body);
    setBusy(true);
    try {
      await adminCall(token, "POST", "/api/admin/atelier/projects/" + projectId + "/quotes", body);
      onCreated();
    } catch (x) {
      fail(x);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 border border-rose-light/30 p-4 sm:p-5" data-new-quote>
      <p className="text-base text-white">Nouveau devis (brouillon)</p>
      <QuoteFields f={f} set={setF} p={p} />
      {err ? (
        <p role="alert" className="text-base text-rose-light">
          {err}
        </p>
      ) : null}
      <button type="submit" className={btnMain + " justify-self-start"} disabled={busy}>
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />} Créer le brouillon du devis
      </button>
    </form>
  );
}

function DraftQuote({ token, projectId, q, p, onSaved, fail }: { token: string; projectId: string; q: QuoteView; p: Section["project"]; onSaved: () => void; fail: (x: unknown) => void }) {
  const [f, setF] = useState<Form>(() => formOf(q, ""));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(f) !== JSON.stringify(formOf(q, ""));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    const body = bodyOf(f);
    if (typeof body === "string") return setErr(body);
    setBusy(true);
    try {
      await adminCall(token, "PUT", "/api/admin/atelier/projects/" + projectId + "/quotes/" + q.id, body);
      onSaved();
    } catch (x) {
      fail(x);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="grid gap-4" data-quote-draft={q.number}>
      <QuoteFields f={f} set={setF} p={p} />
      <p className="text-base text-white">Total : {money((toCents(f.price) ?? 0) + (toCents(f.fees) ?? 0), p.currency)}</p>
      {err ? (
        <p role="alert" className="text-base text-rose-light">
          {err}
        </p>
      ) : null}
      <button type="submit" className={btn + " justify-self-start"} disabled={busy || !dirty}>
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />} Enregistrer le brouillon
      </button>
      {dirty ? <p className="text-base text-rose-light">Enregistrez vos changements avant d'envoyer : sinon c'est la version enregistrée qui part.</p> : null}
    </form>
  );
}
