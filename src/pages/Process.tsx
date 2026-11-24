import { ArrowRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { MediaView } from "@/components/Media";
import { media } from "@/data/catalogue";
import pages from "@/data/pages.generated.json" with { type: "json" };
import stills from "@/data/mechanisms.generated.json" with { type: "json" };
import { trunkPhotos } from "@/data/trunks";
import type { MediaItem } from "@/data/types";
import { Link, useI18n, type Messages } from "@/i18n";
import { HAS_SERVER, waLink } from "@/lib/site";
import { useWhatsAppMessage } from "@/lib/whatsapp";

/* The words of each step are in src/i18n (process.steps), with what is paid by then. */
function stepsOf(t: Messages) {
  return t.process.steps.map((words, i) => ({ n: i + 1, ...words }));
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const picture = (key: keyof typeof pages): MediaItem | null => {
  const p = pages[key] as { src?: string; width?: number; height?: number } | undefined;
  return p?.src ? { type: "image", src: p.src, width: p.width, height: p.height } : null;
};
const trunk = (slug: string, i: number): MediaItem | null => {
  const p = trunkPhotos(slug)[i];
  return p ? { type: "image", ...p } : null;
};

/**
 * The real images of the four steps at the top: the sketch, the design in 3D, the atelier, the trunk; and those of the six
 * steps of the timeline, never the same photo twice on the page (Yoni, 24/11/2026).
 */
const QUICK_IMAGES: (MediaItem | null)[] = [
  media.sketches?.["campione-d-italia-2023-2024"] ?? null,
  picture("journey-cad"),
  media.groups["atelier"]?.[2] ?? null,
  trunk("dragon-ball-trunk", 2),
];
const TIMELINE_IMAGES: (MediaItem | null)[] = [
  picture("journey-consultation"),
  media.sketches?.["vfb-stuttgart-dfb-pokal-2025"] ?? media.sketches?.["malik-tillman-cross-pendant"] ?? null,
  stills["journey-design"] ? { type: "image", src: stills["journey-design"].image, width: stills["journey-design"].width, height: stills["journey-design"].height } : null,
  media.groups["atelier"]?.[0] ?? null,
  picture("journey-shoot"),
  trunk("sirius", 1) ?? trunk("tulips-on-tour", 1),
];

/**
 * The journey understood in five seconds (Yoni, 23/11/2026; 24/11/2026: everything much smaller, the images illustrate,
 * they never fill the screen; the top of the page held in one screen of a laptop): four steps, each a real image and one
 * line; then the two questions every client asks: how to order, how long it takes.
 */
function Journey() {
  const { t } = useI18n();
  const waMessage = useWhatsAppMessage();
  return (
    <section aria-labelledby="journey-title" data-journey className="bg-ink pt-24 pb-10 desk:pt-28 lg:pb-12">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-12">
        <h1 id="journey-title" className="title-caps t-hero tracking-[0.14em] text-white">{t.process.title}</h1>
        <p className="mt-3 max-w-2xl text-base text-bone lg:text-[0.9375rem]">{t.process.quick.lead}</p>
        <ol className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
          {t.process.quick.steps.map((step, i) => {
            const image = QUICK_IMAGES[i];
            return (
              <li key={step.title} data-journey-step={i + 1}>
                <div className="relative aspect-[3/2] overflow-hidden border border-white/10 bg-ink-soft">
                  {image ? <MediaView item={image} alt={step.title} fit="cover" sizes="(max-width: 1023px) 46vw, 18rem" /> : null}
                  <span aria-hidden="true" className="absolute start-0 top-0 bg-ink/80 px-2 py-0.5 font-display text-base text-rose-light">{pad(i + 1)}</span>
                </div>
                <h2 className="title-caps mt-2.5 text-base leading-snug tracking-[0.1em] text-white lg:text-[0.9375rem]">{step.title}</h2>
                <p className="mt-1 text-base leading-snug text-bone lg:text-[0.875rem]">{step.text}</p>
              </li>
            );
          })}
        </ol>
        <dl className="mt-6 grid gap-px border border-white/10 bg-white/10 md:grid-cols-2">
          <div data-journey-order className="bg-ink p-5">
            <dt className="title-caps text-base tracking-[0.12em] text-rose-light">{t.process.quick.orderQ}</dt>
            <dd className="mt-2 text-base leading-relaxed text-bone lg:text-[0.875rem]">{t.process.quick.orderA}</dd>
            <dd className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <a href={waLink(waMessage)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 bg-white px-5 text-base font-medium text-ink transition-colors hover:bg-rose-light lg:min-h-10 lg:text-[0.8125rem]">
                <BrandIcon name="whatsapp" className="size-4" /> {t.common.whatsapp}
              </a>
              <Link to="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/35 px-5 text-base font-normal text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-10 lg:text-[0.8125rem]">
                {t.nav.contact} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </dd>
          </div>
          <div data-journey-time className="bg-ink p-5">
            <dt className="title-caps text-base tracking-[0.12em] text-rose-light">{t.process.quick.timeQ}</dt>
            <dd className="mt-2 text-base leading-relaxed text-bone lg:text-[0.875rem]">{t.process.quick.timeA}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

export default function Process() {
  const { t } = useI18n();
  return (
    <>
      <Journey />
      <Timeline steps={stepsOf(t)} />
      <Closing />
    </>
  );
}

/**
 * The six steps (Yoni, 24/11/2026: no more film moved by the scroll here — out of context; its files are kept): a simple
 * timeline, joined by a fine vertical line; for each, a small image, its number, its title, one or two lines, what is paid.
 * With the server, the client space at step 02 and step 04 (not on the version without it).
 */
function Timeline({ steps }: { steps: ReturnType<typeof stepsOf> }) {
  const { t } = useI18n();
  return (
    <section aria-labelledby="steps-title" data-timeline className="bg-ink pt-10 pb-16 lg:pt-12 lg:pb-20">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-12">
        <div className="rule-rose mb-10" aria-hidden="true" />
        <p className="eyebrow">{t.process.clear}</p>
        <h2 id="steps-title" className="title-caps mt-3 t-title tracking-[0.14em]">
          {t.process.overviewTitle}
        </h2>
        <p className="mt-3 max-w-2xl text-base text-bone lg:text-[0.9375rem]">{t.process.overviewText}</p>
        <ol className="relative mt-10 max-w-3xl">
          {/* The fine line that joins the steps. */}
          <span aria-hidden="true" className="absolute top-2 bottom-2 start-[0.6875rem] w-px bg-white/15" />
          {steps.map((s, i) => {
            const image = TIMELINE_IMAGES[i];
            const text = i === 3 && HAS_SERVER ? t.process.liveWithSpace : s.text;
            return (
              <li key={s.n} data-timeline-step={s.n} className="relative grid grid-cols-[1.375rem_1fr] gap-x-5 pb-10 last:pb-0 sm:gap-x-7">
                <span aria-hidden="true" className="relative z-10 mt-1.5 flex size-[1.375rem] items-center justify-center rounded-full border border-rose-light/70 bg-ink">
                  <span className="bg-rose-gold block size-1.5 rounded-full" />
                </span>
                <div className="grid gap-4 sm:grid-cols-[9rem_1fr] sm:gap-6 lg:grid-cols-[11rem_1fr]">
                  <div className="relative aspect-[4/3] w-36 overflow-hidden border border-white/10 bg-ink-soft sm:w-full">
                    {image ? <MediaView item={image} alt={s.title} fit="cover" sizes="11rem" /> : null}
                  </div>
                  <div>
                    <p className="flex items-baseline gap-3">
                      <span className="text-rose-gold font-display text-xl leading-none">{pad(s.n)}</span>
                      <span className="title-caps t-sub tracking-[0.1em] text-white">{s.title}</span>
                    </p>
                    <p className="mt-2 text-base leading-relaxed text-bone lg:text-[0.9375rem]">{text}</p>
                    {i === 1 && HAS_SERVER ? <p data-timeline-space className="mt-1.5 text-base leading-relaxed text-bone lg:text-[0.9375rem]">{t.process.spaceAfterDeposit}</p> : null}
                    <p className="mt-2 flex items-center gap-3 text-base text-rose-light lg:text-[0.875rem]">
                      <span className="inline-block h-px w-6 bg-rose-light" aria-hidden="true" />
                      {s.payNote}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function Closing() {
  const { t } = useI18n();
  const waMessage = useWhatsAppMessage();
  return (
    <section aria-labelledby="process-cta" className="bg-ink pb-20 lg:pb-28">
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <p className="eyebrow">{t.process.closingEyebrow}</p>
        <h2 id="process-cta" className="title-caps mt-6 t-title tracking-[0.14em]">
          {t.common.yourStory}
        </h2>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            to="/contact"
            className="inline-flex min-h-12 items-center justify-center gap-3 bg-white px-6 text-base font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light lg:min-h-11 lg:text-[0.8125rem]"
          >
            {t.common.startPiece}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
          <a
            href={waLink(waMessage)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-3 border border-rose-light/70 px-6 text-base font-normal uppercase tracking-[0.16em] text-white transition-colors hover:bg-rose-light hover:text-ink lg:min-h-11 lg:text-[0.8125rem]"
          >
            <BrandIcon name="whatsapp" className="size-5" />
            {t.common.whatsapp}
          </a>
        </div>
      </div>
    </section>
  );
}
