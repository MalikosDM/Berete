import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { createPortal } from "react-dom";
import { ArrowRight, Images, Play } from "lucide-react";
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
import { filmTime, resolveAtelier, type ResolvedAtelier } from "@/data/atelier";
import { completeMakingOf, makingSteps } from "@/data/making";
import { media } from "@/data/catalogue";
import { BOXES, FEATURED_BOX } from "@/data/pieces";
import { resolveShowcase } from "@/data/showcase";
import { extra } from "@/data/sources";
import { trunkOf } from "@/data/trunks";
import type { Box, MediaItem, Piece } from "@/data/types";
import { Link, useI18n, useMadeFor } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { getLenis, gsap, useReducedMotion } from "@/lib/gsap";
import { srcSetOf } from "@/lib/responsive";
import { waLink } from "@/lib/site";

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.75)]";

/** The place of each box of the catalogue on the page of the trunks. */
const BOX_ORDER = new Map(BOXES.map((b, i) => [b.slug, i]));

export default function Atelier() {
  const { t } = useI18n();
  /* The atelier photos, in the order of their numbers (warm black and white from the import). */
  const STEPS = t.atelier.steps;
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  // The opening film: a horizontal shot of a piece assembled at the bench (Yoni's films, scripts/hd-media.mjs), in the
  // warm black and white of the atelier; the earlier vertical film when it is missing.
  const setting = media.hd?.["atelier"]?.["v12"] ?? media.videos["atelier/setting"];
  const photos: MediaItem[] = media.groups["atelier"] ?? [];

  // Each step opens through a mask, with a light parallax.
  useEffect(() => {
    if (reduced || !root.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-mask]").forEach((el, i) => {
        const from = i % 2 === 0 ? "inset(18% 12% 18% 12%)" : "circle(14% at 50% 50%)";
        const to = i % 2 === 0 ? "inset(0% 0% 0% 0%)" : "circle(80% at 50% 50%)";
        gsap.fromTo(el, { clipPath: from }, { clipPath: to, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "top top", scrub: true } });
        const img = el.querySelector("img");
        if (img) gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
      });
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <div ref={root}>
      {/* Opening: the setting film, full screen, silent, playing only while visible */}
      <section aria-labelledby="atelier-title" className="relative flex h-svh items-end overflow-hidden bg-ink">
        {setting ? <LoopVideo item={setting} label={t.atelier.filmLabel} className="absolute inset-0 h-full w-full object-cover" /> : null}
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink via-ink/40 to-ink/30" />
        <div className={"relative mx-auto w-full max-w-[1600px] px-5 pb-28 sm:px-8 md:pb-20 lg:px-12 " + shadow}>
          <p className="eyebrow">{t.atelier.eyebrow}</p>
          <h1 id="atelier-title" className="title-caps mt-4 t-hero tracking-[0.16em] text-white">{t.atelier.title}</h1>
          <p className="mt-4 max-w-lg text-base text-bone">{t.atelier.lead}</p>
        </div>
      </section>

      {/* The philosophy of the house (Yoni, 23/11/2026). */}
      <section aria-labelledby="philosophy-title" data-philosophy className="relative z-20 bg-ink">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:gap-14 lg:px-12 lg:py-20">
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
              <div className="relative z-10 mx-auto flex h-full max-w-[1600px] flex-col justify-end px-5 pb-28 sm:px-8 md:pb-20 lg:px-12">
                <span aria-hidden="true" className="text-rose-gold block font-display text-3xl font-light md:text-4xl">{String(i + 1).padStart(2, "0")}</span>
                <h3 className={"title-caps mt-3 t-lead text-white " + shadow}>{step.title}</h3>
                <div className="rule-rose my-4 max-w-[12rem]" aria-hidden="true" />
                <p className={"max-w-xl text-lg text-bone " + shadow}>{step.text}</p>
              </div>
            </article>
          );
        })}
      </section>

      <Mechanisms />

      <AtelierFilms />

      <section className="relative z-20 bg-ink px-5 py-16 text-center sm:px-8 md:py-20">
        <Reveal>
          <p className="eyebrow">{t.common.yourPiece}</p>
          <h2 className="title-caps mx-auto mt-6 max-w-4xl t-title text-white">{t.atelier.ctaTitle}</h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-bone">{t.atelier.ctaText}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/contact" className="inline-flex min-h-12 items-center gap-3 bg-white px-8 text-base font-medium text-ink transition hover:bg-rose-light">
              {t.common.startPiece} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
            <Link to="/process" className="border-rose-gold inline-flex min-h-12 items-center gap-3 px-8 text-base text-white transition hover:text-rose-light">
              {t.atelier.seeProcess}
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
            <div className="mx-auto max-w-[1600px] px-5 pt-8 sm:px-8 lg:px-12">
              <button type="button" onClick={() => setOpenSlug(askedFilm.piece.slug)} className="inline-flex min-h-12 items-center gap-3 border border-rose-light/70 px-6 text-base font-normal uppercase tracking-[0.14em] text-white transition-colors hover:bg-rose-light hover:text-ink lg:min-h-11 lg:text-[0.8125rem]">
                <Play className="size-4 fill-current" aria-hidden="true" /> {t.films.open(askedPiece.title)}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <Reveal>
          <p className="eyebrow">{t.films.sectionEyebrow}</p>
          <h2 id="atelier-films-title" className="title-caps mt-4 max-w-4xl t-title leading-[1.1] tracking-[0.1em] text-white [text-wrap:balance]">
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
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.05]"
                    />
                  ) : null}
                  <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent" />
                  <span aria-hidden="true" className="absolute start-3 bottom-3 inline-flex size-10 items-center justify-center rounded-full border border-white/45 bg-black/50 text-white backdrop-blur-sm transition-colors group-hover:border-rose-light group-hover:text-rose-light">
                    <Play className="size-4 translate-x-px fill-current" />
                  </span>
                  <span aria-hidden="true" className="absolute end-3 bottom-3 bg-black/60 px-2 py-0.5 text-base text-bone tabular-nums lg:text-[0.8125rem]">
                    {filmTime(atelier.making.duration)}
                  </span>
                </span>
                <span className="title-caps mt-3 block text-base leading-snug tracking-[0.08em] text-white group-hover:text-rose-light lg:text-[0.9375rem]">{piece.title}</span>
                <span className="mt-1 block text-base text-mist lg:text-[0.875rem]">{t.common.madeFor(madeFor(cat, piece))}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {open ? <AtelierRoom title={open.piece.title} madeFor={madeFor(cat, open.piece)} slug={open.piece.slug} atelier={open.atelier} world onClose={() => setOpenSlug(null)} /> : null}
    </section>
  );
}

/* ---------- Boxes ---------- */

/**
 * The photos of a box, under it (Yoni, 23/11/2026): the box stays as it is (open, if it was opened) while its photos are
 * looked at; "x photos" shows them in a row of thumbnails under the box, each opened full screen with the magnifying glass
 * (src/components/Lightbox.tsx); after them, a discreet "Enter the World" when its piece has its page (never a redirection).
 */
function BoxPhotos({ box, piece }: { box: Box; piece: TrunkPiece | null }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const zone = useRef<HTMLDivElement>(null);
  if (box.images.length === 0) return null;
  const id = "box-photos-" + box.slug;
  return (
    // The magnifying glass of the pieces over its photos too (computers); looking at them never closes the trunk.
    <div ref={zone} data-box-gallery={box.slug} className="relative">
      <p className="mt-2 flex flex-wrap gap-x-6">
        <button type="button" onClick={() => setShown((v) => !v)} aria-expanded={shown} aria-controls={id} data-box-photos={box.slug} className="inline-flex min-h-12 items-center gap-2 text-base font-medium text-white hover:text-rose-light">
          <Images className="size-4" aria-hidden="true" /> {shown ? t.boxes.hidePhotos : t.boxes.photos(box.images.length)}
        </button>
      </p>
      {shown ? (
        <div id={id}>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
            {box.images.map((m, i) => (
              <li key={m.src}>
                <button type="button" onClick={() => setOpen(i)} data-box-photo={i} className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden bg-ink-soft" aria-label={t.gallery.open(m.alt ?? box.name)}>
                  <MediaView item={m} fit="cover" sizes="(max-width: 639px) 30vw, 10vw" />
                </button>
              </li>
            ))}
          </ul>
          {piece ? (
            <Link to={"/pieces/" + piece.slug} data-box-enter={piece.slug} className="mt-3 inline-flex min-h-12 items-center gap-2 text-base text-mist underline-offset-4 hover:text-rose-light hover:underline">
              {t.common.enterWorld} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              <span className="sr-only"> · {piece.title}</span>
            </Link>
          ) : null}
        </div>
      ) : null}
      {open !== null ? createPortal(<Lightbox items={box.images} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
    </div>
  );
}

/** "Create your own box": a WhatsApp conversation, the request already written. */
function CreateBox() {
  const { t } = useI18n();
  return (
    <a
      href={waLink(t.whatsapp.createBox)}
      target="_blank"
      rel="noreferrer"
      data-create-box
      className="inline-flex min-h-12 items-center justify-center gap-3 bg-white px-6 text-base font-medium uppercase tracking-[0.12em] text-ink transition-colors hover:bg-rose-light lg:min-h-11 lg:text-[0.8125rem]"
    >
      <BrandIcon name="whatsapp" className="size-5" /> {t.boxes.create}
    </a>
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
  const heroTrunk = extra("boxes/hero", "dragon-ball-closed", { alt: t.boxes.heroAlt, onBlack: false });

  return (
    <div className="pb-24">
      <PageIntro eyebrow={t.boxes.eyebrow} title={t.boxes.title} lead={t.boxes.lead}>
        <CreateBox />
      </PageIntro>

      {/* An example, large, first (Yoni, 23/11/2026): the Dragon Ball trunk as it is, its artwork and the BRT mark on its face. */}
      {heroTrunk ? (
        <section aria-label={heroTrunk.alt} data-boxes-hero className="mx-auto mb-14 max-w-[1240px] px-5 sm:px-8 lg:mb-16 lg:px-12">
          <div className="relative overflow-hidden border border-white/10 bg-ink-soft">
            <MediaView item={heroTrunk} fit="contain" priority sizes="(max-width: 1599px) 100vw, 1600px" className="max-h-[min(62svh,40rem)] w-full" />
          </div>
          <a href="#box-dragon-ball-trunk" className="mt-4 inline-flex min-h-12 items-center gap-2 text-base text-mist hover:text-rose-light">
            {t.boxes.heroLink} <ArrowRight className="size-4 rotate-90" aria-hidden="true" />
          </a>
        </section>
      ) : null}

      <section aria-labelledby="boxes-list-title" className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-12">
        <h2 id="boxes-list-title" className="eyebrow">{t.boxes.listLabel}</h2>
        <p className="title-caps mt-4 mb-10 t-lead leading-[1.15] tracking-[0.1em] text-white [text-wrap:balance]">{t.boxes.closing}</p>
        <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
          {boxes.map((box) => {
            const trunk = trunkOf(box.slug);
            return (
              <li key={box.slug} id={"box-" + box.slug} data-box={box.slug} className="scroll-mt-36">
                {/* The selection appears as the page scrolls. */}
                <Reveal soft>
                {trunk ? (
                  <TrunkReveal slug={box.slug} name={box.name} trunk={trunk} piece={pieceOf(box)} />
                ) : (
                  <div className="relative aspect-square w-full overflow-hidden bg-ink-soft">{box.images[0] ? <MediaView item={box.images[0]} fit="cover" /> : null}</div>
                )}
                <h3 className="title-caps mt-4 t-sub tracking-[0.1em] text-white">{box.name}</h3>
                {box.description ? <p className="mt-3 max-w-md text-base text-bone">{box.description}</p> : null}
                <BoxPhotos box={box} piece={pieceOf(box)} />
                </Reveal>
              </li>
            );
          })}
        </ul>
        <div className="rule-rose my-14" aria-hidden="true" />
        <p className="mx-auto max-w-2xl text-center font-display t-lead text-white">{t.common.yourStory}</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <CreateBox />
          <Link to="/contact" className="inline-flex min-h-12 items-center justify-center gap-3 border border-white/40 px-6 text-base font-medium uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-11 lg:text-[0.8125rem]">
            {t.common.startPiece} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
      </section>

    </div>
  );
}
