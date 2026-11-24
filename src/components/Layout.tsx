import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { ArrowRight } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import BrandIcon from "@/components/BrandIcon";
import Preloader from "@/components/Preloader";
import { Link, LocaleSync, useI18n } from "@/i18n";
import { waLink } from "@/lib/site";
import { useWhatsAppMessage } from "@/lib/whatsapp";

export default function Layout() {
  const { t } = useI18n();
  const waMessage = useWhatsAppMessage();
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    // Isolated: the watermark BERETE (z-index -1) is drawn over its black and under all its content.
    <div className="relative isolate min-h-svh bg-ink pb-[calc(76px+env(safe-area-inset-bottom))] text-white md:pb-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:bg-white focus:px-5 focus:py-3 focus:text-ink"
      >
        {t.site.skip}
      </a>
      <LocaleSync />
      <Preloader />
      <SmoothScroll />
      <BrandMark />
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
        {/* WhatsApp as wide as its name; the invitation to create takes the rest (its words are long: one or two lines). */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
          <a
            href={waLink(waMessage)}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[52px] items-center justify-center gap-2 border border-white/40 px-4 text-base font-medium text-white transition-colors active:bg-white/10"
          >
            <BrandIcon name="whatsapp" className="size-5 shrink-0" />
            {t.common.whatsapp}
          </a>
          <Link
            to="/contact"
            className="flex min-h-[52px] items-center justify-center gap-2 bg-white px-3 py-1 text-center text-base leading-tight font-medium text-ink transition-colors active:bg-bone"
          >
            {t.common.startPiece}
            <ArrowRight className="size-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
