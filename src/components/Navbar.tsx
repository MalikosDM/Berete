import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { LanguageLinks, LanguageMenu } from "@/components/LanguageMenu";
import Logo from "@/components/Logo";
import { visibleCollections } from "@/data/collections";
import { collectionWords, Link, NavLink, stripLocale, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { waLink } from "@/lib/site";
import { getLenis } from "@/lib/gsap";

type NavLinkItem = { label: string; to: string };

function linkClass({ isActive }: { isActive: boolean }): string {
  return [
    // Never on two lines: on a small laptop (1280 px) the letters and the gaps are a little tighter, as wide as they were from 1536 px.
    "relative inline-flex min-h-12 items-center whitespace-nowrap text-[0.8125rem] font-medium uppercase tracking-[0.12em] transition-colors 2xl:tracking-[0.18em]",
    "after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left rtl:after:origin-right after:bg-rose-light after:transition-transform after:duration-500",
    isActive ? "text-rose-light after:scale-x-100" : "text-white hover:text-rose-light after:scale-x-0 hover:after:scale-x-100",
  ].join(" ");
}

export default function Navbar() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const CREATION_LINKS: NavLinkItem[] = [
    { label: t.common.allCreations, to: "/creations" },
    ...visibleCollections(cat).map(({ collection }) => ({ label: collectionWords(t, collection.slug, collection).name, to: "/creations/" + collection.slug })),
  ];
  const MAIN_LINKS: NavLinkItem[] = [
    { label: t.nav.players, to: "/players" },
    { label: t.nav.atelier, to: "/atelier" },
    { label: t.nav.boxes, to: "/boxes" },
    { label: t.nav.process, to: "/process" },
    { label: t.nav.about, to: "/about" },
    { label: t.nav.contact, to: "/contact" },
  ];
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    const id = window.requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // A new page closes the menu.
  const here = location.pathname + location.search;
  const [menuPage, setMenuPage] = useState(here);
  if (menuPage !== here) {
    setMenuPage(here);
    setOpen(false);
  }

  useEffect(() => {
    const lenis = getLenis();
    if (open) {
      lenis?.stop();
      document.body.style.overflow = "hidden";
    } else {
      lenis?.start();
      document.body.style.overflow = "";
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const creationsActive = stripLocale(location.pathname).startsWith("/creations");

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 border-b transition-[border-color] duration-500",
        scrolled || open ? "border-white/10" : "border-transparent",
      ].join(" ")}
    >
      {/* The frosted background sits in its own layer: a blur on the header itself would make it the frame of the
          mobile menu (position: fixed), which would then open with no height. */}
      <div aria-hidden="true" className={"absolute inset-0 -z-10 transition-[background-color,backdrop-filter] duration-500 " + (scrolled || open ? "bg-ink/80 backdrop-blur-xl" : "bg-transparent")} />
      <div className="mx-auto flex h-18 max-w-[1600px] items-center justify-between gap-6 px-5 sm:px-8 lg:h-22 lg:px-12">
        <Link to="/" className="group flex min-h-12 flex-col justify-center" aria-label={t.site.homeLabel}>
          <Logo variant="mark" className="h-10 w-[3.375rem] lg:hidden" />
          <Logo className="hidden h-14 w-[4.875rem] lg:block" />
        </Link>

        <nav aria-label={t.nav.main} className="hidden items-center gap-5 xl:flex 2xl:gap-8">
          <div className="group relative">
            <NavLink
              to="/creations"
              className={() => linkClass({ isActive: creationsActive }) + " gap-1.5"}
              aria-haspopup="true"
            >
              {t.nav.creations}
              <ChevronDown className="size-3.5 transition-transform duration-300 group-hover:rotate-180 group-focus-within:rotate-180" aria-hidden="true" />
            </NavLink>
            <div className="invisible absolute left-1/2 top-full w-72 -translate-x-1/2 translate-y-2 pt-3 opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <ul className="border border-white/15 bg-ink/95 p-3 backdrop-blur-xl">
                {CREATION_LINKS.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="flex min-h-12 items-center justify-between px-4 font-display text-xl uppercase tracking-[0.14em] text-white transition-colors hover:text-rose-light focus-visible:text-rose-light"
                    >
                      {item.label}
                      <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {MAIN_LINKS.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageMenu className="hidden md:block" />
          <a
            href={waLink(t.whatsapp.hello)}
            target="_blank"
            rel="noreferrer"
            aria-label={t.common.chatWhatsapp}
            className="hidden size-12 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:border-rose-light hover:text-rose-light md:inline-flex"
          >
            <BrandIcon name="whatsapp" className="size-5" />
          </a>
          <Link
            to="/contact"
            className="hidden min-h-12 items-center gap-2 whitespace-nowrap bg-white px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-rose-light md:inline-flex 2xl:px-6 2xl:tracking-[0.18em]"
          >
            {t.common.startPiece}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            className="inline-flex size-12 items-center justify-center text-white xl:hidden"
          >
            {open ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        data-lenis-prevent
        className={[
          "fixed inset-x-0 bottom-0 top-18 overflow-y-auto bg-ink transition-[opacity,visibility] duration-500 lg:top-22 xl:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        ].join(" ")}
      >
        <nav aria-label={t.nav.mobile} className="flex min-h-full flex-col px-6 pt-8 pb-36 sm:px-10">
          <p className="eyebrow mb-3">{t.nav.creations}</p>
          <ul className="mb-8 border-s border-rose-deep ps-5">
            {CREATION_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="flex min-h-12 items-center text-lg text-white hover:text-rose-light">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="space-y-1">
            {MAIN_LINKS.map((item, i) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    "flex min-h-14 items-baseline gap-4 font-display text-4xl font-light uppercase tracking-[0.12em] sm:text-5xl " +
                    (isActive ? "text-rose-light" : "text-white hover:text-rose-light")
                  }
                >
                  <span className="text-rose-gold font-sans text-sm font-medium tracking-[0.2em]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="rule-rose my-10" />
          <p className="eyebrow mb-2">{t.language.label}</p>
          <LanguageLinks />
          <p className="mt-8 text-base text-mist">{t.site.baseLine}</p>
        </nav>
      </div>
    </header>
  );
}
