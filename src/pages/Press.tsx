import { ArrowRight, ArrowUpRight } from "lucide-react";
import ContactBlock from "@/components/ContactBlock";
import { MediaView } from "@/components/Media";
import PageIntro from "@/components/PageIntro";
import Reveal from "@/components/Reveal";
import { publishedPress, type PublishedArticle } from "@/data/press";
import { Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";

/** "24 September 2025" in the language of the page (the day of the article, whatever the time zone of the visitor). */
export function pressDate(date: string, intl: string): string {
  return new Intl.DateTimeFormat(intl, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"));
}

/**
 * One article (Yoni, 23/11/2026): the whole card opens the article in a new tab (the newspaper, its headline in its own
 * language, its day); under the card, a discreet way to the world of the piece it tells.
 */
export function PressCard({ article, withPiece = true }: { article: PublishedArticle; withPiece?: boolean }) {
  const { t, intl } = useI18n();
  const cat = useCatalogue();
  const piece = withPiece ? cat.pieces.find((p) => article.pieces.includes(p.slug)) : undefined;
  return (
    <article data-press-card={article.outlet} className="flex h-full flex-col">
      <a href={article.url} target="_blank" rel="noreferrer" data-press-link className="group flex flex-1 flex-col border border-white/12 bg-ink-soft/60 transition-colors hover:border-rose-light/60">
        {piece ? (
          <span className="relative block aspect-[16/10] overflow-hidden bg-ink">
            <span className="absolute inset-0 p-6 transition-transform duration-[1.6s] ease-out group-hover:scale-[1.04]">
              <MediaView item={piece.cover} alt="" fit="contain" sizes="(max-width: 767px) 92vw, (max-width: 1279px) 46vw, 30vw" />
            </span>
          </span>
        ) : null}
        <span className="flex flex-1 flex-col p-6 sm:p-7">
          <span className="text-base font-semibold uppercase tracking-[0.18em] text-rose-light">{article.outlet}</span>
          <span className="mt-1 text-base text-mist">
            <time dateTime={article.date}>{pressDate(article.date, intl)}</time>
          </span>
          <span lang={article.lang} className="mt-4 font-display text-[clamp(1.375rem,2vw,1.75rem)] leading-snug text-white [text-wrap:pretty] group-hover:text-rose-light">
            {article.title}
          </span>
          <span className="mt-auto inline-flex min-h-12 items-center gap-2 pt-6 text-base font-semibold text-white">
            {t.common.readArticle} <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </span>
        </span>
      </a>
      {piece ? (
        <Link to={"/pieces/" + piece.slug} data-press-piece={piece.slug} className="mt-2 inline-flex min-h-12 items-center gap-2 text-base text-mist hover:text-rose-light">
          {t.press.discover} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          <span className="sr-only"> · {piece.title}</span>
        </Link>
      ) : null}
    </article>
  );
}

/**
 * In the Spotlight (/press, Yoni 23/11/2026): the articles about the house, in his order, each as a card (the newspaper, the
 * headline, the day, the link). BILD keeps the first place and appears the day its link is given (src/data/press.ts).
 */
export default function Press() {
  const { t } = useI18n();
  const articles = publishedPress();
  return (
    <>
      <PageIntro eyebrow={t.press.eyebrow} title={t.press.title} lead={t.press.lead} />
      <section aria-label={t.press.title} data-press className="mx-auto max-w-[1600px] px-5 pb-24 sm:px-8 lg:px-12 lg:pb-32">
        <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 lg:gap-8">
          {articles.map((a, i) => (
            <li key={a.url}>
              <Reveal delay={(i % 3) * 0.06} className="h-full">
                <PressCard article={a} />
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
      <ContactBlock id="press-contact" compact />
    </>
  );
}
