import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cutoutLargest, cutoutSrcSet, type CutoutView } from "@/data/showcase";
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
const MAIN = { x: 0, y: 0, s: 0.74, d: 16 };
const SINGLE = { x: 0, y: 0, s: 0.94, d: 12 };
// Each one stays inside the box: |x| and |y| at most (1 - s) / 2.
const AROUND = [
  { x: -0.37, y: 0.33, s: 0.26, d: 7 },
  { x: 0.37, y: -0.32, s: 0.25, d: 6 },
  { x: 0.37, y: 0.34, s: 0.24, d: 8 },
  { x: -0.37, y: -0.32, s: 0.22, d: 5 },
];

export default function Showcase({ slug, title, views }: { slug: string; title: string; views: CutoutView[] }) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // order[k]: the view in place k (place 0 is the middle).
  const [order, setOrder] = useState(() => views.map((_, i) => i));
  const [slide, setSlide] = useState(0);
  const multi = views.length > 1;
  const kindName = (v: CutoutView) => t.piece.views[v.kind];

  // A new piece (or other views from the admin): the main view in the middle again.
  const key = slug + views.map((v) => v.id).join(",");
  const [shown, setShown] = useState(key);
  if (shown !== key) {
    setShown(key);
    setOrder(views.map((_, i) => i));
    setSlide(0);
  }

  // The relief: the views follow the mouse a little (computers only, never with reduced motion).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches) return undefined;
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
      alt={main ? t.piece.viewAlt(title, kindName(v)) : ""}
      width={v.width}
      height={v.height}
      loading={main ? "eager" : "lazy"}
      fetchPriority={main ? "high" : undefined}
      decoding="async"
      draggable={false}
      className="h-full w-full select-none object-contain"
    />
  );

  return (
    <div ref={rootRef} data-showcase={multi ? "multi" : "single"} className="relative h-full w-full">
      {/* Computer: the views in depth */}
      <div className="absolute inset-0 hidden lg:block" role={multi ? "group" : undefined} aria-label={multi ? t.piece.viewsLabel : undefined}>
        {order.map((viewIndex, place) => {
          const v = views[viewIndex]!;
          const spot = !multi ? SINGLE : place === 0 ? MAIN : AROUND[(place - 1) % AROUND.length]!;
          const main = place === 0;
          const style = {
            transform: "translate(" + spot.x * 100 + "%, " + spot.y * 100 + "%) scale(" + spot.s + ")",
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
              disabled={main}
              aria-label={main ? t.piece.viewAlt(title, kindName(v)) : t.piece.showView(kindName(v))}
              onClick={() => bring(place)}
              style={style}
              className={"sv-view absolute inset-0 " + (main ? "pointer-events-none" : "cursor-pointer")}
            >
              <span className="sv-par block h-full w-full">
                <span className="sv-float block h-full w-full">{img(v, viewIndex === 0, main ? "(max-width: 1023px) 92vw, 50vw" : "18vw")}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Phone: a swipe from one view to the next */}
      <div className="absolute inset-0 lg:hidden">
        <div
          ref={trackRef}
          onScroll={multi ? onScroll : undefined}
          data-showcase-track
          aria-label={multi ? t.piece.viewsLabel : undefined}
          className={"flex h-full w-full " + (multi ? "snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "")}
        >
          {views.map((v, i) => (
            <div key={v.id} data-showcase-slide={i} className={"h-full w-full shrink-0 snap-center " + (multi ? "pb-12" : "")} style={{ "--i": i } as CSSProperties}>
              <span className="sv-float block h-full w-full">{img(v, i === 0, "92vw")}</span>
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
    </div>
  );
}
