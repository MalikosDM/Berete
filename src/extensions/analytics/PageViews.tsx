// Counts each page view without cookies - written by the platform. Do not edit.
// The page counts its own first view when it loads; this counts the next
// ones, when the visitor moves from page to page. Nothing is stored in the
// browser: no consent is needed.
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

function endpoint(): { url: string; firstCounted: boolean } {
  const meta = document.querySelector('meta[name="analytics-endpoint"]');
  const url = meta?.getAttribute("content") ?? "";
  return {
    url: /^https?:\/\/[^\s"'<>]+$/i.test(url) ? url : "",
    firstCounted: meta?.getAttribute("data-initial") === "counted",
  };
}

export default function PageViews() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    const { url, firstCounted } = endpoint();
    const skip = first.current && firstCounted;
    first.current = false;
    if (url === "" || skip) return;
    try {
      void fetch(url, {
        method: "POST",
        keepalive: true,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ geste: "vue", chemin: pathname, provenance: document.referrer }),
      }).catch(() => undefined);
    } catch {
      // A view that cannot be counted never breaks the page.
    }
  }, [pathname]);
  return null;
}
