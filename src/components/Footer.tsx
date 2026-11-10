import { ArrowUpRight } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { LanguageLinks } from "@/components/LanguageMenu";
import Logo from "@/components/Logo";
import { visibleCollections } from "@/data/collections";
import { collectionWords, Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL, waLink } from "@/lib/site";

const linkCls = "inline-flex min-h-12 items-center text-base text-bone transition-colors hover:text-rose-light";

export default function Footer() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const year = new Date().getFullYear();
  const creations = [
    { label: t.common.allCreations, to: "/creations" },
    ...visibleCollections(cat).map(({ collection }) => ({ label: collectionWords(t, collection.slug, collection).name, to: "/creations/" + collection.slug })),
  ];
  const house = [
    { label: t.nav.players, to: "/players" },
    { label: t.nav.atelier, to: "/atelier" },
    { label: t.nav.boxes, to: "/boxes" },
    { label: t.nav.process, to: "/process" },
    { label: t.nav.about, to: "/about" },
  ];

  return (
    <footer className="relative bg-ink pb-28 md:pb-0">
      <div className="rule-rose" />
      <div className="mx-auto max-w-[1600px] px-5 pt-20 sm:px-8 lg:px-12 lg:pt-28">
        <p className="eyebrow">{t.site.tagline}</p>
        <Link to="/" className="mt-6 block" aria-label={t.site.homeLabel}>
          <Logo className="h-[clamp(7rem,18vw,13rem)] w-full max-w-3xl" />
        </Link>
        <p className="mt-8 text-lg text-mist">{t.site.baseLine}</p>

        <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:mt-24 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <h2 className="eyebrow mb-4">{t.footer.creations}</h2>
            <ul>
              {creations.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className={linkCls}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-3">
            <h2 className="eyebrow mb-4">{t.footer.house}</h2>
            <ul>
              {house.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className={linkCls}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-3">
            <h2 className="eyebrow mb-4">{t.footer.contact}</h2>
            <ul>
              <li>
                <a href={waLink(t.whatsapp.hello)} target="_blank" rel="noreferrer" className={linkCls + " gap-3"}>
                  <BrandIcon name="whatsapp" className="size-5" />
                  {t.common.whatsapp}
                </a>
              </li>
              <li>
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className={linkCls + " gap-3"}>
                  <BrandIcon name="instagram" className="size-5" />
                  <span dir="ltr">@{INSTAGRAM_HANDLE}</span>
                </a>
              </li>
              {EMAIL ? (
                <li>
                  <a href={"mailto:" + EMAIL} className={linkCls} dir="ltr">
                    {EMAIL}
                  </a>
                </li>
              ) : null}
              <li>
                <Link to="/contact" className={linkCls}>
                  {t.footer.contactPage}
                </Link>
              </li>
              <li>
                <Link to="/vip" className={linkCls} data-vip-link>
                  {t.vip.footerLink}
                </Link>
              </li>
            </ul>
          </div>
          <div className="lg:col-span-3">
            <h2 className="eyebrow mb-4">{t.footer.yourPiece}</h2>
            <p className="text-base text-bone">{t.footer.pitch}</p>
            <Link
              to="/contact"
              className="mt-6 inline-flex min-h-12 items-center gap-2 border border-rose-light/70 px-6 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-rose-light hover:text-ink"
            >
              {t.common.startPiece}
              <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-16 border-t border-white/15 pt-8">
          <h2 className="eyebrow mb-2">{t.language.label}</h2>
          <LanguageLinks />
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/15 py-8 text-base text-mist sm:flex-row sm:items-center sm:justify-between">
          <p>{t.site.rights(year)}</p>
          <ul className="flex gap-8">
            <li>
              <Link to="/legal" className="inline-flex min-h-12 items-center hover:text-rose-light">
                {t.footer.legal}
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="inline-flex min-h-12 items-center hover:text-rose-light">
                {t.footer.privacy}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
