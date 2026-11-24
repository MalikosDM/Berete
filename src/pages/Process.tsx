
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
const TIMELINE_IMAGES: (MediaItem | null)[] = [
  picture("journey-consultation"),
  media.sketches?.["vfb-stuttgart-dfb-pokal-2025"] ?? media.sketches?.["malik-tillman-cross-pendant"] ?? null,
  stills["journey-design"] ? { type: "image", src: stills["journey-design"].image, width: stills["journey-design"].width, height: stills["journey-design"].height } : null,
  media.groups["atelier"]?.[0] ?? null,
  picture("journey-shoot"),
  trunk("sirius", 1) ?? trunk("tulips-on-tour", 1),
];
/**
 * Where each small image leads, to see more of it (Yoni, 24/11/2026: "ceux qui veulent voir ces images iront dans l'Atelier,
 * dans les Signature Trunks…"): the sketch and the design, the making in The Atelier; the shoot in The Creations; the handover
 * in Signature Trunks. The consultation has no page of its own.
 */
const TIMELINE_LINKS: (string | null)[] = [null, "/atelier", "/atelier", "/atelier", "/creations", "/boxes"];

/**
 * The Bespoke Journey (Yoni, 24/11/2026): its name and one sentence, the six steps on a fine line (each with its image, its
 * number, its title, one line and what is paid by then), then how to order and how long it takes. One version of the payment
 * and of the time everywhere: the design deposit starts the design; 50% of production at the approval of the design; the
 * balance before the handover; around ten weeks on average.
 */
export default function Process() {
  const { t } = useI18n();
  return (
    <>
      <section aria-labelledby="journey-title" data-journey className="bg-ink pt-24 pb-4 desk:pt-28">
        <div className="wrap">
        <h1 id="journey-title" className="title-caps tracking-[0.12em] t-hero text-white">{t.process.title}</h1>
          <p className="mt-3 max-w-2xl text-base text-bone lg:text-[1rem]">{t.process.quick.lead}</p>
        </div>
      </section>
      <Timeline steps={stepsOf(t)} />
      <Questions />
      <Closing />
    </>
  );
}

function Timeline({ steps }: { steps: ReturnType<typeof stepsOf> }) {
  const { t } = useI18n();
  return (
    <section aria-label={t.process.overviewTitle} data-timeline className="bg-ink pt-8 pb-14 lg:pt-10 lg:pb-16">
      <div className="wrap">
        <ol className="relative max-w-3xl">
          {/* The fine line that joins the steps. */}
          <span aria-hidden="true" className="absolute top-2 bottom-2 start-[0.6875rem] w-px bg-white/15" />
          {steps.map((s, i) => {
            const image = TIMELINE_IMAGES[i];
            const to = TIMELINE_LINKS[i];
            const text = i === 3 && HAS_SERVER ? t.process.liveWithSpace : s.text;
            const frame = image ? <MediaView item={image} alt={s.title} fit="cover" sizes="11rem" /> : null;
            return (
              <li key={s.n} data-timeline-step={s.n} className="relative grid grid-cols-[1.375rem_1fr] gap-x-5 pb-10 last:pb-0 sm:gap-x-7">
                <span aria-hidden="true" className="relative z-10 mt-1.5 flex size-[1.375rem] items-center justify-center rounded-full border border-rose-light/70 bg-ink">
                  <span className="bg-rose-gold block size-1.5 rounded-full" />
                </span>
                <div className="grid gap-4 sm:grid-cols-[9rem_1fr] sm:gap-6 lg:grid-cols-[11rem_1fr]">
                  {to ? (
                    <Link to={to} data-timeline-link={to} aria-label={s.title} className="relative block aspect-[4/3] w-36 overflow-hidden border border-white/10 bg-ink-soft transition-opacity duration-500 hover:opacity-85 sm:w-full">
                      {frame}
                    </Link>
                  ) : (
                    <div className="relative aspect-[4/3] w-36 overflow-hidden border border-white/10 bg-ink-soft sm:w-full">{frame}</div>
                  )}
                  <div>
                    <h2 className="flex items-baseline gap-3">
                      <span className="text-rose-gold font-display text-xl leading-none">{pad(s.n)}</span>
                      <span className="title-caps t-sub tracking-[0.1em] text-white">{s.title}</span>
                    </h2>
                    <p className="mt-2 text-base leading-relaxed text-bone">{text}</p>
                    {i === 1 && HAS_SERVER ? <p data-timeline-space className="mt-1.5 text-base leading-relaxed text-bone">{t.process.spaceAfterDeposit}</p> : null}
                    <p className="mt-2 flex items-center gap-3 text-base text-rose-light">
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

/** How to order, how long it takes: one answer each, the same everywhere. */
function Questions() {
  const { t } = useI18n();
  return (
    <section aria-label={t.process.quick.orderQ} data-journey-questions className="bg-ink pb-14 lg:pb-16">
      <div className="wrap">
        <dl className="grid max-w-5xl gap-px border border-white/10 bg-white/10 md:grid-cols-2">
          <div data-journey-order className="bg-ink p-6">
            <dt className="title-caps t-sub tracking-[0.1em] text-white">{t.process.quick.orderQ}</dt>
            <dd className="mt-2 text-base leading-relaxed text-bone">{t.process.quick.orderA}</dd>
          </div>
          <div data-journey-time className="bg-ink p-6">
            <dt className="title-caps t-sub tracking-[0.1em] text-white">{t.process.quick.timeQ}</dt>
            <dd className="mt-2 text-base leading-relaxed text-bone">{t.process.quick.timeA}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function Closing() {
  const { t } = useI18n();
  const waMessage = useWhatsAppMessage();
  return (
    <section aria-labelledby="process-cta" className="border-t border-white/10 bg-ink">
      <div className="wrap flex flex-col items-center py-20 text-center lg:py-24">
        <h2 id="process-cta" className="title-caps tracking-[0.12em] t-title ">
          {t.common.yourStory}
        </h2>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-x-8">
          <Link to="/contact" data-cta className="btn-primary">
            {t.common.startPiece}
          </Link>
          <a href={waLink(waMessage)} target="_blank" rel="noreferrer" data-cta className="btn-secondary">
            <BrandIcon name="whatsapp" className="size-4" />
            {t.common.whatsapp}
          </a>
        </div>
      </div>
    </section>
  );
}
