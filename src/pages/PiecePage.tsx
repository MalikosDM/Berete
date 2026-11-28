import { Fragment, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router";
import { ArrowRight, ArrowUpRight, Newspaper } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import MagazineGallery from "@/components/MagazineGallery";
import { Lightbox } from "@/components/HorizontalGallery";
import BoxSection from "@/components/BoxSection";
import { Img, MediaView } from "@/components/Media";
import { coverSrcSet } from "@/lib/responsive";
import PieceCard from "@/components/PieceCard";
import Piece3D from "@/components/Piece3D";
import Reveal from "@/components/Reveal";
import Showcase from "@/components/Showcase";
import PieceNav from "@/components/PieceNav";
import { FilmFrame } from "@/components/FeatureFilm";
import { featureFilmOf, PLAY_FROM, type FeatureFilmData } from "@/data/featureFilms";
import { AS_VICTORY, CHAIN_PHOTOS, CIRCLE_EARLIER, CIRCLE_MADE_FOR, CIRCLE_PHOTO, EARLIER_LABEL, DEFAULT_ORDER, HERO_LINES, INTER_BEHIND, INTER_STORY, JERSEY_REVEAL, PAGE_ORDER, PRESENTATION_FIRST, T_EVOLUTION, WORN_ON_NAME, YONI, type PageSection } from "@/data/yoni2711";
import { filmData, YONI_FILMS, YONI_MEDIA } from "@/data/yoniMedia";
import { EXPLAIN } from "@/data/magazine";
import { fileBase } from "@/data/pageMedia";
import JewelFx from "@/components/universe/JewelFx";
import Universe, { universeProps } from "@/components/Universe";
import { defaultCatalogue } from "@/data/catalogue";
import { collectionOf } from "@/data/collections";
import { OLD_SEEN_LABEL, partOf, RENAMED_PIECES, SEEN_LABEL, SIGNATURE_PIECES, wornWith } from "@/data/pieces";
import { findPiece, initials, peopleOf, personHref, portraitOf, removedPieceTarget, similarPieces } from "@/data/relations";
import { resolveAtelier, resolveReveal } from "@/data/atelier";
import { completeMakingOf, makingSteps } from "@/data/making";
import { adminOrdered, magazineOf } from "@/data/magazine";
import openingMasks from "@/data/opening-masks.generated.json" with { type: "json" };
import { pieceMediaOf, sameViewsOf } from "@/data/pageMedia";
import { KeepCase } from "@/lib/pieceName";
import { resolveShowcase } from "@/data/showcase";
import { pressOfPiece } from "@/data/press";
import { storyBlocks, type StoryBlock } from "@/data/story";
import { BACKDROPS, jewelOf, resolveTheme } from "@/data/themes";
import type { MediaItem, Person, Piece, Spec } from "@/data/types";
import { listOf } from "@/i18n/format";
import { collectionWords, Link, Navigate, useContentText, useI18n, useMadeFor } from "@/i18n";
import { useCatalogue, useLocalizedPiece, useRawCatalogue } from "@/lib/catalogue";
import { clubLogo } from "@/lib/clubs";
import { usePieceModel } from "@/lib/models";
import { HAS_SERVER, waLink } from "@/lib/site";
import NotFound from "@/pages/NotFound";
import { pressDate } from "@/pages/Press";

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.8)]";

/** A title whose names never break at their hyphen (« DFB-Pokal », 27/11/2026): each hyphenated word held together. */
/** The pages whose only photo where the piece is worn is a selfie of a phone (Kenan Yıldız, 28/11/2026): kept, small, until a
 *  better one comes. */
const SMALL_WORN = new Set(["kenan-yildiz-celebration-pendant"]);

/** The openings shown as a sharp photo in a fine frame (no clean cut-out possible: the watches on the wrist, 28/11/2026). */
const FRAMED_OPENINGS = new Set(["tajon-buchanan-iced-watch", "radja-nainggolan-iced-watch"]);

function unbroken(title: string): ReactNode {
  // The long dash « — » in the letters of the house (28/11/2026: the font of the watches, Michroma, drew it as a short « - »).
  return title.split(/( — )/).map((chunk, k) =>
    chunk === " — " ? (
      <span key={"d" + k} data-title-dash className="font-display font-normal">
        {" — "}
      </span>
    ) : (
      chunk.split(/(\S+-\S+)/).map((p, i) => (/\S+-\S+/.test(p) ? <span key={k + "-" + i} className="whitespace-nowrap">{p}</span> : p))
    ),
  );
}

/** The soft outline of a photo as its mask, placed as the photo is (whole, centred in its box). */
function outlineMask(src: string): CSSProperties {
  const url = 'url("' + src + '")';
  return { WebkitMaskImage: url, maskImage: url, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskPosition: "center", maskPosition: "center", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" };
}

/** The page of one piece (a "capsule"): /pieces/:slug. */
export default function PiecePage() {
  const { slug = "" } = useParams();
  const { t, intl, locale } = useI18n();
  const tc = useContentText();
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
  // Someone to show under « Created exclusively for … » (a player, a club): else the line goes under the name of the piece.
  const showsPerson = named && people.length > 0;
  // The rows of the sheet by their English label (the page shows them translated). The row "Precious Materials" said what the
  // photos seemed to show, to be confirmed: never shown any more (25/11/2026), only what Yoni gave.
  const sheetRows = (raw.pieces.find((p) => p.slug === piece.slug)?.specs.map((s) => s.label) ?? []).map((l) => (l === OLD_SEEN_LABEL ? SEEN_LABEL : l));
  const feature = featureFilmOf(piece.slug);

  const theme = resolveTheme(piece.theme);
  // Room kept above the piece for what its world holds there (the sphere of the Genkidama v2), as its image asks.
  const below = theme.backdrop ? BACKDROPS[theme.backdrop]?.below : undefined;
  // The effect of its universe on the piece itself (a reflection, sparkles, a halo...).
  const jewel = jewelOf(theme.effects);
  // The jewel of the opening: cut out, in one view or a showcase of several; else its photo (with its soft outline, if made).
  const opening = resolveShowcase(piece.slug, piece.showcase);
  const outline = (openingMasks as Record<string, string>)[piece.cover.src];
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
          data: { video: reveal.film.src, mobile: reveal.film.mobile, poster: reveal.poster, width: reveal.film.width, height: reveal.film.height, audio: reveal.film.audio, start: PLAY_FROM[piece.slug] },
          title: t.films.pieceSection,
          label: t.films.intro(piece.title),
        }
      : null;

  // One photo, one film, once on the page (24/11/2026): what the opening shows, the film above, its trunk, the photos of the
  // part worn apart (the top of the Inter ring, the chain of a pendant) never come back in Every Angle nor among the photos
  // where it is worn (src/data/pageMedia.ts).
  const part = partOf(piece.slug);
  const own = raw.pieces.find((p) => p.slug === piece.slug);
  // The order of the photos Yoni gave in the admin comes first (src/data/magazine.ts).
  const ordered = HAS_SERVER && adminOrdered(own, defaultCatalogue.pieces.find((p) => p.slug === piece.slug));
  const { partPhotos, angles, worn } = pieceMediaOf(piece, {
    ordered,
    raw: own,
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
  const specs = piece.specs
    .map((s, i) => ({ ...s, row: sheetRows[i] }))
    .filter((s) => (s.value.trim() !== "" || isCaps(s.row ?? s.label)) && s.row !== SEEN_LABEL && s.label !== SEEN_LABEL && s.label !== OLD_SEEN_LABEL);
  // The order of its page (Yoni's pages of 26-27/11/2026 have their own: src/data/yoni2711.ts).
  const order: PageSection[] = PAGE_ORDER[piece.slug] ?? DEFAULT_ORDER;
  const yoniPage = Boolean(YONI[piece.slug]);
  // A part shown in a section of its own (the chains of the octagon); else its photos join the others (the crown of the Inter
  // ring worn as a pendant: told in its details, never twice).
  const partApart = order.includes("part");
  const chainFiles = CHAIN_PHOTOS[piece.slug] ?? [];
  const isChain = (m: MediaItem) => chainFiles.length > 0 && m.src.includes("/" + piece.slug + "/") && chainFiles.includes(fileBase(m.src));
  // Its chain in a section of its own (the tennis chain of the AS Pendant): its photos never in Every Angle.
  const chainItems = chainFiles.map((f) => [piece.cover, ...piece.gallery].find((m) => isChain(m) && fileBase(m.src) === f)).filter((m): m is MediaItem => Boolean(m));
  const galleryItems = (partApart ? angles : [...angles, ...partPhotos.filter((m) => !angles.some((x) => x.src === m.src))]).filter((m) => !isChain(m));
  // Photos it may still show beside a detail or first in Every Angle: the photos of its opening, a photo of its chain kept in the
  // folder of the chain (src/data/magazine.ts).
  const foreign = (EXPLAIN[piece.slug] ?? [])
    .filter((e) => e.photo.includes("/"))
    .map((e) => {
      const [folder, file] = e.photo.split("/");
      // In the language of the page when it is published (or the part shown on this page), else as the catalogue has it.
      for (const other of [...(partPiece ? [partPiece] : []), ...cat.pieces, ...defaultCatalogue.pieces]) {
        const m = [other.cover, ...other.gallery].find((x) => x.src.includes("/" + folder + "/") && fileBase(x.src) === file);
        if (m) return m;
      }
      return undefined;
    })
    .filter((m): m is MediaItem => Boolean(m));
  const extra = [piece.cover, ...piece.gallery, ...foreign].filter((m) => m.src && !isChain(m));
  // The story at the top, beside its film: without the sentences told beside the photos of its details (src/data/magazine.ts).
  const mag = magazineOf(piece, own, galleryItems, { lang: locale, ordered, sameViews: sameViewsOf(piece.slug), extra });
  const topStory = mag.story;
  const detailSrcs = new Set(mag.blocks.map((b) => b.item.src));
  // Its sentence under the title, unless its story already says it (the last words of the Dragon Ball pendant): once.
  const storyTexts = storyBlocks(piece.story).map((b) => b.text.trim());
  const line = piece.line && !storyTexts.some((x) => x.includes(piece.line.trim().replace(/[.!]+$/, ""))) ? piece.line : "";
  // The first film of the page is the finished piece, presented (Yoni, 26/11/2026): the final film of the Inter ring.
  // (28/11/2026: the films of Yoni's albums for Samuel Ballet's Jesus Piece, the MT — Nexus Cross and the jersey of Noah Okafor.)
  const yoniFilm = filmData(YONI_FILMS[piece.slug]?.(), PLAY_FROM[piece.slug]);
  const shownFilm = yoniFilm ? { data: yoniFilm, title: t.films.pieceSection, label: t.films.intro(piece.title) } : film;
  // Its composition: the rows by their English label too (a label in capitals: Yoni's composition, src/data/yoni2711.ts).
  const compositionRows = specs.map((s) => ({ ...s, en: s.row ?? s.label }));
  // « Created Exclusively for Kevin Schade. » closes its composition and titles the section of the one it was made for: said once.
  const hideClosing = order.includes("created-for") && showsPerson;
  const people3 = named && people.length > 0 ? people : [];
  // The JL pendant worn on the 14 mm Cuban chain (Yoni, 27/11/2026), first among the photos where it is worn, with his caption.
  const jl = piece.slug === "jamie-leweling-jl-pendant" ? YONI_MEDIA.worn?.jlCuban : undefined;
  const wornShown: MediaItem[] = jl ? [jl, ...worn.filter((m) => m.src !== jl.src)] : worn;

  const sections: Partial<Record<PageSection, ReactNode>> = {
    // 2. Its film and its story side by side, as in a magazine (Yoni, 25/11/2026): the film of the finished piece (or of its
    // mechanism) on the left, playing by itself, silent, with its bar; « The Vision Behind the Creation » on the right (one under
    // the other on a phone).
    vision: (
      <section
        id="piece-film"
        aria-labelledby="piece-story-title"
        data-piece-spread
        data-feature-film={shownFilm ? piece.slug : undefined}
        data-piece-section={shownFilm ? "film" : "story"}
        className="scroll-mt-24 border-t border-white/10"
      >
        <div className="wrap grid gap-10 py-14 lg:grid-cols-12 lg:gap-14 lg:py-20">
          {shownFilm ? (
            <div className="min-w-0 lg:col-span-6">
              <div className="flex flex-col items-center lg:sticky lg:top-28">
                <FilmFrame film={shownFilm.data} label={shownFilm.label} tall="min(76svh, 44rem" />
                <p className="eyebrow mt-4 self-center text-center">{shownFilm.title}</p>
                {shownFilm.text && !yoniPage ? <p className="mt-2 max-w-md text-center text-base text-mist">{shownFilm.text}</p> : null}
              </div>
            </div>
          ) : null}
          <div data-piece-story className={"min-w-0 " + (shownFilm ? "lg:col-span-6" : "lg:col-span-8 lg:col-start-3")}>
            {/* Its name stands right above, in the opening: once on the page (the rule of the house). */}
            <h2 id="piece-story-title" className="title-caps leading-[1.15] tracking-[0.12em] t-title text-white [text-wrap:balance]">{t.piece.story}</h2>
            {line ? <p data-piece-line className="mt-5 font-display t-lead font-light italic leading-[1.25] text-white [text-wrap:balance]">{line}</p> : null}
            <StoryText blocks={topStory} lead={piece.line} closing={yoniPage} />
            {order.includes("worn-with") ? null : <WornWith slug={piece.slug} />}
          </div>
        </div>
      </section>
    ),
    // 3. Every Angle: its four photos chosen first, then See More (src/components/MagazineGallery.tsx).
    angles: <MagazineGallery piece={piece} english={own} items={galleryItems} ordered={ordered} model={model} sameViews={sameViewsOf(piece.slug)} extra={extra} part="angles" />,
    // The Art of Detail: each detail beside the close-up that shows it.
    details: (
      <div id="piece-details" className="scroll-mt-32">
        <MagazineGallery piece={piece} english={own} items={galleryItems} ordered={ordered} model={model} sameViews={sameViewsOf(piece.slug)} extra={extra} part="details" loops={piece.slug === "malik-tillman-cross-pendant" && YONI_MEDIA.tillmanSpin ? { p13: YONI_MEDIA.tillmanSpin } : undefined} />
      </div>
    ),
    model3d: model ? <Piece3D piece={piece} model={model} /> : null,
    // The part of the piece worn on its own (the tennis chains of the octagon): here, never a piece apart.
    part:
      part && partPiece && partPhotos.length > 0 ? (
        <WornAs
          piece={partPiece}
          photos={partPhotos.filter((m) => !detailSrcs.has(m.src))}
          anchor={part.anchor}
          title={piece.slug === "noah-okafor-octagon-pendant" ? t.piece.accompanyingChains : part.kind === "chain" ? t.piece.itsChain : t.piece.wornAsPendant}
          words={!yoniPage}
        />
      ) : null,
    // The chain it is worn on (« Discover the Cuban Chain »: Worn on / The Two-Tone Baguette Cuban / Enter the World).
    "worn-with": wornWith(piece.slug) ? (
      <section aria-label={piece.slug === "noah-okafor-oka-pendant" ? t.piece.cubanSection : t.piece.wornOn} data-piece-section="worn-with" className="wrap border-t border-white/10 py-12 lg:py-14">
        <WornWith slug={piece.slug} name={WORN_ON_NAME[piece.slug]} />
      </section>
    ) : null,
    // 5. Composition & Craftsmanship: only the lines that are filled (the weight of the gold, the carats... come from Yoni, piece
    // by piece: never a figure made up).
    // (28/11/2026: a composition that says almost nothing, « Type: Pendant », waits for its figures: Yoni's composition, or at
    // least the weight of its gold or the carats of its diamonds written in the admin.)
    composition: specs.length > 0 && (specs.some((s) => isCaps(s.row ?? s.label)) || specs.some((s) => s.value.trim() !== "" && (/^(gold weight|total diamond weight|diamond weight|carats?)$/i.test((s.row ?? s.label).trim()) || /\d\s*(ct|carats?)\b/i.test(s.value)))) ? <Composition rows={compositionRows} hideClosing={hideClosing} /> : null,
    // 6. Created exclusively for…: one section (24/11/2026) for whom it was made and the photos where it is worn; a chain of the
    // house is "A Berete Signature". Shown only when it has someone or something to show (25/11/2026).
    "created-for":
      signature || showsPerson || wornShown.length > 0 ? (
        <section aria-labelledby="made-for-title" data-made-for data-piece-section="created-for" className="wrap border-t border-white/10 py-14 lg:py-16">
          <h2 id="made-for-title" className="title-caps tracking-[0.12em] t-title [text-wrap:balance]">
            {signature ? t.common.signature : showsPerson ? t.common.madeFor(who, piece.type) : t.piece.wornBy(named ? who : null)}
          </h2>
          {signature ? <p className="mt-4 max-w-xl text-base text-bone">{t.common.signatureText}</p> : null}
          <PeopleRow people={people3} />
          {/* The photos where it is worn, held, handed over: under the one it was made for (the jersey of Noah Okafor: in its moment
              of reveal, never twice). */}
          {wornShown.length > 0 && !order.includes("reveal") ? (
            <ul data-worn-by data-small={SMALL_WORN.has(piece.slug) ? "" : undefined} className={"mt-10 grid gap-3 sm:gap-5 " + (wornShown.length > 1 ? "grid-cols-2 lg:grid-cols-4" : SMALL_WORN.has(piece.slug) ? "max-w-[13rem]" : "max-w-sm")}>
              {wornShown.map((m, i) => (
                <li key={m.src}>
                  <Reveal>
                    <button type="button" onClick={() => setWornOpen(i)} className="block w-full cursor-zoom-in text-start" aria-label={t.gallery.open(m.alt ?? piece.title)}>
                      <span className="block aspect-[4/5] overflow-hidden bg-ink-soft">
                        <MediaView item={m} alt={m.alt ?? t.piece.wornAlt(piece.title)} fit="cover" sizes={wornShown.length > 1 ? "(max-width: 1023px) 46vw, 18rem" : "(max-width: 639px) 92vw, 24rem"} frame={4 / 5} />
                      </span>
                    </button>
                    {m.caption ? <p data-worn-caption className="mt-3 text-base text-bone">{tc(m.caption)}</p> : null}
                  </Reveal>
                </li>
              ))}
            </ul>
          ) : null}
          {wornOpen !== null ? createPortal(<Lightbox items={wornShown.map((m) => ({ ...m, caption: undefined }))} index={wornOpen} onIndex={setWornOpen} onClose={() => setWornOpen(null)} />, document.body) : null}
        </section>
      ) : null,
    // The Berete Circle (Yoni, 27/11/2026): the one it was made for, his photo with the piece, the way to his world.
    circle: people[0] ? (
      <CircleSection
        person={people[0]}
        photo={(piece.slug === "deniz-undav-l-pendant" ? YONI_MEDIA.worn?.angelUndav : undefined) ?? piece.gallery.find((m) => m.src === CIRCLE_PHOTO[piece.slug]) ?? null}
        madeFor={CIRCLE_MADE_FOR.has(piece.slug) ? t.common.madeFor(people[0].name, piece.type) : undefined}
        earlier={CIRCLE_EARLIER[piece.slug] ? cat.pieces.find((p) => p.slug === CIRCLE_EARLIER[piece.slug]) : undefined}
      />
    ) : null,
    // The tennis chain worn with the AS Pendant (Yoni, 27/11/2026): apart from the pendant, whole then up close, no figure again.
    chain: chainItems.length > 0 ? <ChainSection items={chainItems} title={t.piece.accompanyingTennisChain} name={piece.title} /> : null,
    // From the championship ring of Stuttgart to his own piece (Yoni, 27/11/2026): a short block, the way to the ring.
    "as-victory": (
      <section aria-labelledby="as-victory-title" data-as-victory data-piece-section="as-victory" className="wrap border-t border-white/10 py-14 lg:py-16">
        <div className="max-w-2xl">
          <h2 id="as-victory-title" className="title-caps tracking-[0.12em] t-title [text-wrap:balance]">{tc(AS_VICTORY.title)}</h2>
          <p data-as-victory-text className="piece-text mt-5">{tc(AS_VICTORY.text)}</p>
          <Link to="/pieces/vfb-stuttgart-dfb-pokal-2025" data-cta data-as-victory-link className="btn-secondary mt-6">
            {t.piece.discoverStuttgartRing} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
      </section>
    ),
    // The Inter ring: the story behind it, then the champions with their rings (Yoni, 26/11/2026).
    "story-ring": <StoryRing />,
    champions: <Champions people={people3} worn={worn} title={piece.title} />,
    // The jersey of Noah Okafor: its reveal in Dubai (Yoni, 27/11/2026).
    reveal: <MomentOfReveal title={piece.title} />,
    // Marcus Thuram's T, from the first to the T9 (Yoni, 27/11/2026).
    evolution: <Evolution piece={piece} />,
    // 7. The Trunk: all its photos, whole; the way to it on the page of the trunks when it opens there.
    trunk: box ? <BoxSection boxes={[box]} title={t.piece.trunk} id="piece-trunk" /> : null,
    // The Art of Presentation (the Inter case): four photos chosen first, the others after; the way to Signature Trunks.
    presentation: box ? <BoxSection boxes={[box]} title={t.piece.presentation} id="piece-trunk" first={PRESENTATION_FIRST[box.slug]} /> : null,
    // 8. Its making-of, in The Atelier, where it starts at once (the cinema window lives there only): a discreet way there, « Watch
    // the Making Of » (Yoni, 26/11/2026); the Inter ring with its sentence, « Behind the Creation ».
    atelier: inAtelier ? (
      <section aria-labelledby="atelier-title" data-enter-atelier data-piece-section="atelier" className="border-t border-white/10">
        <div className="wrap flex flex-col items-start gap-3 py-10 sm:flex-row sm:items-center sm:justify-between lg:py-12">
          <div className="max-w-xl">
            <h2 id="atelier-title" className={piece.slug === "campione-d-italia-2023-2024" ? "title-caps tracking-[0.12em] t-title" : "eyebrow"}>
              {piece.slug === "campione-d-italia-2023-2024" ? t.piece.behindCreation : t.nav.atelier}
            </h2>
            {piece.slug === "campione-d-italia-2023-2024" ? <p data-atelier-text className="piece-text mt-4">{tc(INTER_BEHIND)}</p> : null}
          </div>
          <Link to={"/atelier?piece=" + piece.slug} data-cta data-enter-atelier-link className="btn-secondary shrink-0">
            {t.piece.watchMakingOf} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
      </section>
    ) : null,
    press:
      press.length > 0 ? (
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
      ) : null,
  };

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
      data-champion={theme.effects.includes("gold-light") ? "" : undefined}
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
        <div data-piece-cover data-below={below ? "" : undefined} style={below ? ({ "--u-below": below[0], "--u-below-m": below[1] } as CSSProperties) : undefined} className={"piece-calm relative shrink-0 px-6 pt-20 sm:px-12 lg:order-2 lg:col-span-7 lg:h-[min(100svh,60rem)] lg:px-16 desk:pt-28 lg:pb-12 xl:col-span-8 " + (opening.large && opening.mode !== "photo" ? "h-[62svh] sm:h-[66svh]" : "h-[52svh] sm:h-[58svh]")}>
          {opening.mode === "photo" ? (
            <>
              {/* A photo on black (no clean cut-out of the jewel): whole, its edges faded into the black (25/11/2026). A photo
                  with its soft outline (scripts/opening-masks.mjs, 26/11/2026: the pendant L, whose black showed as a rectangle
                  on the sky): only the jewel and a thin dark edge melting into its world, never the rectangle of the photo. */}
              {FRAMED_OPENINGS.has(piece.slug) && piece.cover.width && piece.cover.height ? (
                // A real photo on the wrist that no cut-out can keep whole (28/11/2026: the watches of Tajon Buchanan and Radja
                // Nainggolan, only ever filmed on the wrist, their bracelet behind it): sharp, never faded at its edges; smaller
                // since the evening of 28/11, in the same fine frame as the film of the page, never larger than its file.
                <span className="flex h-full w-full items-center justify-center">
                  <span data-opening-framed className="relative block max-w-full border border-white/10 bg-black" style={{ aspectRatio: piece.cover.width + " / " + piece.cover.height, height: "min(68%, " + piece.cover.height + "px)" }}>
                    <MediaView item={piece.cover} alt={piece.cover.alt ?? piece.title} fit="cover" priority sizes="(max-width: 1023px) 75vw, 40vw" />
                  </span>
                </span>
              ) : piece.cover.onBlack !== false && piece.cover.width && piece.cover.height ? (
                <span className="flex h-full w-full items-center justify-center">
                  <span className="relative block h-full max-w-full" style={{ aspectRatio: piece.cover.width + " / " + piece.cover.height }}>
                    {/* A soft pool of dark behind the photo: its black melts into the world around it (a light sky, an arena). */}
                    {outline ? null : <span aria-hidden="true" className="opening-halo" />}
                    <span data-opening-fade={outline ? "outline" : ""} className={(outline ? "" : "opening-fade ") + "absolute inset-0 block"} style={outline ? outlineMask(outline) : undefined}>
                      <MediaView item={piece.cover} alt={piece.cover.alt ?? piece.title} fit="contain" priority sizes="(max-width: 1023px) 75vw, 66vw" />
                    </span>
                  </span>
                </span>
              ) : (
                <MediaView item={piece.cover} alt={piece.cover.alt ?? piece.title} fit="contain" priority sizes="(max-width: 1023px) 75vw, 66vw" />
              )}
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
        {/* The piece before and the piece after, straight from one universe to the next (src/components/PieceNav.tsx). */}
        <PieceNav slug={piece.slug} />
        {/* Its words, discreet (Yoni, 20/11/2026), so that the jewel shines: one small label (its collection), its name, its
            sentence, then the two buttons of the house. */}
        <div data-piece-intro className="w-full px-5 pt-5 pb-8 sm:px-8 lg:order-1 lg:col-span-5 lg:pt-0 lg:pr-0 lg:pb-12 lg:pl-12 xl:col-span-4">
          <div className="flex max-w-sm flex-col gap-6">
            <div data-piece-text className={shadow}>
              <Link to={"/creations/" + collection.slug} data-piece-eyebrow className="eyebrow inline-flex min-h-11 items-center hover:text-white lg:min-h-8">
                {collectionName}
              </Link>
              <h1 id="piece-title" data-u-title className="title-caps mt-2 leading-[1.15] tracking-[0.08em] break-words text-white [text-wrap:balance]">
                <KeepCase title={piece.title}>{unbroken}</KeepCase>
              </h1>
              {/* Its words under its name, as on Yoni's mock-up (the Genki Dama): in italics, a fine rule, for whom. */}
              {HERO_LINES[piece.slug] ? (
                <div data-hero-lines>
                  <p data-hero-tagline className="mt-3 font-display text-[1.375rem] leading-snug font-normal italic text-white lg:text-[1.5rem]">{tc(HERO_LINES[piece.slug]!.tagline)}</p>
                  <span aria-hidden="true" data-hero-rule className="mt-4 block h-px w-16" style={{ background: "color-mix(in srgb, var(--u-glow, #e8b4a0) 70%, transparent)" }} />
                  <p data-hero-dedication className="mt-4 text-base text-bone">{tc(HERO_LINES[piece.slug]!.dedication)}</p>
                </div>
              ) : null}
              {/* For whom, when no one can be shown below (a private collector): a fine line under its name, never a section. */}
              {!showsPerson && !signature && !HERO_LINES[piece.slug] ? <p data-made-for-line className="mt-2 text-base text-mist">{t.common.madeFor(who, piece.type)}</p> : null}
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

      {/* The sections of the page in its order (src/data/yoni2711.ts). */}
      {order.map((k) => (
        <Fragment key={k}>{sections[k] ?? null}</Fragment>
      ))}

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
function WornAs({ piece, photos, anchor, title, words: withWords = true }: { piece: Piece; photos: MediaItem[]; anchor: string; title: string; words?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  // On Yoni's pages its words are already told in the details (the tennis chains of the octagon): its photos only.
  const words = withWords ? storyBlocks(piece.story).filter((b) => b.kind === "paragraph") : [];
  return (
    <section id={anchor} aria-labelledby={anchor + "-title"} data-worn-as={piece.slug} data-piece-section="worn-as" className="wrap scroll-mt-28 border-t border-white/10 py-14 lg:py-16">
      <h2 id={anchor + "-title"} className="title-caps tracking-[0.12em] t-title ">{title}</h2>
      {words.map((w, i) => (
        <p key={i} className="mt-4 max-w-2xl text-base leading-relaxed text-bone">{w.text}</p>
      ))}
      {/* Four first, the others behind See More (27/11/2026: never one photo alone on a second row). */}
      <ul data-worn-as-photos className={"mt-8 grid grid-cols-2 gap-3 sm:gap-5 " + (photos.length > 2 ? "lg:grid-cols-4" : "max-w-2xl")}>
        {(expanded ? photos : photos.slice(0, 4)).map((m, i) => (
          <li key={m.src}>
            <button type="button" onClick={() => setOpen(i)} className="block w-full cursor-zoom-in" aria-label={t.gallery.open(m.alt ?? piece.title)}>
              <span className="block aspect-[4/5] overflow-hidden bg-ink">
                <MediaView item={m} alt={m.alt ?? piece.title} fit={m.onBlack === false ? "cover" : "contain"} sizes="(max-width: 1023px) 46vw, 20rem" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!expanded && photos.length > 4 ? (
        <div className="mt-8 flex justify-center">
          <button type="button" onClick={() => setExpanded(true)} data-worn-as-more data-cta className="btn-primary">
            {t.gallery.more(photos.length - 4)}
          </button>
        </div>
      ) : null}
      {open !== null ? createPortal(<Lightbox items={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
    </section>
  );
}

/**
 * The text of a piece: its paragraphs; the titles of its parts ("## " in the text) and its closing words set apart as a
 * quote ("> "), in the style of the quotes of the house (src/data/story.ts).
 */
function StoryText({ blocks, lead = "", closing = false }: { blocks: StoryBlock[]; lead?: string; closing?: boolean }) {
  const { t } = useI18n();
  // The number of each paragraph among the paragraphs.
  const numbers = blocks.map((_, i) => blocks.slice(0, i + 1).filter((x) => x.kind === "paragraph").length);
  const first = blocks.findIndex((b) => b.kind === "paragraph");
  const last = blocks.map((b) => b.kind).lastIndexOf("paragraph");
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
        // Yoni's vision (26-27/11/2026): its first words, the line of the piece, set apart as its lead; its last short words as its
        // closing; the paragraphs between in the reading type of the pages of the pieces (larger, a little bolder).
        if (i === first && lead && b.text.trim() === lead.trim())
          return (
            <p key={i} data-story-paragraph={numbers[i]} data-story-lead className="piece-lead mt-5">
              {b.text}
            </p>
          );
        if (closing && i === last && i !== first && b.text.length <= 110)
          return (
            <p key={i} data-story-paragraph={numbers[i]} data-story-closing className="piece-lead mt-8 max-w-2xl border-t border-white/12 pt-6">
              {b.text}
            </p>
          );
        return (
          <p key={i} data-story-paragraph={numbers[i]} className="piece-text mt-5 max-w-2xl whitespace-pre-line">
            {b.text}
          </p>
        );
      })}
    </>
  );
}

/** The piece worn with this one (the Butterfly pendant and its chain): a card that leads to it. */
function WornWith({ slug, name }: { slug: string; name?: string }) {
  const { t } = useI18n();
  const tc = useContentText();
  const cat = useCatalogue();
  const pair = wornWith(slug);
  const other = pair ? cat.pieces.find((p) => p.slug === pair.slug) : undefined;
  if (!pair || !other) return null;
  return (
    <Link to={"/pieces/" + other.slug} data-worn-with={other.slug} className={"group flex max-w-xl " + (name ? "" : "mt-10 ") + " items-center gap-5 border border-white/15 bg-ink/60 p-4 transition-colors duration-500 hover:border-rose-light"}>
      <span className="relative block aspect-[4/5] w-24 shrink-0 overflow-hidden bg-ink sm:w-28">
        <MediaView item={other.cover} alt={other.cover.alt ?? other.title} fit="contain" sizes="112px" />
      </span>
      <span className="min-w-0">
        <span className="eyebrow block">{pair.is === "chain" ? t.piece.wornOn : t.piece.itsPendant}</span>
        <span className="title-caps mt-2 block text-xl leading-snug tracking-[0.06em] break-words text-white transition-colors group-hover:text-rose-light">{name ? tc(name) : other.title}</span>
        <span data-cta className="btn-secondary mt-1 text-rose-light group-hover:text-white">
          {t.common.enterWorld} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

/** The one(s) a piece was made for: a club with its official logo, a person with their portrait, the way to their world. */
function PeopleRow({ people }: { people: Person[] }) {
  const { t, intl } = useI18n();
  const cat = useCatalogue();
  if (people.length === 0) return null;
  return (
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
                  {person.kind === "player" ? t.piece.discoverHisWorld : t.piece.theProfile} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
                </Link>
              </p>
            </div>
          </li>
        );
      })}
      {people.length > 3 ? <li className="text-base text-mist">{t.piece.andOthers(listOf(intl, people.slice(3).map((p) => p.name)))}</li> : null}
    </ul>
  );
}

/** A label written in capitals (Yoni's composition, src/data/yoni2711.ts). */
const isCaps = (label: string) => /[A-Z]/.test(label) && label === label.toUpperCase();
/** A value whose first line is a figure (a weight, a carat, a size). */
const isFigure = (value: string) => /^[\d][\d.,]*\s?(g|ct|mm|cm)\b/.test(value.split("\n")[0]!.trim());

/**
 * Composition & Craftsmanship. Yoni's (26-27/11/2026), minimal, with a lot of air: its first words; its three main figures large
 * (the weight of the gold, the carats); then its cuts and its making in two columns; its fine rules; its notes, small, beneath.
 * The others: one short line each, only the lines that are filled.
 */
function Composition({ rows, hideClosing }: { rows: (Spec & { en: string })[]; hideClosing: boolean }) {
  const { t } = useI18n();
  const rich = rows.some((r) => isCaps(r.en));
  if (!rich)
    return (
      <section aria-labelledby="sheet-title" data-composition data-piece-section="composition" className="wrap border-t border-white/10 py-14 lg:py-16">
        <h2 id="sheet-title" className="title-caps tracking-[0.12em] t-title ">{t.piece.sheet}</h2>
        <dl className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => (
            <div key={s.label} className="border-t border-white/12 pt-3">
              <dt className="text-[0.75rem] font-normal uppercase tracking-[0.2em] text-mist max-md:text-base max-md:tracking-[0.12em]">{t.piece.composition[s.en] ?? s.label}</dt>
              <dd className="mt-1 text-base leading-snug text-white">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    );
  // A label in capitals without value: the title of a group of its composition (the AS Pendant, then its tennis chain, 27/11/2026),
  // each group with its own figures and lines.
  const isHeading = (r: (typeof rows)[number]) => r.value.trim() === "" && isCaps(r.en);
  const groups: { heading: (typeof rows)[number] | null; rows: typeof rows }[] = [];
  for (const r of rows) {
    if (isHeading(r)) groups.push({ heading: r, rows: [] });
    else if (groups.length === 0) groups.push({ heading: null, rows: [r] });
    else groups[groups.length - 1]!.rows.push(r);
  }
  return (
    <section aria-labelledby="sheet-title" data-composition data-composition-rich data-piece-section="composition" className="wrap border-t border-white/10 py-16 lg:py-24">
      <h2 id="sheet-title" className="title-caps tracking-[0.12em] t-title ">{t.piece.sheet}</h2>
      {groups.map((g, gi) => (
        <div key={gi} data-composition-group={g.heading ? "" : undefined} className={g.heading && gi > 0 ? "mt-16 border-t border-white/12 pt-12" : ""}>
          {g.heading ? <h3 data-composition-heading className="mt-10 font-display text-[1.375rem] leading-snug font-normal tracking-[0.14em] text-white uppercase lg:text-[1.5rem]">{g.heading.label}</h3> : null}
          <RichRows rows={g.rows} hideClosing={hideClosing && gi === groups.length - 1} />
        </div>
      ))}
    </section>
  );
}

/** The lines of a rich composition: its first words, its figures in large, its two columns, its rules, its notes beneath. */
function RichRows({ rows, hideClosing }: { rows: (Spec & { en: string })[]; hideClosing: boolean }) {
  const firstLabelled = rows.findIndex((r) => r.en !== "");
  const figures = rows.filter((r) => isCaps(r.en) && isFigure(r.value)).slice(0, 3);
  const notes = rows.filter((r) => r.en !== "" && !isCaps(r.en));
  // The rest in its order: its first words, the lines of the two columns, its rules, its last words.
  type Part = { kind: "intro"; text: string } | { kind: "closing"; text: string } | { kind: "rule" } | { kind: "grid"; rows: typeof rows };
  const parts: Part[] = [];
  rows.forEach((r, i) => {
    if (figures.includes(r) || notes.includes(r)) return;
    if (r.en === "") {
      if (r.value.trim() === "⸻") parts.push({ kind: "rule" });
      else if (firstLabelled === -1 || i < firstLabelled) parts.push({ kind: "intro", text: r.value });
      else if (!(hideClosing && i === rows.length - 1)) parts.push({ kind: "closing", text: r.value });
      return;
    }
    const prev = parts[parts.length - 1];
    if (prev?.kind === "grid") prev.rows.push(r);
    else parts.push({ kind: "grid", rows: [r] });
  });
  // A rule left at the end (its last words said by the next section) goes with them.
  while (parts[parts.length - 1]?.kind === "rule") parts.pop();
  const intro = parts.filter((p): p is Extract<Part, { kind: "intro" }> => p.kind === "intro");
  const body = parts.filter((p) => p.kind !== "intro");
  const label = "text-[0.75rem] font-medium uppercase tracking-[0.22em] text-mist max-md:text-base max-md:tracking-[0.14em]";
  return (
    <>
      {intro.map((p, i) => (
        <p key={i} data-composition-intro className="piece-lead mt-6 max-w-2xl">{p.text}</p>
      ))}
      {figures.length > 0 ? (
        <dl data-composition-figures className={"mt-12 grid gap-y-10 gap-x-12 " + (figures.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:max-w-3xl")}>
          {figures.map((r, i) => {
            const [main, ...more] = r.value.split("\n");
            return (
              <div key={i} data-composition-figure className="border-t pt-5" style={{ borderColor: "color-mix(in srgb, var(--u-glow, #e8b4a0) 45%, transparent)" }}>
                <dt className={label}>{r.label}</dt>
                <dd className="mt-3">
                  <span className="block font-display text-[2.25rem] leading-none font-normal tracking-[0.01em] text-white">{main}</span>
                  {more.map((m, k) => (
                    <span key={k} className="piece-text mt-3 block text-mist">{m}</span>
                  ))}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}
      {body.map((p, i) =>
        p.kind === "rule" ? (
          <hr key={i} data-composition-rule className="mt-12 border-0 border-t border-white/15" />
        ) : p.kind === "closing" ? (
          <p key={i} data-composition-closing className="piece-lead mt-10">{p.text}</p>
        ) : p.kind === "grid" ? (
          <dl key={i} data-composition-rows className="mt-12 grid gap-x-16 gap-y-10 sm:grid-cols-2 lg:max-w-5xl">
            {p.rows.map((r, k) => (
              <div key={k}>
                <dt className={label}>{r.label}</dt>
                <dd className="piece-text mt-3 whitespace-pre-line text-white">{r.value}</dd>
              </div>
            ))}
          </dl>
        ) : null,
      )}
      {notes.length > 0 ? (
        <ul data-composition-notes className="mt-14 flex max-w-3xl flex-col gap-2 border-t border-white/12 pt-6">
          {notes.map((r, i) => (
            <li key={i} className="piece-text">
              <span className="text-white">{r.label}</span> — {r.value}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

/** The Berete Circle (Yoni, 27/11/2026): the one a piece was made for, his photo with it, « Discover His World ». */
function CircleSection({ person, photo, madeFor, earlier }: { person: Person; photo: MediaItem | null; madeFor?: string; earlier?: Piece }) {
  const { t } = useI18n();
  const tc = useContentText();
  const cat = useCatalogue();
  const portrait = portraitOf(cat, person);
  const [open, setOpen] = useState(false);
  const item: MediaItem | null = photo ?? (portrait ? { type: "image", src: portrait, alt: t.players.portrait(person.name) } : null);
  return (
    <section aria-labelledby="circle-title" data-circle data-piece-section="circle" className="wrap border-t border-white/10 py-14 lg:py-20">
      <div className="grid items-center gap-8 sm:grid-cols-12 sm:gap-12">
        {item ? (
          <button type="button" onClick={() => setOpen(true)} className="group relative block aspect-[4/5] w-3/4 cursor-zoom-in overflow-hidden bg-ink sm:col-span-5 sm:w-full lg:col-span-4" aria-label={t.gallery.open(item.alt ?? person.name)}>
            <MediaView item={item} alt={item.alt ?? person.name} fit="cover" sizes="(max-width: 639px) 75vw, 26rem" frame={4 / 5} />
          </button>
        ) : null}
        <div className="sm:col-span-7 lg:col-span-6 lg:col-start-6">
          <p className="eyebrow">{t.nav.players}</p>
          <h2 id="circle-title" className="title-caps mt-3 tracking-[0.1em] t-title text-white [text-wrap:balance]">{madeFor ?? person.name}</h2>
          <Link to={"/players/" + person.slug} data-cta data-circle-link data-made-for-person={person.slug} className="btn-secondary mt-6">
            {t.piece.discoverHisWorld} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
          {/* His piece before this one, to see the evolution (the MT — NEXUS CROSS → his first pendant, Yoni 28/11/2026): discreet. */}
          {earlier ? (
            <p className="mt-6 text-base text-mist">
              {tc(EARLIER_LABEL)} —{" "}
              <Link to={"/pieces/" + earlier.slug} data-circle-earlier className="text-bone underline decoration-rose-light/50 underline-offset-4 transition-colors hover:text-rose-light">
                <KeepCase title={earlier.title} />
              </Link>
            </p>
          ) : null}
        </div>
      </div>
      {open && item ? createPortal(<Lightbox items={[item]} index={0} onIndex={() => undefined} onClose={() => setOpen(false)} />, document.body) : null}
    </section>
  );
}

/** The chain worn with a pendant, apart (the tennis chain of the AS Pendant): whole, then its stones up close; each opens large. */
function ChainSection({ items, title, name }: { items: MediaItem[]; title: string; name: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section aria-labelledby="chain-title" data-chain-section data-piece-section="chain" className="wrap border-t border-white/10 py-14 lg:py-16">
      <h2 id="chain-title" className="title-caps tracking-[0.12em] t-title [text-wrap:balance]">{title}</h2>
      <ul data-chain-photos className="mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible lg:max-w-4xl">
        {items.map((m, i) => (
          <li key={m.src} className="w-[72%] shrink-0 snap-center sm:w-auto">
            <button type="button" onClick={() => setOpen(i)} className="block w-full cursor-zoom-in" aria-label={t.gallery.open(m.alt ?? name)}>
              <span className="block aspect-[2/3] overflow-hidden bg-ink-soft">
                <MediaView item={m} alt={m.alt ?? name} fit="cover" sizes="(max-width: 639px) 72vw, (max-width: 1023px) 30vw, 18rem" frame={2 / 3} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null ? createPortal(<Lightbox items={items.map((m) => ({ ...m, caption: undefined }))} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
    </section>
  );
}

/** A row of photos that open full screen; `more`: the others, behind a button. */
function PhotoRow({ first: chosen, more: others, moreLabel, name, swipe = false }: { first: MediaItem[]; more: MediaItem[]; moreLabel: string; name: string; swipe?: boolean }) {
  let first = chosen;
  let more = others;
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  // No photo chosen first (its files not here yet): the others take their place, never a button alone.
  if (first.length === 0) [first, more] = [more.slice(0, 4), more.slice(4)];
  const all = [...first, ...more];
  if (all.length === 0) return null;
  const tile = (m: MediaItem, i: number) => (
    <li key={m.src} className={swipe ? "w-[78%] shrink-0 snap-center sm:w-auto" : ""}>
      <button type="button" onClick={() => setOpen(i)} className="group block w-full cursor-zoom-in" aria-label={t.gallery.open(m.alt ?? name)}>
        <span className="block aspect-[4/5] overflow-hidden bg-ink-soft">
          <MediaView item={m} alt={m.alt ?? name} fit="cover" sizes="(max-width: 639px) 78vw, (max-width: 1023px) 46vw, 22rem" frame={4 / 5} />
        </span>
      </button>
    </li>
  );
  return (
    <>
      <ul data-photo-row className={swipe ? "mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible lg:max-w-4xl" : "mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4"}>
        {first.map(tile)}
      </ul>
      {more.length > 0 ? (
        expanded ? (
          <ul data-photo-more className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{more.map((m, i) => tile(m, first.length + i))}</ul>
        ) : (
          <div className="mt-8 flex justify-center">
            <button type="button" onClick={() => setExpanded(true)} data-photo-more-button data-cta className="btn-primary">
              {moreLabel}
            </button>
          </div>
        )
      ) : null}
      {open !== null ? createPortal(<Lightbox items={all.map((m) => ({ ...m, caption: undefined }))} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
    </>
  );
}

/** The story behind the Inter ring (Yoni, 26/11/2026), beside his photo with Marcus Thuram and Marko Arnautović in Milan. */
function StoryRing() {
  const tc = useContentText();
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const photo = YONI_MEDIA.interPhotos?.yoniWithPlayers ?? null;
  return (
    <section aria-labelledby="story-ring-title" data-story-ring data-piece-section="story-ring" className="wrap border-t border-white/10 py-16 lg:py-20">
      <div className={"grid gap-10 lg:gap-16 " + (photo ? "lg:grid-cols-12 lg:items-center" : "")}>
        {photo ? (
          <button type="button" onClick={() => setOpen(true)} className="group relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-ink lg:col-span-5" aria-label={t.gallery.open(photo.alt ?? tc(INTER_STORY.title))}>
            <MediaView item={photo} alt={photo.alt ?? tc(INTER_STORY.title)} fit="cover" sizes="(max-width: 1023px) 92vw, 34rem" frame={4 / 5} />
          </button>
        ) : null}
        <div className={photo ? "lg:col-span-6 lg:col-start-7" : "max-w-3xl"}>
          <h2 id="story-ring-title" className="title-caps tracking-[0.12em] t-title">{tc(INTER_STORY.title)}</h2>
          <p data-story-lead className="piece-lead mt-5">{tc(INTER_STORY.lead)}</p>
          {INTER_STORY.paragraphs.map((x) => (
            <p key={x} className="piece-text mt-5">{tc(x)}</p>
          ))}
        </div>
      </div>
      {open && photo ? createPortal(<Lightbox items={[photo]} index={0} onIndex={() => undefined} onClose={() => setOpen(false)} />, document.body) : null}
    </section>
  );
}

/** In the Hands of the Champions (Yoni, 26/11/2026): the film of the hand-over, four photos, then all the moments. */
function Champions({ people, worn, title }: { people: Person[]; worn: MediaItem[]; title: string }) {
  const { t } = useI18n();
  // The hand-over film of Yoni is already an edit of 50 s, shorter than the 60–90 s asked: shown whole; the 29 s cut of its best
  // moments is kept beside it (scripts/yoni-2711-media.mjs), for Yoni to choose.
  const film = filmData(YONI_MEDIA.interHandoverFull) ?? filmData(YONI_MEDIA.interHandoverEdit);
  // Four photos of the hand-over first (photo 2 of Yoni among them once it is here), the real photos before the stills of the film;
  // every other moment behind « View All Moments ».
  const pics = YONI_MEDIA.interPhotos;
  const real = worn.filter((m) => !m.src.includes("/stories/"));
  const unique = (l: (MediaItem | null | undefined)[], skip: MediaItem[] = []) => {
    const seen = new Set(skip.map((m) => m.src));
    return l.filter((m): m is MediaItem => Boolean(m?.src) && !seen.has(m!.src) && Boolean(seen.add(m!.src)));
  };
  const first = unique([pics?.photo2, ...real, ...worn]).slice(0, 4);
  const more = unique([...worn, ...(pics?.firstFour ?? []), ...(pics?.rest ?? [])], first);
  return (
    <section aria-labelledby="champions-title" data-champions data-made-for data-piece-section="champions" className="wrap border-t border-white/10 py-16 lg:py-20">
      <h2 id="champions-title" className="title-caps tracking-[0.12em] t-title [text-wrap:balance]">{t.piece.champions}</h2>
      <PeopleRow people={people} />
      {film ? (
        <div data-champions-film className="mt-10 flex justify-center">
          <FilmFrame film={film} label={t.piece.champions + " · " + title} tall="min(78svh, 46rem" manual />
        </div>
      ) : null}
      <PhotoRow first={first} more={more} moreLabel={t.piece.viewAllMoments} name={title} />
    </section>
  );
}

/** The Moment of Reveal (Yoni, 27/11/2026): the film of the hand-over in Dubai, whole, beside its words; two photos under it. */
function MomentOfReveal({ title }: { title: string }) {
  const { t } = useI18n();
  const tc = useContentText();
  const r = YONI_MEDIA.okaforReveal;
  const film = filmData(r?.film);
  // Its two photos of the hand-over (the portrait, the four arms crossed), then the fitting in the fold-out gallery only (27/11/2026):
  // never another photo in their place.
  const first = [r?.portrait, r?.group].filter((m): m is MediaItem => Boolean(m?.src));
  const more = [r?.fitting].filter((m): m is MediaItem => Boolean(m?.src));
  return (
    <section aria-labelledby="reveal-title" data-reveal data-piece-section="reveal" className="wrap border-t border-white/10 py-16 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
        {film ? (
          <div className="flex justify-center lg:col-span-6">
            <FilmFrame film={film} label={tc(JERSEY_REVEAL.title) + " · " + title} tall="min(80svh, 46rem" manual />
          </div>
        ) : null}
        <div className={film ? "lg:col-span-6" : "lg:col-span-8"}>
          <h2 id="reveal-title" className="title-caps tracking-[0.12em] t-title">{tc(JERSEY_REVEAL.title)}</h2>
          {JERSEY_REVEAL.paragraphs.map((x, i) => (
            <p key={x} className={i === JERSEY_REVEAL.paragraphs.length - 1 ? "piece-lead mt-8 border-t border-white/12 pt-6" : "piece-text mt-5"}>
              {tc(x)}
            </p>
          ))}
        </div>
      </div>
      <PhotoRow first={first} more={more} moreLabel={t.gallery.more(more.length)} name={title} swipe />
    </section>
  );
}

/**
 * The evolution of Marcus Thuram's T (Yoni, 27/11/2026): its five steps in a sober row; a step shows a photo and leads to its
 * piece only when it is sure (the T9: this page); the others keep their name alone until Yoni confirms them.
 */
function Evolution({ piece }: { piece: Piece }) {
  const tc = useContentText();
  // The T9 by another photo of it whole on black than the first of Every Angle (never the same photo twice on the page).
  const t9 = piece.gallery.find((m) => fileBase(m.src) === "p18") ?? piece.cover;
  const last = T_EVOLUTION.steps.length - 1;
  return (
    <section aria-labelledby="evolution-title" data-evolution data-piece-section="evolution" className="wrap border-t border-white/10 py-16 lg:py-20">
      <h2 id="evolution-title" className="title-caps tracking-[0.12em] t-title">{tc(T_EVOLUTION.title)}</h2>
      <p className="piece-text mt-5 max-w-2xl">{tc(T_EVOLUTION.intro)}</p>
      {/* A sober frieze (27/11/2026): the five names of Yoni on one fine line, the T9 alone illustrated at its place; a step gets a
          photo only when it is sure (none yet: their names wait for Yoni). */}
      <div className="mt-12 grid items-end gap-10 lg:grid-cols-12">
        <ol className="relative grid gap-6 sm:grid-cols-5 sm:gap-4 lg:col-span-9">
          <span aria-hidden="true" className="rule-rose absolute top-[0.4375rem] right-0 left-0 hidden opacity-60 sm:block" />
          {T_EVOLUTION.steps.map((step, i) => (
            <li key={step} data-evolution-step={i + 1} data-current={i === last ? "" : undefined} className="relative flex gap-3 sm:block">
              <span aria-hidden="true" className={"relative mt-1.5 block size-3.5 shrink-0 rounded-full border sm:mt-0 " + (i === last ? "border-rose-light bg-rose-light" : "border-rose-light/70 bg-ink")} />
              <p className="piece-text sm:mt-5">
                <span className="text-rose-light">{i + 1}.</span> {tc(step)}
              </p>
            </li>
          ))}
        </ol>
        {t9.src ? (
          <figure data-evolution-photo className="mx-auto w-48 sm:w-56 lg:col-span-3 lg:w-full lg:max-w-[15rem]">
            <span className="block aspect-[4/5] overflow-hidden bg-ink">
              <MediaView item={t9} alt={t9.alt ?? piece.title} fit="contain" sizes="15rem" />
            </span>
          </figure>
        ) : null}
      </div>
    </section>
  );
}
