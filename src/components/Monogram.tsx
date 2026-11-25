import { useEffect, useRef, type CSSProperties } from "react";
import brand from "@/data/brand.generated.json" with { type: "json" };

/** Three points of the diamond (its crown and its girdle, in % of the monogram) that twinkle when the light passes over them. */
const SPARKS: [number, number][] = [
  [53.5, 11.1],
  [78.2, 25.1],
  [98.6, 26.8],
];
/** The reach of the light (px), the share of the way it follows the mouse at each frame, the depth of the relief (px at most). */
const RADIUS = 220;
const FOLLOW = 0.12;
const DEPTH = 10;

/**
 * The monogram BRT and its diamond in the background of the pages (Malik, 24/11/2026: in place of the name BERETE), in fine
 * lines at 5 % (public/media/brand/monogram.<v>.svg, npm run brand). Alive but discreet: on a computer a soft light follows
 * the mouse over its lines only (a radial light masked by the drawing), with a little inertia, a few points of the diamond
 * twinkle as it passes, and the drawing moves at most DEPTH px away from the mouse (a relief). Without a mouse (a phone, a
 * tablet) the light passes alone, slowly, every 9 seconds, in a diagonal (CSS only). With « reduce motion », it stays still,
 * without light. Only transforms and opacities; the frames stop once the light has arrived, when the tab is hidden or the
 * monogram is out of sight.
 */
export default function Monogram({ page = false }: { page?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const shift = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const sparks = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    let seen = true;
    const pause = () => {
      const on = seen && !document.hidden;
      if (on) delete el.dataset.paused;
      else el.dataset.paused = "";
      return on;
    };
    const io = new IntersectionObserver(([entry]) => {
      seen = Boolean(entry?.isIntersecting);
      pause();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", pause);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (still || !mouse) {
      // A phone: the light passes alone (CSS); « reduce motion »: nothing moves.
      return () => {
        io.disconnect();
        document.removeEventListener("visibilitychange", pause);
      };
    }
    el.dataset.follow = "";
    let rect = el.getBoundingClientRect();
    const target = { x: rect.width / 2, y: rect.height / 2, dx: 0, dy: 0 };
    const now = { ...target };
    const lit = SPARKS.map(() => 0);
    let frame = 0;
    const draw = () => {
      frame = 0;
      now.x += (target.x - now.x) * FOLLOW;
      now.y += (target.y - now.y) * FOLLOW;
      now.dx += (target.dx - now.dx) * FOLLOW;
      now.dy += (target.dy - now.dy) * FOLLOW;
      if (shift.current) shift.current.style.transform = "translate3d(" + now.dx.toFixed(2) + "px, " + now.dy.toFixed(2) + "px, 0)";
      // The light, in the frame of the drawing (which moved with the relief).
      const lx = now.x - now.dx;
      const ly = now.y - now.dy;
      if (light.current) light.current.style.transform = "translate3d(" + (lx - rect.width / 2).toFixed(1) + "px, " + (ly - rect.height / 2).toFixed(1) + "px, 0)";
      SPARKS.forEach(([sx, sy], i) => {
        const d = Math.hypot((sx / 100) * rect.width - lx, (sy / 100) * rect.height - ly);
        const v = Math.round(Math.max(0, 1 - d / RADIUS) ** 2 * 10) / 10;
        const spark = sparks.current[i];
        if (spark && v !== lit[i]) {
          lit[i] = v;
          spark.style.opacity = String(v * 0.6);
        }
      });
      const moving = Math.abs(target.x - now.x) + Math.abs(target.y - now.y) + Math.abs(target.dx - now.dx) + Math.abs(target.dy - now.dy) > 0.4;
      if (moving && pause()) frame = requestAnimationFrame(draw);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target.x = e.clientX - rect.left;
      target.y = e.clientY - rect.top;
      // The relief: away from the mouse, DEPTH px at most at the edges of the window.
      target.dx = -((e.clientX / window.innerWidth) * 2 - 1) * DEPTH;
      target.dy = -((e.clientY / window.innerHeight) * 2 - 1) * DEPTH;
      el.dataset.lit = "";
      if (!frame && pause()) frame = requestAnimationFrame(draw);
    };
    const onLeave = () => delete el.dataset.lit;
    const onResize = () => {
      rect = el.getBoundingClientRect();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      document.removeEventListener("visibilitychange", pause);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize);
    };
  }, []);

  return (
    <div
      ref={root}
      aria-hidden="true"
      data-monogram
      className={"monogram" + (page ? " monogram-page" : "")}
      style={{ "--monogram": "url(" + brand.monogram.src + ")", "--monogram-ratio": brand.monogram.ratio } as CSSProperties}
    >
      <div ref={shift} className="monogram-shift">
        <img src={brand.monogram.src} alt="" className="monogram-lines" decoding="async" draggable={false} />
        <div className="monogram-glow">
          <div ref={light} className="monogram-light" />
        </div>
        {SPARKS.map(([x, y], i) => (
          <span
            key={i}
            ref={(s) => {
              sparks.current[i] = s;
            }}
            className="monogram-spark"
            style={{ left: x + "%", top: y + "%", "--i": i } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
