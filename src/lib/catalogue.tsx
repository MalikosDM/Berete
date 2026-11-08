import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultCatalogue } from "@/data/catalogue";
import type { Catalogue } from "@/data/types";
import { bundleOf, useBundleVersion, useLocale } from "@/i18n";
import { localizeCatalogue } from "@/i18n/content";

/*
 * The catalogue of the site. Pages render at once with the catalogue built
 * into the site (also used by the prerender), then show the live one from
 * the API (/api/catalogue) as soon as it answers, with the edits of /admin.
 * Pages receive it in the language of the address (useCatalogue).
 */

const RawContext = createContext<Catalogue>(defaultCatalogue);
const LocalizedContext = createContext<Catalogue>(defaultCatalogue);

function isCatalogue(v: unknown): v is Catalogue {
  if (v === null || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return Array.isArray(c.stories) && Array.isArray(c.people) && Array.isArray(c.pieces) && Array.isArray(c.boxes);
}

export function CatalogueProvider({ children }: { children: ReactNode }) {
  const [catalogue, setCatalogue] = useState<Catalogue>(defaultCatalogue);
  const locale = useLocale();
  const version = useBundleVersion();

  useEffect(() => {
    let alive = true;
    fetch("/api/catalogue", { headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: unknown) => {
        if (alive && isCatalogue(json) && json.stories.length + json.pieces.length > 0) setCatalogue(json);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const localized = useMemo(() => {
    const bundle = bundleOf(locale);
    return localizeCatalogue(catalogue, locale, bundle.content, bundle.ui.stories.alt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version: a language has just been loaded
  }, [catalogue, locale, version]);

  return (
    <RawContext.Provider value={catalogue}>
      <LocalizedContext.Provider value={localized}>{children}</LocalizedContext.Provider>
    </RawContext.Provider>
  );
}

/** The catalogue in the language of the page. */
export function useCatalogue(): Catalogue {
  return useContext(LocalizedContext);
}

/** The catalogue as written (English), for the links that compare texts. */
export function useRawCatalogue(): Catalogue {
  return useContext(RawContext);
}
