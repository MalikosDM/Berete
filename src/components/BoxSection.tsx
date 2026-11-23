import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Gift, ZoomIn } from "lucide-react";
import Lightbox from "@/components/Lightbox";
import { MediaView } from "@/components/Media";
import Reveal from "@/components/Reveal";
import { trunkOf } from "@/data/trunks";
import type { Box } from "@/data/types";
import { Link, useI18n } from "@/i18n";

/** Whether a trunk is on the page of the trunks: only those that open in their film (every trunk there opens the same way). */
export const onTrunksPage = (box: Box): boolean => trunkOf(box.slug) !== null;

/**
 * The trunk of a piece, or the trunks of a person (Yoni, 23/11/2026): its name, its words and all its photos, whole (a
 * click opens them full screen); the way to the page of the trunks when it is there, where it opens in its film. A trunk
 * still waiting for its film (the trunks of Keita and of Malik Tillman) is shown here only.
 */
export default function BoxSection({ boxes, title, id }: { boxes: Box[]; title: string; id: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<{ box: number; photo: number } | null>(null);
  const shown = boxes.filter((b) => b.images.length > 0);
  if (shown.length === 0) return null;
  const current = open ? shown[open.box] : undefined;
  return (
    <section aria-labelledby={id} data-box-section className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
      <p className="eyebrow inline-flex items-center gap-2">
        <Gift className="size-5 text-rose-light" aria-hidden="true" /> {t.piece.customBox}
      </p>
      <h2 id={id} className="title-caps mt-4 text-[clamp(1.75rem,4vw,3rem)] tracking-[0.14em]">
        {title}
      </h2>
      {shown.map((box, b) => (
        <div key={box.slug} data-box-block={box.slug} data-custom-box={box.slug} className="mt-10 lg:mt-12">
          {shown.length > 1 || title !== box.name ? <h3 className="title-caps text-2xl tracking-[0.08em] text-white md:text-3xl">{box.name}</h3> : null}
          {box.description ? <p className="mt-3 max-w-3xl text-base text-bone md:text-lg">{box.description}</p> : null}
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {box.images.map((m, i) => (
              <li key={m.src}>
                <Reveal soft>
                  <button
                    type="button"
                    onClick={() => setOpen({ box: b, photo: i })}
                    data-box-section-photo={i}
                    className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden"
                    aria-label={t.gallery.open(m.alt ?? box.name)}
                  >
                    {/* Whole: a trunk is never cut (its artwork, its photograph). */}
                    <MediaView item={m} fit="contain" sizes="(max-width: 1023px) 46vw, 30vw" />
                    <span aria-hidden="true" className="absolute end-2 bottom-2 hidden size-9 items-center justify-center rounded-full bg-ink/70 text-white group-hover:inline-flex">
                      <ZoomIn className="size-4" />
                    </span>
                  </button>
                </Reveal>
              </li>
            ))}
          </ul>
          {onTrunksPage(box) ? (
            <Link to={"/boxes#box-" + box.slug} data-box-section-link={box.slug} className="mt-6 inline-flex min-h-12 items-center gap-2 text-base font-semibold text-white underline-offset-4 hover:text-rose-light hover:underline">
              {t.piece.seeTrunk} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              <span className="sr-only"> · {box.name}</span>
            </Link>
          ) : null}
        </div>
      ))}
      {open && current ? createPortal(<Lightbox items={current.images} index={open.photo} onIndex={(photo) => setOpen({ box: open.box, photo })} onClose={() => setOpen(null)} />, document.body) : null}
    </section>
  );
}
