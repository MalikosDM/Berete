import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import ScrollVideo, { type ScrollStep } from "@/components/ScrollVideo";
import SplitHeading from "@/components/SplitHeading";
import ContactBlock from "@/components/ContactBlock";
import BrandIcon from "@/components/BrandIcon";
import Stories from "@/components/Stories";
import CapsulesShowcase from "@/components/CapsulesShowcase";
import { DEFAULT_MESSAGE, waLink } from "@/lib/site";
import { asRecord, num, pickList, str, useApi } from "@/pages/Creations";

const HOME_VIDEO = "/videos/background.mp4";
const HOME_VIDEO_FALLBACK = "https://sparkonic.ai/api/media/d7fa4408-3fd5-40cc-9bdb-b3eb2b119288";
const VFB_SLUG = "vfb-stuttgart-dfb-pokal-2025";

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.75)]";

function Statement({ n, children }: { n: string; children: string }) {
  return (
    <div className={"max-w-4xl " + shadow}>
      <span className="text-rose-gold font-display text-base md:text-lg">{n}</span>
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
        <h1 className="mt-8 max-w-3xl font-display text-4xl font-light uppercase leading-[1.05] tracking-[0.06em] text-white md:text-6xl lg:max-w-full lg:w-[466px] lg:text-4xl">Custom high jewellery for champions.</h1>
        <p className="mt-5 text-lg text-bone md:text-xl">Made by us. Inspired by you.</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link to="/creations" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/70 bg-ink/30 px-7 text-sm font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-colors hover:border-rose-light hover:text-rose-light">
            Discover creations
          </Link>
          <Link to="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 bg-white px-7 text-sm font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-rose-light">
            Start your piece
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <a href={waLink(DEFAULT_MESSAGE)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/40 bg-ink/30 px-7 text-sm font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-colors hover:border-rose-light hover:text-rose-light">
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
        <Link to="/contact" className="mt-10 inline-flex min-h-14 items-center gap-3 bg-white px-9 text-sm font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-rose-light">
          Start your piece
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    ),
  },
];

const FALLBACK_PLAYERS = [
  { name: "Deniz Undav", number: 26 },
  { name: "Angelo Stiller", number: 6 },
  { name: "Maximilian Mittelstädt", number: 7 },
  { name: "Chris Führich", number: null },
  { name: "Atakan Karazor", number: null },
  { name: "Marcus Thuram", number: null },
  { name: "Tanguy Nianzou", number: null },
];

const PROCESS_PREVIEW = ["First contact", "Design deposit", "Validation", "Creation", "Photoshoot", "Balance & delivery"];

export default function Home() {
  const [ringOpen, setRingOpen] = useState(false);
  const players = useApi("/api/players", pickList("players"));

  const playerList = useMemo(() => {
    const list = (players.data ?? [])
      .map((p) => {
        const r = asRecord(p);
        return { slug: str(r.slug), name: str(r.name), number: num(r.number), kind: str(r.kind) };
      })
      .filter((p) => p.name !== "" && (p.kind === "" || p.kind === "player"));
    return list.length > 0 ? list : FALLBACK_PLAYERS.map((p) => ({ ...p, slug: "" }));
  }, [players.data]);

  return (
    <>
      <Stories />
      <ScrollVideo src={HOME_VIDEO} fallbackSrc={HOME_VIDEO_FALLBACK} heightVh={700} startAt={1.2} steps={HOME_STEPS} label="Berete Jewellers film, played by scrolling" />

      <CapsulesShowcase />

      {/* Featured capsule: VfB */}
      <section aria-labelledby="featured-title" className="mx-auto max-w-[1600px] px-5 py-28 sm:px-8 lg:px-12 lg:py-44">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="eyebrow">Featured capsule</p>
            <SplitHeading className="mt-6 text-[clamp(2.25rem,5.5vw,5rem)] tracking-[0.1em]">VfB Stuttgart</SplitHeading>
            <p id="featured-title" className="text-rose-gold mt-3 font-display text-2xl uppercase tracking-[0.24em]">DFB-Pokal 2025</p>
            <p className="mt-8 max-w-md text-lg text-bone">
              A championship ring with a removable top that reveals the cup. Every player's name and number, handed over to the club.
            </p>
            <Link to={"/pieces/" + VFB_SLUG} className="mt-10 inline-flex min-h-14 items-center gap-3 border border-rose-light/80 px-8 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-rose-light hover:text-ink">
              Enter the capsule
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <img src="/images/vfb-team.jpg" alt="VfB Stuttgart squad receiving their championship rings" width={1600} height={1000} loading="eager" decoding="async" className="mt-12 aspect-[16/10] w-full max-w-md object-cover" />
          </div>
          <button
            type="button"
            onClick={() => setRingOpen((v) => !v)}
            aria-pressed={ringOpen}
            aria-label={ringOpen ? "Close the top of the ring" : "Lift the top of the ring"}
            className="group relative flex min-h-[60svh] w-full flex-col items-center justify-center md:min-h-[70vh]"
          >
            <span className="relative flex w-full flex-1 items-center justify-center">
              <img src="/images/vfb-ring-front.jpg" alt="VfB Stuttgart championship ring seen from the front" width={1200} height={1200} loading="eager" decoding="async" className={"jewel max-h-[70vh] w-auto max-w-full object-contain mix-blend-lighten transition-opacity duration-700 " + (ringOpen ? "opacity-0" : "md:group-hover:opacity-0")} />
              <img src="/images/vfb-ring-open.jpg" alt="VfB Stuttgart ring opened, revealing the cup inside" width={1200} height={1200} loading="eager" decoding="async" className={"jewel absolute inset-0 m-auto max-h-[70vh] w-auto max-w-full object-contain mix-blend-lighten transition-opacity duration-700 " + (ringOpen ? "opacity-100" : "opacity-0 md:group-hover:opacity-100")} />
            </span>
            <span className="mt-6 inline-flex min-h-12 items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-bone">
              <span aria-hidden="true" className="bg-rose-gold block h-px w-10" />
              {ringOpen ? "Close the top" : "Lift the top"}
            </span>
          </button>
        </div>
      </section>

      {/* Players band */}
      <section aria-labelledby="players-band-title" className="border-y border-white/10 py-24 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Worn by</p>
              <h2 id="players-band-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">The players</h2>
            </div>
            <Link to="/players" className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-white hover:text-rose-light">
              All players <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-14 flex flex-wrap items-baseline gap-x-10 gap-y-4">
            {playerList.map((p) => {
              const inner = (
                <>
                  {p.number !== null ? <span className="text-rose-gold mr-3 font-display text-xl">{p.number}</span> : null}
                  <span className="font-display text-[clamp(1.75rem,4vw,3.5rem)] font-light uppercase tracking-[0.06em] text-white transition-colors group-hover:text-rose-light">{p.name}</span>
                </>
              );
              return (
                <li key={p.name}>
                  <Link to={p.slug ? "/players/" + p.slug : "/players"} className="group inline-flex min-h-12 items-baseline">
                    {inner}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Atelier / Boxes / Process previews */}
      <section aria-labelledby="house-title" className="mx-auto max-w-[1600px] px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
        <p className="eyebrow">Inside the house</p>
        <h2 id="house-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">From sketch to handover</h2>
        <div className="mt-14 grid gap-px bg-white/10 lg:grid-cols-3">
          <Link to="/atelier" className="group flex flex-col bg-ink p-6 sm:p-8">
            <div className="aspect-[4/5] w-full overflow-hidden bg-ink-soft">
              <video
                src="/images/fournies/01-video-sertissage.mp4#t=0.1"
                muted
                playsInline
                preload="metadata"
                aria-label="Close-up of a setting tool working on diamonds"
                onMouseEnter={(e) => {
                  void e.currentTarget.play().catch(() => undefined);
                }}
                onMouseLeave={(e) => e.currentTarget.pause()}
                className="h-full w-full object-cover"
              />
            </div>
            <p className="title-caps mt-8 text-3xl tracking-[0.14em]">Atelier</p>
            <p className="mt-3 text-lg text-bone">Every stone set by hand, under the microscope.</p>
            <span className="mt-6 inline-flex min-h-12 items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] group-hover:text-rose-light">Enter <ArrowRight className="size-4" aria-hidden="true" /></span>
          </Link>
          <Link to="/boxes" className="group flex flex-col bg-ink p-6 sm:p-8">
            <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden">
              <img src="/images/sirius-box.webp" alt="Black Sirius presentation trunk" width={1600} height={1600} loading="eager" decoding="async" className="jewel h-[80%] w-auto max-w-full object-contain mix-blend-lighten transition-transform duration-[1.4s] group-hover:scale-105" />
            </div>
            <p className="title-caps mt-8 text-3xl tracking-[0.14em]">Boxes</p>
            <p className="mt-3 text-lg text-bone">Custom cases on selected pieces, as an option.</p>
            <span className="mt-6 inline-flex min-h-12 items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] group-hover:text-rose-light">Discover <ArrowRight className="size-4" aria-hidden="true" /></span>
          </Link>
          <Link to="/process" className="group flex flex-col bg-ink p-6 sm:p-8">
            <div className="relative aspect-[4/5] w-full overflow-hidden border border-white/10 bg-ink-soft">
              <video src="/images/fournies/video-process.mp4#t=0.001" muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} className="absolute inset-0 h-full w-full object-cover" />
              <div aria-hidden="true" className="absolute inset-0 bg-ink/55" />
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
            <span className="mt-6 inline-flex min-h-12 items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] group-hover:text-rose-light">Follow <ArrowRight className="size-4" aria-hidden="true" /></span>
          </Link>
        </div>
      </section>

      <ContactBlock id="home-contact" />
    </>
  );
}
