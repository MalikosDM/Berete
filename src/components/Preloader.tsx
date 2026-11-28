import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/gsap";

const KEY = "bj-intro-seen";

/**
 * The intro is leaving (or there is none): what waited for it starts (the entrance of a universe, src/index.css and
 * src/components/Universe.tsx). index.html marks the page with data-intro before its first paint.
 */
function introDone(): undefined {
  const html = document.documentElement;
  if (!html.hasAttribute("data-intro")) return undefined;
  html.removeAttribute("data-intro");
  window.dispatchEvent(new Event("berete:intro-done"));
  return undefined;
}

/**
 * Whether this page load opens on the intro: the first page of a visit, without « reduce motion ». Decided once per load (the
 * effect may run twice in development), and never again once the intro has played.
 */
let first: boolean | null = null;
let played = false;
function firstOfVisit(): boolean {
  if (played) return false;
  if (first !== null) return first;
  if (prefersReducedMotion()) return (first = false);
  try {
    if (sessionStorage.getItem(KEY)) return (first = false);
    sessionStorage.setItem(KEY, "1");
  } catch {
    return (first = false);
  }
  return (first = true);
}

/**
 * The intro of the house (Yoni, 26/11/2026: "my logo that loads"), written into index.html so that it is there from the first
 * paint (scripts/intro-markup.mjs): on black, the monogram BRT draws itself in fine rose gold lines. Since 28/11/2026 it lasts
 * only as long as the page gets ready: it leaves at READY ms at the soonest (the time to see the lines drawn), as soon as the
 * page is ready, never later than LATEST ms; gone at once on the first gesture (a click, a key, the wheel, a touch). Never with
 * « reduce motion » (index.html never shows it). Before 28/11/2026 it played 2.5 s over a page already there.
 */
const READY = 650;
const LATEST = 1200;
const FADE = 400;

export default function Preloader() {
  useEffect(() => {
    const el = document.getElementById("bj-intro");
    if (!firstOfVisit() || !document.documentElement.hasAttribute("data-intro")) {
      el?.remove();
      return introDone();
    }
    played = true;
    const started = performance.now();
    let gone = false;
    const leave = () => {
      if (gone) return;
      gone = true;
      document.documentElement.setAttribute("data-intro", "leaving");
      // The universe of the page starts its entrance while the intro fades.
      window.setTimeout(() => {
        introDone();
        el?.remove();
      }, FADE);
    };
    // Ready: the page painted under it (this effect runs once the page is there), its first image decoded; at the soonest READY.
    const img = document.querySelector<HTMLImageElement>("[data-piece-cover] img, [data-home-photo-img], main img");
    const decoded = img && !img.complete ? img.decode().catch(() => undefined) : Promise.resolve();
    void decoded.then(() => window.setTimeout(leave, Math.max(0, READY - (performance.now() - started))));
    const latest = window.setTimeout(leave, LATEST);
    const gestures = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const g of gestures) window.addEventListener(g, leave, { passive: true, once: true });
    return () => {
      window.clearTimeout(latest);
      for (const g of gestures) window.removeEventListener(g, leave);
    };
  }, []);
  return null;
}
