import { useState } from "react";
import { createPortal } from "react-dom";
import { Play, ZoomIn } from "lucide-react";
import Lightbox from "@/components/Lightbox";
import { MediaView } from "@/components/Media";
import { strongestFirst } from "@/components/EveryAngle";
import { angleOf, ownCaption } from "@/data/angles";
import { pointsFor } from "@/data/details3d";
import { magazineOf } from "@/data/magazine";
import type { PublicModel } from "@/data/models";
import type { MediaItem, Piece } from "@/data/types";
import { useI18n } from "@/i18n";
import { Detail3D, type DetailMark } from "@/viewer";

/**
 * The photos of a piece as in a magazine (Yoni, 25/11/2026), from the whole to the detail: "Every Angle", its four photos of
 * the whole piece; "The Art of Detail", at most five photos of its details, each small with the sentence of the house that it
 * shows beside it, the photo and the text changing sides from one to the next (src/data/magazine.ts); then "See more" for the
 * others. Every photo opens full screen, where the magnifying glass lives (src/components/Lightbox.tsx).
 */
export default function MagazineGallery({
  piece,
  english,
  items: given,
  ordered,
  model,
  sameViews,
  extra = [],
  part = "both",
}: {
  piece: Piece;
  english?: Piece;
  items: MediaItem[];
  ordered: boolean;
  model: PublicModel | null;
  sameViews: string[][];
  /** Photos it may still show beside a detail or first in Every Angle (its opening, a photo of its chain): src/data/magazine.ts. */
  extra?: MediaItem[];
  /** Its two sections may stand apart on the page (Yoni's order of 26-27/11/2026): "angles", "details", or both together. */
  part?: "angles" | "details" | "both";
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const items = ordered ? given : strongestFirst(given);
  const mag = magazineOf(piece, english, items, { lang: locale, ordered, sameViews, extra });
  const all = [...mag.overview, ...mag.blocks.map((b) => b.item), ...mag.rest];
  if (all.length === 0) return null;
  // Only the captions Yoni wrote in the admin are shown (under the photo and full screen); the others stay in the alt texts.
  const captionShown = (item: MediaItem) => (ownCaption(english, item.src) ? (angleOf(piece, item.src)?.title.trim() ?? "") : "");
  const viewed = all.map((item) => ({ ...item, caption: captionShown(item) || undefined }));
  const nameOf = (item: MediaItem) => {
    const caption = angleOf(piece, item.src)?.title.trim() ?? "";
    return item.alt ?? (caption ? piece.title + " · " + caption : piece.title);
  };
  const show = (item: MediaItem, e?: { clientX: number; clientY: number }) => {
    // The universe of the piece may answer the opening of a photo (an impact: src/components/Universe.tsx).
    if (e) window.dispatchEvent(new CustomEvent("universe:impact", { detail: { x: e.clientX, y: e.clientY } }));
    setOpen(all.indexOf(item));
  };
  // The details not told beside a photo (the Inter ring): listed after the photos of the details.
  const leftDetails = piece.details.map((d, i) => ({ d, i })).filter(({ i }) => !mag.usedDetails.has(i));
  const marks: DetailMark[] = model && piece.details.length > 0 ? pointsFor(piece.detailPoints, model.id, piece.details.length).map((p) => ({ n: p.detail + 1, title: piece.details[p.detail]!.title, at: p.at })) : [];
  const hasDetails = mag.blocks.length > 0 || leftDetails.length > 0 || marks.length > 0;
  const more = mag.rest.length > 0 ? (
    <div className="mt-10 lg:mt-12">
      {expanded ? (
        <Grid items={mag.rest} first={mag.overview.length + mag.blocks.length + 1} onOpen={show} nameOf={nameOf} captionOf={captionShown} rest />
      ) : (
        <div className="flex justify-center">
          <button type="button" onClick={() => setExpanded(true)} data-angle-more data-cta className="btn-primary">
            {t.gallery.more(mag.rest.length)}
          </button>
        </div>
      )}
    </div>
  ) : null;

  // See More right under the four photos of Every Angle (Yoni, 26/11/2026); a page without Every Angle: after its details.
  const showAngles = part !== "details" && mag.overview.length > 0;
  const showDetails = part !== "angles" && hasDetails;
  const moreInAngles = mag.overview.length > 0;
  return (
    <>
      {showAngles ? (
        <section aria-labelledby="every-angle" data-every-angle data-piece-section="angles" className="wrap py-16 lg:py-20">
          <h2 id="every-angle" className="title-caps tracking-[0.12em] t-title ">
            {t.gallery.everyAngle}
          </h2>
          <Grid items={mag.overview} first={1} onOpen={show} nameOf={nameOf} captionOf={captionShown} />
          {more}
        </section>
      ) : null}
      {showDetails ? (
        <section aria-labelledby="details-title" data-magazine data-details={piece.details.length > 0 ? "" : undefined} data-piece-section="details" className="wrap border-t border-white/10 py-16 lg:py-20">
          <h2 id="details-title" className="title-caps tracking-[0.12em] t-title ">
            {t.piece.details}
          </h2>
          {marks.length > 0 && model ? (
            <div className="mt-10" data-details-3d>
              <Detail3D model={model} marks={marks} words={t.viewer} className="h-[62svh] max-h-[760px] min-h-[340px] border border-white/10 lg:h-[72svh]" />
              <p className="mt-4 text-base text-mist">
                <span className="[@media(pointer:coarse)]:hidden">{t.viewer.detailHint}</span>
                <span className="hidden [@media(pointer:coarse)]:inline">{t.viewer.detailHintTouch}</span>
              </p>
            </div>
          ) : null}
          {mag.blocks.length > 0 ? (
            <ol className="mt-10 flex flex-col gap-10 lg:mt-12 lg:gap-12">
              {mag.blocks.map((b, i) => {
                // The photo against the edge of the page and its sentence right beside it (the air on the other side): the photo
                // on the left first, right under the title, then on the right (26/11/2026: the text first left the top left of
                // the section empty, and each text floated far from its photo). On a phone, the photo on the left then on the right.
                const flip = i % 2 === 1;
                // The close-ups a little larger, the words larger, more air between them (Yoni, 26/11/2026); the strongest moment
                // (the mechanism of the Inter ring) larger still.
                // (27/11/2026: the close-ups larger again, the words centred on their height, less air between the blocks.)
                const photoCols = b.big ? "sm:col-span-7 lg:col-span-7 " : "sm:col-span-6 lg:col-span-6 ";
                return (
                  <li key={b.item.src} data-magazine-block={i + 1} data-big={b.big ? "" : undefined} data-angle={mag.overview.length + i + 1} className="grid items-center gap-6 sm:grid-cols-12 sm:gap-10 lg:gap-12">
                    <button
                      type="button"
                      onClick={(e) => show(b.item, e)}
                      data-magazine-photo
                      className={"group relative block aspect-[4/5] cursor-zoom-in overflow-hidden bg-ink sm:w-full " + (b.big ? "w-full " : "w-3/4 ") + photoCols + (flip ? "justify-self-end sm:order-2 " + (b.big ? "sm:col-start-6" : "sm:col-start-7") : "sm:order-1 sm:col-start-1")}
                      aria-label={t.gallery.open(nameOf(b.item))}
                    >
                      <span className="absolute inset-0 transition-opacity duration-700 group-hover:opacity-90">
                        <MediaView item={b.item} alt={nameOf(b.item)} fit={b.item.onBlack !== false ? "contain" : "cover"} sizes={b.big ? "(max-width: 639px) 92vw, (max-width: 1023px) 56vw, 44rem" : "(max-width: 639px) 75vw, (max-width: 1023px) 48vw, 38rem"} frame={4 / 5} />
                      </span>
                      <span className="absolute end-3 bottom-3 hidden size-10 items-center justify-center rounded-full border border-white/30 bg-ink/60 text-white opacity-0 transition-opacity group-hover:opacity-100 lg:inline-flex">
                        <ZoomIn className="size-4" aria-hidden="true" />
                      </span>
                    </button>
                    <div data-magazine-text className={"self-center " + (b.big ? "sm:col-span-5 " : "sm:col-span-6 lg:col-span-5 ") + (flip ? "sm:order-1 sm:col-start-1 sm:justify-self-end " + (b.big ? "" : "lg:col-start-2") : "sm:order-2 " + (b.big ? "sm:col-start-8" : "sm:col-start-7 lg:col-start-8"))}>
                      {b.texts.map((x, k) => (
                        <div key={k} className={k > 0 ? "mt-6" : ""}>
                          {x.title ? <h3 className="title-caps t-sub leading-tight tracking-[0.08em] text-white">{x.title}</h3> : null}
                          <p className={"piece-text whitespace-pre-line " + (x.title ? "mt-3" : "")}>{x.text}</p>
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : null}
          {/* The details not told beside a photo; one shown by a photo opens it full screen from its title. */}
          {leftDetails.length > 0 ? (
            <ul className="mt-12 grid gap-x-10 gap-y-8 border-t border-white/12 pt-9 md:grid-cols-2 xl:grid-cols-3">
              {leftDetails.map(({ d, i }) => {
                const shown = d.photo ? all.find((m) => m.src === d.photo) : undefined;
                return (
                  <li key={d.title + i} data-detail={i + 1}>
                    {shown ? (
                      <button type="button" data-detail-photo onClick={() => show(shown)} aria-label={t.gallery.open(d.title)} className="group flex items-start gap-2 text-start">
                        <span className="title-caps t-sub leading-tight tracking-[0.08em] text-white transition-colors group-hover:text-rose-light">{d.title}</span>
                        <ZoomIn className="mt-0.5 size-4 shrink-0 text-rose-light" aria-hidden="true" />
                      </button>
                    ) : (
                      <h3 className="title-caps t-sub leading-tight tracking-[0.08em] text-white">{d.title}</h3>
                    )}
                    <p className="mt-2 text-base text-bone">{d.text}</p>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {moreInAngles ? null : more}
        </section>
      ) : null}
      {open !== null ? createPortal(<Lightbox items={viewed} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
    </>
  );
}

/** A row of four on a computer, two by two on a phone; a film plays silently only while it is on screen. */
function Grid({ items, first, onOpen, nameOf, captionOf, rest = false }: { items: MediaItem[]; first: number; onOpen: (m: MediaItem, e: { clientX: number; clientY: number }) => void; nameOf: (m: MediaItem) => string; captionOf: (m: MediaItem) => string; rest?: boolean }) {
  const { t } = useI18n();
  return (
    // Fewer than four photos of the whole: as many columns as photos, never an empty place.
    <ol data-angle-rest={rest ? "" : undefined} className={"grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 lg:gap-x-5 lg:gap-y-8 " + (rest || items.length >= 4 ? "lg:grid-cols-4 " : items.length === 3 ? "lg:grid-cols-3 " : "lg:grid-cols-2 ") + (rest ? "" : "mt-8 lg:mt-10")}>
      {items.map((item, k) => (
        <li key={item.src} data-angle={first + k} data-angle-type={item.type} className="min-w-0">
          <button type="button" onClick={(e) => onOpen(item, e)} className="group relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-ink" aria-label={t.gallery.open(nameOf(item))}>
            <span className="absolute inset-0 transition-opacity duration-700 group-hover:opacity-90">
              <MediaView item={item} alt={nameOf(item)} sizes={"(max-width: 1023px) 46vw, " + (rest || items.length >= 4 ? "18rem" : items.length === 3 ? "25rem" : "38rem")} frame={4 / 5} />
            </span>
            {item.type === "video" ? (
              <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-ink/60 px-3 py-1 text-sm text-white">
                <Play className="size-3.5 fill-current" aria-hidden="true" /> {t.gallery.film}
              </span>
            ) : null}
          </button>
          {captionOf(item) ? <p data-angle-caption className="mt-2 text-base leading-snug text-mist">{captionOf(item)}</p> : null}
        </li>
      ))}
    </ol>
  );
}
