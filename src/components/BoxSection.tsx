import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";
import Lightbox from "@/components/Lightbox";
import { MediaView } from "@/components/Media";
import Reveal from "@/components/Reveal";
import { fileBase } from "@/data/pageMedia";
import { onTrunksPage as onPage } from "@/data/trunks";
import type { Box } from "@/data/types";
import { Link, useI18n } from "@/i18n";

/**
 * Whether a trunk is on the page of the trunks: only those that open in their film, in the staging of the page (every trunk
 * there opens the same way: src/data/trunks.ts).
 */
export const onTrunksPage = (box: Box): boolean => onPage(box.slug);

/**
 * The trunk of a piece, or the trunks of a person (Yoni, 23/11/2026): its name, its words and all its photos, whole (a
 * click opens them full screen); the way to the page of the trunks when it is there, where it opens in its film. A trunk
 * still waiting for its film (the trunks of Keita and of Malik Tillman) is shown here only.
 */
export default function BoxSection({ boxes, title, id, first }: { boxes: Box[]; title: string; id: string; first?: string[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<{ box: number; photo: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  // « The Art of Presentation » (Yoni, 26/11/2026): a few photos chosen first (`first`, by file), the others behind See More.
  const ordered = (b: Box) => {
    if (!first) return b.images;
    const chosen = first.map((f) => b.images.find((m) => fileBase(m.src) === f)).filter((m): m is Box["images"][number] => Boolean(m));
    return [...chosen, ...b.images.filter((m) => !chosen.includes(m))];
  };
  const shown = boxes.filter((b) => b.images.length > 0).map((b) => ({ ...b, images: ordered(b) }));
  if (shown.length === 0) return null;
  const current = open ? shown[open.box] : undefined;
  return (
    <section aria-labelledby={id} data-box-section data-piece-section={id === "piece-trunk" ? "trunk" : undefined} className="relative wrap border-t border-white/10 py-14 lg:py-16">
      <h2 id={id} className="title-caps tracking-[0.12em] t-title ">
        {title}
      </h2>
      {shown.map((box, b) => (
        <div key={box.slug} data-box-block={box.slug} data-custom-box={box.slug} className="mt-8">
          {shown.length > 1 || title !== box.name ? <h3 className="title-caps t-sub tracking-[0.1em] text-white">{box.name}</h3> : null}
          {box.description ? <p className="mt-3 max-w-3xl text-base text-bone">{box.description}</p> : null}
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {(first && !expanded ? box.images.slice(0, first.length) : box.images).map((m, i) => (
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
                    <MediaView item={m} fit="contain" sizes="(max-width: 1023px) 46vw, 18rem" />
                  </button>
                </Reveal>
              </li>
            ))}
          </ul>
          {first && !expanded && box.images.length > first.length ? (
            <div className="mt-8 flex justify-center">
              <button type="button" onClick={() => setExpanded(true)} data-box-more data-cta className="btn-primary">
                {t.gallery.more(box.images.length - first.length)}
              </button>
            </div>
          ) : null}
          {onTrunksPage(box) || first ? (
            <Link to={onTrunksPage(box) ? "/boxes#box-" + box.slug : "/boxes"} data-box-section-link={box.slug} data-cta className="btn-secondary mt-6">
              {t.nav.boxes} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
              <span className="sr-only"> · {box.name}</span>
            </Link>
          ) : null}
        </div>
      ))}
      {open && current ? createPortal(<Lightbox items={current.images} index={open.photo} onIndex={(photo) => setOpen({ box: open.box, photo })} onClose={() => setOpen(null)} />, document.body) : null}
    </section>
  );
}
