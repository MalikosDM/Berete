/*
 * The languages of the site. English is at the root of the addresses
 * (/creations); the others have their prefix (/fr/creations, /ar/creations).
 * The same list drives the routes, the language menu, the SEO (hreflang) and
 * the pre-rendered pages.
 */

export const LOCALES = ["en", "fr", "es", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export type LocaleInfo = {
  /** Its own name, written in it. */
  name: string;
  /** Short label of the language menu. */
  short: string;
  dir: "ltr" | "rtl";
  /** "" for English, "/fr" for French... */
  prefix: string;
  /** For numbers, lists and plurals (Intl). */
  intl: string;
};

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  en: { name: "English", short: "EN", dir: "ltr", prefix: "", intl: "en-GB" },
  fr: { name: "Français", short: "FR", dir: "ltr", prefix: "/fr", intl: "fr-FR" },
  es: { name: "Español", short: "ES", dir: "ltr", prefix: "/es", intl: "es-ES" },
  ar: { name: "العربية", short: "AR", dir: "rtl", prefix: "/ar", intl: "ar" },
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** The language of an address: its first segment when it is a language prefix, else English. */
export function localeOfPath(pathname: string): Locale {
  const first = pathname.split("/")[1] ?? "";
  return isLocale(first) && first !== DEFAULT_LOCALE ? first : DEFAULT_LOCALE;
}

/** The address without its language prefix: "/fr/creations" is "/creations", "/fr" is "/". */
export function stripLocale(pathname: string): string {
  const locale = localeOfPath(pathname);
  if (locale === DEFAULT_LOCALE) return pathname || "/";
  const rest = pathname.slice(LOCALE_INFO[locale].prefix.length);
  return rest === "" ? "/" : rest;
}

/** An address of the site in one language: "/creations?x=1" in French is "/fr/creations?x=1". */
export function localizePath(path: string, locale: Locale): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const prefix = LOCALE_INFO[locale].prefix;
  if (prefix === "") return path;
  if (path === "/") return prefix;
  if (path.startsWith("/?") || path.startsWith("/#")) return prefix + path.slice(1);
  return prefix + path;
}
