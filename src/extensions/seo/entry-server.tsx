// Renders the pages on the server for the prerender (npm run build).
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import App from "../../App";
import { CatalogueProvider } from "../../lib/catalogue";
import seo from "./seo.json";
import { dynamicPaths, extrasFor } from "./extras";
import { isIndexable, type SeoExtras, type SeoSettings } from "./head";

export { headFor, injectHead, robotsTxt, sitemapXml } from "./head";

export const settings = seo as unknown as SeoSettings;

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

/** Every address to write as a static page: the pages of the settings, every piece and every person. */
export function prerenderTargets(): { path: string; extras?: SeoExtras }[] {
  const fixed = Object.keys(settings.pages).filter((path) => !path.includes(":") && !path.includes("*") && path !== "/pieces");
  return [...fixed, ...dynamicPaths()].map((path) => ({ path, extras: extrasFor(path) }));
}

/** The pages closed to search engines (robots.txt disallows them). */
export function privatePaths(): string[] {
  return Object.keys(settings.pages).filter((path) => !path.includes(":") && !path.includes("*") && !isIndexable(settings, path));
}
