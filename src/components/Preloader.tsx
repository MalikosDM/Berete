import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { prefersReducedMotion } from "@/lib/gsap";

const KEY = "bj-intro-seen";

const LINES = [
  "M14 4 H50",
  "M14 4 L2 16",
  "M50 4 L62 16",
  "M2 16 H62",
  "M14 4 L22 16 L32 4 L42 16 L50 4",
  "M2 16 L32 46 L62 16",
  "M22 16 L32 46 L42 16",
];

export default function Preloader() {
  const [state, setState] = useState<"off" | "on" | "leaving">("off");

  useEffect(() => {
    if (prefersReducedMotion()) return;
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      return;
    }
    // First visit of the session: the intro starts on the next frame.
    const id = window.requestAnimationFrame(() => setState("on"));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (state !== "on") return undefined;
    const a = window.setTimeout(() => setState("leaving"), 2600);
    const b = window.setTimeout(() => setState("off"), 3300);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [state]);

  if (state === "off") return null;

  return (
    <div
      aria-hidden="true"
      className={"fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-ink transition-opacity duration-700 " + (state === "leaving" ? "pointer-events-none opacity-0" : "opacity-100")}
    >
      <svg viewBox="0 0 64 48" className="h-20 w-28 text-rose-light" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round">
        {LINES.map((d, i) => (
          <path
            key={d}
            d={d}
            pathLength={1}
            className="animate-[diamond-draw_0.5s_ease-out_forwards] [stroke-dasharray:1] [stroke-dashoffset:1]"
            style={{ animationDelay: i * 0.18 + "s" }}
          />
        ))}
      </svg>
      <Logo position="center" className="h-16 w-64 opacity-0 animate-[logo-in_0.8s_ease-out_1.4s_forwards]" />
    </div>
  );
}
