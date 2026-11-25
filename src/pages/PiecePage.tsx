import { useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router";
import { ArrowRight, ArrowUpRight, Newspaper, ZoomIn } from "lucide-react";
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
import Universe, { universeProps } from "@/components/Universe";
import { defaultCatalogue } from "@/data/catalogue";
import { collectionOf } from "@/data/collections";
import { OLD_SEEN_LABEL, partOf, RENAMED_PIECES, SEEN_LABEL, SIGNATURE_PIECES, wornWith } from "@/data/pieces";
import { findPiece, initials, peopleOf, personHref, portraitOf, removedPieceTarget, similarPieces } from "@/data/relations";
import { resolveAtelier, resolveReveal } from "@/data/atelier";
import { completeMakingOf, makingSteps } from "@/data/making";
import { pointsFor } from "@/data/details3d";
import type { PublicModel } from "@/data/models";
import { pieceMediaOf } from "@/data/pageMedia";
import { resolveShowcase } from "@/data/showcase";
import { pressOfPiece } from "@/data/press";
import { storyBlocks } from "@/data/story";
import { jewelOf, resolveTheme } from "@/data/themes";
import type { MediaItem, Piece } from "@/data/types";
import { listOf } from "@/i18n/format";
import { collectionWords, Link, Navigate, useI18n, useMadeFor } from "@/i18n";
import { useCatalogue, useLocalizedPiece, useRawCatalogue } from "@/lib/catalogue";
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
  const piece = findPiece(cat, slug);
  // The 3D model the jeweller attached to this piece, if any: shown right under its photos.
  const model = usePieceModel(piece?.slug ?? slug);
  // A part of the piece worn on its own (the top of the Inter ring, the chain of a pendant), in the language of the page.
  const partPiece = useLocalizedPiece(piece ? partOf(piece.slug)?.slug : null);
  // The film of the finished piece (Yoni, 24/11/2026): right after the opening, it plays by itself, silent, in a loop.
  const reveal = piece ? resolveReveal(piece.slug, piece.atelier) : null;
  const [wornOpen, setWornOpen] = useState<number | null>(null);
  if (!piece) {
    // A renamed piece leads to its new address (a piece become part of another: to its place on that page); an unpublished
    // one to its player, else to the creations.
    const target = RENAMED_PIECES[slug] ? "/pieces/" + RENAMED_PIECES[slug] : removedPieceTarget(defaultCatalogue, slug);
    return target ? <Navigate to={target} replace /> : <NotFound />;
  }

  const collection = collectionOf(piece.type);
  const collectionName = collectionWords(t, collection.slug, collection).name;
  const people = peopleOf(cat, piece);
  const box = piece.boxSlug ? cat.boxes.find((b) => b.slug === piece.boxSlug) : undefined;
  const similar = similarPieces(cat, piece, 4);
  const wa = waLink(t.whatsapp.piece(piece.title));
  // Who it was made for, when the house may name them; a chain of the house is "A Berete Signature" (24/11/2026).
  const who = madeFor(cat, piece);
  const named = who !== t.common.privateCollector;
  const signature = SIGNATURE_PIECES.includes(piece.slug);
  // The rows of the sheet by their English label (the page shows them translated): the row "Precious Materials" says what the photos show.
  const sheetRows = (raw.pieces.find((p) => p.slug === piece.slug)?.specs.map((s) => s.label) ?? []).map((l) => (l === OLD_SEEN_LABEL ? SEEN_LABEL : l));
  const seenRow = sheetRows.includes(SEEN_LABEL);
  const feature = featureFilmOf(piece.slug);

  const theme = resolveTheme(piece.theme);
  // The effect of its universe on the piece itself (a reflection, sparkles, a halo...).
  const jewel = jewelOf(theme.effects);
  // The jewel of the opening: cut out, in one view or a showcase of several; else its photo.
  const opening = resolveShowcase(piece.slug, piece.showcase);
  // Its atelier (its making-of): in The Atelier, where the cinema window lives.
  const atelier = resolveAtelier(piece.slug, piece.atelier);

  // The film of the finished piece (Yoni, 24/11/2026): one film, the one made for the page when it has one (the Dragon Ball
  // pendant, the cross of Malik Tillman that turns: "The Mechanism"), else its film of the finished piece ("The Finished
  // Piece"). A 3D animation is never shown as the finished piece (its reveal is set to none: src/data/pieces.ts). No film: no
  // section.
  const film: { data: FeatureFilmData; title: string; label: string; text?: string } | null = feature
    ? feature.kind === "film"
      ? { data: feature.film, title: t.feature.mechanism, label: t.feature.dragonLabel, text: t.feature.dragonLine }
      : { data: feature.film, title: t.feature.mechanism, label: t.feature.crossLabel, text: t.feature.crossText }
    : reveal
      ? {
          data: { video: reveal.film.src, mobile: reveal.film.mobile, poster: reveal.poster, width: reveal.film.width, height: reveal.film.height, audio: reveal.film.audio },
          title: t.films.pieceSection,
          label: t.films.intro(piece.title),
        }
      : null;

  // One photo, one film, once on the page (24/11/2026): what the opening shows, the film above, its trunk, the photos of the
  // part worn apart (the top of the Inter ring, the chain of a pendant) never come back in Every Angle nor among the photos
  // where it is worn (src/data/pageMedia.ts).
  const part = partOf(piece.slug);
  const { partPhotos, angles, worn } = pieceMediaOf(piece, {
    raw: raw.pieces.find((p) => p.slug === piece.slug),
    box,
    part: part && partPiece ? { piece: partPiece, photos: part.photos } : null,
    opening,
  });
  // Its press (Yoni, 23/11/2026): the articles of the page Press that tell it, then those the admin gave it with their link;
  // an article without its link is not shown.
  const press: { outlet: string; title: string; url: string; image?: string | null; date?: string; lang?: string }[] = [
    ...pressOfPiece(piece.slug),
    ...piece.press.filter((p): p is typeof p & { url: string } => Boolean(p.url) && !pressOfPiece(piece.slug).some((a) => a.url === p.url)),
  ];
  // Its making-of lives in The Atelier (Yoni, 24/11/2026): a way there when it has one (its film, or the photos of its steps).
  const inAtelier = Boolean(atelier || completeMakingOf(piece.slug, piece.atelier) || makingSteps(piece, box?.images[0]).length > 0);
  // The lines of its composition that are filled (the others never show).
  const specs = piece.specs.map((s, i) => ({ ...s, row: sheetRows[i] })).filter((s) => s.value.trim() !== "");
  // Its sentence under the title, unless its story already says it (the last words of the Dragon Ball pendant): once.
  const storyTexts = storyBlocks(piece.story).map((b) => b.text.trim());
  const line = piece.line && !storyTexts.some((x) => x.includes(piece.line.trim().replace(/[.!]+$/, ""))) ? piece.line : "";

  return (
    // The page of each piece is its own element (key): entering another piece is entering another world, with its
    // entrance (data-entering, removed on a return: src/components/Universe.tsx). The same order on every piece (Yoni,
    // 24/11/2026): the piece in its world, its film, Every Angle, Behind the Creation, its composition, who it was created
    // for (and the photos where it is worn), its trunk, the way to its making-of in The Atelier, one closing block.
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
          is positioned, so it is drawn over it; no isolation, so the full-screen layers (photos, 3D) still come over the menu. */}
      <Universe theme={theme} slug={piece.slug} />
      {/* 1. The piece in its world, whole in the first screen. */}
      <section aria-labelledby="piece-title" data-piece-opening data-piece-section="opening" className="relative flex flex-col overflow-hidden lg:grid lg:min-h-[min(100svh,60rem)] lg:grid-cols-12 lg:items-end">
        {/* The jewel: the top of the screen on phones, the right of the screen on computers; behind it a calm dark light
            (.piece-calm): its universe never takes over the piece (Yoni, 23/11/2026). */}
        <div data-piece-cover className={"piece-calm relative shrink-0 px-6 pt-20 sm:px-12 lg:order-2 lg:col-span-7 lg:h-[min(100svh,60rem)] lg:px-16 desk:pt-28 lg:pb-12 xl:col-span-8 " + (opening.large && opening.mode !== "photo" ? "h-[62svh] sm:h-[66svh]" : "h-[52svh] sm:h-[58svh]")}>
          {opening.mode === "photo" ? (
            <>
              <MediaView item={piece.cover} alt={piece.cover.alt ?? piece.title} fit="contain" priority sizes="(max-width: 1023px) 75vw, 66vw" />
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
        {/* Its words, discreet (Yoni, 20/11/2026), so that the jewel shines: one small label (its collection), its name, its
            sentence, then the two buttons of the house. */}
        <div data-piece-intro className="w-full px-5 pt-5 pb-8 sm:px-8 lg:order-1 lg:col-span-5 lg:pt-0 lg:pr-0 lg:pb-12 lg:pl-12 xl:col-span-4">
          <div className="flex max-w-sm flex-col gap-6">
            <div data-piece-text className={shadow}>
              <Link to={"/creations/" + collection.slug} data-piece-eyebrow className="eyebrow inline-flex min-h-11 items-center hover:text-white lg:min-h-8">
                {collectionName}
              </Link>
              <h1 id="piece-title" data-u-title className="title-caps mt-2 leading-[1.15] tracking-[0.08em] break-words text-white [text-wrap:balance]">
                {piece.title}
              </h1>
              {line ? <p className="mt-3 text-base leading-relaxed text-bone">{line}</p> : null}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-7">
              <Link to={"/contact?piece=" + piece.slug} data-cta data-want-piece className="btn-primary">
                {t.common.startPiece}
              </Link>
              <a href={wa} target="_blank" rel="noreferrer" data-cta data-piece-whatsapp className="btn-secondary">
                <BrandIcon name="whatsapp" className="size-4" /> {t.common.whatsapp}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. The Finished Piece (or The Mechanism): it plays by itself, silent, in a loop, as soon as it is on screen; whole in
          the screen, never cut; its sound and full screen at small buttons. */}
      {film ? (
        <FeatureFilm film={film.data} id="piece-film-title" anchor="piece-film" data={piece.slug} label={film.label} title={film.title} compact>
          {film.text ? <p className="mt-4 max-w-md text-base leading-relaxed text-bone">{film.text}</p> : null}
        </FeatureFilm>
      ) : null}

      {/* 3. Every Angle: four photos, the strongest first, never one the opening already shows; then See More. */}
      <div id="piece-details" className="scroll-mt-32">
        <EveryAngle piece={piece} items={angles} />
      </div>

      {model ? <Piece3D piece={piece} model={model} /> : null}

      {/* 4. Behind the Creation: its story, right after what is seen. */}
      <section aria-labelledby="piece-story-title" data-piece-story data-piece-section="story" className="wrap border-t border-white/10 py-16 lg:py-20">
        <div className="max-w-2xl">
          <h2 id="piece-story-title" className="title-caps tracking-[0.12em] t-title ">{t.piece.story}</h2>
          <StoryText story={piece.story} />
          <WornWith slug={piece.slug} />
        </div>
      </section>

      {piece.details.length > 0 ? <DetailsSection piece={piece} model={model} /> : null}

      {/* The part of the piece worn on its own (the top of the Inter ring, worn as a pendant): here, never a piece apart. */}
      {part && partPiece && partPhotos.length > 0 ? <WornAs piece={partPiece} photos={partPhotos} anchor={part.anchor} title={part.kind === "chain" ? t.piece.itsChain : t.piece.wornAsPendant} /> : null}

      {/* 5. Composition & Craftsmanship: small and plain, one short line each, only the lines that are filled (the weight of
          the gold, the carats... come from Yoni, piece by piece: never a figure made up). */}
      {specs.length > 0 ? (
        <section aria-labelledby="sheet-title" data-composition data-piece-section="composition" className="wrap border-t border-white/10 py-14 lg:py-16">
          <h2 id="sheet-title" className="title-caps tracking-[0.12em] t-title ">{t.piece.sheet}</h2>
          <dl className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {specs.map((s) => (
              <div key={s.label} data-spec={s.row === SEEN_LABEL ? "seen" : undefined} className="border-t border-white/12 pt-3">
                <dt className="text-[0.75rem] font-normal uppercase tracking-[0.2em] text-mist max-md:text-base max-md:tracking-[0.12em]">{t.piece.composition[s.label] ?? s.label}</dt>
                <dd className="mt-1 text-base leading-snug text-white">{s.value}</dd>
              </div>
            ))}
          </dl>
          {/* What the photos show, written before the jeweller confirms it: said as such while the piece is a draft. */}
          {piece.draft && seenRow ? <p data-seen-note className="mt-4 text-base text-mist">{t.piece.seenNote}</p> : null}
        </section>
      ) : null}

      {/* 6. Created exclusively for…: one section (24/11/2026) for whom it was made and the photos where it is worn; a chain of
          the house is "A Berete Signature"; a piece without a name, "a private collector", said once. */}
      <section aria-labelledby="made-for-title" data-made-for data-piece-section="created-for" className="wrap border-t border-white/10 py-14 lg:py-16">
        <h2 id="made-for-title" className="title-caps tracking-[0.12em] t-title [text-wrap:balance]">
          {signature ? t.common.signature : t.common.madeFor(who, piece.type)}
        </h2>
        {signature ? <p className="mt-4 max-w-xl text-base text-bone">{t.common.signatureText}</p> : null}
        {named && people.length > 0 ? (
          <ul className="mt-8 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:gap-x-12">
            {people.slice(0, 3).map((person) => {
              const portrait = portraitOf(cat, person);
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
                          <img src={logo} alt={t.players.logoOf(person.name)} width={840} height={840} loading="lazy" decoding="async" className="h-full w-full object-contain" />
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <Link to={href} className="block size-16 shrink-0 overflow-hidden rounded-full bg-rose-gold p-[2px]" aria-label={person.name}>
                      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-ink-soft">
                        {portrait ? <Img src={portrait} srcSet={coverSrcSet(portrait)} sizes="64px" alt={t.players.portrait(person.name)} loading="lazy" className="h-full w-full object-cover" /> : <span aria-hidden="true" className="font-display text-xl text-white">{initials(person.name)}</span>}
                      </span>
                    </Link>
                  )}
                  <div className="min-w-0">
                    <Link to={href} data-made-for-person={person.slug} className="inline-flex min-h-11 items-baseline gap-2 font-display t-sub uppercase tracking-[0.06em] text-white hover:text-rose-light">
                      {person.number !== null ? <span className="text-rose-gold text-lg">{person.number}</span> : null}
                      {person.name}
                    </Link>
                    <p>
                      <Link to={"/players/" + person.slug} data-cta className="btn-secondary text-mist">
                        {t.piece.theProfile} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
                      </Link>
                    </p>
                  </div>
                </li>
              );
            })}
            {people.length > 3 ? <li className="text-base text-mist">{t.piece.andOthers(listOf(intl, people.slice(3).map((p) => p.name)))}</li> : null}
          </ul>
        ) : null}
        {/* The photos where it is worn, held, handed over: under the one it was made for. */}
        {worn.length > 0 ? (
          <ul data-worn-by className={"mt-10 grid gap-3 sm:gap-5 " + (worn.length > 1 ? "grid-cols-2 lg:grid-cols-4" : "max-w-sm")}>
            {worn.map((m, i) => (
              <li key={m.src}>
                <Reveal>
                  <button type="button" onClick={() => setWornOpen(i)} className="block w-full cursor-zoom-in text-start" aria-label={t.gallery.open(m.alt ?? piece.title)}>
                    <span className="block aspect-[4/5] overflow-hidden bg-ink-soft">
                      <MediaView item={m} alt={m.alt ?? t.piece.wornAlt(piece.title)} fit="cover" sizes={worn.length > 1 ? "(max-width: 1023px) 46vw, 18rem" : "(max-width: 639px) 92vw, 24rem"} frame={4 / 5} />
                    </span>
                  </button>
                </Reveal>
              </li>
            ))}
          </ul>
        ) : null}
        {wornOpen !== null ? createPortal(<Lightbox items={worn.map((m) => ({ ...m, caption: undefined }))} index={wornOpen} onIndex={setWornOpen} onClose={() => setWornOpen(null)} />, document.body) : null}
      </section>

      {/* 7. The Trunk: all its photos, whole; the way to it on the page of the trunks when it opens there. */}
      {box ? <BoxSection boxes={[box]} title={t.piece.trunk} id="piece-trunk" /> : null}

      {/* 8. Its making-of, in The Atelier, where it starts at once (the cinema window lives there only): one line, one link. */}
      {inAtelier ? (
        <section aria-label={t.films.enter} data-enter-atelier data-piece-section="atelier" className="border-t border-white/10">
          <div className="wrap flex flex-col items-start gap-3 py-10 sm:flex-row sm:items-center sm:justify-between lg:py-12">
            <p className="max-w-xl text-base text-bone">{t.films.lead(piece.title, false)}</p>
            <Link to={"/atelier?piece=" + piece.slug} data-cta data-enter-atelier-link className="btn-secondary shrink-0">
              {t.films.enter} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : null}

      {press.length > 0 ? (
        <section id="press" aria-labelledby="piece-press-title" data-piece-press data-piece-section="press" className="wrap border-t border-white/10 py-14 lg:py-16">
          <h2 id="piece-press-title" className="title-caps tracking-[0.12em] t-title ">{t.piece.press}</h2>
          <ul className="mt-6 grid border-t border-white/15 md:grid-cols-2 md:gap-x-10">
            {press.map((p) => (
              <li key={p.outlet + p.title} className="border-b border-white/15">
                <a href={p.url} target="_blank" rel="noreferrer" className="group flex items-start gap-5 py-5">
                  {p.image ? <Img src={p.image} alt={t.piece.pressAlt(p.outlet)} loading="lazy" className="h-28 w-20 shrink-0 object-cover object-top" /> : <Newspaper className="mt-1 size-5 shrink-0 text-rose-light" aria-hidden="true" />}
                  <span className="block">
                    <span className="block text-base font-medium uppercase tracking-[0.16em] text-rose-light lg:text-[0.75rem]">{p.outlet}</span>
                    {p.date ? <span className="mt-1 block text-base text-mist"><time dateTime={p.date}>{pressDate(p.date, intl)}</time></span> : null}
                    <span lang={p.lang} className="mt-2 flex items-start gap-2 text-base text-white transition-colors group-hover:text-rose-light">
                      {p.title} <ArrowUpRight className="mt-1 size-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 9. One closing block: the invitation to begin, then other creations and the way back to all of them. */}
      <section aria-labelledby="want-title" data-piece-end data-piece-section="end" className="border-t border-white/10 bg-black/35">
        <div className="wrap py-16 lg:py-20">
          <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 id="want-title" className="title-caps tracking-[0.12em] t-title [text-wrap:balance]">{t.piece.ctaTitle}</h2>
              <p className="mt-5 max-w-xl text-base text-bone">{t.piece.ctaText}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-x-7">
              <Link to={"/contact?piece=" + piece.slug} data-cta className="btn-primary">
                {t.common.startPiece}
              </Link>
              <a href={wa} target="_blank" rel="noreferrer" data-cta className="btn-secondary">
                <BrandIcon name="whatsapp" className="size-4" /> {t.common.whatsapp}
              </a>
            </div>
          </div>
          {similar.length > 0 ? (
            <div data-similar className="mt-14 border-t border-white/10 pt-12 lg:mt-16">
              <ul className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
                {similar.map((p, i) => (
                  <li key={p.slug}>
                    <Reveal delay={i * 0.08}>
                      <PieceCard piece={p} />
                    </Reveal>
                  </li>
                ))}
              </ul>
              <Link to="/creations" data-cta className="btn-secondary mt-8">
                {t.common.allCreations} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </article>
  );
}

/**
 * A part of the piece worn on its own (24/11/2026: "une pièce = une page"): the top of the Inter ring, worn as a pendant, with
 * its photos (on black, and worn) and its words. Its old address leads here (RENAMED_PIECES).
 */
function WornAs({ piece, photos, anchor, title }: { piece: Piece; photos: MediaItem[]; anchor: string; title: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const words = storyBlocks(piece.story).filter((b) => b.kind === "paragraph");
  return (
    <section id={anchor} aria-labelledby={anchor + "-title"} data-worn-as={piece.slug} data-piece-section="worn-as" className="wrap scroll-mt-28 border-t border-white/10 py-14 lg:py-16">
      <h2 id={anchor + "-title"} className="title-caps tracking-[0.12em] t-title ">{title}</h2>
      {words.map((w, i) => (
        <p key={i} className="mt-4 max-w-2xl text-base leading-relaxed text-bone">{w.text}</p>
      ))}
      <ul className={"mt-8 grid grid-cols-2 gap-3 sm:gap-5 " + (photos.length > 2 ? "lg:grid-cols-4" : "max-w-2xl")}>
        {photos.map((m, i) => (
          <li key={m.src}>
            <button type="button" onClick={() => setOpen(i)} className="block w-full cursor-zoom-in" aria-label={t.gallery.open(m.alt ?? piece.title)}>
              <span className="block aspect-[4/5] overflow-hidden bg-ink">
                <MediaView item={m} alt={m.alt ?? piece.title} fit={m.onBlack === false ? "cover" : "contain"} sizes="(max-width: 1023px) 46vw, 20rem" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null ? createPortal(<Lightbox items={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
    </section>
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
    <section aria-labelledby="details-title" data-details data-piece-section="details" className="border-t border-white/10">
      <div className="wrap py-16 lg:py-20">
        <h2 id="details-title" className="title-caps tracking-[0.12em] t-title ">
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
        {/* Each detail and what it stands for; one shown by a photo of the piece opens it full screen from its title (the
            photo itself is not shown again here: each photo once on the page). */}
        <ol className="mt-10 grid gap-x-10 gap-y-9 border-t border-white/12 pt-9 md:grid-cols-2 xl:grid-cols-3">
          {piece.details.map((d, i) => {
            const index = d.photo ? photos.findIndex((m) => m.src === d.photo) : -1;
            return (
              <li key={d.title + i} data-detail={i + 1} className="flex gap-5">
                <span className="text-rose-gold w-8 shrink-0 font-display text-xl leading-none">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  {index >= 0 ? (
                    <button type="button" data-detail-photo onClick={() => setOpen(index)} aria-label={t.gallery.open(d.title)} className="group flex items-start gap-2 text-start">
                      <span className="title-caps t-sub leading-tight tracking-[0.08em] text-white transition-colors group-hover:text-rose-light">{d.title}</span>
                      <ZoomIn className="mt-0.5 size-4 shrink-0 text-rose-light" aria-hidden="true" />
                    </button>
                  ) : (
                    <h3 className="title-caps t-sub leading-tight tracking-[0.08em] text-white">{d.title}</h3>
                  )}
                  <p className="mt-2 text-base text-bone">{d.text}</p>
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
          <p key={i} data-story-paragraph={numbers[i]} className="mt-5 max-w-2xl text-base leading-relaxed whitespace-pre-line text-bone">
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
    <Link to={"/pieces/" + other.slug} data-worn-with={other.slug} className="group mt-10 flex max-w-xl items-center gap-5 border border-white/15 bg-ink/60 p-4 transition-colors duration-500 hover:border-rose-light">
      <span className="relative block aspect-[4/5] w-24 shrink-0 overflow-hidden bg-ink sm:w-28">
        <MediaView item={other.cover} alt={other.cover.alt ?? other.title} fit="contain" sizes="112px" />
      </span>
      <span className="min-w-0">
        <span className="eyebrow block">{pair.is === "chain" ? t.piece.wornOn : t.piece.itsPendant}</span>
        <span className="title-caps mt-2 block text-xl leading-snug tracking-[0.06em] break-words text-white transition-colors group-hover:text-rose-light">{other.title}</span>
        <span data-cta className="btn-secondary mt-1 text-rose-light group-hover:text-white">
          {t.common.enterWorld} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
