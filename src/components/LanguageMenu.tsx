import { useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router";
import { Check, ChevronDown, Globe } from "lucide-react";
import { LOCALE_INFO, LOCALES, localizePath, stripLocale, useI18n, type Locale } from "@/i18n";

/** The same page in another language: a real page load, so the page starts in its direction (Arabic: right to left). */
function useHrefIn(): (locale: Locale) => string {
  const { pathname, search, hash } = useLocation();
  const neutral = stripLocale(pathname);
  return (locale) => localizePath(neutral, locale) + search + hash;
}

/** The language button of the navigation bar, with the list of languages. */
export function LanguageMenu({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();
  const hrefIn = useHrefIn();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={"relative " + className} data-language-menu>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={t.language.choose + " — " + LOCALE_INFO[locale].name}
        className="inline-flex min-h-12 items-center gap-1.5 px-2 text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-white transition-colors hover:text-rose-light"
      >
        <Globe className="size-4" aria-hidden="true" />
        {LOCALE_INFO[locale].short}
        <ChevronDown className={"size-3.5 transition-transform duration-300 " + (open ? "rotate-180" : "")} aria-hidden="true" />
      </button>
      <ul id={id} hidden={!open} className="absolute end-0 top-full mt-2 w-56 border border-white/15 bg-ink/95 p-2 backdrop-blur-xl">
        {LOCALES.map((l) => (
          <li key={l}>
            <a
              href={hrefIn(l)}
              hrefLang={l}
              lang={l}
              dir={LOCALE_INFO[l].dir}
              data-language={l}
              aria-current={l === locale ? "true" : undefined}
              className={"flex min-h-12 items-center justify-between gap-4 px-4 text-base transition-colors hover:text-rose-light " + (l === locale ? "text-rose-light" : "text-white")}
            >
              {LOCALE_INFO[l].name}
              {l === locale ? <Check className="size-4" aria-hidden="true" /> : null}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The languages in a row: the mobile menu and the footer. */
export function LanguageLinks({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();
  const hrefIn = useHrefIn();
  return (
    <nav aria-label={t.language.label} className={className}>
      <ul className="flex flex-wrap gap-x-6 gap-y-1">
        {LOCALES.map((l) => (
          <li key={l}>
            <a
              href={hrefIn(l)}
              hrefLang={l}
              lang={l}
              data-language={l}
              aria-current={l === locale ? "true" : undefined}
              className={"inline-flex min-h-12 items-center text-base transition-colors hover:text-rose-light " + (l === locale ? "text-rose-light" : "text-bone")}
            >
              {LOCALE_INFO[l].name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
