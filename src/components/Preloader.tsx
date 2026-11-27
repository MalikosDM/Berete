import { useEffect, useState, type CSSProperties } from "react";
import monogram from "@/data/monogram-lines.generated.json" with { type: "json" };
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

/** When the intro starts to leave, and when it is gone (ms): shorter than before 27/11/2026 (2.6 s, then 3.3 s). */
const LEAVE = 1900;
const GONE = 2500;
/** Each line draws itself in DRAW s: the outlines (the diamond, B, R, T) first, then the facets inside the diamond. */
const DRAW = 0.8;
const delayOf = (i: number) => (i < monogram.outlines ? i * 0.06 : 0.3 + (i - monogram.outlines) * 0.025);
/** Three points of the diamond (its crown and its girdle, in % of the monogram, as in src/components/Monogram.tsx). */
const SPARKS: [number, number][] = [
  [53.5, 11.1],
  [78.2, 25.1],
  [98.6, 26.8],
];

/**
 * The intro of the house, on the first page of a visit (Yoni, 26/11/2026: "my logo that loads"): on black, the monogram BRT and
 * its diamond draw themselves in fine lines of rose gold (the lines of the logo, src/data/monogram-lines.generated.json, npm run
 * brand), the three points of the diamond twinkle once, and the whole fades away. Short (gone in 2.5 s), and gone at once on
 * the first gesture (a click, a key, the wheel, a touch). Never with « reduce motion » (nothing moves: the page shows at once).
 */
export default function Preloader() {
  const [state, setState] = useState<"off" | "on" | "leaving">("off");

  useEffect(() => {
    if (!firstOfVisit()) return introDone();
    // First visit of the session: the intro starts on the next frame.
    const id = window.requestAnimationFrame(() => {
      played = true;
      setState("on");
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (state !== "on") return undefined;
    const leave = () => {
      setState("leaving");
      introDone();
    };
    const a = window.setTimeout(leave, LEAVE);
    const gestures = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const g of gestures) window.addEventListener(g, leave, { passive: true, once: true });
    return () => {
      window.clearTimeout(a);
      for (const g of gestures) window.removeEventListener(g, leave);
    };
  }, [state]);

  useEffect(() => {
    if (state !== "leaving") return undefined;
    const b = window.setTimeout(() => setState("off"), GONE - LEAVE);
    return () => window.clearTimeout(b);
  }, [state]);

  if (state === "off") return null;

  const [x, y, w, h] = monogram.viewBox.split(" ").map(Number) as [number, number, number, number];
  return (
    <div
      aria-hidden="true"
      data-preloader
      className={"fixed inset-0 z-[100] flex items-center justify-center bg-ink transition-opacity duration-[600ms] ease-out " + (state === "leaving" ? "pointer-events-none opacity-0" : "opacity-100")}
    >
      <div className="preloader-mark relative" style={{ aspectRatio: w / h } as CSSProperties}>
        <svg viewBox={monogram.viewBox} className="block h-full w-full overflow-visible" fill="none" strokeWidth={0.9} strokeLinejoin="round">
          <defs>
            <linearGradient id="preloader-rose-gold" gradientUnits="userSpaceOnUse" x1={x} y1={y} x2={x + w} y2={y + h}>
              <stop offset="0" stopColor="#9C5B4F" />
              <stop offset="0.5" stopColor="#E8B4A0" />
              <stop offset="1" stopColor="#B76E79" />
            </linearGradient>
          </defs>
          <g stroke="url(#preloader-rose-gold)">
            {monogram.lines.map((d, i) => (
              <path key={i} d={d} pathLength={1} data-preloader-line className="preloader-line" style={{ animationDuration: DRAW + "s", animationDelay: delayOf(i).toFixed(3) + "s" }} />
            ))}
          </g>
        </svg>
        {SPARKS.map(([sx, sy], i) => (
          <span key={i} className="preloader-spark" style={{ left: sx + "%", top: sy + "%", animationDelay: 1.25 + i * 0.12 + "s" }} />
        ))}
      </div>
    </div>
  );
}
