import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ScrollTrigger, getLenis, scrollToY, useReducedMotion } from "@/lib/gsap";

/**
 * A step of text shown over the video while the scroll progress is between
 * "from" and "to". Values can be fractions (0 to 1) or percentages (0 to 100).
 */
export type ScrollStep = {
  from: number;
  to: number;
  content: ReactNode;
  align?: "left" | "center" | "right";
};

type ScrollVideoFrames = { count: number; url: (i: number) => string };

type ScrollVideoProps = {
  /** Video scrubbed with currentTime when no frame sequence is given. */
  src: string;
  /** Second source tried when the first one fails to load. */
  fallbackSrc?: string;
  /** Optional WebP frame sequence drawn in a cover canvas. */
  frames?: ScrollVideoFrames;
  /** Height of the scroll container, in vh. */
  heightVh?: number;
  steps: ScrollStep[];
  /** Accessible name of the section. */
  label: string;
  /** Called with the progress, 0 to 1. */
  onProgress?: (p: number) => void;
  /** Extra layer drawn over the video, receives the progress 0 to 1. */
  overlay?: (p: number) => ReactNode;
  poster?: string;
  className?: string;
  /** Gentle magnet towards each text step (cancelled by any new scroll). */
  magnet?: boolean;
  /** Thin rose-gold progress rail on the right edge (desktop). */
  showProgress?: boolean;
  /** Time in seconds shown at progress 0 (skips a dark opening). */
  startAt?: number;
};

const FADE = 0.025;
const EAGER_FRAMES = 12;

type NormStep = ScrollStep & { from: number; to: number };

function clamp(v: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, v));
}

function stepOpacity(p: number, s: NormStep): number {
  let o = 1;
  if (s.from > 0.001) o = Math.min(o, (p - s.from) / FADE);
  if (s.to < 0.999) o = Math.min(o, (s.to - p) / FADE);
  return clamp(o);
}

const ALIGN: Record<NonNullable<ScrollStep["align"]>, { box: string; inner: string }> = {
  left: { box: "items-end justify-start text-left md:items-center", inner: "max-w-3xl" },
  center: { box: "items-center justify-center text-center", inner: "mx-auto max-w-4xl" },
  right: { box: "items-end justify-end text-right md:items-center", inner: "max-w-3xl" },
};

export default function ScrollVideo({
  src,
  fallbackSrc,
  frames,
  heightVh = 700,
  steps,
  label,
  onProgress,
  overlay,
  poster,
  className = "",
  magnet = true,
  showProgress = true,
  startAt = 0,
}: ScrollVideoProps) {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const progressRef = useRef(0);
  const durationRef = useRef(0);
  const seekingRef = useRef(false);
  const pendingRef = useRef<number | null>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const framesRef = useRef<ScrollVideoFrames | undefined>(frames);
  const onProgressRef = useRef(onProgress);
  const [progress, setProgress] = useState(0);
  const [videoSrc, setVideoSrc] = useState(src);

  const frameCount = frames?.count ?? 0;
  const frameKey = frames ? frames.url(0) : "";
  const useFrames = frameCount > 0;

  useEffect(() => {
    framesRef.current = frames;
    onProgressRef.current = onProgress;
  });

  useEffect(() => {
    setVideoSrc(src);
  }, [src]);

  const normSteps = useMemo<NormStep[]>(() => {
    const percent = steps.some((s) => s.from > 1 || s.to > 1);
    return steps.map((s) => ({
      ...s,
      from: percent ? s.from / 100 : s.from,
      to: percent ? s.to / 100 : s.to,
    }));
  }, [steps]);
  const stepsRef = useRef<NormStep[]>(normSteps);
  useEffect(() => {
    stepsRef.current = normSteps;
  }, [normSteps]);

  /* ---------- Video scrubbing (fallback mode) ---------- */

  const seek = useCallback((p: number) => {
    const v = videoRef.current;
    const duration = durationRef.current;
    if (!v || !duration) {
      pendingRef.current = p;
      return;
    }
    if (seekingRef.current) {
      pendingRef.current = p;
      return;
    }
    const start = Math.min(startAt, duration * 0.5);
    const t = start + clamp(p) * Math.max(0, duration - start - 0.04);
    if (Math.abs(v.currentTime - t) < 0.008) return;
    seekingRef.current = true;
    try {
      v.currentTime = t;
    } catch {
      seekingRef.current = false;
    }
  }, [startAt]);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    durationRef.current = Number.isFinite(v.duration) ? v.duration : 0;
    seekingRef.current = false;
    const p = pendingRef.current ?? progressRef.current;
    pendingRef.current = null;
    seek(p);
  }, [seek]);

  const onSeeked = useCallback(() => {
    seekingRef.current = false;
    if (pendingRef.current !== null) {
      const p = pendingRef.current;
      pendingRef.current = null;
      seek(p);
    }
  }, [seek]);

  const onVideoError = useCallback(() => {
    if (fallbackSrc && videoSrc !== fallbackSrc) {
      durationRef.current = 0;
      seekingRef.current = false;
      setVideoSrc(fallbackSrc);
    }
  }, [fallbackSrc, videoSrc]);

  // iOS only paints seeked frames once the video has been "unlocked" by a gesture.
  useEffect(() => {
    if (useFrames || reduced) return undefined;
    const unlock = () => {
      const v = videoRef.current;
      if (!v) return;
      v.muted = true;
      v.play()
        .then(() => {
          v.pause();
          seekingRef.current = false;
          seek(progressRef.current);
        })
        .catch(() => undefined);
    };
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", unlock);
  }, [useFrames, reduced, seek]);

  /* ---------- Frame sequence (canvas mode) ---------- */

  const drawFrame = useCallback((p: number) => {
    const canvas = canvasRef.current;
    const f = framesRef.current;
    if (!canvas || !f || f.count < 1) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const target = Math.min(f.count - 1, Math.round(clamp(p) * (f.count - 1)));
    const imgs = imagesRef.current;
    let img: HTMLImageElement | null = null;
    for (let d = 0; d < f.count; d++) {
      const a = imgs[target - d];
      if (a && a.complete && a.naturalWidth > 0) {
        img = a;
        break;
      }
      const b = imgs[target + d];
      if (b && b.complete && b.naturalWidth > 0) {
        img = b;
        break;
      }
    }
    if (!img) return;
    const w = canvas.width;
    const h = canvas.height;
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }, []);

  useEffect(() => {
    if (!useFrames) return undefined;
    const f = framesRef.current;
    if (!f) return undefined;
    let cancelled = false;
    const imgs: (HTMLImageElement | null)[] = new Array(f.count).fill(null);
    imagesRef.current = imgs;

    const load = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          if (!cancelled) {
            const current = Math.round(progressRef.current * (f.count - 1));
            if (Math.abs(current - i) <= 2 || i === 0) drawFrame(progressRef.current);
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = f.url(i);
        imgs[i] = img;
      });

    const eager = Math.min(EAGER_FRAMES, f.count);
    const first: Promise<void>[] = [];
    for (let i = 0; i < eager; i++) first.push(load(i));

    void Promise.all(first).then(async () => {
      for (let i = eager; i < f.count && !cancelled; i += 6) {
        const batch: Promise<void>[] = [];
        for (let j = i; j < Math.min(i + 6, f.count); j++) batch.push(load(j));
        await Promise.all(batch);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [useFrames, frameKey, frameCount, drawFrame]);

  useEffect(() => {
    if (!useFrames) return undefined;
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
      onProgressRef.current?.(p);
    };
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      invalidateOnRefresh: true,
      onUpdate: (self) => apply(self.progress),
    });
    stRef.current = st;
    apply(st.progress);
    return () => {
      st.kill();
      stRef.current = null;
    };
  }, [reduced, heightVh, useFrames, drawFrame, seek]);

  /* ---------- Magnet towards text steps ---------- */

  useEffect(() => {
    if (reduced || !magnet) return undefined;
    let timer = 0;
    let safety = 0;
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
      const y = st.start + target * (st.end - st.start);
      scrollToY(y, {
        duration: 0.9,
        onComplete: () => {
          active = false;
        },
      });
      window.clearTimeout(safety);
      safety = window.setTimeout(() => {
        active = false;
      }, 1400);
    };

    const onScroll = () => {
      window.clearTimeout(timer);
      if (active) return;
      timer = window.setTimeout(check, 220);
    };

    const cancel = () => {
      window.clearTimeout(timer);
      if (!active) return;
      active = false;
      const lenis = getLenis();
      if (lenis) {
        lenis.stop();
        lenis.start();
      } else {
        window.scrollTo(window.scrollX, window.scrollY);
      }
    };

    const onWheel = () => {
      // Lenis and native smooth scroll both yield to a new wheel input.
      active = false;
      window.clearTimeout(timer);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("pointerdown", cancel, { passive: true });
    window.addEventListener("keydown", cancel);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(safety);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("pointerdown", cancel);
      window.removeEventListener("keydown", cancel);
    };
  }, [reduced, magnet]);

  /* ---------- Render ---------- */

  const media = useFrames ? (
    <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
  ) : (
    <video
      ref={videoRef}
      key={videoSrc}
      src={startAt > 0 && !videoSrc.includes("#") ? videoSrc + "#t=" + startAt : videoSrc}
      poster={poster}
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      tabIndex={-1}
      aria-hidden="true"
      onLoadedMetadata={onLoadedMetadata}
      onSeeked={onSeeked}
      onError={onVideoError}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );

  const scrims = (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/60 via-black/20 to-transparent" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ink/75 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink/80 via-ink/25 to-transparent"
      />
    </>
  );

  if (reduced) {
    const [first, ...rest] = normSteps;
    const a = ALIGN[first?.align ?? "left"];
    return (
      <section aria-label={label} className={"relative bg-ink " + className}>
        <div className="relative h-svh overflow-hidden">
          {useFrames && frames ? (
            <img
              src={frames.url(0)}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            media
          )}
          {scrims}
          {first ? (
            <div className={"absolute inset-0 flex px-5 pt-28 pb-32 sm:px-8 md:pb-20 lg:px-12 " + a.box}>
              <div className={a.inner}>{first.content}</div>
            </div>
          ) : null}
        </div>
        {rest.length > 0 ? (
          <div className="mx-auto max-w-5xl space-y-20 px-5 py-24 sm:px-8 lg:py-32">
            {rest.map((s, i) => (
              <div key={i} className={"flex " + (s.align === "center" ? "justify-center text-center" : s.align === "right" ? "justify-end text-right" : "")}>
                <div className="max-w-3xl">{s.content}</div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      aria-label={label}
      className={"relative bg-ink " + className}
      style={{ height: heightVh + "vh" }}
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        {media}
        {scrims}

        {normSteps.map((s, i) => {
          const o = stepOpacity(progress, s);
          const a = ALIGN[s.align ?? "left"];
          return (
            <div
              key={i}
              className={"absolute inset-0 flex px-5 pt-28 pb-32 will-change-transform sm:px-8 md:pb-20 lg:px-12 " + a.box}
              style={{
                opacity: o,
                transform: "translate3d(0," + Math.round((1 - o) * 28) + "px,0)",
                visibility: o <= 0.001 ? "hidden" : "visible",
                pointerEvents: o > 0.6 ? "auto" : "none",
              }}
            >
              <div className={a.inner}>{s.content}</div>
            </div>
          );
        })}

        {overlay ? overlay(progress) : null}

        {showProgress ? (
          <div aria-hidden="true" className="absolute top-1/2 right-6 hidden h-48 w-px -translate-y-1/2 bg-white/20 lg:block">
            <div className="bg-rose-gold w-px origin-top" style={{ height: progress * 100 + "%" }} />
          </div>
        ) : null}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 transition-opacity duration-500 md:flex"
          style={{ opacity: progress < 0.02 ? 1 : 0 }}
        >
          <span className="text-base tracking-[0.2em] text-bone uppercase">Scroll</span>
          <span className="bg-rose-gold block h-12 w-px" />
        </div>
      </div>
    </section>
  );
}
