// Keeps the head of the page in step with the route - written by the platform. Do not edit.
import { useEffect } from "react";
import { useLocation } from "react-router";
import seo from "./seo.json";
import { applyHead, headFor, normalizePath, type SeoExtras, type SeoSettings } from "./head";

const settings = seo as unknown as SeoSettings;

/** What the settings cannot know: the product or the article a page shows. */
async function extrasFor(path: string): Promise<SeoExtras | undefined> {
  return undefined;
}

export default function SeoHead() {
  const { pathname } = useLocation();
  useEffect(() => {
    let current = true;
    const path = normalizePath(pathname);
    const origin = /^https?:/.test(window.location.origin) ? window.location.origin : "";
    applyHead(headFor(settings, path, undefined, origin), document);
    void extrasFor(path).then((extras) => {
      if (current && extras !== undefined) applyHead(headFor(settings, path, extras, origin), document);
    }).catch(() => undefined);
    return () => {
      current = false;
    };
  }, [pathname]);
  return null;
}
