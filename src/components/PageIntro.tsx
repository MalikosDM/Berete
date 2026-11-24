import type { ReactNode } from "react";
import SplitHeading from "@/components/SplitHeading";
import Reveal from "@/components/Reveal";

type PageIntroProps = {
  /** Kept for the pages that pass it: no small label above the title of a page any more (24/11/2026, one name per page). */
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
  /** A smaller opening, so that what follows is seen at once (the page Créations: its pieces from the first screen). */
  compact?: boolean;
  /** The title on one small line (the Circle, Yoni 24/11/2026). */
  oneLine?: boolean;
};

/**
 * The opening of a page (24/11/2026): its name, the name of the menu (never a second name above it), and one sentence, in
 * the same frame and the same sizes on every page.
 */
export default function PageIntro({ title, lead, children, compact = false, oneLine = false }: PageIntroProps) {
  return (
    <section data-page-intro={compact ? "compact" : undefined} className={"relative bg-ink " + (compact ? "pt-28 pb-6 sm:pt-32 lg:pt-32 lg:pb-6" : "pt-32 pb-10 sm:pt-36 lg:pt-40 lg:pb-12")}>
      <div className="wrap">
        <div className="max-w-5xl">
          <SplitHeading as="h1" className={"t-hero tracking-[0.14em] " + (oneLine ? "sm:whitespace-nowrap" : "")}>
            {title}
          </SplitHeading>
          {lead ? (
            <Reveal delay={0.15}>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-mist lg:text-[1.0625rem]">{lead}</p>
            </Reveal>
          ) : null}
          {children ? (
            <Reveal delay={0.25} className="mt-8 flex flex-wrap gap-4">
              {children}
            </Reveal>
          ) : null}
        </div>
        <div className={"rule-rose " + (compact ? "mt-6" : "mt-10")} aria-hidden="true" />
      </div>
    </section>
  );
}
