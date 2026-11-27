import { useEffect, useRef, useState } from "react";
import BrandIcon from "@/components/BrandIcon";
import { viewsOf, type PublicModel } from "@/data/models";
import type { Piece } from "@/data/types";
import { useI18n } from "@/i18n";
import { ScrollTrigger } from "@/lib/gsap";
import { metalsInWords } from "@/lib/models";
import { waLink } from "@/lib/site";
import { Jewel3D, type Selection, type ViewerHandle } from "@/viewer";

/**
 * "Explore in 3D" on the page of a piece, when the jeweller attached a model
 * to it (admin: the piece, or the 3D model). Right under the opening of the
 * page; the viewer itself loads when it comes near the screen. The WhatsApp
 * button names the metals chosen.
 */
export default function Piece3D({ piece, model }: { piece: Piece; model: PublicModel }) {
  const { t, intl } = useI18n();
  // Admin « Voir sur la page de la pièce » (27/11/2026): with ?preview3d=1, on a device that came in by the admin (mark bj_in),
  // the draft of the 3D editor (localStorage "bj-3d-preview:<id>", 30 minutes) replaces the saved settings, on this device only.
  const [draft, setDraft] = useState<PublicModel["settings"] | null>(null);
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("preview3d") || !/(?:^|;\s*)bj_in=1/.test(document.cookie)) return;
    try {
      const kept = JSON.parse(localStorage.getItem("bj-3d-preview:" + model.id) ?? "null") as { settings?: PublicModel["settings"]; expires?: number } | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (kept?.settings && (kept.expires ?? 0) > Date.now()) setDraft(kept.settings);
    } catch {
      // Nothing readable: the saved settings.
    }
  }, [model.id]);
  const shown = draft ? { ...model, settings: draft } : model;
  const [selection, setSelection] = useState<Selection>([]);
  const metals = metalsInWords(selection, t.viewer, intl);
  const section = useRef<HTMLElement>(null);
  // "Seek on Scroll" (26/11/2026): with two saved views or more and the jeweller's choice, the camera follows the
  // scrolling of the page through the views while the viewer crosses the screen.
  const viewer = useRef<ViewerHandle>(null);
  const holder = useRef<HTMLDivElement>(null);
  const views = viewsOf(shown.settings);
  const seekOnScroll = views.seekOnScroll && views.list.length >= 2;
  useEffect(() => {
    const el = holder.current;
    if (!seekOnScroll || !el) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    let frame = 0;
    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const travel = window.innerHeight + r.height;
        const t = Math.min(1, Math.max(0, (window.innerHeight - r.top) / Math.max(1, travel)));
        viewer.current?.seek(t);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [seekOnScroll]);
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
          <h2 id="piece-3d-title" className="title-caps tracking-[0.12em] mt-4 t-title ">{t.viewer.title}</h2>
          <p className="mt-4 max-w-2xl text-base text-bone">{t.viewer.intro}</p>
        </div>
      </div>
      {/* "See it in 3D", at the top of the page, comes here: the viewer whole on the screen, its choices and the WhatsApp button beside it. */}
      <div id="piece-3d-viewer" ref={holder} className="mt-10 scroll-mt-32" data-seek-on-scroll={seekOnScroll || undefined}>
        <Jewel3D
          ref={viewer}
          key={draft ? "draft" : "saved"}
          model={shown}
          words={t.viewer}
          onSelection={setSelection}
          actions={
            <a href={waLink(t.viewer.wantMessage(piece.title, metals))} target="_blank" rel="noreferrer" data-want-3d className="inline-flex min-h-12 w-full items-center justify-center gap-3 border border-rose-light/55 px-5 py-3 text-center text-base font-normal uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-11 lg:text-[0.75rem]">
              <BrandIcon name="whatsapp" className="size-5 shrink-0" /> {t.viewer.want}
            </a>
          }
        />
      </div>
    </section>
  );
}
