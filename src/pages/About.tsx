import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { MediaView } from "@/components/Media";
import Reveal from "@/components/Reveal";
import SplitHeading from "@/components/SplitHeading";
import { HOUSE_QUOTES_AFTER, houseChapterPhoto, housePhoto, housePhotoKey } from "@/data/house";
import type { MediaItem } from "@/data/types";
import { Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { waLink } from "@/lib/site";
import { useWhatsAppMessage } from "@/lib/whatsapp";

/**
 * A personal photo of Yoni, only when there is one (never an empty frame). `top`: framed from its top, so that a portrait
 * keeps the whole head (the 4:5 frame only trims the bottom). `eager`: the photo of the top of the page, loaded at once.
 */
function HousePhoto({ photo, alt, className = "", top = false, eager = false }: { photo: MediaItem | null; alt: string; className?: string; top?: boolean; eager?: boolean }) {
  if (!photo) return null;
  return (
    <Reveal mask className={className}>
      <figure data-house-photo className="overflow-hidden bg-ink-soft">
        <MediaView item={photo} alt={photo.alt ?? alt} fit="cover" eager={eager} sizes="(max-width: 1023px) 100vw, 40vw" className={"aspect-[4/5]" + (top ? " object-top" : "")} />
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
      <section aria-label={t.about.founderLabel} className="relative bg-ink pt-28 pb-12 sm:pt-32 lg:pt-36 lg:pb-16">
        <div className={"mx-auto grid max-w-[1240px] gap-10 px-5 sm:px-8 lg:px-12 " + (portrait ? "lg:grid-cols-12 lg:items-end lg:gap-12" : "")}>
          <div className={portrait ? "lg:col-span-7" : "max-w-5xl"}>
            <p className="eyebrow">{t.about.title}</p>
            {/* Small and thin (Yoni, 24/11/2026), the name first. */}
            <h1 className="mt-4">
              <span className="title-caps block t-hero leading-[1.05] tracking-[0.14em] text-white">{house.name}</span>
              <span className="mt-3 block font-display t-sub font-light tracking-[0.08em] text-rose-light">{house.role}</span>
            </h1>
            <Reveal delay={0.15}>
              <p className="mt-7 max-w-2xl font-display t-lead font-light italic leading-[1.25] text-white [text-wrap:balance]">{house.tagline}</p>
            </Reveal>
            <Reveal delay={0.25}>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-mist lg:text-[0.9375rem]">{t.about.lead}</p>
            </Reveal>
          </div>
          <HousePhoto photo={portrait} alt={t.about.founderPortrait} top eager className="lg:col-span-4 lg:col-start-9" />
        </div>
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-12">
          <div className="rule-rose mt-10 origin-left animate-draw rtl:origin-right lg:mt-12" aria-hidden="true" />
        </div>
      </section>

      {/* The chapters of his story, with his quotes */}
      <section aria-labelledby="house-chapters" className="bg-ink pb-20 lg:pb-28">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-12">
          <h2 id="house-chapters" className="eyebrow pt-6">{t.about.chapters}</h2>
          <ol className="mt-6">
            {house.chapters.map((chapter, i) => {
              const photo = houseChapterPhoto(cat, i);
              const q = HOUSE_QUOTES_AFTER.indexOf(i as (typeof HOUSE_QUOTES_AFTER)[number]);
              const quote = q >= 0 ? house.quotes[q] : undefined;
              const quotePhoto = q >= 0 ? housePhoto(cat, housePhotoKey.quote(q)) : null;
              return (
                <Fragment key={i}>
                  <li data-house-chapter={i + 1} className="grid gap-6 border-t border-white/12 py-10 lg:grid-cols-12 lg:gap-12 lg:py-14">
                    <div className="lg:col-span-4">
                      <span aria-hidden="true" className="text-rose-gold block font-display text-3xl font-light leading-none lg:text-4xl">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="title-caps mt-4 t-sub leading-[1.25] tracking-[0.1em] text-white [text-wrap:balance]">{chapter.title}</h3>
                      <HousePhoto photo={photo} alt={chapter.title} className="mt-7 max-w-xs" />
                    </div>
                    <div className="max-w-2xl space-y-4 lg:col-span-7 lg:col-start-6">
                      {chapter.paragraphs.map((paragraph, k) => (
                        <Reveal key={k} delay={Math.min(k, 3) * 0.04}>
                          <p className={"text-base leading-relaxed lg:text-[0.9375rem] " + (k === 0 ? "text-white" : "text-bone")}>{paragraph}</p>
                        </Reveal>
                      ))}
                    </div>
                  </li>
                  {quote ? (
                    <li data-house-quote={q + 1} className="border-t border-white/12 py-12 lg:py-16">
                      <div className={"grid gap-12 " + (quotePhoto ? "lg:grid-cols-12 lg:items-center lg:gap-16" : "")}>
                        <figure className={quotePhoto ? "lg:col-span-7" : "mx-auto max-w-5xl text-center"}>
                          <p className="eyebrow">{t.about.quoteNumber(q + 1, quote.label)}</p>
                          <blockquote className="mt-5">
                            <p className="font-display t-lead font-light italic leading-[1.25] text-white [text-wrap:balance]">
                              {t.about.quoted(quote.text)}
                            </p>
                          </blockquote>
                          <figcaption className={"mt-6 flex items-center gap-4 text-base uppercase tracking-[0.2em] text-rose-light lg:text-[0.8125rem] " + (quotePhoto ? "" : "justify-center")}>
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
          <div className="border-t border-white/12 pt-14 text-center lg:pt-16">
            <Reveal>
              <SplitHeading as="p" className="mx-auto max-w-3xl t-lead leading-[1.3] tracking-[0.08em] text-white [text-wrap:balance]">
                {house.closing}
              </SplitHeading>
            </Reveal>
            <p className="mt-6 font-display t-sub font-light italic text-rose-light">{house.signature}</p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/contact"
                className="inline-flex min-h-12 items-center gap-3 bg-white px-6 text-base font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light lg:min-h-11 lg:text-[0.8125rem]"
              >
                {t.common.startPiece}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
              <a
                href={waLink(waMessage)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center gap-3 border border-white/35 px-6 text-base font-normal uppercase tracking-[0.16em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-11 lg:text-[0.8125rem]"
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
