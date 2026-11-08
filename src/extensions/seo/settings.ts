// The SEO settings of the site (seo.json) with its languages: each one has
// its prefix (/fr...) and the titles and descriptions of its pages
// (seoPages in src/i18n/ui/<lang>.ts), for hreflang and the head.
import { bundleOf, DEFAULT_LOCALE, LOCALE_INFO, LOCALES } from "@/i18n";
import seo from "./seo.json";
import type { SeoSettings } from "./head";

const base = seo as unknown as SeoSettings;

export function seoSettings(): SeoSettings {
  return {
    ...base,
    alternates: LOCALES.map((l) => ({
      lang: l,
      prefix: LOCALE_INFO[l].prefix,
      ...(l === DEFAULT_LOCALE ? {} : { pages: bundleOf(l).ui.seoPages }),
    })),
  };
}
