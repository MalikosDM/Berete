import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { LoaderCircle, LogOut } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { useI18n } from "@/i18n";
import { localizePath } from "@/i18n/locales";
import { metalsInWords, vipEnter, vipLeave, vipMe, type VipAnswer } from "@/lib/models";
import { waLink } from "@/lib/site";
import type { PublicModel } from "@/data/models";
import { Jewel3D, type Selection } from "@/viewer";

/**
 * The private space of a client (/vip): his pieces in 3D, given by the
 * jeweller from the admin. He enters with his personal link (/vip/<token>,
 * which opens the space and comes back here) or with his access code.
 */
export default function Vip() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [state, setState] = useState<VipAnswer | { state: "loading" } | { state: "lost" }>({ state: "loading" });
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

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
      const me = await vipMe();
      if (alive) setState(me);
    };
    void run();
    return () => {
      alive = false;
    };
  }, [token, locale, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setWrong(false);
    const entered = await vipEnter({ code });
    if (entered.state === "ok") setState(await vipMe());
    else setWrong(true);
    setBusy(false);
  };

  const leave = async () => {
    await vipLeave();
    setState({ state: "out" });
  };

  const w = t.vip;
  const button = "inline-flex min-h-14 items-center justify-center gap-3 px-7 text-base font-semibold uppercase tracking-[0.12em] transition-colors";

  if (state.state === "loading") {
    return (
      <section className="mx-auto max-w-3xl px-5 pt-40 pb-24 text-center sm:px-8">
        <p className="flex items-center justify-center gap-3 text-bone" role="status">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> {w.opening}
        </p>
      </section>
    );
  }

  if (state.state === "ok") {
    return (
      <section className="mx-auto max-w-[1400px] px-5 pt-36 pb-24 sm:px-8 lg:px-12 lg:pt-44" data-vip-space>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">{w.eyebrow}</p>
            <h1 className="title-caps mt-4 text-[clamp(2.25rem,5vw,4rem)] tracking-[0.1em] break-words">{w.hello(state.name)}</h1>
            <p className="mt-4 text-lg text-bone">{w.intro}</p>
          </div>
          <button type="button" onClick={() => void leave()} className={button + " border border-white/40 text-white hover:border-rose-light hover:text-rose-light"}>
            <LogOut className="size-4" aria-hidden="true" /> {w.logout}
          </button>
        </div>
        <h2 className="eyebrow mt-16">{w.yourPieces}</h2>
        {state.pieces.length === 0 ? (
          <p className="mt-6 border border-white/15 p-8 text-center text-lg text-bone">{w.none}</p>
        ) : (
          <ul className="mt-6 grid gap-20">
            {state.pieces.map((model) => (
              <VipPiece key={model.id} model={model} />
            ))}
          </ul>
        )}
      </section>
    );
  }

  // Not entered (or a personal link that no longer works): the code.
  return (
    <section className="mx-auto max-w-xl px-5 pt-40 pb-24 sm:px-8" data-vip-login>
      <p className="eyebrow">{w.eyebrow}</p>
      <h1 className="title-caps mt-4 text-[clamp(2.25rem,5vw,3.75rem)] tracking-[0.1em]">{w.title}</h1>
      <p className="mt-5 text-lg text-bone">{state.state === "lost" ? w.linkMissing : w.intro}</p>
      <form onSubmit={submit} className="mt-10 grid gap-5">
        <label className="block text-base text-bone">
          {w.code}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX-XXXX"
            className="mt-2 block min-h-14 w-full border border-white/30 bg-ink px-4 text-lg tracking-[0.2em] text-white placeholder:text-mist/50 focus:border-rose-light focus:outline-none"
          />
          <span className="mt-2 block text-base text-mist">{w.codeHint}</span>
        </label>
        {wrong ? <p role="alert" className="text-base text-rose-light">{w.wrong}</p> : null}
        <button type="submit" disabled={busy || code.replace(/[^0-9A-Z]/g, "").length < 8} className={button + " bg-white text-ink hover:bg-rose-light disabled:opacity-60"}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null} {w.enter}
        </button>
        <a href={waLink(w.askMessage)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 text-base text-mist hover:text-rose-light">
          <BrandIcon name="whatsapp" className="size-5" /> {w.askCode}
        </a>
      </form>
    </section>
  );
}

function VipPiece({ model }: { model: PublicModel }) {
  const { t, intl } = useI18n();
  const [selection, setSelection] = useState<Selection>([]);
  const metals = metalsInWords(selection, t.viewer, intl);
  // The messages end on the address of a link elsewhere; here there is none.
  const clean = (text: string) => text.replace(/[\s:]+$/, "");
  const button = "inline-flex min-h-14 items-center justify-center gap-3 px-7 text-base font-semibold uppercase tracking-[0.12em] transition-colors";
  return (
    <li data-vip-piece={model.id}>
      <h3 className="title-caps text-[clamp(1.75rem,3.5vw,2.75rem)] tracking-[0.08em] break-words">{model.name}</h3>
      <Jewel3D
        model={model}
        words={t.viewer}
        onSelection={setSelection}
        className="mt-6"
        actions={
          <>
            <a href={waLink(clean(t.viewer.loveMessage(model.name, metals, "")))} target="_blank" rel="noreferrer" className={button + " w-full bg-white py-3 text-center text-ink hover:bg-rose-light"}>
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
