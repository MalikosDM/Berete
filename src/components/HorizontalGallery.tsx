import { useEffect, useRef, useState } from "react";
import { ZoomIn } from "lucide-react";
import { MediaView } from "@/components/Media";
import Lightbox from "@/components/Lightbox";
import type { MediaItem } from "@/data/types";
import { useI18n } from "@/i18n";
import { gsap, useReducedMotion } from "@/lib/gsap";

type HorizontalGalleryProps = {
  items: MediaItem[];
  title?: string;
  /** Without its own black background: the photos melt into the background of the page (the universe of a piece). */
  bare?: boolean;
  /** Every photo the full screen goes through (the first ones of which are `items`): by default `items`. */
  all?: MediaItem[];
};

export default function HorizontalGallery({
  items,
  title: ownTitle,
  bare = false,
  all,
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
        className={"relative overflow-hidden py-20 lg:flex lg:min-h-svh lg:flex-col lg:justify-center lg:py-0 " + (bare ? "" : "bg-ink")}
      >
        <div className="mx-auto mb-10 flex w-full max-w-[1600px] items-end justify-between gap-6 px-5 sm:px-8 lg:mb-14 lg:px-12">
          <h2 className="title-caps t-title tracking-[0.16em]">
            {title}
          </h2>
          <p className="hidden text-base text-mist sm:block">
            {pinned ? t.gallery.hintPinned : t.gallery.hint}
          </p>
        </div>
        <div
          ref={trackRef}
          className={
            "no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 sm:gap-4 sm:px-8 lg:gap-6 lg:px-12 " +
            (pinned ? "lg:w-max lg:snap-none lg:overflow-visible" : "")
          }
        >
          {items.map((item, i) => (
            <figure
              key={item.src + i}
              data-gallery-item={item.type}
              // About the size of a photo of "Every Angle" (src/components/GalleryGrid.tsx), asked by Yoni on 20/11/2026.
              className="w-[44vw] shrink-0 snap-start sm:w-[31vw] lg:w-[23vw] xl:w-[21vw] 2xl:w-[19vw]"
            >
              <button
                type="button"
                onClick={(e) => {
                  // The universe of the piece may answer the opening of a photo (an impact: src/components/Universe.tsx).
                  window.dispatchEvent(new CustomEvent("universe:impact", { detail: { x: e.clientX, y: e.clientY } }));
                  setOpenIndex(i);
                }}
                className={"group relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden " + (bare ? "" : "bg-ink")}
                aria-label={t.gallery.open(item.alt ?? title)}
              >
                <span className="absolute inset-0 transition-transform duration-[1.2s] ease-out group-hover:scale-[1.05]">
                  <MediaView item={item} sizes="(max-width: 639px) 44vw, (max-width: 1023px) 31vw, 23vw" />
                </span>
                <span className="absolute end-2 bottom-2 hidden size-11 items-center justify-center rounded-full border border-white/30 bg-ink/60 text-white opacity-0 transition-opacity group-hover:opacity-100 lg:inline-flex">
                  <ZoomIn className="size-5" aria-hidden="true" />
                </span>
              </button>
              <figcaption className="mt-3 flex items-baseline gap-3">
                <span className="text-rose-gold font-display text-lg">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-base leading-snug text-bone">
                  {item.caption ?? item.alt}
                </span>
              </figcaption>
            </figure>
          ))}
          <div aria-hidden="true" className="w-1 shrink-0 lg:w-[8vw]" />
        </div>

        {openIndex !== null ? (
          <Lightbox
            items={all ?? items}
            index={openIndex}
            onIndex={setOpenIndex}
            onClose={() => setOpenIndex(null)}
          />
        ) : null}
      </section>
    </div>
  );
}

/* The full-screen viewer with its magnifying glass lives in src/components/Lightbox.tsx (kept here under its old name). */
export { Lightbox };
