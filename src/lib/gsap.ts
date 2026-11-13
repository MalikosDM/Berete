import { useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import type Lenis from "lenis";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export { gsap, ScrollTrigger, SplitText };

/* ---------- Lenis holder ---------- */

let lenisInstance: Lenis | null = null;

export function getLenis(): Lenis | null {
  return lenisInstance;
}

export function setLenis(l: Lenis | null): void {
  lenisInstance = l;
}

/* ---------- Reduced motion ---------- */

const QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(QUERY).matches
  );
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => undefined;
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}

/* ---------- Programmatic scroll ---------- */

type ScrollToOptions = {
  duration?: number;
  immediate?: boolean;
  onComplete?: () => void;
};

/* While the page scrolls by itself (the magnet of a film), the bars that follow the visitor's direction ignore it. */
let autoUntil = 0;

// Any gesture of the visitor takes the scroll back at once.
if (typeof window !== "undefined") {
  const stop = () => (autoUntil = 0);
  for (const type of ["wheel", "touchstart", "pointerdown", "keydown"]) window.addEventListener(type, stop, { passive: true, capture: true });
}

/** Whether the page is being scrolled by the site, not by the visitor. */
export function isAutoScrolling(): boolean {
  return typeof performance !== "undefined" && performance.now() < autoUntil;
}

export function scrollToY(y: number, opts: ScrollToOptions = {}): void {
  const { duration = 1, immediate = false, onComplete } = opts;
  autoUntil = typeof performance !== "undefined" ? performance.now() + (immediate ? 100 : duration * 1000 + 150) : 0;
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(y, {
      duration,
      immediate,
      force: true,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      onComplete: () => {
        autoUntil = 0;
        onComplete?.();
      },
    });
    return;
  }
  if (typeof window === "undefined") return;
  const instant = immediate || prefersReducedMotion();
  window.scrollTo({ top: y, behavior: instant ? "auto" : "smooth" });
  if (onComplete) window.setTimeout(onComplete, instant ? 0 : duration * 1000);
}
