import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Minus, Plus } from "lucide-react";
import { useI18n } from "@/i18n";

/** The size of the lens (CSS px), its first magnification, its least, and the step of + / − and of the wheel. */
const LENS = 240;
const START = 2.6;
const MIN = 1.25;
const STEP = 1.25;

/** What the lens looks at: the photo as shown, the address of its largest file, and the frame it lives in. */
export type LoupeTarget = { img: HTMLImageElement; full: string; frame: HTMLElement };

/**
 * The photo under the pointer in a gallery, a grid of pieces, the photos of a trunk: the element marked
 * data-loupe="<its largest file>" and its photo. A film is never marked (the lens shows photos only).
 */
export function pickMarked(e: Event): LoupeTarget | null {
  const el = (e.target as Element | null)?.closest<HTMLElement>("[data-loupe]");
  const img = el?.querySelector("img");
  return el && img && el.dataset.loupe ? { img, full: el.dataset.loupe, frame: el } : null;
}

/** The drawn box of a photo inside its element, whatever its object-fit (contain: all of it; cover: filling it). */
function drawn(img: HTMLImageElement, natW: number, natH: number) {
  const b = img.getBoundingClientRect();
  const fit = getComputedStyle(img).objectFit;
  const s = fit === "cover" ? Math.max(b.width / natW, b.height / natH) : fit === "fill" ? b.width / natW : Math.min(b.width / natW, b.height / natH);
  const w = natW * s;
  const h = natH * s;
  // What is seen of it (a photo in "cover" overflows its element).
  const left = b.left + (b.width - w) / 2;
  const top = b.top + (b.height - h) / 2;
  return { left, top, w, h, s, clip: { left: Math.max(b.left, left), top: Math.max(b.top, top), right: Math.min(b.right, left + w), bottom: Math.min(b.bottom, top + h) } };
}

/**
 * The magnifying glass (Yoni, 22-23/11/2026): on a computer, over the photo of a piece (its opening, its gallery, its card
 * in the creations, the photos of a trunk), a round lens follows the pointer and shows the detail under it, taken from the
 * largest file of that photo: photos only, never a film. The wheel brings it closer or further (at its nearest or its
 * furthest the page scrolls again: it never traps the page), and so do + and −, shown at the corner of a photo large enough
 * for them (a thumbnail keeps the wheel only). Never
 * beyond the pixels of the file (no blurred picture). On a phone there is no lens: a touch opens the photo full screen,
 * where two fingers zoom (src/components/Lightbox.tsx).
 *
 * `zone`: the element that hosts it (positioned); `pick`: what the pointer is over (a photo of the zone, or null).
 */
export default function Loupe({ zone, pick }: { zone: RefObject<HTMLElement | null>; pick: (e: Event) => LoupeTarget | null }) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef(START);
  const [control, setControl] = useState<{ x: number; y: number; zoom: number; min: boolean; max: boolean } | null>(null);
  const redrawRef = useRef<() => void>(() => undefined);
  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  }, [pick]);
  // The nearest and the furthest of the photo looked at (its own pixels at most).
  const limitsRef = useRef({ min: MIN, max: START });

  useEffect(() => {
    const host = zone.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;
    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)").matches) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = LENS * dpr;
    canvas.height = LENS * dpr;
    // The largest files, loaded once each, when first looked at.
    const files = new Map<string, HTMLImageElement>();
    const file = (src: string) => {
      let img = files.get(src);
      if (!img) {
        img = new Image();
        img.decoding = "async";
        img.onload = () => schedule();
        img.src = src;
        files.set(src, img);
      }
      return img;
    };
    let target: LoupeTarget | null = null;
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;

    const hide = () => {
      delete canvas.dataset.on;
    };
    const place = () => {
      if (!target) {
        setControl(null);
        return;
      }
      const z = host.getBoundingClientRect();
      const f = target.frame.getBoundingClientRect();
      // A small photo (a thumbnail of a trunk): the wheel only, + and − would cover it.
      if (f.width < 260 || f.height < 200) {
        setControl(null);
        return;
      }
      const limits = limitsRef.current;
      const zoom = Math.min(Math.max(zoomRef.current, limits.min), limits.max);
      setControl({ x: f.right - z.left, y: f.bottom - z.top, zoom, min: zoom <= limits.min + 0.01, max: zoom >= limits.max - 0.01 });
    };

    const draw = () => {
      frame = 0;
      if (!target || !pointer) return hide();
      const big = file(target.full);
      const source: HTMLImageElement = big.complete && big.naturalWidth > 0 ? big : target.img;
      const natW = source.naturalWidth;
      const natH = source.naturalHeight;
      if (!natW || !natH) return hide();
      const box = drawn(target.img, natW, natH);
      // Never beyond the pixels of the file: the nearest is its full resolution.
      const limits = { min: MIN, max: Math.max(MIN, 1 / box.s) };
      // Known once the file is drawn: + and − follow.
      const changed = Math.abs(limits.max - limitsRef.current.max) > 0.01;
      limitsRef.current = limits;
      if (changed) place();
      const zoom = Math.min(Math.max(zoomRef.current, limits.min), limits.max);
      const inside = pointer.x >= box.clip.left && pointer.x <= box.clip.right && pointer.y >= box.clip.top && pointer.y <= box.clip.bottom;
      if (!inside) return hide();
      const span = LENS / (box.s * zoom);
      const cx = ((pointer.x - box.left) / box.w) * natW;
      const cy = ((pointer.y - box.top) / box.h) * natH;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, cx - span / 2, cy - span / 2, span, span, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      const z = host.getBoundingClientRect();
      canvas.style.transform = "translate(" + (pointer.x - z.left - LENS / 2) + "px," + (pointer.y - z.top - LENS / 2) + "px)";
      canvas.dataset.on = "";
      canvas.dataset.zoom = zoom.toFixed(2);
    };
    function schedule() {
      if (!frame) frame = requestAnimationFrame(draw);
    }
    redrawRef.current = () => {
      schedule();
      place();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer = { x: e.clientX, y: e.clientY };
      // Over + and −: the lens rests, the photo stays the one looked at.
      if ((e.target as Element | null)?.closest("[data-loupe-control]")) return hide();
      const next = pickRef.current(e);
      if (next && (next.img !== target?.img || next.full !== target?.full)) {
        target = next;
        file(next.full);
        place();
      } else if (!next && !target) return;
      schedule();
    };
    const onLeave = () => {
      pointer = null;
      target = null;
      hide();
      setControl(null);
    };
    const onWheel = (e: WheelEvent) => {
      if (!target || canvas.dataset.on === undefined || e.ctrlKey) return;
      const limits = limitsRef.current;
      const zoom = Math.min(Math.max(zoomRef.current, limits.min), limits.max);
      const next = Math.min(Math.max(zoom * Math.exp(-e.deltaY * 0.0022), limits.min), limits.max);
      // At its nearest or its furthest: the page scrolls.
      if (Math.abs(next - zoom) < 0.005) return;
      e.preventDefault();
      e.stopPropagation();
      zoomRef.current = next;
      schedule();
      place();
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("wheel", onWheel);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [zone]);

  const step = useCallback((by: number) => {
    const { min, max } = limitsRef.current;
    zoomRef.current = Math.min(Math.max(Math.min(Math.max(zoomRef.current, min), max) * by, min), max);
    redrawRef.current();
  }, []);

  const btn = "inline-flex size-12 items-center justify-center text-white transition-colors hover:text-rose-light disabled:opacity-35";
  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" data-piece-lens className="piece-lens" style={{ width: LENS, height: LENS }} />
      {control ? (
        <div
          data-loupe-control
          className="absolute z-30 flex -translate-x-full -translate-y-full items-center rounded-full border border-white/25 bg-ink/75 backdrop-blur-sm"
          style={{ left: control.x - 8, top: control.y - 8 }}
          onClick={(e) => {
            // In a card of the creations: the buttons never follow its link.
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button type="button" className={btn} data-loupe-out onClick={() => step(1 / STEP)} disabled={control.min} aria-label={t.gallery.zoomOut}>
            <Minus className="size-5" aria-hidden="true" />
          </button>
          <span data-loupe-zoom className="min-w-12 text-center text-base text-bone tabular-nums">
            {control.zoom.toFixed(1)}×
          </span>
          <button type="button" className={btn} data-loupe-in onClick={() => step(STEP)} disabled={control.max} aria-label={t.gallery.zoomIn}>
            <Plus className="size-5" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </>
  );
}
