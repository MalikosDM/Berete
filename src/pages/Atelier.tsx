import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Camera, Maximize2, X } from "lucide-react";
import ScrollVideo, { type ScrollStep } from "@/components/ScrollVideo";
import Reveal from "@/components/Reveal";
import PageIntro from "@/components/PageIntro";
import JewelImage from "@/components/JewelImage";
import { gsap, useReducedMotion } from "@/lib/gsap";

const SETTING_VIDEO = "/images/fournies/01-video-sertissage.mp4";

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.75)]";

const ATELIER_INTRO_STEPS: ScrollStep[] = [
  {
    from: 0,
    to: 0.35,
    align: "left",
    content: (
      <div className={"max-w-3xl " + shadow}>
        <p className="eyebrow">Dubai</p>
        <h1 className="title-caps mt-5 text-[clamp(2.75rem,9vw,8rem)] tracking-[0.14em] text-white">The Atelier</h1>
        <p className="mt-6 max-w-lg text-lg text-bone">Where every piece is sculpted, then set stone by stone.</p>
      </div>
    ),
  },
  {
    from: 0.5,
    to: 0.92,
    align: "right",
    content: (
      <p className={"title-caps max-w-3xl text-[clamp(2rem,6vw,5rem)] tracking-[0.1em] text-white " + shadow}>Every stone set by hand.</p>
    ),
  },
];

type AtelierStep = { title: string; text: string; image?: string; alt?: string; video?: string };

const ATELIER_STEPS: AtelierStep[] = [
  { title: "Design", text: "Sketches and renders shaped around your story: your club, your number, your symbols." },
  { title: "Sculpting", text: "The volume is modelled in 3D, then refined until every curve holds the light." },
  { title: "Casting", text: "The model becomes metal. Each part is cast, cleaned and prepared for its stones." },
  {
    title: "Stone setting",
    text: "Under the microscope, each diamond is placed and secured by hand, one after another.",
    image: "/images/atelier-bench.webp",
    alt: "Jeweller's bench with setting tools and loose diamonds under a work lamp",
  },
  { title: "Polishing", text: "The metal is brought to a mirror finish so the stones become the only thing you see." },
  { title: "Final check", text: "Every stone, every engraving, every clasp is inspected before the piece is photographed." },
];

function StepMedia({ step }: { step: AtelierStep }) {
  if (step.video) {
    return (
      <video
        src={step.video}
        muted
        playsInline
        preload="metadata"
        controls
        className="h-full w-full object-cover"
      />
    );
  }
  if (step.image) {
    return (
      <img
        src={step.image}
        alt={step.alt ?? step.title}
        width={1600}
        height={900}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-ink-soft">
      <div className="border-rose-gold flex flex-col items-center gap-3 px-8 py-6 text-center">
        <Camera className="size-6 text-rose-light" aria-hidden="true" />
        <p className="text-base text-bone">Photo or video coming soon</p>
      </div>
    </div>
  );
}

export default function Atelier() {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-mask]").forEach((el, i) => {
        const from = i % 2 === 0 ? "inset(18% 12% 18% 12%)" : "circle(14% at 50% 50%)";
        const to = i % 2 === 0 ? "inset(0% 0% 0% 0%)" : "circle(80% at 50% 50%)";
        gsap.fromTo(
          el,
          { clipPath: from },
          {
            clipPath: to,
            ease: "none",
            scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "top top", scrub: true },
          }
        );
      });
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <div ref={root}>
      <ScrollVideo src={SETTING_VIDEO} heightVh={300} steps={ATELIER_INTRO_STEPS} label="Stone setting close-up, driven by scroll" />

      <section aria-labelledby="atelier-steps" className="relative">
        <h2 id="atelier-steps" className="sr-only">
          From sketch to delivery
        </h2>
        {ATELIER_STEPS.map((step, i) => (
          <article
            key={step.title}
            className="sticky top-0 h-[100svh] w-full overflow-hidden bg-ink"
            style={{ zIndex: i + 1 }}
          >
            <div data-mask className="absolute inset-0">
              <StepMedia step={step} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/10" />
            </div>
            <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-28 sm:px-8 md:pb-20">
              <p className="text-rose-gold font-display text-5xl font-light md:text-7xl">{String(i + 1).padStart(2, "0")}</p>
              <h3 className={"title-caps mt-4 text-[clamp(2rem,6vw,5rem)] text-white " + shadow}>{step.title}</h3>
              <div className="rule-rose my-6 max-w-xs" />
              <p className={"max-w-xl text-lg text-bone " + shadow}>{step.text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="relative z-20 bg-ink px-5 py-28 text-center sm:px-8 md:py-40">
        <Reveal>
          <p className="eyebrow">Your piece</p>
          <h2 className="title-caps mx-auto mt-6 max-w-4xl text-[clamp(2rem,5vw,4.5rem)] text-white">Follow it on WhatsApp, step by step.</h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-bone">Progress photos and videos are shared with you during the whole creation.</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/contact" className="inline-flex min-h-12 items-center gap-3 bg-white px-8 text-base font-medium text-ink transition hover:bg-bone">
              Start your piece <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link to="/process" className="border-rose-gold inline-flex min-h-12 items-center gap-3 px-8 text-base text-white transition hover:text-rose-light">
              See the process
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

type Box = { slug: string; name: string; description: string; image: string; pieceSlug: string | null };

export function Boxes() {
  const [boxes, setBoxes] = useState<Box[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Box | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/boxes")
      .then(async (res) => {
        if (!res.ok) throw new Error("bad");
        const data = (await res.json()) as { boxes: Box[] };
        if (alive) setBoxes(data.boxes);
      })
      .catch(() => {
        if (alive) setError("The boxes could not be loaded. Please try again in a moment.");
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="pb-28">
      <PageIntro
        eyebrow="Made to measure"
        title="Boxes"
        lead="Custom boxes available on selected pieces, as an option."
      />

      <section aria-label="Custom boxes" className="mx-auto max-w-7xl px-5 sm:px-8">
        {error && <p className="flex min-h-[60svh] items-center justify-center py-16 text-center text-lg text-bone">{error}</p>}
        {!error && boxes === null && (
          <div className="grid gap-10 md:grid-cols-2" aria-busy="true">
            {[0, 1].map((k) => (
              <div key={k} className="aspect-video animate-pulse bg-ink-soft" />
            ))}
          </div>
        )}
        {!error && boxes !== null && boxes.length === 0 && (
          <p className="flex min-h-[60svh] items-center justify-center py-16 text-center text-lg text-bone">New boxes are on their way.</p>
        )}
        {!error && boxes !== null && boxes.length > 0 && (
          <div className="grid gap-16 md:grid-cols-2 md:gap-12">
            {boxes.map((box, i) => (
              <Reveal key={box.slug} className={i % 2 === 1 ? "md:mt-32" : ""}>
                <button
                  type="button"
                  onClick={() => setOpen(box)}
                  className="group relative block w-full text-left"
                  aria-label={"Open " + box.name + " full screen"}
                >
                  <JewelImage src={box.image} alt={"Custom box " + box.name} className="aspect-video w-full transition duration-700 group-hover:scale-[1.03]" />
                  <span className="absolute right-3 top-3 inline-flex size-12 items-center justify-center bg-ink/70 text-white opacity-90 transition group-hover:text-rose-light">
                    <Maximize2 className="size-5" aria-hidden="true" />
                  </span>
                </button>
                <p className="text-rose-gold mt-6 font-display text-3xl">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="title-caps mt-2 text-3xl text-white md:text-4xl">{box.name}</h2>
                <p className="mt-4 max-w-md text-lg text-bone">{box.description}</p>
                {box.pieceSlug && (
                  <Link to={"/pieces/" + box.pieceSlug} className="mt-6 inline-flex min-h-12 items-center gap-2 text-base text-white hover:text-rose-light">
                    See the piece <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                )}
              </Reveal>
            ))}
          </div>
        )}
        <div className="rule-rose my-20" />
        <p className="mx-auto max-w-2xl text-center font-display text-2xl text-white md:text-3xl">
          Custom boxes available on selected pieces, as an option.
        </p>
        <div className="mt-10 flex justify-center">
          <Link to="/contact" className="inline-flex min-h-12 items-center gap-3 bg-white px-8 text-base font-medium text-ink hover:bg-bone">
            Start your piece <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.name}
          data-lenis-prevent
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink p-4"
          onClick={() => setOpen(null)}
        >
          <img src={open.image} alt={"Custom box " + open.name} className="jewel max-h-full max-w-full" />
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="absolute right-4 top-4 inline-flex size-12 items-center justify-center border border-white/40 text-white hover:text-rose-light"
            aria-label="Close"
            autoFocus
          >
            <X className="size-6" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
