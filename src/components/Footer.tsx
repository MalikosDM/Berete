import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import Logo from "@/components/Logo";
import { DEFAULT_MESSAGE, INSTAGRAM_HANDLE, INSTAGRAM_URL, waLink } from "@/lib/site";

const CREATIONS = [
  { label: "All creations", to: "/creations" },
  { label: "Chains", to: "/creations?category=chains" },
  { label: "Pendants", to: "/creations?category=pendants" },
  { label: "Championship Rings", to: "/creations?category=rings" },
];

const HOUSE = [
  { label: "Players", to: "/players" },
  { label: "Atelier", to: "/atelier" },
  { label: "Boxes", to: "/boxes" },
  { label: "Process", to: "/process" },
  { label: "About", to: "/about" },
];

const linkCls = "inline-flex min-h-12 items-center text-base text-bone transition-colors hover:text-rose-light";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative bg-ink pb-28 md:pb-0">
      <div className="rule-rose" />
      <div className="mx-auto max-w-[1600px] px-5 pt-20 sm:px-8 lg:px-12 lg:pt-28">
        <p className="eyebrow">Made by us. Inspired by you.</p>
        <Link to="/" className="mt-6 block" aria-label="Berete Jewellers, home">
          <Logo className="h-[clamp(7rem,22vw,16rem)] w-full max-w-4xl" />
        </Link>
        <p className="mt-8 text-lg text-mist">Based in Dubai · Worldwide delivery</p>

        <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:mt-24 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <h2 className="eyebrow mb-4">Creations</h2>
            <ul>
              {CREATIONS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className={linkCls}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-3">
            <h2 className="eyebrow mb-4">House</h2>
            <ul>
              {HOUSE.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className={linkCls}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-3">
            <h2 className="eyebrow mb-4">Contact</h2>
            <ul>
              <li>
                <a href={waLink(DEFAULT_MESSAGE)} target="_blank" rel="noreferrer" className={linkCls + " gap-3"}>
                  <BrandIcon name="whatsapp" className="size-5" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className={linkCls + " gap-3"}>
                  <BrandIcon name="instagram" className="size-5" />@{INSTAGRAM_HANDLE}
                </a>
              </li>
              <li>
                <Link to="/contact" className={linkCls}>
                  Contact page
                </Link>
              </li>
            </ul>
          </div>
          <div className="lg:col-span-3">
            <h2 className="eyebrow mb-4">Your piece</h2>
            <p className="text-base text-bone">
              Chains, pendants and championship rings, designed with you and crafted for the moment.
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-flex min-h-12 items-center gap-2 border border-rose-light/70 px-6 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-rose-light hover:text-ink"
            >
              Start your piece
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-4 border-t border-white/15 py-8 text-base text-mist sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Berete Jewellers. All rights reserved.</p>
          <ul className="flex gap-8">
            <li>
              <Link to="/legal" className="inline-flex min-h-12 items-center hover:text-rose-light">
                Legal notice
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="inline-flex min-h-12 items-center hover:text-rose-light">
                Privacy
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
