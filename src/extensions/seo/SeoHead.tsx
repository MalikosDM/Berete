// Keeps the head of the page in step with the route.
import { useEffect } from "react";
import { useLocation } from "react-router";
import { useBundleVersion } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { extrasFor } from "./extras";
import { applyHead, headFor, normalizePath } from "./head";
import { seoSettings } from "./settings";

export default function SeoHead() {
  const { pathname } = useLocation();
  const cat = useCatalogue();
  const version = useBundleVersion();
  useEffect(() => {
    const path = normalizePath(pathname);
    const origin = /^https?:/.test(window.location.origin) ? window.location.origin : "";
    applyHead(headFor(seoSettings(), path, extrasFor(path, cat), origin), document);
  }, [pathname, cat, version]);
  return null;
}
