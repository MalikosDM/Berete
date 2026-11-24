import { useEffect, useImperativeHandle, useRef, useState, type FormEvent, type Ref } from "react";
import { useLocation, useSearchParams } from "react-router";
import { Check, ChevronDown, ImageIcon, ImagePlus, LoaderCircle, Mail, X } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import ContactBlock from "@/components/ContactBlock";
import Imagine from "@/components/Imagine";
import { useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import WhatsAppHandoff from "@/components/WhatsAppHandoff";
import { sendMessage, type MessagePhoto, type SendError } from "@/lib/api";
import { base64Of, MAX_PHOTOS, preparePhoto, type PreparedPhoto } from "@/lib/photos";
import { HAS_SERVER, waLink } from "@/lib/site";
import { getLenis } from "@/lib/gsap";

export default function Contact() {
  const { t } = useI18n();
  const location = useLocation();
  const form = useRef<EmailFormHandle>(null);
  // From the page of a piece (/contact?piece=<slug>): the configurator and the messages name it.
  const [params] = useSearchParams();
  const cat = useCatalogue();
  const fromPiece = cat.pieces.find((p) => p.slug === params.get("piece"));

  useEffect(() => {
    if (location.hash !== "#configurator") return undefined;
    const t = window.setTimeout(() => {
      const el = document.getElementById("configurator");
      if (!el) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(el, { offset: -80 });
      else el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [location.hash]);

  return (
    <>
      <PageIntro title={t.contact.title} lead={t.contact.lead} />
      <ContactBlock id="configurator" pieceName={fromPiece?.title} />
      {/* « Imaginez votre création »: shown only when the server has its image service (src/components/Imagine.tsx). */}
      <Imagine onFinalise={(message, file) => form.current?.receive(message, file)} />
      <EmailForm ref={form} />
    </>
  );
}

/** `ai`: the proposal of « Imaginez votre création » (one at most: a new one replaces it). */
type PhotoEntry = { id: string; name: string; prepared: PreparedPhoto | null; ai?: boolean };

/** What « Contacter la maison pour finaliser » (src/components/Imagine.tsx) does with the form: the idea, the image. */
export type EmailFormHandle = { receive: (message: string, file: File) => void };

/**
 * The private correspondence (22/11/2026): name, email, Instagram (optional), the idea and up to 6 photos (from the
 * computer or the gallery of the phone, previewed, each removable before sending), made lighter in the browser
 * (src/lib/photos.ts). With the server, the message and its photos go to the admin (tab « Messages », never public) and
 * to the mailbox of the house; without it (the version online before the server), the message opens in WhatsApp.
 * Discreet anti-spam: a hidden field and a minimum time (server/routes/site.ts). Nothing personal in the address.
 * « Imaginez votre création » fills it (`receive`): the idea in the message, the image among the photos, the form opened
 * and brought into view; nothing leaves before the visitor presses its own button.
 */
function EmailForm({ ref }: { ref?: Ref<EmailFormHandle> }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [photoNotes, setPhotoNotes] = useState<string[]>([]);
  // "whatsapp": handed to WhatsApp (no server); "error": the server did not take it (sendError says why).
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "whatsapp" | "error">("idle");
  const [sendError, setSendError] = useState<SendError>("server");
  const [sentPhotos, setSentPhotos] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const preparing = photos.some((p) => p.prepared === null);

  // The previews leave with the page.
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const toggle = () => {
    setOpen((v) => !v);
    if (!startedAt) setStartedAt(Date.now());
  };

  /** Joins photos, made lighter (src/lib/photos.ts); `dropped`: the entries they replace (the previous AI proposal). */
  const addFiles = (files: File[], ai = false, dropped: PhotoEntry[] = []) => {
    if (files.length === 0) return;
    const gone = new Set(dropped.map((p) => p.id));
    dropped.forEach((p) => p.prepared?.preview && URL.revokeObjectURL(p.prepared.preview));
    const room = MAX_PHOTOS - photos.filter((p) => !gone.has(p.id)).length;
    const taken = files.slice(0, Math.max(0, room));
    const notes: string[] = files.length > taken.length ? [t.contact.errTooManyPhotos] : [];
    setPhotoNotes(notes);
    const entries: PhotoEntry[] = taken.map((file) => ({ id: Math.random().toString(36).slice(2), name: file.name, prepared: null, ai }));
    setPhotos((current) => [...current.filter((p) => !gone.has(p.id)), ...entries]);
    entries.forEach((entry, i) => {
      void preparePhoto(taken[i]!).then((prepared) => {
        if (prepared?.preview) previews.current.push(prepared.preview);
        if (!prepared) setPhotoNotes((n) => [...n, t.contact.errPhotoRead(entry.name)]);
        setPhotos((current) => (prepared ? current.map((p) => (p.id === entry.id ? { ...p, prepared } : p)) : current.filter((p) => p.id !== entry.id)));
      });
    });
  };

  // « Contacter la maison pour finaliser »: the idea in the message (after what the visitor already wrote), the image in
  // place of the previous proposal, the form opened and brought into view. Sent only by the button of the form.
  const prefilled = useRef("");
  const box = useRef<HTMLDivElement>(null);
  const receive = (text: string, file: File) => {
    // After a message already sent, a new one starts empty.
    const fresh = status === "sent";
    const current = fresh ? "" : message;
    const before = prefilled.current;
    let next: string;
    if (!current.trim()) next = text;
    else if (before && current.includes(before)) next = current.replace(before, () => text);
    else if (current.includes(text)) next = current;
    else next = current.trimEnd() + "\n\n" + text;
    setMessage(next);
    prefilled.current = text;
    setFieldErrors({});
    if (status !== "sending") setStatus("idle");
    setOpen(true);
    if (!startedAt) setStartedAt(Date.now());
    addFiles([file], true, photos.filter((p) => fresh || p.ai));
    window.setTimeout(() => {
      const section = document.getElementById("private-correspondence");
      if (section) {
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(section, { offset: -96 });
        else section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      box.current?.focus({ preventScroll: true });
    }, 60);
  };
  useImperativeHandle(ref, () => ({ receive }));

  const removePhoto = (id: string) => {
    setPhotos((current) => {
      const gone = current.find((p) => p.id === id);
      if (gone?.prepared?.preview) URL.revokeObjectURL(gone.prepared.preview);
      return current.filter((p) => p.id !== id);
    });
    setPhotoNotes([]);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (preparing) return;
    const errs: { name?: string; email?: string; message?: string } = {};
    if (name.trim().length < 2) errs.name = t.contact.errName;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = t.contact.errEmail;
    if (message.trim().length < 10) errs.message = t.contact.errMessage;
    setFieldErrors(errs);
    if (errs.name || errs.email || errs.message) return;

    // Without the server, the message opens in WhatsApp, already written (in the click itself, so never blocked).
    if (!HAS_SERVER) {
      window.open(waLink(written), "_blank", "noopener");
      setStatus("whatsapp");
      return;
    }
    setStatus("sending");
    let joined: MessagePhoto[];
    try {
      joined = await Promise.all(photos.map(async (p) => ({ name: p.prepared!.name, type: p.prepared!.type, data: await base64Of(p.prepared!.blob) })));
    } catch {
      setSendError("invalid");
      setStatus("error");
      return;
    }
    const res = await sendMessage({ name: name.trim(), email: email.trim(), instagram: instagram.trim(), message: message.trim(), photos: joined, company, startedAt, language: locale });
    if (res.ok) {
      setSentPhotos(joined.length);
      setStatus("sent");
    } else {
      setSendError(res.error);
      setStatus("error");
    }
  };
  const written = t.contact.emailWhatsapp(name.trim(), email.trim(), message.trim()) + (instagram.trim() ? " Instagram: " + instagram.trim() : "");

  const input =
    "mt-2 block w-full border border-white/30 bg-ink px-4 text-base text-white focus:border-rose-light focus:outline-none";

  return (
    <section id="private-correspondence" aria-labelledby="email-title" className="scroll-mt-28 bg-ink pb-24 lg:pb-32">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="border border-white/15 p-6 sm:p-10">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls="email-form"
            className="flex min-h-12 w-full items-center justify-between gap-4 text-start"
          >
            <span className="flex items-center gap-3">
              <Mail className="size-5 text-rose-light" aria-hidden="true" />
              <h2 id="email-title" className="title-caps t-sub tracking-[0.12em]">{t.contact.emailTitle}</h2>
            </span>
            <ChevronDown className={"size-5 text-rose-light transition-transform duration-300 " + (open ? "rotate-180" : "")} aria-hidden="true" />
          </button>

          {open ? (
            <div id="email-form" ref={box} tabIndex={-1} className="mt-8 focus:outline-none">
              {status === "sent" ? (
                <p role="status" data-email-sent className="flex items-start gap-3 text-base text-bone">
                  <Check className="mt-1 size-5 shrink-0 text-rose-light" aria-hidden="true" />
                  {sentPhotos > 0 ? t.contact.emailSentPhotos(sentPhotos) : t.contact.emailSent}
                </p>
              ) : status === "whatsapp" ? (
                <div className="grid gap-4">
                  <WhatsAppHandoff message={written} failed={false} />
                  {photos.length > 0 ? <p className="text-base text-bone">{t.contact.photosWhatsapp}</p> : null}
                </div>
              ) : (
                <form onSubmit={submit} method="post" noValidate className="grid gap-6" data-email-form>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <label className="block text-base text-bone">
                      {t.contact.name}
                      <input
                        type="text"
                        name="name"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        aria-invalid={Boolean(fieldErrors.name)}
                        className={input + " min-h-14"}
                      />
                      {fieldErrors.name ? <span className="mt-2 block text-base text-rose-light">{fieldErrors.name}</span> : null}
                    </label>
                    <label className="block text-base text-bone">
                      {t.contact.email}
                      <input
                        type="email"
                        dir="ltr"
                        name="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={Boolean(fieldErrors.email)}
                        className={input + " min-h-14"}
                      />
                      {fieldErrors.email ? <span className="mt-2 block text-base text-rose-light">{fieldErrors.email}</span> : null}
                    </label>
                  </div>
                  <label className="block text-base text-bone">
                    {t.contact.instagram}
                    <input
                      type="text"
                      dir="ltr"
                      name="instagram"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={t.contact.instagramPlaceholder}
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className={input + " min-h-14 placeholder:text-mist"}
                    />
                  </label>
                  <label className="block text-base text-bone">
                    {t.contact.idea}
                    <textarea
                      name="message"
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      aria-invalid={Boolean(fieldErrors.message)}
                      className={input + " py-3"}
                    />
                    {fieldErrors.message ? <span className="mt-2 block text-base text-rose-light">{fieldErrors.message}</span> : null}
                  </label>

                  {/* The photos: up to 6, previewed, each removable before sending. */}
                  <fieldset data-photos className="grid gap-4">
                    <legend className="mb-1 text-base text-bone">{t.contact.photos}</legend>
                    <p className="text-base text-mist">{t.contact.photosHint}</p>
                    {photos.length > 0 ? (
                      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                        {photos.map((p) => (
                          <li key={p.id} data-photo className="relative aspect-square overflow-hidden border border-white/15 bg-ink-soft">
                            {p.prepared === null ? (
                              <span className="flex h-full w-full items-center justify-center" role="status" aria-label={t.contact.preparingPhoto}>
                                <LoaderCircle className="size-6 animate-spin text-rose-light" aria-hidden="true" />
                              </span>
                            ) : p.prepared.preview ? (
                              <img src={p.prepared.preview} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full flex-col items-center justify-center gap-2 p-2 text-center">
                                <ImageIcon className="size-6 text-rose-light" aria-hidden="true" />
                                <span className="line-clamp-2 text-base break-all text-bone">{p.name}</span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removePhoto(p.id)}
                              aria-label={t.contact.removePhoto(p.name)}
                              data-photo-remove
                              className="absolute end-0 top-0 flex size-12 items-start justify-end p-1.5"
                            >
                              <span className="flex size-8 items-center justify-center rounded-full bg-ink/85 text-white ring-1 ring-white/30 transition-colors hover:bg-rose-light hover:text-ink">
                                <X className="size-4" aria-hidden="true" />
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {photos.length < MAX_PHOTOS ? (
                      <label className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 border border-white/40 px-5 text-base font-medium uppercase tracking-[0.1em] text-white transition-colors focus-within:border-rose-light focus-within:text-rose-light hover:border-rose-light hover:text-rose-light sm:w-fit sm:px-6 lg:min-h-11 lg:text-[0.75rem]">
                        <ImagePlus className="size-5 shrink-0" aria-hidden="true" />
                        <span>{t.contact.addPhotos}</span>
                        <span className="whitespace-nowrap text-mist">{photos.length + " / " + MAX_PHOTOS}</span>
                        <input
                          type="file"
                          accept="image/*,.heic,.heif"
                          multiple
                          data-photo-input
                          className="sr-only"
                          onChange={(e) => {
                            addFiles(Array.from(e.currentTarget.files ?? []));
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                    ) : null}
                    {photoNotes.length > 0 ? (
                      <div role="alert" className="grid gap-1">
                        {photoNotes.map((n) => (
                          <p key={n} className="text-base text-rose-light">{n}</p>
                        ))}
                      </div>
                    ) : null}
                  </fieldset>

                  <div className="absolute -start-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                    <label>
                      Company
                      <input type="text" name="company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
                    </label>
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={status === "sending" || preparing}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-rose-light/55 px-6 text-base font-normal uppercase tracking-[0.16em] text-white transition-colors hover:border-rose-light hover:text-rose-light disabled:opacity-70 sm:w-auto lg:min-h-11 lg:text-[0.75rem]"
                    >
                      {status === "sending" ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
                      {status === "sending" ? t.contact.sending : t.contact.emailButton}
                    </button>
                    {status === "error" ? (
                      <div className="mt-6 grid gap-6" data-email-error={sendError}>
                        <p role="alert" className="text-base text-rose-light">{t.contact.sendErrors[sendError]}</p>
                        {sendError === "server" || sendError === "network" || sendError === "too-many" ? <WhatsAppHandoff message={written} failed /> : null}
                      </div>
                    ) : null}
                  </div>
                </form>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
