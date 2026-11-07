import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import ContactBlock from "@/components/ContactBlock";
import { MediaView } from "@/components/Media";
import PiecesShowcase from "@/components/PiecesShowcase";
import Reveal from "@/components/Reveal";
import ScrollVideo, { type ScrollStep } from "@/components/ScrollVideo";
import SplitHeading from "@/components/SplitHeading";
import StoriesBar from "@/components/stories/StoriesBar";
import { media } from "@/data/catalogue";
import { findPiece } from "@/data/relations";
import { useCatalogue } from "@/lib/catalogue";
import { DEFAULT_MESSAGE, waLink } from "@/lib/site";

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.75)]";

function Statement({ n, children }: { n: string; children: string }) {
  return (
    <div className={"max-w-4xl " + shadow}>
      <span className="text-rose-gold font-display text-lg">{n}</span>
      <p className="mt-4 font-display text-3xl font-light uppercase leading-[1.1] tracking-[0.12em] text-white sm:text-4xl md:text-5xl lg:text-6xl">{children}</p>
    </div>
  );
}

const HOME_STEPS: ScrollStep[] = [
  {
    from: 0,
    to: 0.05,
    align: "left",
    content: (
      <div className={"max-w-4xl " + shadow}>
        <p className="flex flex-col gap-4 font-display text-base uppercase tracking-[0.3em] text-white md:text-lg">
          <span>Berete Jewellers · Dubai</span>
          <span aria-hidden="true" className="bg-rose-gold block h-px w-24" />
        </p>
        <h1 className="mt-8 max-w-3xl font-display text-[clamp(2.5rem,6vw,4.5rem)] font-light uppercase leading-[1.05] tracking-[0.06em] text-white">Custom high jewellery for champions.</h1>
        <p className="mt-5 text-lg text-bone md:text-xl">Made by us. Inspired by you.</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link to="/creations" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/70 bg-ink/30 px-7 text-sm font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-colors hover:border-rose-light hover:text-rose-light max-sm:text-base">
            Discover creations
          </Link>
          <Link to="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 bg-white px-7 text-sm font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-rose-light max-sm:text-base">
            Start your piece
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <a href={waLink(DEFAULT_MESSAGE)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/40 bg-ink/30 px-7 text-sm font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-colors hover:border-rose-light hover:text-rose-light max-sm:text-base">
            <BrandIcon name="whatsapp" className="size-5" />
            WhatsApp
          </a>
        </div>
      </div>
    ),
  },
  { from: 0.08, to: 0.2, align: "right", content: <Statement n="01">Designed for clubs. Worn by champions.</Statement> },
  { from: 0.25, to: 0.38, align: "left", content: <Statement n="02">The top lifts off and reveals the trophy.</Statement> },
  { from: 0.43, to: 0.56, align: "right", content: <Statement n="03">Sculpted, then set stone by stone.</Statement> },
  { from: 0.61, to: 0.76, align: "left", content: <Statement n="04">Statement pieces, made to be seen.</Statement> },
  {
    from: 0.82,
    to: 0.95,
    align: "center",
    content: (
      <div className={"mx-auto max-w-4xl text-center " + shadow}>
        <span className="text-rose-gold font-display text-2xl">05</span>
        <p className="title-caps mt-4 text-[clamp(2.25rem,7vw,6.5rem)] tracking-[0.1em] text-white">Your story, in diamonds.</p>
        <Link to="/contact" className="mt-10 inline-flex min-h-14 items-center gap-3 bg-white px-9 text-base font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light">
          Start your piece
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    ),
  },
];

const DOORS = [
  { label: "Chains", to: "/creations?category=chains", piece: "butterfly" },
  { label: "Pendants", to: "/creations?category=pendants", piece: "the-hand" },
  { label: "Championship Rings", to: "/creations?category=rings", piece: "vfb-stuttgart-dfb-pokal-2025" },
];

const PROCESS_PREVIEW = ["First contact", "Design deposit", "Validation", "Creation", "Photoshoot", "Balance & delivery"];

export default function Home() {
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
      <ScrollVideo media={media.scroll.home!} steps={HOME_STEPS} label="Berete Jewellers film, played by scrolling" />

      {/* Three doors */}
      <section aria-label="Creations" className="grid gap-px bg-white/10 md:grid-cols-3">
        {DOORS.map((d) => {
          const piece = findPiece(cat, d.piece);
          return (
            <Link key={d.label} to={d.to} className="group relative flex h-[78svh] flex-col justify-end overflow-hidden bg-ink md:h-[92svh]">
              {piece ? (
                <span className="absolute inset-0 flex items-center justify-center p-8 transition-transform duration-[1.6s] ease-out group-hover:scale-110">
                  <MediaView item={piece.cover} alt={d.label + ": " + piece.title} />
                </span>
              ) : null}
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink via-ink/70 to-transparent" />
              <span className="relative p-6 sm:p-10">
                <span className="title-caps block text-[clamp(2rem,4vw,3.5rem)] tracking-[0.1em] text-white transition-colors group-hover:text-rose-light">{d.label}</span>
                <span className="mt-4 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] text-white group-hover:text-rose-light">
                  Explore <ArrowUpRight className="size-4" aria-hidden="true" />
                </span>
              </span>
            </Link>
          );
        })}
      </section>

      {/* Featured capsule */}
      {featured ? (
        <section aria-labelledby="featured-title" className="mx-auto max-w-[1600px] px-5 py-28 sm:px-8 lg:px-12 lg:py-40">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="eyebrow">Featured capsule</p>
              <SplitHeading as="h2" className="mt-6 text-[clamp(2.25rem,5vw,4.5rem)] tracking-[0.08em]">
                {featured.client ?? featured.title}
              </SplitHeading>
              <p id="featured-title" className="text-rose-gold mt-3 font-display text-2xl uppercase tracking-[0.2em]">
                {featured.title.split("—")[1]?.trim() ?? featured.line}
              </p>
              <p className="mt-8 max-w-md text-lg text-bone">{featured.story}</p>
              <Link to={"/pieces/" + featured.slug} className="mt-10 inline-flex min-h-14 items-center gap-3 border border-rose-light/80 px-8 text-base font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-rose-light hover:text-ink">
                Enter the capsule
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setRingOpen((v) => !v)}
              aria-pressed={ringOpen}
              aria-label={ringOpen ? "Close the top of the ring" : "Lift the top of the ring"}
              className="group relative flex min-h-[60svh] w-full flex-col items-center justify-center md:min-h-[70vh]"
            >
              <span className="relative block h-[56svh] w-full md:h-[64vh]">
                <span className={"absolute inset-0 transition-opacity duration-700 " + (ringOpen && opened ? "opacity-0" : opened ? "md:group-hover:opacity-0" : "")}>
                  <MediaView item={featured.cover} eager />
                </span>
                {opened ? (
                  <span className={"absolute inset-0 transition-opacity duration-700 " + (ringOpen ? "opacity-100" : "opacity-0 md:group-hover:opacity-100")}>
                    <MediaView item={opened} eager />
                  </span>
                ) : null}
              </span>
              <span className="mt-6 inline-flex min-h-12 items-center gap-3 text-base font-medium uppercase tracking-[0.2em] text-bone">
                <span aria-hidden="true" className="bg-rose-gold block h-px w-10" />
                {ringOpen ? "Close the top" : "Lift the top"}
              </span>
            </button>
          </div>
        </section>
      ) : null}

      <PiecesShowcase exclude={featured?.slug} />

      {/* Players band */}
      <section aria-labelledby="players-band-title" className="border-y border-white/10 py-24 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Worn by</p>
              <h2 id="players-band-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">The players</h2>
            </div>
            <Link to="/players" className="inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] text-white hover:text-rose-light">
              All players <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-14 flex flex-wrap items-baseline gap-x-10 gap-y-4">
            {players.map((p) => (
              <li key={p.slug}>
                <Link to={"/players/" + p.slug} className="group inline-flex min-h-12 items-baseline">
                  {p.number !== null ? <span className="text-rose-gold mr-3 font-display text-xl">{p.number}</span> : null}
                  <span className="font-display text-[clamp(1.75rem,4vw,3.25rem)] font-light uppercase tracking-[0.06em] text-white transition-colors group-hover:text-rose-light">{p.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Atelier, Boxes, Process */}
      <section aria-labelledby="house-title" className="mx-auto max-w-[1600px] px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
        <p className="eyebrow">Inside the house</p>
        <h2 id="house-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">From sketch to handover</h2>
        <div className="mt-14 grid gap-px bg-white/10 lg:grid-cols-3">
          <Reveal className="bg-ink">
            <Link to="/atelier" className="group flex h-full flex-col p-6 sm:p-8">
              <div className="aspect-[4/5] w-full overflow-hidden bg-ink-soft">{setting ? <MediaView item={setting} alt="Close-up of a setting tool working on diamonds" fit="cover" /> : null}</div>
              <p className="title-caps mt-8 text-3xl tracking-[0.14em]">Atelier</p>
              <p className="mt-3 text-lg text-bone">Every stone set by hand, under the microscope.</p>
              <span className="mt-6 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] group-hover:text-rose-light">Enter <ArrowRight className="size-4" aria-hidden="true" /></span>
            </Link>
          </Reveal>
          <Reveal className="bg-ink" delay={0.08}>
            <Link to="/boxes" className="group flex h-full flex-col p-6 sm:p-8">
              <div className="aspect-[4/5] w-full overflow-hidden bg-ink-soft">{box?.images[1] ?? box?.images[0] ? <MediaView item={(box.images[1] ?? box.images[0])!} fit="cover" className="transition-transform duration-[1.4s] group-hover:scale-105" /> : null}</div>
              <p className="title-caps mt-8 text-3xl tracking-[0.14em]">Boxes</p>
              <p className="mt-3 text-lg text-bone">Custom boxes on selected pieces, as an option.</p>
              <span className="mt-6 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] group-hover:text-rose-light">Discover <ArrowRight className="size-4" aria-hidden="true" /></span>
            </Link>
          </Reveal>
          <Reveal className="bg-ink" delay={0.16}>
            <Link to="/process" className="group flex h-full flex-col p-6 sm:p-8">
              <div className="relative aspect-[4/5] w-full overflow-hidden border border-white/10 bg-ink-soft">
                <img src={media.scroll.process?.poster} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div aria-hidden="true" className="absolute inset-0 bg-ink/60" />
                <ol className="relative flex h-full flex-col justify-center gap-4 px-6">
                  {PROCESS_PREVIEW.map((s, i) => (
                    <li key={s} className="flex items-baseline gap-4">
                      <span className="text-rose-gold w-6 font-display text-xl">{i + 1}</span>
                      <span className="text-base text-white">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="title-caps mt-8 text-3xl tracking-[0.14em]">Process</p>
              <p className="mt-3 text-lg text-bone">Six clear steps, followed on WhatsApp.</p>
              <span className="mt-6 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.2em] group-hover:text-rose-light">Follow <ArrowRight className="size-4" aria-hidden="true" /></span>
            </Link>
          </Reveal>
        </div>
      </section>

      <ContactBlock id="home-contact" />
    </>
  );
}
