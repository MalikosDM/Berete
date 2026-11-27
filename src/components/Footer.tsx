
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { LanguageLinks } from "@/components/LanguageMenu";
import Logo from "@/components/Logo";
import { collectionPath, subcategoriesOf, visibleCollections } from "@/data/collections";
import { collectionWords, Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL, waLink, HAS_SERVER } from "@/lib/site";
import { useWhatsAppMessage } from "@/lib/whatsapp";

const linkCls = "inline-flex min-h-11 items-center text-base text-bone transition-colors hover:text-rose-light lg:min-h-9";

export default function Footer() {
  const { t } = useI18n();
  const waMessage = useWhatsAppMessage();
  const cat = useCatalogue();
  const year = new Date().getFullYear();
  const creations = [
    { label: t.common.allCreations, to: "/creations", sub: false },
    ...visibleCollections(cat).flatMap(({ collection }) => [
      { label: collectionWords(t, collection.slug, collection).name, to: collectionPath(collection), sub: false },
      ...subcategoriesOf(cat, collection.type).map((s) => ({ label: collectionWords(t, s.slug, s).name, to: collectionPath(s), sub: true })),
    ]),
  ];
  const house = [
    { label: t.nav.players, to: "/players" },
    { label: t.nav.atelier, to: "/atelier" },
    { label: t.nav.boxes, to: "/boxes" },
    { label: t.nav.process, to: "/process" },
    { label: t.nav.about, to: "/about" },
    { label: t.nav.press, to: "/press" },
  ];

  return (
    <footer className="relative bg-ink pb-28 md:pb-0">
      <div className="rule-rose" />
      <div className="mx-auto max-w-[1600px] px-5 pt-16 sm:px-8 lg:px-12 lg:pt-20">
        {/* The logo, smaller, sharp and centred; the signature of the house under it, never above (Yoni, 24/11/2026). */}
        <div className="flex flex-col items-center text-center" data-footer-brand>
          <Link to="/" className="block" aria-label={t.site.homeLabel}>
            <Logo position="center" className="h-[5.5rem] w-[7.625rem] sm:h-24 sm:w-[8.25rem]" />
          </Link>
          <p className="eyebrow mt-6" data-footer-tagline>{t.site.tagline}</p>
          <p className="mt-3 text-base text-mist">{t.site.baseLine}</p>
        </div>

        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:mt-16 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <h2 className="eyebrow mb-4">{t.footer.creations}</h2>
            <ul>
              {creations.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className={linkCls + (l.sub ? " gap-2 ps-4" : "")}>
                    {l.sub ? <span aria-hidden="true" className="bg-rose-gold h-px w-2.5" /> : null}
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
                <a href={waLink(waMessage)} target="_blank" rel="noreferrer" className={linkCls + " gap-3"}>
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
              {/* The client space needs the server: no link to it on the version online without one. */}
              {HAS_SERVER ? (
                <li>
                  <Link to="/vip" className={linkCls} data-vip-link>
                    {t.privateAtelier.nav}
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
          <div className="lg:col-span-3">
            <h2 className="eyebrow mb-4">{t.common.yourStory}</h2>
            <p className="text-base text-bone">{t.footer.pitch}</p>
            <Link to="/contact" data-cta className="btn-primary mt-6">
              {t.common.startPiece}
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
            <AdminLock />
          </ul>
        </div>
      </div>
    </footer>
  );
}

/**
 * The way to the admin from the site (Yoni, 25/11/2026): a small padlock, discreet, at the foot of the page; shown only to a
 * device that came in by the private access or that logged in to the admin (the mark "bj_in" of server/access-state.ts, or the
 * session of the admin), never to a visitor.
 */
function AdminLock() {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let admin = false;
    try {
      admin = Boolean(sessionStorage.getItem("bj-admin-token"));
    } catch {
      /* private browsing */
    }
    // Known only in the browser (the page written by the server never shows it).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown(admin || /(?:^|;\s*)bj_in=1/.test(document.cookie));
  }, []);
  if (!shown) return null;
  return (
    <li>
      <a href="/admin" data-admin-lock aria-label={t.footer.admin} title={t.footer.admin} className="inline-flex size-12 items-center justify-center text-mist/70 transition-colors hover:text-rose-light">
        <Lock className="size-4" aria-hidden="true" />
      </a>
    </li>
  );
}
