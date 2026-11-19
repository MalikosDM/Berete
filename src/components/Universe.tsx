import type { CSSProperties } from "react";
import type { ResolvedTheme } from "@/data/themes";

/*
 * The universe of a piece: the background of its page (src/data/themes.ts), behind the content and never over it. A
 * deep base and the colour of the universe, its texture, its light and a slow motion, all drawn by the style sheet
 * (src/index.css, ".universe"): light on a phone, still when the visitor asks for reduced motion, nothing moves in the
 * layout (a fixed stage, no size of its own). It fades in when the page opens: entering the world of the piece.
 */

/** The particles of the motion, always at the same places (the server and the browser draw the same page). */
const PARTICLES: { x: number; y: number; s: number; d: number; t: number }[] = [
  { x: 72, y: 22, s: 5, d: 0, t: 16 },
  { x: 84, y: 48, s: 3, d: 2.4, t: 19 },
  { x: 61, y: 66, s: 4, d: 5.1, t: 15 },
  { x: 90, y: 14, s: 2, d: 1.2, t: 21 },
  { x: 55, y: 34, s: 3, d: 7.3, t: 17 },
  { x: 78, y: 80, s: 4, d: 3.6, t: 22 },
  { x: 66, y: 9, s: 2, d: 9.2, t: 18 },
  { x: 95, y: 62, s: 3, d: 4.4, t: 20 },
  { x: 48, y: 86, s: 2, d: 6.6, t: 16 },
  { x: 70, y: 52, s: 2, d: 8.1, t: 23 },
  { x: 38, y: 18, s: 3, d: 10.4, t: 19 },
  { x: 24, y: 70, s: 2, d: 11.6, t: 21 },
  { x: 12, y: 36, s: 3, d: 2.9, t: 24 },
  { x: 30, y: 92, s: 2, d: 12.8, t: 18 },
  { x: 86, y: 92, s: 3, d: 13.5, t: 17 },
  { x: 8, y: 8, s: 2, d: 6.1, t: 22 },
];

export default function Universe({ theme }: { theme: ResolvedTheme }) {
  const style = { "--u-base": theme.base, "--u-tint": theme.tint, "--u-glow": theme.glow } as CSSProperties;
  return (
    <div aria-hidden="true" className="universe" data-universe={theme.preset} data-texture={theme.texture} data-light={theme.light} data-motion={theme.motion} style={style}>
      <div className="universe-stage">
        <div className="u-base" />
        <div className="u-light" />
        <div className="u-texture" />
        {theme.motion !== "none" && theme.motion !== "rotate" ? (
          <div className="u-motion">
            {PARTICLES.map((p, i) => (
              <span key={i} style={{ "--x": p.x + "%", "--y": p.y + "%", "--s": p.s + "px", "--d": -p.d + "s", "--t": p.t + "s" } as CSSProperties} />
            ))}
          </div>
        ) : null}
        <div className="u-veil" />
      </div>
    </div>
  );
}
