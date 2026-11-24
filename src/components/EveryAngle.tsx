import { useState } from "react";
import { createPortal } from "react-dom";
import { Play, ZoomIn } from "lucide-react";
import Lightbox from "@/components/Lightbox";
import { MediaView } from "@/components/Media";
import { angleOf } from "@/data/angles";
import type { MediaItem, Piece } from "@/data/types";
import { useI18n } from "@/i18n";

/** The photos shown before "See more": one row on a computer, two by two on a phone (Yoni, 24/11/2026). */
const FIRST = 4;

/**
 * The strongest photos first (Yoni, 24/11/2026): the whole piece seen from the front, on black — the photos on black in the
 * order of the gallery (its best first), then the other photos, the films last; the rest after them, in its order.
 */
export function strongestFirst(given: MediaItem[]): MediaItem[] {
  // Never the same photo twice.
  const items = given.filter((m, i) => m.src && given.findIndex((x) => x.src === m.src) === i);
  const rank = (m: MediaItem) => (m.type === "video" ? 2 : m.onBlack === false ? 1 : 0);
  const first = [...items].map((m, i) => ({ m, i })).sort((a, b) => rank(a.m) - rank(b.m) || a.i - b.i).slice(0, FIRST).map((x) => x.m);
  return [...first, ...items.filter((m) => !first.includes(m))];
}

/**
 * "Every Angle": every photo and film of the piece in a gallery (Yoni, 23/11/2026: no more texts that describe what is
 * already seen; 24/11/2026: one row of four on a computer, two by two on a phone, smaller, the four strongest first, then
 * "See more" for the others). Under a photo, at most a short caption, only when it teaches something (src/data/angles.ts: its
 * title; the admin "Sous tous les angles"). Each photo loads as the visitor comes near it; a film plays silently only while
 * it is on screen. A click opens it full screen, where the magnifying glass lives (src/components/Lightbox.tsx).
 */
export default function EveryAngle({ piece, items: given }: { piece: Piece; items: MediaItem[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  if (given.length === 0) return null;
  const items = strongestFirst(given);
  const shown = expanded ? items : items.slice(0, FIRST);
  const hidden = items.length - shown.length;
  const captionOf = (item: MediaItem) => angleOf(piece, item.src)?.title.trim() ?? "";
  // Full screen: the same short caption, or none (never the old descriptive one).
  const viewed = items.map((item) => ({ ...item, caption: captionOf(item) || undefined }));

  return (
    <section aria-labelledby="every-angle" data-every-angle data-piece-section="angles" className="wrap py-16 lg:py-20">
      <h2 id="every-angle" className="title-caps tracking-[0.12em] t-title ">
        {t.gallery.everyAngle}
      </h2>
      <ol className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 lg:mt-10 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-8">
        {shown.map((item, k) => {
          const caption = captionOf(item);
          const name = item.alt ?? (caption ? piece.title + " · " + caption : piece.title);
          return (
            <li key={item.src + k} data-angle={k + 1} data-angle-type={item.type} className="min-w-0">
              <button
                type="button"
                onClick={(e) => {
                  // The universe of the piece may answer the opening of a photo (an impact: src/components/Universe.tsx).
                  window.dispatchEvent(new CustomEvent("universe:impact", { detail: { x: e.clientX, y: e.clientY } }));
                  setOpen(k);
                }}
                className="group relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-ink"
                aria-label={t.gallery.open(name)}
              >
                <span className="absolute inset-0 transition-opacity duration-700 group-hover:opacity-90">
                  <MediaView item={item} alt={name} sizes="(max-width: 1023px) 46vw, 18rem" />
                </span>
                {item.type === "video" ? (
                  <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-ink/60 px-3 py-1 text-sm text-white">
                    <Play className="size-3.5 fill-current" aria-hidden="true" /> {t.gallery.film}
                  </span>
                ) : null}
                {/* A film opens full screen; a photo has the magnifying glass (its + and − at this corner). */}
                {item.type === "video" ? (
                  <span className="absolute end-3 bottom-3 hidden size-11 items-center justify-center rounded-full border border-white/30 bg-ink/60 text-white opacity-0 transition-opacity group-hover:opacity-100 lg:inline-flex">
                    <ZoomIn className="size-5" aria-hidden="true" />
                  </span>
                ) : null}
              </button>
              {caption ? (
                <p data-angle-title className="mt-3 text-base leading-snug text-bone [text-shadow:0_1px_18px_rgba(0,0,0,0.85)]">
                  {caption}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      {hidden > 0 ? (
        <div className="mt-8 flex justify-center lg:mt-10">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            data-angle-more
            data-cta
            className="btn-primary"
          >
            {t.gallery.more(hidden)}
          </button>
        </div>
      ) : null}
      {open !== null ? createPortal(<Lightbox items={viewed} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
    </section>
  );
}
