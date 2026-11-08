import { useEffect, useRef, useState } from "react";
import { ArrowRight, Maximize2, X } from "lucide-react";
import { Img, LoopVideo, MediaView } from "@/components/Media";
import PageIntro from "@/components/PageIntro";
import Reveal from "@/components/Reveal";
import { media } from "@/data/catalogue";
import type { Box, MediaItem } from "@/data/types";
import { Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { getLenis, gsap, useReducedMotion } from "@/lib/gsap";

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.75)]";

export default function Atelier() {
  const { t } = useI18n();
  /* The atelier photos, in the order of their numbers (warm black and white from the import). */
  const STEPS = t.atelier.steps;
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const setting = media.videos["atelier/setting"];
  const photos: MediaItem[] = media.groups["atelier"] ?? [];

  // Each step opens through a mask, with a light parallax.
  useEffect(() => {
    if (reduced || !root.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-mask]").forEach((el, i) => {
        const from = i % 2 === 0 ? "inset(18% 12% 18% 12%)" : "circle(14% at 50% 50%)";
        const to = i % 2 === 0 ? "inset(0% 0% 0% 0%)" : "circle(80% at 50% 50%)";
        gsap.fromTo(el, { clipPath: from }, { clipPath: to, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "top top", scrub: true } });
        const img = el.querySelector("img");
        if (img) gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
      });
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <div ref={root}>
      {/* Opening: the setting film, full screen, silent, playing only while visible */}
      <section aria-labelledby="atelier-title" className="relative flex h-svh items-end overflow-hidden bg-ink">
        {setting ? <LoopVideo item={setting} label={t.atelier.filmLabel} className="absolute inset-0 h-full w-full object-cover" /> : null}
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink via-ink/40 to-ink/30" />
        <div className={"relative mx-auto w-full max-w-[1600px] px-5 pb-28 sm:px-8 md:pb-20 lg:px-12 " + shadow}>
          <p className="eyebrow">{t.atelier.eyebrow}</p>
          <h1 id="atelier-title" className="title-caps mt-5 text-[clamp(2.75rem,9vw,8rem)] tracking-[0.14em] text-white">{t.atelier.title}</h1>
          <p className="mt-6 max-w-lg text-lg text-bone">{t.atelier.lead}</p>
        </div>
      </section>

      <section aria-labelledby="atelier-steps" className="relative">
        <h2 id="atelier-steps" className="sr-only">
          {t.atelier.making}
        </h2>
        {photos.map((photo, i) => {
          const step = STEPS[i] ?? { title: t.atelier.step(i + 1), text: "" };
          return (
            <article key={photo.src} className="sticky top-0 h-svh w-full overflow-hidden bg-ink" style={{ zIndex: i + 1 }}>
              <div data-mask className="absolute inset-0 overflow-hidden">
                <Img src={photo.src} alt={t.atelier.stepAlt(step.title)} width={photo.width} height={photo.height} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink via-ink/55 to-ink/10" />
              </div>
              <div className="relative z-10 mx-auto flex h-full max-w-[1600px] flex-col justify-end px-5 pb-28 sm:px-8 md:pb-20 lg:px-12">
                <p className="text-rose-gold font-display text-5xl font-light md:text-7xl">{String(i + 1).padStart(2, "0")}</p>
                <h3 className={"title-caps mt-4 text-[clamp(2rem,6vw,5rem)] text-white " + shadow}>{step.title}</h3>
                <div className="rule-rose my-6 max-w-xs" aria-hidden="true" />
                <p className={"max-w-xl text-lg text-bone " + shadow}>{step.text}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="relative z-20 bg-ink px-5 py-24 text-center sm:px-8 md:py-32">
        <Reveal>
          <p className="eyebrow">{t.common.yourPiece}</p>
          <h2 className="title-caps mx-auto mt-6 max-w-4xl text-[clamp(2rem,5vw,4.5rem)] text-white">{t.atelier.ctaTitle}</h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-bone">{t.atelier.ctaText}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/contact" className="inline-flex min-h-12 items-center gap-3 bg-white px-8 text-base font-semibold text-ink transition hover:bg-rose-light">
              {t.common.startPiece} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
            <Link to="/process" className="border-rose-gold inline-flex min-h-12 items-center gap-3 px-8 text-base text-white transition hover:text-rose-light">
              {t.atelier.seeProcess}
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

/* ---------- Boxes ---------- */

function BoxViewer({ box, onClose }: { box: Box; onClose: () => void }) {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const lenis = getLenis();
    lenis?.stop();
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={box.name} data-lenis-prevent className="fixed inset-0 z-[90] overflow-y-auto bg-ink">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-ink/90 px-5 py-4 backdrop-blur-md sm:px-8">
        <p className="title-caps text-2xl tracking-[0.12em]">{box.name}</p>
        <button ref={closeRef} type="button" onClick={onClose} className="inline-flex size-12 items-center justify-center border border-white/40 text-white hover:text-rose-light" aria-label={t.common.close}>
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>
      <ul className="mx-auto max-w-6xl space-y-6 px-5 pb-16 sm:px-8">
        {box.images.map((m) => (
          <li key={m.src}>
            <MediaView item={m} fit="contain" className="max-h-[85svh]" />
            {m.caption ? <p className="mt-3 text-base text-bone">{m.caption}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Boxes() {
  const { t } = useI18n();
  const { boxes } = useCatalogue();
  const [open, setOpen] = useState<Box | null>(null);

  return (
    <div className="pb-24">
      <PageIntro eyebrow={t.boxes.eyebrow} title={t.boxes.title} lead={t.boxes.lead} />

      <section aria-label={t.boxes.listLabel} className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <ul className="grid gap-16 md:grid-cols-2 md:gap-12">
          {boxes.map((box, i) => (
            <li key={box.slug} className={i % 2 === 1 ? "md:mt-32" : ""}>
              <Reveal>
                <button type="button" onClick={() => setOpen(box)} className="group relative block w-full overflow-hidden text-start" aria-label={t.boxes.open(box.name)}>
                  <span className="block aspect-[3/2] overflow-hidden bg-ink-soft">
                    {box.images[0] ? <MediaView item={box.images[0]} fit="cover" className="transition duration-700 group-hover:scale-[1.03]" /> : null}
                  </span>
                  <span className="absolute top-3 end-3 inline-flex size-12 items-center justify-center bg-ink/70 text-white transition group-hover:text-rose-light">
                    <Maximize2 className="size-5" aria-hidden="true" />
                  </span>
                </button>
                <p className="text-rose-gold mt-6 font-display text-3xl">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="title-caps mt-2 text-3xl text-white md:text-4xl">{box.name}</h2>
                <p className="mt-4 max-w-md text-lg text-bone">{box.description}</p>
                {box.images.length > 1 ? <p className="mt-2 text-base text-mist">{t.boxes.photos(box.images.length)}</p> : null}
                {box.pieceSlug ? (
                  <Link to={"/pieces/" + box.pieceSlug} className="mt-4 inline-flex min-h-12 items-center gap-2 text-base font-semibold text-white hover:text-rose-light">
                    {t.common.seePiece} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                  </Link>
                ) : null}
              </Reveal>
            </li>
          ))}
        </ul>
        <div className="rule-rose my-20" aria-hidden="true" />
        <p className="mx-auto max-w-2xl text-center font-display text-2xl text-white md:text-3xl">{t.boxes.lead}</p>
        <div className="mt-10 flex justify-center">
          <Link to="/contact" className="inline-flex min-h-12 items-center gap-3 bg-white px-8 text-base font-semibold text-ink hover:bg-rose-light">
            {t.common.startPiece} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {open ? <BoxViewer box={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
