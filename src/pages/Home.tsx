import { useState } from "react";
import { ArrowRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import ContactBlock from "@/components/ContactBlock";
import CollectionTiles from "@/components/CollectionTiles";
import { MediaView } from "@/components/Media";
import PiecesShowcase from "@/components/PiecesShowcase";
import Reveal from "@/components/Reveal";
import ScrollVideo, { type ScrollStep } from "@/components/ScrollVideo";
import SplitHeading from "@/components/SplitHeading";
import StoriesBar from "@/components/stories/StoriesBar";
import { media } from "@/data/catalogue";
import { INTER } from "@/data/pieces";
import { Link, useI18n, type Messages } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { waLink } from "@/lib/site";

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.75)]";

function Statement({ n, children }: { n: string; children: string }) {
  return (
    <div className={"max-w-4xl " + shadow}>
      <span className="text-rose-gold font-display text-lg">{n}</span>
      <p className="mt-4 font-display text-3xl font-light uppercase leading-[1.1] tracking-[0.12em] text-white sm:text-4xl md:text-5xl lg:text-6xl">{children}</p>
    </div>
  );
}

const homeSteps = (t: Messages): ScrollStep[] => [
  {
    from: 0,
    to: 0.05,
    align: "left",
    content: (
      <div className={"max-w-4xl " + shadow}>
        <p className="flex flex-col gap-4 font-display text-base uppercase tracking-[0.3em] text-white md:text-lg">
          <span>{t.home.kicker}</span>
          <span aria-hidden="true" className="bg-rose-gold block h-px w-24" />
        </p>
        <h1 className="mt-8 max-w-3xl font-display text-[clamp(2.5rem,6vw,4.5rem)] font-light uppercase leading-[1.05] tracking-[0.06em] text-white">{t.home.title}</h1>
        <p className="mt-5 text-lg text-bone md:text-xl">{t.site.tagline}</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link to="/creations" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/70 bg-ink/30 px-7 text-sm font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-colors hover:border-rose-light hover:text-rose-light max-sm:text-base">
            {t.home.discover}
          </Link>
          <Link to="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 bg-white px-7 text-sm font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-rose-light max-sm:text-base">
            {t.common.startPiece}
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
          <a href={waLink(t.whatsapp.hello)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/40 bg-ink/30 px-7 text-sm font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-colors hover:border-rose-light hover:text-rose-light max-sm:text-base">
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
        <span className="text-rose-gold font-display text-2xl">05</span>
        <p className="title-caps mt-4 text-[clamp(2.25rem,7vw,6.5rem)] tracking-[0.1em] text-white">{t.common.yourStory}</p>
        <Link to="/contact" className="mt-10 inline-flex min-h-14 items-center gap-3 bg-white px-9 text-base font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light">
          {t.common.startPiece}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </div>
    ),
  },
];

/* A selection of pieces for the row of the home page (the collections show all of them). */
const SELECTION = [
  "kevin-schade-dragon-ball-pendant",
  "michy-batshuayi-butterfly-chain",
  "marcus-thuram-t-serpent-pendant",
  INTER,
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
  const featured = cat.pieces.find((p) => p.featured) ?? cat.pieces[0];
  const opened = featured?.gallery[0];
  const players = cat.people.filter((p) => p.kind === "player");
  const setting = media.videos["atelier/setting"];
  const box = cat.boxes[0];

  return (
    <>
      <StoriesBar />
      <ScrollVideo media={media.scroll.home!} steps={homeSteps(t)} label={t.home.filmLabel} />

      <CollectionTiles />

      {/* Featured capsule */}
      {featured ? (
        <section aria-labelledby="featured-title" className="mx-auto max-w-[1600px] px-5 py-28 sm:px-8 lg:px-12 lg:py-40">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="eyebrow">{t.home.featured}</p>
              <SplitHeading as="h2" className="mt-6 text-[clamp(2.25rem,5vw,4.5rem)] tracking-[0.08em]">
                {featured.client ?? featured.title}
              </SplitHeading>
              <p id="featured-title" className="text-rose-gold mt-3 font-display text-2xl uppercase tracking-[0.2em]">
                {featured.title.split("—")[1]?.trim() ?? featured.line}
              </p>
              <p className="mt-8 max-w-md text-lg text-bone">{featured.story}</p>
              <Link to={"/pieces/" + featured.slug} className="mt-10 inline-flex min-h-14 items-center gap-3 border border-rose-light/80 px-8 text-base font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-rose-light hover:text-ink">
                {t.home.enterCapsule}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setRingOpen((v) => !v)}
              aria-pressed={ringOpen}
              aria-label={ringOpen ? t.home.closeTopLabel : t.home.liftTopLabel}
              className="group relative flex min-h-[60svh] w-full flex-col items-center justify-center md:min-h-[70vh]"
            >
              <span className="relative block h-[56svh] w-full md:h-[64vh]">
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
      <section aria-labelledby="players-band-title" className="border-y border-white/10 py-24 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">{t.home.wornBy}</p>
              <h2 id="players-band-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">{t.home.players}</h2>
            </div>
            <Link to="/players" className="inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] text-white hover:text-rose-light">
              {t.common.allPlayers} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-14 flex flex-wrap items-baseline gap-x-10 gap-y-4">
            {players.map((p) => (
              <li key={p.slug}>
                <Link to={"/players/" + p.slug} className="group inline-flex min-h-12 items-baseline">
                  {p.number !== null ? <span className="text-rose-gold me-3 font-display text-xl">{p.number}</span> : null}
                  <span className="font-display text-[clamp(1.75rem,4vw,3.25rem)] font-light uppercase tracking-[0.06em] text-white transition-colors group-hover:text-rose-light">{p.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Atelier, Boxes, Process */}
      <section aria-labelledby="house-title" className="mx-auto max-w-[1600px] px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
        <p className="eyebrow">{t.home.inside}</p>
        <h2 id="house-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">{t.home.insideTitle}</h2>
        <div className="mt-14 grid gap-px bg-white/10 lg:grid-cols-3">
          <Reveal className="bg-ink">
            <Link to="/atelier" className="group flex h-full flex-col p-6 sm:p-8">
              <div className="aspect-[4/5] w-full overflow-hidden bg-ink-soft">{setting ? <MediaView item={setting} alt={t.home.atelierAlt} fit="cover" sizes="(max-width: 1023px) 100vw, 33vw" /> : null}</div>
              <p className="title-caps mt-8 text-3xl tracking-[0.14em]">{t.home.atelierTitle}</p>
              <p className="mt-3 text-lg text-bone">{t.home.atelierText}</p>
              <span className="mt-6 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] group-hover:text-rose-light">{t.home.enter} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" /></span>
            </Link>
          </Reveal>
          <Reveal className="bg-ink" delay={0.08}>
            <Link to="/boxes" className="group flex h-full flex-col p-6 sm:p-8">
              <div className="aspect-[4/5] w-full overflow-hidden bg-ink-soft">{box?.images[1] ?? box?.images[0] ? <MediaView item={(box.images[1] ?? box.images[0])!} fit="cover" sizes="(max-width: 1023px) 100vw, 33vw" className="transition-transform duration-[1.4s] group-hover:scale-105" /> : null}</div>
              <p className="title-caps mt-8 text-3xl tracking-[0.14em]">{t.home.boxesTitle}</p>
              <p className="mt-3 text-lg text-bone">{t.home.boxesText}</p>
              <span className="mt-6 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] group-hover:text-rose-light">{t.home.discoverShort} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" /></span>
            </Link>
          </Reveal>
          <Reveal className="bg-ink" delay={0.16}>
            <Link to="/process" className="group flex h-full flex-col p-6 sm:p-8">
              <div className="relative aspect-[4/5] w-full overflow-hidden border border-white/10 bg-ink-soft">
                <img src={media.scroll.process?.poster} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div aria-hidden="true" className="absolute inset-0 bg-ink/60" />
                <ol className="relative flex h-full flex-col justify-center gap-4 px-6">
                  {t.process.steps.map(({ title: s }, i) => (
                    <li key={s} className="flex items-baseline gap-4">
                      <span className="text-rose-gold w-6 font-display text-xl">{i + 1}</span>
                      <span className="text-base text-white">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="title-caps mt-8 text-3xl tracking-[0.14em]">{t.home.processTitle}</p>
              <p className="mt-3 text-lg text-bone">{t.home.processText}</p>
              <span className="mt-6 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] group-hover:text-rose-light">{t.home.follow} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" /></span>
            </Link>
          </Reveal>
        </div>
      </section>

      <ContactBlock id="home-contact" />
    </>
  );
}
