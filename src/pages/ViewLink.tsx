import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router";
import { LoaderCircle } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import Logo from "@/components/Logo";
import { Link, useI18n } from "@/i18n";
import { metalsInWords, openLink, type LinkAnswer } from "@/lib/models";
import { waLink } from "@/lib/site";
import { Jewel3D, type Selection } from "@/viewer";

/**
 * A private link sent by the jeweller to a client (/view/<token>), instead of
 * a link to another viewer: the logo, the piece in 3D, and two WhatsApp
 * answers. Never indexed; may expire and ask for a password.
 */
export default function ViewLink() {
  const { token = "" } = useParams();
  const { t, intl } = useI18n();
  const [answer, setAnswer] = useState<LinkAnswer | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState<Selection>([]);

  useEffect(() => {
    let alive = true;
    void openLink(token).then((a) => alive && setAnswer(a));
    return () => {
      alive = false;
    };
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setAnswer(await openLink(token, password));
    setBusy(false);
  };

  const w = t.viewer;
  const button = "inline-flex min-h-14 items-center justify-center gap-3 px-7 text-base font-semibold uppercase tracking-[0.12em] transition-colors";
  let body;
  if (!answer) {
    body = (
      <p className="flex items-center justify-center gap-3 py-24 text-bone" role="status">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> {w.preparing}
      </p>
    );
  } else if (answer.kind === "ok") {
    const metals = metalsInWords(selection, w, intl);
    const link = typeof window === "undefined" ? "" : window.location.href;
    body = (
      <>
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">{w.privateEyebrow}</p>
          <h1 className="title-caps mt-4 text-[clamp(2rem,5vw,3.75rem)] tracking-[0.1em] break-words" data-link-title>{answer.title}</h1>
          <p className="mt-4 text-lg text-bone">{w.privateText}</p>
        </div>
        <Jewel3D
          model={answer.model}
          words={w}
          onSelection={setSelection}
          eager
          className="mt-10"
          actions={
            <>
              <a href={waLink(w.loveMessage(answer.title, metals, link))} target="_blank" rel="noreferrer" data-love className={button + " w-full bg-white py-3 text-center text-ink hover:bg-rose-light"}>
                <BrandIcon name="whatsapp" className="size-5 shrink-0" /> {w.love}
              </a>
              <a href={waLink(w.changeMessage(answer.title, metals, link))} target="_blank" rel="noreferrer" data-change className={button + " w-full border border-white/40 py-3 text-center text-white hover:border-rose-light hover:text-rose-light"}>
                <BrandIcon name="whatsapp" className="size-5 shrink-0" /> {w.change}
              </a>
            </>
          }
        />
        {answer.expiresAt ? <p className="mt-6 text-center text-base text-mist">{w.validUntil(new Date(answer.expiresAt).toLocaleDateString(intl, { day: "numeric", month: "long", year: "numeric" }))}</p> : null}
      </>
    );
  } else if (answer.kind === "password") {
    body = (
      <form onSubmit={submit} className="mx-auto grid max-w-md gap-5 py-16 text-center" data-link-password>
        <h1 className="title-caps text-[clamp(1.75rem,4vw,2.75rem)] tracking-[0.1em]">{w.passwordTitle}</h1>
        <p className="text-lg text-bone">{w.passwordText}</p>
        <label className="block text-start text-base text-bone">
          {w.password}
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 block min-h-12 w-full border border-white/30 bg-ink px-4 text-base text-white focus:border-rose-light focus:outline-none" />
        </label>
        {answer.wrong ? <p role="alert" className="text-base text-rose-light">{w.wrongPassword}</p> : null}
        <button type="submit" disabled={busy || !password} className={button + " bg-white text-ink hover:bg-rose-light disabled:opacity-60"}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null} {w.open}
        </button>
      </form>
    );
  } else {
    const expired = answer.kind === "expired";
    body = (
      <div className="mx-auto grid max-w-xl gap-5 py-16 text-center" data-link-state={answer.kind}>
        <h1 className="title-caps text-[clamp(1.75rem,4vw,2.75rem)] tracking-[0.1em]">{expired ? w.expiredTitle : w.missingTitle}</h1>
        <p className="text-lg text-bone">{expired ? w.expiredText : w.missingText}</p>
        <a href={waLink(w.askMessage)} target="_blank" rel="noreferrer" className={button + " mx-auto bg-white text-ink hover:bg-rose-light"}>
          <BrandIcon name="whatsapp" className="size-5" /> {w.askLink}
        </a>
      </div>
    );
  }

  return (
    <main className="min-h-svh bg-ink px-5 pt-8 pb-16 sm:px-8 lg:px-12">
      <header className="flex justify-center">
        <Link to="/" aria-label={t.site.homeLabel} className="inline-flex min-h-12 items-center">
          <Logo variant="full" position="center" className="h-12 w-48 sm:h-14 sm:w-56" />
        </Link>
      </header>
      <div className="mx-auto mt-10 max-w-[1400px]">{body}</div>
    </main>
  );
}
