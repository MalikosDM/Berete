import { useState } from "react";
import { ArrowRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import ContactBlock from "@/components/ContactBlock";
import CollectionTiles from "@/components/CollectionTiles";
import { MediaView } from "@/components/Media";
import PiecesShowcase from "@/components/PiecesShowcase";
import PlayerWall, { facesFirst } from "@/components/PlayerWall";
import Reveal from "@/components/Reveal";
import ScrollVideo, { type ScrollStep } from "@/components/ScrollVideo";
import SpecialProject from "@/components/SpecialProject";
import SplitHeading from "@/components/SplitHeading";
import StoriesBar from "@/components/stories/StoriesBar";
import { media } from "@/data/catalogue";
import { FEATURED_BOX, SPECIAL_PROJECT } from "@/data/pieces";
import { Link, useI18n, type Messages } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { waLink } from "@/lib/site";

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.75)]";

function Statement({ n, children }: { n: string; children: string }) {
  return (
    <div className={"max-w-4xl " + shadow}>
      <span className="text-rose-gold font-display text-base">{n}</span>
      <p className="mt-3 font-display text-2xl font-light uppercase leading-[1.1] tracking-[0.12em] text-white sm:text-3xl md:text-4xl lg:text-5xl">{children}</p>
    </div>
  );
}

const homeSteps = (t: Messages): ScrollStep[] => [
  {
    from: 0,
    to: 0.05,
    align: "left",
    // Phones: the opening text starts under the bar of stories (navigation 4.5rem + bubbles and names) and sits at the
    // bottom of the screen when there is room; it never goes up under the bar ("safe"). Computers: centred.
    // Wide enough for the three buttons on one line, with room to spare while the fonts load (no jump).
    inner: "max-w-4xl",
    box: "px-5 pt-[12.75rem] pb-5 [align-items:safe_flex-end] [@media(max-height:600px)]:pt-[12.5rem] [@media(max-height:600px)]:pb-3 justify-start text-start sm:px-8 sm:pt-[14rem] md:items-center md:pt-[15.5rem] md:pb-20 lg:px-12",
    content: (
      <div className={"max-w-4xl " + shadow} data-home-hero>
        <p className="flex flex-col gap-3 font-display text-base uppercase tracking-[0.2em] text-white md:gap-4 md:tracking-[0.28em] [@media(max-height:600px)]:gap-2">
          <span>{t.home.kicker}</span>
          <span aria-hidden="true" className="bg-rose-gold block h-px w-24 [@media(max-height:600px)]:hidden" />
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-[clamp(1.625rem,7.4vw,2.375rem)] font-light uppercase leading-[1.05] tracking-[0.05em] text-white [text-wrap:balance] md:mt-6 md:text-[clamp(2.125rem,4.8vw,3.75rem)] md:tracking-[0.06em] [@media(max-height:600px)]:mt-3 [@media(max-height:600px)]:text-[1.5rem]">{t.home.title}</h1>
        <p className="mt-3 max-w-2xl text-base text-bone md:mt-4 md:text-lg [@media(max-height:600px)]:mt-2">{t.home.intro}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3 md:mt-8 [@media(max-height:600px)]:mt-4">
          <Link to="/creations" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/70 bg-ink/30 px-7 text-sm font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-colors hover:border-rose-light hover:text-rose-light max-sm:text-base max-sm:tracking-[0.14em]">
            {t.home.discover}
          </Link>
          <Link to="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 bg-white px-7 text-sm font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-rose-light max-sm:text-base max-sm:tracking-[0.14em]">
            {t.common.startPiece}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
          <a href={waLink(t.whatsapp.pages.home)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/40 bg-ink/30 px-7 text-sm font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-colors hover:border-rose-light hover:text-rose-light max-sm:text-base max-sm:tracking-[0.14em]">
            <BrandIcon name="whatsapp" className="size-5" />
            {t.common.whatsapp}
          </a>
        </div>
      </div>
    ),
  },
  { from: 0.08, to: 0.2, align: "right", content: <Statement n="01">{t.home.statements[0]!}</Statement> },
  { from: 0.25, to: 0.38, align: "left", content: <Statement n="02">{t.home.statements[1]!}</Statement> },
  { from: 0.43, to: 0.56, align: "right", content: <Statement n="03">{t.home.statements[2]!}</Statement> },
  { from: 0.61, to: 0.76, align: "left", content: <Statement n="04">{t.home.statements[3]!}</Statement> },
  {
    from: 0.82,
    to: 0.95,
    align: "center",
    content: (
      <div className={"mx-auto max-w-4xl text-center " + shadow}>
        <span className="text-rose-gold font-display text-xl">05</span>
        <p className="title-caps mt-3 text-[clamp(2rem,5.6vw,5.25rem)] tracking-[0.1em] text-white">{t.common.yourStory}</p>
        <Link to="/contact" className="mt-8 inline-flex min-h-12 items-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light">
          {t.common.startPiece}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </div>
    ),
  },
];

/* A selection of pieces for the row of the home page (the collections show all of them; the two championship rings have their own section). */
const SELECTION = [
  "kevin-schade-dragon-ball-pendant",
  "michy-batshuayi-butterfly-chain",
  "marcus-thuram-t-serpent-pendant",
  "noah-okafor-jersey-pendant",
  "kenan-yildiz-celebration-pendant",
  "marcus-thuram-ruby-t-necklace",
  "malik-tillman-cross-pendant",
  "tanguy-nianzou-fam-medallion",
  "marcus-thuram-skeleton-watch",
];

export default function Home() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const [ringOpen, setRingOpen] = useState(false);
  // The featured capsule, unless it is one of the rings of the special project (already shown above it).
  const chosen = cat.pieces.find((p) => p.featured) ?? cat.pieces[0];
  const featured = chosen && !SPECIAL_PROJECT.some((r) => r.slug === chosen.slug) ? chosen : undefined;
  const opened = featured?.gallery[0];
  const players = facesFirst(cat.people.filter((p) => p.kind === "player"), cat);
  const setting = media.videos["atelier/setting"];
  // The trunk of the house (the first of the page of the trunks), whatever the order of the base.
  const box = cat.boxes.find((b) => b.slug === FEATURED_BOX) ?? cat.boxes[0];

  return (
    <>
      <StoriesBar />
      <ScrollVideo media={media.scroll.home!} steps={homeSteps(t)} label={t.home.filmLabel} />

      <SpecialProject />

      <CollectionTiles />

      {/* Featured capsule */}
      {featured ? (
        <section aria-labelledby="featured-title" className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="eyebrow">{t.home.featured}</p>
              <SplitHeading as="h2" className="mt-5 text-[clamp(1.875rem,4vw,3.75rem)] tracking-[0.08em]">
                {featured.client ?? featured.title}
              </SplitHeading>
              <p id="featured-title" className="text-rose-gold mt-3 font-display text-xl uppercase tracking-[0.2em]">
                {featured.title.split("—")[1]?.trim() ?? featured.line}
              </p>
              <p className="mt-6 max-w-md text-base text-bone md:text-lg">{featured.story}</p>
              <Link to={"/pieces/" + featured.slug} className="mt-8 inline-flex min-h-12 items-center gap-3 border border-rose-light/80 px-7 text-base font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-rose-light hover:text-ink">
                {t.home.enterCapsule}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setRingOpen((v) => !v)}
              aria-pressed={ringOpen}
              aria-label={ringOpen ? t.home.closeTopLabel : t.home.liftTopLabel}
              className="group relative flex min-h-[50svh] w-full flex-col items-center justify-center md:min-h-[58vh]"
            >
              <span className="relative block h-[46svh] w-full md:h-[52vh]">
                <span className={"absolute inset-0 transition-opacity duration-700 " + (ringOpen && opened ? "opacity-0" : opened ? "md:group-hover:opacity-0" : "")}>
                  <MediaView item={featured.cover} />
                </span>
                {opened ? (
                  <span className={"absolute inset-0 transition-opacity duration-700 " + (ringOpen ? "opacity-100" : "opacity-0 md:group-hover:opacity-100")}>
                    <MediaView item={opened} />
                  </span>
                ) : null}
              </span>
              <span className="mt-6 inline-flex min-h-12 items-center gap-3 text-base font-medium uppercase tracking-[0.2em] text-bone">
                <span aria-hidden="true" className="bg-rose-gold block h-px w-10" />
                {ringOpen ? t.home.closeTop : t.home.liftTop}
              </span>
            </button>
          </div>
        </section>
      ) : null}

      <PiecesShowcase slugs={SELECTION} exclude={featured?.slug} />

      {/* Players band */}
      <section aria-labelledby="players-band-title" className="border-y border-white/10 py-20 lg:py-24">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">{t.home.wornBy}</p>
              <h2 id="players-band-title" className="title-caps mt-4 text-[clamp(1.75rem,4vw,3.25rem)] tracking-[0.14em]">{t.home.players}</h2>
            </div>
            <Link to="/players" className="inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] text-white hover:text-rose-light">
              {t.common.allPlayers} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-10">
            <PlayerWall people={players} compact />
          </div>
        </div>
      </section>

      {/* Atelier, Boxes, Process */}
      <section aria-labelledby="house-title" className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <p className="eyebrow">{t.home.inside}</p>
        <h2 id="house-title" className="title-caps mt-4 text-[clamp(1.75rem,4vw,3.25rem)] tracking-[0.14em]">{t.home.insideTitle}</h2>
        <div className="mt-10 grid gap-px bg-white/10 md:grid-cols-3">
          <Reveal className="bg-ink">
            <Link to="/atelier" className="group flex h-full flex-col p-5 sm:p-6 lg:p-7">
              <div className="aspect-square w-full overflow-hidden bg-ink-soft">{setting ? <MediaView item={setting} alt={t.home.atelierAlt} fit="cover" sizes="(max-width: 1023px) 100vw, 33vw" /> : null}</div>
              <h3 className="title-caps mt-6 text-2xl tracking-[0.14em]">{t.home.atelierTitle}</h3>
              <p className="mt-2 text-base text-bone">{t.home.atelierText}</p>
              <span className="mt-4 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] group-hover:text-rose-light">{t.home.enter} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" /></span>
            </Link>
          </Reveal>
          <Reveal className="bg-ink" delay={0.08}>
            <Link to="/boxes" className="group flex h-full flex-col p-5 sm:p-6 lg:p-7">
              <div className="aspect-square w-full overflow-hidden bg-ink-soft">{box?.images[1] ?? box?.images[0] ? <MediaView item={(box.images[1] ?? box.images[0])!} fit="cover" sizes="(max-width: 1023px) 100vw, 33vw" className="transition-transform duration-[1.4s] group-hover:scale-105" /> : null}</div>
              <h3 className="title-caps mt-6 text-2xl tracking-[0.14em]">{t.home.boxesTitle}</h3>
              <p className="mt-2 text-base text-bone">{t.home.boxesText}</p>
              <span className="mt-4 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] group-hover:text-rose-light">{t.home.discoverShort} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" /></span>
            </Link>
          </Reveal>
          <Reveal className="bg-ink" delay={0.16}>
            <Link to="/process" className="group flex h-full flex-col p-5 sm:p-6 lg:p-7">
              <div className="relative aspect-square w-full overflow-hidden border border-white/10 bg-ink-soft">
                <img src={media.scroll.process?.poster} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div aria-hidden="true" className="absolute inset-0 bg-ink/60" />
                <ol className="relative flex h-full flex-col justify-center gap-3 px-5">
                  {t.process.steps.map(({ title: s }, i) => (
                    <li key={s} className="flex items-baseline gap-4">
                      <span className="text-rose-gold w-6 font-display text-lg">{i + 1}</span>
                      <span className="text-base text-white">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <h3 className="title-caps mt-6 text-2xl tracking-[0.14em]">{t.home.processTitle}</h3>
              <p className="mt-2 text-base text-bone">{t.home.processText}</p>
              <span className="mt-4 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] group-hover:text-rose-light">{t.home.follow} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" /></span>
            </Link>
          </Reveal>
        </div>
      </section>

      <ContactBlock id="home-contact" compact />
    </>
  );
}
