import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import ContactBlock from "@/components/ContactBlock";
import { MediaView } from "@/components/Media";
import PieceCard from "@/components/PieceCard";
import Reveal from "@/components/Reveal";
import mechanisms from "@/data/mechanisms.generated.json" with { type: "json" };
import { SPECIAL_PROJECT } from "@/data/pieces";
import { publishedPress } from "@/data/press";
import { CUTOUTS, cutoutSrc, cutoutSrcSet, type CutoutView } from "@/data/showcase";
import type { Piece } from "@/data/types";
import { Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";

/*
 * The home page (Yoni, 23/11/2026): calm and clear, the world of Berete understood in thirty seconds. Deep black, a few
 * words, one piece. No stories, no film in the background, no universe of a capsule (the universes live in the capsules
 * only), almost no animation. In this order: who Berete is, beside one piece; the rotating sphere of the Dragon Ball pendant;
 * the great commissions (Inter Milan, VfB Stuttgart); a balanced selection of pendants, chains and rings; the press.
 */

/** The piece of the opening: the Butterfly pendant, cut out of its photo, alone on black (without its purple forest). */
const HERO_PIECE = "michy-batshuayi-butterfly-pendant";
/** The innovation: the Dragon Ball pendant and its Spirit Bomb that turns. */
const INNOVATION = "kevin-schade-dragon-ball-pendant";
/** A balanced selection (not only football): two pendants, two chains, two rings, in turn. */
const SELECTION = ["the-hand", "butterfly-chain", "oval-eternity-band", "tulips-on-tour-medallion", "sirius", "bosnia-and-herzegovina-world-cup-2026-ring"];

/** The main cutout of a piece (its face view), if it has a clean one. */
function faceOf(slug: string): CutoutView | null {
  const views = (CUTOUTS[slug] ?? []).filter((v) => v.clean);
  return views.find((v) => v.kind === "face") ?? views[0] ?? null;
}

function Cutout({ slug, view, alt, sizes, priority = false, className = "" }: { slug: string; view: CutoutView; alt: string; sizes: string; priority?: boolean; className?: string }) {
  return (
    <img
      src={cutoutSrc(slug, view, view.widths[1] ?? view.widths[0]!)}
      srcSet={cutoutSrcSet(slug, view)}
      sizes={sizes}
      alt={alt}
      width={view.width}
      height={view.height}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      draggable={false}
      className={"h-full w-full object-contain " + className}
    />
  );
}

/** The opening: who Berete is, in one sentence, beside one piece, large, on black, in a luxurious light. */
function Hero() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const piece = cat.pieces.find((p) => p.slug === HERO_PIECE);
  const view = faceOf(HERO_PIECE);
  return (
    <section aria-labelledby="home-title" data-home-hero className="relative isolate overflow-hidden bg-[#050505]">
      {/* The light: a soft warm glow behind the piece, a touch of rose gold, the edges in deep black. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_70%_48%,rgba(232,180,160,0.13),rgba(156,91,79,0.05)_45%,transparent_72%)] max-lg:bg-[radial-gradient(80%_45%_at_50%_30%,rgba(232,180,160,0.13),rgba(156,91,79,0.05)_45%,transparent_75%)]" />
      <div className="mx-auto grid min-h-svh max-w-[1600px] items-center gap-6 px-5 pt-24 pb-14 sm:px-8 desk:pt-32 lg:grid-cols-12 lg:gap-10 lg:px-12 lg:pb-16">
        {/* The piece: the top of the screen on a phone, the right on a computer. */}
        <div className="relative h-[46svh] min-h-64 lg:order-2 lg:col-span-6 lg:h-[76svh] xl:col-span-7">
          {piece && view ? (
            <Link to={"/pieces/" + piece.slug} data-hero-piece={piece.slug} className="home-hero-piece block h-full w-full" aria-label={t.common.enterWorld + " · " + piece.title}>
              <Cutout slug={piece.slug} view={view} alt={piece.title} sizes="(max-width: 1023px) 80vw, 50vw" priority className="drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]" />
            </Link>
          ) : piece ? (
            <MediaView item={piece.cover} alt={piece.title} fit="contain" priority sizes="(max-width: 1023px) 80vw, 50vw" />
          ) : null}
        </div>
        <div className="home-hero-text lg:order-1 lg:col-span-6 xl:col-span-5">
          <p className="flex items-center gap-4 font-display text-base uppercase tracking-[0.16em] text-rose-light sm:tracking-[0.28em]">
            <span aria-hidden="true" className="bg-rose-gold hidden h-px w-12 sm:block" />
            {t.home.kicker}
          </p>
          <h1 id="home-title" className="mt-6 font-display text-[clamp(1.875rem,4.2vw,3.5rem)] font-light leading-[1.12] tracking-[0.01em] text-white [text-wrap:balance]">
            {t.home.hook}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-bone md:text-lg">{t.home.who}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 bg-white px-7 text-base font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:bg-rose-light">
              {t.common.startPiece}
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
            <Link to="/creations" className="inline-flex min-h-12 items-center justify-center gap-2 border border-rose-light/70 px-7 text-base font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:border-rose-light hover:text-rose-light">
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

/** The innovation: the Spirit Bomb of the Dragon Ball pendant, engineered to rotate; its film plays at a click (never by itself). */
function Innovation() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const piece = cat.pieces.find((p) => p.slug === INNOVATION);
  const view = faceOf(INNOVATION);
  const film = mechanisms["dragon-ball-sphere"];
  // Its file is asked for at the first click only; the film plays then (muted, it may play outside of the click itself).
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (started) void videoRef.current?.play().catch(() => undefined);
  }, [started]);
  if (!piece) return null;
  const play = () => {
    const v = videoRef.current;
    if (started && v) {
      v.currentTime = 0;
      void v.play().catch(() => undefined);
    } else setStarted(true);
  };
  return (
    <section aria-labelledby="innovation-title" data-home-innovation className="border-t border-white/10 bg-ink">
      <div className="mx-auto grid max-w-[1600px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:px-12 lg:py-28">
        <div className="relative lg:col-span-6">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-xl">
            {view ? <Cutout slug={piece.slug} view={view} alt={piece.title} sizes="(max-width: 1023px) 90vw, 45vw" /> : <MediaView item={piece.cover} alt={piece.title} fit="contain" sizes="(max-width: 1023px) 90vw, 45vw" />}
            {/* The film of its sphere turning, before the setting: in a circle, at a click. */}
            {film ? (
              <div className="absolute end-0 bottom-0 w-[42%] max-w-56 sm:w-[38%]">
                <div className="relative aspect-square overflow-hidden rounded-full border border-rose-light/50 bg-ink-soft shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                  <video
                    ref={videoRef}
                    src={started ? film.video : undefined}
                    poster={film.poster}
                    muted
                    playsInline
                    preload="none"
                    onPlaying={() => setPlaying(true)}
                    onEnded={() => setPlaying(false)}
                    data-sphere-film
                    aria-label={t.home.innovation.film}
                    className="h-full w-full object-cover"
                  />
                  {!playing ? (
                    <button type="button" onClick={play} data-sphere-play className="absolute inset-0 flex items-center justify-center bg-ink/35 text-white transition-colors hover:bg-ink/20" aria-label={t.home.innovation.play}>
                      <span className="flex size-12 items-center justify-center rounded-full border border-white/70 bg-ink/50">
                        <Play className="size-5 translate-x-0.5 fill-current" aria-hidden="true" />
                      </span>
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-center text-base text-mist">{t.home.innovation.caption}</p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <p className="eyebrow">{t.home.innovation.eyebrow}</p>
          <h2 id="innovation-title" className="title-caps mt-5 text-[clamp(1.75rem,3.6vw,3rem)] leading-[1.1] tracking-[0.08em] [text-wrap:balance]">
            {t.home.innovation.title}
          </h2>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-bone md:text-lg">{t.home.innovation.text}</p>
          <p className="mt-3 text-base text-mist">{piece.title}</p>
          <Link to={"/pieces/" + piece.slug} data-innovation-link className="mt-8 inline-flex min-h-12 items-center gap-3 border border-rose-light/80 px-7 text-base font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-rose-light hover:text-ink">
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
    <section aria-labelledby="special-title" data-special-project className="border-t border-white/10 bg-ink">
      <div className="mx-auto max-w-[1600px] px-5 pt-20 pb-10 sm:px-8 lg:px-12 lg:pt-28 lg:pb-12">
        <p className="eyebrow">{t.home.special.eyebrow}</p>
        <h2 id="special-title" className="title-caps mt-4 text-[clamp(1.75rem,4vw,3.25rem)] tracking-[0.14em] [text-wrap:balance]">
          {t.home.special.title}
        </h2>
        <p className="mt-5 max-w-2xl text-base text-bone md:text-lg">{t.home.special.lead}</p>
      </div>
      <ul className="mx-auto grid max-w-[1600px] gap-px bg-white/10 md:grid-cols-2">
        {rings.map((r) => (
          <li key={r.slug} data-special-ring={r.slug} className="bg-ink">
            <Link to={"/pieces/" + r.piece.slug} className="group flex h-full flex-col">
              <span className="relative block h-[44svh] min-h-72 overflow-hidden sm:h-[52svh]">
                <span className="absolute inset-0 p-6 transition-transform duration-[1.8s] ease-out group-hover:scale-[1.03] sm:p-10">
                  <MediaView item={r.photo} fit="contain" sizes="(max-width: 767px) 100vw, 50vw" />
                </span>
              </span>
              <span className="flex flex-1 flex-col px-5 pt-5 pb-10 sm:px-10 lg:pb-12">
                <span className="eyebrow">{r.piece.client ?? r.piece.title}</span>
                <span className="title-caps mt-3 block text-[clamp(1.5rem,2.6vw,2.375rem)] leading-[1.05] tracking-[0.08em] text-white [text-wrap:balance] group-hover:text-rose-light">{r.trophy}</span>
                {r.piece.line ? <span className="mt-3 block max-w-md text-base text-bone md:text-lg">{r.piece.line}</span> : null}
                <span className="mt-6 inline-flex min-h-12 items-center gap-3 text-base font-semibold uppercase tracking-[0.14em] text-white group-hover:text-rose-light">
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
    <section aria-labelledby="selection-title" data-home-selection className="border-t border-white/10 bg-ink">
      <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">{t.home.selection.eyebrow}</p>
            <h2 id="selection-title" className="title-caps mt-4 text-[clamp(1.75rem,4vw,3.25rem)] tracking-[0.14em]">{t.home.selection.title}</h2>
          </div>
          <Link to="/creations" className="inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] text-white hover:text-rose-light">
            {t.common.allCreations} <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-12 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
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
    <section aria-labelledby="press-band-title" data-home-press className="border-y border-white/10 bg-ink">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12 lg:py-16">
        <div className="shrink-0">
          <p className="eyebrow">{t.press.eyebrow}</p>
          <h2 id="press-band-title" className="title-caps mt-3 text-[clamp(1.5rem,2.6vw,2.25rem)] tracking-[0.14em]">{t.press.title}</h2>
        </div>
        <ul className="flex flex-wrap items-center gap-x-10 gap-y-4 lg:justify-center">
          {articles.map((a) => (
            <li key={a.url}>
              <a href={a.url} target="_blank" rel="noreferrer" data-press-outlet={a.outlet} className="inline-flex min-h-12 items-center font-display text-[clamp(1.25rem,2vw,1.75rem)] uppercase tracking-[0.12em] text-bone transition-colors hover:text-rose-light">
                {a.outlet}
              </a>
            </li>
          ))}
        </ul>
        <Link to="/press" className="inline-flex min-h-12 shrink-0 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] text-white hover:text-rose-light">
          {t.press.all} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Innovation />
      <Commissions />
      <Selection />
      <PressBand />
      <ContactBlock id="home-contact" compact />
    </>
  );
}
