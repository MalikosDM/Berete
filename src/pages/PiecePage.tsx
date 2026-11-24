import { useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Newspaper, Play, Rotate3d, ZoomIn } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import EveryAngle from "@/components/EveryAngle";
import { Lightbox } from "@/components/HorizontalGallery";
import BoxSection from "@/components/BoxSection";
import { Img, MediaView } from "@/components/Media";
import { coverSrcSet } from "@/lib/responsive";
import PieceCard from "@/components/PieceCard";
import Piece3D from "@/components/Piece3D";
import Reveal from "@/components/Reveal";
import Showcase from "@/components/Showcase";
import FeatureFilm from "@/components/FeatureFilm";
import { featureFilmOf, type FeatureFilmData } from "@/data/featureFilms";
import JewelFx from "@/components/universe/JewelFx";
import { primeStoryVideo } from "@/components/stories/player";
import StoryViewer from "@/components/stories/StoryViewer";
import Universe, { universeProps } from "@/components/Universe";
import { defaultCatalogue } from "@/data/catalogue";
import { collectionOf } from "@/data/collections";
import { OLD_SEEN_LABEL, RENAMED_PIECES, SEEN_LABEL, SPECIAL_PROJECT, wornWith } from "@/data/pieces";
import { findPiece, initials, mediaOfPiece, peopleOf, personHref, portraitOf, removedPieceTarget, similarPieces, storiesOf, storiesOfPiece } from "@/data/relations";
import { anglePhotos, wornSet } from "@/data/angles";
import { resolveAtelier, resolveReveal } from "@/data/atelier";
import { completeMakingOf, makingSteps } from "@/data/making";
import { pointsFor } from "@/data/details3d";
import type { PublicModel } from "@/data/models";
import { resolveShowcase } from "@/data/showcase";
import { pressOfPiece } from "@/data/press";
import { storyBlocks } from "@/data/story";
import { jewelOf, resolveTheme } from "@/data/themes";
import type { Piece, Story } from "@/data/types";
import { listOf } from "@/i18n/format";
import { collectionWords, Link, Navigate, useI18n, useMadeFor } from "@/i18n";
import { useCatalogue, useRawCatalogue } from "@/lib/catalogue";
import { clubLogo } from "@/lib/clubs";
import { usePieceModel } from "@/lib/models";
import { Detail3D, type DetailMark } from "@/viewer";
import { waLink } from "@/lib/site";
import NotFound from "@/pages/NotFound";
import { pressDate } from "@/pages/Press";

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
  // The film of the finished piece (Yoni, 24/11/2026): right after the opening, it plays by itself, silent, in a loop.
  const reveal = piece ? resolveReveal(piece.slug, piece.atelier) : null;
  const [wornOpen, setWornOpen] = useState<number | null>(null);
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
  // Who wears it, when the house may name them (else simply "Worn").
  const wornName = madeFor(cat, piece) === t.common.privateCollector ? null : madeFor(cat, piece);
  // The rows of the sheet by their English label (the page shows them translated): the row "Precious Materials" says what the photos show.
  const sheetRows = (raw.pieces.find((p) => p.slug === piece.slug)?.specs.map((s) => s.label) ?? []).map((l) => (l === OLD_SEEN_LABEL ? SEEN_LABEL : l));
  const seenRow = sheetRows.includes(SEEN_LABEL);
  // The championship rings of the special project: "Historic Commissions".
  const historic = SPECIAL_PROJECT.some((r) => r.slug === piece.slug);
  // Its photos worn or held (judged on the English catalogue): out of "Every Angle", into "Worn by" with its handover.
  const wornSrcs = wornSet(raw.pieces.find((p) => p.slug === piece.slug));
  const feature = featureFilmOf(piece.slug);
  const worn = [...piece.handover, ...[piece.cover, ...piece.gallery].filter((m) => wornSrcs.has(m.src))].filter((m, i, all) => m.src && all.findIndex((x) => x.src === m.src) === i);
  // Its press (Yoni, 23/11/2026): the articles of the page In the Spotlight that tell it, then those the admin gave it with
  // their link; an article without its link is not shown.
  const press: { outlet: string; title: string; url: string; image?: string | null; date?: string; lang?: string }[] = [
    ...pressOfPiece(piece.slug),
    ...piece.press.filter((p): p is typeof p & { url: string } => Boolean(p.url) && !pressOfPiece(piece.slug).some((a) => a.url === p.url)),
  ];

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

  // The film of the finished piece (Yoni, 24/11/2026): one film, the one made for the page when it has one (the Dragon Ball
  // pendant, the cross of Malik Tillman that turns), else its film of the finished piece. A 3D animation is never shown as
  // the finished piece (its reveal is set to none: src/data/pieces.ts). No film: no section.
  const film: { data: FeatureFilmData; eyebrow: string; title: string; label: string; text?: string } | null = feature
    ? feature.kind === "film"
      ? { data: feature.film, eyebrow: t.feature.film, title: t.feature.dragonTitle, label: t.feature.dragonLabel }
      : { data: feature.film, eyebrow: t.feature.mechanism, title: t.feature.crossTitle, label: t.feature.crossLabel, text: t.feature.crossText }
    : reveal
      ? {
          data: { video: reveal.film.src, mobile: reveal.film.mobile, poster: reveal.poster, width: reveal.film.width, height: reveal.film.height, audio: reveal.film.audio },
          eyebrow: t.feature.film,
          title: t.films.pieceSection,
          label: t.films.intro(piece.title),
        }
      : null;
  // Its making-of lives in The Atelier (Yoni, 24/11/2026): a way there when it has one (its film, or the photos of its steps).
  const inAtelier = Boolean(atelier || completeMakingOf(piece.slug, piece.atelier) || makingSteps(piece, box?.images[0]).length > 0);
  // The lines of its composition that are filled (the others never show).
  const specs = piece.specs.map((s, i) => ({ ...s, row: sheetRows[i] })).filter((s) => s.value.trim() !== "");

  return (
    // The page of each piece is its own element (key): entering another piece is entering another world, with its
    // entrance (data-entering, removed on a return: src/components/Universe.tsx). The same order on every piece (Yoni,
    // 24/11/2026): the piece in its world, the film of the finished piece, Every Angle, its story, its composition, then who
    // it was made for and who wears it, its trunk, the way to its making-of in The Atelier, the order.
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
      <section aria-labelledby="piece-title" data-piece-opening className="relative flex flex-col overflow-hidden lg:grid lg:min-h-[min(100svh,60rem)] lg:grid-cols-12 lg:items-end">
        {/* The jewel: the top of the screen on phones, the right of the screen on computers */}
        {/* A piece shown large (Dragon Ball, 21/11/2026): a taller frame on a phone, the whole height on a computer. Behind it
            a calm dark light (.piece-calm): its universe never takes over the piece (Yoni, 23/11/2026). */}
        {/* Smaller (Yoni, 24/11/2026: the whole piece in the first screen of a laptop, 1280 × 800), under the menu. */}
        <div data-piece-cover className={"piece-calm relative shrink-0 px-6 pt-20 sm:px-12 lg:order-2 lg:col-span-7 lg:h-[min(100svh,60rem)] lg:px-16 desk:pt-28 lg:pb-12 xl:col-span-8 " + (opening.large && opening.mode !== "photo" ? "h-[62svh] sm:h-[66svh]" : "h-[52svh] sm:h-[58svh]")}>
          {opening.mode === "photo" ? (
            <>
              <MediaView item={piece.cover} alt={piece.cover.alt ?? piece.title} fit="contain" priority sizes="(max-width: 1023px) 75vw, 66vw" />
              {/* The effect of its world on the piece, over its photo (the same frame as the photo). */}
              {jewel ? (
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 px-6 pt-20 sm:px-12 lg:px-16 desk:pt-28 lg:pb-12">
                  <span className="relative block h-full w-full">
                    <JewelFx kind={jewel} photo />
                  </span>
                </span>
              ) : null}
            </>
          ) : (
            <Showcase slug={piece.slug} title={piece.title} views={opening.views} jewel={jewel} large={opening.large} xl={opening.xl} />
          )}
        </div>
        {/* The text of the opening: discreet (asked by Yoni, 20/11/2026), so that the jewel shines; the title stays first, the
            buttons stay plain to see (48 px high at least on a phone). */}
        <div data-piece-intro className="w-full px-5 pt-5 pb-8 sm:px-8 lg:order-1 lg:col-span-5 lg:pt-0 lg:pr-0 lg:pb-12 lg:pl-12 xl:col-span-4">
          <div className="flex max-w-sm flex-col gap-5">
            <div data-piece-text className={shadow}>
              {historic ? <p className="eyebrow mb-1">{t.piece.historic}</p> : null}
              <p className="text-base leading-snug text-mist lg:text-[0.875rem]">
                <Link to={"/creations/" + collection.slug} className="eyebrow inline-flex min-h-11 items-center hover:text-white lg:min-h-8">
                  {collectionName}
                </Link>
                <span className="block">{t.common.madeFor(madeFor(cat, piece))}</span>
              </p>
              <h1 id="piece-title" data-u-title className="title-caps mt-2 leading-[1.1] tracking-[0.06em] break-words text-white [text-wrap:balance]">
                {piece.title}
              </h1>
              {piece.line ? <p className="mt-3 text-base leading-relaxed text-bone lg:text-[0.9375rem]">{piece.line}</p> : null}
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <a href={wa} target="_blank" rel="noreferrer" data-want-piece className="inline-flex min-h-12 items-center justify-center gap-2.5 bg-white px-5 text-base font-medium tracking-[0.04em] text-ink transition-colors hover:bg-rose-light lg:min-h-10 lg:px-4 lg:text-[0.8125rem]">
                <BrandIcon name="whatsapp" className="size-4.5" /> {t.piece.want}
              </a>
              {film ? (
                <a href="#piece-film" data-watch-film className="inline-flex min-h-12 items-center justify-center gap-2.5 border border-white/35 px-5 text-base font-normal tracking-[0.04em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-10 lg:px-4 lg:text-[0.8125rem]">
                  <Play className="size-3.5 fill-current" aria-hidden="true" /> {t.films.watch}
                </a>
              ) : null}
              {model ? (
                <a href="#piece-3d-viewer" data-see-3d className="inline-flex min-h-12 items-center justify-center gap-2.5 border border-rose-light/70 px-5 text-base font-normal tracking-[0.04em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-10 lg:px-4 lg:text-[0.8125rem]">
                  <Rotate3d className="size-4.5" aria-hidden="true" /> {t.viewer.see}
                </a>
              ) : (
                <a href="#piece-details" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/35 px-5 text-base font-normal tracking-[0.04em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-10 lg:px-4 lg:text-[0.8125rem]">
                  {t.piece.details} <ArrowDown className="size-4" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
          <Link to="/creations" className="mt-3 inline-flex min-h-12 items-center gap-2 text-base text-mist hover:text-rose-light lg:min-h-10 lg:text-[0.875rem]">
            <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" /> {t.common.allCreations}
          </Link>
        </div>
      </section>

      {/* 2. The film of the finished piece: it plays by itself, silent, in a loop, as soon as it is on screen; whole in the
          screen, never cut; its sound and full screen at small buttons. */}
      {film ? (
        <FeatureFilm film={film.data} id="piece-film-title" anchor="piece-film" data={piece.slug} label={film.label} eyebrow={film.eyebrow} title={film.title} compact>
          {film.text ? <p className="mt-4 max-w-md text-base leading-relaxed text-bone">{film.text}</p> : null}
        </FeatureFilm>
      ) : null}

      {/* 3. Every Angle: four photos, the strongest first, then the others (src/components/EveryAngle.tsx). */}
      <div id="piece-details" className="scroll-mt-32">
        <EveryAngle piece={piece} items={anglePhotos(piece, opening.mode === "photo", wornSrcs)} />
      </div>

      {model ? <Piece3D piece={piece} model={model} /> : null}

      {/* 4. The story of the piece, the vision behind it: always here, right after what is seen. */}
      <section aria-labelledby="piece-story-title" data-piece-story className="mx-auto max-w-[1240px] border-t border-white/10 px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="max-w-2xl">
          <h2 id="piece-story-title" className="eyebrow">{t.piece.story}</h2>
          <StoryText story={piece.story} />
          <WornWith slug={piece.slug} />
        </div>
      </section>

      {piece.details.length > 0 ? <DetailsSection piece={piece} model={model} /> : null}

      {/* 5. Composition & Craftsmanship: small and plain, a title and one short line for each, only the lines that are filled
          (the weight of the gold, the carats... come from Yoni, piece by piece: never a figure made up). */}
      {specs.length > 0 ? (
        <section aria-labelledby="sheet-title" data-composition className="mx-auto max-w-[1240px] border-t border-white/10 px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
          <h2 id="sheet-title" className="eyebrow">{t.piece.sheet}</h2>
          <dl className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {specs.map((s) => (
              <div key={s.label} data-spec={s.row === SEEN_LABEL ? "seen" : undefined} className="border-t border-white/12 pt-3">
                <dt className="text-[0.75rem] font-normal uppercase tracking-[0.2em] text-mist max-md:text-base max-md:tracking-[0.12em]">{t.piece.composition[s.label] ?? s.label}</dt>
                <dd className="mt-1 text-base leading-snug text-white lg:text-[0.9375rem]">{s.value}</dd>
              </div>
            ))}
          </dl>
          {/* What the photos show, written before the jeweller confirms it: said as such while the piece is a draft. */}
          {piece.draft && seenRow ? <p data-seen-note className="mt-4 text-base text-mist">{t.piece.seenNote}</p> : null}
        </section>
      ) : null}

      {/* 6. The rest, in the same order on every piece: made for, worn by, its trunk, its making-of, the press, the order. */}
      <section aria-labelledby="made-for-title" data-made-for className="mx-auto max-w-[1240px] border-t border-white/10 px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
          <h2 id="made-for-title" className="eyebrow">{t.piece.madeFor}</h2>
          {people.length > 0 ? (
            <ul className="mt-6 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:gap-x-12">
              {people.slice(0, 3).map((person) => {
                const portrait = portraitOf(cat, person);
                const stories = storiesOf(cat, person.slug);
                // Their other piece, when they have one other than this one; else their page (21/11/2026).
                const href = personHref(cat, person);
                // A club with its official logo (src/lib/clubs.ts): the logo, in the light of the universe of the piece.
                const logo = person.kind === "club" ? clubLogo(person.slug) : null;
                return (
                  <li key={person.slug} className="flex items-center gap-5">
                    {logo ? (
                      <Link to={href} data-club-logo={person.slug} className="club-emblem relative block size-16 shrink-0 sm:size-20" aria-label={person.name}>
                        <span aria-hidden="true" className="club-emblem-halo absolute -inset-5 rounded-full" />
                        <span className="relative flex h-full w-full items-center justify-center rounded-full bg-rose-gold p-[2px]">
                          <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-ink bg-ink p-2.5">
                            <img src={logo} alt="" width={840} height={840} loading="lazy" decoding="async" className="h-full w-full object-contain" />
                          </span>
                        </span>
                      </Link>
                    ) : (
                      <Link to={href} className="block size-16 shrink-0 overflow-hidden rounded-full bg-rose-gold p-[2px]" aria-label={person.name}>
                        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-ink-soft">
                          {portrait ? <Img src={portrait} srcSet={coverSrcSet(portrait)} sizes="64px" alt="" loading="lazy" className="h-full w-full object-cover" /> : <span aria-hidden="true" className="font-display text-xl text-white">{initials(person.name)}</span>}
                        </span>
                      </Link>
                    )}
                    <div className="min-w-0">
                      <Link to={href} data-made-for-person={person.slug} className="inline-flex min-h-12 items-baseline gap-2 font-display t-sub uppercase tracking-[0.06em] text-white hover:text-rose-light">
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
            <p className="mt-6 font-display t-sub uppercase tracking-[0.06em] text-white">{madeFor(cat, piece)}</p>
          )}
          {seenIn.length > 0 ? (
            <button
              type="button"
              data-seen-in-stories
              onClick={() => openStories(seenIn)}
              className="mt-8 inline-flex min-h-12 items-center gap-3 border border-white/35 px-5 text-base font-normal uppercase tracking-[0.14em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-10 lg:text-[0.8125rem]"
            >
              <Play className="size-4 fill-current" aria-hidden="true" /> {t.piece.seenInStories}
            </button>
          ) : null}
        </section>

      {/* "Worn by" (Yoni, 23/11/2026): the same block on every piece that has photos worn, held or handed over. */}
      {worn.length > 0 ? (
        <section aria-labelledby="handover-title" data-worn-by className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <h2 id="handover-title" className="title-caps t-title tracking-[0.12em]">
            {t.piece.wornBy(wornName)}
          </h2>
          <ul className={"mt-8 grid gap-3 sm:gap-5 " + (worn.length > 1 ? "grid-cols-2 lg:grid-cols-4" : "max-w-sm")}>
            {worn.map((m, i) => (
              <li key={m.src}>
                <Reveal>
                  <button type="button" onClick={() => setWornOpen(i)} className="group block w-full cursor-zoom-in text-start" aria-label={t.gallery.open(m.alt ?? piece.title)}>
                    <span className="block aspect-[4/5] overflow-hidden bg-ink-soft">
                      <MediaView item={m} fit="cover" sizes="(max-width: 1023px) 46vw, 18rem" className="transition-transform duration-[1.2s] group-hover:scale-[1.03]" />
                    </span>
                  </button>
                </Reveal>
              </li>
            ))}
          </ul>
          {wornOpen !== null ? createPortal(<Lightbox items={worn.map((m) => ({ ...m, caption: undefined }))} index={wornOpen} onIndex={setWornOpen} onClose={() => setWornOpen(null)} />, document.body) : null}
        </section>
      ) : null}

      {/* Its trunk (Yoni, 23/11/2026): all its photos, whole; the way to it on the page of the trunks when it opens there. */}
      {box ? <BoxSection boxes={[box]} title={box.name} id="piece-trunk" /> : null}

      {/* Its making-of, in The Atelier, where it starts at once (the cinema window lives there only). */}
      {inAtelier ? (
        <section aria-labelledby="enter-atelier-title" data-enter-atelier className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-end lg:px-12 lg:py-16">
            <div>
              <p className="eyebrow">{t.films.eyebrow}</p>
              <h2 id="enter-atelier-title" className="title-caps t-title mt-3 tracking-[0.12em]">{t.films.enter}</h2>
              <p className="mt-3 max-w-xl text-base text-bone">{t.films.lead(piece.title, false)}</p>
            </div>
            <Link to={"/atelier?piece=" + piece.slug} data-enter-atelier-link className="inline-flex min-h-12 shrink-0 items-center gap-3 border border-rose-light/70 px-6 text-base font-normal uppercase tracking-[0.14em] text-white transition-colors hover:bg-rose-light hover:text-ink lg:min-h-11 lg:text-[0.8125rem]">
              {t.films.enter} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : null}

        {press.length > 0 ? (
          <section id="press" aria-labelledby="piece-press-title" data-piece-press className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
            <h2 id="piece-press-title" className="eyebrow">{t.piece.press}</h2>
            <ul className="mt-5 grid border-t border-white/15 md:grid-cols-2 md:gap-x-10">
              {press.map((p) => (
                <li key={p.outlet + p.title} className="border-b border-white/15 py-5">
                  <div className="flex items-start gap-5">
                    {p.image ? <Img src={p.image} alt={t.piece.pressAlt(p.outlet)} loading="lazy" className="h-28 w-20 shrink-0 object-cover object-top" /> : <Newspaper className="mt-1 size-5 shrink-0 text-rose-light" aria-hidden="true" />}
                    <div>
                      <p className="text-base font-medium uppercase tracking-[0.16em] text-rose-light">{p.outlet}</p>
                      {p.date ? <p className="mt-1 text-base text-mist"><time dateTime={p.date}>{pressDate(p.date, intl)}</time></p> : null}
                      <p lang={p.lang} className="mt-2 text-base text-white">{p.title}</p>
                      {p.url ? (
                        <a href={p.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-12 items-center gap-2 text-base font-medium text-white underline-offset-4 hover:text-rose-light hover:underline">
                          {t.common.readArticle} <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

      {similar.length > 0 ? (
        <section aria-labelledby="similar-title" data-similar className="border-t border-white/10">
          <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">{t.piece.similar}</p>
                <h2 id="similar-title" className="title-caps mt-5 t-title tracking-[0.12em]">
                  {t.piece.more(collectionName)}
                </h2>
              </div>
              <Link to={"/creations/" + collection.slug} className="inline-flex min-h-12 items-center gap-2 text-base font-medium uppercase tracking-[0.2em] text-white hover:text-rose-light">
                {t.piece.theCollection} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </div>
            <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
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
        <div className="mx-auto flex max-w-[1240px] flex-col items-start gap-8 px-5 py-16 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-20">
          <div className="max-w-3xl">
            <p className="eyebrow">{t.common.yourPiece}</p>
            <h2 id="want-title" className="title-caps mt-5 t-title tracking-[0.1em] [text-wrap:balance]">
              {t.piece.ctaTitle}
            </h2>
            <p className="mt-6 max-w-xl text-base text-bone">{t.piece.ctaText}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={wa} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-3 bg-white px-6 text-base font-medium uppercase tracking-[0.12em] text-ink transition-colors hover:bg-rose-light lg:min-h-11 lg:text-[0.8125rem]">
              <BrandIcon name="whatsapp" className="size-5" /> {t.piece.want}
            </a>
            <Link to="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/35 px-6 text-base font-normal uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-11 lg:text-[0.8125rem]">
              {t.piece.otherWays}
            </Link>
          </div>
        </div>
      </section>

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
      <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <p className="eyebrow">{t.piece.detailsEyebrow}</p>
        <h2 id="details-title" className="title-caps mt-5 t-title tracking-[0.12em]">
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
        <ol className="mt-10 grid gap-x-10 gap-y-9 border-t border-white/12 pt-9 md:grid-cols-2 xl:grid-cols-3">
          {piece.details.map((d, i) => {
            const index = d.photo ? photos.findIndex((m) => m.src === d.photo) : -1;
            const photo = index >= 0 ? photos[index] : undefined;
            return (
              <li key={d.title + i} data-detail={i + 1} className="flex gap-5">
                <span className="text-rose-gold w-8 shrink-0 font-display text-xl leading-none">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="title-caps t-sub leading-tight tracking-[0.08em] text-white">{d.title}</h3>
                  <p className="mt-2 text-base text-bone lg:text-[0.9375rem]">{d.text}</p>
                  {photo ? (
                    <button
                      type="button"
                      data-detail-photo
                      onClick={() => setOpen(index)}
                      aria-label={t.piece.seePhoto + " · " + d.title}
                      className="group mt-5 flex min-h-12 items-center gap-4 text-start text-base font-medium text-white hover:text-rose-light"
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
 * The text of a piece: its paragraphs; the titles of its parts ("## " in the text) and its closing words set apart as a
 * quote ("> "), in the style of the quotes of the house (src/data/story.ts).
 */
function StoryText({ story }: { story: string }) {
  const { t } = useI18n();
  const blocks = storyBlocks(story);
  // The number of each paragraph among the paragraphs.
  const numbers = blocks.map((_, i) => blocks.slice(0, i + 1).filter((x) => x.kind === "paragraph").length);
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === "title")
          return (
            <h3 key={i} data-story-title className="title-caps mt-10 flex items-center gap-4 t-sub leading-[1.25] tracking-[0.1em] text-white first:mt-6 [text-wrap:balance]">
              <span aria-hidden="true" className="rule-rose w-10 shrink-0" />
              {b.text}
            </h3>
          );
        if (b.kind === "quote")
          return (
            <figure key={i} data-story-quote className="mt-10 border-t border-white/12 pt-8">
              <blockquote>
                <p className="font-display t-lead font-light italic leading-[1.2] text-white [text-wrap:balance]">{t.about.quoted(b.text)}</p>
              </blockquote>
              <span aria-hidden="true" className="rule-rose mt-8 block w-12" />
            </figure>
          );
        return (
          <p key={i} data-story-paragraph={numbers[i]} className="mt-5 max-w-2xl text-base leading-relaxed whitespace-pre-line text-bone lg:text-[0.9375rem]">
            {b.text}
          </p>
        );
      })}
    </>
  );
}

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
        <span className="mt-1 inline-flex min-h-12 items-center gap-2 text-base font-medium uppercase tracking-[0.16em] text-rose-light transition-colors group-hover:text-white">
          {t.common.enterWorld} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
