// Keeps the head of the page in step with the route.
import { useEffect } from "react";
import { useLocation } from "react-router";
import { useCatalogue } from "@/lib/catalogue";
import seo from "./seo.json";
import { extrasFor } from "./extras";
import { applyHead, headFor, normalizePath, type SeoSettings } from "./head";

const settings = seo as unknown as SeoSettings;

export default function SeoHead() {
  const { pathname } = useLocation();
  const cat = useCatalogue();
  useEffect(() => {
    const path = normalizePath(pathname);
    const origin = /^https?:/.test(window.location.origin) ? window.location.origin : "";
    applyHead(headFor(settings, path, extrasFor(path, cat), origin), document);
  }, [pathname, cat]);
  return null;
}
