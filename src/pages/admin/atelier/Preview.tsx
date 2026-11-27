import { useState } from "react";
import { Eye, FileText, LoaderCircle, X } from "lucide-react";
import { adminCall, btn } from "../ui";
import type { Section } from "./ProjectPage";
import { Block, ErrorLine, eventFr, useFail, when, type ProjectView } from "./shared";

/*
 * « Aperçu vu par le client »: the project exactly as the server gives it to the client (?preview=1: only what is
 * published, no draft, no trace), summed up here in the order of his page and in his language (English). The files of the
 * client are signed for him: the admin's own signed addresses of the same files are used to show them here.
 */

/** The amounts and days as the client reads them (English). */
function money(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(cents / 100);
  } catch {
    return (cents / 100).toFixed(2) + " " + currency;
  }
}
const dayEn = (day: string | null | undefined) => (day ? new Date(day.slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "");
const THREAD_LINES = 14;

const PAY_EN: Record<string, string> = { deposit: "Pay 50% deposit", full: "Pay 100%", balance: "Pay the balance" };
const STEP_LINE = (s: { state: string }) => (s.state === "done" ? "✓" : s.state === "current" ? "●" : "○");

export default function Preview({ token, project: admin, onExpired }: Section) {
  const [view, setView] = useState<ProjectView | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, fail, setErr] = useFail(onExpired);

  const load = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await adminCall(token, "GET", "/api/admin/atelier/projects/" + admin.id + "?preview=1");
      setView(r.project as ProjectView);
    } catch (x) {
      fail(x);
    } finally {
      setBusy(false);
    }
  };

  // The addresses the admin may open, by file.
  const journalUrl = new Map(admin.journal.flatMap((u) => u.files.map((f) => [f.id, f.url] as const)));
  const quoteUrl = new Map(admin.quotes.map((q) => [q.id, q.pdfUrl] as const));
  const receiptUrl = new Map(admin.payments.map((x) => [x.id, x.receiptUrl] as const));
  const messageUrl = new Map(admin.thread.flatMap((t) => (t.type === "message" ? t.files.map((f) => [f.id, f.url] as const) : [])));

  return (
    <Block
      id="apercu"
      title="Aperçu vu par le client"
      intro="Ce que le client voit dans son Private Atelier, sans les brouillons ni les traces (en anglais, comme chez lui)."
      aside={
        <div className="flex gap-2">
          <button type="button" className={btn} onClick={() => void load()} disabled={busy} data-preview>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />} {view ? "Actualiser l'aperçu" : "Voir l'aperçu"}
          </button>
          {view ? (
            <button type="button" className={btn} onClick={() => setView(null)} aria-label="Fermer l'aperçu">
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      }
    >
      <ErrorLine text={err} />
      {view ? <ClientView v={view} urls={{ journalUrl, quoteUrl, receiptUrl, messageUrl }} /> : null}
    </Block>
  );
}

type Urls = { journalUrl: Map<string, string>; quoteUrl: Map<string, string | null>; receiptUrl: Map<string, string | null>; messageUrl: Map<string, string> };

function ClientView({ v, urls }: { v: ProjectView; urls: Urls }) {
  const latest = v.versions.find((x) => x.id === v.latestVersionId) ?? null;
  const q = v.quotes.find((x) => x.id === v.currentQuoteId) ?? null;
  const h = "text-base tracking-[0.12em] text-rose-light uppercase";

  return (
    <div className="grid gap-6 border border-rose-light/40 bg-ink-soft p-5 sm:p-7" lang="en" data-preview-view>
      <div>
        <p className="eyebrow">The Private Atelier</p>
        <p className="mt-2 font-display text-3xl text-white">{v.title}</p>
        <p className="mt-1 text-base text-mist">{v.client.name}</p>
      </div>

      <section className="grid gap-2" data-preview-design>
        <p className={h}>Your design</p>
        {latest ? (
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            {latest.model?.poster ? <img src={latest.model.poster} alt="" className="aspect-square w-32 border border-white/10 object-contain" /> : <div className="flex aspect-square w-32 items-center justify-center border border-white/10 text-base text-mist">3D</div>}
            <div className="grid content-start gap-1 text-base">
              <p className="text-white">{latest.label}</p>
              {latest.changes ? <p className="whitespace-pre-line text-bone">{latest.changes}</p> : null}
              <p className="text-mist">{latest.approved ? "Approved" + (v.approval?.at ? " on " + new Date(v.approval.at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "") : "Waiting for your approval"}</p>
              {v.versions.length > 1 ? <p className="text-mist">{v.versions.length} versions in the history.</p> : null}
            </div>
          </div>
        ) : (
          <p className="text-base text-mist">No design published yet.</p>
        )}
        {v.requests.length > 0 ? <p className="text-base text-mist">{v.requests.length} change request(s) sent.</p> : null}
      </section>

      <section className="grid gap-2" data-preview-quote>
        <p className={h}>Quotation</p>
        {q ? (
          <div className="grid gap-1 text-base">
            <p className="text-white">
              Q{q.number} · {money(q.totalCents, v.currency)} · {q.status === "accepted" ? "accepted" : "awaiting your acceptance"}
            </p>
            {v.canAccept === "approve-first" ? <p className="text-mist">The client must approve the design before accepting.</p> : null}
            {v.canAccept === "terms-missing" ? <p className="text-rose-light">The commercial terms are missing: the client cannot accept.</p> : null}
            {urls.quoteUrl.get(q.id) ? (
              <a href={urls.quoteUrl.get(q.id)!} target="_blank" rel="noreferrer" className={btn + " justify-self-start"}>
                <FileText className="size-4" aria-hidden="true" /> PDF
              </a>
            ) : null}
          </div>
        ) : (
          <p className="text-base text-mist">No quotation yet.</p>
        )}
      </section>

      <section className="grid gap-2" data-preview-payment>
        <p className={h}>Payment</p>
        {v.money ? (
          <p className="text-base text-white">
            Total {money(v.money.total, v.currency)} · received {money(v.money.credited, v.currency)} · remaining {money(v.money.remaining, v.currency)}
          </p>
        ) : null}
        {v.payment.options.length > 0 ? (
          <p className="text-base text-bone">
            Buttons shown:{" "}
            {v.payment.options.map((o) => (PAY_EN[o.kind] ?? o.kind) + " (" + money(o.amount, v.currency) + ")").join(" · ")}
          </p>
        ) : (
          <p className="text-base text-mist">No payment button shown now.</p>
        )}
        {v.payments.map((x) => (
          <p key={x.id} className="text-base text-bone">
            {money(x.amountCents, x.currency)} paid on {x.paidAt ? dayEn(x.paidAt) : "?"}
            {urls.receiptUrl.get(x.id) ? (
              <>
                {" · "}
                <a href={urls.receiptUrl.get(x.id)!} target="_blank" rel="noreferrer" className="text-rose-light underline">
                  receipt
                </a>
              </>
            ) : null}
          </p>
        ))}
      </section>

      <section className="grid gap-2" data-preview-steps>
        <p className={h}>The making</p>
        <ol className="grid gap-1 text-base">
          {v.steps.map((s) => (
            <li key={s.index} className={s.state === "pending" ? "text-mist" : "text-white"}>
              {STEP_LINE(s)} {s.label}
              {s.note ? <span className="text-bone"> — {s.note}</span> : null}
            </li>
          ))}
        </ol>
        {v.delivery ? (
          <p className="text-base text-bone">
            Delivery window: {dayEn(v.delivery.from)} – {dayEn(v.delivery.to)}
          </p>
        ) : null}
      </section>

      <section className="grid gap-2" data-preview-journal>
        <p className={h}>From the atelier</p>
        {v.journal.length === 0 ? <p className="text-base text-mist">Nothing published yet.</p> : null}
        {v.journal.map((u) => (
          <div key={u.id} className="grid gap-2">
            <p className="text-base text-bone">
              {dayEn(u.date)}
              {u.note ? " · " + u.note : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {u.files.map((f) =>
                urls.journalUrl.get(f.id) ? (
                  f.kind === "video" ? (
                    <video key={f.id} src={urls.journalUrl.get(f.id)! + "#t=0.1"} muted playsInline preload="metadata" className="size-20 bg-ink object-cover" />
                  ) : (
                    <img key={f.id} src={urls.journalUrl.get(f.id)!} alt="" loading="lazy" className="size-20 bg-ink object-cover" />
                  )
                ) : null,
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-2" data-preview-thread>
        <p className={h}>Messages and history</p>
        <p className="text-base text-mist" lang="fr">
          (Les étapes de l'historique sont écrites ici en français ; le client les lit dans sa langue.)
        </p>
        {v.thread.length > THREAD_LINES ? <p className="text-base text-mist">… {v.thread.length - THREAD_LINES} earlier {v.thread.length - THREAD_LINES > 1 ? "lines" : "line"}</p> : null}
        <ol className="grid gap-2 text-base">
          {v.thread.slice(-THREAD_LINES).map((t) =>
            t.type === "message" ? (
              <li key={"m" + t.id} className={t.author === "house" ? "text-white" : "text-bone"}>
                <span className="text-mist">{t.author === "house" ? "BERETE" : "You"} · </span>
                {t.body}
                {t.files.length > 0 ? (
                  <span className="text-mist">
                    {" "}
                    ·{" "}
                    {t.files.map((f, i) => (
                      <a key={f.id} href={urls.messageUrl.get(f.id) ?? "#"} target="_blank" rel="noreferrer" className="underline">
                        {(i > 0 ? ", " : "") + f.name}
                      </a>
                    ))}
                  </span>
                ) : null}
              </li>
            ) : (
              <li key={"e" + t.id} className="text-mist" title={when(t.at)}>
                {eventFr(t.kind, t.data)}
              </li>
            ),
          )}
        </ol>
      </section>
    </div>
  );
}
