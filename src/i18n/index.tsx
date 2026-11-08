/*
 * The language of the page comes from its address (/fr/..., /ar/...). Each
 * language is a bundle: the words of the site (ui/<lang>.ts) and the
 * translations of the catalogue (content/<lang>.ts). English is built in;
 * the others are loaded before the page starts (main.tsx), or all at once
 * for the pre-render (entry-server.tsx).
 *
 * Links: Link, NavLink and Navigate from here take an address without its
 * language ("/creations") and keep the visitor in their language.
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { Link as RouterLink, NavLink as RouterNavLink, Navigate as RouterNavigate, useLocation, type LinkProps, type NavigateProps, type NavLinkProps } from "react-router";
import { madeFor } from "@/data/relations";
import type { Catalogue, Piece } from "@/data/types";
import { listOf } from "./format";
import { LOCALE_INFO, localeOfPath, localizePath, type Locale } from "./locales";
import { en, type Messages } from "./ui/en";

export * from "./locales";
export type { Messages } from "./ui/en";

export type Bundle = { ui: Messages; content: Record<string, string> };

const bundles: Partial<Record<Locale, Bundle>> = { en: { ui: en, content: {} } };

const loaders: Record<Exclude<Locale, "en">, () => Promise<{ default: Bundle }>> = {
  fr: () => import("./bundles/fr"),
  es: () => import("./bundles/es"),
  de: () => import("./bundles/de"),
  nl: () => import("./bundles/nl"),
  ar: () => import("./bundles/ar"),
};

let version = 0;
const listeners = new Set<() => void>();

/** Makes a language available at once (the pre-render registers them all). */
export function registerBundle(locale: Locale, bundle: Bundle): void {
  bundles[locale] = bundle;
  version += 1;
  listeners.forEach((l) => l());
}

/** Loads the words of a language, once. */
export async function loadLocale(locale: Locale): Promise<void> {
  if (bundles[locale] || locale === "en") return;
  const bundle = (await loaders[locale]()).default;
  registerBundle(locale, bundle);
}

/** The words of a language; English while it is not loaded yet. */
export function bundleOf(locale: Locale): Bundle {
  return bundles[locale] ?? bundles.en!;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Changes when a language arrives, so the pages show it. */
export function useBundleVersion(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
}

export function useLocale(): Locale {
  return localeOfPath(useLocation().pathname);
}

export type I18n = {
  locale: Locale;
  t: Messages;
  dir: "ltr" | "rtl";
  /** For Intl (numbers, lists, plurals). */
  intl: string;
  /** An address of the site in the language of the page. */
  path: (to: string) => string;
};

export function useI18n(): I18n {
  const locale = useLocale();
  const v = useBundleVersion();
  return useMemo(() => {
    const info = LOCALE_INFO[locale];
    return { locale, t: bundleOf(locale).ui, dir: info.dir, intl: info.intl, path: (to: string) => localizePath(to, locale) };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- v: a language has just been loaded
  }, [locale, v]);
}

/** The name and the introduction of a collection ("pendants") in this language, the English ones for a collection unknown to it. */
export function collectionWords(t: Messages, slug: string, fallback: { name: string; intro: string }): { name: string; intro: string } {
  const items = t.collections.items as Record<string, { name: string; intro: string } | undefined>;
  return items[slug] ?? fallback;
}

/** "Made for Kevin Schade", "Made for A and B", "Made for a private collector", in the language of the page. */
export function useMadeFor(): (cat: Catalogue, piece: Piece) => string {
  const { t, intl } = useI18n();
  return (cat, piece) => madeFor(cat, piece, t.common.privateCollector, (names) => listOf(intl, names));
}

/** The language and the direction of the document follow the page (and a language not loaded yet is loaded). */
export function LocaleSync() {
  const locale = useLocale();
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = LOCALE_INFO[locale].dir;
    if (!bundles[locale]) void loadLocale(locale).catch(() => undefined);
  }, [locale]);
  return null;
}

function localized(to: LinkProps["to"], locale: Locale): LinkProps["to"] {
  return typeof to === "string" ? localizePath(to, locale) : to;
}

export function Link({ to, ...rest }: LinkProps) {
  const locale = useLocale();
  return <RouterLink to={localized(to, locale)} {...rest} />;
}

export function NavLink({ to, ...rest }: NavLinkProps) {
  const locale = useLocale();
  return <RouterNavLink to={localized(to, locale)} {...rest} />;
}

export function Navigate({ to, ...rest }: NavigateProps) {
  const locale = useLocale();
  return <RouterNavigate to={localized(to, locale)} {...rest} />;
}
