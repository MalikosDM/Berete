import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import BrandIcon from "@/components/BrandIcon";
import Preloader from "@/components/Preloader";
import { DEFAULT_MESSAGE, waLink } from "@/lib/site";

export default function Layout() {
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-svh bg-ink pb-[calc(76px+env(safe-area-inset-bottom))] text-white md:pb-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-white focus:px-5 focus:py-3 focus:text-ink"
      >
        Skip to content
      </a>
      <Preloader />
      <SmoothScroll />
      <Navbar />
      <main id="main" className="relative">
        <Outlet />
      </main>
      <Footer />

      {/* Mobile: always-visible conversion bar */}
      <div
        className={
          "fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-ink/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-300 md:hidden " +
          (showBar ? "visible translate-y-0" : "invisible translate-y-full")
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <a
            href={waLink(DEFAULT_MESSAGE)}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[52px] items-center justify-center gap-2 border border-white/40 text-base font-medium text-white transition-colors active:bg-white/10"
          >
            <BrandIcon name="whatsapp" className="size-5" />
            WhatsApp
          </a>
          <Link
            to="/contact"
            className="flex min-h-[52px] items-center justify-center gap-2 bg-white text-base font-semibold text-ink transition-colors active:bg-bone"
          >
            Start your piece
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
