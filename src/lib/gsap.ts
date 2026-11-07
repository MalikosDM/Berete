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

export function scrollToY(y: number, opts: ScrollToOptions = {}): void {
  const { duration = 1, immediate = false, onComplete } = opts;
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(y, {
      duration,
      immediate,
      force: true,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      onComplete: () => onComplete?.(),
    });
    return;
  }
  if (typeof window === "undefined") return;
  const instant = immediate || prefersReducedMotion();
  window.scrollTo({ top: y, behavior: instant ? "auto" : "smooth" });
  if (onComplete) window.setTimeout(onComplete, instant ? 0 : duration * 1000);
}
