// Renders the pages on the server for the prerender (npm run build) - written by the platform. Do not edit.
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import App from "../../App";
import seo from "./seo.json";
import { isIndexable, type SeoExtras, type SeoSettings } from "./head";

export { headFor, injectHead, robotsTxt, sitemapXml } from "./head";

export const settings = seo as unknown as SeoSettings;

/** The page at this address, rendered to HTML. */
export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );
}

/** Every address to write as a static page: the pages of the settings, and the articles. */
export function prerenderTargets(): { path: string; extras?: SeoExtras }[] {
  const targets: { path: string; extras?: SeoExtras }[] = Object.keys(settings.pages)
    .filter((path) => !path.includes(":") && !path.includes("*"))
    .map((path) => ({ path }));
  return targets;
}

/** The pages closed to search engines (robots.txt disallows them). */
export function privatePaths(): string[] {
  return Object.keys(settings.pages).filter((path) => !path.includes(":") && !path.includes("*") && !isIndexable(settings, path));
}
