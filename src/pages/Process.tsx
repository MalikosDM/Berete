import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import Reveal from "@/components/Reveal";
import { ScrollTrigger, getLenis, useReducedMotion } from "@/lib/gsap";
import { DEFAULT_MESSAGE, waLink } from "@/lib/site";

const VIDEO_SRC = "/images/fournies/video-process.mp4";
const VIDEO_FALLBACK = "https://sparkonic.ai/api/media/2b181c15-040d-44e0-b4d4-21341d9e8e89";

type Step = {
  n: number;
  title: string;
  text: string;
  from: number;
  to: number;
  paid: number;
  meter: string;
  payNote: string;
};

const STEPS: Step[] = [
  {
    n: 1,
    title: "First contact",
    text: "Ideas and budget. Tell us the moment you want to mark, your references, your story.",
    from: 0.03,
    to: 0.1,
    paid: 0,
    meter: "0%",
    payNote: "No payment at this stage.",
  },
  {
    n: 2,
    title: "Design deposit",
    text: "Deducted from the final price if confirmed, covers design costs if cancelled.",
    from: 0.12,
    to: 0.19,
    paid: 8,
    meter: "Deposit",
    payNote: "Design deposit paid.",
  },
  {
    n: 3,
    title: "Validation",
    text: "50% of production paid before crafting starts.",
    from: 0.24,
    to: 0.37,
    paid: 50,
    meter: "50%",
    payNote: "50% of production paid.",
  },
  {
    n: 4,
    title: "Creation",
    text: "Progress photos and videos on WhatsApp, timing depends on complexity.",
    from: 0.43,
    to: 0.56,
    paid: 50,
    meter: "50%",
    payNote: "Nothing more to pay while we craft.",
  },
  {
    n: 5,
    title: "Photoshoot",
    text: "Dedicated shoot, then delivery preparation.",
    from: 0.62,
    to: 0.75,
    paid: 50,
    meter: "50%",
    payNote: "Your piece is photographed before it leaves the atelier.",
  },
  {
    n: 6,
    title: "Balance & delivery",
    text: "Remaining 50% about one week before handover.",
    from: 0.82,
    to: 0.95,
    paid: 100,
    meter: "100%",
    payNote: "Fully paid, ready for handover.",
  },
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function paymentAt(p: number): Step | null {
  let current: Step | null = null;
  for (const s of STEPS) if (p >= s.from) current = s;
  return current;
}

function stepOpacity(p: number, from: number, to: number): number {
  const f = 0.018;
  if (p < from - f || p > to + f) return 0;
  if (p < from) return (p - (from - f)) / f;
  if (p > to) return 1 - (p - to) / f;
  return 1;
}

export default function Process() {
  const reduced = useReducedMotion();
  return (
    <>
      {reduced ? <StaticIntro /> : <ScrubbedProcess />}
      <StepsOverview />
      <Closing />
    </>
  );
}

/* Scroll-scrubbed video: frozen on the first frame, the scroll moves it frame by frame. */
function ScrubbedProcess() {
  const wrapRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [src, setSrc] = useState(VIDEO_SRC);

  useEffect(() => {
    const wrap = wrapRef.current;
    const video = videoRef.current;
    if (!wrap || !video) return undefined;

    let target = 0;
    let frame = 0;
    let snapTimer = 0;
    let snapEnd = 0;
    let snapping = false;
    const fine = window.matchMedia("(pointer: fine)").matches;

    video.pause();

    const apply = () => {
      const d = video.duration;
      if (!d || !Number.isFinite(d) || video.seeking) return;
      const t = Math.min(d - 0.04, Math.max(0, target * d));
      if (Math.abs(video.currentTime - t) > 0.015) video.currentTime = t;
    };
    const onData = () => {
      video.pause();
      if (video.currentTime === 0) video.currentTime = 0.001;
      apply();
    };

    // iOS only paints seeked frames once the video has been unlocked by a gesture.
    const unlock = () => {
      video.muted = true;
      video
        .play()
        .then(() => {
          video.pause();
          apply();
        })
        .catch(() => undefined);
    };
    window.addEventListener("touchstart", unlock, { once: true, passive: true });

    let trigger: ScrollTrigger | null = null;

    // Gentle magnet towards the nearest text step, cancelled by any new user scroll.
    function magnet() {
      if (!trigger) return;
      const p = target;
      if (p <= 0.01 || p >= 0.97) return;
      let best = STEPS[0];
      let dist = Infinity;
      for (const s of STEPS) {
        const d = Math.abs(p - (s.from + s.to) / 2);
        if (d < dist) {
          dist = d;
          best = s;
        }
      }
      if (dist < 0.006 || dist > 0.09) return;
      const mid = (best.from + best.to) / 2;
      const y = trigger.start + mid * (trigger.end - trigger.start);
      snapping = true;
      window.clearTimeout(snapEnd);
      snapEnd = window.setTimeout(() => {
        snapping = false;
      }, 1100);
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { duration: 0.9 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    }

    trigger = ScrollTrigger.create({
      trigger: wrap,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        target = self.progress;
        apply();
        if (!frame) {
          frame = requestAnimationFrame(() => {
            frame = 0;
            setProgress(target);
          });
        }
        if (fine && !snapping) {
          window.clearTimeout(snapTimer);
          snapTimer = window.setTimeout(magnet, 240);
        }
      },
    });

    const cancel = () => {
      window.clearTimeout(snapTimer);
      window.clearTimeout(snapEnd);
      snapping = false;
    };

    video.addEventListener("seeked", apply);
    video.addEventListener("loadedmetadata", apply);
    video.addEventListener("loadeddata", onData);
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("pointerdown", cancel);
    window.addEventListener("keydown", cancel);

    return () => {
      trigger?.kill();
      cancelAnimationFrame(frame);
      window.clearTimeout(snapTimer);
      window.clearTimeout(snapEnd);
      video.removeEventListener("seeked", apply);
      video.removeEventListener("loadedmetadata", apply);
      video.removeEventListener("loadeddata", onData);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("pointerdown", cancel);
      window.removeEventListener("keydown", cancel);
    };
  }, [src]);

  const introOpacity = Math.max(0, 1 - Math.max(0, progress - 0.004) / 0.022);
  const current = paymentAt(progress);
  const fill = current ? current.paid : 0;

  return (
    <section ref={wrapRef} aria-label="The process, step by step" className="relative h-[700vh]">
      <div className="sticky top-0 h-svh overflow-hidden bg-ink">
        <video
          ref={videoRef}
          src={src}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          onError={() => {
            if (src === VIDEO_SRC) setSrc(VIDEO_FALLBACK);
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink via-ink/45 to-ink/60" />

        {/* First frame: title */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center"
          style={{ opacity: introOpacity, transform: `translateY(${(1 - introOpacity) * -30}px)` }}
        >
          <p className="eyebrow">Six steps, one conversation</p>
          <h1 className="title-caps mt-6 text-[clamp(3rem,11vw,9rem)] tracking-[0.16em] text-white">The Process</h1>
          <p className="mt-6 max-w-xl text-lg text-bone">From your first message to the day you wear it.</p>
          <p className="mt-12 flex items-center gap-3 text-base text-mist" aria-hidden="true">
            Scroll to begin
            <ChevronDown className="size-5 animate-bounce text-rose-light" />
          </p>
        </div>

        {/* Text steps */}
        {STEPS.map((s, i) => {
          const last = i === STEPS.length - 1;
          const op = last ? (progress >= s.from ? Math.min(1, (progress - (s.from - 0.018)) / 0.018) : 0) : stepOpacity(progress, s.from, s.to);
          const visible = op > 0.05;
          return (
            <div
              key={s.n}
              aria-hidden={!visible}
              className={
                "absolute inset-x-5 bottom-32 sm:inset-x-8 md:bottom-24 lg:right-auto lg:bottom-[16vh] lg:left-[10vw] lg:max-w-xl " +
                (visible ? "" : "pointer-events-none")
              }
              style={{ opacity: Math.max(0, op), transform: `translateY(${(1 - Math.max(0, op)) * 28}px)` }}
            >
              <span className="text-rose-gold font-display text-7xl font-light leading-none lg:text-8xl">{pad(s.n)}</span>
              <h2 className="title-caps mt-4 text-[clamp(2rem,5vw,3.75rem)] tracking-[0.14em] text-white">{s.title}</h2>
              <p className="mt-4 max-w-md text-lg text-bone">{s.text}</p>
              {last ? (
                <Link
                  to="/contact"
                  tabIndex={visible ? 0 : -1}
                  className="mt-8 inline-flex min-h-14 items-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light"
                >
                  Start your piece
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          );
        })}

        {/* Rose-gold progress line */}
        <div aria-hidden="true" className="absolute top-28 right-4 bottom-32 w-px bg-white/20 md:bottom-24 lg:right-12 lg:top-36">
          <div className="bg-rose-gold absolute inset-x-0 top-0 h-full origin-top" style={{ transform: `scaleY(${progress})` }} />
          {STEPS.map((s) => (
            <span
              key={s.n}
              className={
                "absolute left-1/2 size-2 -translate-x-1/2 rounded-full border transition-colors duration-500 " +
                (progress >= s.from ? "border-rose-light bg-rose-light" : "border-white/50 bg-ink")
              }
              style={{ top: `${s.from * 100}%` }}
            />
          ))}
        </div>

        {/* Payment indicator */}
        <div className="absolute top-24 right-12 left-5 sm:left-8 lg:top-32 lg:right-24 lg:left-auto lg:w-80" style={{ opacity: 1 - introOpacity * 0.6 }}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-medium uppercase tracking-[0.24em] text-bone">Payment</span>
            <span className="text-rose-gold font-display text-2xl" aria-live="polite">{current ? current.meter : "0%"}</span>
          </div>
          <div className="mt-3 h-1 w-full bg-white/15" role="progressbar" aria-label="Amount paid" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fill}>
            <div className="bg-rose-gold h-full transition-[width] duration-700 ease-out" style={{ width: `${fill}%` }} />
          </div>
          <p className="mt-3 hidden text-base text-bone sm:block">{current ? current.payNote : "No payment at this stage."}</p>
        </div>
      </div>
    </section>
  );
}

/* Reduced motion: no scrubbing, the first frame and the title. */
function StaticIntro() {
  const [src, setSrc] = useState(VIDEO_SRC);
  return (
    <section className="relative flex min-h-[80svh] items-center justify-center overflow-hidden bg-ink px-5 pt-28 text-center">
      <video
        src={src}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        onError={() => {
          if (src === VIDEO_SRC) setSrc(VIDEO_FALLBACK);
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-ink/65" />
      <div className="relative">
        <p className="eyebrow">Six steps, one conversation</p>
        <h1 className="title-caps mt-6 text-[clamp(3rem,11vw,9rem)] tracking-[0.16em] text-white">The Process</h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-bone">From your first message to the day you wear it.</p>
      </div>
    </section>
  );
}

/* Recap: tap stepper on mobile, grid on desktop. */
function StepsOverview() {
  const [active, setActive] = useState(0);
  const current = STEPS[active];

  return (
    <section aria-labelledby="steps-title" className="bg-ink py-24 lg:py-36">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="rule-rose mb-16 lg:mb-24" aria-hidden="true" />
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow">Clear from the start</p>
            <h2 id="steps-title" className="title-caps mt-5 text-[clamp(2.25rem,5.5vw,4.5rem)] tracking-[0.14em]">
              Six steps, paid in stages
            </h2>
          </div>
          <p className="text-lg text-bone lg:col-span-5 lg:col-start-8 lg:self-end">
            A design deposit, half of production at validation, the balance one week before handover. You follow every stage on WhatsApp.
          </p>
        </div>

        {/* Mobile: vertical tap stepper */}
        <div className="mt-14 lg:hidden">
          <div className="border border-white/15 p-5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium uppercase tracking-[0.24em] text-bone">Payment</span>
              <span className="text-rose-gold font-display text-2xl">{current.meter}</span>
            </div>
            <div className="mt-3 h-1 w-full bg-white/15" role="progressbar" aria-label="Amount paid" aria-valuemin={0} aria-valuemax={100} aria-valuenow={current.paid}>
              <div className="bg-rose-gold h-full transition-[width] duration-700 ease-out" style={{ width: `${current.paid}%` }} />
            </div>
            <p className="mt-3 text-base text-bone">{current.payNote}</p>
          </div>

          <ol className="relative mt-10">
            <span aria-hidden="true" className="absolute top-7 bottom-7 left-6 w-px bg-white/20" />
            <span
              aria-hidden="true"
              className="bg-rose-gold absolute top-7 left-6 w-px transition-[height] duration-700"
              style={{ height: `calc((100% - 3.5rem) * ${active / (STEPS.length - 1)})` }}
            />
            {STEPS.map((s, i) => {
              const open = i === active;
              return (
                <li key={s.n} className="relative">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-expanded={open}
                    aria-controls={"step-panel-" + s.n}
                    className="flex min-h-14 w-full items-center gap-5 py-2 text-left"
                  >
                    <span
                      className={
                        "relative z-10 inline-flex size-12 shrink-0 items-center justify-center rounded-full border bg-ink font-display text-xl transition-colors " +
                        (i <= active ? "border-rose-light text-rose-light" : "border-white/40 text-white")
                      }
                    >
                      {i < active ? <Check className="size-5" aria-hidden="true" /> : pad(s.n)}
                    </span>
                    <span className={"title-caps text-xl tracking-[0.12em] " + (open ? "text-white" : "text-bone")}>{s.title}</span>
                  </button>
                  <div id={"step-panel-" + s.n} hidden={!open} className="pb-6 pl-[4.25rem]">
                    <p className="text-lg text-bone">{s.text}</p>
                    <p className="mt-3 text-base text-rose-light">{s.payNote}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Desktop: grid */}
        <ol className="mt-20 hidden gap-x-12 gap-y-16 lg:grid lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.n}>
              <Reveal delay={(i % 3) * 0.08}>
                <div className="border-t border-white/15 pt-8">
                  <span className="text-rose-gold font-display text-6xl font-light leading-none">{pad(s.n)}</span>
                  <h3 className="title-caps mt-6 text-3xl tracking-[0.12em]">{s.title}</h3>
                  <p className="mt-4 text-lg text-bone">{s.text}</p>
                  <p className="mt-4 flex items-center gap-3 text-base text-rose-light">
                    <span className="inline-block h-px w-8 bg-rose-light" aria-hidden="true" />
                    {s.payNote}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section aria-labelledby="process-cta" className="bg-ink pb-28 lg:pb-40">
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <p className="eyebrow">Step one is a message</p>
        <h2 id="process-cta" className="title-caps mt-6 text-[clamp(2.25rem,6vw,5rem)] tracking-[0.14em]">
          Your story, in diamonds
        </h2>
        <div className="mt-12 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
          <Link
            to="/contact"
            className="inline-flex min-h-14 items-center justify-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light"
          >
            Start your piece
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <a
            href={waLink(DEFAULT_MESSAGE)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-14 items-center justify-center gap-3 border border-rose-light/70 px-8 text-base font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-rose-light hover:text-ink"
          >
            <BrandIcon name="whatsapp" className="size-5" />
            WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
