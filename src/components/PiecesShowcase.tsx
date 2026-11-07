import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { MediaView } from "@/components/Media";
import { TYPE_LABELS } from "@/data/relations";
import { useCatalogue } from "@/lib/catalogue";
import { gsap, useReducedMotion } from "@/lib/gsap";

/** The capsules of the house, side by side; on desktop the row moves with the scroll. */
export default function PiecesShowcase({ exclude }: { exclude?: string }) {
  const { pieces: all } = useCatalogue();
  const pieces = all.filter((p) => p.slug !== exclude);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || reduced || pieces.length < 3) return undefined;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: () => "+=" + distance(), pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true },
      });
    });
    return () => mm.revert();
  }, [pieces.length, reduced]);

  if (pieces.length === 0) return null;

  return (
    <section ref={sectionRef} aria-labelledby="capsules-title" className="relative overflow-hidden bg-ink py-20 lg:flex lg:min-h-svh lg:flex-col lg:justify-center lg:py-0">
      <div className="mx-auto mb-10 flex w-full max-w-[1600px] flex-col justify-between gap-4 px-5 sm:flex-row sm:items-end sm:px-8 lg:mb-12 lg:px-12">
        <div>
          <p className="eyebrow">Collections</p>
          <h2 id="capsules-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">The capsules</h2>
        </div>
        <Link to="/creations" className="inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] text-white hover:text-rose-light">
          All creations <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div ref={trackRef} className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 sm:px-8 lg:w-max lg:snap-none lg:gap-8 lg:overflow-visible lg:px-12">
        {pieces.map((p, i) => (
          <Link key={p.slug} to={"/pieces/" + p.slug} className="group relative flex w-[82vw] shrink-0 snap-center flex-col border border-white/10 bg-ink sm:w-[46vw] lg:w-[30vw] xl:w-[26vw]">
            <span className="relative block aspect-[4/5] overflow-hidden">
              <span className="absolute inset-0 p-6 transition-transform duration-[1.8s] ease-out group-hover:scale-105">
                <MediaView item={p.cover} alt={p.title} fit="contain" eager={i < 2} />
              </span>
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-rose-light/20 to-transparent transition-transform duration-[1.6s] ease-out group-hover:translate-x-full" />
            </span>
            <span className="flex flex-1 flex-col p-6">
              <span className="text-rose-gold font-display text-2xl">{String(i + 1).padStart(2, "0")}</span>
              <span className="title-caps mt-3 block text-[clamp(1.5rem,2.2vw,2.25rem)] tracking-[0.06em] break-words text-white [text-wrap:balance] group-hover:text-rose-light">{p.title}</span>
              <span className="mt-3 block text-base text-mist">{TYPE_LABELS[p.type]}</span>
            </span>
          </Link>
        ))}
        <span aria-hidden="true" className="w-1 shrink-0 lg:w-[6vw]" />
      </div>
    </section>
  );
}
