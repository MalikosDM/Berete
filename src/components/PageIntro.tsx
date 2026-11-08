import type { ReactNode } from "react";
import SplitHeading from "@/components/SplitHeading";
import Reveal from "@/components/Reveal";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: ReactNode;
};

export default function PageIntro({ eyebrow, title, lead, children }: PageIntroProps) {
  return (
    <section className="relative bg-ink pt-36 pb-14 sm:pt-44 lg:pt-52 lg:pb-20">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="max-w-5xl">
          <SplitHeading
            as="h1"
            eyebrow={eyebrow}
            className="text-[clamp(2.25rem,8.5vw,7rem)] tracking-[0.14em] sm:tracking-[0.18em]"
          >
            {title}
          </SplitHeading>
          {lead ? (
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-mist lg:text-xl">{lead}</p>
            </Reveal>
          ) : null}
          {children ? (
            <Reveal delay={0.3} className="mt-10 flex flex-wrap gap-4">
              {children}
            </Reveal>
          ) : null}
        </div>
        <div className="rule-rose mt-14 origin-left animate-draw rtl:origin-right lg:mt-20" aria-hidden="true" />
      </div>
    </section>
  );
}
