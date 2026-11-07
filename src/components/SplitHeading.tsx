import { createElement, useEffect, useRef } from "react";
import { gsap, SplitText, useReducedMotion } from "@/lib/gsap";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "p";

type SplitHeadingProps = {
  as?: HeadingTag;
  children: string;
  className?: string;
  delay?: number;
  eyebrow?: string;
  id?: string;
};

export default function SplitHeading({
  as = "h2",
  children,
  className = "",
  delay = 0,
  eyebrow,
  id,
}: SplitHeadingProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return undefined;
    let split: SplitText | null = null;
    const ctx = gsap.context(() => {
      split = SplitText.create(el, {
        type: "lines,words",
        mask: "lines",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 110,
            opacity: 0,
            duration: 1.15,
            ease: "expo.out",
            stagger: 0.09,
            delay,
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          }),
      });
    }, el);
    return () => {
      ctx.revert();
      split?.revert();
    };
  }, [children, delay, reduced]);

  return (
    <>
      {eyebrow ? <p className="eyebrow mb-5">{eyebrow}</p> : null}
      {createElement(
        as,
        { ref, id, className: "title-caps break-words text-white " + className },
        children,
      )}
    </>
  );
}
