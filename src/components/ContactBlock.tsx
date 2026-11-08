import { useState, type FormEvent } from "react";
import { ArrowRight, Check, LoaderCircle, Mail, MapPin, PhoneCall, RotateCcw } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import Reveal from "@/components/Reveal";
import { useI18n, type Messages } from "@/i18n";
import { BUDGETS, EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL, PIECE_CHOICES, TIMINGS, waLink } from "@/lib/site";
import { requestCallback } from "@/lib/api";
import { useCatalogue } from "@/lib/catalogue";

type ContactBlockProps = {
  pieceName?: string;
  compact?: boolean;
  id?: string;
};

type Choice = { value: string; label: string };

/** The three questions of the configurator, in the language of the page. */
function stepsOf(t: Messages): { title: string; options: Choice[] }[] {
  const [type = "", budget = "", timing = ""] = t.contact.configSteps;
  return [
    { title: type, options: PIECE_CHOICES.map((value) => ({ value, label: t.contact.pieceChoices[value] })) },
    { title: budget, options: BUDGETS.map((value) => ({ value, label: t.contact.budgets[value] })) },
    { title: timing, options: TIMINGS.map((value) => ({ value, label: t.contact.timings[value] })) },
  ];
}

export default function ContactBlock({ pieceName, compact = false, id }: ContactBlockProps) {
  const { t } = useI18n();
  const mainMessage = pieceName ? t.whatsapp.piece(pieceName) : t.whatsapp.hello;
  const { people } = useCatalogue();
  const proof = [...people.filter((p) => p.kind === "club"), ...people.filter((p) => p.kind === "player" && p.number !== null)].map((p) => p.name);

  return (
    <section id={id} aria-labelledby={(id ?? "contact-block") + "-title"} className={"relative scroll-mt-24 bg-ink " + (compact ? "py-20 lg:py-28" : "py-24 lg:py-36")}>
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="rule-rose mb-16 lg:mb-24" aria-hidden="true" />
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-12">
          {/* Left: the main call to action */}
          <div className="lg:col-span-5">
            <p className="eyebrow">{pieceName ? t.contact.inspired : t.common.startPiece}</p>
            <h2 id={(id ?? "contact-block") + "-title"} className={"title-caps mt-5 max-w-full text-balance break-words tracking-[0.14em] " + (compact ? "text-[clamp(2rem,5vw,3.75rem)] lg:text-[clamp(2rem,3.2vw,3.25rem)]" : "text-[clamp(2.25rem,6vw,5rem)] lg:text-[clamp(2.25rem,3.6vw,3.75rem)]")}>
              {pieceName ? t.piece.want : t.common.yourStory}
            </h2>
            <p className="mt-6 max-w-md text-lg text-mist">
              {t.contact.oneConversation}
            </p>
            <a
              href={waLink(mainMessage)}
              target="_blank"
              rel="noreferrer"
              className="mt-10 flex min-h-16 w-full items-center justify-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light sm:w-auto sm:inline-flex"
            >
              <BrandIcon name="whatsapp" className="size-6" />
              {t.common.chatWhatsapp}
            </a>

            <ul className="mt-12 space-y-3 text-base text-bone">
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
              <div className="mt-10 border-t border-white/15 pt-8">
                <p className="eyebrow">{t.contact.trustedBy}</p>
                <p className="mt-4 max-w-md font-display text-xl uppercase leading-relaxed tracking-[0.08em] text-white">{proof.join(" · ")}</p>
              </div>
            ) : null}

          </div>

          {/* Right: configurator + call back */}
          <div className="space-y-8 lg:col-span-6 lg:col-start-7">
            <Reveal>
              <Configurator pieceName={pieceName} />
            </Reveal>
            <Reveal delay={0.1}>
              <CallBack pieceName={pieceName} />
            </Reveal>
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
    <div className="border-rose-gold bg-ink-soft p-6 sm:p-10">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="title-caps text-2xl tracking-[0.14em] sm:text-3xl">{t.contact.configTitle}</h3>
        <span className="text-rose-gold font-display text-2xl" aria-live="polite">
          {Math.min(step + 1, 3)}/3
        </span>
      </div>

      <div className="mt-6 flex gap-2" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s.title} className={"h-px flex-1 " + (i < step ? "bg-rose-gold" : "bg-white/20")} />
        ))}
      </div>

      {!done ? (
        <fieldset className="mt-8">
          <legend className="text-base font-medium uppercase tracking-[0.2em] text-bone">{STEPS[step]!.title}</legend>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {STEPS[step]!.options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => choose(o)}
                className="group flex min-h-14 items-center justify-between gap-3 border border-white/25 px-5 text-start text-base text-white transition-colors hover:border-rose-light hover:text-rose-light"
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
            <a
              href={waLink(message)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-14 items-center justify-center gap-3 bg-white px-6 text-base font-semibold text-ink transition-colors hover:bg-rose-light"
            >
              <BrandIcon name="whatsapp" className="size-5" />
              {t.contact.openWhatsapp}
            </a>
            <button
              type="button"
              onClick={() => setAnswers([])}
              className="inline-flex min-h-14 items-center justify-center gap-2 border border-white/30 px-6 text-base text-white transition-colors hover:border-rose-light hover:text-rose-light"
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
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<{ name?: string; phone?: string }>({});

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs: { name?: string; phone?: string } = {};
    if (name.trim().length < 2) errs.name = t.contact.errName;
    if (phone.replace(/[^0-9]/g, "").length < 6) errs.phone = t.contact.errPhone;
    setFieldError(errs);
    if (errs.name || errs.phone) return;
    setStatus("sending");
    const res = await requestCallback({ name: name.trim(), phone: phone.trim(), interest: pieceName ?? "", language: locale });
    if (res.ok) setStatus("sent");
    else {
      setError(res.error === "network" ? t.contact.errNetwork : t.contact.errServer);
      setStatus("error");
    }
  };

  const input =
    "mt-2 block min-h-14 w-full border border-white/30 bg-ink px-4 text-base text-white placeholder:text-mist/80 focus:border-rose-light focus:outline-none";

  return (
    <div className="border border-white/15 p-6 sm:p-10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="callback-form"
        className="flex min-h-12 w-full items-center justify-between gap-4 text-start"
      >
        <span className="flex items-center gap-3">
          <PhoneCall className="size-5 text-rose-light" aria-hidden="true" />
          <span className="title-caps text-xl tracking-[0.14em] sm:text-2xl">{t.contact.callTitle}</span>
        </span>
        <span className="text-rose-gold font-display text-3xl leading-none" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div id="callback-form" className="mt-6">
          {status === "sent" ? (
            <p role="status" className="flex items-start gap-3 text-lg text-bone">
              <Check className="mt-1 size-5 shrink-0 text-rose-light" aria-hidden="true" />
              {t.contact.callSent}
            </p>
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
                  className="inline-flex min-h-14 w-full items-center justify-center gap-2 border border-rose-light/80 px-8 text-base font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-rose-light hover:text-ink disabled:opacity-70 sm:w-auto"
                >
                  {status === "sending" ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
                  {t.contact.callButton}
                </button>
                {status === "error" ? (
                  <p role="alert" className="mt-4 text-base text-rose-light">
                    {error}
                  </p>
                ) : null}
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
