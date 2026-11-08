import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { forceMuted, MediaView } from "@/components/Media";
import type { MediaItem } from "@/data/types";
import { useI18n } from "@/i18n";
import { gsap, getLenis, useReducedMotion } from "@/lib/gsap";

type HorizontalGalleryProps = {
  items: MediaItem[];
  title?: string;
};

export default function HorizontalGallery({
  items,
  title: ownTitle,
}: HorizontalGalleryProps) {
  const { t, dir } = useI18n();
  const title = ownTitle ?? t.gallery.title;
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || reduced || items.length < 2) return undefined;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      // Right to left (Arabic), the row starts on the right and moves to the right.
      const sign = dir === "rtl" ? 1 : -1;
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      gsap.to(track, {
        x: () => sign * distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => "+=" + distance(),
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    });
    return () => mm.revert();
  }, [items.length, reduced, dir]);

  if (items.length === 0) return null;
  const pinned = !reduced && items.length > 1;

  // The pinned section sits in a wrapper owned by React: GSAP wraps the section
  // in its own "pin-spacer", and React must still find its node when it leaves.
  return (
    <div data-pin-wrapper>
      <section
        ref={sectionRef}
        aria-label={title}
        className="relative overflow-hidden bg-ink py-20 lg:flex lg:min-h-svh lg:flex-col lg:justify-center lg:py-0"
      >
        <div className="mx-auto mb-10 flex w-full max-w-[1600px] items-end justify-between gap-6 px-5 sm:px-8 lg:mb-14 lg:px-12">
          <h2 className="title-caps text-[clamp(2rem,5vw,4rem)] tracking-[0.16em]">
            {title}
          </h2>
          <p className="hidden text-base text-mist sm:block">
            {pinned ? t.gallery.hintPinned : t.gallery.hint}
          </p>
        </div>
        <div
          ref={trackRef}
          className={
            "no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 sm:px-8 lg:gap-12 lg:px-12 " +
            (pinned ? "lg:w-max lg:snap-none lg:overflow-visible" : "")
          }
        >
          {items.map((item, i) => (
            <figure
              key={item.src + i}
              data-gallery-item={item.type}
              className="w-[78vw] shrink-0 snap-center sm:w-[55vw] lg:w-[38vw] xl:w-[32vw]"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(i)}
                className="group relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-ink"
                aria-label={t.gallery.open(item.alt ?? title)}
              >
                <span className="absolute inset-0 transition-transform duration-[1.2s] ease-out group-hover:scale-[1.05]">
                  <MediaView item={item} sizes="(max-width: 639px) 78vw, (max-width: 1023px) 55vw, 38vw" />
                </span>
                <span className="absolute end-3 bottom-3 inline-flex size-12 items-center justify-center rounded-full border border-white/30 bg-ink/60 text-white opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                  <ZoomIn className="size-5" aria-hidden="true" />
                </span>
              </button>
              <figcaption className="mt-4 flex items-baseline gap-4">
                <span className="text-rose-gold font-display text-xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-base text-bone">
                  {item.caption ?? item.alt}
                </span>
              </figcaption>
            </figure>
          ))}
          <div aria-hidden="true" className="w-1 shrink-0 lg:w-[8vw]" />
        </div>

        {openIndex !== null ? (
          <Lightbox
            items={items}
            index={openIndex}
            onIndex={setOpenIndex}
            onClose={() => setOpenIndex(null)}
          />
        ) : null}
      </section>
    </div>
  );
}

type LightboxProps = {
  items: MediaItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
};

function Lightbox({ items, index, onIndex, onClose }: LightboxProps) {
  const { t, dir } = useI18n();
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const closeRef = useRef<HTMLButtonElement>(null);
  const item = items[index];
  const count = items.length;

  const go = useCallback(
    (d: number) => {
      setZoomed(false);
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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, count, dir]);

  if (!item) return null;

  const toggleZoom = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(x.toFixed(1) + "% " + y.toFixed(1) + "%");
    setZoomed((z) => !z);
  };

  const btn =
    "inline-flex size-12 items-center justify-center rounded-full border border-white/30 bg-ink/70 text-white transition-colors hover:border-rose-light hover:text-rose-light";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.alt ?? t.gallery.photo}
      data-lenis-prevent
      className="fixed inset-0 z-[90] flex flex-col bg-ink"
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <p className="text-base text-bone">
          <span className="text-rose-gold font-display text-xl">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="mx-2 text-mist">/</span>
          {String(count).padStart(2, "0")}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className={btn}
            onClick={() => setZoomed((z) => !z)}
            aria-label={zoomed ? t.gallery.zoomOut : t.gallery.zoomIn}
          >
            {zoomed ? (
              <ZoomOut className="size-5" aria-hidden="true" />
            ) : (
              <ZoomIn className="size-5" aria-hidden="true" />
            )}
          </button>
          <button
            ref={closeRef}
            type="button"
            className={btn}
            onClick={onClose}
            aria-label={t.common.close}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <button
          type="button"
          onClick={toggleZoom}
          className={
            "block h-full w-full " +
            (zoomed ? "cursor-zoom-out" : "cursor-zoom-in")
          }
          aria-label={zoomed ? t.gallery.zoomOut : t.gallery.zoomIn}
        >
          {item.type === "video" ? (
            <video
              key={item.src}
              ref={(v) => {
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
              className="h-full w-full object-contain transition-transform duration-700 ease-out"
              style={{
                transform: zoomed ? "scale(2.2)" : "scale(1)",
                transformOrigin: origin,
              }}
            />
          ) : (
            <img
              src={item.src}
              alt={item.alt ?? ""}
              width={item.width}
              height={item.height}
              decoding="async"
              className={
                "h-full w-full object-contain transition-transform duration-700 ease-out " +
                (item.onBlack ? "mix-blend-lighten" : "")
              }
              style={{
                transform: zoomed ? "scale(2.2)" : "scale(1)",
                transformOrigin: origin,
              }}
            />
          )}
        </button>
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className={btn + " absolute top-1/2 start-4 -translate-y-1/2"}
              aria-label={t.common.previous}
            >
              <ChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className={btn + " absolute top-1/2 end-4 -translate-y-1/2"}
              aria-label={t.common.next}
            >
              <ChevronRight className="size-5 rtl:-scale-x-100" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {item.caption ? (
        <p className="px-5 py-5 text-center text-base text-bone sm:px-8">
          {item.caption}
        </p>
      ) : null}
    </div>
  );
}
