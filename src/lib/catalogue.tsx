import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { defaultCatalogue } from "@/data/catalogue";
import type { Catalogue } from "@/data/types";

/*
 * The catalogue of the site. Pages render at once with the catalogue built
 * into the site (also used by the prerender), then show the live one from
 * the API (/api/catalogue) as soon as it answers, with the edits of /admin.
 */

const CatalogueContext = createContext<Catalogue>(defaultCatalogue);

function isCatalogue(v: unknown): v is Catalogue {
  if (v === null || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return Array.isArray(c.stories) && Array.isArray(c.people) && Array.isArray(c.pieces) && Array.isArray(c.boxes);
}

export function CatalogueProvider({ children }: { children: ReactNode }) {
  const [catalogue, setCatalogue] = useState<Catalogue>(defaultCatalogue);

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

  return <CatalogueContext.Provider value={catalogue}>{children}</CatalogueContext.Provider>;
}

export function useCatalogue(): Catalogue {
  return useContext(CatalogueContext);
}
