// Renders the pages on the server for the prerender (npm run build), in every language.
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import App from "../../App";
import { DEFAULT_LOCALE, loadLocale, LOCALE_INFO, LOCALES, localizePath } from "../../i18n";
import { CatalogueProvider } from "../../lib/catalogue";
import { dynamicPaths, extrasFor } from "./extras";
import { isIndexable, type SeoExtras } from "./head";
import { seoSettings } from "./settings";

export { headFor, injectHead, languageFor, robotsTxt, sitemapXml } from "./head";

// Every language is ready before the first page is rendered.
await Promise.all(LOCALES.map((l) => loadLocale(l)));

export const settings = seoSettings();

/** The direction of the text of a language ("rtl" for Arabic). */
export function directionOf(language: string): "ltr" | "rtl" {
  return (LOCALES as readonly string[]).includes(language) ? LOCALE_INFO[language as keyof typeof LOCALE_INFO].dir : "ltr";
}

/** The page at this address, rendered to HTML. */
export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <CatalogueProvider>
          <App />
        </CatalogueProvider>
      </StaticRouter>
    </StrictMode>,
  );
}

/** The pages of the settings without language (no pattern, no redirect). */
function fixedPaths(): string[] {
  return Object.keys(settings.pages).filter((path) => !path.includes(":") && !path.includes("*") && path !== "/pieces");
}

/**
 * Every address to write as a static page: the pages of the settings, every
 * piece and every person, in every language (the back-office in English only).
 * "/404" is the page shown for an unknown address.
 */
export function prerenderTargets(): { path: string; extras?: SeoExtras }[] {
  const neutral = [...fixedPaths(), ...dynamicPaths()];
  const out: { path: string; extras?: SeoExtras }[] = [];
  for (const locale of LOCALES) {
    for (const path of neutral) {
      if (locale !== DEFAULT_LOCALE && path === "/admin") continue;
      const localized = localizePath(path, locale);
      out.push({ path: localized, extras: extrasFor(localized) });
    }
  }
  return out;
}

/** The pages closed to search engines (robots.txt disallows them), in every language. */
export function privatePaths(): string[] {
  const closed = fixedPaths().filter((path) => !isIndexable(settings, path) && path !== "/404");
  return LOCALES.flatMap((locale) => closed.filter((path) => locale === DEFAULT_LOCALE || path !== "/admin").map((path) => localizePath(path, locale)));
}
