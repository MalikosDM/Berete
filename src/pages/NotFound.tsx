import { Link } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { DEFAULT_MESSAGE, waLink } from "@/lib/site";

export default function NotFound() {
  return (
    <section className="relative flex min-h-svh items-center overflow-hidden bg-ink pt-28 pb-32 md:pb-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[46vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-deep/40"
      />

      <div className="relative mx-auto w-full max-w-[1600px] px-5 text-center sm:px-8 lg:px-12">
        <p className="eyebrow">Page not found</p>
        <h1 className="text-rose-gold mt-6 font-display text-[clamp(7rem,30vw,22rem)] font-light leading-[0.85] tracking-[0.06em]">
          404
        </h1>
        <div className="rule-rose mx-auto mt-10 max-w-md" aria-hidden="true" />
        <p className="title-caps mx-auto mt-10 max-w-3xl text-[clamp(1.5rem,4vw,3rem)] tracking-[0.14em] text-white">
          This piece does not exist… yet.
        </p>
        <p className="mx-auto mt-6 max-w-xl text-lg text-mist">
          The page you are looking for has moved or was never made. Every great piece starts with a conversation: tell us yours.
        </p>

        <div className="mt-12 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
          <Link
            to="/"
            className="inline-flex min-h-14 items-center justify-center gap-3 border border-white/40 px-8 text-base font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:border-rose-light hover:text-rose-light"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back home
          </Link>
          <Link
            to="/contact"
            className="inline-flex min-h-14 items-center justify-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light"
          >
            Start your piece
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <a
          href={waLink(DEFAULT_MESSAGE)}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex min-h-12 items-center gap-3 text-base text-bone transition-colors hover:text-rose-light"
        >
          <BrandIcon name="whatsapp" className="size-5" />
          Or chat with us on WhatsApp
        </a>
      </div>
    </section>
  );
}
