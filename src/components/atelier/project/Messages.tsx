/*
 * The conversation of a commission (data-thread): the messages of the client and of the house, and the decisions of the
 * commission (a version published, the design approved, a quotation sent or accepted, a payment received, a step…) in one
 * line each, in the order they happened. Under it, the composer (data-composer): a text and up to 4 attachments, photos (made
 * lighter in the browser, src/lib/photos.ts) or PDF, 10 MB each.
 */
import { useState, type ChangeEvent, type FormEvent } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import Lightbox from "@/components/Lightbox";
import type { MediaItem } from "@/data/types";
import { useI18n } from "@/i18n";
import { base64Of, preparePhoto } from "@/lib/photos";
import { money, moment, sendMessage, type Project, type ThreadEvent, type ThreadMessage } from "@/lib/atelier";
import { Msg, SectionHead, Spinner } from "../ui";

const MAX_FILES = 4;
/** The thread shows its latest items; the earlier ones on request. */
const SHOWN = 30;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.heif";
const IMAGE = /^image\/(jpeg|png|webp|heic|heif)$/;

type Picked = { key: string; name: string; mime: string; blob: Blob; preview: string | null };

let picked = 0;
const newKey = () => "f" + ++picked;

export function MessagesSection({ p, onChanged, onOut }: { p: Project; onChanged: () => Promise<void>; onOut: () => void }) {
  const { t } = useI18n();
  const w = t.privateAtelier.messages;
  const [open, setOpen] = useState<{ items: MediaItem[]; index: number } | null>(null);
  const [all, setAll] = useState(false);
  const hidden = all ? 0 : Math.max(0, p.thread.length - SHOWN);
  const shown = hidden ? p.thread.slice(hidden) : p.thread;

  return (
    <section id="messages" data-project-section="messages" className="scroll-mt-28 border-t border-white/10 py-16 lg:py-20" aria-labelledby="messages-title">
      <SectionHead id="messages-title" eyebrow="06" title={w.title} />
      <div className="mt-10 grid gap-10 lg:mx-auto lg:max-w-3xl">
        {p.thread.length === 0 ? <p className="piece-text">{w.empty}</p> : null}
        {hidden ? (
          <button type="button" onClick={() => setAll(true)} className="btn-secondary justify-self-center" data-thread-earlier={hidden}>
            {w.earlier}
          </button>
        ) : null}
        <ol className="grid gap-6" data-thread aria-live="polite">
          {shown.map((item) => (item.type === "message" ? <Message key={item.id} m={item} onOpen={(items, index) => setOpen({ items, index })} /> : <Event key={item.id} e={item} />))}
        </ol>
        <Composer p={p} onChanged={onChanged} onOut={onOut} />
      </div>
      {open ? <Lightbox items={open.items} index={open.index} onIndex={(index) => setOpen({ ...open, index })} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

function Message({ m, onOpen }: { m: ThreadMessage; onOpen: (items: MediaItem[], index: number) => void }) {
  const { t, intl } = useI18n();
  const w = t.privateAtelier.messages;
  const mine = m.author === "client";
  const photos = m.files.filter((f) => f.kind === "image" && /^image\/(jpeg|png|webp)$/.test(f.mime));
  const others = m.files.filter((f) => !photos.includes(f));
  const items: MediaItem[] = photos.map((f) => ({ type: "image", src: f.url, alt: w.photoAlt(f.name) }));
  return (
    <li className={"flex " + (mine ? "justify-end" : "justify-start")} data-message={m.id} data-author={m.author}>
      <div className={"max-w-[min(36rem,88%)] border px-5 py-4 " + (mine ? "border-rose-light/35 bg-ink-soft" : "border-white/12 bg-ink")}>
        <p className="flex flex-wrap items-baseline gap-x-3 text-xs font-medium uppercase tracking-[0.2em]">
          <span className={mine ? "text-rose-light" : "text-white"}>{mine ? w.you : w.house}</span>
          <time dateTime={m.at} className="tracking-[0.08em] text-mist normal-case">
            {moment(m.at, intl)}
          </time>
        </p>
        {m.body ? <p className="mt-2 text-base leading-relaxed whitespace-pre-line break-words text-white" dir="auto">{m.body}</p> : null}
        {photos.length > 0 ? (
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {photos.map((f, i) => (
              <li key={f.id}>
                <button type="button" onClick={() => onOpen(items, i)} aria-label={w.openPhoto} className="block w-full cursor-zoom-in overflow-hidden bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-light" data-message-photo>
                  <img src={f.url} alt={w.photoAlt(f.name)} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {others.length > 0 ? (
          <ul className="mt-3 grid gap-2">
            {others.map((f) => (
              <li key={f.id}>
                <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 text-base break-all text-bone underline decoration-white/30 underline-offset-4 hover:text-rose-light" data-message-file>
                  <FileText className="size-4 shrink-0 text-rose-light" aria-hidden="true" /> {f.name}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

/** A decision of the commission in one human sentence (null: nothing to say to the client). */
function useEventText(): (e: ThreadEvent) => string | null {
  const { t, intl } = useI18n();
  const w = t.privateAtelier.messages.events;
  return (e) => {
    const d = e.data ?? {};
    const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
    switch (e.kind) {
      case "project-created":
        return w.projectCreated;
      case "version-published":
        return w.versionPublished(s(d.version));
      case "change-requested":
        return w.changeRequested(s(d.version));
      case "design-approved":
        return w.designApproved(s(d.version));
      case "quote-sent":
        return w.quoteSent(s(d.quote));
      case "quote-accepted":
        return w.quoteAccepted(s(d.quote));
      case "quote-superseded":
        return w.quoteSuperseded(s(d.quote), s(d.by));
      case "payment-confirmed": {
        const amount = typeof d.amountCents === "number" && typeof d.currency === "string" ? money(d.amountCents, d.currency, intl) : "";
        const kinds = t.privateAtelier.payment.kinds as Record<string, string>;
        const kind = typeof d.kind === "string" ? kinds[d.kind] : "";
        return w.paymentConfirmed([amount, kind ? "(" + kind + ")" : ""].filter(Boolean).join(" "));
      }
      case "payment-review":
        return w.paymentReview;
      case "order-accepted":
        return w.orderAccepted;
      case "production-authorized":
        return w.productionAuthorized;
      case "step": {
        const label = typeof d.step === "number" ? t.privateAtelier.making.steps[d.step] : undefined;
        return w.step(label ?? s(d.label));
      }
      case "journal":
        return w.journal;
      case "delivery":
        return w.delivery;
      default:
        return null;
    }
  };
}

function Event({ e }: { e: ThreadEvent }) {
  const { intl } = useI18n();
  const text = useEventText()(e);
  if (!text) return null;
  return (
    <li className="flex items-center gap-4 py-1" data-thread-event={e.kind}>
      <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
      <p className="max-w-[80%] text-center text-sm text-mist">
        <span className="me-2 inline-block size-1.5 rounded-full bg-rose-light align-middle" aria-hidden="true" />
        {text}
        <time dateTime={e.at} className="ms-2 whitespace-nowrap text-mist/70">
          {moment(e.at, intl)}
        </time>
      </p>
      <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
    </li>
  );
}

function Composer({ p, onChanged, onOut }: { p: Project; onChanged: () => Promise<void>; onOut: () => void }) {
  const { t } = useI18n();
  const w = t.privateAtelier.messages;
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<Picked[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = [...(e.target.files ?? [])];
    e.target.value = "";
    if (chosen.length === 0) return;
    setNote("");
    if (files.length + chosen.length > MAX_FILES) setNote(w.tooMany);
    setPreparing(true);
    const added: Picked[] = [];
    for (const file of chosen.slice(0, Math.max(0, MAX_FILES - files.length))) {
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (isPdf) {
        if (file.size > MAX_BYTES) setNote(w.tooBig(file.name));
        else added.push({ key: newKey(), name: file.name, mime: "application/pdf", blob: file, preview: null });
        continue;
      }
      const type = file.type || (/\.(heic|heif)$/i.test(file.name) ? "image/heic" : "");
      if (!IMAGE.test(type)) {
        setNote(w.badType(file.name));
        continue;
      }
      const light = await preparePhoto(file);
      if (light && light.blob.size <= MAX_BYTES) added.push({ key: newKey(), name: light.name, mime: light.type, blob: light.blob, preview: light.preview });
      else if (file.size <= MAX_BYTES) added.push({ key: newKey(), name: file.name, mime: type, blob: file, preview: null });
      else setNote(w.tooBig(file.name));
    }
    setFiles((list) => [...list, ...added].slice(0, MAX_FILES));
    setPreparing(false);
  };

  const remove = (key: string) =>
    setFiles((list) => {
      const gone = list.find((f) => f.key === key);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return list.filter((f) => f.key !== key);
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim() && files.length === 0) return;
    setBusy(true);
    setNote("");
    const attachments = await Promise.all(files.map(async (f) => ({ name: f.name, mime: f.mime, data: await base64Of(f.blob) })));
    const a = await sendMessage(p.id, body.trim(), attachments);
    setBusy(false);
    if (a.state === "out") return onOut();
    if (a.state !== "ok") return setNote(w.failed);
    files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    setBody("");
    setFiles([]);
    await onChanged();
  };

  return (
    <form onSubmit={submit} className="grid gap-4 border-t border-white/10 pt-8" data-composer>
      <label className="block text-base text-bone">
        {w.label}
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={6000}
          dir="auto"
          placeholder={w.placeholder}
          className="mt-2 block w-full border border-white/30 bg-ink px-4 py-3 text-base text-white placeholder:text-mist/50 focus:border-rose-light focus:outline-none"
        />
      </label>

      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-3" data-attached>
          {files.map((f) => (
            <li key={f.key} className="flex items-center gap-3 border border-white/15 py-1 ps-1 pe-2" data-attached-file>
              {f.preview ? <img src={f.preview} alt="" className="size-12 object-cover" /> : <span className="flex size-12 items-center justify-center bg-ink-soft"><FileText className="size-5 text-rose-light" aria-hidden="true" /></span>}
              <span className="max-w-40 truncate text-sm text-bone">{f.name}</span>
              <button type="button" onClick={() => remove(f.key)} aria-label={w.remove(f.name)} className="flex size-12 items-center justify-center text-mist hover:text-rose-light">
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label className={"btn-secondary cursor-pointer " + (files.length >= MAX_FILES || preparing ? "pointer-events-none opacity-50" : "")}>
            {preparing ? <Spinner /> : <Paperclip className="size-4" aria-hidden="true" />} {preparing ? w.preparing : w.attach}
            <input type="file" accept={ACCEPT} multiple onChange={(e) => void pick(e)} disabled={files.length >= MAX_FILES || preparing} className="sr-only" data-attach />
          </label>
          <p className="text-sm text-mist">{w.attachHint}</p>
        </div>
        <button type="submit" disabled={busy || preparing || (!body.trim() && files.length === 0)} data-send className="btn-primary w-full sm:w-auto disabled:opacity-60">
          {busy ? <Spinner /> : null} {w.send}
        </button>
      </div>
      {note ? <Msg tone="error">{note}</Msg> : null}
    </form>
  );
}
