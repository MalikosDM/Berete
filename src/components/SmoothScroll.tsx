import { useEffect } from "react";
import { useLocation } from "react-router";
import Lenis from "lenis";
import { gsap, ScrollTrigger, getLenis, setLenis, prefersReducedMotion } from "@/lib/gsap";

export default function SmoothScroll() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (prefersReducedMotion()) return;
    // The wheel and the trackpad scroll the page directly (28/11/2026: Malik and Yoni found the site hard to move in: the page
    // kept gliding a second and 300 px after the wheel stopped). Lenis stays for the soft scrolls the pages ask for (scrollTo).
    const lenis = new Lenis({ smoothWheel: false, syncTouch: false });
    setLenis(lenis);
    lenis.on("scroll", () => ScrollTrigger.update());
    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  useEffect(() => {
    if (window.location.hash === "") {
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo(0, 0);
    }
    const id = window.requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
