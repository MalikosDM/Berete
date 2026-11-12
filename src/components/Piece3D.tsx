import { useEffect, useRef, useState } from "react";
import BrandIcon from "@/components/BrandIcon";
import type { PublicModel } from "@/data/models";
import type { Piece } from "@/data/types";
import { useI18n } from "@/i18n";
import { ScrollTrigger } from "@/lib/gsap";
import { metalsInWords } from "@/lib/models";
import { waLink } from "@/lib/site";
import { Jewel3D, type Selection } from "@/viewer";

/**
 * "Explore in 3D" on the page of a piece, when the jeweller attached a model
 * to it (admin: the piece, or the 3D model). Right under the opening of the
 * page; the viewer itself loads when it comes near the screen. The WhatsApp
 * button names the metals chosen.
 */
export default function Piece3D({ piece, model }: { piece: Piece; model: PublicModel }) {
  const { t, intl } = useI18n();
  const [selection, setSelection] = useState<Selection>([]);
  const metals = metalsInWords(selection, t.viewer, intl);
  const section = useRef<HTMLElement>(null);
  // The section arrives once the page is drawn, and grows when the viewer loads: the scroll animations below it (the
  // pinned gallery of details) are measured again, or they would cover it.
  useEffect(() => {
    const el = section.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    let frame = 0;
    let height = -1;
    const observer = new ResizeObserver(() => {
      if (el.offsetHeight === height) return;
      height = el.offsetHeight;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <section ref={section} id="piece-3d" aria-labelledby="piece-3d-title" data-piece-3d className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">3D</p>
          <h2 id="piece-3d-title" className="title-caps mt-4 text-[clamp(2rem,5vw,4rem)] tracking-[0.12em]">{t.viewer.title}</h2>
          <p className="mt-4 max-w-2xl text-lg text-bone">{t.viewer.intro}</p>
        </div>
      </div>
      {/* "See it in 3D", at the top of the page, comes here: the viewer whole on the screen, its choices and the WhatsApp button beside it. */}
      <div id="piece-3d-viewer" className="mt-10 scroll-mt-24">
        <Jewel3D
          model={model}
          words={t.viewer}
          onSelection={setSelection}
          actions={
            <a href={waLink(t.viewer.wantMessage(piece.title, metals))} target="_blank" rel="noreferrer" data-want-3d className="inline-flex min-h-14 w-full items-center justify-center gap-3 bg-white px-5 py-3 text-center text-base font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-rose-light">
              <BrandIcon name="whatsapp" className="size-5 shrink-0" /> {t.viewer.want}
            </a>
          }
        />
      </div>
    </section>
  );
}
