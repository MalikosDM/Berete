import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import Lightbox from "@/components/Lightbox";
import { forceMuted, MediaView, posterBehind } from "@/components/Media";
import PieceCard from "@/components/PieceCard";
import PieceThumb from "@/components/PieceThumb";
import Reveal from "@/components/Reveal";
import ScrollVideo, { type ScrollStep } from "@/components/ScrollVideo";
import { media } from "@/data/catalogue";
import { HOUSE_PIECE, MECHANISM_PIECE, type HomeLang } from "@/data/homeTexts";
import { housePhoto, housePhotoKey } from "@/data/house";
import { HOUSE_SUMMARY } from "@/data/houseSummary";
import pages from "@/data/pages.generated.json" with { type: "json" };
import { cutoutSrc, cutoutSrcSet, isCutTop, resolveShowcase } from "@/data/showcase";
import { yoni } from "@/data/sources";
import { SPECIAL_PROJECT } from "@/data/pieces";
import { publishedPress } from "@/data/press";
import type { MediaItem, Piece } from "@/data/types";
import { YONI_MEDIA } from "@/data/yoniMedia";
import { Link, useContentText, useI18n, useLocale } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { getLenis } from "@/lib/gsap";
import { homeText, useHomeTexts } from "@/lib/homeTexts";
import { waLink } from "@/lib/site";
import { useAtelierPublic } from "@/lib/atelierPublic";
import { BEYOND_CREATION, PRIVATE_ATELIER, YONI } from "@/data/yoni2711";
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
 * (28/11/2026: no frame seen) The photo is drawn larger than itself: its ground goes on around it (scripts/hero-extend.py, the
 * trunk untouched), so the original photo keeps the size and the place it always had and the rest of the screen is its black
 * and its floor, melting into the black of the page.
 */
function HeroPhoto() {
  const { t } = useI18n();
  const d = pages["hero-desktop"];
  // Phones and screens held upright (25/11/2026): the same photo, framed on the two cases, both whole and centred.
  const m = pages["hero-phone"];
  // Where the larger image lies around the original photo: shares of the original rectangle (its box).
  const place = (p: typeof d, k: string) => ({
    ["--ix" + k]: (-p.original.x / p.original.width) * 100 + "%",
    ["--iy" + k]: (-p.original.y / p.original.height) * 100 + "%",
    ["--iw" + k]: (p.width / p.original.width) * 100 + "%",
    ["--ih" + k]: (p.height / p.original.height) * 100 + "%",
  });
  // (Yoni, 24/11/2026, on his 13-inch MacBook: the trunk was cut and room was left under it.) The photo starts under the
  // header (the header on black, never over the photo), whole (its handle, the SIRIUS plate, the chain), centred in the room
  // left; the box of the original photo has its shape (a container query), its larger image fills the rest of the room. Its
  // signature and "Discover More" sit small on its floor, never over the trunk.
  return (
    <section aria-label="Berete Jewellers" data-home-photo className="relative flex h-svh min-h-[24rem] flex-col overflow-hidden bg-ink pt-[calc(4rem+1px)] desk:pt-[calc(6.25rem+1px)]">
      <div
        data-home-photo-frame
        className="home-photo-frame relative min-h-0 flex-1"
        style={{ "--r": d.original.width / d.original.height, "--rm": m.original.width / m.original.height, ...place(d, ""), ...place(m, "m") } as CSSProperties}
      >
        <div data-home-photo-box data-home-photo-original className="home-photo-box absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <picture>
            <source media="(max-aspect-ratio: 1/1)" type="image/avif" srcSet={srcset(m.avif)} sizes="100vw" />
            <source media="(max-aspect-ratio: 1/1)" type="image/webp" srcSet={srcset(m.webp)} sizes="100vw" />
            {/* The larger image is about 1.4 times as wide as the screen (the original photo nearly fills it), as wide as the
                screen on a screen twice as wide as high. */}
            <source type="image/avif" srcSet={srcset(d.avif)} sizes="(min-aspect-ratio: 2/1) 100vw, 140vw" />
            <img src={d.src} srcSet={srcset(d.webp)} sizes="(min-aspect-ratio: 2/1) 100vw, 140vw" alt={t.home.heroAlt} width={d.width} height={d.height} fetchPriority="high" decoding="async" data-home-photo-img className="home-photo-img" />
          </picture>
        </div>
        {/* On the floor of the photo, small, at the foot of its box (never over the trunk). */}
        <div className="home-photo-caption absolute inset-x-0 z-10 flex flex-col items-center px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center">
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

/** A photo or a film of a section, with its small title when it has one (a step of the making: « The Sketch »). */
type Thumb = { item: MediaItem; caption?: string };

/** A film shown by its first image (its poster), as a photo (a poster has no smaller copies: its own file only). */
const asPhoto = (m: MediaItem): MediaItem => (m.type === "video" && m.poster ? { ...m, type: "image", src: m.poster, width: undefined, height: undefined } : m);

/** A photo of a piece by the name of its file ("p14"), among its photos (in the language of the page). */
function photoOf(piece: Piece | undefined, file: string): MediaItem | null {
  if (!piece) return null;
  return [piece.cover, ...piece.gallery].find((m) => new RegExp("/" + file + "\\.").test(m.src)) ?? null;
}

/**
 * The real photos beside the words of a section (28/11/2026, Yoni: understand each piece better, with more photos): a small
 * row in the fine frame of the site, each opening full screen among the others (its films there silent, in a loop).
 */
function Thumbs({ items, label }: { items: Thumb[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (items.length === 0) return null;
  return (
    <>
      <ul data-home-thumbs aria-label={label} className="mt-7 grid w-full max-w-[24rem] grid-cols-3 gap-3 text-start">
        {items.map((th, i) => (
          <li key={th.item.src} className="flex min-w-0 flex-col">
            {/* The button and its photo named alike (its description, else its step, else the section): before the photo loads too. */}
            <button type="button" onClick={() => setOpen(i)} data-home-thumb={th.item.src} aria-label={th.item.alt || th.caption || label} className="group relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden border border-white/10 bg-ink">
              <MediaView item={{ ...asPhoto(th.item), onBlack: false }} alt={th.item.alt || th.caption || label} fit="cover" frame={4 / 5} sizes="(max-width: 1023px) 30vw, 8rem" className="transition-transform duration-700 group-hover:scale-[1.03]" />
            </button>
            {th.caption ? <p className="eyebrow mt-2 leading-snug tracking-[0.16em] text-mist [overflow-wrap:anywhere]">{th.caption}</p> : null}
          </li>
        ))}
      </ul>
      {open !== null ? createPortal(<Lightbox items={items.map((x) => x.item)} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body) : null}
    </>
  );
}

/** A short silent loop: it plays only while it is on screen, never with « reduce motion » (its first image stays). */
function HomeLoop({ src, poster, label, className = "", data, attrs }: { src: string; poster: string; label: string; className?: string; data?: string; attrs?: Record<string, string> }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || typeof IntersectionObserver === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    forceMuted(video);
    const seen = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.isIntersecting) {
          if (!video.getAttribute("src")) video.setAttribute("src", src);
          void video.play().catch(() => undefined);
        } else video.pause();
      },
      { threshold: 0.3, rootMargin: "10% 0px" },
    );
    seen.observe(video);
    return () => seen.disconnect();
  }, [src]);
  return <video ref={ref} poster={poster} style={posterBehind(poster, "cover")} muted loop playsInline preload="none" aria-label={label} data-home-loop={data ?? ""} {...attrs} className={className} />;
}

/**
 * One section of the home page with one piece (Yoni, 26/11/2026: "the jewel on the right or on the left, and the descriptive
 * writing beside it, instead of empty space here and there"): the piece on one side, in turn left and right ("start" / "end":
 * mirrored in Arabic), its words on the other — its title, a line of the house when there is one, the name of the piece when
 * the title is not it, its short text (src/data/homeTexts.ts), a sentence or two of Yoni's texts, its real photos in a small
 * row (28/11/2026) and its way in. On a phone: the piece, then its words, centred. `after`: what follows under both (the
 * other mechanisms of the house).
 */
function Feature({ id, data, side, visual, title, heading = "h2", lead, name, block, text, more = [], thumbs, links = [], attrs, after, wide = false }: { id: string; data: string; side: Side; visual: ReactNode; title: string; heading?: "h1" | "h2"; lead?: string; name?: string; block: string; text: string; more?: string[]; thumbs?: ReactNode; links?: { to: string; label: string; attrs?: Record<string, string> }[]; attrs?: Record<string, string>; after?: ReactNode; wide?: boolean }) {
  const H = heading;
  return (
    <section id={id} aria-labelledby={id + "-title"} data-home-story={data} data-home-side={side} {...attrs} className="scroll-mt-0 border-t border-white/10">
      {/* One screen at most on a computer (28/11/2026: 1280 × 800 included). */}
      <div className="wrap py-20 lg:py-16">
        <div className="grid items-center gap-y-10 lg:grid-cols-2 lg:gap-x-16 xl:gap-x-24">
          {/* The piece against the inner side of its half, toward its words (the empty space, if any, at the edges of the page). */}
          <Reveal className={"w-full " + (side === "end" ? "lg:order-2 lg:*:ms-0 lg:*:me-auto" : "lg:*:ms-auto lg:*:me-0")}>{visual}</Reveal>
          <div data-home-words className={"flex w-full max-w-xl flex-col items-center justify-self-center text-center lg:items-start lg:text-start " + (wide ? "lg:max-w-[38rem] " : "lg:max-w-[30rem] ") + (side === "end" ? "lg:justify-self-end" : "lg:justify-self-start")}>
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
            {more.length > 0 ? (
              <p data-home-more={block} className="mt-3 text-base leading-relaxed text-bone [text-wrap:pretty]">
                {more.join(" ")}
              </p>
            ) : null}
            {thumbs}
            {links.length > 0 ? (
              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-1 lg:justify-start">
                {links.map((l) => (
                  <Link key={l.to} to={l.to} data-cta {...l.attrs} className="btn-secondary">
                    {l.label} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {after}
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

/**
 * The house: who Berete is, in one sentence, with one piece on black (the Butterfly on its chain, on the black bust). Beside it
 * (28/11/2026, Yoni: « We begin with what could be », shown by the making): the same piece in three moments — the hand of Yoni
 * drawing it, its metal before the setting, its wings set by hand — the finished piece being the photo (it leads into its
 * world); the way into The Bespoke Journey.
 */
function House() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const textOf = useBlockText();
  const piece = cat.pieces.find((p) => p.slug === HERO_PIECE);
  const [dir, file] = HERO_PHOTOS[HERO_PHOTO];
  const photo = yoni(dir, file, { alt: piece?.title ?? "" });
  const shown = photo ?? piece?.cover;
  const steps = t.piece.steps;
  const making = piece?.making ?? {};
  const thread = ([
    making.sketch ? { item: making.sketch, caption: steps.sketch.title } : null,
    making.raw ? { item: making.raw, caption: steps.raw.title } : null,
    making.setting ? { item: making.setting, caption: steps.setting.title } : null,
  ] as (Thumb | null)[]).filter((x): x is Thumb => x !== null);
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
      more={[t.process.quick.lead]}
      thumbs={<Thumbs items={thread} label={t.process.title} />}
      // One way in per section (24/11/2026): The Bespoke Journey; the photo of the piece leads into its world.
      links={[{ to: "/process", label: t.process.title, attrs: { "data-home-journey": "" } }]}
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

/** The other mechanisms of the house (Yoni's texts, word for word: its title and its sentence), after the Dragon Ball. */
type Mechanism = { piece: Piece; label?: string; text: string; photo?: MediaItem | null; loop?: { src: string; poster: string } };

/**
 * The other mechanisms (28/11/2026, Yoni: not only Dragon Ball): the ring of VfB Stuttgart whose top reveals the DFB-Pokal, the
 * ring of Inter Milan whose top becomes a pendant, the football that turns between the letters OKA, the signature MT that turns
 * at the heart of the cross of Malik Tillman, the centre of the clover of Eljero Elia under the finger. Each in a circle like the
 * sphere of the Dragon Ball, its title, its sentence; the card leads to its piece. A row on a computer; on a phone, side by side,
 * a gentle horizontal scroll.
 */
function OtherMechanisms() {
  const { t } = useI18n();
  const tc = useContentText();
  const cat = useCatalogue();
  const find = (slug: string) => cat.pieces.find((p) => p.slug === slug);
  const VFB = "vfb-stuttgart-dfb-pokal-2025";
  const INTER = "campione-d-italia-2023-2024";
  const vfb = find(VFB);
  const inter = find(INTER);
  const oka = find("noah-okafor-oka-pendant");
  const cross = find("malik-tillman-cross-pendant");
  const clover = find("eljero-elia-clover-medallion");
  const spec = (slug: string, label: string) => YONI[slug]?.specs?.find(([l]) => l === label);
  const detail = (slug: string, title: string) => YONI[slug]?.details?.find(([l]) => l === title);
  const vfbSpec = spec(VFB, "HIDDEN MECHANISM");
  const interSpec = spec(INTER, "MECHANISM");
  const okaSpec = spec("noah-okafor-oka-pendant", "SPECIAL MECHANISM");
  const mt = detail("malik-tillman-cross-pendant", "02 — THE ROTATING MT SIGNATURE");
  const spin = YONI_MEDIA.tillmanSpin;
  const cloverLoop = (pages as { "clover-spin"?: { video: string; poster: string } })["clover-spin"];
  const list: (Mechanism | null)[] = [
    vfb && vfbSpec ? { piece: vfb, label: tc(vfbSpec[0]), text: tc(vfbSpec[1]), photo: photoOf(vfb, "p14") } : null,
    inter && interSpec ? { piece: inter, label: tc(interSpec[0]), text: tc(interSpec[1]), photo: photoOf(inter, "p05") } : null,
    oka && okaSpec ? { piece: oka, label: tc(okaSpec[0]), text: tc(okaSpec[1]), photo: photoOf(oka, "p03") } : null,
    // Its detail « 02 — The Rotating MT Signature »: its title without its number, its last sentence (the centre turns).
    cross && mt && spin ? { piece: cross, label: tc(mt[0]).replace(/^\s*\d+\s*[—–-]\s*/, ""), text: tc(mt[1]).split("\n").at(-1)!, loop: { src: spin.src, poster: spin.poster ?? "" } } : null,
    // Its own words (its page): the last sentence, the centre that turns under the finger.
    clover && cloverLoop ? { piece: clover, text: clover.story.trim().split(/(?<=[.!?。])\s+/).at(-1) ?? "", loop: { src: cloverLoop.video, poster: cloverLoop.poster } } : null,
  ];
  const cards = list.filter((m): m is Mechanism => m !== null && m.text !== "");
  if (cards.length === 0) return null;
  return (
    <ul data-mechanisms aria-label={t.feature.mechanism} className="-mx-5 mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:mt-12 lg:grid lg:snap-none lg:grid-cols-5 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
      {cards.map((m) => (
        <li key={m.piece.slug} className="w-[68vw] max-w-[17rem] shrink-0 snap-center lg:w-auto lg:max-w-none">
          <Link to={"/pieces/" + m.piece.slug} data-mechanism={m.piece.slug} className="group flex h-full flex-col items-center text-center">
            {/* Its circle shows what the words say: hidden from screen readers (the words name the card). */}
            <span aria-hidden="true" className="relative block aspect-square w-32 overflow-hidden rounded-full border border-rose-light/40 bg-ink-soft shadow-[0_18px_50px_rgba(0,0,0,0.6)] lg:w-[7.5rem]">
              {m.loop ? (
                <HomeLoop src={m.loop.src} poster={m.loop.poster} label={m.piece.title} data={m.piece.slug} className="h-full w-full object-cover" />
              ) : m.photo ? (
                <MediaView item={{ ...m.photo, onBlack: false }} alt="" fit="cover" frame={1} sizes="9rem" className="transition-transform duration-700 group-hover:scale-[1.04]" />
              ) : null}
            </span>
            {m.label ? <span className="eyebrow mt-4 tracking-[0.2em]">{m.label}</span> : null}
            <span className={"title-caps text-base tracking-[0.06em] text-white [text-wrap:balance] " + (m.label ? "mt-1.5" : "mt-4")}>{m.piece.title}</span>
            <span className="mt-2 text-base leading-relaxed text-bone [text-wrap:pretty]">{m.text}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The Mechanism (Yoni, 24/11/2026: "the immersive part is not for the home page" — its film stays on its own page): the Dragon
 * Ball pendant and, set on its corner, a circle where only its sphere turns, in a loop, silent, while it is on screen. Its name,
 * its short text, a sentence of Yoni, "Enter the World". (Yoni, 26/11/2026, understood on 27/11: the piece and the circle stay
 * where they are; what the circle shows goes up, its turning sphere in the middle.) Under it, since 28/11/2026, the other
 * mechanisms of the house.
 */
function Mechanism() {
  const { t } = useI18n();
  const tc = useContentText();
  const cat = useCatalogue();
  const textOf = useBlockText();
  const piece = cat.pieces.find((p) => p.slug === INNOVATION);
  const sphere = pages.sphere;
  if (!piece) return null;
  const view = resolveShowcase(piece.slug, piece.showcase).views[0];
  // « We therefore engineered the Spirit Bomb to rotate, transforming symbolism into movement. » (its story, word for word).
  const engineered = YONI[piece.slug]?.story.find((x) => /engineered the Spirit Bomb to rotate/.test(x));
  return (
    <Feature
      id="innovation"
      data="mechanism"
      side="end"
      attrs={{ "data-home-innovation": "" }}
      title={t.feature.mechanism}
      name={piece.title}
      block="mechanism"
      text={textOf("mechanism", piece)}
      more={engineered ? [tc(engineered)] : []}
      links={[{ to: "/pieces/" + piece.slug, label: t.common.enterWorld, attrs: { "data-innovation-link": "" } }]}
      after={<OtherMechanisms />}
      visual={
        // The frame of the piece (4:5) at the top; under its corner, the room of the circle: the circle is 36 % of the width
        // and the piece ends at 95 % of its frame (its cut-out keeps a margin), so 25:39 lets it end just above the circle.
        // (28/11/2026) On a computer smaller when the screen is low, so that the section with the other mechanisms under it
        // stays one screen high.
        <div data-innovation-visual className="relative mx-auto aspect-[4/5] w-full max-w-[24rem] lg:max-w-[min(21rem,calc((100svh-32rem)*0.8))]">
          {/* Its chain cut at the top of its photo (27/11/2026: never faded): the frame starts at the top edge of the section (over
              its padding, py-20 / lg:py-16 of Feature), so that the chain leaves the section there, at its fine line; it still ends
              where it ended (taller by as much), the piece just above the circle. */}
          <Link to={"/pieces/" + piece.slug} tabIndex={-1} aria-hidden="true" data-innovation-frame className={"absolute inset-x-0 block " + (view && isCutTop(view) ? "-top-20 lg:-top-16" : "inset-y-0")}>
            {view && isCutTop(view) ? (
              <>
                <span aria-hidden="true" className="block aspect-[4/5]" />
                <span aria-hidden="true" className="block h-20 lg:h-16" />
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
              <HomeLoop src={sphere.video} poster={sphere.poster} label={t.home.innovation.film} data="sphere" attrs={{ "data-sphere-film": "" }} className="sphere-film h-full w-full origin-[50%_60%] -translate-y-[9.5%] scale-[1.25] object-cover" />
            </div>
          </div>
        </div>
      }
    />
  );
}

/**
 * A great commission (the championship rings of Inter Milan and VfB Stuttgart): one ring, one section each. Beside the ring
 * (28/11/2026): a sentence of Yoni on the commission and three real photos — for Inter, the ring in its open case, the hand-over
 * to a player (a photo of the day, never one from the web), its top worn as a pendant; for VfB, the rings at the foot of the
 * DFB-Pokal, its display, a ring handed to a player.
 */
const COMMISSION_PHOTOS: Record<string, (piece: Piece, boxImages: MediaItem[]) => (MediaItem | null | undefined)[]> = {
  "campione-d-italia-2023-2024": (p) => [photoOf(p, "p22"), YONI_MEDIA.interPhotos?.firstFour?.[0], photoOf(p, "p44")],
  "vfb-stuttgart-dfb-pokal-2025": (p, box) => [photoOf(p, "p08"), box[0], photoOf(p, "p05")],
};
/** The sentence of Yoni on each commission (its story, word for word). */
const COMMISSION_SENTENCE: Record<string, RegExp> = {
  "campione-d-italia-2023-2024": /^Born from a special project/,
  "vfb-stuttgart-dfb-pokal-2025": /^Created to immortalise/,
};

function Commission({ slug, index }: { slug: string; index: number }) {
  const { t } = useI18n();
  const tc = useContentText();
  const cat = useCatalogue();
  const textOf = useBlockText();
  const piece = cat.pieces.find((p) => p.slug === slug);
  if (!piece) return null;
  const block = "ring-" + slug;
  const box = cat.boxes.find((b) => b.slug === piece.boxSlug);
  const sentence = YONI[slug]?.story.find((x) => COMMISSION_SENTENCE[slug]?.test(x));
  const photos = (COMMISSION_PHOTOS[slug]?.(piece, box?.images ?? []) ?? [])
    .filter((m): m is MediaItem => Boolean(m?.src))
    .map((m) => ({ item: { ...m, alt: m.alt ? tc(m.alt) : piece.title } }));
  return (
    <Feature
      id={"commission-" + index}
      data={block}
      // After the house (left) and The Mechanism (right): the first ring on the left, the second on the right.
      side={index % 2 === 1 ? "start" : "end"}
      title={piece.title}
      block={block}
      text={textOf(block, piece)}
      more={sentence ? [tc(sentence)] : []}
      thumbs={<Thumbs items={photos} label={piece.title} />}
      links={[{ to: "/pieces/" + piece.slug, label: t.common.enterWorld }]}
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

/**
 * « The House » (28/11/2026), after Press: who Yoni Berete is, in a few sentences of the page The House (src/data/houseSummary.ts,
 * or the text written in the admin, block « house-summary »), beside his portrait; the way to the page.
 */
function HouseSummary() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const locale = useLocale();
  const texts = useHomeTexts();
  const portrait = housePhoto(cat, housePhotoKey.portrait);
  const text = homeText(texts, "house-summary", locale, HOUSE_SUMMARY[locale as HomeLang] ?? HOUSE_SUMMARY.en);
  return (
    <Feature
      id="home-house"
      data="house-summary"
      side="start"
      title={t.nav.about}
      block="house-summary"
      text={text}
      wide
      links={[{ to: "/about", label: t.home.discoverHouse, attrs: { "data-home-house-link": "" } }]}
      visual={
        portrait ? (
          <Link to="/about" tabIndex={-1} aria-hidden="true" data-home-portrait className="relative mx-auto block aspect-[4/5] w-full max-w-[22rem] overflow-hidden border border-white/10 bg-ink-soft">
            {/* Framed from its top: the whole head (the frame only trims the bottom). */}
            <MediaView item={{ ...portrait, onBlack: false }} alt={t.about.founderPortrait} fit="cover" frame={4 / 5} sizes="(max-width: 1023px) 80vw, 22rem" className="object-top" />
          </Link>
        ) : null
      }
    />
  );
}

/**
 * « Beyond the Creation » (Yoni, 27/11/2026): a discreet introduction to The Private Atelier, the way to its section of The
 * Bespoke Journey. Shown with the server, when Berete leaves the texts of the site on.
 */
function Beyond() {
  const tc = useContentText();
  const pub = useAtelierPublic();
  if (!pub.server || !pub.siteTexts) return null;
  return (
    <section aria-labelledby="home-beyond-title" data-home-beyond className="border-t border-white/10">
      <div className="wrap flex flex-col items-center py-14 text-center lg:py-16">
        <h2 id="home-beyond-title" className="title-caps tracking-[0.12em] t-sub text-white">{tc(BEYOND_CREATION.title)}</h2>
        <p className="piece-lead mt-4 max-w-xl">{tc(BEYOND_CREATION.text)}</p>
        <Link to="/process#private-atelier" data-cta data-home-beyond-link className="btn-secondary mt-6">
          {tc(PRIVATE_ATELIER.title)} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
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
      <HouseSummary />
      <Beyond />
      <Begin />
    </>
  );
}
