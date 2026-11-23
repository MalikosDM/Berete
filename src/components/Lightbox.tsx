import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { forceMuted } from "@/components/Media";
import type { MediaItem } from "@/data/types";
import { useI18n } from "@/i18n";
import { getLenis } from "@/lib/gsap";

export type LightboxProps = {
  items: MediaItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
};

/** The zoom: from the whole photo (1) to six times; each press of + or − multiplies or divides it by STEP. */
const MAX = 6;
const STEP = 1.6;
/** A move shorter than this (px) is a click, not a drag. */
const CLICK = 6;

type View = { s: number; x: number; y: number };
const WHOLE: View = { s: 1, x: 0, y: 0 };

/**
 * A photo (or a film) full screen, among the others of its gallery, with a magnifying glass (Yoni, 23/11/2026): + and −,
 * a click or a double click on a point zooms on it, the mouse moves the photo once zoomed (drag, or the wheel), two fingers
 * pinch it on a phone (or on a trackpad), one finger moves it; not zoomed, a swipe goes to the next photo. The keys: Escape,
 * the arrows (the next photo), + and −, 0 (the whole photo). Used by the galleries of the capsules and of the trunks.
 */
export default function Lightbox({ items, index, onIndex, onClose }: LightboxProps) {
  const { t, dir } = useI18n();
  const [view, setView] = useState<View>(WHOLE);
  const [animate, setAnimate] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ start: View; x: number; y: number; dist: number; moved: number; mid: { x: number; y: number } } | null>(null);
  const item = items[index];
  const count = items.length;
  const zoomed = view.s > 1.001;

  /** The size of the photo as drawn whole in the stage (contained), and the stage. */
  const boxes = useCallback(() => {
    const stage = stageRef.current?.getBoundingClientRect();
    const m = mediaRef.current;
    if (!stage) return null;
    const natW = m instanceof HTMLVideoElement ? m.videoWidth : (m?.naturalWidth ?? 0);
    const natH = m instanceof HTMLVideoElement ? m.videoHeight : (m?.naturalHeight ?? 0);
    const ratio = natW && natH ? Math.min(stage.width / natW, stage.height / natH) : 1;
    return { stage, w: natW ? natW * ratio : stage.width, h: natH ? natH * ratio : stage.height };
  }, []);

  /** Keeps the zoomed photo over the stage (never a border of emptiness beyond its edges). */
  const clamp = useCallback(
    (v: View): View => {
      const s = Math.min(MAX, Math.max(1, v.s));
      if (s <= 1.001) return WHOLE;
      const b = boxes();
      if (!b) return { s, x: v.x, y: v.y };
      const mx = Math.max(0, (b.w * s - b.stage.width) / 2);
      const my = Math.max(0, (b.h * s - b.stage.height) / 2);
      return { s, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
    },
    [boxes],
  );

  /** Zooms to the scale s around a point of the screen (the middle of the stage by default). */
  const zoomTo = useCallback(
    (s: number, at?: { x: number; y: number }, smooth = true) => {
      setAnimate(smooth);
      setView((v) => {
        const b = boxes();
        if (!b) return clamp({ ...v, s });
        const px = (at ? at.x : b.stage.left + b.stage.width / 2) - (b.stage.left + b.stage.width / 2);
        const py = (at ? at.y : b.stage.top + b.stage.height / 2) - (b.stage.top + b.stage.height / 2);
        const k = Math.min(MAX, Math.max(1, s)) / v.s;
        return clamp({ s, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
      });
    },
    [boxes, clamp],
  );

  const go = useCallback(
    (d: number) => {
      setAnimate(false);
      setView(WHOLE);
      onIndex((index + d + count) % count);
    },
    [index, count, onIndex],
  );

  useEffect(() => {
    const lenis = getLenis();
    lenis?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      lenis?.start();
      document.body.style.overflow = prevOverflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // The arrow keys follow the reading direction: right to left, the left arrow goes forward.
      else if (e.key === "ArrowRight" && count > 1) go(dir === "rtl" ? -1 : 1);
      else if (e.key === "ArrowLeft" && count > 1) go(dir === "rtl" ? 1 : -1);
      else if (e.key === "+" || e.key === "=") zoomTo(view.s * STEP);
      else if (e.key === "-" || e.key === "_") zoomTo(view.s / STEP);
      else if (e.key === "0") zoomTo(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, count, dir, zoomTo, view.s]);

  // The wheel: a pinch of the trackpad (the wheel with Ctrl) zooms, the wheel moves the zoomed photo. Safari pinches with its
  // own gesture events. Not passive: the page under it must not move.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        zoomTo(view.s * Math.exp(-e.deltaY * 0.01), { x: e.clientX, y: e.clientY }, false);
      } else if (zoomed) {
        setAnimate(false);
        setView((v) => clamp({ s: v.s, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    let start = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      start = view.s;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as Event & { scale: number; clientX: number; clientY: number };
      zoomTo(start * g.scale, { x: g.clientX, y: g.clientY }, false);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("gesturestart", onGestureStart);
    stage.addEventListener("gesturechange", onGestureChange);
    return () => {
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("gesturestart", onGestureStart);
      stage.removeEventListener("gesturechange", onGestureChange);
    };
  }, [zoomTo, clamp, zoomed, view.s]);

  // The window changes size (a phone turned): the zoom stays inside the photo.
  useEffect(() => {
    const onResize = () => setView((v) => clamp(v));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  if (!item) return null;

  const begin = () => {
    const pts = [...pointers.current.values()];
    const mid = pts.length >= 2 ? { x: (pts[0]!.x + pts[1]!.x) / 2, y: (pts[0]!.y + pts[1]!.y) / 2 } : pts[0]!;
    const dist = pts.length >= 2 ? Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) : 0;
    gesture.current = { start: view, x: mid.x, y: mid.y, dist, moved: gesture.current?.moved ?? 0, mid };
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current = null;
    begin();
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const pts = [...pointers.current.values()];
    setAnimate(false);
    if (pts.length >= 2 && g.dist > 0) {
      // Two fingers: the photo grows around the middle of the fingers, and follows it.
      const mid = { x: (pts[0]!.x + pts[1]!.x) / 2, y: (pts[0]!.y + pts[1]!.y) / 2 };
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      const b = boxes();
      if (!b) return;
      const cx = b.stage.left + b.stage.width / 2;
      const cy = b.stage.top + b.stage.height / 2;
      const s = Math.min(MAX, Math.max(1, g.start.s * (dist / g.dist)));
      const k = s / g.start.s;
      const px = g.x - cx;
      const py = g.y - cy;
      g.moved += CLICK + 1;
      setView(clamp({ s, x: px - (px - g.start.x) * k + (mid.x - g.x), y: py - (py - g.start.y) * k + (mid.y - g.y) }));
    } else {
      const p = pts[0]!;
      g.moved = Math.max(g.moved, Math.hypot(p.x - g.x, p.y - g.y));
      if (g.start.s > 1.001) setView(clamp({ s: g.start.s, x: g.start.x + (p.x - g.x), y: g.start.y + (p.y - g.y) }));
    }
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const last = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) {
      // One finger stays: it moves the photo from where it is now.
      begin();
      return;
    }
    gesture.current = null;
    if (!g || !last) return;
    const dx = last.x - g.x;
    if (g.moved < CLICK) {
      // A click (a tap) on the whole photo zooms on that point.
      if (!zoomed && e.pointerType === "mouse") zoomTo(2.5, { x: last.x, y: last.y });
    } else if (!zoomed && g.start.s <= 1.001 && Math.abs(dx) > 60 && count > 1 && pointers.current.size === 0) {
      // Not zoomed: a swipe goes to the next or the previous photo (in the reading direction).
      go((dx < 0 ? 1 : -1) * (dir === "rtl" ? -1 : 1));
    }
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    zoomTo(zoomed ? 1 : 2.5, { x: e.clientX, y: e.clientY });
  };

  const btn =
    "inline-flex size-12 items-center justify-center rounded-full border border-white/30 bg-ink/70 text-white transition-colors hover:border-rose-light hover:text-rose-light disabled:opacity-35 disabled:hover:border-white/30 disabled:hover:text-white";
  const style = {
    transform: "translate3d(" + view.x + "px," + view.y + "px,0) scale(" + view.s + ")",
    transition: animate ? "transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1)" : "none",
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={item.alt ?? t.gallery.photo} data-lenis-prevent data-lightbox className="fixed inset-0 z-[90] flex flex-col bg-ink">
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <p className="text-base text-bone">
          <span className="text-rose-gold font-display text-xl">{String(index + 1).padStart(2, "0")}</span>
          <span className="mx-2 text-mist">/</span>
          {String(count).padStart(2, "0")}
        </p>
        <div className="flex gap-2 sm:gap-3">
          <button type="button" className={btn} onClick={() => zoomTo(view.s / STEP)} disabled={!zoomed} data-zoom-out aria-label={t.gallery.zoomOut}>
            <Minus className="size-5" aria-hidden="true" />
          </button>
          <button type="button" className={btn} onClick={() => zoomTo(view.s * STEP)} disabled={view.s >= MAX - 0.01} data-zoom-in aria-label={t.gallery.zoomIn}>
            <Plus className="size-5" aria-hidden="true" />
          </button>
          <button ref={closeRef} type="button" className={btn} onClick={onClose} aria-label={t.common.close}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        data-lightbox-stage
        data-zoom={view.s.toFixed(2)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        className={"relative flex-1 touch-none overflow-hidden select-none " + (zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in")}
      >
        {item.type === "video" ? (
          <video
            key={item.src}
            ref={(v) => {
              mediaRef.current = v;
              if (v) {
                forceMuted(v);
                v.play().catch(() => undefined);
              }
            }}
            src={item.src}
            poster={item.poster}
            muted
            loop
            playsInline
            autoPlay
            aria-label={item.alt ?? ""}
            className="pointer-events-none h-full w-full object-contain will-change-transform"
            style={style}
          />
        ) : (
          <img
            key={item.src}
            ref={(el) => {
              mediaRef.current = el;
            }}
            src={item.src}
            alt={item.alt ?? ""}
            width={item.width}
            height={item.height}
            decoding="async"
            draggable={false}
            data-lightbox-image
            className={"pointer-events-none h-full w-full object-contain will-change-transform " + (item.onBlack ? "mix-blend-lighten" : "")}
            style={style}
          />
        )}
        {count > 1 ? (
          <>
            <button type="button" onClick={() => go(-1)} onPointerDown={(e) => e.stopPropagation()} className={btn + " absolute top-1/2 start-4 -translate-y-1/2"} aria-label={t.common.previous}>
              <ChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => go(1)} onPointerDown={(e) => e.stopPropagation()} className={btn + " absolute top-1/2 end-4 -translate-y-1/2"} aria-label={t.common.next}>
              <ChevronRight className="size-5 rtl:-scale-x-100" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      <p className="px-5 py-4 text-center text-base text-bone sm:px-8">
        {item.caption ? <span className="block">{item.caption}</span> : null}
        <span className="block text-mist">{t.gallery.zoomHint}</span>
      </p>
    </div>
  );
}
