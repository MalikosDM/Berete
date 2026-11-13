import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ScrollMedia } from "@/data/types";
import { useI18n } from "@/i18n";
import { ScrollTrigger, getLenis, scrollToY, useReducedMotion } from "@/lib/gsap";
import { afterLoad } from "@/lib/idle";

/**
 * A film played by the scroll: never by itself, never in a loop. Frozen on
 * its first frame, the scroll moves it forward and back frame by frame inside
 * a tall container whose 100vh block stays on screen until the last frame.
 * Drawn from a WebP frame sequence in a "cover" canvas (a lighter, portrait
 * sequence on phones); if the frames cannot load, a <video> moved with
 * currentTime takes over. Reduced motion: one still image per text step.
 */

export type ScrollStep = {
  /** Progress where the text appears and leaves, 0 to 1. */
  from: number;
  to: number;
  content: ReactNode;
  align?: "left" | "center" | "right";
  /** Classes of the box that places the text (padding, alignment), in place of the ones of `align`. */
  box?: string;
  /** Classes of the block of text (its width), in place of the ones of `align`. */
  inner?: string;
};

type ScrollVideoProps = {
  media: ScrollMedia;
  steps: ScrollStep[];
  /** Accessible name of the section. */
  label: string;
  /** Height of the scroll container, in vh. */
  heightVh?: number;
  /** Extra layer over the film, receives the progress 0 to 1. */
  overlay?: (p: number) => ReactNode;
  /** Gentle magnet towards each text step, cancelled by any new scroll. */
  magnet?: boolean;
  showProgress?: boolean;
};

const FADE = 0.025;
const EAGER_FRAMES = 12;
/** Wait after the page has loaded before the frame sequence downloads, when the visitor does nothing. */
const FRAMES_DELAY = 2500;

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const frameUrl = (path: string, i: number) => path + String(i + 1).padStart(4, "0") + ".webp";

function stepOpacity(p: number, s: ScrollStep): number {
  let o = 1;
  if (s.from > 0.001) o = Math.min(o, (p - s.from) / FADE);
  if (s.to < 0.999) o = Math.min(o, (s.to - p) / FADE);
  return clamp(o);
}

/** The usual padding of a text over the film: room for the navigation at the top, for the bar of buttons at the bottom on phones. */
const PADDING = "px-5 pt-40 pb-32 sm:px-8 md:pb-20 lg:px-12 ";

/**
 * A soft dark halo behind each text: whatever the frame shows behind it (the white gold of the ring...), the words stay
 * readable. Wider than the text, fading to nothing at its edges.
 */
function Halo() {
  return <span aria-hidden="true" data-text-halo className="pointer-events-none absolute -inset-x-[14vw] -inset-y-[12vh] -z-10 bg-[radial-gradient(closest-side,rgba(10,10,10,0.82),rgba(10,10,10,0.55)_50%,rgba(10,10,10,0)_100%)]" />;
}

const ALIGN: Record<NonNullable<ScrollStep["align"]>, { box: string; inner: string }> = {
  left: { box: "items-end justify-start text-start md:items-center", inner: "max-w-3xl" },
  center: { box: "items-center justify-center text-center", inner: "mx-auto max-w-4xl" },
  right: { box: "items-end justify-end text-end md:items-center", inner: "max-w-3xl" },
};

/** Portrait screens use the portrait sequence. null until the screen is known. */
function usePortrait(): boolean | null {
  const [portrait, setPortrait] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-aspect-ratio: 4/5)");
    const update = () => setPortrait(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return portrait;
}

function Sparkles() {
  const dots = [
    [12, 22, 0], [78, 18, 1.4], [64, 62, 2.6], [30, 70, 0.8], [88, 44, 3.4], [46, 34, 4.2], [20, 48, 5], [70, 82, 1.9],
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {dots.map(([x, y, d], i) => (
        <span key={i} className="sparkle absolute size-1 rounded-full bg-white" style={{ left: x + "%", top: y + "%", animationDelay: d + "s" }} />
      ))}
    </div>
  );
}

export default function ScrollVideo({ media, steps, label, heightVh = 700, overlay, magnet = true, showProgress = true }: ScrollVideoProps) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const portrait = usePortrait();
  const containerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const progressRef = useRef(0);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const seekingRef = useRef(false);
  const pendingRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [framesFailed, setFramesFailed] = useState(false);

  const set = portrait ? media.mobile : media.desktop;
  const known = portrait !== null;
  const useFrames = !framesFailed && set.count > 0;
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  /* ---------- Canvas: the frame sequence ---------- */

  const drawFrame = useCallback(
    (p: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || set.count < 1) return;
      const target = Math.min(set.count - 1, Math.round(clamp(p) * (set.count - 1)));
      const imgs = imagesRef.current;
      let img: HTMLImageElement | null = null;
      for (let d = 0; d < set.count && !img; d++) {
        for (const k of [target - d, target + d]) {
          const c = imgs[k];
          if (c && c.complete && c.naturalWidth > 0) {
            img = c;
            break;
          }
        }
      }
      if (!img) return;
      const { width: w, height: h } = canvas;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    },
    [set.count],
  );

  useEffect(() => {
    if (!useFrames || reduced || !known) return undefined;
    let cancelled = false;
    const imgs: (HTMLImageElement | null)[] = new Array(set.count).fill(null);
    imagesRef.current = imgs;
    const load = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          if (!cancelled && Math.abs(Math.round(progressRef.current * (set.count - 1)) - i) <= 2) drawFrame(progressRef.current);
          resolve();
        };
        img.onerror = () => {
          if (i === 0 && !cancelled) setFramesFailed(true);
          resolve();
        };
        img.src = frameUrl(set.path, i);
        imgs[i] = img;
      });
    // The first frame is already on screen (the <img> below). The sequence waits for the visitor's
    // first gesture, or a moment after the page has loaded, so it does not slow the page down:
    // the first frames first, then the rest in small batches.
    const start = () => {
      const eager = Math.min(EAGER_FRAMES, set.count);
      void Promise.all(Array.from({ length: eager }, (_, i) => load(i))).then(async () => {
        for (let i = eager; i < set.count && !cancelled; i += 8) {
          await Promise.all(Array.from({ length: Math.min(8, set.count - i) }, (_, j) => load(i + j)));
        }
      });
    };
    const cancelStart = afterLoad(start, { delay: FRAMES_DELAY, onGesture: true });
    return () => {
      cancelled = true;
      cancelStart();
    };
  }, [useFrames, reduced, known, set.path, set.count, drawFrame]);

  useEffect(() => {
    if (!useFrames || reduced) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      drawFrame(progressRef.current);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [useFrames, reduced, drawFrame]);

  /* ---------- Fallback: a video moved with currentTime (keyframe on every frame) ---------- */

  const seek = useCallback((p: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration) || v.duration <= 0 || seekingRef.current) {
      pendingRef.current = p;
      return;
    }
    const t = clamp(p) * Math.max(0, v.duration - 0.05);
    if (Math.abs(v.currentTime - t) < 0.01) return;
    seekingRef.current = true;
    v.currentTime = t;
  }, []);

  const onSeeked = useCallback(() => {
    seekingRef.current = false;
    if (pendingRef.current !== null) {
      const p = pendingRef.current;
      pendingRef.current = null;
      seek(p);
    }
  }, [seek]);

  // iOS paints seeked frames only once a gesture has "unlocked" the video.
  useEffect(() => {
    if (useFrames || reduced) return undefined;
    const unlock = () => {
      const v = videoRef.current;
      if (!v) return;
      v.muted = true;
      v.play()
        .then(() => {
          v.pause();
          seek(progressRef.current);
        })
        .catch(() => undefined);
    };
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", unlock);
  }, [useFrames, reduced, seek]);

  /* ---------- Scroll progress ---------- */

  useEffect(() => {
    if (reduced) return undefined;
    const el = containerRef.current;
    if (!el) return undefined;
    const apply = (p: number) => {
      progressRef.current = p;
      if (useFrames) drawFrame(p);
      else seek(p);
      setProgress(Math.round(p * 1000) / 1000);
    };
    const st = ScrollTrigger.create({ trigger: el, start: "top top", end: "bottom bottom", invalidateOnRefresh: true, onUpdate: (self) => apply(self.progress) });
    stRef.current = st;
    apply(st.progress);
    return () => {
      st.kill();
      stRef.current = null;
    };
  }, [reduced, heightVh, useFrames, drawFrame, seek]);

  /* ---------- Magnet: after a pause in the scroll, glide to the nearest text ---------- */

  useEffect(() => {
    if (reduced || !magnet) return undefined;
    let timer = 0;
    let active = false;
    const check = () => {
      const st = stRef.current;
      if (!st) return;
      const p = st.progress;
      if (p <= 0.003 || p >= 0.997) return;
      let target: number | null = null;
      let best = Infinity;
      for (const s of stepsRef.current) {
        const a = s.from <= 0.001 ? 0 : s.from + FADE + 0.006;
        const b = s.to >= 0.999 ? 1 : s.to - FADE - 0.006;
        if (a > b) continue;
        if (p >= a && p <= b) return;
        const d = p < a ? a - p : p - b;
        if (d < best) {
          best = d;
          target = p < a ? a : b;
        }
      }
      if (target === null || best > 0.08) return;
      active = true;
      scrollToY(st.start + target * (st.end - st.start), { duration: 0.9, onComplete: () => (active = false) });
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      if (!active) timer = window.setTimeout(check, 180);
    };
    // Any new gesture cancels the glide at once: the magnet never fights the visitor.
    const cancel = () => {
      window.clearTimeout(timer);
      if (!active) return;
      active = false;
      const lenis = getLenis();
      if (lenis) {
        lenis.stop();
        lenis.start();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("pointerdown", cancel, { passive: true });
    window.addEventListener("keydown", cancel);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("pointerdown", cancel);
      window.removeEventListener("keydown", cancel);
    };
  }, [reduced, magnet]);

  const stills = useMemo(() => steps.map((s) => frameUrl(set.path, Math.round(clamp((s.from + s.to) / 2) * (set.count - 1)))), [steps, set.path, set.count]);

  const scrims = (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/60 via-black/20 to-transparent rtl:bg-linear-to-l" />
      {/* Phones: the text sits over the jewel, a light veil keeps it readable. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/30 md:hidden" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-linear-to-b from-ink/80 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink/85 via-ink/25 to-transparent" />
    </>
  );

  /* ---------- Reduced motion: one still per text step ---------- */

  if (reduced) {
    return (
      <section aria-label={label} className="relative bg-ink">
        {steps.map((s, i) => {
          const a = ALIGN[s.align ?? "left"];
          return (
            <div key={i} className="relative h-svh overflow-hidden">
              <img src={stills[i]} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
              {scrims}
              <div className={"absolute inset-0 flex " + (s.box ?? PADDING + a.box)}>
                <div className={"relative isolate " + (s.inner ?? a.inner)}>
                  <Halo />
                  {s.content}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <section ref={containerRef} aria-label={label} data-scroll-video className="relative bg-ink" style={{ height: heightVh + "vh" }}>
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        {useFrames ? (
          <>
            {/* The first frame, painted before the canvas is ready: the portrait one on phones, chosen by the
                browser from the start (the screen is not known yet in the pre-rendered page). */}
            <picture>
              {media.mobile.count > 0 ? <source media="(max-aspect-ratio: 4/5)" srcSet={frameUrl(media.mobile.path, 0)} /> : null}
              <img src={frameUrl(media.desktop.count > 0 ? media.desktop.path : set.path, 0)} alt="" aria-hidden="true" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
            </picture>
            <canvas ref={canvasRef} aria-hidden="true" data-frames={known ? set.count : undefined} className="absolute inset-0 h-full w-full" />
          </>
        ) : (
          <video
            ref={videoRef}
            src={media.video}
            poster={media.poster}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            tabIndex={-1}
            aria-hidden="true"
            onLoadedMetadata={() => seek(pendingRef.current ?? progressRef.current)}
            onSeeked={onSeeked}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {scrims}
        <Sparkles />

        {steps.map((s, i) => {
          const o = stepOpacity(progress, s);
          const a = ALIGN[s.align ?? "left"];
          return (
            <div
              key={i}
              data-film-step={i}
              className={"absolute inset-0 flex " + (s.box ?? PADDING + a.box)}
              style={{
                opacity: o,
                transform: "translate3d(0," + Math.round((1 - o) * 28) + "px,0)",
                visibility: o <= 0.001 ? "hidden" : "visible",
                pointerEvents: o > 0.6 ? "auto" : "none",
              }}
            >
              <div className={"relative isolate " + (s.inner ?? a.inner)}>
                <Halo />
                {s.content}
              </div>
            </div>
          );
        })}

        {overlay ? overlay(progress) : null}

        {showProgress ? (
          <div aria-hidden="true" className="absolute top-1/2 end-6 hidden h-48 w-px -translate-y-1/2 bg-white/20 lg:block">
            <div className="bg-rose-gold w-px origin-top" style={{ height: progress * 100 + "%" }} />
          </div>
        ) : null}

        <div aria-hidden="true" className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 transition-opacity duration-500 md:flex" style={{ opacity: progress < 0.02 ? 1 : 0 }}>
          <span className="text-base tracking-[0.2em] text-bone uppercase">{t.scroll.hint}</span>
          <span className="bg-rose-gold block h-12 w-px" />
        </div>
      </div>
    </section>
  );
}
