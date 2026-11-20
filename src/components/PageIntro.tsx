import type { ReactNode } from "react";
import SplitHeading from "@/components/SplitHeading";
import Reveal from "@/components/Reveal";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: ReactNode;
  /** A smaller opening, so that what follows is seen at once (the page Créations: its pieces from the first screen). */
  compact?: boolean;
};

export default function PageIntro({ eyebrow, title, lead, children, compact = false }: PageIntroProps) {
  return (
    <section data-page-intro={compact ? "compact" : undefined} className={"relative bg-ink " + (compact ? "pt-28 pb-6 sm:pt-32 lg:pt-36 lg:pb-8" : "pt-36 pb-14 sm:pt-44 lg:pt-52 lg:pb-20")}>
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="max-w-5xl">
          <SplitHeading
            as="h1"
            eyebrow={eyebrow}
            className={compact ? "text-[clamp(2rem,6vw,3.5rem)] tracking-[0.14em] sm:tracking-[0.16em]" : "text-[clamp(2.25rem,8.5vw,7rem)] tracking-[0.14em] sm:tracking-[0.18em]"}
          >
            {title}
          </SplitHeading>
          {lead ? (
            <Reveal delay={0.2}>
              <p className={compact ? "mt-3 max-w-2xl text-lg leading-relaxed text-mist" : "mt-8 max-w-2xl text-lg leading-relaxed text-mist lg:text-xl"}>{lead}</p>
            </Reveal>
          ) : null}
          {children ? (
            <Reveal delay={0.3} className="mt-10 flex flex-wrap gap-4">
              {children}
            </Reveal>
          ) : null}
        </div>
        <div className={"rule-rose origin-left animate-draw rtl:origin-right " + (compact ? "mt-6 lg:mt-8" : "mt-14 lg:mt-20")} aria-hidden="true" />
      </div>
    </section>
  );
}
