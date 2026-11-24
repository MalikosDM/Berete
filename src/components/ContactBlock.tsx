import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Check, ChevronDown, LoaderCircle, Mail, MapPin, PhoneCall, RotateCcw } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { collectionWords, Link, useI18n, type Messages } from "@/i18n";
import { collectionOf } from "@/data/collections";
import WhatsAppHandoff from "@/components/WhatsAppHandoff";
import { BUDGETS, EMAIL, HAS_SERVER, INSTAGRAM_HANDLE, INSTAGRAM_URL, PIECE_CHOICES, TIMINGS, waLink } from "@/lib/site";
import { requestCallback } from "@/lib/api";
import { useCatalogue } from "@/lib/catalogue";
import { useWhatsAppMessage } from "@/lib/whatsapp";

type ContactBlockProps = {
  pieceName?: string;
  compact?: boolean;
  id?: string;
  /** Under the call back, in the right column (the contact page: its form by email). */
  extra?: ReactNode;
};

type Choice = { value: string; label: string };

/** The three questions of the configurator, in the language of the page. */
function stepsOf(t: Messages): { title: string; options: Choice[] }[] {
  const [type = "", budget = "", timing = ""] = t.contact.configSteps;
  return [
    // The same words as the collections of the creations (24/11/2026): Pendants, Chains, Rings, Watches.
    { title: type, options: PIECE_CHOICES.map((value) => ({ value, label: collectionWords(t, collectionOf(value).slug, collectionOf(value)).name })) },
    { title: budget, options: BUDGETS.map((value) => ({ value, label: t.contact.budgets[value] })) },
    { title: timing, options: TIMINGS.map((value) => ({ value, label: t.contact.timings[value] })) },
  ];
}

export default function ContactBlock({ pieceName, compact = false, id, extra }: ContactBlockProps) {
  const { t } = useI18n();
  // The message of the page it is on (a person: the creations made for them; a piece: its name; the contact page).
  const mainMessage = useWhatsAppMessage();
  const { people } = useCatalogue();
  const proof = [...people.filter((p) => p.kind === "club"), ...people.filter((p) => p.kind === "player" && p.number !== null)].map((p) => p.name);

  // At the end of a page (a profile, the press): the invitation to begin, as everywhere (24/11/2026): its signature, one
  // sentence, the two buttons of the house. The configurator and the call back live on the contact page.
  if (compact) {
    return (
      <section id={id} aria-labelledby={(id ?? "contact-block") + "-title"} data-contact-compact className="relative scroll-mt-32 border-t border-white/10 bg-ink">
        <div className="wrap flex flex-col items-center py-20 text-center lg:py-24">
          <h2 id={(id ?? "contact-block") + "-title"} className="title-caps tracking-[0.12em] t-title ">{t.common.yourStory}</h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-bone">{t.contact.oneConversation}</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-x-8">
            <Link to="/contact" data-cta className="btn-primary">
              {t.common.startPiece}
            </Link>
            <a href={waLink(mainMessage)} target="_blank" rel="noreferrer" data-cta className="btn-secondary">
              <BrandIcon name="whatsapp" className="size-4" /> {t.common.whatsapp}
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={id} aria-labelledby={(id ?? "contact-block") + "-title"} data-contact-block className="relative scroll-mt-32 bg-ink pt-6 pb-12 lg:pt-8 lg:pb-14">
      <div className="wrap">
        <div data-contact-columns className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left: the main call to action */}
          <div className="lg:col-span-5">
            <h2 id={(id ?? "contact-block") + "-title"} className="sr-only">
              {t.common.yourStory}
            </h2>
            <p className="max-w-md text-base text-bone">{t.contact.oneConversation}</p>
            <a href={waLink(mainMessage)} target="_blank" rel="noreferrer" data-cta className="btn-primary mt-5">
              <BrandIcon name="whatsapp" className="size-4" />
              {t.common.whatsapp}
            </a>

            <ul className="mt-5 text-base text-bone">
              <li className="flex min-h-12 items-center gap-3">
                <MapPin className="size-5 text-rose-light" aria-hidden="true" />
                {t.site.baseLine}
              </li>
              <li>
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-3 transition-colors hover:text-rose-light">
                  <BrandIcon name="instagram" className="size-5 text-rose-light" />
                  <span dir="ltr">@{INSTAGRAM_HANDLE}</span>
                </a>
              </li>
              {EMAIL ? (
                <li>
                  <a href={"mailto:" + EMAIL} className="inline-flex min-h-12 items-center gap-3 transition-colors hover:text-rose-light">
                    <Mail className="size-5 text-rose-light" aria-hidden="true" />
                    {EMAIL}
                  </a>
                </li>
              ) : null}
            </ul>

            {proof.length > 0 ? (
              <div className="mt-5 border-t border-white/15 pt-5">
                <p className="eyebrow">{t.contact.trustedBy}</p>
                <p className="mt-4 max-w-md font-display t-sub uppercase leading-relaxed tracking-[0.08em] text-white">{proof.join(" · ")}</p>
              </div>
            ) : null}
          </div>

          {/* Right: the consultation, then By phone and By email, two fine lines of the same width that open in place. */}
          <div className="lg:col-span-7 lg:col-start-6">
            <Configurator pieceName={pieceName} />
            <div className="mt-4 border-t border-white/12">
              <CallBack pieceName={pieceName} />
              {extra}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Configurator({ pieceName }: { pieceName?: string }) {
  const { t } = useI18n();
  const STEPS = stepsOf(t);
  const configuratorMessage = (type: string, budget: string, timing: string, piece?: string) => t.whatsapp.configurator(type, budget, timing, piece);
  const [answers, setAnswers] = useState<Choice[]>([]);
  const step = answers.length;
  const done = step >= STEPS.length;

  const message = done ? configuratorMessage(answers[0]!.label, answers[1]!.label, answers[2]!.label, pieceName) : "";

  const choose = (choice: Choice) => {
    const next = [...answers, choice];
    setAnswers(next);
    if (next.length === STEPS.length) {
      const url = waLink(configuratorMessage(next[0]!.label, next[1]!.label, next[2]!.label, pieceName));
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div data-configurator className="border-rose-gold bg-ink-soft p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="title-caps t-sub tracking-[0.12em]">{t.contact.configTitle}</h3>
        <span className="text-rose-gold font-display text-2xl" aria-live="polite">
          {Math.min(step + 1, 3)}/3
        </span>
      </div>

      <div className="mt-4 flex gap-2" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s.title} className={"h-px flex-1 " + (i < step ? "bg-rose-gold" : "bg-white/20")} />
        ))}
      </div>

      {!done ? (
        <fieldset className="mt-5">
          <legend className="text-base font-medium uppercase tracking-[0.2em] text-bone">{STEPS[step]!.title}</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {STEPS[step]!.options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => choose(o)}
                className="group flex min-h-12 items-center justify-between gap-3 border border-white/25 px-5 text-start text-base text-white transition-colors hover:border-rose-light hover:text-rose-light"
              >
                {o.label}
                <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden="true" />
              </button>
            ))}
          </div>
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setAnswers(answers.slice(0, -1))}
              className="mt-5 inline-flex min-h-12 items-center gap-2 text-base text-bone underline-offset-4 hover:text-rose-light hover:underline"
            >
              {t.common.back}
            </button>
          ) : null}
        </fieldset>
      ) : (
        <div className="mt-8">
          <ul className="space-y-2 text-base text-bone">
            {answers.map((a, i) => (
              <li key={STEPS[i]!.title} className="flex items-center gap-3">
                <Check className="size-4 text-rose-light" aria-hidden="true" />
                <span className="text-mist">{t.contact.answer(STEPS[i]!.title)}</span> {a.label}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={waLink(message)} target="_blank" rel="noreferrer" data-cta className="btn-primary">
              <BrandIcon name="whatsapp" className="size-4" />
              {t.contact.openWhatsapp}
            </a>
            <button
              type="button"
              onClick={() => setAnswers([])}
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/30 px-6 text-base text-white transition-colors hover:border-rose-light hover:text-rose-light"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {t.contact.startOver}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CallBack({ pieceName }: { pieceName?: string }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // "whatsapp": handed to WhatsApp (no server); "error": the server did not take it, WhatsApp offered instead.
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "whatsapp" | "error">("idle");
  const [fieldError, setFieldError] = useState<{ name?: string; phone?: string }>({});
  const message = t.contact.callWhatsapp(name.trim(), phone.trim(), pieceName ?? "");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs: { name?: string; phone?: string } = {};
    if (name.trim().length < 2) errs.name = t.contact.errName;
    if (phone.replace(/[^0-9]/g, "").length < 6) errs.phone = t.contact.errPhone;
    setFieldError(errs);
    if (errs.name || errs.phone) return;
    // Without the server, the request opens in WhatsApp, already written (in the click itself, so never blocked).
    if (!HAS_SERVER) {
      window.open(waLink(message), "_blank", "noopener");
      setStatus("whatsapp");
      return;
    }
    setStatus("sending");
    const res = await requestCallback({ name: name.trim(), phone: phone.trim(), interest: pieceName ?? "", language: locale });
    setStatus(res.ok ? "sent" : "error");
  };

  const input =
    "mt-2 block min-h-14 w-full border border-white/30 bg-ink px-4 text-base text-white placeholder:text-mist/80 focus:border-rose-light focus:outline-none";

  return (
    <div data-contact-line="phone" className="border-b border-white/12">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="callback-form"
        className="flex min-h-12 w-full items-center justify-between gap-4 py-1 text-start"
      >
        <span className="flex items-center gap-3">
          <PhoneCall className="size-4 text-rose-light" aria-hidden="true" />
          <span className="title-caps t-sub tracking-[0.12em]">{t.contact.callTitle}</span>
        </span>
        <ChevronDown className={"size-4 text-rose-light transition-transform duration-500 " + (open ? "rotate-180" : "")} aria-hidden="true" />
      </button>

      {open ? (
        <div id="callback-form" className="mt-4 pb-6">
          {status === "sent" ? (
            <p role="status" className="flex items-start gap-3 text-base text-bone">
              <Check className="mt-1 size-5 shrink-0 text-rose-light" aria-hidden="true" />
              {t.contact.callSent}
            </p>
          ) : status === "whatsapp" ? (
            <WhatsAppHandoff message={message} failed={false} />
          ) : (
            <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
              <label className="block text-base text-bone">
                {t.contact.name}
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(fieldError.name)}
                  className={input}
                />
                {fieldError.name ? <span className="mt-2 block text-base text-rose-light">{fieldError.name}</span> : null}
              </label>
              <label className="block text-base text-bone">
                {t.contact.phone}
                <input
                  type="tel"
                  dir="ltr"
                  name="phone"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+971"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={Boolean(fieldError.phone)}
                  className={input}
                />
                {fieldError.phone ? <span className="mt-2 block text-base text-rose-light">{fieldError.phone}</span> : null}
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-rose-light/80 px-6 text-base font-medium uppercase tracking-[0.16em] text-white transition-colors hover:bg-rose-light hover:text-ink disabled:opacity-70 sm:w-auto lg:min-h-11 lg:text-[0.75rem]"
                >
                  {status === "sending" ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
                  {t.contact.callButton}
                </button>
                {status === "error" ? (
                  <div className="mt-6">
                    <WhatsAppHandoff message={message} failed />
                  </div>
                ) : null}
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
