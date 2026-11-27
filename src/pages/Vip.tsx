import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowRight, LogOut, ShieldCheck } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { VipJourney, VipNews } from "@/components/VipTracking";
import { SecurityPanel } from "@/components/atelier/Security";
import { SignInPanel } from "@/components/atelier/SignIn";
import { Spinner, Waiting, WhatsAppLink } from "@/components/atelier/ui";
import { Link, useI18n } from "@/i18n";
import { localizePath } from "@/i18n/locales";
import { atelierMe, signout, type Me } from "@/lib/atelier";
import { metalsInWords, vipEnter, vipLeave, vipMe, type VipSpace } from "@/lib/models";
import { HAS_SERVER, waLink } from "@/lib/site";
import type { PublicModel } from "@/data/models";
import { Jewel3D, type Selection } from "@/viewer";

type State =
  | { state: "loading" }
  | { state: "atelier"; me: Me; legacy: VipSpace | null }
  | { state: "legacy"; space: VipSpace }
  | { state: "out" }
  | { state: "lost" };

/**
 * The private space of a client (/vip). The Private Atelier (27/11/2026): he signs in with his e-mail and his password (and
 * the second step he chose), then finds his commissions (each opens /vip/project/<id>) and the security of his access
 * (?tab=security). The older space stays for the clients who only have it: a personal link (/vip/<token>) or an access code
 * open the follow-up of the commission and the pieces in 3D (src/components/VipTracking.tsx).
 */
export default function Vip() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [state, setState] = useState<State>({ state: "loading" });

  const refresh = useCallback(async (): Promise<State> => {
    const [me, legacy] = await Promise.all([atelierMe(), vipMe()]);
    if (me.state === "ok") return { state: "atelier", me, legacy: legacy.state === "ok" ? legacy : null };
    if (legacy.state === "ok") return { state: "legacy", space: legacy };
    return { state: "out" };
  }, []);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (token) {
        const entered = await vipEnter({ token });
        if (!alive) return;
        if (entered.state === "ok") {
          navigate(localizePath("/vip", locale), { replace: true });
          return;
        }
        setState({ state: "lost" });
        return;
      }
      const next = await refresh();
      if (alive) setState(next);
    };
    void run();
    return () => {
      alive = false;
    };
  }, [token, locale, navigate, refresh]);

  const signedIn = useCallback(async () => setState(await refresh()), [refresh]);
  const out = useCallback(() => setState({ state: "out" }), []);
  const leave = async () => {
    await Promise.all([signout(), vipLeave()]);
    setState({ state: "out" });
  };

  const w = t.vip;

  // The version online without its server: the space opens soon, the pieces come by WhatsApp meanwhile.
  if (!HAS_SERVER) {
    return (
      <section className="mx-auto max-w-xl px-5 pt-40 pb-24 sm:px-8" data-vip-soon>
        <p className="eyebrow">{w.eyebrow}</p>
        <h1 className="title-caps tracking-[0.12em] mt-4 t-hero ">{w.title}</h1>
        <p className="mt-5 text-base text-bone">{w.soon}</p>
        <a href={waLink(w.soonMessage)} target="_blank" rel="noreferrer" className="btn-primary mt-10 w-full sm:w-auto">
          <BrandIcon name="whatsapp" className="size-5" /> {t.contact.openWhatsapp}
        </a>
      </section>
    );
  }

  if (state.state === "loading") return <Waiting>{t.privateAtelier.opening}</Waiting>;
  if (state.state === "atelier") return <Dashboard me={state.me} legacy={state.legacy} onOut={out} onLeave={() => void leave()} />;
  if (state.state === "legacy") return <LegacySpace space={state.space} onLeave={() => void leave()} />;
  return <SignInScreen lost={state.state === "lost"} onSignedIn={() => void signedIn()} onLegacy={(space) => setState({ state: "legacy", space })} />;
}

/* ---------- Not signed in: The Private Atelier first, the access code of the older space under it ---------- */

function SignInScreen({ lost, onSignedIn, onLegacy }: { lost: boolean; onSignedIn: () => void; onLegacy: (space: VipSpace) => void }) {
  const { t } = useI18n();
  const w = t.privateAtelier.signin;
  return (
    <section className="mx-auto max-w-xl px-5 pt-36 pb-24 sm:px-8 lg:pt-44" data-atelier-login>
      <p className="eyebrow">{t.privateAtelier.nav}</p>
      <h1 className="title-caps mt-4 t-hero tracking-[0.12em]">{w.title}</h1>
      <p className="mt-5 text-base text-bone">{lost ? t.vip.linkMissing : w.intro}</p>
      <div className="mt-10">
        <SignInPanel onSignedIn={onSignedIn} />
      </div>
      <p className="mt-6 text-sm text-mist">{w.byInvitation}</p>
      <LegacyCode onEntered={onLegacy} />
      <div className="mt-10 border-t border-white/10 pt-6">
        <WhatsAppLink message={t.privateAtelier.whatsappMessage}>{t.privateAtelier.whatsappHouse}</WhatsAppLink>
      </div>
    </section>
  );
}

/** The access code of the older space: small, under the sign-in. */
function LegacyCode({ onEntered }: { onEntered: (space: VipSpace) => void }) {
  const { t } = useI18n();
  const w = t.vip;
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setWrong(false);
    const entered = await vipEnter({ code });
    if (entered.state === "ok") {
      const me = await vipMe();
      if (me.state === "ok") onEntered(me);
      else setWrong(true);
    } else setWrong(true);
    setBusy(false);
  };

  return (
    <div className="mt-14 border-t border-white/10 pt-8" data-vip-login>
      <h2 className="text-xs font-medium uppercase tracking-[0.22em] text-mist">{t.privateAtelier.signin.legacyTitle}</h2>
      <p className="mt-3 text-sm text-mist">{t.privateAtelier.signin.legacyIntro}</p>
      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="block text-base text-bone">
          {w.code}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX-XXXX"
            className="mt-2 block min-h-12 w-full border border-white/20 bg-ink px-4 text-base tracking-[0.2em] text-white placeholder:text-mist/50 focus:border-rose-light focus:outline-none"
          />
        </label>
        <button type="submit" disabled={busy || code.replace(/[^0-9A-Z]/g, "").length < 8} className="btn-secondary min-h-12 justify-center border border-white/20 px-6 disabled:opacity-50">
          {busy ? <Spinner /> : null} {w.enter}
        </button>
        <span className="text-sm text-mist sm:col-span-2">{w.codeHint}</span>
        {wrong ? (
          <p role="alert" className="text-base text-rose-light sm:col-span-2">
            {w.wrong}
          </p>
        ) : null}
      </form>
    </div>
  );
}

/* ---------- Signed in: his commissions, the security of his access ---------- */

function Dashboard({ me, legacy, onOut, onLeave }: { me: Me; legacy: VipSpace | null; onOut: () => void; onLeave: () => void }) {
  const { t } = useI18n();
  const w = t.privateAtelier.dashboard;
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "security" ? "security" : "projects";
  const notice = (useLocation().state as { notice?: string } | null)?.notice;
  const tabClass = (on: boolean) =>
    "inline-flex min-h-12 items-center gap-2 border-b px-1 text-sm font-medium whitespace-nowrap uppercase tracking-[0.1em] transition-colors sm:tracking-[0.2em] " + (on ? "border-rose-light text-white" : "border-transparent text-mist hover:text-white");

  return (
    <section className="wrap pt-36 pb-24 lg:pt-44" data-atelier-space>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{t.privateAtelier.eyebrow}</p>
          <h1 className="title-caps mt-4 t-hero tracking-[0.12em] break-words">{w.hello(me.name)}</h1>
          <p className="mt-4 max-w-2xl text-base text-bone">{w.intro}</p>
        </div>
        <button type="button" onClick={onLeave} data-signout className="btn-secondary shrink-0">
          <LogOut className="size-4" aria-hidden="true" /> {w.signout}
        </button>
      </div>

      {notice === "2fa-email" || notice === "2fa-app" ? (
        <p role="status" className="mt-8 flex items-start gap-3 border border-rose-light/30 px-5 py-4 text-base text-bone">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-rose-light" aria-hidden="true" />
          {notice === "2fa-email" ? w.notice2faEmail : w.notice2faApp}
        </p>
      ) : null}

      <nav className="mt-12 flex gap-6 border-b border-white/10 sm:gap-8" aria-label={t.privateAtelier.eyebrow}>
        <button type="button" onClick={() => setParams({}, { replace: true })} aria-current={tab === "projects" ? "page" : undefined} className={tabClass(tab === "projects")} data-tab="projects">
          {w.tabProjects}
        </button>
        <button type="button" onClick={() => setParams({ tab: "security" }, { replace: true })} aria-current={tab === "security" ? "page" : undefined} className={tabClass(tab === "security")} data-tab="security">
          {w.tabSecurity}
        </button>
      </nav>

      <div className="mt-12">
        {tab === "security" ? (
          <SecurityPanel onOut={onOut} />
        ) : (
          <>
            {me.projects.length === 0 ? (
              <p className="piece-text max-w-2xl" data-atelier-projects data-empty>
                {w.empty}
              </p>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2" data-atelier-projects>
                {me.projects.map((p) => (
                  <li key={p.id} className="border border-white/10 bg-ink">
                    <Link to={"/vip/project/" + p.id} data-project-link={p.id} className="group flex h-full min-h-44 flex-col justify-between gap-8 p-6 transition-colors hover:bg-ink-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-rose-light sm:p-8">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.22em] text-rose-light">
                          {p.step >= 0 ? (t.privateAtelier.making.steps[p.step] ?? "") : p.versions > 0 ? w.versions(p.versions) : w.noVersion}
                        </p>
                        <h2 className="title-caps t-sub mt-3 tracking-[0.1em] break-words text-white">{p.title}</h2>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-mist">
                          {p.unread > 0 ? (
                            <span className="inline-flex items-center gap-2 text-white" data-unread={p.unread}>
                              <span className="size-2 rounded-full bg-rose-light" aria-hidden="true" />
                              {w.unread(p.unread)}
                            </span>
                          ) : p.step >= 0 && p.versions > 0 ? (
                            w.versions(p.versions)
                          ) : null}
                        </span>
                        <span className="btn-secondary shrink-0 group-hover:text-rose-light">
                          {w.open} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {legacy && legacy.pieces.length > 0 ? (
              <>
                <h2 className="eyebrow mt-24">{w.yourPieces}</h2>
                <ul className="mt-6 grid gap-20">
                  {legacy.pieces.map((model) => (
                    <VipPiece key={model.id} model={model} />
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </div>

      <div className="mt-20 border-t border-white/10 pt-6">
        <WhatsAppLink message={t.privateAtelier.whatsappMessage}>{t.privateAtelier.whatsappHouse}</WhatsAppLink>
      </div>
    </section>
  );
}

/* ---------- The older space (a personal link or an access code) ---------- */

function LegacySpace({ space, onLeave }: { space: VipSpace; onLeave: () => void }) {
  const { t } = useI18n();
  const w = t.vip;
  return (
    <section className="wrap pt-36 pb-24  lg:pt-44" data-vip-space>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{w.eyebrow}</p>
          <h1 className="title-caps tracking-[0.12em] mt-4 t-hero break-words">{w.hello(space.name)}</h1>
          <p className="mt-4 text-base text-bone">{w.intro}</p>
        </div>
        <button type="button" onClick={onLeave} className="btn-secondary shrink-0" data-signout>
          <LogOut className="size-4" aria-hidden="true" /> {w.logout}
        </button>
      </div>
      {/* The follow-up of the commission: the steps and the estimated date beside the news (one under the other on a phone). */}
      <div className="mt-16 grid gap-16 lg:mt-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-24">
        <div className="lg:sticky lg:top-36 lg:self-start">
          <VipJourney space={space} />
        </div>
        <VipNews updates={space.updates} />
      </div>
      {space.pieces.length > 0 ? (
        <>
          <h2 className="eyebrow mt-24">{w.yourPieces}</h2>
          <ul className="mt-6 grid gap-20">
            {space.pieces.map((model) => (
              <VipPiece key={model.id} model={model} />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function VipPiece({ model }: { model: PublicModel }) {
  const { t, intl } = useI18n();
  const [selection, setSelection] = useState<Selection>([]);
  const metals = metalsInWords(selection, t.viewer, intl);
  // The messages end on the address of a link elsewhere; here there is none.
  const clean = (text: string) => text.replace(/[\s:]+$/, "");
  const button = "inline-flex min-h-14 items-center justify-center gap-3 px-7 text-base font-medium uppercase tracking-[0.12em] transition-colors";
  return (
    <li data-vip-piece={model.id}>
      <h3 className="title-caps t-lead tracking-[0.08em] break-words">{model.name}</h3>
      <Jewel3D
        model={model}
        words={t.viewer}
        onSelection={setSelection}
        className="mt-6"
        actions={
          <>
            <a href={waLink(clean(t.viewer.loveMessage(model.name, metals, "")))} target="_blank" rel="noreferrer" className={button + " w-full border border-rose-light/55 py-3 text-center text-white hover:border-rose-light hover:text-rose-light"}>
              <BrandIcon name="whatsapp" className="size-5 shrink-0" /> {t.viewer.love}
            </a>
            <a href={waLink(clean(t.viewer.changeMessage(model.name, metals, "")))} target="_blank" rel="noreferrer" className={button + " w-full border border-white/40 py-3 text-center text-white hover:border-rose-light hover:text-rose-light"}>
              <BrandIcon name="whatsapp" className="size-5 shrink-0" /> {t.viewer.change}
            </a>
          </>
        }
      />
    </li>
  );
}
