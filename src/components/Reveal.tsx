import { useEffect, useRef, type ReactNode, type Ref } from "react";
import { gsap, useReducedMotion } from "@/lib/gsap";

type RevealTag = "div" | "section" | "article" | "figure" | "li" | "p" | "span";

type RevealProps = {
  children?: ReactNode;
  className?: string;
  mask?: boolean;
  delay?: number;
  as?: RevealTag;
};

export default function Reveal({ children, className = "", mask = false, delay = 0, as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return undefined;
    const ctx = gsap.context(() => {
      const trigger = { trigger: el, start: "top 88%", once: true };
      if (mask) {
        gsap.fromTo(
          el,
          { clipPath: "inset(100% 0% 0% 0%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 1.4,
            ease: "expo.inOut",
            delay,
            clearProps: "clipPath",
            scrollTrigger: trigger,
          },
        );
      } else {
        gsap.fromTo(
          el,
          { y: 40, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 1.1,
            ease: "power3.out",
            delay,
            clearProps: "transform,opacity,visibility",
            scrollTrigger: trigger,
          },
        );
      }
    }, el);
    return () => ctx.revert();
  }, [mask, delay, reduced]);

  const Tag = as;
  return (
    <Tag ref={ref as Ref<never>} className={className}>
      {children}
    </Tag>
  );
}
