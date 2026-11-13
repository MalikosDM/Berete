import { useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Gift, Newspaper, Play, Rotate3d, ZoomIn } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import HorizontalGallery, { Lightbox } from "@/components/HorizontalGallery";
import { Img, MediaView } from "@/components/Media";
import { coverSrcSet, SIZES_FOR } from "@/lib/responsive";
import PieceCard from "@/components/PieceCard";
import Piece3D from "@/components/Piece3D";
import Reveal from "@/components/Reveal";
import { primeStoryVideo } from "@/components/stories/player";
import StoryViewer from "@/components/stories/StoryViewer";
import { media } from "@/data/catalogue";
import { collectionOf } from "@/data/collections";
import { RENAMED_PIECES, SEEN_LABEL } from "@/data/pieces";
import { findPiece, initials, mediaOfPiece, peopleOf, portraitOf, similarPieces, storiesOf, storiesOfPiece } from "@/data/relations";
import { MAKING_STEPS, type MakingStep, type MediaItem, type Piece, type Story } from "@/data/types";
import { listOf } from "@/i18n/format";
import { collectionWords, Link, Navigate, useI18n, useMadeFor } from "@/i18n";
import { useCatalogue, useRawCatalogue } from "@/lib/catalogue";
import { usePieceModel } from "@/lib/models";
import { waLink } from "@/lib/site";
import NotFound from "@/pages/NotFound";

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.8)]";

/** The atelier photos that illustrate a step when the piece has none of its own. */
function atelierFor(step: MakingStep): MediaItem | null {
  const atelier = media.groups["atelier"] ?? [];
  if (step === "raw") return atelier[1] ?? null;
  if (step === "setting") return media.videos["atelier/setting"] ?? null;
  if (step === "polishing") return atelier[2] ?? null;
  return null;
}

/** The page of one piece (a "capsule"): /pieces/:slug. */
export default function PiecePage() {
  const { slug = "" } = useParams();
  const { t, intl } = useI18n();
  const madeFor = useMadeFor();
  const cat = useCatalogue();
  const raw = useRawCatalogue();
  const [viewer, setViewer] = useState<{ stories: Story[]; step: number } | null>(null);
  const piece = findPiece(cat, slug);
  // The 3D model the jeweller attached to this piece, if any: shown right under the opening.
  const model = usePieceModel(piece?.slug ?? slug);
  if (!piece) {
    const renamed = RENAMED_PIECES[slug];
    return renamed ? <Navigate to={"/pieces/" + renamed} replace /> : <NotFound />;
  }

  const collection = collectionOf(piece.type);
  const collectionName = collectionWords(t, collection.slug, collection).name;
  const people = peopleOf(cat, piece);
  const box = piece.boxSlug ? cat.boxes.find((b) => b.slug === piece.boxSlug) : undefined;
  const similar = similarPieces(cat, piece, 4);
  const seenIn = storiesOfPiece(cat, piece);
  const wa = waLink(t.whatsapp.piece(piece.title));
  // The rows of the sheet by their English label (the page shows them translated): the row "Metal and stones" says what the photos show.
  const sheetRows = raw.pieces.find((p) => p.slug === piece.slug)?.specs.map((s) => s.label) ?? [];
  const seenRow = sheetRows.includes(SEEN_LABEL);

  // Opens stories on the first photo or video of this piece, when they show it.
  const openStories = (stories: Story[]) => {
    const first = stories[0];
    if (!first) return;
    const files = new Set(mediaOfPiece(piece).map((m) => m.src));
    const step = Math.max(0, first.media.findIndex((m) => files.has(m.src)));
    primeStoryVideo(first, step);
    setViewer({ stories, step });
  };

  return (
    <article data-piece={piece.slug} data-draft={piece.draft ? "true" : undefined}>
      {/* Opening: the jewel, full screen */}
      <section aria-labelledby="piece-title" className="relative isolate flex min-h-svh flex-col overflow-hidden bg-ink lg:grid lg:grid-cols-12 lg:items-end">
        {/* The jewel: the top of the screen on phones, the right of the screen on computers */}
        <div className="relative h-[58svh] shrink-0 px-4 pt-20 sm:h-[62svh] sm:px-10 lg:order-2 lg:col-span-7 lg:h-svh lg:px-12 lg:pt-28 lg:pb-14">
          <MediaView item={piece.cover} alt={piece.cover.alt ?? piece.title} fit="contain" priority sizes="(max-width: 1023px) 75vw, 58vw" />
        </div>
        <div className="w-full px-5 pt-6 pb-10 sm:px-8 lg:order-1 lg:col-span-5 lg:pt-0 lg:pr-0 lg:pb-16 lg:pl-12">
          <div className="flex flex-col gap-8">
            <div className={shadow}>
              <p className="eyebrow">
                <Link to={"/creations/" + collection.slug} className="inline-flex min-h-12 items-center hover:text-white">
                  {collectionName}
                </Link>
                <span className="text-mist"> · {t.common.madeFor(madeFor(cat, piece))}</span>
              </p>
              <h1 id="piece-title" className="title-caps mt-3 text-[clamp(2.25rem,4.2vw,4.5rem)] tracking-[0.06em] break-words text-white [text-wrap:balance]">
                {piece.title}
              </h1>
              {piece.line ? <p className="mt-5 max-w-2xl text-lg text-bone md:text-xl">{piece.line}</p> : null}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col 2xl:flex-row">
              <a href={wa} target="_blank" rel="noreferrer" data-want-piece className="inline-flex min-h-14 items-center justify-center gap-3 bg-white px-7 text-base font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-rose-light">
                <BrandIcon name="whatsapp" className="size-5" /> {t.piece.want}
              </a>
              {model ? (
                <a href="#piece-3d-viewer" data-see-3d className="inline-flex min-h-14 items-center justify-center gap-3 border border-rose-light/70 px-7 text-base font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light">
                  <Rotate3d className="size-5" aria-hidden="true" /> {t.viewer.see}
                </a>
              ) : (
                <a href="#piece-details" className="inline-flex min-h-14 items-center justify-center gap-2 border border-white/40 px-7 text-base font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light">
                  {t.piece.details} <ArrowDown className="size-4" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
          <Link to="/creations" className="mt-8 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-mist hover:text-rose-light">
            <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" /> {t.common.allCreations}
          </Link>
        </div>
      </section>

      {model ? <Piece3D piece={piece} model={model} /> : null}

      <div id="piece-details" className="scroll-mt-24">
        {piece.gallery.length > 0 ? <HorizontalGallery items={piece.gallery} title={piece.details.length > 0 ? t.piece.upClose : t.piece.details} /> : null}
        {piece.details.length > 0 ? <DetailsSection piece={piece} /> : null}
      </div>

      {/* Made for, and the story */}
      <section aria-label={t.piece.madeFor + " · " + t.piece.story} className="mx-auto grid max-w-[1600px] gap-16 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:px-12 lg:py-32">
        <div className="lg:col-span-5" data-made-for>
          <h2 className="eyebrow">{t.piece.madeFor}</h2>
          {people.length > 0 ? (
            <ul className="mt-8 space-y-6">
              {people.slice(0, 3).map((person) => {
                const portrait = portraitOf(cat, person);
                const stories = storiesOf(cat, person.slug);
                return (
                  <li key={person.slug} className="flex items-center gap-5">
                    <Link to={"/players/" + person.slug} className="block size-20 shrink-0 overflow-hidden rounded-full bg-rose-gold p-[2px]" aria-label={person.name}>
                      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-ink-soft">
                        {portrait ? <Img src={portrait} srcSet={coverSrcSet(portrait)} sizes="64px" alt="" loading="lazy" className="h-full w-full object-cover" /> : <span aria-hidden="true" className="font-display text-xl text-white">{initials(person.name)}</span>}
                      </span>
                    </Link>
                    <div className="min-w-0">
                      <Link to={"/players/" + person.slug} data-made-for-person={person.slug} className="inline-flex min-h-12 items-baseline gap-2 font-display text-[clamp(1.5rem,3vw,2.25rem)] uppercase tracking-[0.06em] text-white hover:text-rose-light">
                        {person.number !== null ? <span className="text-rose-gold text-lg">{person.number}</span> : null}
                        {person.name}
                      </Link>
                      <p className="flex flex-wrap gap-x-5">
                        <Link to={"/players/" + person.slug} className="inline-flex min-h-12 items-center gap-2 text-base text-mist hover:text-rose-light">
                          {person.kind === "club" ? t.piece.theClub : t.piece.theProfile} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                        </Link>
                        {stories.length > 0 ? (
                          <button type="button" onClick={() => openStories(stories)} className="inline-flex min-h-12 items-center gap-2 text-base text-mist hover:text-rose-light">
                            <Play className="size-4" aria-hidden="true" /> {t.piece.stories(stories.length)}
                          </button>
                        ) : null}
                      </p>
                    </div>
                  </li>
                );
              })}
              {people.length > 3 ? (
                <li className="text-base text-mist">
                  {t.piece.andOthers(listOf(intl, people.slice(3).map((p) => p.name)))}
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-8 font-display text-[clamp(1.5rem,3vw,2.25rem)] uppercase tracking-[0.06em] text-white">{madeFor(cat, piece)}</p>
          )}
          {seenIn.length > 0 ? (
            <button
              type="button"
              data-seen-in-stories
              onClick={() => openStories(seenIn)}
              className="mt-10 inline-flex min-h-12 items-center gap-3 border border-white/40 px-6 text-base font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light"
            >
              <Play className="size-4 fill-current" aria-hidden="true" /> {t.piece.seenInStories}
            </button>
          ) : null}
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <h2 className="eyebrow">{t.piece.story}</h2>
          {piece.line ? <h3 className="title-caps mt-8 text-[clamp(1.75rem,3.5vw,3rem)] leading-[1.15] tracking-[0.06em] text-white [text-wrap:balance]">{piece.line}</h3> : null}
          {piece.story ? <p className="mt-8 max-w-2xl text-lg leading-relaxed text-bone">{piece.story}</p> : null}
        </div>
      </section>

      <MakingSection piece={piece} boxImage={box?.images[0]} />

      {piece.handover.length > 0 ? (
        <section aria-labelledby="handover-title" className="mx-auto max-w-[1600px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <p className="eyebrow">{t.piece.delivered}</p>
          <h2 id="handover-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.12em]">
            {piece.clientPublic && piece.client ? t.piece.handedOverTo(piece.client) : t.piece.handover}
          </h2>
          <ul className={"mt-12 grid gap-8 " + (piece.handover.length > 1 ? "md:grid-cols-2 xl:grid-cols-3" : "")}>
            {piece.handover.map((m) => (
              <li key={m.src}>
                <Reveal>
                  <figure>
                    <span className="block aspect-[4/5] overflow-hidden bg-ink-soft">
                      <MediaView item={m} fit="cover" sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw" />
                    </span>
                    {m.caption ? <figcaption className="mt-4 text-base text-bone">{m.caption}</figcaption> : null}
                  </figure>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Technical sheet, box, press */}
      <section aria-labelledby="sheet-title" className="mx-auto grid max-w-[1600px] gap-16 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:px-12 lg:py-32">
        <div className="lg:col-span-6">
          <h2 id="sheet-title" className="title-caps text-[clamp(1.75rem,4vw,3rem)] tracking-[0.14em]">{t.piece.sheet}</h2>
          <dl className="mt-8 border-t border-white/15">
            {piece.specs.map((s, i) => (
              <div key={s.label} data-spec={sheetRows[i] === SEEN_LABEL ? "seen" : undefined} className="grid gap-2 border-b border-white/15 py-5 sm:grid-cols-3 sm:gap-6">
                <dt className="text-base font-semibold uppercase tracking-[0.16em] text-rose-light">{s.label}</dt>
                <dd className="text-lg text-white sm:col-span-2">{s.value}</dd>
              </div>
            ))}
          </dl>
          {/* What the photos show, written before the jeweller confirms it: said as such while the piece is a draft. */}
          {piece.draft && seenRow ? <p data-seen-note className="mt-4 text-base text-mist">{t.piece.seenNote}</p> : null}
          {box ? (
            <Link to="/boxes" data-custom-box={box.slug} className="group mt-10 flex items-center gap-5 border border-white/15 p-4 transition-colors hover:border-rose-light">
              <span className="block size-24 shrink-0 overflow-hidden bg-ink-soft">{box.images[0] ? <MediaView item={box.images[0]} fit="cover" sizes={SIZES_FOR.thumb} /> : null}</span>
              <span>
                <span className="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-white group-hover:text-rose-light">
                  <Gift className="size-5 text-rose-light" aria-hidden="true" /> {t.piece.customBox}
                </span>
                <span className="mt-2 block text-base text-bone">{t.piece.deliveredIn(box.name)}</span>
              </span>
            </Link>
          ) : null}
        </div>

        {piece.press.length > 0 ? (
          <div id="press" className="lg:col-span-5 lg:col-start-8">
            <h2 className="eyebrow">{t.piece.press}</h2>
            <ul className="mt-5 border-t border-white/15">
              {piece.press.map((p) => (
                <li key={p.outlet + p.title} className="border-b border-white/15 py-5">
                  <div className="flex items-start gap-5">
                    {p.image ? <Img src={p.image} alt={t.piece.pressAlt(p.outlet)} loading="lazy" className="h-28 w-20 shrink-0 object-cover object-top" /> : <Newspaper className="mt-1 size-5 shrink-0 text-rose-light" aria-hidden="true" />}
                    <div>
                      <p className="text-base font-semibold uppercase tracking-[0.16em] text-rose-light">{p.outlet}</p>
                      <p className="mt-2 text-lg text-white">{p.title}</p>
                      {p.url ? (
                        <a href={p.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-12 items-center gap-2 text-base font-semibold text-white underline-offset-4 hover:text-rose-light hover:underline">
                          {t.common.readArticle} <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {similar.length > 0 ? (
        <section aria-labelledby="similar-title" data-similar className="border-t border-white/10">
          <div className="mx-auto max-w-[1600px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">{t.piece.similar}</p>
                <h2 id="similar-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.12em]">
                  {t.piece.more(collectionName)}
                </h2>
              </div>
              <Link to={"/creations/" + collection.slug} className="inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] text-white hover:text-rose-light">
                {t.piece.theCollection} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </div>
            <ul className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((p, i) => (
                <li key={p.slug}>
                  <Reveal delay={i * 0.1}>
                    <PieceCard piece={p} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* The call to action */}
      <section aria-labelledby="want-title" className="border-t border-white/10 bg-ink-soft">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start gap-10 px-5 py-24 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-32">
          <div className="max-w-3xl">
            <p className="eyebrow">{t.common.yourPiece}</p>
            <h2 id="want-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4.25rem)] tracking-[0.1em] [text-wrap:balance]">
              {t.piece.ctaTitle}
            </h2>
            <p className="mt-6 max-w-xl text-lg text-bone">{t.piece.ctaText}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={wa} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center justify-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-rose-light">
              <BrandIcon name="whatsapp" className="size-5" /> {t.piece.want}
            </a>
            <Link to="/contact" className="inline-flex min-h-14 items-center justify-center gap-2 border border-white/40 px-8 text-base font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light">
              {t.piece.otherWays}
            </Link>
          </div>
        </div>
      </section>

      {viewer ? <StoryViewer stories={viewer.stories} start={0} startStep={viewer.step} onClose={() => setViewer(null)} /> : null}
    </article>
  );
}

/**
 * "The details": each symbol of the piece and what it stands for, numbered; a detail shown by a photo of the piece opens
 * it in full screen.
 */
function DetailsSection({ piece }: { piece: Piece }) {
  const { t } = useI18n();
  const photos = [piece.cover, ...piece.gallery].filter((m, i, all) => m.src && all.findIndex((x) => x.src === m.src) === i);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section aria-labelledby="details-title" data-details className="border-t border-white/10">
      <div className="mx-auto max-w-[1600px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <p className="eyebrow">{t.piece.detailsEyebrow}</p>
        <h2 id="details-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.12em]">
          {t.piece.details}
        </h2>
        <ol className="mt-14 grid gap-x-12 gap-y-12 border-t border-white/15 pt-12 md:grid-cols-2 xl:grid-cols-3">
          {piece.details.map((d, i) => {
            const index = d.photo ? photos.findIndex((m) => m.src === d.photo) : -1;
            const photo = index >= 0 ? photos[index] : undefined;
            return (
              <li key={d.title + i} data-detail={i + 1} className="flex gap-5">
                <span className="text-rose-gold w-10 shrink-0 font-display text-2xl leading-none">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="title-caps text-2xl leading-tight tracking-[0.08em] text-white">{d.title}</h3>
                  <p className="mt-3 text-lg text-bone">{d.text}</p>
                  {photo ? (
                    <button
                      type="button"
                      data-detail-photo
                      onClick={() => setOpen(index)}
                      aria-label={t.piece.seePhoto + " · " + d.title}
                      className="group mt-5 flex min-h-12 items-center gap-4 text-start text-base font-semibold text-white hover:text-rose-light"
                    >
                      <span className="block size-20 shrink-0 overflow-hidden border border-white/15 bg-ink-soft">
                        <MediaView item={photo} alt="" fit="cover" sizes="80px" className="transition-transform duration-700 group-hover:scale-110" />
                      </span>
                      <span className="inline-flex items-center gap-2">
                        {t.piece.seePhoto} <ZoomIn className="size-4" aria-hidden="true" />
                      </span>
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      {open !== null ? createPortal(<Lightbox items={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
    </section>
  );
}

/**
 * "How it was made": the five steps, with the photos of this piece when there are some, else the atelier. The photos
 * of the piece (its first sketch...) open in full screen.
 */
function MakingSection({ piece, boxImage }: { piece: Piece; boxImage?: MediaItem }) {
  const { t } = useI18n();
  const STEPS: Record<MakingStep, { title: string; text: string }> = t.piece.steps;
  const owned = MAKING_STEPS.map((step) => piece.making[step] ?? (step === "delivery" ? boxImage : undefined));
  const viewable = owned.filter((m): m is MediaItem => m !== undefined);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section aria-labelledby="making-title" data-making className="border-y border-white/10 py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <p className="eyebrow">{t.piece.makingEyebrow}</p>
        <h2 id="making-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.12em]">
          {t.piece.makingTitle}
        </h2>
      </div>
      <ol className="no-scrollbar mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 sm:px-8 lg:mx-auto lg:grid lg:max-w-[1600px] lg:grid-cols-5 lg:gap-6 lg:overflow-visible lg:px-12">
        {MAKING_STEPS.map((step, i) => {
          const own = owned[i];
          const item = own ?? atelierFor(step);
          const label = own ? (own.caption ?? t.piece.thisPiece) : item ? t.piece.inAtelier : null;
          const picture = (
            <>
              {item ? (
                // Inside its button (a photo of this piece), the photo is named by the button.
                <MediaView item={item} alt={own ? "" : (item.alt ?? STEPS[step].title)} fit="cover" sizes="(max-width: 639px) 72vw, (max-width: 1023px) 44vw, 20vw" />
              ) : (
                <span className="flex h-full w-full items-center justify-center p-8">
                  {/* A faint number in the place of a photo: drawn by the style sheet, it is decoration, not text. */}
                  <span aria-hidden="true" data-n={String(i + 1).padStart(2, "0")} className="font-display text-[5rem] leading-none font-light text-white/10 before:content-[attr(data-n)]" />
                </span>
              )}
              {label ? <span className="absolute bottom-3 start-3 bg-ink/75 px-3 py-1 text-base text-bone backdrop-blur-sm">{label}</span> : null}
            </>
          );
          return (
            <li key={step} data-making-step={step} className="w-[72vw] shrink-0 snap-start sm:w-[44vw] lg:w-auto">
              <Reveal delay={i * 0.08}>
                {own ? (
                  <button
                    type="button"
                    onClick={() => setOpen(viewable.indexOf(own))}
                    // The name read aloud starts with the words shown on the photo ("The first sketch").
                    aria-label={(label ? label + " · " : "") + t.gallery.open(own.alt ?? STEPS[step].title)}
                    data-making-open={step}
                    className="group relative block aspect-[3/4] w-full cursor-zoom-in overflow-hidden border border-white/10 bg-ink-soft text-start"
                  >
                    {picture}
                    <span className="absolute end-3 bottom-3 inline-flex size-12 items-center justify-center rounded-full border border-white/30 bg-ink/60 text-white transition-colors group-hover:border-rose-light group-hover:text-rose-light">
                      <ZoomIn className="size-5" aria-hidden="true" />
                    </span>
                  </button>
                ) : (
                  <span className="relative block aspect-[3/4] overflow-hidden border border-white/10 bg-ink-soft">{picture}</span>
                )}
                <p className="mt-5 flex items-baseline gap-3">
                  <span className="text-rose-gold font-display text-xl">{String(i + 1).padStart(2, "0")}</span>
                  <span className="title-caps text-2xl tracking-[0.12em] text-white">{STEPS[step].title}</span>
                </p>
                <p className="mt-3 text-base text-bone">{STEPS[step].text}</p>
              </Reveal>
            </li>
          );
        })}
        <li aria-hidden="true" className="w-1 shrink-0 lg:hidden" />
      </ol>
      {open !== null ? createPortal(<Lightbox items={viewable} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
    </section>
  );
}
