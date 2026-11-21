import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { BACKDROPS, THEME_FONTS, type ResolvedTheme, type ThemeFontSpec } from "@/data/themes";
import { afterLoad } from "@/lib/idle";

/*
 * The universe of a piece: the world the visitor enters (src/data/themes.ts), behind the content and never over it.
 *   - The stage (sticky, one screen high): the deep base, the full-screen backdrop (an AI background, else a procedural
 *     composition), a light laid on the image (the sphere of the Genkidama, the moon), the light, the texture, a
 *     watermark, the smoke (drifting or rising) or the twenty stars, the canvas of the effects
 *     (src/components/universe/fx.ts, loaded after the content) and the veil that keeps the texts readable.
 *   - The entrance: 1 to 2 seconds of cinema the first time the page opens in a visit, drawn by the style sheet
 *     (src/index.css, "[data-entering]") so that it starts with the page itself; never again on a return, never over
 *     the texts (they are readable at once), nothing at all when the visitor asks for reduced motion.
 *   - During the scroll the backdrop goes back into the depth, and the effects answer the speed of the scroll.
 * Nothing here has a size of its own: no layout shift.
 */

const SEEN_KEY = "berete:universes";

/** The particles of the CSS bursts of the entrances, always at the same places (the server and the browser draw the same page). */
const BURST: { a: number; d: number; s: number; t: number }[] = Array.from({ length: 14 }, (_, i) => ({
  a: (i * 360) / 14 + ((i * 37) % 19),
  d: 22 + ((i * 53) % 30),
  s: 0.7 + ((i * 29) % 7) / 10,
  t: (i % 5) * 0.05,
}));

/** The twenty stars of Inter Milan, on an arc above the ring. */
const TWENTY = Array.from({ length: 20 }, (_, i) => {
  const a = Math.PI * (1.08 - (i / 19) * 1.16);
  return { x: 50 + Math.cos(a) * 48, y: 62 - Math.sin(a) * 54 };
});

/** A Japanese or Chinese glyph: the watermark takes the brush font. */
const isBrush = (mark: string) => [...mark].some((c) => (c.codePointAt(0) ?? 0) >= 0x3040 && (c.codePointAt(0) ?? 0) <= 0x9fff);

/** The CSS variables and attributes of a universe, for the page that holds it (its title takes the typography). */
export function universeProps(theme: ResolvedTheme): { style: CSSProperties; "data-font": string } {
  const f = THEME_FONTS[theme.font] as ThemeFontSpec;
  const style = {
    "--u-base": theme.base,
    "--u-tint": theme.tint,
    "--u-glow": theme.glow,
    "--u-font-family": f.family ? '"' + f.family + '", var(--font-display)' : "var(--font-display)",
    "--u-font-weight": String(f.weight),
    "--u-font-style": f.italic ? "italic" : "normal",
    "--u-font-case": f.caps ? "uppercase" : "none",
    "--u-font-tracking": f.tracking,
    "--u-font-scale": String(f.scale),
  } as CSSProperties;
  return { style, "data-font": theme.font };
}

/**
 * The entrance plays once per piece and per visit: the page is written with `data-entering` (the server cannot know),
 * and on a return the attribute goes before the first paint.
 */
function useEntrance(ref: React.RefObject<HTMLElement | null>, slug: string | undefined) {
  useLayoutEffect(() => {
    const page = ref.current?.closest<HTMLElement>("[data-entering]");
    if (!page || !slug) return undefined;
    let seen: string[] = [];
    try {
      seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[];
    } catch {
      /* private browsing: the entrance plays */
    }
    if (seen.includes(slug)) {
      page.removeAttribute("data-entering");
      return undefined;
    }
    try {
      sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, slug].slice(-60)));
    } catch {
      /* nothing to remember */
    }
    // Its time starts once the intro of the house has left (the first page of a visit), else at once.
    let timer = 0;
    const play = () => {
      timer = window.setTimeout(() => page.removeAttribute("data-entering"), 2600);
    };
    if (document.documentElement.hasAttribute("data-intro")) window.addEventListener("berete:intro-done", play, { once: true });
    else play();
    return () => {
      window.removeEventListener("berete:intro-done", play);
      window.clearTimeout(timer);
    };
  }, [ref, slug]);
}

type Fx = { stop: () => void; impact: (x: number, y: number) => void };

/**
 * preview: the admin (a small frame, nothing moves). fixed: the world behind another layer that covers the screen (a story
 * of the piece, src/components/stories/StoryViewer.tsx): the whole screen, no entrance, the effects without the scroll.
 */
export default function Universe({ theme, slug, preview = false, fixed = false }: { theme: ResolvedTheme; slug?: string; preview?: boolean; fixed?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<Fx | null>(null);
  const [impact, setImpact] = useState<{ x: number; y: number; key: number } | null>(null);
  const effects = theme.effects;
  const backdrop = theme.backdrop ? BACKDROPS[theme.backdrop] : undefined;
  const uploaded = theme.backdrop && !backdrop ? theme.backdrop : "";
  const canvasEffects = effects.filter((e) => ["dust", "embers", "glints", "lightning", "speedlines", "butterflies", "confetti", "gold-confetti", "petals", "stars", "genkidama"].includes(e));
  // A light laid on the image: the sphere of the Genkidama (its glow, and where the particles of light go), else the moon
  // of the backdrop, shining barely.
  const genkidama = Boolean(backdrop?.core && effects.includes("genkidama"));
  const moon = !genkidama && Boolean(backdrop?.moon && effects.includes("moon"));
  const core = genkidama ? backdrop!.core! : moon ? backdrop!.moon! : null;
  const mobileCore = (genkidama ? backdrop?.mobileCore : backdrop?.mobileMoon) ?? core;
  const fxKey = canvasEffects.join(" ") + "|" + theme.glow + "|" + theme.preset;

  useEntrance(ref, preview || fixed ? undefined : slug);

  // The backdrop goes back into the depth once the opening has passed: the texts below read on a calm ground.
  useEffect(() => {
    if (preview || fixed) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      el.style.setProperty("--u-scroll", String(Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.9))).toFixed(3)));
      // Deep in the page (the texts, the photos), the world rests: its slow motions pause (src/index.css), its effects stop.
      el.toggleAttribute("data-deep", window.scrollY > window.innerHeight * 1.1);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [preview, fixed]);

  // The effects: a small module, loaded once the page is there (never before the content), not at all when the visitor
  // asks for reduced motion.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (preview || !canvas || canvasEffects.length === 0) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let cancelled = false;
    const cancel = afterLoad(
      () => {
        void import("./universe/fx").then((m) => {
          if (cancelled) return;
          const coreEl = canvas.parentElement?.querySelector<HTMLElement>(".u-genki-core") ?? null;
          fxRef.current = m.startFx(canvas, { effects: canvasEffects, glow: theme.glow, tint: theme.tint, preset: theme.preset, impact: effects.includes("impact") && !fixed, core: coreEl, fixed });
        });
      },
      { delay: 200, onGesture: true },
    );
    return () => {
      cancelled = true;
      cancel();
      fxRef.current?.stop();
      fxRef.current = null;
    };
    // fxKey stands for the effects and their colours.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, fixed, fxKey]);

  // The impact: opening a photo strikes like a blow (src/components/HorizontalGallery.tsx sends "universe:impact").
  useEffect(() => {
    if (preview || fixed || !effects.includes("impact")) return undefined;
    const onImpact = (e: Event) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
      setImpact({ x, y, key: Date.now() });
      fxRef.current?.impact(x, y);
    };
    window.addEventListener("universe:impact", onImpact);
    return () => window.removeEventListener("universe:impact", onImpact);
  }, [preview, fixed, effects]);

  useEffect(() => {
    if (!impact) return undefined;
    const t = window.setTimeout(() => setImpact(null), 700);
    return () => window.clearTimeout(t);
  }, [impact]);

  const vars = {
    "--u-base": theme.base,
    "--u-tint": theme.tint,
    "--u-glow": theme.glow,
    ...(backdrop ? { "--u-ratio": String(backdrop.ratio), "--u-fx": String(backdrop.focusX) } : {}),
  } as CSSProperties;
  const base = backdrop ? "/media/universes/" + theme.backdrop : "";
  const set = (widths: number[], kind: string, ext: string) => widths.map((w) => base + kind + w + "." + ext + " " + w + "w").join(", ");

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="universe"
      data-universe={theme.preset}
      data-texture={theme.texture}
      data-light={theme.light}
      data-entrance={theme.entrance}
      data-effects={effects.join(" ")}
      data-backdrop={theme.backdrop || undefined}
      data-preview={preview || fixed ? "" : undefined}
      data-fixed={fixed ? "" : undefined}
      style={vars}
    >
      <div className="universe-stage">
        <div className="u-base" />
        {backdrop ? (
          <picture className="u-backdrop">
            <source media="(max-aspect-ratio: 4/5)" type="image/avif" srcSet={set(backdrop.mobileWidths, "-m-", "avif")} sizes="57vh" />
            <source media="(max-aspect-ratio: 4/5)" type="image/webp" srcSet={set(backdrop.mobileWidths, "-m-", "webp")} sizes="57vh" />
            <source type="image/avif" srcSet={set(backdrop.widths, "-", "avif")} sizes="145vw" />
            <img src={base + "-1600.webp"} srcSet={set(backdrop.widths, "-", "webp")} sizes="145vw" alt="" decoding="async" fetchPriority="low" />
          </picture>
        ) : uploaded ? (
          <picture className="u-backdrop" data-uploaded="">
            <img src={uploaded} alt="" decoding="async" fetchPriority="low" />
          </picture>
        ) : null}
        {core && mobileCore ? (
          // Laid over the image exactly (src/index.css): the glow of the sphere breathes, the particles go to its heart.
          <div className="u-genki" data-spot={moon ? "moon" : "genkidama"} style={{ "--g-x": core[0], "--g-y": core[1], "--g-r": core[2], "--g-mx": mobileCore[0], "--g-my": mobileCore[1], "--g-mr": mobileCore[2] } as CSSProperties}>
            <div className="u-genki-box">
              <span className="u-genki-glow" />
              {genkidama ? <span className="u-genki-core" /> : null}
            </div>
          </div>
        ) : null}
        <div className="u-light" />
        <div className="u-texture" />
        {theme.mark ? (
          <span className="u-mark" data-brush={isBrush(theme.mark) ? "" : undefined}>
            {theme.mark}
          </span>
        ) : null}
        {effects.includes("smoke") ? (
          <div className="u-smoke">
            <span />
            <span />
            <span />
          </div>
        ) : null}
        {effects.includes("smoke-rise") ? (
          // The smoke of the flares: columns rising slowly from the bottom of the screen, one after the other.
          <div className="u-smoke" data-rise="">
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : null}
        {effects.includes("iridescence") ? <div className="u-iris" /> : null}
        {effects.includes("rain") ? <div className="u-rain" /> : null}
        {effects.includes("twenty-stars") ? (
          <div className="u-twenty">
            {TWENTY.map((s, i) => (
              <span key={i} style={{ left: s.x + "%", top: s.y + "%", "--i": i } as CSSProperties} />
            ))}
          </div>
        ) : null}
        {canvasEffects.length > 0 && !preview ? <canvas ref={canvasRef} className="u-fx" /> : null}
        <div className="u-veil" />
        {/* The entrance only: hidden once it has played (src/index.css). */}
        <div className="u-entrance">
          <span className="u-flash" />
          <span className="u-shock" />
          <span className="u-curtain">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="u-dark" />
          <span className="u-burst">
            {BURST.map((b, i) => (
              <i key={i} style={{ "--a": b.a + "deg", "--d": b.d + "vmin", "--s": b.s, "--t": b.t + "s" } as CSSProperties} />
            ))}
          </span>
        </div>
      </div>
      {impact && typeof document !== "undefined"
        ? createPortal(<span key={impact.key} aria-hidden="true" className="u-impact" style={{ left: impact.x, top: impact.y, "--u-glow": theme.glow } as CSSProperties} />, document.body)
        : null}
    </div>
  );
}
