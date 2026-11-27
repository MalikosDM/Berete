import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { MediaView, posterBehind } from "@/components/Media";
import PieceCard from "@/components/PieceCard";
import PieceThumb from "@/components/PieceThumb";
import Reveal from "@/components/Reveal";
import ScrollVideo, { type ScrollStep } from "@/components/ScrollVideo";
import { media } from "@/data/catalogue";
import { HOUSE_PIECE, MECHANISM_PIECE } from "@/data/homeTexts";
import pages from "@/data/pages.generated.json" with { type: "json" };
import { cutoutSrc, cutoutSrcSet, isCutTop, resolveShowcase } from "@/data/showcase";
import { yoni } from "@/data/sources";
import { SPECIAL_PROJECT } from "@/data/pieces";
import { publishedPress } from "@/data/press";
import type { Piece } from "@/data/types";
import { Link, useI18n, useLocale } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { getLenis } from "@/lib/gsap";
import { homeText, useHomeTexts } from "@/lib/homeTexts";
import { waLink } from "@/lib/site";
import { useWhatsAppMessage } from "@/lib/whatsapp";

/*
 * The home page (Yoni, 23/11/2026, then the call of 23-24/11/2026: "luxury does not shout"): one large photo first, full
 * screen, as Rolex does — the Sirius trunk open, the BRT logo on the box, the chain and its pendant in their display: in one
 * photo, what Berete does. Then, smaller: who Berete is, beside one piece; the Dragon Ball pendant and its sphere that turns
 * (an invitation into its world, not an explanation); the great commissions (Inter Milan, VfB Stuttgart); a balanced
 * selection, the Safi Link first; the press.
 * (Yoni, 26/11/2026: no more empty space on the sides) Each section with one piece sets it on one side, in turn left and
 * right, and beside it its words: its title, a short text about the piece (src/data/homeTexts.ts: the line of the piece, or
 * the text written in the admin), its way in. On a phone, the piece and then its words, one under the other.
 */

/** The piece of the house: the Butterfly pendant (src/data/homeTexts.ts). */
const HERO_PIECE = HOUSE_PIECE;
/**
 * Its photo (Yoni, 23/11/2026): the pendant on its chain, on the black bust ("chain", by default); "wing", the close-up of a
 * wing, may take its place at the top of the page one day.
 */
const HERO_PHOTOS = { chain: ["michy-batshuayi-butterfly-chain", "p54"], wing: ["michy-batshuayi-butterfly-chain", "p75"] } as const;
const HERO_PHOTO: keyof typeof HERO_PHOTOS = "chain";
/** The innovation: the Dragon Ball pendant and its Spirit Bomb that turns. */
const INNOVATION = MECHANISM_PIECE;
/** A balanced selection (not only football): two pendants, two chains, two rings, in turn. */
const SELECTION = ["the-safi-link", "the-hand", "oval-eternity-band", "tulips-on-tour-medallion", "butterfly-chain", "bosnia-and-herzegovina-world-cup-2026-ring"];

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
  // Phones and screens held upright (25/11/2026): the same photo, framed on the two cases, both whole and centred.
  const m = pages["hero-phone"];
  // (Yoni, 24/11/2026, on his 13-inch MacBook: the trunk was cut and room was left under it.) The photo starts under the
  // header (the header on black, never over the photo), whole (its handle, the SIRIUS plate, the chain), centred in the room
  // left; its box has the shape of the photo (a container query), so its sides and its floor melt into the black of the page
  // without an edge. Its signature and "Discover More" sit small on its floor, never over the trunk.
  return (
    <section aria-label="Berete Jewellers" data-home-photo className="relative flex h-svh min-h-[24rem] flex-col bg-ink pt-[calc(4rem+1px)] desk:pt-[calc(6.25rem+1px)]">
      <div data-home-photo-frame className="home-photo-frame relative min-h-0 flex-1" style={{ "--r": d.width / d.height, "--rm": m.width / m.height } as CSSProperties}>
        <div data-home-photo-box className="home-photo-box absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <picture>
            <source media="(max-aspect-ratio: 1/1)" type="image/avif" srcSet={srcset(m.avif)} sizes="100vw" />
            <source media="(max-aspect-ratio: 1/1)" type="image/webp" srcSet={srcset(m.webp)} sizes="100vw" />
            <source type="image/avif" srcSet={srcset(d.avif)} sizes="100vw" />
            <img src={d.src} srcSet={srcset(d.webp)} sizes="100vw" alt={t.home.heroAlt} width={d.width} height={d.height} fetchPriority="high" decoding="async" data-home-photo-img className="h-full w-full object-cover" />
          </picture>
        </div>
        {/* On the floor of the photo, small, at the foot of its box (never over the trunk). */}
        <div className="home-photo-caption absolute inset-x-0 flex flex-col items-center px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center">
          <p data-home-tagline className="font-display text-base font-light uppercase tracking-[0.16em] text-balance text-bone sm:whitespace-nowrap sm:text-[0.9375rem] sm:tracking-[0.32em]">
            {t.site.tagline}
          </p>
          <button type="button" onClick={() => scrollToId("home-next")} data-home-discover data-cta className="btn-secondary mt-1 text-mist">
            {t.home.discoverMore}
            <ArrowDown className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

type Side = "start" | "end";

/**
 * One section of the home page with one piece (Yoni, 26/11/2026: "the jewel on the right or on the left, and the descriptive
 * writing beside it, instead of empty space here and there"): the piece on one side, in turn left and right ("start" / "end":
 * mirrored in Arabic), its words on the other — its title, a line of the house when there is one, the name of the piece when
 * the title is not it, its short text (src/data/homeTexts.ts) and its way in. On a phone: the piece, then its words, centred.
 */
function Feature({ id, data, side, visual, title, heading = "h2", lead, name, block, text, link, attrs, linkAttrs }: { id: string; data: string; side: Side; visual: ReactNode; title: string; heading?: "h1" | "h2"; lead?: string; name?: string; block: string; text: string; link?: { to: string; label: string }; attrs?: Record<string, string>; linkAttrs?: Record<string, string> }) {
  const H = heading;
  return (
    <section id={id} aria-labelledby={id + "-title"} data-home-story={data} data-home-side={side} {...attrs} className="scroll-mt-0 border-t border-white/10">
      <div className="wrap grid items-center gap-y-10 py-20 lg:grid-cols-2 lg:gap-x-16 lg:py-24 xl:gap-x-24">
        {/* The piece against the inner side of its half, toward its words (the empty space, if any, at the edges of the page). */}
        <Reveal className={"w-full " + (side === "end" ? "lg:order-2 lg:*:ms-0 lg:*:me-auto" : "lg:*:ms-auto lg:*:me-0")}>{visual}</Reveal>
        <div data-home-words className={"flex w-full max-w-xl flex-col items-center justify-self-center text-center lg:max-w-[30rem] lg:items-start lg:text-start " + (side === "end" ? "lg:justify-self-end" : "lg:justify-self-start")}>
          <H id={id + "-title"} className={"title-caps tracking-[0.12em] text-white [text-wrap:balance] " + (heading === "h1" ? "t-hero" : "t-title")}>
            {title}
          </H>
          {lead ? <p className="mt-5 text-base leading-relaxed text-bone">{lead}</p> : null}
          {name ? (
            <>
              <span aria-hidden="true" className="bg-rose-gold mt-8 block h-px w-12" />
              <p data-home-piece-name className="title-caps mt-6 text-base tracking-[0.08em] text-white [text-wrap:balance] lg:text-[1.0625rem]">
                {name}
              </p>
            </>
          ) : null}
          {text ? (
            <p data-home-text={block} className={(name ? "mt-3" : "mt-5") + " text-base leading-relaxed text-bone [text-wrap:pretty]"}>
              {text}
            </p>
          ) : null}
          {link ? (
            <Link to={link.to} data-cta {...linkAttrs} className="btn-secondary mt-7">
              {link.label} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** The text beside a piece: the one written in the admin for this block, else the line of the piece, in the page's language. */
function useBlockText(): (block: string, piece: Piece | undefined) => string {
  const texts = useHomeTexts();
  const locale = useLocale();
  return (block, piece) => homeText(texts, block, locale, piece?.line);
}

/** The house: who Berete is, in one sentence, with one piece on black (the Butterfly on its chain, on the black bust). */
function House() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const textOf = useBlockText();
  const piece = cat.pieces.find((p) => p.slug === HERO_PIECE);
  const [dir, file] = HERO_PHOTOS[HERO_PHOTO];
  const photo = yoni(dir, file, { alt: piece?.title ?? "" });
  const shown = photo ?? piece?.cover;
  return (
    <Feature
      id="home-next"
      data="house"
      side="start"
      heading="h1"
      title={t.home.hook}
      lead={t.home.who}
      name={piece?.title}
      block="house"
      text={textOf("house", piece)}
      link={{ to: "/creations", label: t.common.allCreations }}
      visual={
        shown && piece ? (
          <Link to={"/pieces/" + piece.slug} data-hero-piece={piece.slug} data-hero-photo={HERO_PHOTO} className="relative mx-auto block aspect-[4/5] w-full max-w-[26rem]" aria-label={t.common.enterWorld + " · " + piece.title}>
            <MediaView item={shown} alt={piece.title} fit="contain" priority sizes="(max-width: 1023px) 90vw, 26rem" />
          </Link>
        ) : null
      }
    />
  );
}

/**
 * The Mechanism (Yoni, 24/11/2026: "the immersive part is not for the home page" — its film stays on its own page): the Dragon
 * Ball pendant and, set on its corner, a circle where only its sphere turns, in a loop, silent, while it is on screen. Its name,
 * its short text, "Enter the World". (Yoni, 26/11/2026, understood on 27/11: the piece and the circle stay where they are; what
 * the circle shows goes up, its turning sphere in the middle.)
 */
function Mechanism() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const textOf = useBlockText();
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
  return (
    <Feature
      id="innovation"
      data="mechanism"
      side="end"
      attrs={{ "data-home-innovation": "" }}
      linkAttrs={{ "data-innovation-link": "" }}
      title={t.feature.mechanism}
      name={piece.title}
      block="mechanism"
      text={textOf("mechanism", piece)}
      link={{ to: "/pieces/" + piece.slug, label: t.common.enterWorld }}
      visual={
        // The frame of the piece (4:5) at the top; under its corner, the room of the circle: the circle is 36 % of the width
        // and the piece ends at 95 % of its frame (its cut-out keeps a margin), so 25:39 lets it end just above the circle.
        <div data-innovation-visual className="relative mx-auto aspect-[4/5] w-full max-w-[24rem]">
          {/* Its chain cut at the top of its photo (27/11/2026: never faded): the frame starts at the top edge of the section (over
              its padding, py-20 / lg:py-24 of Feature), so that the chain leaves the section there, at its fine line; it still ends
              where it ended (taller by as much), the piece just above the circle. */}
          <Link to={"/pieces/" + piece.slug} tabIndex={-1} aria-hidden="true" data-innovation-frame className={"absolute inset-x-0 block " + (view && isCutTop(view) ? "-top-20 lg:-top-24" : "inset-y-0")}>
            {view && isCutTop(view) ? (
              <>
                <span aria-hidden="true" className="block aspect-[4/5]" />
                <span aria-hidden="true" className="block h-20 lg:h-24" />
              </>
            ) : null}
            {view ? (
              <img src={cutoutSrc(piece.slug, view, view.widths[1] ?? view.widths[0]!)} srcSet={cutoutSrcSet(piece.slug, view)} sizes="(max-width: 1023px) 80vw, 24rem" alt={piece.title} width={view.width} height={view.height} loading="lazy" decoding="async" draggable={false} data-innovation-photo data-cut-top={isCutTop(view) ? "" : undefined} className={"h-full w-full object-contain" + (isCutTop(view) ? " absolute inset-0 object-top" : "")} />
            ) : (
              <MediaView item={piece.cover} alt={piece.title} fit="contain" sizes="(max-width: 1023px) 80vw, 24rem" />
            )}
          </Link>
          {/* Its sphere that turns, in a circle set on the corner of the piece, where it always was (back there on 27/11/2026: Yoni
              wanted only what the circle shows moved). Inside it, the film goes up: its turning sphere in the middle, whole, filling it,
              no black band at the top (the sphere is at 60 % of the height of its square: drawn 1.25 times from there, 9.5 % higher). */}
          <div data-innovation-loupe className="absolute -end-2 bottom-0 w-[36%] max-w-40 sm:-end-6">
            <div className="relative aspect-square overflow-hidden rounded-full border border-rose-light/40 bg-ink-soft shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
              <video ref={videoRef} poster={sphere.poster} style={posterBehind(sphere.poster, "cover")} muted loop playsInline preload="none" aria-label={t.home.innovation.film} data-sphere-film className="h-full w-full origin-[50%_60%] -translate-y-[9.5%] scale-[1.25] object-cover" />
            </div>
          </div>
        </div>
      }
    />
  );
}

/** A great commission (the championship rings of Inter Milan and VfB Stuttgart): one ring, one section each. */
function Commission({ slug, index }: { slug: string; index: number }) {
  const { t } = useI18n();
  const cat = useCatalogue();
  const textOf = useBlockText();
  const piece = cat.pieces.find((p) => p.slug === slug);
  if (!piece) return null;
  const block = "ring-" + slug;
  return (
    <Feature
      id={"commission-" + index}
      data={block}
      // After the house (left) and The Mechanism (right): the first ring on the left, the second on the right.
      side={index % 2 === 1 ? "start" : "end"}
      title={piece.title}
      block={block}
      text={textOf(block, piece)}
      link={{ to: "/pieces/" + piece.slug, label: t.common.enterWorld }}
      visual={
        <Link to={"/pieces/" + piece.slug} tabIndex={-1} aria-hidden="true" data-special-ring={piece.slug} data-thumb-frame className="relative mx-auto block aspect-[4/3] w-full max-w-[34rem] overflow-hidden">
          {/* The ring on the black, like every thumbnail (its cut-out: never the rectangle of its photo, 25/11/2026). */}
          <PieceThumb piece={piece} frame={4 / 3} sizes="(max-width: 1023px) 90vw, 34rem" />
        </Link>
      }
    />
  );
}

/** The creations: a balanced selection (pendants, chains, rings), the Safi Link first, then the way to all of them. */
function Selection() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const pieces = SELECTION.map((s) => cat.pieces.find((p) => p.slug === s)).filter((p): p is Piece => p !== undefined);
  if (pieces.length === 0) return null;
  return (
    <section aria-labelledby="selection-title" data-home-selection className="border-t border-white/10">
      <div className="wrap flex flex-col items-center py-20 text-center lg:py-28">
        <h2 id="selection-title" className="title-caps tracking-[0.12em] t-title ">{t.nav.creations}</h2>
        <ul className="mt-12 grid w-full grid-cols-2 gap-x-3 gap-y-10 text-start sm:gap-x-5 lg:grid-cols-3 lg:gap-x-8">
          {pieces.map((p, i) => (
            <li key={p.slug}>
              <Reveal delay={(i % 3) * 0.06} className="h-full">
                <PieceCard piece={p} showType />
              </Reveal>
            </li>
          ))}
        </ul>
        <Link to="/creations" data-cta className="btn-secondary mt-10">
          {t.common.allCreations} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/** The press: the newspapers that told the house, each leading to its article; the name leads to the page Press. */
function PressBand() {
  const { t } = useI18n();
  const articles = publishedPress();
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="press-band-title" data-home-press className="border-t border-white/10">
      <div className="wrap flex flex-col items-center py-16 text-center lg:py-20">
        <h2 id="press-band-title" className="title-caps tracking-[0.12em] t-title ">
          <Link to="/press" className="transition-colors duration-500 hover:text-rose-light">{t.press.title}</Link>
        </h2>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {articles.map((a) => (
            <li key={a.url}>
              <a href={a.url} target="_blank" rel="noreferrer" data-press-outlet={a.outlet} className="inline-flex min-h-12 items-center font-display t-sub uppercase tracking-[0.12em] text-bone transition-colors duration-500 hover:text-rose-light">
                {a.outlet}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The last section: the invitation to begin, as on every page (its two buttons). */
function Begin() {
  const { t } = useI18n();
  const waMessage = useWhatsAppMessage();
  return (
    <section aria-labelledby="home-begin-title" data-home-begin className="border-t border-white/10">
      <div className="wrap flex flex-col items-center py-20 text-center lg:py-28">
        <h2 id="home-begin-title" className="title-caps tracking-[0.12em] t-title ">{t.common.yourStory}</h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-bone">{t.contact.oneConversation}</p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-x-8">
          <Link to="/contact" data-cta className="btn-primary">
            {t.common.startPiece}
          </Link>
          <a href={waLink(waMessage)} target="_blank" rel="noreferrer" data-cta className="btn-secondary">
            <BrandIcon name="whatsapp" className="size-4" /> {t.common.whatsapp}
          </a>
        </div>
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
      content: <p className="title-caps tracking-[0.12em] mx-auto max-w-4xl text-center t-title  text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.75)]">{t.site.tagline}</p>,
    },
  ];
  return <ScrollVideo media={film} steps={steps} label={t.home.sketchLabel} heightVh={320} showProgress={false} />;
}

export default function Home() {
  return (
    <>
      <HeroPhoto />
      <House />
      <Mechanism />
      {SPECIAL_PROJECT.map((r, i) => (
        <Commission key={r.slug} slug={r.slug} index={i + 1} />
      ))}
      <Selection />
      <PressBand />
      <Begin />
    </>
  );
}
