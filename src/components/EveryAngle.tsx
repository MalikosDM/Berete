import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play, ZoomIn } from "lucide-react";
import Lightbox from "@/components/Lightbox";
import Loupe, { pickMarked } from "@/components/Loupe";
import { MediaView } from "@/components/Media";
import { angleOf, anglesShownFirst } from "@/data/angles";
import type { MediaItem, Piece } from "@/data/types";
import { useI18n } from "@/i18n";

/**
 * "Every Angle": every photo and film of the piece in a gallery (Yoni, 23/11/2026: no more texts that describe what is
 * already seen). Three on a row on a computer, two on a phone, all in the same frame; under a photo, at most a short caption,
 * only when it teaches something (src/data/angles.ts: its title; the admin "Sous tous les angles"). A piece with many photos
 * shows its first ones, then "See N more". Each photo loads as the visitor comes near it; a film plays silently only while
 * it is on screen. A click opens it full screen with the magnifying glass (src/components/Lightbox.tsx).
 */
export default function EveryAngle({ piece, items }: { piece: Piece; items: MediaItem[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  if (items.length === 0) return null;
  const shown = expanded ? items : items.slice(0, anglesShownFirst(items.length));
  const hidden = items.length - shown.length;
  const captionOf = (item: MediaItem) => angleOf(piece, item.src)?.title.trim() ?? "";
  // Full screen: the same short caption, or none (never the old descriptive one).
  const viewed = items.map((item) => ({ ...item, caption: captionOf(item) || undefined }));

  return (
    <section aria-labelledby="every-angle" data-every-angle className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <h2 id="every-angle" className="title-caps text-[clamp(2rem,5vw,4rem)] tracking-[0.12em]">
        {t.gallery.everyAngle}
      </h2>
      {/* The magnifying glass over its photos (computers; never over a film). */}
      <div ref={zone} className="relative">
      <ol className="mt-10 grid grid-cols-2 gap-x-3 gap-y-6 border-t border-white/15 pt-10 sm:gap-x-5 lg:mt-12 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10 lg:pt-12">
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
                data-loupe={item.type === "image" ? item.src : undefined}
              >
                <span className="absolute inset-0 transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]">
                  <MediaView item={item} sizes="(max-width: 1023px) 46vw, 30vw" />
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
      <Loupe zone={zone} pick={pickMarked} />
      </div>
      {hidden > 0 ? (
        <div className="mt-14 flex justify-center lg:mt-20">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            data-angle-more
            className="inline-flex min-h-14 items-center justify-center border border-rose-light/70 px-8 text-base font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light"
          >
            {t.gallery.more(hidden)}
          </button>
        </div>
      ) : null}
      {open !== null ? createPortal(<Lightbox items={viewed} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
    </section>
  );
}
