/*
 * The mark of the house in the background of the pages (Yoni and Malik, call of 22/11/2026: « on doit lire Berete tout le
 * temps »; the monogram BRT since 24/11/2026): its single setting is BRAND_WATERMARK (src/lib/site.ts). To compare with and without on the site, without
 * changing the setting: add ?filigrane=0 or ?filigrane=1 to an address (kept for the visit).
 */
import { useSyncExternalStore } from "react";
import { BRAND_WATERMARK } from "./site";

const KEY = "berete-filigrane";

/** The choice of this visit (?filigrane=, then kept), else the setting. */
function current(): boolean {
  try {
    const asked = new URLSearchParams(window.location.search).get("filigrane");
    if (asked === "0" || asked === "1") sessionStorage.setItem(KEY, asked);
    const choice = sessionStorage.getItem(KEY);
    if (choice === "0" || choice === "1") return choice === "1";
  } catch {
    /* private browsing: the setting */
  }
  return BRAND_WATERMARK;
}

const nothing = () => () => undefined;

/** Whether the monogram BRT is shown (the setting on the server, the choice of the visit in the browser). */
export function useBrandWatermark(): boolean {
  return useSyncExternalStore(nothing, current, () => BRAND_WATERMARK);
}
