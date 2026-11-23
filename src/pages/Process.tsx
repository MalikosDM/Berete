import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import Reveal from "@/components/Reveal";
import ScrollVideo, { type ScrollStep } from "@/components/ScrollVideo";
import { MediaView } from "@/components/Media";
import { media } from "@/data/catalogue";
import stills from "@/data/mechanisms.generated.json" with { type: "json" };
import { trunkPhotos } from "@/data/trunks";
import type { MediaItem } from "@/data/types";
import { Link, useI18n, type Messages } from "@/i18n";
import { waLink } from "@/lib/site";
import { useWhatsAppMessage } from "@/lib/whatsapp";

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

/* When each step shows in the film, and how much is paid by then. Its words are in src/i18n (process.steps). */
const TIMING: { from: number; to: number; paid: number }[] = [
  { from: 0.03, to: 0.1, paid: 0 },
  { from: 0.12, to: 0.19, paid: 8 },
  { from: 0.24, to: 0.37, paid: 50 },
  { from: 0.43, to: 0.56, paid: 50 },
  { from: 0.62, to: 0.75, paid: 50 },
  { from: 0.82, to: 0.95, paid: 100 },
];

function stepsOf(t: Messages): Step[] {
  return TIMING.map((time, i) => {
    const words = t.process.steps[i] ?? { title: "", text: "", meter: "", payNote: "" };
    return { n: i + 1, ...time, ...words };
  });
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function paymentAt(steps: Step[], p: number): Step | null {
  let current: Step | null = null;
  for (const s of steps) if (p >= s.from) current = s;
  return current;
}

/** The real images of each step of the journey, from the site: the sketch, the design approved, the atelier, the trunk. */
const JOURNEY_IMAGES: (MediaItem | null)[] = [
  media.sketches?.["campione-d-italia-2023-2024"] ?? null,
  stills["journey-design"] ? { type: "image", src: stills["journey-design"].image, width: stills["journey-design"].width, height: stills["journey-design"].height } : null,
  media.groups["atelier"]?.[2] ?? null,
  trunkPhotos("dragon-ball-trunk")[2] ? { type: "image", ...trunkPhotos("dragon-ball-trunk")[2]! } : null,
];

/**
 * The journey understood in five seconds (Yoni, 23/11/2026): four steps, each a real image of the site and one line; then
 * the two questions every client asks: how to order, how long it takes.
 */
function Journey() {
  const { t } = useI18n();
  const waMessage = useWhatsAppMessage();
  return (
    <section aria-labelledby="journey-title" data-journey className="bg-ink pt-32 pb-20 sm:pt-40 lg:pt-44 lg:pb-28">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <h1 id="journey-title" className="title-caps text-[clamp(2.25rem,6vw,5rem)] tracking-[0.14em] text-white">{t.process.title}</h1>
        <p className="mt-5 max-w-2xl text-lg text-bone">{t.process.quick.lead}</p>
        <ol className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
          {t.process.quick.steps.map((step, i) => {
            const image = JOURNEY_IMAGES[i];
            return (
              <li key={step.title} data-journey-step={i + 1}>
                <div className="relative aspect-[4/5] overflow-hidden border border-white/10 bg-ink-soft">
                  {image ? <MediaView item={image} alt={step.title} fit="cover" sizes="(max-width: 1023px) 46vw, 22vw" /> : null}
                  <span aria-hidden="true" className="absolute start-0 top-0 bg-ink/80 px-3 py-1 font-display text-2xl text-rose-light">{pad(i + 1)}</span>
                </div>
                <h2 className="title-caps mt-4 text-lg leading-snug tracking-[0.1em] text-white sm:text-xl">{step.title}</h2>
                <p className="mt-1.5 text-base leading-snug text-bone">{step.text}</p>
              </li>
            );
          })}
        </ol>
        <dl className="mt-16 grid gap-px border border-white/10 bg-white/10 md:grid-cols-2">
          <div data-journey-order className="bg-ink p-6 sm:p-8">
            <dt className="title-caps text-xl tracking-[0.1em] text-rose-light">{t.process.quick.orderQ}</dt>
            <dd className="mt-3 text-base leading-relaxed text-bone md:text-lg">{t.process.quick.orderA}</dd>
            <dd className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href={waLink(waMessage)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 bg-white px-6 text-base font-semibold text-ink transition-colors hover:bg-rose-light">
                <BrandIcon name="whatsapp" className="size-5" /> {t.common.whatsapp}
              </a>
              <Link to="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/40 px-6 text-base font-semibold text-white transition-colors hover:border-rose-light hover:text-rose-light">
                {t.nav.contact} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </dd>
          </div>
          <div data-journey-time className="bg-ink p-6 sm:p-8">
            <dt className="title-caps text-xl tracking-[0.1em] text-rose-light">{t.process.quick.timeQ}</dt>
            <dd className="mt-3 text-base leading-relaxed text-bone md:text-lg">{t.process.quick.timeA}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

export default function Process() {
  const { t } = useI18n();
  const steps = stepsOf(t);
  return (
    <>
      <Journey />
      <ScrollVideo media={media.scroll.process!} steps={filmSteps(t, steps)} label={t.process.filmLabel} overlay={(p) => <Payment progress={p} steps={steps} />} showProgress={false} magnet="strong" />
      <StepsOverview steps={steps} />
      <Closing />
    </>
  );
}

const filmSteps = (t: Messages, STEPS: Step[]): ScrollStep[] => [
  {
    from: 0,
    to: 0.025,
    align: "center",
    content: (
      <div className="mx-auto max-w-3xl text-center [text-shadow:0_2px_30px_rgba(0,0,0,0.75)]">
        <p className="eyebrow">{t.process.eyebrow}</p>
        <h2 className="title-caps mt-6 text-[clamp(3rem,11vw,9rem)] tracking-[0.16em] text-white">{t.process.title}</h2>
        <p className="mt-6 text-lg text-bone">{t.process.lead}</p>
      </div>
    ),
  },
  ...STEPS.map(
    (s, i): ScrollStep => ({
      from: s.from,
      to: i === STEPS.length - 1 ? 1 : s.to,
      align: "left",
      content: (
        <div className="max-w-xl [text-shadow:0_2px_30px_rgba(0,0,0,0.75)]">
          <span className="text-rose-gold font-display text-7xl font-light leading-none lg:text-8xl">{pad(s.n)}</span>
          <h2 className="title-caps mt-4 text-[clamp(2rem,5vw,3.75rem)] tracking-[0.14em] text-white">{s.title}</h2>
          <p className="mt-4 max-w-md text-lg text-bone">{s.text}</p>
          {i === STEPS.length - 1 ? (
            <Link to="/contact" className="mt-8 inline-flex min-h-14 items-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light">
              {t.common.startPiece}
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      ),
    }),
  ),
];

/* Over the film: the rose-gold line that progresses and the payment meter that fills. */
function Payment({ progress, steps: STEPS }: { progress: number; steps: Step[] }) {
  const { t } = useI18n();
  const current = paymentAt(STEPS, progress);
  const fill = current ? current.paid : 0;
  const shown = Math.min(1, Math.max(0, (progress - 0.01) / 0.02));
  return (
    <>
      <div aria-hidden="true" className="absolute top-40 end-4 bottom-32 w-px bg-white/20 md:bottom-24 lg:end-12">
        <div className="bg-rose-gold absolute inset-x-0 top-0 h-full origin-top" style={{ transform: "scaleY(" + progress + ")" }} />
        {STEPS.map((s) => (
          <span
            key={s.n}
            className={"absolute left-1/2 size-2 -translate-x-1/2 rounded-full border transition-colors duration-500 " + (progress >= s.from ? "border-rose-light bg-rose-light" : "border-white/50 bg-ink")}
            style={{ top: s.from * 100 + "%" }}
          />
        ))}
      </div>
      <div className="absolute top-24 end-10 start-5 sm:start-8 lg:top-32 lg:end-24 lg:start-auto lg:w-80" style={{ opacity: shown }}>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-base font-medium uppercase tracking-[0.2em] text-bone">{t.process.payment}</span>
          <span className="text-rose-gold font-display text-2xl">{(current ?? STEPS[0])?.meter}</span>
        </div>
        <div className="mt-3 h-1 w-full bg-white/15" role="progressbar" aria-label={t.process.paid} aria-valuemin={0} aria-valuemax={100} aria-valuenow={fill}>
          <div className="bg-rose-gold h-full transition-[width] duration-700 ease-out" style={{ width: fill + "%" }} />
        </div>
        <p className="mt-3 hidden text-base text-bone sm:block">{current ? current.payNote : t.process.noPayment}</p>
      </div>
    </>
  );
}

/* Recap: tap stepper on mobile, grid on desktop. */
function StepsOverview({ steps: STEPS }: { steps: Step[] }) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const current = STEPS[active]!;

  return (
    <section aria-labelledby="steps-title" className="bg-ink py-24 lg:py-36">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="rule-rose mb-16 lg:mb-24" aria-hidden="true" />
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow">{t.process.clear}</p>
            <h2 id="steps-title" className="title-caps mt-5 text-[clamp(2.25rem,5.5vw,4.5rem)] tracking-[0.14em]">
              {t.process.overviewTitle}
            </h2>
          </div>
          <p className="text-lg text-bone lg:col-span-5 lg:col-start-8 lg:self-end">{t.process.overviewText}</p>
        </div>

        {/* Mobile: vertical tap stepper */}
        <div className="mt-14 lg:hidden">
          <div className="border border-white/15 p-5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium uppercase tracking-[0.24em] text-bone">{t.process.payment}</span>
              <span className="text-rose-gold font-display text-2xl">{current.meter}</span>
            </div>
            <div className="mt-3 h-1 w-full bg-white/15" role="progressbar" aria-label={t.process.paid} aria-valuemin={0} aria-valuemax={100} aria-valuenow={current.paid}>
              <div className="bg-rose-gold h-full transition-[width] duration-700 ease-out" style={{ width: `${current.paid}%` }} />
            </div>
            <p className="mt-3 text-base text-bone">{current.payNote}</p>
          </div>

          <ol className="relative mt-10">
            <span aria-hidden="true" className="absolute top-7 bottom-7 start-6 w-px bg-white/20" />
            <span
              aria-hidden="true"
              className="bg-rose-gold absolute top-7 start-6 w-px transition-[height] duration-700"
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
                    className="flex min-h-14 w-full items-center gap-5 py-2 text-start"
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
                  <div id={"step-panel-" + s.n} hidden={!open} className="pb-6 ps-[4.25rem]">
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
  const { t } = useI18n();
  const waMessage = useWhatsAppMessage();
  return (
    <section aria-labelledby="process-cta" className="bg-ink pb-28 lg:pb-40">
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <p className="eyebrow">{t.process.closingEyebrow}</p>
        <h2 id="process-cta" className="title-caps mt-6 text-[clamp(2.25rem,6vw,5rem)] tracking-[0.14em]">
          {t.common.yourStory}
        </h2>
        <div className="mt-12 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
          <Link
            to="/contact"
            className="inline-flex min-h-14 items-center justify-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light"
          >
            {t.common.startPiece}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
          <a
            href={waLink(waMessage)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-14 items-center justify-center gap-3 border border-rose-light/70 px-8 text-base font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-rose-light hover:text-ink"
          >
            <BrandIcon name="whatsapp" className="size-5" />
            {t.common.whatsapp}
          </a>
        </div>
      </div>
    </section>
  );
}
