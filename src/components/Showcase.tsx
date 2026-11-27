import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Lightbox from "@/components/Lightbox";
import JewelFx, { jewelSource } from "@/components/universe/JewelFx";
import { cutoutLargest, cutoutSrcSet, isCutTop, type CutoutView } from "@/data/showcase";
import type { JewelEffect } from "@/data/themes";
import { useI18n } from "@/i18n";

/*
 * The opening of a piece: its jewel cut out (src/data/showcase.ts), alone or in a showcase of several views.
 * - Computer: the main view large in the middle of the universe, the others smaller around it, in depth; they float
 *   lightly and follow the mouse in relief; a click on one brings it to the middle (a smooth exchange of places). At the
 *   entrance of the page they appear one by one (src/index.css, [data-entering]).
 * - Phone: the main view large; a swipe shows the others (dots tell where one is), inside the space of the photo: the
 *   title and the buttons below are never covered.
 * Every view sits in a box of fixed size (no layout shift) and is drawn whole with its margin (never cut); nothing
 * floats nor follows the mouse when the visitor asks for reduced motion.
 */

/** The places around the main view: [x, y] as a share of the box, the size, the depth of the relief. */
/** The relief of the views under the pointer: off since 24/11/2026 (only slow fades on the site). */
const RELIEF = false;
const MAIN = { x: 0, y: 0, s: 0.68, d: 16 };
const SINGLE = { x: 0, y: 0, s: 0.86, d: 12 };
// A piece shown large (PieceShowcase.size): its main view takes the whole box (the views around stay at their places, behind).
const MAIN_LARGE = { ...MAIN, s: 0.9 };
const SINGLE_LARGE = { ...SINGLE, s: 0.94 };
// "xl" (Dragon Ball with its chain, Yoni 23/11/2026): a fifth larger again, a little higher, the jewel itself whole above the
// bottom of the screen. Smaller since 24/11/2026 (the whole piece in the first screen of a laptop).
const SINGLE_XL = { x: 0, y: -0.02, s: 1.04, d: 12 };
// A view cut at the top of its image (its chain leaves the photo, 27/11/2026: never faded any more): its frame reaches the top of
// the opening (over the room left for the menu: pt-20 / desk:pt-28 of [data-piece-cover], src/pages/PiecePage.tsx) and the
// image is drawn from there ([data-cut-top], src/index.css), so that its chain leaves the screen at the top, cut clean. Scaled
// from the top: the cut stays on the edge.
const CUT = { s: 0.94, sLarge: 0.98, sXl: 1 };
const LIFT = "-top-20 desk:-top-28";
// Each one stays inside the box: |x| and |y| at most (1 - s) / 2.
const AROUND = [
  { x: -0.37, y: 0.33, s: 0.26, d: 7 },
  { x: 0.37, y: -0.32, s: 0.25, d: 6 },
  { x: 0.37, y: 0.34, s: 0.24, d: 8 },
  { x: -0.37, y: -0.32, s: 0.22, d: 5 },
];

/**
 * jewel: the effect of its universe on the piece itself (src/components/universe/JewelFx.tsx), on its main view. large: its
 * main view much larger (the whole box).
 */

export default function Showcase({ slug, title, views, jewel = null, large = false, xl = false }: { slug: string; title: string; views: CutoutView[]; jewel?: JewelEffect | null; large?: boolean; xl?: boolean }) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  // A click on the main view (a touch on a phone) opens the views full screen, where the magnifying glass lives (Yoni,
  // 24/11/2026: no lens that follows the pointer over the page any more).
  const [opened, setOpened] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // order[k]: the view in place k (place 0 is the middle).
  const [order, setOrder] = useState(() => views.map((_, i) => i));
  const [slide, setSlide] = useState(0);
  const multi = views.length > 1;
  // One view alone, cut at the top of its image (its chain leaves the photo): drawn from the top of the opening.
  const cutTop = !multi && views[0] ? isCutTop(views[0]) : false;
  const kindName = (v: CutoutView) => t.piece.views[v.kind];

  // A new piece (or other views from the admin): the main view in the middle again.
  const key = slug + views.map((v) => v.id).join(",");
  const [shown, setShown] = useState(key);
  const renewed = shown !== key;
  if (renewed) {
    setShown(key);
    setOrder(views.map((_, i) => i));
    setSlide(0);
  }
  // This render already uses the new order: the old one may point at a view that is gone (a view excluded in the admin).
  const places = renewed ? views.map((_, i) => i) : order;

  // The relief: the views follow the mouse a little (computers only, never with reduced motion).
  useEffect(() => {
    const root = rootRef.current;
    // No relief under the pointer any more (24/11/2026: only slow fades on the site, the piece stays still).
    if (!root || !RELIEF || !window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let frame = 0;
    let mx = 0;
    let my = 0;
    const apply = () => {
      frame = 0;
      root.style.setProperty("--mx", mx.toFixed(3));
      root.style.setProperty("--my", my.toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = (e.clientY / window.innerHeight) * 2 - 1;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Off screen, the views rest (their floating pauses).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([e]) => root.toggleAttribute("data-idle", !e?.isIntersecting));
    io.observe(root);
    return () => io.disconnect();
  }, []);

  // Phone: the dot follows the swipe.
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    setSlide(Math.min(views.length - 1, Math.max(0, Math.round(Math.abs(track.scrollLeft) / track.clientWidth))));
  };
  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const dir = getComputedStyle(track).direction === "rtl" ? -1 : 1;
    track.scrollTo({ left: dir * i * track.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  // Computer: the view clicked takes the middle, the main one takes its place.
  const bring = (place: number) => {
    if (place === 0) return;
    setOrder((o) => {
      const next = [...o];
      [next[0], next[place]] = [next[place]!, next[0]!];
      return next;
    });
  };

  const img = (v: CutoutView, main: boolean, sizes: string) => (
    <img
      src={cutoutLargest(slug, v)}
      srcSet={cutoutSrcSet(slug, v)}
      sizes={sizes}
      alt={t.piece.viewAlt(title, kindName(v))}
      width={v.width}
      height={v.height}
      loading={main ? "eager" : "lazy"}
      fetchPriority={main ? "high" : undefined}
      decoding="async"
      draggable={false}
      ref={jewel ? jewelSource : undefined}
      className="h-full w-full select-none object-contain"
    />
  );
  // The jewel and the effect of its world on it, in one frame (isolated: the halo stays behind it).
  const framed = (v: CutoutView, main: boolean, sizes: string) => (
    <span data-cut-top={!multi && isCutTop(v) ? "" : undefined} className={"sv-float block h-full w-full" + (jewel ? " relative isolate" : "")}>
      {img(v, main, sizes)}
      {jewel ? <JewelFx kind={jewel} /> : null}
    </span>
  );

  return (
    <div
      ref={rootRef}
      data-showcase={multi ? "multi" : "single"}
      data-showcase-large={large ? "" : undefined}
      data-showcase-xl={xl && !multi ? "" : undefined}
      data-showcase-cut={cutTop ? "top" : undefined}
      className="relative h-full w-full"
    >
      {/* Computer: the views in depth */}
      <div className="absolute inset-0 hidden lg:block" role={multi ? "group" : undefined} aria-label={multi ? t.piece.viewsLabel : undefined}>
        {places.map((viewIndex, place) => {
          const v = views[viewIndex]!;
          const spot = !multi ? (xl ? SINGLE_XL : large ? SINGLE_LARGE : SINGLE) : place === 0 ? (large ? MAIN_LARGE : MAIN) : AROUND[(place - 1) % AROUND.length]!;
          const main = place === 0;
          const style = {
            transform: cutTop ? "scale(" + (xl ? CUT.sXl : large ? CUT.sLarge : CUT.s) + ")" : "translate(" + spot.x * 100 + "%, " + spot.y * 100 + "%) scale(" + spot.s + ")",
            transformOrigin: cutTop ? "50% 0" : undefined,
            zIndex: main ? 3 : 2 - Math.min(place, 2) / 10,
            "--d": spot.d + "px",
            "--i": place,
          } as CSSProperties;
          return (
            <button
              key={v.id}
              type="button"
              data-showcase-view={v.id}
              data-place={place}
              aria-label={main ? t.gallery.open(t.piece.viewAlt(title, kindName(v))) : t.piece.showView(kindName(v))}
              onClick={() => (main ? setOpened(viewIndex) : bring(place))}
              style={style}
              // Among several views, only the middle of the main one opens it (the small views around it stay within reach).
              className={"sv-view absolute " + (cutTop ? "inset-x-0 bottom-0 " + LIFT + " " : "inset-0 ") + (main ? (multi ? "pointer-events-none" : "cursor-zoom-in") : "cursor-pointer")}
            >
              {main && multi ? <span aria-hidden="true" className="pointer-events-auto absolute inset-[16%] z-10 cursor-zoom-in" /> : null}
              <span className="sv-par block h-full w-full">
                {framed(v, viewIndex === 0, main ? "(max-width: 1023px) 92vw, 50vw" : "18vw")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Phone: a swipe from one view to the next */}
      <div className={"absolute lg:hidden " + (cutTop ? "inset-x-0 bottom-0 " + LIFT : "inset-0")}>
        <div
          ref={trackRef}
          onScroll={multi ? onScroll : undefined}
          data-showcase-track
          aria-label={multi ? t.piece.viewsLabel : undefined}
          className={"flex h-full w-full " + (multi ? "snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "")}
        >
          {views.map((v, i) => (
            <div key={v.id} data-showcase-slide={i} className={"h-full w-full shrink-0 snap-center " + (multi ? "pb-12" : "")} style={{ "--i": i } as CSSProperties}>
              {/* A touch: full screen, two fingers to zoom. */}
              <button type="button" onClick={() => setOpened(i)} data-showcase-open={i} aria-label={t.gallery.open(t.piece.viewAlt(title, kindName(v)))} className="block h-full w-full cursor-zoom-in">
                {framed(v, i === 0, "92vw")}
              </button>
            </div>
          ))}
        </div>
        {multi ? (
          <div className="absolute inset-x-0 bottom-0 flex justify-center" data-showcase-dots>
            {views.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={t.piece.viewOf(i + 1, views.length) + " · " + kindName(v)}
                aria-current={slide === i ? "true" : undefined}
                className="group inline-flex size-12 items-center justify-center"
              >
                <span className={"block rounded-full transition-all duration-300 " + (slide === i ? "bg-rose-gold h-2 w-6" : "size-2 bg-white/45 group-hover:bg-white/80")} />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {opened !== null
        ? createPortal(
            <Lightbox
              items={views.map((v) => ({ type: "image" as const, src: cutoutLargest(slug, v), width: v.width, height: v.height, alt: t.piece.viewAlt(title, kindName(v)), onBlack: true }))}
              index={opened}
              onIndex={setOpened}
              onClose={() => setOpened(null)}
            />,
            document.body,
          )
        : null}
    </div>
  );
}
