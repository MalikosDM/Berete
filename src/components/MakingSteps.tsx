import { useState } from "react";
import { createPortal } from "react-dom";
import { ZoomIn } from "lucide-react";
import { Lightbox } from "@/components/HorizontalGallery";
import { MediaView } from "@/components/Media";
import Reveal from "@/components/Reveal";
import { makingSteps } from "@/data/making";
import type { MakingStep, MediaItem, Piece } from "@/data/types";
import { useI18n } from "@/i18n";

/**
 * "The Making of a Masterpiece": only the real steps of a piece (src/data/making.ts), each with its own photo or film; a step
 * without one is left out, a piece without any shows nothing. Since 24/11/2026 (Yoni: no making-of on the pages of the
 * pieces) it lives in The Atelier, with the making-of film of the piece (src/pages/Atelier.tsx, /atelier?piece=<slug>). The
 * photos of the steps open full screen.
 */
export default function MakingSteps({ piece, boxImage, title, id = "making-title" }: { piece: Piece; boxImage?: MediaItem; title?: string; id?: string }) {
  const { t } = useI18n();
  const STEPS: Record<MakingStep, { title: string; text: string }> = t.piece.steps;
  const steps = makingSteps(piece, boxImage);
  // Every photo of the steps in the full screen viewer, the second photo of a step right after its first.
  const viewable = steps.flatMap((s) => (s.more ? [s.item, s.more] : [s.item]));
  const indexOf = (item: MediaItem) => viewable.indexOf(item);
  const [open, setOpen] = useState<number | null>(null);
  if (steps.length === 0) return null;
  const count = steps.length;
  // One row up to six cards; more (since 21/11/2026, up to ten steps): two rows.
  const columns = ["lg:grid-cols-3", "lg:grid-cols-3", "lg:grid-cols-3", "lg:grid-cols-3", "lg:grid-cols-4", "lg:grid-cols-5", "lg:grid-cols-6", "lg:grid-cols-4", "lg:grid-cols-4", "lg:grid-cols-5", "lg:grid-cols-5", "lg:grid-cols-6"][Math.min(count, 11)]!;
  return (
    <section aria-labelledby={id} data-making className="border-y border-white/10 py-16 lg:py-20">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <p className="eyebrow">{t.piece.makingEyebrow}</p>
        <h2 id={id} className="title-caps mt-4 t-title tracking-[0.12em]">
          {title ?? t.piece.makingTitle}
        </h2>
      </div>
      <ol className={"no-scrollbar mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 sm:px-8 lg:mx-auto lg:grid lg:max-w-[1600px] lg:gap-6 lg:overflow-visible lg:px-12 " + columns}>
        {steps.map(({ step, item, more }, i) => (
          <li key={step} data-making-step={step} className="w-[72vw] shrink-0 snap-start sm:w-[44vw] lg:w-auto">
            <Reveal delay={i * 0.08} className="relative">
              <button
                type="button"
                onClick={() => setOpen(indexOf(item))}
                // The name read aloud starts with the words shown on the photo ("The first sketch").
                aria-label={(item.caption ? item.caption + " · " : "") + t.gallery.open(item.alt ?? STEPS[step].title)}
                data-making-open={step}
                className="group relative block aspect-[3/4] w-full cursor-zoom-in overflow-hidden border border-white/10 bg-ink-soft text-start"
              >
                {/* Inside its button, the photo is named by the button. */}
                <MediaView item={item} alt="" fit="cover" sizes="(max-width: 639px) 72vw, (max-width: 1023px) 44vw, 20vw" />
                <span className="absolute bottom-3 start-3 bg-ink/75 px-3 py-1 text-base text-bone backdrop-blur-sm">{item.caption ?? t.piece.thisPiece}</span>
                <span className="absolute end-3 bottom-3 inline-flex size-12 items-center justify-center rounded-full border border-white/30 bg-ink/60 text-white transition-colors group-hover:border-rose-light group-hover:text-rose-light">
                  <ZoomIn className="size-5" aria-hidden="true" />
                </span>
              </button>
              {more ? (
                // A second moment of the same step (21/11/2026): a smaller photo in the corner of the first, opened the same way.
                <button
                  type="button"
                  onClick={() => setOpen(indexOf(more))}
                  aria-label={(more.caption ? more.caption + " · " : "") + t.gallery.open(more.alt ?? STEPS[step].title)}
                  data-making-more={step}
                  className="group/more absolute end-3 top-3 block aspect-square w-[38%] cursor-zoom-in overflow-hidden border border-white/40 bg-ink-soft shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-colors hover:border-rose-light"
                >
                  <MediaView item={more} alt="" fit="cover" sizes="(max-width: 639px) 28vw, (max-width: 1023px) 17vw, 8vw" />
                </button>
              ) : null}
              <p className="mt-5 flex items-baseline gap-3">
                <span className="text-rose-gold font-display text-xl">{String(i + 1).padStart(2, "0")}</span>
                <span className="title-caps text-2xl tracking-[0.12em] text-white">{STEPS[step].title}</span>
              </p>
              <p className="mt-3 text-base text-bone">{STEPS[step].text}</p>
            </Reveal>
          </li>
        ))}
        <li aria-hidden="true" className="w-1 shrink-0 lg:hidden" />
      </ol>
      {open !== null ? createPortal(<Lightbox items={viewable} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
    </section>
  );
}
