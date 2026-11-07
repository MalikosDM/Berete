import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import Logo from "@/components/Logo";
import { DEFAULT_MESSAGE, waLink } from "@/lib/site";
import { getLenis } from "@/lib/gsap";

type NavLinkItem = { label: string; to: string };

const CREATION_LINKS: NavLinkItem[] = [
  { label: "All creations", to: "/creations" },
  { label: "Chains", to: "/creations?category=chains" },
  { label: "Pendants", to: "/creations?category=pendants" },
  { label: "Championship Rings", to: "/creations?category=rings" },
];

const MAIN_LINKS: NavLinkItem[] = [
  { label: "Players", to: "/players" },
  { label: "Atelier", to: "/atelier" },
  { label: "Boxes", to: "/boxes" },
  { label: "Process", to: "/process" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

function linkClass({ isActive }: { isActive: boolean }): string {
  return [
    "relative inline-flex min-h-12 items-center text-[0.8125rem] font-medium uppercase tracking-[0.2em] transition-colors",
    "after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:bg-rose-light after:transition-transform after:duration-500",
    isActive ? "text-rose-light after:scale-x-100" : "text-white hover:text-rose-light after:scale-x-0 hover:after:scale-x-100",
  ].join(" ");
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

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

  const creationsActive = location.pathname.startsWith("/creations");

  return (
    <>
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-500",
        scrolled || open ? "border-b border-white/10 bg-ink/80 backdrop-blur-xl" : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-18 max-w-[1600px] items-center justify-between gap-6 px-5 sm:px-8 lg:h-22 lg:px-12">
        <Link to="/" className="group flex min-h-12 flex-col justify-center" aria-label="Berete Jewellers, home">
          <Logo crop className="h-10 w-[4.75rem] lg:hidden" />
          <Logo className="hidden h-14 w-52 lg:block" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 xl:flex">
          <div className="group relative">
            <NavLink
              to="/creations"
              className={() => linkClass({ isActive: creationsActive }) + " gap-1.5"}
              aria-haspopup="true"
            >
              Creations
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
                      <ArrowRight className="size-4" aria-hidden="true" />
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
          <a
            href={waLink(DEFAULT_MESSAGE)}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat with us on WhatsApp"
            className="hidden size-12 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:border-rose-light hover:text-rose-light md:inline-flex"
          >
            <BrandIcon name="whatsapp" className="size-5" />
          </a>
          <Link
            to="/contact"
            className="hidden min-h-12 items-center gap-2 bg-white px-6 text-[0.8125rem] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-rose-light md:inline-flex"
          >
            Start your piece
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
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
        <nav aria-label="Mobile" className="flex min-h-full flex-col px-6 pt-8 pb-36 sm:px-10">
          <p className="eyebrow mb-3">Creations</p>
          <ul className="mb-8 border-l border-rose-deep pl-5">
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
          <p className="text-base text-mist">Based in Dubai · Worldwide delivery</p>
        </nav>
      </div>
    </header>
    </>
  );
}
