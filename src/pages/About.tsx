import { Link } from "react-router";
import { ArrowRight, UserRound } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import Reveal from "@/components/Reveal";

const CHAPTERS: { title: string; text: string }[] = [
  {
    title: "The beginning",
    text: "Provisional text. How the first piece was drawn, who it was for, and why it had to be made by hand rather than bought off a shelf.",
  },
  {
    title: "Dubai",
    text: "Provisional text. A house based in Dubai, at the crossroads of stones, craftsmen and clients from every continent, delivering worldwide.",
  },
  {
    title: "For champions",
    text: "Provisional text. Championship rings for clubs, chains and pendants for players and stars: pieces that carry a title, a number, a name.",
  },
];

export default function About() {
  return (
    <>
      <PageIntro
        eyebrow="About"
        title="Our story"
        lead="Custom high jewellery, made in Dubai for the people who make history on the pitch and beyond."
      />

      <section aria-label="Founder" className="bg-ink py-20 lg:py-32">
        <div className="mx-auto grid max-w-[1600px] gap-14 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-12">
          <Reveal mask className="lg:col-span-5">
            <div className="border-rose-gold relative flex aspect-[4/5] flex-col items-center justify-center gap-4 bg-ink-soft">
              <UserRound className="size-12 text-rose-light" aria-hidden="true" />
              <p className="text-base uppercase tracking-[0.24em] text-bone">Portrait coming soon</p>
            </div>
          </Reveal>

          <div className="flex flex-col justify-center lg:col-span-6 lg:col-start-7">
            <span className="inline-flex w-fit border border-rose-light/60 px-3 py-1 text-sm uppercase tracking-[0.2em] text-rose-light">
              Provisional quote
            </span>
            <blockquote className="mt-8">
              <p className="font-display text-[clamp(2rem,4.5vw,3.75rem)] font-light italic leading-[1.15] text-white">
                “Every piece starts with a story. Our job is to make it shine for a lifetime.”
              </p>
              <footer className="mt-8 flex items-center gap-4 text-base text-bone">
                <span className="rule-rose w-12" aria-hidden="true" />
                Founder, Berete Jewellers
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      <section aria-labelledby="chapters-title" className="bg-ink pb-24 lg:pb-36">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
          <div className="rule-rose mb-16 lg:mb-24" aria-hidden="true" />
          <h2 id="chapters-title" className="eyebrow">Chapters</h2>
          <ol className="mt-10">
            {CHAPTERS.map((c, i) => (
              <li key={c.title} className="grid gap-6 border-t border-white/15 py-12 lg:grid-cols-12 lg:gap-12 lg:py-16">
                <span className="text-rose-gold font-display text-6xl font-light leading-none lg:col-span-2">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="title-caps text-[clamp(1.75rem,4vw,3rem)] tracking-[0.14em] lg:col-span-4">{c.title}</h3>
                <Reveal className="lg:col-span-5 lg:col-start-8">
                  <p className="text-lg text-bone">{c.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>

          <div className="mt-16 flex flex-col items-start gap-6 border-t border-white/15 pt-16 sm:flex-row sm:items-center sm:justify-between">
            <p className="title-caps text-[clamp(1.75rem,4vw,3rem)] tracking-[0.14em]">Made by us. Inspired by you.</p>
            <Link
              to="/contact"
              className="inline-flex min-h-14 items-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light"
            >
              Start your piece
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
