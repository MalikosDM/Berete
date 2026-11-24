import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { createPortal } from "react-dom";
import { ArrowRight, Play } from "lucide-react";
import Lightbox from "@/components/Lightbox";
import AtelierRoom from "@/components/AtelierRoom";
import { posterWidth } from "@/components/AtelierPassage";
import BrandIcon from "@/components/BrandIcon";
import { onTrunksPage } from "@/components/BoxSection";
import { Img, LoopVideo, MediaView } from "@/components/Media";
import MakingSteps from "@/components/MakingSteps";
import Mechanisms from "@/components/Mechanisms";
import PageIntro from "@/components/PageIntro";
import Reveal from "@/components/Reveal";
import TrunkReveal, { type TrunkPiece } from "@/components/TrunkReveal";
import { filmTime, resolveAtelier } from "@/data/atelier";
import { completeMakingOf, makingSteps } from "@/data/making";
import { media } from "@/data/catalogue";
import { BOXES, FEATURED_BOX } from "@/data/pieces";
import { resolveShowcase } from "@/data/showcase";
import { trunkOf } from "@/data/trunks";
import type { Box, MediaItem } from "@/data/types";
import { Link, useI18n, useMadeFor } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { getLenis } from "@/lib/gsap";
import { srcSetOf } from "@/lib/responsive";
import { waLink } from "@/lib/site";

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.75)]";

/** The place of each box of the catalogue on the page of the trunks. */
const BOX_ORDER = new Map(BOXES.map((b, i) => [b.slug, i]));

export default function Atelier() {
  const { t } = useI18n();
  /* The atelier photos, in the order of their numbers (warm black and white from the import). */
  const STEPS = t.atelier.steps;
  const root = useRef<HTMLDivElement>(null);
  // The opening film: a horizontal shot of a piece assembled at the bench (Yoni's films, scripts/hd-media.mjs), in the
  // warm black and white of the atelier; the earlier vertical film when it is missing.
  const setting = media.hd?.["atelier"]?.["v12"] ?? media.videos["atelier/setting"];
  const photos: MediaItem[] = media.groups["atelier"] ?? [];

  // The steps arrive as the page scrolls, still (24/11/2026: only slow fades, no wipe nor parallax).

  return (
    <div ref={root}>
      {/* Opening: the setting film, full screen, silent, playing only while visible */}
      <section aria-labelledby="atelier-title" className="relative flex h-svh items-end overflow-hidden bg-ink">
        {setting ? <LoopVideo item={setting} label={t.atelier.filmLabel} className="absolute inset-0 h-full w-full object-cover" /> : null}
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink via-ink/40 to-ink/30" />
        <div className={"wrap relative pb-28 md:pb-20 " + shadow}>
          <h1 id="atelier-title" className="title-caps tracking-[0.12em] t-hero text-white">{t.atelier.title}</h1>
          <p className="mt-4 max-w-lg text-base text-bone">{t.atelier.lead}</p>
        </div>
      </section>

      {/* The philosophy of the house (Yoni, 23/11/2026). */}
      <section aria-labelledby="philosophy-title" data-philosophy className="relative z-20 bg-ink">
        <div className="wrap grid gap-8 py-16 lg:grid-cols-12 lg:gap-14  lg:py-20">
          <Reveal className="lg:col-span-6">
            <p className="eyebrow">{t.atelier.philosophy.eyebrow}</p>
            <h2 id="philosophy-title" className="mt-5 font-display t-title font-light leading-[1.12] text-white [text-wrap:balance]">
              {t.atelier.philosophy.title}
            </h2>
          </Reveal>
          <Reveal className="lg:col-span-5 lg:col-start-8 lg:self-end" delay={0.1}>
            {t.atelier.philosophy.text.map((p) => (
              <p key={p} className="mt-5 text-base leading-relaxed text-bone first:mt-0">{p}</p>
            ))}
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="atelier-steps" className="relative">
        <h2 id="atelier-steps" className="sr-only">
          {t.atelier.making}
        </h2>
        {photos.map((photo, i) => {
          const step = STEPS[i] ?? { title: t.atelier.step(i + 1), text: "" };
          return (
            <article key={photo.src} className="sticky top-0 h-svh w-full overflow-hidden bg-ink" style={{ zIndex: i + 1 }}>
              <div data-mask className="absolute inset-0 overflow-hidden">
                <Img src={photo.src} alt={t.atelier.stepAlt(step.title)} width={photo.width} height={photo.height} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink via-ink/55 to-ink/10" />
              </div>
              <div className="wrap relative z-10 flex h-full flex-col justify-end pb-28 md:pb-20">
                <span aria-hidden="true" className="text-rose-gold block font-display text-3xl font-light md:text-4xl">{String(i + 1).padStart(2, "0")}</span>
                <h3 className={"title-caps mt-3 t-lead text-white " + shadow}>{step.title}</h3>
                <div className="rule-rose my-4 max-w-[12rem]" aria-hidden="true" />
                <p className={"max-w-xl text-base text-bone lg:text-[1rem] " + shadow}>{step.text}</p>
              </div>
            </article>
          );
        })}
      </section>

      <Mechanisms />

      <AtelierFilms />

      <section className="relative z-20 border-t border-white/10 bg-ink">
        <Reveal className="wrap flex flex-col items-center py-20 text-center lg:py-24">
          <h2 className="title-caps tracking-[0.12em] max-w-4xl t-title text-white [text-wrap:balance]">{t.atelier.ctaTitle}</h2>
          <p className="mt-5 max-w-xl text-base text-bone">{t.atelier.ctaText}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-x-8">
            <Link to="/contact" data-cta className="btn-primary">
              {t.common.startPiece}
            </Link>
            <Link to="/process" data-cta className="btn-secondary">
              {t.atelier.seeProcess} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

/* ---------- The making-of of every piece ---------- */

/**
 * The making-of of every published piece that has one (src/data/atelier.ts), as thumbnails: its image, its name, for
 * whom. Each opens the same atelier as its page, full screen, with "Enter the World" towards the piece. The drafts
 * (unpublished) are not in the catalogue of the visitors, so not here.
 */
function AtelierFilms() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const madeFor = useMadeFor();
  const [params] = useSearchParams();
  const asked = params.get("piece") ?? "";
  // The piece whose atelier is open (its films taken from the catalogue as it is now: the choices of the admin arrive with it).
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  // Every published piece with its making-of film: its atelier, else its complete making-of (a film of its stories).
  const films = cat.pieces.flatMap((piece) => {
    if (piece.published === false) return [];
    const atelier = resolveAtelier(piece.slug, piece.atelier);
    if (atelier) return [{ piece, atelier }];
    const complete = completeMakingOf(piece.slug, piece.atelier);
    return complete ? [{ piece, atelier: { making: complete, reveal: null, poster: complete.posters[complete.poster] || complete.posters[0] || "" } }] : [];
  });
  // Coming from the page of a piece (/atelier?piece=<slug>, Yoni 24/11/2026): its making-of starts at once, and the photos of
  // its steps wait here, at the top of the section, when the window is closed.
  const askedPiece = asked ? cat.pieces.find((p) => p.slug === asked && p.published !== false) : undefined;
  const askedFilm = askedPiece ? films.find((f) => f.piece.slug === askedPiece.slug) : undefined;
  const askedBox = askedPiece?.boxSlug ? cat.boxes.find((b) => b.slug === askedPiece.boxSlug) : undefined;
  const askedSteps = askedPiece ? makingSteps(askedPiece, askedBox?.images[0]).length > 0 : false;
  const [opened, setOpened] = useState("");
  if (askedFilm && opened !== asked) {
    setOpened(asked);
    setOpenSlug(asked);
  }
  const open = openSlug ? (films.find((f) => f.piece.slug === openSlug) ?? null) : null;
  useEffect(() => {
    if (!askedPiece) return;
    const el = document.getElementById("atelier-making-of");
    if (!el) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(el, { immediate: true, offset: -80 });
    else el.scrollIntoView({ block: "start" });
  }, [askedPiece]);
  if (films.length === 0 && !askedSteps) return null;
  return (
    <section id="atelier-making-of" aria-labelledby="atelier-films-title" data-atelier-films className="atelier-passage relative z-20 scroll-mt-24 border-t border-white/10 bg-ink">
      {askedPiece && askedSteps ? (
        <div data-atelier-piece={askedPiece.slug}>
          <MakingSteps piece={askedPiece} boxImage={askedBox?.images[0]} title={askedPiece.title} id="atelier-piece-title" />
          {askedFilm ? (
            <div className="wrap pt-8">
              <button type="button" onClick={() => setOpenSlug(askedFilm.piece.slug)} className="inline-flex min-h-12 items-center gap-3 border border-rose-light/70 px-6 text-base font-normal uppercase tracking-[0.14em] text-white transition-colors hover:bg-rose-light hover:text-ink lg:min-h-11 lg:text-[0.75rem]">
                <Play className="size-4 fill-current" aria-hidden="true" /> {t.films.open(askedPiece.title)}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="wrap py-16 lg:py-20">
        <Reveal>
          <p className="eyebrow">{t.films.sectionEyebrow}</p>
          <h2 id="atelier-films-title" className="title-caps tracking-[0.12em] mt-4 max-w-4xl t-title leading-[1.1] text-white [text-wrap:balance]">
            {t.films.sectionTitle}
          </h2>
          <p className="mt-4 max-w-xl text-base text-bone">{t.films.sectionLead}</p>
        </Reveal>
        <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-6">
          {films.map(({ piece, atelier }) => (
            <li key={piece.slug} data-atelier-film={piece.slug}>
              {/* A button: never hidden by an animation (a keyboard reaches each one). */}
              <button type="button" onClick={() => setOpenSlug(piece.slug)} aria-label={t.films.open(piece.title)} className="group block w-full text-start">
                <span className="relative block aspect-[4/5] overflow-hidden border border-white/10 bg-black">
                  {atelier.poster ? (
                    <Img
                      src={atelier.poster}
                      srcSet={srcSetOf(atelier.poster, posterWidth(atelier.making.width, atelier.making.height))}
                      sizes="(max-width: 767px) 46vw, (max-width: 1279px) 24vw, 18vw"
                      alt={piece.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.05]"
                    />
                  ) : null}
                  <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent" />
                  <span aria-hidden="true" className="absolute start-3 bottom-3 inline-flex size-10 items-center justify-center rounded-full border border-white/45 bg-black/50 text-white backdrop-blur-sm transition-colors group-hover:border-rose-light group-hover:text-rose-light">
                    <Play className="size-4 translate-x-px fill-current" />
                  </span>
                  <span aria-hidden="true" className="absolute end-3 bottom-3 bg-black/60 px-2 py-0.5 text-base text-bone tabular-nums lg:text-[0.75rem]">
                    {filmTime(atelier.making.duration)}
                  </span>
                </span>
                <span className="title-caps mt-3 block text-base leading-snug tracking-[0.08em] text-white group-hover:text-rose-light">{piece.title}</span>
                {madeFor(cat, piece) !== t.common.privateCollector ? <span className="mt-1 block text-base text-mist">{t.common.madeFor(madeFor(cat, piece), piece.type)}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {open ? <AtelierRoom title={open.piece.title} madeFor={madeFor(cat, open.piece)} type={open.piece.type} slug={open.piece.slug} atelier={open.atelier} world onClose={() => setOpenSlug(null)} /> : null}
    </section>
  );
}

/* ---------- Boxes ---------- */

/**
 * The photos of a box, under it (Yoni, 23/11/2026): the box stays as it is (open, if it was opened) while its photos are
 * looked at; "x photos" shows them in a row of thumbnails under the box, each opened full screen with the magnifying glass
 * (src/components/Lightbox.tsx); after them, a discreet "Enter the World" when its piece has its page (never a redirection).
 */
function BoxPhotos({ box, piece, open: boxOpen }: { box: Box; piece: TrunkPiece | null; open: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  return (
    // Its photos first (Yoni, 24/11/2026: his wife did not see there were more photos): one plain button that opens them all,
    // large (its professional photos, then the real photos and films of its handover); the way to its piece then, small,
    // once the box is open.
    <div data-box-gallery={box.slug} className="mt-4 flex flex-col items-start gap-1">
      {box.images.length > 0 ? (
        <button type="button" onClick={() => setOpen(0)} data-box-photos={box.slug} data-cta className="btn-primary">
          {t.boxes.discoverPhotos}
        </button>
      ) : null}
      {piece && boxOpen ? (
        <Link to={"/pieces/" + piece.slug} data-box-enter={piece.slug} data-trunk-piece={piece.slug} data-cta className="btn-secondary text-mist">
          {t.boxes.discoverPiece} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
          <span className="sr-only"> · {piece.title}</span>
        </Link>
      ) : null}
      {open !== null ? createPortal(<Lightbox items={box.images} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
    </div>
  );
}

/** One trunk of the page: its square (it opens in its film), its name, its words, its photos, then the way to its piece. */
function TrunkCard({ box, piece }: { box: Box; piece: TrunkPiece | null }) {
  const [open, setOpen] = useState(false);
  const trunk = trunkOf(box.slug);
  return (
    // The selection appears as the page scrolls; every card the same: the same square, the same spaces.
    <Reveal soft className="flex w-full flex-col">
      {trunk ? (
        <TrunkReveal slug={box.slug} name={box.name} trunk={trunk} piece={piece} onOpen={setOpen} />
      ) : (
        <div className="relative aspect-square w-full overflow-hidden bg-ink-soft">{box.images[0] ? <MediaView item={box.images[0]} fit="cover" /> : null}</div>
      )}
      <h3 className="title-caps mt-4 t-sub tracking-[0.1em] text-white">{box.name}</h3>
      {box.description ? <p className="mt-2 max-w-md text-base text-bone">{box.description}</p> : null}
      <BoxPhotos box={box} piece={piece} open={open} />
    </Reveal>
  );
}

/** The way to one's own trunk (24/11/2026): "Begin Your Creation", and WhatsApp with the request already written. */
function CreateBox() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-x-8">
      <Link to="/contact" data-cta className="btn-primary">
        {t.boxes.create}
      </Link>
      <a href={waLink(t.whatsapp.createBox)} target="_blank" rel="noreferrer" data-create-box data-cta className="btn-secondary">
        <BrandIcon name="whatsapp" className="size-4" /> {t.common.whatsapp}
      </a>
    </div>
  );
}

/**
 * The Signature Trunks (Yoni, 21 and 22/11/2026): every box closed at first, aligned the same way in a grid of equal squares
 * (one column on a phone), with its name; a click opens it (src/components/TrunkReveal.tsx), its piece rises from it, and
 * the buttons to create one's own and to discover the piece appear. Its text, its photos (full screen) stay under it. Each
 * has its anchor (#box-<address>): the page of its piece leads to it.
 */
export function Boxes() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const all = cat.boxes;
  /** The piece of a box, cut out of its photo, when it is known and on the site. */
  const pieceOf = (box: Box): TrunkPiece | null => {
    const piece = box.pieceSlug ? cat.pieces.find((p) => p.slug === box.pieceSlug && p.published !== false) : undefined;
    return piece ? { slug: piece.slug, title: piece.title, view: resolveShowcase(piece.slug, piece.showcase).views[0] ?? null } : null;
  };
  const { hash } = useLocation();
  // From the page of a piece (/boxes#box-<address>): its box, in view.
  useEffect(() => {
    if (!hash.startsWith("#box-")) return undefined;
    const id = window.requestAnimationFrame(() => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!el) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(el, { offset: -130, immediate: true, force: true });
      else el.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [hash]);
  // The trunk of the house first, then in the order of the catalogue (src/data/pieces.ts, BOXES); a box added in the admin after them.
  const rank = (b: Box) => (b.slug === FEATURED_BOX ? -1 : BOX_ORDER.has(b.slug) ? BOX_ORDER.get(b.slug)! : BOX_ORDER.size + all.indexOf(b));
  // Only the trunks that open in their film, in the staging of the page (Malik, 23/11/2026: one staging on the page, the v3);
  // one still waiting for its film (Keita, Malik Tillman) or for its v3 files (Signature, Photo Case, Trophy Trunk, Campione)
  // stays on the page of its piece and on the profile of its person.
  const boxes = all.filter(onTrunksPage).sort((a, b) => rank(a) - rank(b));

  return (
    <div className="pb-24">
      {/* The page starts with the trunks themselves (Yoni, 24/11/2026): its name on one small line, then the trunks. */}
      <PageIntro title={t.boxes.title} compact oneLine />

      <section aria-labelledby="boxes-list-title" className="wrap">
        <h2 id="boxes-list-title" className="sr-only">{t.boxes.listLabel}</h2>
        <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
          {boxes.map((box) => {
            return (
              <li key={box.slug} id={"box-" + box.slug} data-box={box.slug} className="flex scroll-mt-36">
                <TrunkCard box={box} piece={pieceOf(box)} />
              </li>
            );
          })}
        </ul>
        <div className="rule-rose my-14" aria-hidden="true" />
        <h2 className="mx-auto max-w-2xl text-center title-caps tracking-[0.12em] t-title text-white">{t.common.yourStory}</h2>
        <div className="mt-8 flex justify-center">
          <CreateBox />
        </div>
      </section>

    </div>
  );
}
