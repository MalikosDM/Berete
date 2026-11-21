import { useState } from "react";
import { createPortal } from "react-dom";
import { Play, ZoomIn } from "lucide-react";
import { Lightbox } from "@/components/HorizontalGallery";
import { MediaView } from "@/components/Media";
import { angleOf, anglesShownFirst } from "@/data/angles";
import type { MediaItem, Piece } from "@/data/types";
import { useI18n } from "@/i18n";

/**
 * "Every Angle" (feedback of Yoni, 21/11/2026): every photo and film of the piece, each with its text (a small title and
 * one or two sentences: src/data/angles.ts), numbered like the details of the Inter ring. Photo and text side by side, in
 * turn: on a computer two by two, the photos in a checkerboard; on a tablet one by one, left then right; on a phone the
 * photo, then its text. A piece with many photos shows its first ones, then "See N more". Each photo loads as the visitor
 * comes near it; a film plays silently only while it is on screen. A click opens it full screen, among all its photos.
 */
export default function EveryAngle({ piece, items }: { piece: Piece; items: MediaItem[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const shown = expanded ? items : items.slice(0, anglesShownFirst(items.length));
  const hidden = items.length - shown.length;

  return (
    <section aria-labelledby="every-angle" data-every-angle className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <h2 id="every-angle" className="title-caps text-[clamp(2rem,5vw,4rem)] tracking-[0.12em]">
        {t.gallery.everyAngle}
      </h2>
      <ol className="mt-12 grid gap-y-14 border-t border-white/15 pt-12 sm:gap-y-16 lg:mt-14 lg:grid-cols-2 lg:gap-x-14 lg:gap-y-20 lg:pt-16">
        {shown.map((item, k) => {
          const angle = angleOf(piece, item.src);
          const title = angle?.title || item.caption || "";
          const text = angle?.text ?? "";
          // The photo on the left, then on the right: one by one on a tablet, two by two on a computer (a checkerboard).
          const photoSide = (k % 2 === 0 ? "sm:order-1" : "sm:order-2") + " " + (Math.floor(k / 2) % 2 === 0 ? "lg:order-1" : "lg:order-2");
          const textSide = (k % 2 === 0 ? "sm:order-2" : "sm:order-1") + " " + (Math.floor(k / 2) % 2 === 0 ? "lg:order-2" : "lg:order-1");
          const name = item.alt ?? (title ? piece.title + " · " + title : piece.title);
          return (
            <li key={item.src + k} data-angle={k + 1} data-angle-type={item.type} className="grid items-center gap-6 sm:grid-cols-2 sm:gap-8 lg:gap-7 xl:gap-9">
              <button
                type="button"
                onClick={(e) => {
                  // The universe of the piece may answer the opening of a photo (an impact: src/components/Universe.tsx).
                  window.dispatchEvent(new CustomEvent("universe:impact", { detail: { x: e.clientX, y: e.clientY } }));
                  setOpen(k);
                }}
                className={"group relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden " + photoSide}
                aria-label={t.gallery.open(name)}
              >
                <span className="absolute inset-0 transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]">
                  <MediaView item={item} sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 22vw" />
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
              <div className={"min-w-0 [text-shadow:0_1px_18px_rgba(0,0,0,0.85)] " + textSide}>
                <span aria-hidden="true" className="text-rose-gold block font-display text-2xl leading-none">
                  {String(k + 1).padStart(2, "0")}
                </span>
                {title ? (
                  <h3 data-angle-title className="title-caps mt-4 text-xl leading-tight tracking-[0.08em] text-white [text-wrap:balance] sm:text-2xl">
                    {title}
                  </h3>
                ) : null}
                {text ? (
                  <p data-angle-text className="mt-3 text-base leading-relaxed text-bone sm:text-lg">
                    {text}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
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
      {open !== null ? createPortal(<Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
    </section>
  );
}
