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
  /** The title on one small line (the Circle, Yoni 24/11/2026). */
  oneLine?: boolean;
};

export default function PageIntro({ eyebrow, title, lead, children, compact = false, oneLine = false }: PageIntroProps) {
  return (
    <section data-page-intro={compact ? "compact" : undefined} className={"relative bg-ink " + (compact ? "pt-28 pb-6 sm:pt-32 lg:pt-32 lg:pb-6" : "pt-32 pb-10 sm:pt-36 lg:pt-40 lg:pb-14")}>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="max-w-5xl">
          <SplitHeading
            as="h1"
            eyebrow={eyebrow}
            className={oneLine ? "t-title tracking-[0.12em] sm:whitespace-nowrap sm:tracking-[0.16em]" : compact ? "t-hero tracking-[0.14em] sm:tracking-[0.16em]" : "t-hero tracking-[0.14em] sm:tracking-[0.18em]"}
          >
            {title}
          </SplitHeading>
          {lead ? (
            <Reveal delay={0.2}>
              <p className={compact ? "mt-3 max-w-2xl text-lg leading-relaxed text-mist" : "mt-8 max-w-2xl text-lg leading-relaxed text-mist"}>{lead}</p>
            </Reveal>
          ) : null}
          {children ? (
            <Reveal delay={0.3} className="mt-8 flex flex-wrap gap-4">
              {children}
            </Reveal>
          ) : null}
        </div>
        <div className={"rule-rose origin-left animate-draw rtl:origin-right " + (compact ? "mt-6" : "mt-10 lg:mt-12")} aria-hidden="true" />
      </div>
    </section>
  );
}
