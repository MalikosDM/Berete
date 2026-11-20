import { useState } from "react";
import { Play, ZoomIn } from "lucide-react";
import { Lightbox } from "@/components/HorizontalGallery";
import { MediaView } from "@/components/Media";
import type { MediaItem } from "@/data/types";
import { useI18n } from "@/i18n";

/** How many photos the grid shows before "See N more". */
const FIRST = 12;

/**
 * "Every Angle": every other photo and film of a piece, under its gallery (src/components/HorizontalGallery.tsx shows the
 * first ones), in a grid: 2 columns on a phone, 4 on a computer. Each photo loads as the visitor comes near it, in the
 * smallest copy that stays sharp; a film plays silently only while it is on screen. A click opens it full screen, among
 * all the photos of the piece (`all`, from `start`).
 */
export default function GalleryGrid({ all, start }: { all: MediaItem[]; start: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const items = all.slice(start);
  if (items.length === 0) return null;
  const shown = expanded ? items : items.slice(0, FIRST);
  const hidden = items.length - shown.length;

  return (
    <section aria-labelledby="every-angle" data-gallery-grid className="mx-auto max-w-[1600px] px-5 pb-24 sm:px-8 lg:px-12 lg:pb-32">
      <h2 id="every-angle" className="title-caps border-t border-white/10 pt-16 text-[clamp(1.75rem,4vw,3rem)] tracking-[0.14em]">
        {t.gallery.everyAngle}
      </h2>
      <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        {shown.map((item, k) => (
          <li key={item.src + k} data-gallery-tile={item.type}>
            <button
              type="button"
              onClick={() => setOpen(start + k)}
              className="group relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-white/[0.03]"
              aria-label={t.gallery.open(item.alt ?? item.caption ?? t.gallery.photo)}
            >
              <span className="absolute inset-0 transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]">
                <MediaView item={item} sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw" />
              </span>
              {item.type === "video" ? (
                <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-ink/60 px-3 py-1 text-sm text-white">
                  <Play className="size-3.5 fill-current" aria-hidden="true" /> {t.gallery.film}
                </span>
              ) : null}
              <span className="absolute end-3 bottom-3 hidden size-11 items-center justify-center rounded-full border border-white/30 bg-ink/60 text-white opacity-0 transition-opacity group-hover:opacity-100 lg:inline-flex">
                <ZoomIn className="size-5" aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            data-gallery-more
            className="inline-flex min-h-14 items-center justify-center border border-rose-light/70 px-8 text-base font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light"
          >
            {t.gallery.more(hidden)}
          </button>
        </div>
      ) : null}
      {open !== null ? <Lightbox items={all} index={open} onIndex={setOpen} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}
