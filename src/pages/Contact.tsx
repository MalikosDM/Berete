import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "react-router";
import { Check, ChevronDown, LoaderCircle, Mail } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import ContactBlock from "@/components/ContactBlock";
import { useI18n } from "@/i18n";
import WhatsAppHandoff from "@/components/WhatsAppHandoff";
import { sendMessage } from "@/lib/api";
import { HAS_SERVER, waLink } from "@/lib/site";
import { getLenis } from "@/lib/gsap";

export default function Contact() {
  const { t } = useI18n();
  const location = useLocation();

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
      <PageIntro eyebrow={t.contact.eyebrow} title={t.contact.title} lead={t.contact.lead} />
      <ContactBlock id="configurator" />
      <EmailForm />
    </>
  );
}

function EmailForm() {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  // "whatsapp": handed to WhatsApp (no server); "error": the server did not take it, WhatsApp offered instead.
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "whatsapp" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; message?: string }>({});

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    const res = await sendMessage({ name: name.trim(), email: email.trim(), message: message.trim(), company, language: locale });
    setStatus(res.ok ? "sent" : "error");
  };
  const written = t.contact.emailWhatsapp(name.trim(), email.trim(), message.trim());

  const input =
    "mt-2 block w-full border border-white/30 bg-ink px-4 text-base text-white focus:border-rose-light focus:outline-none";

  return (
    <section aria-labelledby="email-title" className="bg-ink pb-24 lg:pb-32">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="border border-white/15 p-6 sm:p-10">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="email-form"
            className="flex min-h-12 w-full items-center justify-between gap-4 text-start"
          >
            <span className="flex items-center gap-3">
              <Mail className="size-5 text-rose-light" aria-hidden="true" />
              <h2 id="email-title" className="title-caps text-xl tracking-[0.14em] sm:text-2xl">{t.contact.emailTitle}</h2>
            </span>
            <ChevronDown className={"size-5 text-rose-light transition-transform duration-300 " + (open ? "rotate-180" : "")} aria-hidden="true" />
          </button>

          {open ? (
            <div id="email-form" className="mt-8">
              {status === "sent" ? (
                <p role="status" className="flex items-start gap-3 text-lg text-bone">
                  <Check className="mt-1 size-5 shrink-0 text-rose-light" aria-hidden="true" />
                  {t.contact.emailSent}
                </p>
              ) : status === "whatsapp" ? (
                <WhatsAppHandoff message={written} failed={false} />
              ) : (
                <form onSubmit={submit} noValidate className="grid gap-6">
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
                  <div className="absolute -start-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                    <label>
                      Company
                      <input type="text" name="company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
                    </label>
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={status === "sending"}
                      className="inline-flex min-h-14 w-full items-center justify-center gap-2 bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light disabled:opacity-70 sm:w-auto"
                    >
                      {status === "sending" ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
                      {t.contact.emailButton}
                    </button>
                    {status === "error" ? (
                      <div className="mt-6">
                        <WhatsAppHandoff message={written} failed />
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
