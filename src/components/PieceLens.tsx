import { useEffect, useRef, type RefObject } from "react";

/** The size of the lens (CSS px) and how much it magnifies at most. */
const LENS = 240;
const ZOOM = 2.6;

/**
 * The magnifying glass of the opening of a capsule (Yoni, 23/11/2026): on a computer, when the pointer passes over the
 * jewel, a round lens follows it and shows the detail under it from the file itself, never enlarged beyond its own pixels
 * (no blurred picture: the zoom stops at the full resolution of the file). Its source is the main cutout of the piece, or
 * the film of a piece that turns while it is hovered (Dragon Ball), drawn frame by frame. Nothing on a phone (the photos of
 * the gallery are pinched there).
 *
 * `root`: the frame of the opening; `image`: the main jewel as shown (object-fit: contain); `full`: the address of its
 * largest file; `video`: the film shown instead while it turns (null when none, or not playing).
 */
export default function PieceLens({ root, image, full, video }: { root: RefObject<HTMLElement | null>; image: () => HTMLImageElement | null; full: string; video?: () => HTMLVideoElement | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = root.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;
    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)").matches) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = LENS * dpr;
    canvas.height = LENS * dpr;
    // The largest file of the jewel, loaded once (the page shows a lighter copy).
    const big = new Image();
    big.decoding = "async";
    big.src = full;
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;

    /** The drawn box of a media inside its element (object-fit: contain). */
    const drawn = (el: HTMLImageElement | HTMLVideoElement, natW: number, natH: number) => {
      const b = el.getBoundingClientRect();
      const s = Math.min(b.width / natW, b.height / natH);
      const w = natW * s;
      const h = natH * s;
      return { left: b.left + (b.width - w) / 2, top: b.top + (b.height - h) / 2, w, h, s };
    };

    const draw = () => {
      frame = 0;
      const v = video?.();
      const playing = v && !v.paused && v.readyState >= 2 && v.videoWidth > 0;
      const shown = image();
      const source: CanvasImageSource | null = playing ? v : big.complete && big.naturalWidth > 0 ? big : shown;
      const el = playing ? v : shown;
      const natW = playing ? v.videoWidth : big.naturalWidth || shown?.naturalWidth || 0;
      const natH = playing ? v.videoHeight : big.naturalHeight || shown?.naturalHeight || 0;
      if (!pointer || !source || !el || !natW || !natH) {
        canvas.dataset.on = "";
        delete canvas.dataset.on;
        return;
      }
      const box = drawn(el, natW, natH);
      const inside = pointer.x >= box.left && pointer.x <= box.left + box.w && pointer.y >= box.top && pointer.y <= box.top + box.h;
      if (!inside) {
        delete canvas.dataset.on;
        if (playing) frame = requestAnimationFrame(draw);
        return;
      }
      // Never beyond the pixels of the file: the zoom stops at its full resolution.
      const zoom = Math.max(1.2, Math.min(ZOOM, 1 / box.s));
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
      const hostBox = host.getBoundingClientRect();
      canvas.style.transform = "translate(" + (pointer.x - hostBox.left - LENS / 2) + "px," + (pointer.y - hostBox.top - LENS / 2) + "px)";
      canvas.dataset.on = "";
      canvas.dataset.zoom = zoom.toFixed(2);
      // A film keeps moving under a still pointer.
      if (playing) frame = requestAnimationFrame(draw);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer = { x: e.clientX, y: e.clientY };
      schedule();
    };
    const onLeave = () => {
      pointer = null;
      schedule();
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [root, image, full, video]);

  return <canvas ref={canvasRef} aria-hidden="true" data-piece-lens className="piece-lens" style={{ width: LENS, height: LENS }} />;
}
