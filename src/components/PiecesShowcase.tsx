import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { MediaView } from "@/components/Media";
import { Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { gsap, useReducedMotion } from "@/lib/gsap";

/** A selection of pieces, side by side; on desktop the row moves with the scroll. */
export default function PiecesShowcase({
  slugs,
  exclude,
}: {
  slugs?: string[];
  exclude?: string;
}) {
  const { t, dir } = useI18n();
  const { pieces: all } = useCatalogue();
  const chosen = slugs
    ? slugs
        .map((s) => all.find((p) => p.slug === s))
        .filter((p): p is (typeof all)[number] => p !== undefined)
    : all;
  const pieces = chosen.filter((p) => p.slug !== exclude);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || reduced || pieces.length < 3) return undefined;
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
  }, [pieces.length, reduced, dir]);

  if (pieces.length === 0) return null;

  // The pinned section sits in a wrapper owned by React: GSAP wraps the section
  // in its own "pin-spacer", and React must still find its node when it leaves.
  return (
    <div data-pin-wrapper>
      <section
        ref={sectionRef}
        aria-labelledby="capsules-title"
        className="relative overflow-hidden bg-ink py-20 lg:flex lg:min-h-svh lg:flex-col lg:justify-center lg:py-0"
      >
        <div className="mx-auto mb-10 flex w-full max-w-[1600px] flex-col justify-between gap-4 px-5 sm:flex-row sm:items-end sm:px-8 lg:mb-12 lg:px-12">
          <div>
            <p className="eyebrow">{t.showcase.eyebrow}</p>
            <h2
              id="capsules-title"
              className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]"
            >
              {t.showcase.title}
            </h2>
          </div>
          <Link
            to="/creations"
            className="inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] text-white hover:text-rose-light"
          >
            {t.common.allCreations} <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
        <div
          ref={trackRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 sm:px-8 lg:w-max lg:snap-none lg:gap-8 lg:overflow-visible lg:px-12"
        >
          {pieces.map((p, i) => (
            <Link
              key={p.slug}
              to={"/pieces/" + p.slug}
              className="group relative flex w-[82vw] shrink-0 snap-center flex-col border border-white/10 bg-ink sm:w-[46vw] lg:w-[30vw] xl:w-[26vw]"
            >
              <span className="relative block aspect-[4/5] overflow-hidden">
                <span className="absolute inset-0 p-6 transition-transform duration-[1.8s] ease-out group-hover:scale-105">
                  <MediaView
                    item={p.cover}
                    alt={p.title}
                    fit="contain"
                    sizes="(max-width: 639px) 82vw, (max-width: 1023px) 46vw, 30vw"
                  />
                </span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-rose-light/20 to-transparent transition-transform duration-[1.6s] ease-out group-hover:translate-x-full"
                />
              </span>
              <span className="flex flex-1 flex-col p-6">
                <span className="text-rose-gold font-display text-2xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="title-caps mt-3 block text-[clamp(1.5rem,2.2vw,2.25rem)] tracking-[0.06em] break-words text-white [text-wrap:balance] group-hover:text-rose-light">
                  {p.title}
                </span>
                <span className="mt-3 block text-base text-mist">
                  {t.types[p.type]}
                </span>
              </span>
            </Link>
          ))}
          <span aria-hidden="true" className="w-1 shrink-0 lg:w-[6vw]" />
        </div>
      </section>
    </div>
  );
}
