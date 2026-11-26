// The SEO settings of the site (seo.json) with its languages: each one has
// its prefix (/fr...) and the titles and descriptions of its pages
// (seoPages in src/i18n/ui/<lang>.ts), for hreflang and the head.
import { bundleOf, DEFAULT_LOCALE, LOCALE_INFO, LOCALES } from "@/i18n";
import seo from "./seo.json";
import share from "@/data/share.generated.json";
import type { SeoSettings } from "./head";
import { PHONE_DISPLAY } from "@/lib/site";

const base = seo as unknown as SeoSettings;

export function seoSettings(): SeoSettings {
  return {
    ...base,
    // The image of the site with its version (scripts/share-images.ts, 23/11/2026): a new image is never hidden by a cache.
    image: share.brand.src,
    // The telephone of the house (WhatsApp) in the structured data: the one written in src/lib/site.ts.
    organization: { ...base.organization, telephone: PHONE_DISPLAY },
    alternates: LOCALES.map((l) => ({
      lang: l,
      prefix: LOCALE_INFO[l].prefix,
      ...(l === DEFAULT_LOCALE ? {} : { pages: bundleOf(l).ui.seoPages }),
    })),
  };
}
