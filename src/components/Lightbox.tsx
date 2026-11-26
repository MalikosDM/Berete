import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { forceMuted } from "@/components/Media";
import type { MediaItem } from "@/data/types";
import { useI18n } from "@/i18n";
import { getLenis } from "@/lib/gsap";
import { loupeOf, preloadLoupe, useLoupes } from "@/lib/loupe";
import SeekBar from "@/components/SeekBar";

export type LightboxProps = {
  items: MediaItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
};

/** Each press of + or − multiplies or divides the zoom by STEP; a click zooms to CLICK_ZOOM (or to the limit of the photo). */
const STEP = 1.6;
const CLICK_ZOOM = 2.5;
/** Never beyond this, whatever the photo. */
const CEILING = 8;
/** A move shorter than this (px) is a click, not a drag. */
const CLICK = 6;
/** The round magnifying glass that follows the pointer (Yoni, 25/11/2026): its size, its magnification by default, its limits. */
const LENS = 180;
const LENS_MAG = 2.5;
const LENS_MIN = 2;
const LENS_MAX = 5;
/** A finger held still this long (ms) shows the magnifying glass above it. */
const HOLD = 380;
/** The little help « Click to zoom », once per visit. */
const HELP_KEY = "bj-zoom-help";

type View = { s: number; x: number; y: number };

/** Whether the little help has not been seen yet in this visit. */
function helpNotSeen(): boolean {
  try {
    return !sessionStorage.getItem(HELP_KEY);
  } catch {
    return true;
  }
}
const WHOLE: View = { s: 1, x: 0, y: 0 };

/**
 * A photo (or a film) full screen, among the others of its gallery, with a magnifying glass (Yoni, 23/11/2026; sharp to the
 * last stone, Malik, 24/11/2026). The copy of the page shows at once; its loupe copy (scripts/loupe.mjs, up to 3200 px from
 * the original) loads behind it and takes its place in a fade of 200 ms, in the same frame; those of the photo before and of
 * the photo after load too. The zoom goes as far as the photo is sharp: never more than one point of the screen for one
 * pixel of the photo (a WhatsApp photo of 1080 px hardly zooms; a photo of 7000 px goes far), and + greys at that limit.
 * A click or a tap zooms on the point aimed at, a new click comes back to the whole photo; the wheel, a pinch of the trackpad
 * or of two fingers zoom gently; a drag moves the zoomed photo; not zoomed, a swipe goes to the next photo. The keys:
 * Escape, the arrows (the next photo, the zoom back to 1), + and −, 0 (the whole photo).
 */
export default function Lightbox({ items, index, onIndex, onClose }: LightboxProps) {
  const { t, dir } = useI18n();
  const [view, setView] = useState<View>(WHOLE);
  const [animate, setAnimate] = useState(true);
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);
  const [natural, setNatural] = useState<{ src: string; w: number; h: number } | null>(null);
  const [sharp, setSharp] = useState<string | null>(null);
  const [help, setHelp] = useState(helpNotSeen);
  const closeRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ start: View; x: number; y: number; dist: number; moved: number; mid: { x: number; y: number } } | null>(null);
  const loupes = useLoupes();
  // The magnifying glass over the photo: where the pointer is (in the stage), and whether a finger holds it.
  const [lens, setLens] = useState<{ x: number; y: number; touch: boolean } | null>(null);
  const [mag, setMag] = useState(LENS_MAG);
  const hold = useRef<{ timer: number; id: number; x: number; y: number; on: boolean } | null>(null);
  const item = items[index];
  const count = items.length;
  // The magnifying glass is for photos only, never a film (Yoni, 23-24/11/2026).
  const photo = item?.type !== "video";
  const zoom = photo && item ? loupeOf(loupes, item.src) : null;

  // The photo drawn whole in the stage (contained), in CSS pixels.
  const ratio = item?.width && item?.height ? item.width / item.height : natural && natural.src === item?.src ? natural.w / natural.h : null;
  const box = useMemo(() => (stage && ratio ? (stage.w / stage.h > ratio ? { w: stage.h * ratio, h: stage.h } : { w: stage.w, h: stage.w / ratio }) : null), [stage, ratio]);
  // As far as the photo is sharp: its largest file (its loupe copy, else itself), one pixel for one point of the screen at most.
  const fileWidth = zoom?.width ?? item?.width ?? (natural && natural.src === item?.src ? natural.w : 0);
  const max = photo && box && fileWidth ? Math.min(CEILING, Math.max(1, fileWidth / box.w)) : 1;
  const canZoom = max > 1.05;
  const zoomed = view.s > 1.001;
  // The magnifying glass goes as far as the file is sharp: one pixel of the file for one point of the screen at most.
  const lensMax = photo && box && fileWidth ? Math.min(LENS_MAX, fileWidth / (box.w * Math.max(1, view.s))) : 0;
  const lensMin = Math.min(LENS_MIN, lensMax);
  const lensOk = lensMax >= 1.25;
  const lensMag = Math.min(lensMax, Math.max(lensMin, mag));

  // The size of the stage, followed (a window resized, a phone turned).
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Keeps the zoomed photo over the stage (never a border of emptiness beyond its edges), between 1 and its limit. */
  const clamp = useCallback(
    (v: View): View => {
      const s = Math.min(max, Math.max(1, v.s));
      if (s <= 1.001 || !box || !stage) return s <= 1.001 ? WHOLE : { s, x: v.x, y: v.y };
      const mx = Math.max(0, (box.w * s - stage.w) / 2);
      const my = Math.max(0, (box.h * s - stage.h) / 2);
      return { s, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
    },
    [box, stage, max],
  );

  /** Zooms to the scale s around a point of the screen (the middle of the stage by default). */
  const zoomTo = useCallback(
    (s: number, at?: { x: number; y: number }, smooth = true) => {
      if (!photo || !canZoom) return;
      // The first zoom: the little help is no longer needed (for the whole visit).
      if (s > 1.001) {
        setHelp(false);
        try {
          sessionStorage.setItem(HELP_KEY, "1");
        } catch {
          /* private browsing */
        }
      }
      setAnimate(smooth);
      setView((v) => {
        const rect = stageRef.current?.getBoundingClientRect();
        if (!rect) return clamp({ ...v, s });
        const px = (at ? at.x : rect.left + rect.width / 2) - (rect.left + rect.width / 2);
        const py = (at ? at.y : rect.top + rect.height / 2) - (rect.top + rect.height / 2);
        const target = Math.min(max, Math.max(1, s));
        const k = target / v.s;
        return clamp({ s: target, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
      });
    },
    [clamp, photo, canZoom, max],
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

  // The loupe copies of the photo before and of the photo after, ready when the arrows go to them.
  useEffect(() => {
    if (count < 2) return;
    for (const d of [1, -1]) {
      const other = items[(index + d + count) % count];
      if (other && other.type !== "video") preloadLoupe(loupeOf(loupes, other.src));
    }
  }, [index, count, items, loupes]);

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

  // The wheel zooms on the point under the pointer, by gentle steps (a notch of a mouse glides to its step; a trackpad follows
  // the fingers), and so does a pinch of the trackpad (the wheel with Ctrl); a sideways move of the trackpad moves the zoomed
  // photo. Safari pinches with its own gesture events. Not passive: the page under it must not move.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (lens && !lens.touch && !e.ctrlKey) {
        // Over the photo, the wheel makes the magnifying glass stronger or weaker (x2 to x5, as far as the file is sharp).
        setMag((m) => Math.min(LENS_MAX, Math.max(LENS_MIN, m * Math.exp(-e.deltaY * 0.0025))));
        return;
      }
      if (zoomed && !e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setAnimate(false);
        setView((v) => clamp({ s: v.s, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      } else {
        const notch = !e.ctrlKey && Math.abs(e.deltaY) >= 40;
        const delta = notch ? Math.sign(e.deltaY) * 100 : e.deltaY;
        zoomTo(view.s * Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0025)), { x: e.clientX, y: e.clientY }, notch);
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
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
    };
  }, [zoomTo, clamp, zoomed, view.s, lens]);

  if (!item) return null;

  const begin = () => {
    const pts = [...pointers.current.values()];
    const mid = pts.length >= 2 ? { x: (pts[0]!.x + pts[1]!.x) / 2, y: (pts[0]!.y + pts[1]!.y) / 2 } : pts[0]!;
    const dist = pts.length >= 2 ? Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) : 0;
    gesture.current = { start: view, x: mid.x, y: mid.y, dist, moved: gesture.current?.moved ?? 0, mid };
  };
  /** The point of the stage under the pointer, when it is over the photo (never over a button, never beside the photo). */
  const overPhoto = (clientX: number, clientY: number, target: EventTarget | null): { x: number; y: number } | null => {
    if (!photo || !box || !lensOk) return null;
    if (target instanceof Element && target.closest("button, input, a")) return null;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const v = clamp(view);
    const w = box.w * v.s;
    const h = box.h * v.s;
    const left = rect.width / 2 + v.x - w / 2;
    const top = rect.height / 2 + v.y - h / 2;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < Math.max(0, left) || x > Math.min(rect.width, left + w) || y < Math.max(0, top) || y > Math.min(rect.height, top + h)) return null;
    return { x, y };
  };
  const endHold = () => {
    if (hold.current) window.clearTimeout(hold.current.timer);
    hold.current = null;
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* a pointer the browser no longer knows */
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current = null;
    begin();
    // A finger held still on the photo: the magnifying glass comes above it and follows it.
    endHold();
    if (e.pointerType !== "mouse" && pointers.current.size === 1 && overPhoto(e.clientX, e.clientY, e.target)) {
      const id = e.pointerId;
      const start = { x: e.clientX, y: e.clientY };
      hold.current = {
        id,
        x: start.x,
        y: start.y,
        on: false,
        timer: window.setTimeout(() => {
          const h = hold.current;
          const at = h ? overPhoto(h.x, h.y, null) : null;
          if (!h || !at || pointers.current.size !== 1) return;
          h.on = true;
          setLens({ ...at, touch: true });
        }, HOLD),
      };
    } else if (e.pointerType === "mouse") setLens(null);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    // The mouse over the photo: the magnifying glass in place of the pointer; beside the photo (the arrows, the cross), none.
    if (e.pointerType === "mouse" && !pointers.current.has(e.pointerId)) {
      const at = overPhoto(e.clientX, e.clientY, e.target);
      setLens(at ? { ...at, touch: false } : null);
      return;
    }
    const h = hold.current;
    if (h && h.id === e.pointerId) {
      if (h.on) {
        // The finger holds the magnifying glass: it follows the finger, the photo stays where it is.
        h.x = e.clientX;
        h.y = e.clientY;
        const at = overPhoto(e.clientX, e.clientY, null);
        setLens(at ? { ...at, touch: true } : null);
        return;
      }
      if (Math.hypot(e.clientX - h.x, e.clientY - h.y) > CLICK) endHold();
    }
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
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const s = Math.min(max, Math.max(1, g.start.s * (dist / g.dist)));
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
    // The finger lifted after holding the magnifying glass: it goes, and nothing else happens (no zoom, no next photo).
    const held = hold.current?.on && hold.current.id === e.pointerId;
    endHold();
    if (held) {
      pointers.current.delete(e.pointerId);
      gesture.current = null;
      setLens(null);
      return;
    }
    const g = gesture.current;
    const last = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) {
      // One finger stays: it moves the photo from where it is now.
      begin();
      return;
    }
    gesture.current = null;
    if (!g || !last || e.type === "pointercancel") return;
    const dx = last.x - g.x;
    if (g.moved < CLICK) {
      // A click (a tap) zooms on the point aimed at; a new click comes back to the whole photo.
      if (g.start.s > 1.001) zoomTo(1);
      else zoomTo(Math.min(CLICK_ZOOM, max), { x: last.x, y: last.y });
    } else if (g.start.s <= 1.001 && Math.abs(dx) > 60 && count > 1) {
      // Not zoomed: a swipe goes to the next or the previous photo (in the reading direction).
      go((dx < 0 ? 1 : -1) * (dir === "rtl" ? -1 : 1));
    }
  };

  const btn =
    "inline-flex size-12 items-center justify-center rounded-full border border-white/30 bg-ink/70 text-white transition-colors hover:border-rose-light hover:text-rose-light disabled:opacity-35 disabled:hover:border-white/30 disabled:hover:text-white";
  const transition = animate ? "transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1)" : "none";
  // The stage may have changed size (a window resized, a phone turned): the zoom drawn stays inside the photo.
  const drawn = clamp(view);
  const touch = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
  const cursor = lens && !lens.touch ? "cursor-none" : !photo || !canZoom ? "" : zoomed ? "cursor-zoom-out active:cursor-grabbing" : "cursor-zoom-in";
  const blend = item.onBlack ? "mix-blend-lighten" : "";

  return (
    <div role="dialog" aria-modal="true" aria-label={item.alt ?? t.gallery.photo} data-lenis-prevent data-lightbox className="fixed inset-0 z-[90] flex flex-col bg-ink">
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <p className="text-base text-bone">
          <span className="text-rose-gold font-display text-xl">{String(index + 1).padStart(2, "0")}</span>
          <span className="mx-2 text-mist">/</span>
          {String(count).padStart(2, "0")}
        </p>
        <div className="flex gap-2 sm:gap-3">
          {photo ? (
            <>
              <button type="button" className={btn} onClick={() => zoomTo(view.s / STEP)} disabled={!zoomed} data-zoom-out aria-label={t.gallery.zoomOut}>
                <Minus className="size-5" aria-hidden="true" />
              </button>
              <button type="button" className={btn} onClick={() => zoomTo(view.s * STEP)} disabled={!canZoom || view.s >= max - 0.01} data-zoom-in aria-label={t.gallery.zoomIn}>
                <Plus className="size-5" aria-hidden="true" />
              </button>
            </>
          ) : null}
          <button ref={closeRef} type="button" className={btn} onClick={onClose} aria-label={t.common.close}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        data-lightbox-stage
        data-zoom={drawn.s.toFixed(2)}
        data-zoom-max={max.toFixed(2)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={(e) => (e.pointerType === "mouse" ? setLens(null) : undefined)}
        onContextMenu={(e) => (hold.current ? e.preventDefault() : undefined)}
        className={"relative flex-1 touch-none overflow-hidden select-none [-webkit-touch-callout:none] " + cursor}
      >
        {item.type === "video" ? (
          <video
            key={item.src}
            ref={(v) => {
              videoRef.current = v;
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
            className="pointer-events-none h-full w-full object-contain"
          />
        ) : (
          // The photo in its frame, the size it is drawn whole; the zoom scales the frame (never a layer kept at a low
          // resolution: the browser draws it again sharp at every zoom).
          <div
            key={item.src}
            data-lightbox-photo
            className="pointer-events-none absolute left-1/2 top-1/2"
            style={{
              width: box ? box.w : "100%",
              height: box ? box.h : "100%",
              transform: "translate(-50%, -50%) translate(" + drawn.x + "px, " + drawn.y + "px) scale(" + drawn.s + ")",
              transition,
            }}
          >
            <img
              src={item.src}
              alt={item.alt ?? ""}
              width={item.width}
              height={item.height}
              decoding="async"
              draggable={false}
              data-lightbox-image
              onLoad={(e) => setNatural({ src: item.src, w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              className={"absolute inset-0 h-full w-full object-contain " + blend}
            />
            {zoom ? (
              <img
                key={zoom.src}
                src={zoom.src}
                alt=""
                aria-hidden="true"
                width={zoom.width}
                height={zoom.height}
                decoding="async"
                draggable={false}
                data-lightbox-loupe
                data-loaded={sharp === zoom.src ? "" : undefined}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  // Shown once decoded: the swap never blinks.
                  void (img.decode ? img.decode() : Promise.resolve()).catch(() => undefined).then(() => setSharp(zoom.src));
                }}
                className={"absolute inset-0 h-full w-full object-contain transition-opacity duration-200 " + blend}
                style={{ opacity: sharp === zoom.src ? 1 : 0 }}
              />
            ) : null}
          </div>
        )}
        {lens && photo && box && lensOk ? <MagnifyingGlass lens={lens} mag={lensMag} box={box} view={drawn} stage={stage} src={zoom?.src ?? item.src} blend={Boolean(item.onBlack)} /> : null}
        {photo && help && canZoom && !zoomed ? (
          <p data-zoom-help aria-hidden="true" className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-ink/75 px-4 py-2 text-base whitespace-nowrap text-bone">
            {touch ? t.gallery.holdToMagnify : lensOk ? t.gallery.hoverToMagnify : t.gallery.clickToZoom}
          </p>
        ) : null}
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

      {/* A film: its bar, to pull forward or back (25/11/2026). */}
      {item.type === "video" ? <SeekBar key={item.src} video={videoRef} className="mx-auto w-full max-w-3xl px-5 sm:px-8" /> : null}
      {item.caption ? <p className="px-5 py-4 text-center text-base text-bone sm:px-8">{item.caption}</p> : <div className="h-6" aria-hidden="true" />}
    </div>
  );
}

/**
 * The round magnifying glass (Yoni, 25/11/2026): 180 px, a fine rose gold edge, the photo under it magnified from its sharpest
 * file (its loupe copy). With a mouse it takes the place of the pointer; under a finger it stands above the finger, so that
 * the finger never hides it.
 */
function MagnifyingGlass({ lens, mag, box, view, stage, src, blend }: { lens: { x: number; y: number; touch: boolean }; mag: number; box: { w: number; h: number }; view: View; stage: { w: number; h: number } | null; src: string; blend: boolean }) {
  const w = box.w * view.s;
  const h = box.h * view.s;
  const sw = stage?.w ?? 0;
  const sh = stage?.h ?? 0;
  // Where the photo is drawn in the stage, and the point of the photo under the pointer (0 to 1).
  const left = sw / 2 + view.x - w / 2;
  const top = sh / 2 + view.y - h / 2;
  const fx = (lens.x - left) / w;
  const fy = (lens.y - top) / h;
  const r = LENS / 2;
  // Under a finger: above it (never out of the screen).
  const cx = lens.x;
  const cy = lens.touch ? Math.max(r, lens.y - r - 56) : lens.y;
  return (
    <div
      data-loupe-lens
      data-mag={mag.toFixed(2)}
      data-touch={lens.touch ? "" : undefined}
      aria-hidden="true"
      className={"pointer-events-none absolute z-10 rounded-full border border-rose-light shadow-[0_10px_40px_rgb(0_0_0/0.65)] " + (blend ? "bg-ink" : "bg-black")}
      style={{
        width: LENS,
        height: LENS,
        left: cx - r,
        top: cy - r,
        backgroundImage: 'url("' + src + '")',
        backgroundRepeat: "no-repeat",
        backgroundSize: w * mag + "px " + h * mag + "px",
        backgroundPosition: r - fx * w * mag + "px " + (r - fy * h * mag) + "px",
      }}
    />
  );
}
