import { useEffect, useRef } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import ContactBlock from "@/components/ContactBlock";
import { MediaView } from "@/components/Media";
import PieceCard from "@/components/PieceCard";
import Reveal from "@/components/Reveal";
import ScrollVideo, { type ScrollStep } from "@/components/ScrollVideo";
import { defaultCatalogue, media } from "@/data/catalogue";
import { storyLines } from "@/data/featureFilms";
import pages from "@/data/pages.generated.json" with { type: "json" };
import { cutoutSrc, cutoutSrcSet, resolveShowcase } from "@/data/showcase";
import { yoni } from "@/data/sources";
import { SPECIAL_PROJECT } from "@/data/pieces";
import { publishedPress } from "@/data/press";
import type { Piece } from "@/data/types";
import { Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { getLenis } from "@/lib/gsap";

/*
 * The home page (Yoni, 23/11/2026, then the call of 23-24/11/2026: "luxury does not shout"): one large photo first, full
 * screen, as Rolex does — the Sirius trunk open, the BRT logo on the box, the chain and its pendant in their display: in one
 * photo, what Berete does. Then, smaller: who Berete is, beside one piece; the Dragon Ball pendant and its sphere that turns
 * (an invitation into its world, not an explanation); the great commissions (Inter Milan, VfB Stuttgart); a balanced
 * selection, the Safi Link first; the press.
 */

/** The piece of the opening: the Butterfly pendant, cut out of its photo, alone on black (without its purple forest). */
const HERO_PIECE = "michy-batshuayi-butterfly-pendant";
/**
 * Its photo (Yoni, 23/11/2026): the pendant on its chain, on the black bust ("chain", by default); "wing", the close-up of a
 * wing, may take its place at the top of the page one day.
 */
const HERO_PHOTOS = { chain: ["michy-batshuayi-butterfly-chain", "p54"], wing: ["michy-batshuayi-butterfly-chain", "p75"] } as const;
const HERO_PHOTO: keyof typeof HERO_PHOTOS = "chain";
/** The innovation: the Dragon Ball pendant and its Spirit Bomb that turns. */
const INNOVATION = "kevin-schade-dragon-ball-pendant";
/** A balanced selection (not only football): two pendants, two chains, two rings, in turn. */
const SELECTION = ["the-safi-link", "the-hand", "oval-eternity-band", "tulips-on-tour-medallion", "butterfly-chain", "bosnia-and-herzegovina-world-cup-2026-ring"];
/** The words of the Dragon Ball pendant on the home page: one sentence of its story (Yoni, 24/11/2026). */
const DRAGON_BALL_LINE = ["But to us, energy was never meant to remain still"];

/** Scrolls smoothly to an element (through Lenis when it runs). */
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(el, { offset: 0 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}

type Sized = { w: number; src: string };
const srcset = (list: Sized[]) => list.map((x) => x.src + " " + x.w + "w").join(", ");

/**
 * The opening (Yoni, 24/11/2026: "the answer was in front of us from the start", the last image of the former film): one
 * photo, full screen, still — no film, no animation, no split screen. The signature of the house, small and thin, in the black
 * of the floor (never over the BRT logo of the box nor over the chain); under it, a small "Discover More" that leads on.
 * Phones and screens held upright get its vertical version.
 */
function HeroPhoto() {
  const { t } = useI18n();
  const d = pages["hero-desktop"];
  const m = pages["hero-mobile"];
  return (
    <section aria-label="Berete Jewellers" data-home-photo className="relative h-svh min-h-[28rem] overflow-hidden bg-ink">
      <picture>
        <source media="(max-aspect-ratio: 1/1)" type="image/avif" srcSet={srcset(m.avif)} sizes="100vw" />
        <source media="(max-aspect-ratio: 1/1)" type="image/webp" srcSet={srcset(m.webp)} sizes="100vw" />
        <source type="image/avif" srcSet={srcset(d.avif)} sizes="100vw" />
        <img
          src={d.src}
          srcSet={srcset(d.webp)}
          sizes="100vw"
          alt={t.home.heroAlt}
          width={d.width}
          height={d.height}
          fetchPriority="high"
          decoding="async"
          data-home-photo-img
          className="absolute inset-x-0 top-0 bottom-[7.5rem] h-[calc(100%-7.5rem)] w-full object-cover object-[50%_68%] [@media(max-aspect-ratio:1/1)]:bottom-0 [@media(max-aspect-ratio:1/1)]:h-full [@media(max-aspect-ratio:1/1)]:object-[50%_62%]"
        />
      </picture>
      {/* On a screen held wide, the photo stops above a band of black where the words sit (never over the trunk, its logo or
          the chain); its floor melts into it. Upright, the words sit on the dark floor of the vertical photo. */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-[7.5rem] h-24 bg-linear-to-t from-ink to-transparent [@media(max-aspect-ratio:1/1)]:hidden" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[22%] bg-linear-to-t from-ink/80 via-ink/35 to-transparent [@media(min-aspect-ratio:1/1)]:hidden" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center [@media(min-aspect-ratio:1/1)]:h-[7.5rem] [@media(min-aspect-ratio:1/1)]:justify-center [@media(min-aspect-ratio:1/1)]:pb-2">
        <p data-home-tagline className="font-display text-base font-light uppercase tracking-[0.16em] whitespace-nowrap text-bone sm:text-[0.9375rem] sm:tracking-[0.32em]">
          {t.site.tagline}
        </p>
        <button type="button" onClick={() => scrollToId("home-next")} data-home-discover className="mt-3 inline-flex min-h-12 items-center gap-2 text-[0.75rem] font-normal uppercase tracking-[0.24em] text-mist transition-colors hover:text-rose-light max-sm:text-base">
          {t.home.discoverMore}
          <ArrowDown className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

/** The opening: who Berete is, in one sentence, beside one piece, large, on black, in a luxurious light. */
function Hero() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const piece = cat.pieces.find((p) => p.slug === HERO_PIECE);
  const [dir, file] = HERO_PHOTOS[HERO_PHOTO];
  const photo = yoni(dir, file, { alt: piece?.title ?? "" });
  return (
    <section id="home-next" aria-labelledby="home-title" data-home-hero className="relative isolate scroll-mt-0 overflow-hidden">
      {/* The light: a soft warm glow behind the piece, a touch of rose gold, the edges in deep black. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_70%_48%,rgba(232,180,160,0.13),rgba(156,91,79,0.05)_45%,transparent_72%)] max-lg:bg-[radial-gradient(80%_45%_at_50%_30%,rgba(232,180,160,0.13),rgba(156,91,79,0.05)_45%,transparent_75%)]" />
      <div className="mx-auto grid max-w-[1400px] items-center gap-6 px-5 pt-24 pb-16 sm:px-8 desk:pt-32 lg:grid-cols-12 lg:gap-12 lg:px-12 lg:pb-20">
        {/* The piece: the top of the screen on a phone, the right on a computer. */}
        <div className="relative h-[42svh] min-h-64 lg:order-2 lg:col-span-6 lg:h-[58svh] lg:max-h-[38rem]">
          {piece && photo ? (
            <Link to={"/pieces/" + piece.slug} data-hero-piece={piece.slug} data-hero-photo={HERO_PHOTO} className="home-hero-piece block h-full w-full" aria-label={t.common.enterWorld + " · " + piece.title}>
              <MediaView item={photo} alt={piece.title} fit="contain" priority sizes="(max-width: 1023px) 92vw, 55vw" />
            </Link>
          ) : piece ? (
            <MediaView item={piece.cover} alt={piece.title} fit="contain" priority sizes="(max-width: 1023px) 80vw, 50vw" />
          ) : null}
        </div>
        <div className="home-hero-text lg:order-1 lg:col-span-6 xl:col-span-5">
          <p className="eyebrow flex items-center gap-4">
            <span aria-hidden="true" className="bg-rose-gold hidden h-px w-10 sm:block" />
            {t.home.kicker}
          </p>
          <h1 id="home-title" className="mt-5 font-display t-hero font-light leading-[1.15] tracking-[0.01em] text-white [text-wrap:balance]">
            {t.home.hook}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-bone">{t.home.who}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 bg-white px-7 text-base font-medium uppercase tracking-[0.14em] text-ink transition-colors hover:bg-rose-light lg:min-h-11 lg:text-[0.8125rem]">
              {t.common.startPiece}
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
            <Link to="/creations" className="inline-flex min-h-12 items-center justify-center gap-2 border border-rose-light/70 px-7 text-base font-medium uppercase tracking-[0.14em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-11 lg:text-[0.8125rem]">
              {t.home.discover}
            </Link>
          </div>
          {piece ? (
            <p className="mt-10 text-base text-mist">
              <Link to={"/pieces/" + piece.slug} className="inline-flex min-h-12 items-center gap-2 hover:text-rose-light">
                <span aria-hidden="true" className="bg-rose-gold block h-px w-6" />
                {piece.title}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * The Dragon Ball pendant (Yoni, 24/11/2026: "the immersive part is not for the home page" — its film stays at the top of its
 * own page): its photo and, beside it, a circle where only its sphere turns, in a loop, silent, started when it comes on
 * screen (phones too). Not to explain the piece: to make one want to enter its world. Its title, one sentence, "Enter the World".
 */
function Innovation() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const piece = cat.pieces.find((p) => p.slug === INNOVATION);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sphere = pages.sphere;
  // The sphere turns while it is on screen, rests when it leaves; never with "reduce motion" (its first image stays).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const seen = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.isIntersecting) {
          if (!video.getAttribute("src")) video.setAttribute("src", sphere.video);
          void video.play().catch(() => undefined);
        } else video.pause();
      },
      { threshold: 0.3, rootMargin: "10% 0px" },
    );
    seen.observe(video);
    return () => seen.disconnect();
  }, [sphere.video]);
  if (!piece) return null;
  const view = resolveShowcase(piece.slug, piece.showcase).views[0];
  const line = storyLines(piece, defaultCatalogue.pieces.find((p) => p.slug === INNOVATION), DRAGON_BALL_LINE)[0];
  return (
    <section aria-labelledby="innovation-title" data-home-innovation className="border-t border-white/10">
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:px-12 lg:py-24">
        <div className="relative lg:col-span-6">
          <Link to={"/pieces/" + piece.slug} tabIndex={-1} aria-hidden="true" className="relative mx-auto block aspect-[4/5] w-full max-w-[22rem] lg:max-w-[26rem]">
            {view ? (
              <img src={cutoutSrc(piece.slug, view, view.widths[1] ?? view.widths[0]!)} srcSet={cutoutSrcSet(piece.slug, view)} sizes="(max-width: 1023px) 80vw, 26rem" alt="" width={view.width} height={view.height} loading="lazy" decoding="async" draggable={false} data-innovation-photo className="h-full w-full object-contain" />
            ) : (
              <MediaView item={piece.cover} alt="" fit="contain" sizes="(max-width: 1023px) 80vw, 26rem" />
            )}
          </Link>
          {/* Its sphere that turns, in a circle beside the piece. */}
          <div className="absolute end-0 bottom-0 w-[38%] max-w-44 sm:end-[6%] lg:end-0 lg:max-w-48">
            <div className="relative aspect-square overflow-hidden rounded-full border border-rose-light/40 bg-ink-soft shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
              <video ref={videoRef} poster={sphere.poster} muted loop playsInline preload="none" aria-label={t.home.innovation.film} data-sphere-film className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <h2 id="innovation-title" className="title-caps t-title leading-[1.15] tracking-[0.1em] [text-wrap:balance]">
            {t.feature.dragonTitle}
          </h2>
          {line ? <p className="mt-5 max-w-md text-base leading-relaxed text-bone">{line}</p> : null}
          <Link to={"/pieces/" + piece.slug} data-innovation-link className="mt-8 inline-flex min-h-12 items-center gap-3 border border-rose-light/70 px-6 text-base font-normal uppercase tracking-[0.16em] text-white transition-colors hover:bg-rose-light hover:text-ink lg:min-h-11 lg:text-[0.8125rem]">
            {t.common.enterWorld}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** The great commissions: the championship rings of Inter Milan and VfB Stuttgart, side by side, each leading to its capsule. */
function Commissions() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const rings = SPECIAL_PROJECT.map((r) => {
    const piece = cat.pieces.find((p) => p.slug === r.slug);
    // Its main photo (the ring whole, on black).
    return piece ? { ...r, piece, photo: piece.cover } : null;
  }).filter((r) => r !== null);
  if (rings.length === 0) return null;
  return (
    <section aria-labelledby="special-title" data-special-project className="border-t border-white/10">
      <div className="mx-auto max-w-[1400px] px-5 pt-16 pb-8 sm:px-8 lg:px-12 lg:pt-20 lg:pb-10">
        <p className="eyebrow">{t.home.special.eyebrow}</p>
        <h2 id="special-title" className="title-caps mt-4 t-title tracking-[0.14em] [text-wrap:balance]">
          {t.home.special.title}
        </h2>
        <p className="mt-5 max-w-2xl text-base text-bone">{t.home.special.lead}</p>
      </div>
      <ul className="mx-auto grid max-w-[1400px] gap-px bg-white/10 md:grid-cols-2">
        {rings.map((r) => (
          <li key={r.slug} data-special-ring={r.slug} className="bg-ink">
            <Link to={"/pieces/" + r.piece.slug} className="group flex h-full flex-col">
              <span className="relative block h-[36svh] min-h-60 overflow-hidden sm:h-[40svh] lg:max-h-[24rem]">
                <span className="absolute inset-0 p-6 transition-transform duration-[1.8s] ease-out group-hover:scale-[1.03] sm:p-8">
                  <MediaView item={r.photo} fit="contain" sizes="(max-width: 767px) 100vw, 50vw" />
                </span>
              </span>
              <span className="flex flex-1 flex-col px-5 pt-4 pb-8 sm:px-8 lg:pb-10">
                <span className="eyebrow">{r.piece.client ?? r.piece.title}</span>
                <span className="title-caps mt-2 block t-sub leading-[1.15] tracking-[0.08em] text-white [text-wrap:balance] group-hover:text-rose-light">{r.trophy}</span>
                {r.piece.line ? <span className="mt-3 block max-w-md text-base text-bone">{r.piece.line}</span> : null}
                <span className="mt-4 inline-flex min-h-11 items-center gap-3 text-base font-normal uppercase tracking-[0.14em] text-white group-hover:text-rose-light lg:min-h-10 lg:text-[0.8125rem]">
                  {t.home.special.discover}
                  <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A balanced selection of the house: pendants, chains and rings. */
function Selection() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const pieces = SELECTION.map((s) => cat.pieces.find((p) => p.slug === s)).filter((p): p is Piece => p !== undefined);
  if (pieces.length === 0) return null;
  return (
    <section aria-labelledby="selection-title" data-home-selection className="border-t border-white/10">
      <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">{t.home.selection.eyebrow}</p>
            <h2 id="selection-title" className="title-caps mt-4 t-title tracking-[0.14em]">{t.home.selection.title}</h2>
          </div>
          <Link to="/creations" className="inline-flex min-h-12 items-center gap-2 text-base font-medium uppercase tracking-[0.2em] text-white hover:text-rose-light">
            {t.common.allCreations} <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-3 lg:gap-x-8">
          {pieces.map((p, i) => (
            <li key={p.slug}>
              <Reveal delay={(i % 3) * 0.06} className="h-full">
                <PieceCard piece={p} showType />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The press band: the newspapers that told the house, leading to the page In the Spotlight. */
function PressBand() {
  const { t } = useI18n();
  const articles = publishedPress();
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="press-band-title" data-home-press className="border-y border-white/10">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 py-12 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12 lg:py-14">
        <div className="shrink-0">
          <p className="eyebrow">{t.press.eyebrow}</p>
          <h2 id="press-band-title" className="title-caps mt-3 t-lead tracking-[0.14em]">{t.press.title}</h2>
        </div>
        <ul className="flex flex-wrap items-center gap-x-10 gap-y-4 lg:justify-center">
          {articles.map((a) => (
            <li key={a.url}>
              <a href={a.url} target="_blank" rel="noreferrer" data-press-outlet={a.outlet} className="inline-flex min-h-12 items-center font-display t-sub uppercase tracking-[0.12em] text-bone transition-colors hover:text-rose-light">
                {a.outlet}
              </a>
            </li>
          ))}
        </ul>
        <Link to="/press" className="inline-flex min-h-12 shrink-0 items-center gap-2 text-base font-medium uppercase tracking-[0.2em] text-white hover:text-rose-light">
          {t.press.all} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/**
 * The very first thing seen (Yoni, 23/11/2026): the pencil sketch that becomes the jewel, the film of The Bespoke Journey,
 * moved by the scroll only (never by itself), with the name of the house at its start and its signature at its end.
 */
// Off the home page since 24/11/2026 (Yoni: one photo instead); kept for later.
export function SketchToJewel() {
  const { t } = useI18n();
  const film = media.scroll.process;
  if (!film) return null;
  const steps: ScrollStep[] = [
    {
      from: 0,
      to: 0.12,
      align: "center",
      content: (
        <div data-sketch-intro className="mx-auto max-w-3xl text-center [text-shadow:0_2px_30px_rgba(0,0,0,0.75)]">
          <p className="font-display text-base uppercase tracking-[0.28em] text-rose-light">{t.home.kicker}</p>
          <p className="mt-6 text-base text-bone">{t.scroll.hint}</p>
        </div>
      ),
    },
    {
      from: 0.82,
      to: 1,
      align: "center",
      content: <p className="title-caps mx-auto max-w-4xl text-center t-title tracking-[0.12em] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.75)]">{t.site.tagline}</p>,
    },
  ];
  return <ScrollVideo media={film} steps={steps} label={t.home.sketchLabel} heightVh={320} showProgress={false} />;
}

export default function Home() {
  return (
    <>
      <HeroPhoto />
      <Hero />
      <Innovation />
      <Commissions />
      <Selection />
      <PressBand />
      <ContactBlock id="home-contact" compact />
    </>
  );
}
