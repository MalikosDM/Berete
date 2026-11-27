import { useEffect, useRef, useState, type FormEvent } from "react";
import { BellRing, FileText, LoaderCircle, Paperclip, Send, X } from "lucide-react";
import { adminCall, btn, btnMain, iconBtn, inputCls } from "../ui";
import type { Section } from "./ProjectPage";
import { actorFr, areaCls, Block, ErrorLine, eventFr, labelCls, Saved, Tag, useFail, useFlash, when, type ThreadItem } from "./shared";
import { attachmentOf, mb } from "./upload";

/*
 * The messages of a project: the thread of the client and Berete with, between them, what happened (a version published, a
 * quotation sent, a step…). A reply: a text and up to four photos or PDF (10 MB each). « Prévenir le client »: a short line
 * in English sent by e-mail, saying only that something waits in his space (never a price, a link to a file or a detail).
 */

const MAX_FILES = 4;
type Attached = { key: string; name: string; mime: string; data: string; size: number };

export default function Messages({ token, project: p, reload, onExpired, unreadIds }: Section & { unreadIds: Set<string> }) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<Attached[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState("");
  const [what, setWhat] = useState("");
  const [showEvents, setShowEvents] = useState(true);
  const [err, fail, setErr] = useFail(onExpired);
  const [notifyErr, setNotifyErr] = useState("");
  const [saved, flash] = useFlash();
  const inputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLOListElement>(null);

  const pick = async (list: FileList | null) => {
    if (!list) return;
    setErr("");
    const chosen = [...list].slice(0, Math.max(0, MAX_FILES - files.length));
    if (list.length > chosen.length) setErr("Quatre pièces jointes au plus par message.");
    if (inputRef.current) inputRef.current.value = "";
    setPreparing(true);
    const ready: Attached[] = [];
    for (const f of chosen) {
      const a = await attachmentOf(f);
      if (typeof a === "string") setErr(a);
      else ready.push({ key: Date.now() + "-" + f.name + "-" + ready.length, ...a });
    }
    setFiles((x) => [...x, ...ready]);
    setPreparing(false);
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || preparing || (!body.trim() && files.length === 0)) return;
    setBusy("send");
    setErr("");
    try {
      await adminCall(token, "POST", "/api/admin/atelier/projects/" + p.id + "/messages", { body: body.trim(), files: files.map((f) => ({ name: f.name, mime: f.mime, data: f.data })) });
      setBody("");
      setFiles([]);
      await reload();
      flash("sent");
    } catch (x) {
      fail(x);
    } finally {
      setBusy("");
    }
  };

  const notify = async (e: FormEvent) => {
    e.preventDefault();
    setNotifyErr("");
    if (what.trim().length < 3) return setNotifyErr("Écrivez en quelques mots ce qui attend le client (en anglais).");
    setBusy("notify");
    try {
      await adminCall(token, "POST", "/api/admin/atelier/projects/" + p.id + "/notify", { what: what.trim() });
      setWhat("");
      flash("notified");
    } catch (x) {
      if (x instanceof Error && x.message === "expired") onExpired();
      else setNotifyErr(x instanceof Error ? x.message : "Envoi impossible.");
    } finally {
      setBusy("");
    }
  };

  const items = p.thread.filter((t) => showEvents || t.type === "message");

  // The newest at the bottom, in view (like a conversation).
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length]);

  return (
    <Block
      id="messages"
      title="Messages"
      intro="La conversation avec le client et, entre les messages, ce qui s'est passé sur le projet."
      aside={
        <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base text-bone">
          <input type="checkbox" checked={showEvents} onChange={(e) => setShowEvents(e.target.checked)} className="size-5 accent-[#e8b4a0]" /> Afficher l'historique
        </label>
      }
      data-messages
    >
      {items.length === 0 ? <p className="text-base text-mist">Aucun message pour l'instant.</p> : null}
      <ol ref={threadRef} className="grid max-h-[36rem] gap-3 overflow-y-auto pr-1" data-thread>
        {items.map((t) => (
          <ThreadLine key={t.type + t.id} t={t} fresh={unreadIds.has(t.id)} />
        ))}
      </ol>

      <form onSubmit={send} className="grid gap-4 border-t border-white/10 pt-5" data-admin-composer>
        <label className={labelCls}>
          Votre réponse
          <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={6000} className={inputCls + " " + areaCls} placeholder="Dear …," />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className={btn + " cursor-pointer"}>
            <Paperclip className="size-4" aria-hidden="true" /> Joindre des photos ou un PDF
            <input ref={inputRef} type="file" accept="image/*,application/pdf,.pdf,.heic,.heif" multiple className="sr-only" onChange={(e) => void pick(e.target.files)} />
          </label>
          <span className="text-base text-mist">4 fichiers au plus, 10 Mo chacun.</span>
        </div>
        {files.length > 0 || preparing ? (
          <ul className="flex flex-wrap gap-2" data-composer-files>
            {files.map((f) => (
              <li key={f.key} className="flex items-center gap-2 border border-white/15 py-1 ps-3 text-base text-bone">
                {f.mime === "application/pdf" ? <FileText className="size-4" aria-hidden="true" /> : null}
                <span className="max-w-[14rem] truncate">{f.name}</span> <span className="text-mist">{mb(f.size)}</span>
                <button type="button" aria-label={"Retirer " + f.name} className={iconBtn + " size-10 border-0"} onClick={() => setFiles((x) => x.filter((y) => y.key !== f.key))}>
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
            {preparing ? (
              <li className="flex items-center gap-2 text-base text-bone" role="status">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Préparation
              </li>
            ) : null}
          </ul>
        ) : null}
        <ErrorLine text={err} />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className={btnMain} disabled={busy === "send" || preparing || (!body.trim() && files.length === 0)}>
            {busy === "send" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />} Envoyer le message
          </button>
          <Saved show={saved === "sent"} text="Message envoyé : le client est prévenu par e-mail" />
        </div>
      </form>

      <form onSubmit={notify} className="grid gap-3 border-t border-white/10 pt-5" data-notify>
        <p className="text-base text-white">Prévenir le client</p>
        <p className="text-base text-mist">Un e-mail court, en anglais, qui dit seulement qu'il a quelque chose à voir dans son espace. Jamais de prix ni de détail.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className={labelCls + " flex-1"}>
            Ce qui l'attend
            <input name="what" value={what} onChange={(e) => setWhat(e.target.value)} maxLength={160} className={inputCls} placeholder="New photos of your piece are waiting for you" />
          </label>
          <button type="submit" className={btn} disabled={busy === "notify"}>
            {busy === "notify" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <BellRing className="size-4" aria-hidden="true" />} Prévenir le client
          </button>
        </div>
        <ErrorLine text={notifyErr} />
        <Saved show={saved === "notified"} text="E-mail parti (ou en attente dans « E-mails envoyés » sans boîte e-mail)" />
      </form>
    </Block>
  );
}

function ThreadLine({ t, fresh }: { t: ThreadItem; fresh: boolean }) {
  if (t.type === "event") {
    return (
      <li className="flex flex-wrap items-baseline gap-x-2 border-l-2 border-white/15 py-1 pl-3 text-base text-mist" data-thread-event={t.kind}>
        <span className="text-bone">{eventFr(t.kind, t.data)}</span>
        <span>
          · {when(t.at)}
          {t.actor ? " · " + actorFr(t.actor) : ""}
        </span>
      </li>
    );
  }
  const mine = t.author === "house";
  return (
    <li className={"grid max-w-[44rem] gap-2 border p-4 " + (mine ? "justify-self-end border-rose-light/40 bg-rose-deep/10" : "justify-self-start border-white/15")} data-thread-message={t.author}>
      <p className="flex flex-wrap items-center gap-2 text-base text-mist">
        <span className="text-white">{mine ? "Berete" : "Le client"}</span> · {when(t.at)}
        {fresh ? <Tag tone="wait">Nouveau</Tag> : null}
        {mine && t.readAt ? <span>· lu le {when(t.readAt)}</span> : null}
      </p>
      {t.body ? <p className="text-base whitespace-pre-line text-white">{t.body}</p> : null}
      {t.files.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {t.files.map((f) => (
            <li key={f.id}>
              {f.kind === "image" ? (
                <a href={f.url} target="_blank" rel="noreferrer" title={f.name}>
                  <img src={f.url} alt={f.name} loading="lazy" className="size-24 border border-white/10 bg-ink-soft object-cover" />
                </a>
              ) : (
                <a href={f.url} target="_blank" rel="noreferrer" className={btn}>
                  <FileText className="size-4" aria-hidden="true" /> {f.name}
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
