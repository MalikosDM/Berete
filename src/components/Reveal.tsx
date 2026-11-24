import { useEffect, useRef, type ReactNode, type Ref } from "react";
import { gsap, useReducedMotion } from "@/lib/gsap";

type RevealTag = "div" | "section" | "article" | "figure" | "li" | "p" | "span";

type RevealProps = {
  children?: ReactNode;
  className?: string;
  mask?: boolean;
  delay?: number;
  as?: RevealTag;
  /** Only a fade, never hidden (still reachable by the keyboard and found by a link to it): the trunks. */
  soft?: boolean;
};

export default function Reveal({ children, className = "", mask = false, delay = 0, as = "div", soft = false }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return undefined;
    const ctx = gsap.context(() => {
      // Only a slow fade (24/11/2026: "des fondus lents uniquement"): nothing rises, slides or wipes in.
      const trigger = { trigger: el, start: "top 90%", once: true };
      gsap.fromTo(
        el,
        soft || mask ? { opacity: 0 } : { autoAlpha: 0 },
        {
          ...(soft || mask ? { opacity: 1 } : { autoAlpha: 1 }),
          duration: 1.4,
          ease: "power1.out",
          delay,
          clearProps: "opacity,visibility",
          scrollTrigger: trigger,
        },
      );
    }, el);
    return () => ctx.revert();
  }, [mask, delay, reduced, soft]);

  const Tag = as;
  return (
    <Tag ref={ref as Ref<never>} className={className}>
      {children}
    </Tag>
  );
}
