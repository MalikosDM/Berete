import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useBrandWatermark } from "@/lib/brandmark";
import { createPortal } from "react-dom";
import { BACKDROPS, THEME_FONTS, type BackdropSpot, type ResolvedTheme, type ThemeFontSpec } from "@/data/themes";
import brand from "@/data/brand.generated.json" with { type: "json" };
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

/**
 * The numbers of a spot of an AI background (scripts/universe-media.mjs), by kind, as CSS variables (src/index.css,
 * ".u-spot"): x, y its place (shares of the width and of the height of the image), r a radius (share of the width), w and
 * h a width (share of the width) and a height (share of the height), a an angle (degrees).
 *   glow: a light that breathes (a projector, a lamp, the sun, a fire); star: a star that twinkles (seq: they light up one
 *   after the other, the constellation of N14); flame: a candle flame; wisp: the smoke of a candle; spin and swing: a
 *   reflection that turns on a wheel, or swings on the balance of a watch; cone: the light of a projector (a: its tilt);
 *   beam: a stadium light bar that sways; rays: shafts of light through a window (w: their length, a: their tilt);
 *   ripples: the reflections of wet pavements; heat: the air over a fire; folds: a curtain that barely moves; sails: the
 *   sails of a windmill turning slowly (r: their length; the painted ones are removed from the image); eye: an eye of a
 *   mask that glows now and then (the two eyes of one mask share their number i); flash: lightning lighting up a cloud.
 */
const SPOT_PARAMS: Record<string, string[]> = {
  glow: ["x", "y", "r"],
  star: ["x", "y", "r"],
  flame: ["x", "y", "r"],
  wisp: ["x", "y", "r"],
  spin: ["x", "y", "r"],
  swing: ["x", "y", "r"],
  sails: ["x", "y", "r"],
  eye: ["x", "y", "r"],
  flash: ["x", "y", "r"],
  cone: ["x", "y", "w", "h", "a"],
  beam: ["x", "y", "w", "h"],
  rays: ["x", "y", "w", "a"],
  ripples: ["x", "y", "w", "h"],
  heat: ["x", "y", "w", "h"],
  folds: ["x", "y", "w", "h"],
};
/** The four sails of a windmill: a spar and its lattice each, around the hub (drawn in a square of 200, centre 0). */
function Sails() {
  return (
    <svg viewBox="-100 -100 200 200" aria-hidden="true">
      {[0, 90, 180, 270].map((a) => (
        <g key={a} transform={"rotate(" + a + ")"}>
          <rect x={-2.6} y={-100} width={5.2} height={92} />
          <rect x={2.6} y={-96} width={17} height={70} fillOpacity={0.32} />
          {[-90, -78, -66, -54, -42, -30].map((y) => (
            <rect key={y} x={2.6} y={y} width={17} height={1.6} />
          ))}
          <rect x={18.4} y={-96} width={1.6} height={70} />
        </g>
      ))}
      <circle r={6.5} />
    </svg>
  );
}

/** The inner pieces of a spot (its flame, its puffs of smoke, its shafts, its folds). */
const SPOT_PARTS: Record<string, number> = { flame: 1, wisp: 2, rays: 3, heat: 2, folds: 3 };

function spotStyle(spot: BackdropSpot, index: number): CSSProperties {
  const style: Record<string, string | number> = { "--i": spot.i ?? index };
  for (const [side, values] of [["d", spot.d], ["m", spot.m]] as const) {
    (SPOT_PARAMS[spot.k] ?? []).forEach((name, n) => {
      if (values && values[n] !== undefined) style["--" + side + name] = values[n]!;
    });
  }
  return style as CSSProperties;
}

function regionStyle(r: { d?: number[]; m?: number[] }): CSSProperties {
  const style: Record<string, number> = {};
  for (const [side, values] of [["d", r.d], ["m", r.m]] as const) {
    if (values) ["x0", "y0", "x1", "y1"].forEach((name, n) => (style["--" + side + name] = values[n]!));
  }
  return style as CSSProperties;
}

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
  // The name BERETE in its background (src/lib/site.ts, BRAND_WATERMARK).
  const watermark = useBrandWatermark();
  const [impact, setImpact] = useState<{ x: number; y: number; key: number } | null>(null);
  const effects = theme.effects;
  const backdrop = theme.backdrop ? BACKDROPS[theme.backdrop] : undefined;
  const uploaded = theme.backdrop && !backdrop ? theme.backdrop : "";
  // A sequence (the night of Lasana Keita): its images one after the other, each with its own lights; else the image.
  const sequence = backdrop?.sequence?.filter((id) => BACKDROPS[id]) ?? null;
  const frames = sequence ? sequence.map((id) => ({ id, b: BACKDROPS[id]! })) : backdrop ? [{ id: theme.backdrop, b: backdrop }] : [];
  const [active, setActive] = useState(0);
  // The other images of a sequence load once the page is there (the first one alone before).
  const [allFrames, setAllFrames] = useState(false);
  const canvasEffects = effects.filter((e) =>
    ["dust", "embers", "glints", "lightning", "speedlines", "butterflies", "confetti", "gold-confetti", "petals", "maple", "feathers", "stars", "genkidama", "flashes", "serpent", "fireflies", "sparks", "light-lines", "prism", "dew", "beam-dust", "drops", "void"].includes(e),
  );
  // The lights of the image that come alive, and the places where some effects of the canvas happen.
  const frameSpots = frames.map((f) => (effects.includes("scene") ? (f.b.spots ?? []) : []));
  const frameRegions = frames.map((f) => f.b.regions ?? {});
  const hasSpots = frameSpots.some((l) => l.length > 0) || frameRegions.some((r) => Object.keys(r).length > 0);
  // A light laid on the image: the sphere of the Genkidama (its glow, and where the particles of light go), else the moon
  // of the backdrop, shining barely.
  const genkidama = Boolean(backdrop?.core && effects.includes("genkidama"));
  // The endless space of The Hand: the same sphere, its light breathing slowly, rings rippling from it, lines rushing to it.
  const infinite = !genkidama && Boolean(backdrop?.core && effects.includes("void"));
  const moon = !genkidama && !infinite && Boolean(backdrop?.moon && effects.includes("moon"));
  const core = genkidama || infinite ? backdrop!.core! : moon ? backdrop!.moon! : null;
  const mobileCore = (genkidama || infinite ? backdrop?.mobileCore : backdrop?.mobileMoon) ?? core;
  const fxKey = canvasEffects.join(" ") + "|" + theme.glow + "|" + theme.preset;

  useEntrance(ref, preview || fixed ? undefined : slug);

  // A sequence: each image holds its time, then the next one comes in a slow fade; it waits deep in the page and while the
  // page is hidden. Asked for less motion: the last image (the celebration), still. The admin shows the first one.
  const seqLength = sequence?.length ?? 0;
  const hold = (backdrop?.hold ?? 8) * 1000;
  useEffect(() => {
    if (seqLength < 2 || preview) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Known only in the browser (the page written by the server shows the first image).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAllFrames(true);
      setActive(seqLength - 1);
      return undefined;
    }
    let timer = 0;
    const cancel = afterLoad(
      () => {
        setAllFrames(true);
        timer = window.setInterval(() => {
          if (document.hidden || ref.current?.hasAttribute("data-deep")) return;
          setActive((a) => (a + 1) % seqLength);
        }, hold);
      },
      { delay: 400 },
    );
    return () => {
      cancel();
      window.clearInterval(timer);
    };
  }, [seqLength, hold, preview]);

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
      // The piece of the opening rests too (its effect: src/components/universe/JewelFx.tsx).
      el.parentElement?.toggleAttribute("data-deep", window.scrollY > window.innerHeight * 1.1);
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
          const regionEls = Object.fromEntries([...(canvas.parentElement?.querySelectorAll<HTMLElement>(".u-region") ?? [])].map((r) => [r.dataset.region ?? "", r]));
          fxRef.current = m.startFx(canvas, { effects: canvasEffects, glow: theme.glow, tint: theme.tint, preset: theme.preset, impact: effects.includes("impact") && !fixed, core: coreEl, regions: regionEls, root: canvas.parentElement, fixed });
        })
          // Its file not loaded (the visitor left the page meanwhile, a network cut): the page simply stays without effects.
          .catch(() => undefined);
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
  // Its files: "<id>-1600.<version>.webp" (a background made since 23/11/2026 carries its version), else "<id>-1600.webp".
  const file = (id: string, kind: string, w: number, ext: string) => "/media/universes/" + id + kind + w + (BACKDROPS[id]?.version ? "." + BACKDROPS[id]!.version : "") + "." + ext;
  const set = (id: string, widths: number[], kind: string, ext: string) => widths.map((w) => file(id, kind, w, ext) + " " + w + "w").join(", ");
  const on = (i: number) => (sequence ? (i === active ? "" : undefined) : undefined);

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
        {frames.length > 0 ? (
          frames.map(({ id, b }, i) =>
            i === 0 || allFrames ? (
              <picture key={id} className="u-backdrop" data-frame={sequence ? i : undefined} data-frame-id={sequence ? id : undefined} data-on={on(i)}>
                <source media="(max-aspect-ratio: 4/5)" type="image/avif" srcSet={set(id, b.mobileWidths, "-m-", "avif")} sizes="57vh" />
                <source media="(max-aspect-ratio: 4/5)" type="image/webp" srcSet={set(id, b.mobileWidths, "-m-", "webp")} sizes="57vh" />
                <source type="image/avif" srcSet={set(id, b.widths, "-", "avif")} sizes="145vw" />
                <img src={file(id, "-", 1600, "webp")} srcSet={set(id, b.widths, "-", "webp")} sizes="145vw" alt="" decoding="async" fetchPriority="low" />
              </picture>
            ) : null,
          )
        ) : uploaded ? (
          <picture className="u-backdrop" data-uploaded="">
            <img src={uploaded} alt="" decoding="async" fetchPriority="low" />
          </picture>
        ) : null}
        {core && mobileCore ? (
          // Laid over the image exactly (src/index.css): the glow of the sphere breathes, the particles go to its heart.
          <div className="u-genki" data-spot={moon ? "moon" : infinite ? "void" : "genkidama"} style={{ "--g-x": core[0], "--g-y": core[1], "--g-r": core[2], "--g-mx": mobileCore[0], "--g-my": mobileCore[1], "--g-mr": mobileCore[2] } as CSSProperties}>
            <div className="u-genki-box">
              {infinite ? [0, 1, 2].map((n) => <span key={n} className="u-void-ring" style={{ "--i": n } as CSSProperties} />) : null}
              <span className="u-genki-glow" />
              {genkidama || infinite ? <span className="u-genki-core" /> : null}
            </div>
          </div>
        ) : null}
        {hasSpots ? (
          // Laid over the image exactly, like the sphere above (src/index.css, ".u-spots").
          <div className="u-spots">
            <div className="u-spots-box">
              {frames.map((f, fi) =>
                fi === 0 || allFrames ? (
                  // The lights of each image of a sequence come and go with it; its regions are off meanwhile (data-off).
                  <span key={f.id} className="u-frame" data-frame={sequence ? fi : undefined} data-on={on(fi)}>
                    {frameSpots[fi]!.map((spot, i) => (
                      <span
                        key={i}
                        className="u-spot"
                        data-kind={spot.k}
                        data-tone={spot.tone}
                        data-seq={spot.seq ? "" : undefined}
                        data-desktop={spot.d ? undefined : "none"}
                        data-mobile={spot.m ? undefined : "none"}
                        style={spotStyle(spot, i)}
                      >
                        {spot.k === "sails" ? <Sails /> : Array.from({ length: SPOT_PARTS[spot.k] ?? 0 }, (_, n) => <i key={n} />)}
                      </span>
                    ))}
                    {Object.entries(frameRegions[fi]!).map(([name, r]) => (
                      <i key={name} className="u-region" data-region={name} data-off={sequence && fi !== active ? "" : undefined} data-desktop={r.d ? undefined : "none"} data-mobile={r.m ? undefined : "none"} style={regionStyle(r)} />
                    ))}
                  </span>
                ) : null,
              )}
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
        {/* The name of the house, very discreet, in every capsule (Yoni, 23/11/2026): over the decor and its veil (else the
            veil of a phone hides it), under the whole page, never over a jewel (the universe is behind the page). Its
            setting: BRAND_WATERMARK (src/lib/site.ts). */}
        {preview || fixed || !watermark ? null : <span className="u-brand" style={{ "--u-brand": "url(" + brand.berete.src + ")" } as CSSProperties} />}
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
