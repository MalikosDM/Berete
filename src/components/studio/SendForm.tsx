/*
 * The two blocks under the concepts of a studio (src/pages/Studio.tsx): « Keep your studio » (its private link, copied or sent
 * by e-mail: no account) and « Send to Berete » (a consultation request with the chosen concepts and photos, which lands in the
 * admin « AI Studio »).
 */
import { useId, useState, type FormEvent } from "react";
import { Check, Copy, LoaderCircle, Mail, Send } from "lucide-react";
import { useI18n } from "@/i18n";
import { studioApi, StudioError, type StudioState } from "@/lib/studio";
import { ProblemText } from "./Concepts";

const input = "mt-2 block min-h-12 w-full border border-white/30 bg-ink px-4 text-base text-white placeholder:text-mist/80 focus:border-rose-light focus:outline-none";

export function KeepStudio({ token, email: savedEmail, onNew, onEmail }: { token: string; email: string; onNew: () => void; onEmail: (email: string) => void }) {
  const { t, locale, path } = useI18n();
  const s = t.studio;
  const emailId = useId();
  const link = (typeof window === "undefined" ? "" : window.location.origin) + path("/create/" + token);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState(savedEmail);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [problem, setProblem] = useState<{ code: string; wait: number } | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt(s.copyLink, link);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setProblem({ code: "email", wait: 0 });
    setState("sending");
    setProblem(null);
    try {
      await studioApi.email(token, email.trim(), locale);
      setState("sent");
      onEmail(email.trim());
    } catch (x) {
      setState("idle");
      setProblem({ code: x instanceof StudioError ? x.code : "send", wait: x instanceof StudioError ? x.wait : 0 });
    }
  };

  return (
    <section aria-labelledby="studio-keep-title" data-studio-keep className="grid content-start gap-5 border border-white/15 p-5 sm:p-8">
      <h2 id="studio-keep-title" className="title-caps t-sub tracking-[0.12em]">
        {s.keepTitle}
      </h2>
      <p className="text-base text-mist">{s.keepText}</p>
      <div className="grid gap-2">
        <input readOnly value={link} dir="ltr" aria-label={s.keepTitle} onFocus={(e) => e.currentTarget.select()} data-studio-link className="block min-h-12 w-full border border-white/20 bg-ink-soft px-4 text-base text-bone focus:border-rose-light focus:outline-none" />
        <button type="button" onClick={copy} className="btn-primary w-full sm:w-auto sm:justify-self-start">
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          <span aria-live="polite">{copied ? s.copied : s.copyLink}</span>
        </button>
      </div>
      <form onSubmit={send} noValidate className="grid gap-3" data-studio-email>
        <label htmlFor={emailId} className="text-base text-bone">
          {s.emailLabel}
        </label>
        <input id={emailId} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input + " mt-0"} dir="ltr" />
        <button type="submit" disabled={state === "sending"} className="btn-secondary justify-self-start disabled:opacity-60">
          {state === "sending" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Mail className="size-4" aria-hidden="true" />}
          {s.emailSend}
        </button>
        {state === "sent" ? (
          <p role="status" data-studio-email-sent className="text-base text-rose-light">
            {s.emailSent}
          </p>
        ) : null}
        {problem ? <ProblemText problem={problem} /> : null}
      </form>
      <button type="button" onClick={onNew} className="btn-secondary justify-self-start text-mist" data-studio-new>
        {s.newStudio}
      </button>
    </section>
  );
}

type SendProps = { token: string; studio: StudioState; onSent: (request: { id: string; createdAt: string }) => void };

export function SendToBerete({ token, studio, onSent }: SendProps) {
  const { t, locale, intl } = useI18n();
  const s = t.studio;
  const ids = { name: useId(), email: useId(), phone: useId(), message: useId() };
  const [name, setName] = useState("");
  // The e-mail of the studio (given to keep it) until the visitor writes another one.
  const [typedEmail, setEmail] = useState<string | null>(null);
  const email = typedEmail ?? studio.email;
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  // What the visitor ticked or unticked; otherwise a kept concept and every photo are chosen.
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [problem, setProblem] = useState<{ code: string; wait: number } | null>(null);
  const chosen = (id: string, fallback: boolean) => picked[id] ?? fallback;
  const conceptIds = studio.concepts.filter((c) => chosen(c.id, c.kept)).map((c) => c.id);
  const referenceIds = studio.references.filter((r) => chosen(r.id, true)).map((r) => r.id);
  const date = (iso: string) => new Intl.DateTimeFormat(intl, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    if (!name.trim()) return setProblem({ code: "name", wait: 0 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setProblem({ code: "email", wait: 0 });
    if (!message.trim() && conceptIds.length === 0) return setProblem({ code: "message", wait: 0 });
    setState("sending");
    setProblem(null);
    try {
      const answer = await studioApi.request(token, { name: name.trim(), email: email.trim(), phone: phone.trim(), message: message.trim(), conceptIds, referenceIds, language: locale, company });
      setState("sent");
      setMessage("");
      setPicked({});
      onSent(answer.request);
    } catch (x) {
      setState("idle");
      setProblem({ code: x instanceof StudioError ? x.code : "send", wait: x instanceof StudioError ? x.wait : 0 });
    }
  };

  const thumb = "relative block size-20 cursor-pointer overflow-hidden border border-white/15 bg-ink outline-offset-2 has-[:checked]:border-rose-light has-[:focus-visible]:outline has-[:focus-visible]:outline-rose-light";

  return (
    <section id="send-to-berete" aria-labelledby="studio-send-title" data-studio-send className="grid content-start gap-5 border border-white/15 p-5 sm:p-8">
      <h2 id="studio-send-title" className="title-caps t-sub tracking-[0.12em]">
        {s.sendTitle}
      </h2>
      <p className="text-base text-mist">{s.sendLead}</p>
      {studio.requests.length > 0 ? (
        <ul className="grid gap-1 text-base text-bone" data-studio-requests>
          {studio.requests.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-rose-light" aria-hidden="true" />
              {s.sentOn(date(r.createdAt))}
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={submit} noValidate className="grid gap-5">
        <fieldset className="grid gap-2">
          <legend className="text-base text-bone">{s.chooseConcepts}</legend>
          {studio.concepts.length === 0 ? (
            <p className="text-base text-mist">{s.noConceptYet}</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-3">
              {studio.concepts.map((c) => (
                <label key={c.id} className={thumb} data-pick-concept={c.id}>
                  <input type="checkbox" className="peer sr-only" checked={chosen(c.id, c.kept)} onChange={(e) => setPicked((p) => ({ ...p, [c.id]: e.target.checked }))} aria-label={s.alt(c.prompt)} />
                  <img src={c.url} alt="" className="size-full object-cover opacity-60 transition-opacity peer-checked:opacity-100" />
                  <span className="absolute end-1 top-1 hidden size-5 items-center justify-center bg-rose-light text-ink peer-checked:flex">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        {studio.references.length > 0 ? (
          <fieldset className="grid gap-2">
            <legend className="text-base text-bone">{s.chooseRefs}</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {studio.references.map((r) => (
                <label key={r.id} className={thumb} data-pick-reference={r.id}>
                  <input type="checkbox" className="peer sr-only" checked={chosen(r.id, true)} onChange={(e) => setPicked((p) => ({ ...p, [r.id]: e.target.checked }))} aria-label={r.name} />
                  <img src={r.url} alt="" className="size-full object-cover opacity-60 transition-opacity peer-checked:opacity-100" />
                  <span className="absolute end-1 top-1 hidden size-5 items-center justify-center bg-rose-light text-ink peer-checked:flex">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={ids.name} className="text-base text-bone">
              {s.nameLabel}
            </label>
            <input id={ids.name} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={input} data-studio-name />
          </div>
          <div>
            <label htmlFor={ids.email} className="text-base text-bone">
              {s.emailLabel}
            </label>
            <input id={ids.email} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} dir="ltr" data-studio-request-email />
          </div>
        </div>
        <div>
          <label htmlFor={ids.phone} className="text-base text-bone">
            {s.phoneLabel} <span className="text-mist">({s.optional})</span>
          </label>
          <input id={ids.phone} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} dir="ltr" />
        </div>
        <div>
          <label htmlFor={ids.message} className="text-base text-bone">
            {s.messageLabel}
          </label>
          <textarea id={ids.message} rows={4} maxLength={3000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={s.messagePlaceholder} className="mt-2 block w-full border border-white/30 bg-ink px-4 py-3 text-base text-white placeholder:text-mist/80 focus:border-rose-light focus:outline-none" data-studio-message />
        </div>
        {/* Hidden from people: a robot fills it. */}
        <div aria-hidden="true" className="absolute -start-[9999px] size-px overflow-hidden">
          <label>
            Company
            <input type="text" name="company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
        </div>
        <button type="submit" disabled={state === "sending"} data-studio-send-button className="btn-primary w-full sm:w-auto sm:justify-self-start disabled:opacity-60">
          {state === "sending" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
          {state === "sending" ? s.sending : s.send}
        </button>
        {state === "sent" ? (
          <p role="status" data-studio-sent className="text-base text-rose-light">
            {s.sent} {s.sentKeep}
          </p>
        ) : null}
        {problem ? <ProblemText problem={problem} /> : null}
      </form>
    </section>
  );
}
