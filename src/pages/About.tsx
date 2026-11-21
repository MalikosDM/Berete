import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { MediaView } from "@/components/Media";
import Reveal from "@/components/Reveal";
import SplitHeading from "@/components/SplitHeading";
import { HOUSE_QUOTES_AFTER, housePhoto, housePhotoKey } from "@/data/house";
import type { MediaItem } from "@/data/types";
import { Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { waLink } from "@/lib/site";
import { useWhatsAppMessage } from "@/lib/whatsapp";

/** A personal photo of Yoni, only when there is one (never an empty frame). */
function HousePhoto({ photo, alt, className = "" }: { photo: MediaItem | null; alt: string; className?: string }) {
  if (!photo) return null;
  return (
    <Reveal mask className={className}>
      <figure data-house-photo className="overflow-hidden bg-ink-soft">
        <MediaView item={photo} alt={photo.alt ?? alt} fit="cover" sizes="(max-width: 1023px) 100vw, 40vw" className="aspect-[4/5]" />
      </figure>
    </Reveal>
  );
}

/**
 * The House (/about): the story of Yoni Berete, founder and creative director, in his own words (src/i18n/house). An
 * editorial page: the opening, then the chapters of his story, three of his quotes set apart (01 The Identity,
 * 02 The Philosophy, 03 The Journey), and the signature of the house.
 */
export default function About() {
  const { t } = useI18n();
  const waMessage = useWhatsAppMessage();
  const cat = useCatalogue();
  const house = t.house;
  const portrait = housePhoto(cat, housePhotoKey.portrait);

  return (
    <article data-house>
      {/* The opening: the house, its founder, his line */}
      <section aria-label={t.about.founderLabel} className="relative bg-ink pt-36 pb-16 sm:pt-44 lg:pt-52 lg:pb-24">
        <div className={"mx-auto grid max-w-[1600px] gap-14 px-5 sm:px-8 lg:px-12 " + (portrait ? "lg:grid-cols-12 lg:items-end lg:gap-12" : "")}>
          <div className={portrait ? "lg:col-span-7" : "max-w-5xl"}>
            <p className="eyebrow">{t.about.title}</p>
            <h1 className="mt-6">
              <span className="title-caps block text-[clamp(2.5rem,9vw,7rem)] leading-[0.95] tracking-[0.1em] text-white">{house.name}</span>
              <span className="mt-5 block font-display text-[clamp(1.375rem,3.2vw,2.25rem)] font-light tracking-[0.08em] text-rose-light">{house.role}</span>
            </h1>
            <Reveal delay={0.15}>
              <p className="mt-10 max-w-3xl font-display text-[clamp(1.75rem,4vw,3.25rem)] font-light italic leading-[1.15] text-white [text-wrap:balance]">{house.tagline}</p>
            </Reveal>
            <Reveal delay={0.25}>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-mist lg:text-xl">{t.about.lead}</p>
            </Reveal>
          </div>
          <HousePhoto photo={portrait} alt={t.about.founderPortrait} className="lg:col-span-4 lg:col-start-9" />
        </div>
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
          <div className="rule-rose mt-14 origin-left animate-draw rtl:origin-right lg:mt-20" aria-hidden="true" />
        </div>
      </section>

      {/* The chapters of his story, with his quotes */}
      <section aria-labelledby="house-chapters" className="bg-ink pb-24 lg:pb-36">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
          <h2 id="house-chapters" className="eyebrow pt-6">{t.about.chapters}</h2>
          <ol className="mt-6">
            {house.chapters.map((chapter, i) => {
              const photo = housePhoto(cat, housePhotoKey.chapter(i));
              const q = HOUSE_QUOTES_AFTER.indexOf(i as (typeof HOUSE_QUOTES_AFTER)[number]);
              const quote = q >= 0 ? house.quotes[q] : undefined;
              const quotePhoto = q >= 0 ? housePhoto(cat, housePhotoKey.quote(q)) : null;
              return (
                <Fragment key={i}>
                  <li data-house-chapter={i + 1} className="grid gap-8 border-t border-white/15 py-14 lg:grid-cols-12 lg:gap-12 lg:py-20">
                    <div className="lg:col-span-4">
                      <span aria-hidden="true" className="text-rose-gold block font-display text-5xl font-light leading-none lg:text-6xl">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="title-caps mt-6 text-[clamp(1.625rem,3.4vw,2.5rem)] leading-[1.15] tracking-[0.1em] text-white [text-wrap:balance]">{chapter.title}</h3>
                      <HousePhoto photo={photo} alt={chapter.title} className="mt-10 max-w-md" />
                    </div>
                    <div className="max-w-2xl space-y-6 lg:col-span-7 lg:col-start-6">
                      {chapter.paragraphs.map((paragraph, k) => (
                        <Reveal key={k} delay={Math.min(k, 3) * 0.04}>
                          <p className={"leading-relaxed text-bone " + (k === 0 ? "text-xl text-white lg:text-2xl" : "text-lg")}>{paragraph}</p>
                        </Reveal>
                      ))}
                    </div>
                  </li>
                  {quote ? (
                    <li data-house-quote={q + 1} className="border-t border-white/15 py-16 lg:py-28">
                      <div className={"grid gap-12 " + (quotePhoto ? "lg:grid-cols-12 lg:items-center lg:gap-16" : "")}>
                        <figure className={quotePhoto ? "lg:col-span-7" : "mx-auto max-w-5xl text-center"}>
                          <p className="eyebrow">{t.about.quoteNumber(q + 1, quote.label)}</p>
                          <blockquote className="mt-8">
                            <p className="font-display text-[clamp(2rem,5vw,4.25rem)] font-light italic leading-[1.12] text-white [text-wrap:balance]">
                              {t.about.quoted(quote.text)}
                            </p>
                          </blockquote>
                          <figcaption className={"mt-10 flex items-center gap-4 text-base uppercase tracking-[0.2em] text-rose-light " + (quotePhoto ? "" : "justify-center")}>
                            <span className="rule-rose w-12" aria-hidden="true" />
                            {house.name}
                          </figcaption>
                        </figure>
                        <HousePhoto photo={quotePhoto} alt={t.about.quoteNumber(q + 1, quote.label)} className="lg:col-span-4 lg:col-start-9" />
                      </div>
                    </li>
                  ) : null}
                </Fragment>
              );
            })}
          </ol>

          {/* The last lines: his legacy, then the signature of the house */}
          <div className="border-t border-white/15 pt-20 text-center lg:pt-28">
            <Reveal>
              <SplitHeading as="p" className="mx-auto max-w-5xl text-[clamp(1.75rem,4.5vw,3.75rem)] leading-[1.15] tracking-[0.08em] text-white [text-wrap:balance]">
                {house.closing}
              </SplitHeading>
            </Reveal>
            <p className="mt-10 font-display text-[clamp(1.5rem,3vw,2.25rem)] font-light italic text-rose-light">{house.signature}</p>
            <div className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/contact"
                className="inline-flex min-h-14 items-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light"
              >
                {t.common.startPiece}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
              <a
                href={waLink(waMessage)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-14 items-center gap-3 border border-white/40 px-8 text-base font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:border-rose-light hover:text-rose-light"
              >
                <BrandIcon name="whatsapp" className="size-5" />
                {t.common.chatWhatsapp}
              </a>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
