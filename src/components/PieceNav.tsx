import { useEffect, useId, useLayoutEffect, useRef, type MouseEvent } from "react";
import { useNavigate } from "react-router";
import type { Piece } from "@/data/types";
import { Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";

/*
 * From one universe to the next (Yoni, 27/11/2026, his video on the Butterfly pendant): in the opening of every piece, a
 * discreet way to the piece before and the piece after, without leaving the universes.
 * - The order is the one of The Creations (all of them): the published pieces as the catalogue gives them (the server's order,
 *   which follows the admin once Yoni has ordered them, `admin-ordered:pieces`), looping (after the last, the first).
 * - Computer: two fine rose-gold arrows on the sides of the opening, vertically centred, beside the jewel; the name of the
 *   piece shows on hover or focus. The arrow keys ← → too, while the opening is on screen and nothing else wants them (a
 *   field, a slider, a dialog, the lightbox, full screen, a modifier key).
 * - Phone: two arrows at the bottom of the jewel (48 px), and a swipe left / right on the opening (horizontal only, never
 *   holding the vertical scroll; not on a showcase of several views, which has its own swipe).
 * - In Arabic everything mirrors: the previous piece on the right.
 * - The passage is a client-side navigation (the language kept) with a crossfade: the View Transitions API where there is
 *   one, else a short fade of the page; nothing moves with "reduce motion". The next page plays its entrance as usual.
 */

type Way = "prev" | "next";

/** One passage at a time (the page is remounted on the way: these live outside it). */
let busy = false;
let passages = 0;
/** Without the View Transitions API: the piece whose page fades in when it arrives. */
let fadeIn: string | null = null;
/** The arrow that had the keyboard focus: it gets it back on the new page. */
let refocus: Way | null = null;

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/** Resolves once the page of this piece is in the document (or after a while, never hanging the transition). */
function arrival(slug: string, timeout = 1500): Promise<void> {
  const start = performance.now();
  const selector = 'article[data-piece="' + CSS.escape(slug) + '"]';
  return new Promise((resolve) => {
    const check = () => {
      // A moment more once it is there: its first effects (the scroll back to the top) are done.
      if (document.querySelector(selector)) window.setTimeout(resolve, 40);
      else if (performance.now() - start > timeout) resolve();
      // Timers, not frames: a view transition holds the frames while it waits.
      else window.setTimeout(check, 16);
    };
    check();
  });
}

/** Goes to the page of a piece, with a crossfade from this universe to the next. */
function travel(go: () => void, slug: string) {
  if (busy) return;
  if (reduced()) {
    go();
    return;
  }
  busy = true;
  // Marked on the page while it lasts (another arrow, key or swipe waits for its end).
  const root = document.documentElement;
  root.setAttribute("data-piece-nav-moving", "");
  const passage = ++passages;
  const release = () => {
    if (passage !== passages) return;
    busy = false;
    root.removeAttribute("data-piece-nav-moving");
  };
  const doc = document as Document & { startViewTransition?: (update: () => Promise<void>) => { ready: Promise<void>; finished: Promise<void> } };
  if (typeof doc.startViewTransition === "function") {
    const vt = doc.startViewTransition(() => {
      go();
      return arrival(slug);
    });
    // A slower dissolve than the browser's (0.25 s); identical pixels (the menu) stay still.
    vt.ready
      .then(() => {
        const timing = { duration: 560, easing: EASE, fill: "both" as const };
        try {
          document.documentElement.animate({ opacity: [1, 0] }, { ...timing, pseudoElement: "::view-transition-old(root)" });
          document.documentElement.animate({ opacity: [0, 1] }, { ...timing, pseudoElement: "::view-transition-new(root)" });
        } catch {
          /* the browser's own crossfade */
        }
      })
      .catch(() => undefined);
    vt.finished.then(release, release);
    window.setTimeout(release, 2500);
    return;
  }
  // No View Transitions: the page fades out, the next one fades in when it arrives (useLayoutEffect below).
  const page = document.querySelector<HTMLElement>("article[data-piece]");
  const out = page?.animate({ opacity: [1, 0] }, { duration: 200, easing: "ease-in", fill: "forwards" });
  fadeIn = slug;
  const next = () => {
    go();
    window.setTimeout(release, 450);
  };
  if (out) out.finished.then(next, next);
  else next();
}

/** Whether the arrow keys belong to something else now. */
function keysTaken(): boolean {
  if (document.querySelector('[aria-modal="true"], dialog[open], [aria-controls="mobile-menu"][aria-expanded="true"]') || document.fullscreenElement) return true;
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el.closest('input, textarea, select, video, audio, [role="slider"], [role="spinbutton"], [role="textbox"], [role="combobox"], [role="listbox"], [role="menu"], [role="menubar"], [role="tablist"], [role="radiogroup"], [role="grid"], [role="tree"], [data-lightbox]')) return true;
  return scrollsSideways(el, document.body);
}

/** Whether an element, or one of its parents up to `stop`, scrolls sideways (a carousel, the views of a showcase). */
function scrollsSideways(from: Element, stop: Element): boolean {
  for (let el: Element | null = from; el && el !== stop; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
  }
  return false;
}

/** A fine arrow (a line and its head), in the rose gold of the house. Drawn pointing back (left). */
function FineArrow({ className }: { className: string }) {
  const id = "pn-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg viewBox="0 0 46 14" width="46" height="14" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="46" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E8B4A0" />
          <stop offset="0.55" stopColor="#B76E79" />
          <stop offset="1" stopColor="#9C5B4F" />
        </linearGradient>
      </defs>
      <path d="M45 7H1.5M7.5 1.5 1.5 7l6 5.5" stroke={"url(#" + id + ")"} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Previous and next piece, in the opening of a piece page (inside its section [data-piece-opening]). */
export default function PieceNav({ slug }: { slug: string }) {
  const { t, path, dir } = useI18n();
  const { pieces } = useCatalogue();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLElement>(null);

  const at = pieces.findIndex((p) => p.slug === slug);
  const count = pieces.length;
  const ways: Record<Way, Piece> | null = at < 0 || count < 2 ? null : { prev: pieces[(at - 1 + count) % count]!, next: pieces[(at + 1) % count]! };

  // The latest way to go, for the listeners set once.
  const goRef = useRef<(way: Way) => void>(() => undefined);
  useEffect(() => {
    goRef.current = (way: Way) => {
      if (!ways) return;
      const target = ways[way].slug;
      travel(() => navigate(path("/pieces/" + target)), target);
    };
  });
  const rtlRef = useRef(dir === "rtl");
  useEffect(() => {
    rtlRef.current = dir === "rtl";
  }, [dir]);

  // The new page: it fades in (without View Transitions), the arrow that had the focus gets it back.
  useLayoutEffect(() => {
    if (fadeIn === slug) {
      fadeIn = null;
      rootRef.current?.closest("article")?.animate({ opacity: [0, 1] }, { duration: 380, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" });
    }
    if (refocus) {
      const way = refocus;
      refocus = null;
      rootRef.current?.querySelector<HTMLElement>('[data-piece-nav-link="' + way + '"]')?.focus({ preventScroll: true });
    }
  }, [slug]);

  // The arrow keys, while the opening is on screen.
  useEffect(() => {
    const opening = rootRef.current?.closest<HTMLElement>("[data-piece-opening]");
    let seen = true;
    const io =
      opening && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([e]) => {
              seen = Boolean(e && e.intersectionRatio >= 0.3);
            },
            { threshold: [0, 0.3, 0.6, 1] },
          )
        : null;
    if (opening) io?.observe(opening);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !seen || keysTaken()) return;
      e.preventDefault();
      // The arrow keys follow the reading direction: right to left, the left arrow goes forward.
      goRef.current((e.key === "ArrowRight") !== rtlRef.current ? "next" : "prev");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      io?.disconnect();
    };
  }, []);

  // A swipe on the opening (touch screens): horizontal only, the listeners passive (the page always scrolls).
  useEffect(() => {
    const opening = rootRef.current?.closest<HTMLElement>("[data-piece-opening]");
    if (!opening) return undefined;
    let start: { x: number; y: number; at: number } | null = null;
    let axis: "x" | "y" | null = null;
    const onStart = (e: TouchEvent) => {
      start = null;
      axis = null;
      const touch = e.touches[0];
      if (e.touches.length !== 1 || !touch) return;
      const target = e.target instanceof Element ? e.target : null;
      // The edges of the screen belong to the system (the back gesture of Safari); a showcase of several views has its own swipe.
      if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return;
      if (target && (target.closest('[data-showcase="multi"], [data-piece-nav-link]') || scrollsSideways(target, opening))) return;
      start = { x: touch.clientX, y: touch.clientY, at: performance.now() };
    };
    const onMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!start || !touch) return;
      if (e.touches.length !== 1) {
        start = null;
        return;
      }
      if (axis === null) {
        const dx = Math.abs(touch.clientX - start.x);
        const dy = Math.abs(touch.clientY - start.y);
        if (dx > 12 || dy > 12) axis = dx > dy * 1.2 ? "x" : "y";
      }
      if (axis === "y") start = null;
    };
    const onEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const from = start;
      start = null;
      if (!from || !touch || axis !== "x") return;
      const dx = touch.clientX - from.x;
      const dy = touch.clientY - from.y;
      // A quick flick, or a long drag across the screen (slow, but clearly meant).
      const quick = performance.now() - from.at <= 900;
      if (Math.abs(dx) < Math.max(56, window.innerWidth * 0.16) || Math.abs(dy) > Math.abs(dx) * 0.6 || (!quick && Math.abs(dx) < window.innerWidth * 0.3)) return;
      // Towards the start of the line (left, right in Arabic): the next piece, as a page turns.
      goRef.current(dx < 0 !== rtlRef.current ? "next" : "prev");
    };
    const onCancel = () => {
      start = null;
    };
    const passive = { passive: true } as const;
    opening.addEventListener("touchstart", onStart, passive);
    opening.addEventListener("touchmove", onMove, passive);
    opening.addEventListener("touchend", onEnd, passive);
    opening.addEventListener("touchcancel", onCancel, passive);
    return () => {
      opening.removeEventListener("touchstart", onStart);
      opening.removeEventListener("touchmove", onMove);
      opening.removeEventListener("touchend", onEnd);
      opening.removeEventListener("touchcancel", onCancel);
    };
  }, []);

  if (!ways) return null;

  const onClick = (way: Way) => (e: MouseEvent<HTMLAnchorElement>) => {
    // A new tab, a new window: the browser's own way.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    // Entered from the keyboard (no pointer): the same arrow keeps the focus on the next page.
    if (e.detail === 0 && document.activeElement === e.currentTarget) refocus = way;
    goRef.current(way);
  };

  const arrow = (way: Way) => {
    const piece = ways[way];
    const back = way === "prev";
    return (
      <Link
        to={"/pieces/" + piece.slug}
        onClick={onClick(way)}
        aria-label={back ? t.piece.prevCreation(piece.title) : t.piece.nextCreation(piece.title)}
        data-piece-nav-link={way}
        data-piece-nav-target={piece.slug}
        className={
          "group pointer-events-auto relative inline-flex size-12 shrink-0 items-center justify-center outline-offset-0 lg:absolute lg:top-1/2 lg:h-28 lg:w-14 lg:-translate-y-1/2 " +
          (back ? "lg:start-2 xl:start-4" : "lg:end-2 xl:end-4")
        }
      >
        {/* Phone: a small dark disc, a fine chevron. */}
        <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/45 backdrop-blur-sm transition-colors group-active:border-rose-light/70 lg:hidden">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" className={"text-rose-light " + (back ? "rtl:-scale-x-100" : "-scale-x-100 rtl:scale-x-100")}>
            <path d="M10.5 2.5 5 8l5.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {/* Computer: a fine arrow that leans out a little on hover. */}
        <FineArrow
          className={
            "hidden opacity-70 drop-shadow-[0_1px_6px_rgba(0,0,0,0.75)] transition-[opacity,translate] duration-500 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 lg:block " +
            (back ? "group-hover:-translate-x-1 rtl:-scale-x-100 rtl:group-hover:translate-x-1" : "-scale-x-100 group-hover:translate-x-1 rtl:scale-x-100 rtl:group-hover:-translate-x-1")
          }
        />
        {/* Its name, on hover or focus (computer). */}
        <span
          aria-hidden="true"
          data-piece-nav-name
          className={
            "pointer-events-none invisible absolute top-1/2 hidden w-max max-w-[15rem] -translate-y-1/2 border border-white/10 bg-ink/85 px-4 py-3 opacity-0 backdrop-blur-md transition-[opacity,visibility] duration-500 group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 lg:block " +
            (back ? "start-full text-start" : "end-full text-end")
          }
        >
          <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.24em] text-rose-light">{back ? t.piece.navPrev : t.piece.navNext}</span>
          <span className="title-caps mt-1.5 block text-[0.9375rem] leading-snug tracking-[0.06em] text-white [text-wrap:balance]">{piece.title}</span>
        </span>
      </Link>
    );
  };

  return (
    // Phone: a row laid over the bottom of the jewel (its corners: the dots of a showcase stay in the middle). Computer: the
    // whole opening, the arrows on its sides.
    <nav ref={rootRef} aria-label={t.piece.navLabel} data-piece-nav className="pointer-events-none relative z-10 -mt-14 flex h-14 items-center justify-between px-1.5 sm:px-4 lg:absolute lg:inset-0 lg:mt-0 lg:block lg:h-auto lg:px-0">
      {arrow("prev")}
      {arrow("next")}
    </nav>
  );
}
