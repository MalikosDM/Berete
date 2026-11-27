import { Component, Suspense, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router";
import { LoaderCircle } from "lucide-react";
import Logo from "@/components/Logo";
import type { PublicModel } from "@/data/models";
import { LocaleSync, useI18n } from "@/i18n";
import { lazyPart } from "@/lib/lazy";
import { openLink, type LinkAnswer } from "@/lib/models";
import { VIEWER_WORDS, viewerLang } from "@/viewer/words/viewer";

const JewelViewer = lazyPart(() => import("@/viewer/JewelViewer"));

/**
 * The embed code of a private 3D link (/embed/<token>, the same tokens as /view/<token>; 27/11/2026): the viewer alone,
 * as large as the frame another site gives it (<iframe>, the code is in the admin: « Intégrer »), without the menu nor
 * anything of the pages around it. Its language is that of its address (/fr/embed/…). Options in the address:
 * bg=transparent (the page of the other site shows behind the jewel), logo=0 (without the small logo of the house in a
 * corner), rotate=1 or 0 (turning by itself at first, or not; else the jeweller's choice). A link with a password asks for
 * it in the frame; an expired or deleted link says the view is no longer available. Never indexed (server/security.ts),
 * the only page of the site another site may frame.
 */

/** Whatever breaks inside the viewer stays inside the frame. */
class Guard extends Component<{ fallback: ReactNode; children: ReactNode }, { broken: boolean }> {
  override state = { broken: false };

  static getDerivedStateFromError() {
    return { broken: true };
  }

  override render() {
    return this.state.broken ? this.props.fallback : this.props.children;
  }
}

/** A query flag: "1"/"true" → true, "0"/"false" → false, absent or anything else → undefined. */
function flag(value: string | null): boolean | undefined {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return undefined;
}

export default function Embed3D() {
  const { token = "" } = useParams();
  const [query] = useSearchParams();
  const { t } = useI18n();
  const w = t.viewer;
  const more = VIEWER_WORDS[viewerLang(w)];
  const transparent = query.get("bg") === "transparent";
  const logo = flag(query.get("logo")) ?? true;
  const rotate = flag(query.get("rotate"));
  const [answer, setAnswer] = useState<LinkAnswer | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void openLink(token).then((a) => alive && setAnswer(a));
    return () => {
      alive = false;
    };
  }, [token]);

  // Transparent: the document itself lets the other site's page show through (and asks for no dark canvas of its own:
  // a frame whose colour scheme differs from its page's is painted opaque by the browser).
  useEffect(() => {
    if (!transparent) return undefined;
    const root = document.documentElement;
    const before = { root: root.style.background, body: document.body.style.background, scheme: root.style.colorScheme };
    root.style.background = "transparent";
    document.body.style.background = "transparent";
    root.style.colorScheme = "normal";
    return () => {
      root.style.background = before.root;
      document.body.style.background = before.body;
      root.style.colorScheme = before.scheme;
    };
  }, [transparent]);

  useEffect(() => {
    if (answer?.kind === "ok") document.title = answer.title + " · Berete Jewellers";
  }, [answer]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setAnswer(await openLink(token, password));
    setBusy(false);
  };

  const centred = "absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center";
  /** While the viewer's code arrives: the still image of the jewel, as the viewer itself shows it. */
  const waiting = (model: PublicModel | null) => (
    <div className="absolute inset-0" role="status">
      {model?.poster ? <img src={model.poster} alt="" className={(transparent ? "" : "mix-blend-lighten ") + "absolute left-1/2 top-1/2 max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 [mask-image:radial-gradient(closest-side,#000_75%,transparent_100%)] [-webkit-mask-image:radial-gradient(closest-side,#000_75%,transparent_100%)]"} /> : null}
      <span className={centred + (model?.poster ? " justify-end pb-6" : "")}>
        {model?.poster ? null : <Logo variant="mark" position="center" className="h-12 w-24 opacity-60" />}
        <span className="rounded-full bg-ink/55 px-3 py-1 text-base text-bone">{w.preparing}</span>
      </span>
    </div>
  );

  let body: ReactNode;
  if (!answer) body = waiting(null);
  else if (answer.kind === "ok") {
    body = (
      <Guard
        fallback={
          <p className={centred + " text-base text-bone"} role="alert">
            {w.failed}
          </p>
        }
      >
        <Suspense fallback={waiting(answer.model)}>
          <JewelViewer model={answer.model} words={w} bare transparent={transparent} logo={logo} autoRotate={rotate} />
        </Suspense>
      </Guard>
    );
  } else if (answer.kind === "password") {
    body = (
      <form onSubmit={submit} className={centred + " mx-auto max-w-sm"} data-embed-password>
        <Logo variant="mark" position="center" className="h-10 w-20 opacity-80" />
        <p className="text-base text-bone">{w.passwordText}</p>
        <label className="block w-full text-start text-base text-bone">
          {w.password}
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 block min-h-12 w-full border border-white/30 bg-ink px-4 text-base text-white focus:border-rose-light focus:outline-none" />
        </label>
        {answer.wrong ? (
          <p role="alert" className="text-base text-rose-light">
            {w.wrongPassword}
          </p>
        ) : null}
        <button type="submit" disabled={busy || !password} className="inline-flex min-h-12 items-center justify-center gap-3 border border-rose-light/55 px-7 text-base font-medium uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light disabled:opacity-60">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null} {w.open}
        </button>
      </form>
    );
  } else {
    body = (
      <div className={centred} data-embed-state={answer.kind}>
        <Logo variant="mark" position="center" className="h-10 w-20 opacity-80" />
        <p className="text-base text-bone">{answer.kind === "offline" ? w.failed : more.embedUnavailable}</p>
      </div>
    );
  }

  return (
    <main data-embed-3d className={"fixed inset-0 overflow-hidden " + (transparent ? "bg-transparent" : "bg-ink")}>
      <LocaleSync />
      {body}
    </main>
  );
}
