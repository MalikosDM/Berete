import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { asRecord, num, pickList, str, useApi } from "@/pages/Creations";
import { gsap, useReducedMotion } from "@/lib/gsap";
import Logo from "@/components/Logo";

type CapsuleCard = { slug: string; title: string; tagline: string; coverImage: string; count: number };

export default function CapsulesShowcase() {
  const { data, loading, error } = useApi("/api/capsules", pickList("capsules"));
  const capsules = useMemo<CapsuleCard[]>(
    () =>
      (data ?? [])
        .map((x) => {
          const r = asRecord(x);
          return { slug: str(r.slug), title: str(r.title), tagline: str(r.tagline), coverImage: str(r.coverImage), count: num(r.count) ?? 0 };
        })
        .filter((c) => c.slug !== ""),
    [data],
  );
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || reduced || capsules.length < 2) return undefined;
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
  }, [capsules.length, reduced]);

  return (
    <section ref={sectionRef} aria-labelledby="capsules-title" className="relative overflow-hidden bg-ink py-20 lg:flex lg:min-h-svh lg:flex-col lg:justify-center lg:py-0">
      <div className="mx-auto mb-10 w-full max-w-[1600px] px-5 sm:px-8 lg:mb-12 lg:px-12">
        <p className="eyebrow">Collections</p>
        <h2 id="capsules-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">The Capsules</h2>
      </div>
      {loading ? (
        <div className="flex flex-col gap-6 px-5 sm:px-8 lg:flex-row lg:px-12">
          {[0, 1].map((k) => (
            <div key={k} className="h-[60svh] animate-pulse bg-white/5 lg:w-[55vw]" />
          ))}
          <span className="sr-only">Loading the capsules</span>
        </div>
      ) : error ? (
        <p className="mx-5 border border-white/15 p-10 text-center text-lg text-bone sm:mx-8 lg:mx-12">{error}</p>
      ) : capsules.length === 0 ? (
        <p className="mx-5 border border-white/15 p-10 text-center text-lg text-bone sm:mx-8 lg:mx-12">New capsules are being crafted.</p>
      ) : (
        <div ref={trackRef} className="flex flex-col gap-6 px-5 sm:px-8 lg:w-max lg:flex-row lg:gap-10 lg:px-12">
          {capsules.map((c, i) => (
            <Link key={c.slug} to={"/capsules/" + c.slug} className="group relative flex h-[72svh] flex-col justify-end overflow-hidden border border-white/10 lg:h-[72vh] lg:w-[60vw] xl:w-[52vw]">
              <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-ink">
                <Logo position="center" className="h-1/5 w-1/2 opacity-15" />
              </span>
              {c.coverImage ? (
                <img onError={(e) => { e.currentTarget.style.display = "none"; }} src={c.coverImage} alt={c.title + " capsule"} width={1600} height={1000} loading={i === 0 ? "eager" : "lazy"} decoding="async" className="absolute inset-x-0 top-0 h-3/4 w-full object-contain object-center p-6 mix-blend-lighten transition-transform duration-[2.5s] ease-out group-hover:scale-105 sm:p-10" />
              ) : (
                <span aria-hidden="true" className="absolute inset-0 bg-ink-soft" />
              )}
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-rose-light/25 to-transparent transition-transform duration-[1.6s] ease-out group-hover:translate-x-full" />
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-ink via-ink/70 to-transparent" />
              <div className="relative z-10 p-6 sm:p-10">
                <span className="text-rose-gold font-display text-3xl">{String(i + 1).padStart(2, "0")}</span>
                <p className="title-caps mt-4 text-[clamp(1.5rem,3.6vw,3.25rem)] tracking-[0.04em] text-white [text-wrap:balance] sm:tracking-[0.08em]">{c.title}</p>
                {c.tagline ? <p className="mt-3 text-lg text-bone">{c.tagline}</p> : null}
                <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
                  <span className="text-sm uppercase tracking-[0.2em] text-mist">{c.count} {c.count === 1 ? "piece" : "pieces"}</span>
                  <span className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-white group-hover:text-rose-light">
                    Enter the capsule <ArrowUpRight className="size-4" aria-hidden="true" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
          <div aria-hidden="true" className="hidden w-[6vw] shrink-0 lg:block" />
        </div>
      )}
    </section>
  );
}
