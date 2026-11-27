/*
 * « Comparer » in the 3D editor (27/11/2026): the jewel as it was saved (« Avant ») and as it is now (« Après »), the same
 * view, one over the other, with a line to slide (pointer, or the arrow keys on the line). Over the picture of the editor;
 * « Fermer » or Échap closes it.
 */
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { MoveHorizontal, X } from "lucide-react";

type Props = {
  /** Where it is drawn: the picture of the editor (its box is `relative`). */
  host: HTMLElement;
  before: string;
  after: string;
  onClose: () => void;
};

export default function Compare({ host, before, after, onClose }: Props) {
  // Where the line stands, in % of the width from the left (« Avant » on its left, « Après » on its right).
  const [at, setAt] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    handle.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const moveTo = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setAt(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-compare-close]")) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveTo(e.clientX);
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current) moveTo(e.clientX);
  };
  const up = () => {
    dragging.current = false;
  };
  const keys = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 10 : 2;
    const next = e.key === "ArrowLeft" || e.key === "ArrowDown" ? at - step : e.key === "ArrowRight" || e.key === "ArrowUp" ? at + step : e.key === "Home" ? 0 : e.key === "End" ? 100 : null;
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    setAt(Math.min(100, Math.max(0, next)));
  };

  const label = "pointer-events-none absolute bottom-3 z-10 bg-ink/80 px-3 py-1.5 text-base text-white backdrop-blur-sm";
  return createPortal(
    <div
      ref={box}
      className="absolute inset-0 z-30 cursor-ew-resize touch-none select-none overflow-hidden bg-ink"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      role="group"
      aria-label="Comparaison avant / après"
      data-compare
      data-compare-at={Math.round(at)}
    >
      <img src={after} alt="Après : les réglages en cours" className="pointer-events-none absolute inset-0 h-full w-full object-contain" draggable={false} data-compare-after />
      <img
        src={before}
        alt="Avant : les réglages enregistrés"
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        style={{ clipPath: `inset(0 ${100 - at}% 0 0)` }}
        draggable={false}
        data-compare-before
      />
      <span className={label + " start-3"}>Avant · enregistré</span>
      <span className={label + " end-3"}>Après · en cours</span>
      <div className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-rose-light shadow-[0_0_0_1px_rgba(10,10,10,0.6)]" style={{ left: at + "%" }} data-compare-line />
      <button
        ref={handle}
        type="button"
        role="slider"
        aria-label="Trait de comparaison : flèches gauche et droite pour le déplacer"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(at)}
        aria-valuetext={Math.round(at) + " % avant"}
        onKeyDown={keys}
        className="absolute top-1/2 z-20 inline-flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-rose-light bg-ink text-rose-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-light"
        style={{ left: at + "%" }}
        data-compare-handle
      >
        <MoveHorizontal className="size-5" aria-hidden="true" />
      </button>
      <button type="button" onClick={onClose} className="absolute end-3 top-3 z-20 inline-flex min-h-12 cursor-pointer items-center gap-2 border border-white/30 bg-ink/80 px-4 text-base text-white backdrop-blur-sm hover:border-rose-light hover:text-rose-light" data-compare-close>
        <X className="size-4" aria-hidden="true" /> Fermer
      </button>
    </div>,
    host,
  );
}
