import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Gift, Newspaper, Play, Rotate3d, ZoomIn } from "lucide-react";
import AtelierPassage from "@/components/AtelierPassage";
import AtelierRoom from "@/components/AtelierRoom";
import BrandIcon from "@/components/BrandIcon";
import EveryAngle from "@/components/EveryAngle";
import { Lightbox } from "@/components/HorizontalGallery";
import { Img, LoopVideo, MediaView } from "@/components/Media";
import { coverSrcSet, SIZES_FOR } from "@/lib/responsive";
import PieceCard from "@/components/PieceCard";
import PieceFilm from "@/components/PieceFilm";
import Piece3D from "@/components/Piece3D";
import Reveal from "@/components/Reveal";
import Showcase from "@/components/Showcase";
import JewelFx from "@/components/universe/JewelFx";
import { primeStoryVideo } from "@/components/stories/player";
import StoryViewer from "@/components/stories/StoryViewer";
import Universe, { universeProps } from "@/components/Universe";
import { defaultCatalogue } from "@/data/catalogue";
import { collectionOf } from "@/data/collections";
import { OLD_SEEN_LABEL, RENAMED_PIECES, SEEN_LABEL, SPECIAL_PROJECT, wornWith } from "@/data/pieces";
import { findPiece, initials, mediaOfPiece, peopleOf, personHref, portraitOf, removedPieceTarget, similarPieces, storiesOf, storiesOfPiece } from "@/data/relations";
import { anglePhotos } from "@/data/angles";
import { filmTime, resolveAtelier, resolveReveal } from "@/data/atelier";
import { completeMakingOf, makingSteps } from "@/data/making";
import { pointsFor } from "@/data/details3d";
import type { PublicModel } from "@/data/models";
import { resolveShowcase } from "@/data/showcase";
import { jewelOf, resolveTheme } from "@/data/themes";
import type { MakingStep, MediaItem, Piece, Story } from "@/data/types";
import { listOf } from "@/i18n/format";
import { collectionWords, Link, Navigate, useI18n, useMadeFor } from "@/i18n";
import { useCatalogue, useRawCatalogue } from "@/lib/catalogue";
import { clubLogo } from "@/lib/clubs";
import { filmSeen, markFilmSeen } from "@/lib/films";
import { usePieceModel } from "@/lib/models";
import { Detail3D, type DetailMark } from "@/viewer";
import { waLink } from "@/lib/site";
import NotFound from "@/pages/NotFound";

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.8)]";

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
  // The film of the finished piece: the first thing seen on entering the piece, once per visit (src/components/PieceFilm.tsx).
  const reveal = piece ? resolveReveal(piece.slug, piece.atelier) : null;
  const [filmOpen, setFilmOpen] = useState(false);
  const hasReveal = reveal !== null;
  const pieceSlug = piece?.slug;
  useLayoutEffect(() => {
    if (!pieceSlug || !hasReveal || filmSeen(pieceSlug) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    markFilmSeen(pieceSlug);
    // Before the first paint of the piece: the film comes first (the page written by the server has none).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilmOpen(true);
    return () => setFilmOpen(false);
  }, [pieceSlug, hasReveal]);
  if (!piece) {
    // A renamed piece leads to its new address; an unpublished one to its player, else to the creations.
    const target = RENAMED_PIECES[slug] ? "/pieces/" + RENAMED_PIECES[slug] : removedPieceTarget(defaultCatalogue, slug);
    return target ? <Navigate to={target} replace /> : <NotFound />;
  }

  const collection = collectionOf(piece.type);
  const collectionName = collectionWords(t, collection.slug, collection).name;
  const people = peopleOf(cat, piece);
  const box = piece.boxSlug ? cat.boxes.find((b) => b.slug === piece.boxSlug) : undefined;
  const similar = similarPieces(cat, piece, 4);
  const seenIn = storiesOfPiece(cat, piece);
  const wa = waLink(t.whatsapp.piece(piece.title));
  // The rows of the sheet by their English label (the page shows them translated): the row "Precious Materials" says what the photos show.
  const sheetRows = (raw.pieces.find((p) => p.slug === piece.slug)?.specs.map((s) => s.label) ?? []).map((l) => (l === OLD_SEEN_LABEL ? SEEN_LABEL : l));
  const seenRow = sheetRows.includes(SEEN_LABEL);
  // The championship rings of the special project: "Historic Commissions".
  const historic = SPECIAL_PROJECT.some((r) => r.slug === piece.slug);

  // Opens stories on the first photo or video of this piece, when they show it.
  const openStories = (stories: Story[]) => {
    const first = stories[0];
    if (!first) return;
    const files = new Set(mediaOfPiece(piece).map((m) => m.src));
    const step = Math.max(0, first.media.findIndex((m) => files.has(m.src)));
    primeStoryVideo(first, step);
    setViewer({ stories, step });
  };

  const theme = resolveTheme(piece.theme);
  // The effect of its universe on the piece itself (a reflection, sparkles, a halo...).
  const jewel = jewelOf(theme.effects);
  // The jewel of the opening: cut out, in one view or a showcase of several; else its photo.
  const opening = resolveShowcase(piece.slug, piece.showcase);
  // Its atelier (its making-of, then the finished piece): a passage after its photos, when it has a making-of.
  const atelier = resolveAtelier(piece.slug, piece.atelier);

  return (
    // The page of each piece is its own element (key): entering another piece is entering another world, with its
    // entrance (data-entering, removed on a return: src/components/Universe.tsx).
    <article
      key={piece.slug}
      data-piece={piece.slug}
      data-draft={piece.draft ? "true" : undefined}
      data-entering=""
      data-entrance={theme.entrance}
      {...universeProps(theme)}
      className="relative *:relative"
    >
      {/* The universe of the piece: its world, behind the whole page (src/data/themes.ts). Every block of the page
          is positioned, so it is drawn over it; no isolation, so the full-screen layers (stories, photos, 3D) still
          come over the menu. */}
      <Universe theme={theme} slug={piece.slug} />
      {/* Opening: the jewel, full screen */}
      <section aria-labelledby="piece-title" data-piece-opening className="relative flex min-h-svh flex-col overflow-hidden lg:grid lg:grid-cols-12 lg:items-end">
        {/* The jewel: the top of the screen on phones, the right of the screen on computers */}
        {/* A piece shown large (Dragon Ball, 21/11/2026): a taller frame on a phone, the whole height on a computer. */}
        <div data-piece-cover className={"relative shrink-0 px-4 pt-20 sm:px-10 lg:order-2 lg:col-span-7 lg:h-svh lg:px-12 lg:pt-28 lg:pb-14 xl:col-span-8 " + (opening.large && opening.mode !== "photo" ? "h-[70svh] sm:h-[72svh]" : "h-[58svh] sm:h-[62svh]")}>
          {opening.mode === "photo" ? (
            <>
              <MediaView item={piece.cover} alt={piece.cover.alt ?? piece.title} fit="contain" priority sizes="(max-width: 1023px) 75vw, 66vw" />
              {/* The effect of its world on the piece, over its photo (the same frame as the photo). */}
              {jewel ? (
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 px-4 pt-20 sm:px-10 lg:px-12 lg:pt-28 lg:pb-14">
                  <span className="relative block h-full w-full">
                    <JewelFx kind={jewel} photo />
                  </span>
                </span>
              ) : null}
            </>
          ) : (
            <Showcase slug={piece.slug} title={piece.title} views={opening.views} jewel={jewel} large={opening.large} />
          )}
        </div>
        {/* The text of the opening: discreet (asked by Yoni, 20/11/2026), so that the jewel shines; the title stays first, the
            buttons stay plain to see (48 px high at least on a phone). */}
        <div data-piece-intro className="w-full px-5 pt-5 pb-8 sm:px-8 lg:order-1 lg:col-span-5 lg:pt-0 lg:pr-0 lg:pb-14 lg:pl-12 xl:col-span-4">
          <div className="flex max-w-md flex-col gap-6">
            <div data-piece-text className={shadow}>
              {historic ? <p className="mb-2 text-base font-semibold uppercase tracking-[0.22em] text-rose-light">{t.piece.historic}</p> : null}
              <p className="text-base leading-snug tracking-[0.04em] text-mist">
                <Link to={"/creations/" + collection.slug} className="inline-flex min-h-12 items-center font-semibold uppercase tracking-[0.2em] text-rose-light hover:text-white lg:min-h-10">
                  {collectionName}
                </Link>
                <span className="block">{t.common.madeFor(madeFor(cat, piece))}</span>
              </p>
              <h1 id="piece-title" data-u-title className="title-caps mt-3 text-[clamp(1.75rem,2.7vw,2.75rem)] leading-[1.1] tracking-[0.06em] break-words text-white [text-wrap:balance]">
                {piece.title}
              </h1>
              {piece.line ? <p className="mt-3 text-base leading-relaxed text-bone lg:text-[1.0625rem]">{piece.line}</p> : null}
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <a href={wa} target="_blank" rel="noreferrer" data-want-piece className="inline-flex min-h-12 items-center justify-center gap-2.5 bg-white px-5 text-base font-semibold tracking-[0.04em] text-ink transition-colors hover:bg-rose-light">
                <BrandIcon name="whatsapp" className="size-4.5" /> {t.piece.want}
              </a>
              {reveal ? (
                <button type="button" onClick={() => setFilmOpen(true)} data-watch-film className="inline-flex min-h-12 items-center justify-center gap-2.5 border border-white/35 px-5 text-base font-semibold tracking-[0.04em] text-white transition-colors hover:border-rose-light hover:text-rose-light">
                  <Play className="size-3.5 fill-current" aria-hidden="true" /> {t.films.watch}
                </button>
              ) : null}
              {model ? (
                <a href="#piece-3d-viewer" data-see-3d className="inline-flex min-h-12 items-center justify-center gap-2.5 border border-rose-light/70 px-5 text-base font-semibold tracking-[0.04em] text-white transition-colors hover:border-rose-light hover:text-rose-light">
                  <Rotate3d className="size-4.5" aria-hidden="true" /> {t.viewer.see}
                </a>
              ) : (
                <a href="#piece-details" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/35 px-5 text-base font-semibold tracking-[0.04em] text-white transition-colors hover:border-rose-light hover:text-rose-light">
                  {t.piece.details} <ArrowDown className="size-4" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
          <Link to="/creations" className="mt-4 inline-flex min-h-12 items-center gap-2 text-base text-mist hover:text-rose-light">
            <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" /> {t.common.allCreations}
          </Link>
        </div>
      </section>

      {model ? <Piece3D piece={piece} model={model} /> : null}

      <div id="piece-details" className="scroll-mt-24">
        {/* Every photo and film of the piece, each with its text (src/components/EveryAngle.tsx). */}
        <EveryAngle piece={piece} items={anglePhotos(piece, opening.mode === "photo")} />
        {atelier ? <AtelierPassage piece={piece} madeFor={madeFor(cat, piece)} atelier={atelier} /> : null}
        {piece.details.length > 0 ? <DetailsSection piece={piece} model={model} /> : null}
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
                // Their other piece, when they have one other than this one; else their page (21/11/2026).
                const href = personHref(cat, person) === "/pieces/" + piece.slug ? "/players/" + person.slug : personHref(cat, person);
                // A club with its official logo (src/lib/clubs.ts): the logo, in the light of the universe of the piece.
                const logo = person.kind === "club" ? clubLogo(person.slug) : null;
                return (
                  <li key={person.slug} className="flex items-center gap-5">
                    {logo ? (
                      <Link to={href} data-club-logo={person.slug} className="club-emblem relative block size-24 shrink-0 sm:size-28" aria-label={person.name}>
                        <span aria-hidden="true" className="club-emblem-halo absolute -inset-5 rounded-full" />
                        <span className="relative flex h-full w-full items-center justify-center rounded-full bg-rose-gold p-[2px]">
                          <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-ink bg-ink p-2.5">
                            <img src={logo} alt="" width={840} height={840} loading="lazy" decoding="async" className="h-full w-full object-contain" />
                          </span>
                        </span>
                      </Link>
                    ) : (
                      <Link to={href} className="block size-20 shrink-0 overflow-hidden rounded-full bg-rose-gold p-[2px]" aria-label={person.name}>
                        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-ink-soft">
                          {portrait ? <Img src={portrait} srcSet={coverSrcSet(portrait)} sizes="64px" alt="" loading="lazy" className="h-full w-full object-cover" /> : <span aria-hidden="true" className="font-display text-xl text-white">{initials(person.name)}</span>}
                        </span>
                      </Link>
                    )}
                    <div className="min-w-0">
                      <Link to={href} data-made-for-person={person.slug} className="inline-flex min-h-12 items-baseline gap-2 font-display text-[clamp(1.5rem,3vw,2.25rem)] uppercase tracking-[0.06em] text-white hover:text-rose-light">
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
          {piece.story
            ? piece.story.split("\n\n").map((par, i) => (
                <p key={i} data-story-paragraph={i + 1} className="mt-8 max-w-2xl text-lg leading-relaxed text-bone">
                  {par}
                </p>
              ))
            : null}
          <WornWith slug={piece.slug} />
        </div>
      </section>

      <MakingSection piece={piece} boxImage={box?.images[0]} madeFor={madeFor(cat, piece)} />

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
            <Link to={"/boxes#box-" + box.slug} data-custom-box={box.slug} className="group mt-10 flex items-center gap-5 border border-white/15 p-4 transition-colors hover:border-rose-light">
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
      <section aria-labelledby="want-title" className="border-t border-white/10 bg-black/35">
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

      {filmOpen && reveal ? <PieceFilm title={piece.title} film={reveal.film} poster={reveal.poster} theme={theme} onClose={() => setFilmOpen(false)} /> : null}

      {/* Out of the page (its blocks are positioned over the universe): over everything, the menu included. */}
      {viewer ? createPortal(<StoryViewer stories={viewer.stories} start={0} startStep={viewer.step} onClose={() => setViewer(null)} />, document.body) : null}
    </article>
  );
}

/**
 * "The Art of Detail": each symbol of the piece and what it stands for, numbered; a detail shown by a photo of the piece opens
 * it in full screen. A piece with a 3D model shows it above them, turning, its details pointed at on the jewel (the points
 * placed in the admin: src/data/details3d.ts, src/viewer/DetailViewer.tsx).
 */
function DetailsSection({ piece, model }: { piece: Piece; model: PublicModel | null }) {
  const { t } = useI18n();
  const marks: DetailMark[] = model
    ? pointsFor(piece.detailPoints, model.id, piece.details.length).map((p) => ({ n: p.detail + 1, title: piece.details[p.detail]!.title, at: p.at }))
    : [];
  const photos = [piece.cover, ...piece.gallery].filter((m, i, all) => m.src && all.findIndex((x) => x.src === m.src) === i);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section aria-labelledby="details-title" data-details className="border-t border-white/10">
      <div className="mx-auto max-w-[1600px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <p className="eyebrow">{t.piece.detailsEyebrow}</p>
        <h2 id="details-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.12em]">
          {t.piece.details}
        </h2>
        {model ? (
          <div className="mt-12" data-details-3d>
            <Detail3D model={model} marks={marks} words={t.viewer} className="h-[62svh] max-h-[760px] min-h-[340px] border border-white/10 lg:h-[72svh]" />
            <p className="mt-4 text-base text-mist">
              <span className="[@media(pointer:coarse)]:hidden">{t.viewer.detailHint}</span>
              <span className="hidden [@media(pointer:coarse)]:inline">{t.viewer.detailHintTouch}</span>
            </p>
          </div>
        ) : null}
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
 * "The Making of a Masterpiece" (feedback of Yoni, 21/11/2026): only the real steps of this piece (src/data/making.ts), each
 * with its own photo or film; a step without one is left out, a piece without any has no section. Its complete making-of,
 * when it has one, comes first: it plays silently on screen, and full screen with its sound once chosen
 * (src/components/AtelierRoom.tsx). The photos of the steps open in full screen.
 */
/** The piece worn with this one (the Butterfly pendant and its chain): a card that leads to it. */
function WornWith({ slug }: { slug: string }) {
  const { t } = useI18n();
  const cat = useCatalogue();
  const pair = wornWith(slug);
  const other = pair ? cat.pieces.find((p) => p.slug === pair.slug) : undefined;
  if (!pair || !other) return null;
  return (
    <Link to={"/pieces/" + other.slug} data-worn-with={other.slug} className="group mt-10 flex max-w-xl items-center gap-5 border border-white/15 bg-ink/60 p-4 transition-colors hover:border-rose-light">
      <span className="relative block aspect-[4/5] w-24 shrink-0 overflow-hidden bg-ink sm:w-28">
        <MediaView item={other.cover} alt="" fit="contain" sizes="112px" />
      </span>
      <span className="min-w-0">
        <span className="eyebrow block">{pair.is === "chain" ? t.piece.wornOn : t.piece.itsPendant}</span>
        <span className="title-caps mt-2 block text-xl leading-snug tracking-[0.06em] break-words text-white transition-colors group-hover:text-rose-light">{other.title}</span>
        <span className="mt-1 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-rose-light transition-colors group-hover:text-white">
          {t.common.enterWorld} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

function MakingSection({ piece, boxImage, madeFor }: { piece: Piece; boxImage?: MediaItem; madeFor: string }) {
  const { t } = useI18n();
  const STEPS: Record<MakingStep, { title: string; text: string }> = t.piece.steps;
  const steps = makingSteps(piece, boxImage);
  const film = completeMakingOf(piece.slug, piece.atelier);
  // Every photo of the steps in the full screen viewer, the second photo of a step right after its first.
  const viewable = steps.flatMap((s) => (s.more ? [s.item, s.more] : [s.item]));
  const indexOf = (item: MediaItem) => viewable.indexOf(item);
  const [open, setOpen] = useState<number | null>(null);
  const [room, setRoom] = useState(false);
  if (steps.length === 0 && !film) return null;
  const count = steps.length + (film ? 1 : 0);
  // One row up to six cards; more (since 21/11/2026, up to ten steps): two rows.
  const columns = ["lg:grid-cols-3", "lg:grid-cols-3", "lg:grid-cols-3", "lg:grid-cols-3", "lg:grid-cols-4", "lg:grid-cols-5", "lg:grid-cols-6", "lg:grid-cols-4", "lg:grid-cols-4", "lg:grid-cols-5", "lg:grid-cols-5", "lg:grid-cols-6"][Math.min(count, 11)]!;
  return (
    <section aria-labelledby="making-title" data-making className="border-y border-white/10 py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <p className="eyebrow">{t.piece.makingEyebrow}</p>
        <h2 id="making-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.12em]">
          {t.piece.makingTitle}
        </h2>
      </div>
      <ol className={"no-scrollbar mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 sm:px-8 lg:mx-auto lg:grid lg:max-w-[1600px] lg:gap-6 lg:overflow-visible lg:px-12 " + columns}>
        {film ? (
          <li data-making-film className="w-[72vw] shrink-0 snap-start sm:w-[44vw] lg:w-auto">
            <Reveal>
              <button
                type="button"
                onClick={() => setRoom(true)}
                aria-label={t.films.making + " · " + piece.title}
                data-making-open="film"
                className="group relative block aspect-[3/4] w-full cursor-pointer overflow-hidden border border-rose-light/30 bg-ink-soft text-start"
              >
                <LoopVideo item={{ type: "video", src: film.mobile, poster: film.posters[film.poster] || film.posters[0] }} label="" className="h-full w-full object-cover" />
                <span className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex size-16 items-center justify-center rounded-full border border-white/50 bg-black/45 text-white backdrop-blur-sm transition-colors group-hover:border-rose-light group-hover:text-rose-light">
                    <Play className="size-6 translate-x-0.5 fill-current" aria-hidden="true" />
                  </span>
                </span>
                <span className="absolute bottom-3 start-3 bg-ink/75 px-3 py-1 text-base text-bone backdrop-blur-sm">{filmTime(film.duration)}</span>
              </button>
              <p className="mt-5 flex items-baseline gap-3">
                <Play className="text-rose-gold size-4 fill-current" aria-hidden="true" />
                <span className="title-caps text-2xl tracking-[0.12em] text-white">{t.films.making}</span>
              </p>
              <p className="mt-3 text-base text-bone">{t.piece.makingFilm}</p>
            </Reveal>
          </li>
        ) : null}
        {steps.map(({ step, item, more }, i) => (
          <li key={step} data-making-step={step} className="w-[72vw] shrink-0 snap-start sm:w-[44vw] lg:w-auto">
            <Reveal delay={(i + (film ? 1 : 0)) * 0.08} className="relative">
              <button
                type="button"
                onClick={() => setOpen(indexOf(item))}
                // The name read aloud starts with the words shown on the photo ("The first sketch").
                aria-label={(item.caption ? item.caption + " · " : "") + t.gallery.open(item.alt ?? STEPS[step].title)}
                data-making-open={step}
                className="group relative block aspect-[3/4] w-full cursor-zoom-in overflow-hidden border border-white/10 bg-ink-soft text-start"
              >
                {/* Inside its button, the photo is named by the button. */}
                <MediaView item={item} alt="" fit="cover" sizes="(max-width: 639px) 72vw, (max-width: 1023px) 44vw, 20vw" />
                <span className="absolute bottom-3 start-3 bg-ink/75 px-3 py-1 text-base text-bone backdrop-blur-sm">{item.caption ?? t.piece.thisPiece}</span>
                <span className="absolute end-3 bottom-3 inline-flex size-12 items-center justify-center rounded-full border border-white/30 bg-ink/60 text-white transition-colors group-hover:border-rose-light group-hover:text-rose-light">
                  <ZoomIn className="size-5" aria-hidden="true" />
                </span>
              </button>
              {more ? (
                // A second moment of the same step (21/11/2026): a smaller photo in the corner of the first, opened the same way.
                <button
                  type="button"
                  onClick={() => setOpen(indexOf(more))}
                  aria-label={(more.caption ? more.caption + " · " : "") + t.gallery.open(more.alt ?? STEPS[step].title)}
                  data-making-more={step}
                  className="group/more absolute end-3 top-3 block aspect-square w-[38%] cursor-zoom-in overflow-hidden border border-white/40 bg-ink-soft shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-colors hover:border-rose-light"
                >
                  <MediaView item={more} alt="" fit="cover" sizes="(max-width: 639px) 28vw, (max-width: 1023px) 17vw, 8vw" />
                </button>
              ) : null}
              <p className="mt-5 flex items-baseline gap-3">
                <span className="text-rose-gold font-display text-xl">{String(i + 1).padStart(2, "0")}</span>
                <span className="title-caps text-2xl tracking-[0.12em] text-white">{STEPS[step].title}</span>
              </p>
              <p className="mt-3 text-base text-bone">{STEPS[step].text}</p>
            </Reveal>
          </li>
        ))}
        <li aria-hidden="true" className="w-1 shrink-0 lg:hidden" />
      </ol>
      {open !== null ? createPortal(<Lightbox items={viewable} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
      {room && film ? <AtelierRoom title={piece.title} madeFor={madeFor} slug={piece.slug} atelier={{ making: film, reveal: null, poster: film.posters[film.poster] || film.posters[0] || "" }} onClose={() => setRoom(false)} /> : null}
    </section>
  );
}
