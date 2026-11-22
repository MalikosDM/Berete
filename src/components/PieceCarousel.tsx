import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { useNavigationType, useSearchParams } from "react-router";
import { ArrowLeft, ArrowRight, GalleryHorizontal, LayoutGrid } from "lucide-react";
import { MediaView } from "@/components/Media";
import type { Piece } from "@/data/types";
import { Link, useI18n, useMadeFor } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { getLenis, useReducedMotion } from "@/lib/gsap";

/** The browser after the first render (useLayoutEffect warns on the server). */
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Props = {
  pieces: Piece[];
  /** What the list is ("All creations", "Chains"...), for screen readers. */
  label: string;
  /** Where the carousel was left, kept for the way back from a piece (one per list). */
  memory: string;
  /** Its type under each name (the list of every type). */
  showType?: boolean;
};

/**
 * The creations of a list (All, a collection, a sub-category), asked by Yoni on 22/11/2026: first one by one, in a
 * carousel (the creation in view large in the middle, the one before and the one after smaller and blurred at its sides;
 * a swipe of the finger, of the trackpad or of a horizontal wheel, the arrows, the keys of the keyboard; a counter), then,
 * with "See every creation", all of them in a grid of equal cards (3, 2, 1 on a row). "?view=grid" keeps the grid (the
 * way back from a piece finds it again).
 */
export default function PieceCarousel({ pieces, label, memory, showType = false }: Props) {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const grid = params.get("view") === "grid";
  const setGrid = (on: boolean) => {
    const next = new URLSearchParams(params);
    if (on) next.set("view", "grid");
    else next.delete("view");
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const viewRef = useRef<HTMLDivElement>(null);
  const switchTo = (on: boolean) => {
    setGrid(on);
    window.requestAnimationFrame(() => {
      // The button of the other view takes the focus (a keyboard keeps its place).
      document.querySelector<HTMLElement>(on ? "[data-carousel-back]" : "[data-carousel-all]")?.focus({ preventScroll: true });
      // The start of the new view in sight, under the menu.
      const top = viewRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 90) {
        const lenis = getLenis();
        const y = window.scrollY + top - 110;
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
      }
    });
  };

  if (pieces.length === 0) return null;
  return (
    <div ref={viewRef} data-pieces-view={grid ? "grid" : "carousel"}>
      {grid ? (
        <>
          <div className="flex justify-center sm:justify-start">
            <button type="button" onClick={() => switchTo(false)} data-carousel-back className="inline-flex min-h-12 items-center gap-3 border border-white/30 px-5 text-base font-semibold uppercase tracking-[0.06em] text-white transition-colors hover:border-rose-light hover:text-rose-light sm:px-6 sm:tracking-[0.14em]">
              <GalleryHorizontal className="size-5" aria-hidden="true" /> {t.creations.backToCarousel}
            </button>
          </div>
          <PieceGrid pieces={pieces} showType={showType} />
        </>
      ) : (
        <>
          <Carousel pieces={pieces} label={label} memory={memory} showType={showType} />
          <div className="mt-10 flex justify-center">
            <button type="button" onClick={() => switchTo(true)} data-carousel-all className="inline-flex min-h-12 items-center gap-3 border border-white/30 px-5 text-base font-semibold uppercase tracking-[0.06em] text-white transition-colors hover:border-rose-light hover:text-rose-light sm:px-6 sm:tracking-[0.14em]">
              <LayoutGrid className="size-5" aria-hidden="true" /> {t.creations.seeAll}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- The carousel ---------- */

function Carousel({ pieces, label, memory, showType }: Omit<Props, "showType"> & { showType: boolean }) {
  const { t, dir } = useI18n();
  const cat = useCatalogue();
  const madeFor = useMadeFor();
  const reduced = useReducedMotion();
  const navigation = useNavigationType();
  const trackRef = useRef<HTMLUListElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  // The visitor moved it (a finger, a wheel, a key, a click): nothing moves it for them afterwards.
  const touchedRef = useRef(false);
  // A gesture of the wheel or of the trackpad in progress: one creation for the whole of it.
  const wheelRef = useRef({ sum: 0, locked: false, quiet: 0 });
  const n = pieces.length;
  const key = "carousel:" + memory;
  const order = pieces.map((p) => p.slug).join(" ");

  const slideAt = (i: number) => trackRef.current?.querySelector<HTMLElement>("[data-slide='" + i + "']") ?? null;

  /** Brings a creation to the middle (smoothly, unless asked for less motion). */
  const goTo = useCallback(
    (i: number, instant = false) => {
      const track = trackRef.current;
      const slide = track?.querySelector<HTMLElement>("[data-slide='" + Math.max(0, Math.min(n - 1, i)) + "']");
      if (!track || !slide) return;
      const r = slide.getBoundingClientRect();
      const tr = track.getBoundingClientRect();
      // The same in both directions of writing: the gap between the middles, added to where the row is.
      track.scrollTo({ left: track.scrollLeft + (r.left + r.width / 2 - (tr.left + tr.width / 2)), behavior: instant || reduced ? "auto" : "smooth" });
    },
    [n, reduced],
  );

  // The creation in the middle follows the row as it moves (a finger, a trackpad, the arrows).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const tr = track.getBoundingClientRect();
      const mid = tr.left + tr.width / 2;
      let best = activeRef.current;
      let gap = Infinity;
      for (const el of track.querySelectorAll<HTMLElement>("[data-slide]")) {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < gap) {
          gap = d;
          best = Number(el.dataset.slide);
        }
      }
      if (best !== activeRef.current) {
        activeRef.current = best;
        setActive(best);
        try {
          sessionStorage.setItem(key, order.split(" ")[best] ?? "");
        } catch {
          /* private browsing: nothing kept */
        }
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onDown = () => {
      touchedRef.current = true;
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("pointerdown", onDown, { passive: true });
    track.addEventListener("touchstart", onDown, { passive: true });
    // A horizontal swipe of a trackpad or a turn of a horizontal wheel: one creation, then the next gesture (never the
    // page, whose smooth scrolling would take it); a vertical one still moves the page.
    const wheel = wheelRef.current;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      e.stopPropagation();
      touchedRef.current = true;
      window.clearTimeout(wheel.quiet);
      wheel.quiet = window.setTimeout(() => {
        wheel.locked = false;
        wheel.sum = 0;
      }, 220);
      if (wheel.locked) return;
      wheel.sum += e.deltaX * (e.deltaMode === 1 ? 16 : 1);
      if (Math.abs(wheel.sum) < 30) return;
      wheel.locked = true;
      const right = wheel.sum > 0;
      wheel.sum = 0;
      goTo(Math.max(0, Math.min(n - 1, activeRef.current + (right ? 1 : -1) * (dir === "rtl" ? -1 : 1))));
    };
    track.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("pointerdown", onDown);
      track.removeEventListener("touchstart", onDown);
      track.removeEventListener("wheel", onWheel);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [key, order, goTo, dir, n]);

  // The list of the house arriving in another order (the server, after the first page): the carousel back on its first
  // creation, unless the visitor already moved it (the browser would keep the creation in view, now at another place).
  const firstOrder = useRef(order);
  useEffect(() => {
    if (order === firstOrder.current) return undefined;
    firstOrder.current = order;
    if (touchedRef.current) return undefined;
    const id = window.requestAnimationFrame(() => {
      activeRef.current = 0;
      setActive(0);
      goTo(0, true);
    });
    return () => window.cancelAnimationFrame(id);
  }, [order, goTo]);

  // Back from a piece (or a reload): the carousel where it was left.
  useBrowserLayoutEffect(() => {
    if (navigation !== "POP") return;
    let slug: string | null = null;
    try {
      slug = sessionStorage.getItem(key);
    } catch {
      slug = null;
    }
    const i = slug ? pieces.findIndex((p) => p.slug === slug) : -1;
    if (i > 0) {
      touchedRef.current = true;
      activeRef.current = i;
      setActive(i);
      goTo(i, true);
    }
    // Once, when the list appears.
  }, []);

  const step = (delta: number, focus = false) => {
    touchedRef.current = true;
    const next = Math.max(0, Math.min(n - 1, activeRef.current + delta));
    goTo(next);
    if (focus) slideAt(next)?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
  };

  // The keys of the keyboard: on the carousel, or anywhere on the page while it is in view (nothing else focused).
  const onKey = (e: KeyboardEvent | ReactKeyboardEvent, focus: boolean): boolean => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
    const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const back = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    if (e.key === forward) step(1, focus);
    else if (e.key === back) step(-1, focus);
    else if (e.key === "Home") step(-n, focus);
    else if (e.key === "End") step(n, focus);
    else return false;
    e.preventDefault();
    return true;
  };
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root || e.defaultPrevented) return;
      const focused = document.activeElement;
      if (focused && focused !== document.body && !root.contains(focused)) return;
      if (root.contains(focused)) return; // handled on the carousel itself
      if (document.querySelector("[role='dialog'][aria-modal='true']")) return;
      const r = root.getBoundingClientRect();
      const seen = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      if (seen < Math.min(r.height, window.innerHeight) * 0.4) return;
      onKey(e, false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  });

  const onSlideClick = (i: number) => (e: ReactMouseEvent) => {
    // A creation at the side comes to the middle; the one in the middle opens.
    if (i === activeRef.current) return;
    e.preventDefault();
    touchedRef.current = true;
    goTo(i);
  };

  return (
    <div ref={rootRef} role="region" aria-roledescription={t.creations.carousel} aria-label={label} data-carousel className="piece-carousel relative" onKeyDown={(e) => onKey(e, true)}>
      <ul ref={trackRef} data-carousel-track className="pc-track no-scrollbar">
        <li aria-hidden="true" className="pc-spacer" />
        {pieces.map((p, i) => {
          const d = Math.abs(i - active);
          const on = i === active;
          return (
            <li
              key={p.slug}
              data-slide={i}
              data-active={on ? "" : undefined}
              data-side={i < active ? "before" : i > active ? "after" : undefined}
              data-far={d > 2 ? "" : undefined}
              aria-roledescription={t.creations.slide}
              aria-label={t.creations.counter(i + 1, n)}
              className="pc-slide"
            >
              <Link
                to={"/pieces/" + p.slug}
                data-carousel-piece={p.slug}
                tabIndex={on ? 0 : -1}
                aria-label={on ? undefined : t.creations.showPiece(p.title)}
                onClick={onSlideClick(i)}
                className="pc-card group block"
                draggable={false}
              >
                <span className="pc-frame relative block aspect-square overflow-hidden bg-ink">
                  <span className="pc-photo absolute inset-0 p-4 sm:p-6">
                    <MediaView item={p.cover} alt={p.cover.alt ?? p.title} fit="contain" eager={d <= 2} priority={i === 0} sizes="(max-width: 767px) 78vw, 42vw" />
                  </span>
                  <span aria-hidden="true" className="bg-rose-gold absolute bottom-0 start-0 h-px w-0 transition-[width] duration-700 ease-out group-hover:w-full" />
                </span>
                <span className="pc-text mt-5 block text-center">
                  <span data-carousel-title className="title-caps line-clamp-2 block min-h-[2.5em] text-[clamp(1.25rem,1.7vw,1.625rem)] leading-[1.25] tracking-[0.06em] text-white [text-wrap:balance] group-hover:text-rose-light">
                    {p.title}
                  </span>
                  <span className="mt-1 line-clamp-2 block min-h-[3em] text-base leading-normal text-mist">
                    {showType ? t.types[p.type] + " · " : ""}
                    {t.common.madeFor(madeFor(cat, p))}
                  </span>
                  <span data-enter-world className="mt-3 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-rose-light transition-colors group-hover:text-white">
                    {t.common.enterWorld}
                    <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        <li aria-hidden="true" className="pc-spacer" />
      </ul>

      {/* The arrows (at the sides of the creation on a computer) and the counter */}
      <div className="mt-6 flex items-center justify-center gap-6 md:mt-4">
        <button type="button" onClick={() => step(-1)} disabled={active === 0} data-carousel-prev aria-label={t.creations.previous} className="inline-flex size-12 items-center justify-center border border-white/30 bg-ink/60 text-white backdrop-blur-sm transition-colors hover:border-rose-light hover:text-rose-light disabled:pointer-events-none disabled:opacity-30 md:absolute md:top-[calc(0.5rem+var(--pc-w)/2)] md:-translate-y-1/2 md:start-[calc(50%-var(--pc-w)/2-4.5rem)]">
          <ArrowLeft className="size-5 rtl:-scale-x-100" aria-hidden="true" />
        </button>
        <p data-carousel-counter aria-live="polite" className="min-w-[5.5rem] text-center font-display text-2xl tracking-[0.08em] text-white tabular-nums">
          <span className="sr-only">{t.creations.counterLabel}</span>
          {active + 1} <span className="text-mist">/ {n}</span>
        </p>
        <button type="button" onClick={() => step(1)} disabled={active === n - 1} data-carousel-next aria-label={t.creations.next} className="inline-flex size-12 items-center justify-center border border-white/30 bg-ink/60 text-white backdrop-blur-sm transition-colors hover:border-rose-light hover:text-rose-light disabled:pointer-events-none disabled:opacity-30 md:absolute md:top-[calc(0.5rem+var(--pc-w)/2)] md:-translate-y-1/2 md:end-[calc(50%-var(--pc-w)/2-4.5rem)]">
          <ArrowRight className="size-5 rtl:-scale-x-100" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ---------- The grid ---------- */

/**
 * Every creation of the list in a grid of cards all of the same size (3 on a row on a computer, 2 on a tablet, 1 on a
 * phone): the same frame for every photo, a name on two lines at most, the line under it on one line, so that the names,
 * the lines and the ways in stand at the same height on every card.
 */
function PieceGrid({ pieces, showType }: { pieces: Piece[]; showType: boolean }) {
  const { t } = useI18n();
  const cat = useCatalogue();
  const madeFor = useMadeFor();
  return (
    <ul data-creations-grid className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-16">
      {pieces.map((p, i) => (
        <li key={p.slug} className="flex">
          <Link to={"/pieces/" + p.slug} data-piece-card={p.slug} className="group flex w-full flex-col">
            <span className="relative block aspect-[4/5] overflow-hidden bg-ink">
              <span className="absolute inset-0 p-5 transition-transform duration-[1.8s] ease-out group-hover:scale-[1.05] sm:p-6">
                <MediaView item={p.cover} alt={p.cover.alt ?? p.title} fit="contain" eager={i < 3} priority={i === 0} sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 30vw" />
              </span>
              <span aria-hidden="true" className="bg-rose-gold absolute bottom-0 start-0 h-px w-0 transition-[width] duration-700 ease-out group-hover:w-full" />
            </span>
            <span data-card-title className="title-caps mt-5 line-clamp-2 block min-h-[2.5em] text-[clamp(1.25rem,1.6vw,1.5rem)] leading-[1.25] tracking-[0.06em] text-white [text-wrap:balance] transition-colors group-hover:text-rose-light">
              {p.title}
            </span>
            <span className="mt-2 line-clamp-2 block min-h-[3em] text-base leading-normal text-mist">
              {showType ? t.types[p.type] + " · " : ""}
              {t.common.madeFor(madeFor(cat, p))}
            </span>
            <span data-enter-world className="mt-3 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-white transition-colors group-hover:text-rose-light">
              {t.common.enterWorld}
              <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
