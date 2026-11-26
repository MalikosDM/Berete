import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import Logo from "@/components/Logo";
import { DEFAULT_SETTINGS, type PublicModel } from "@/data/models";
import { bundleOf, loadLocale, LOCALE_INFO, useBundleVersion } from "@/i18n";
import { canSeal, checkVerifier, fragmentKey, passwordKey, unpack, unseal } from "@/lib/sealed";
import { waLink } from "@/lib/site";
import { Jewel3D } from "@/viewer";
import { SHARE_WORDS, shareLang } from "@/viewer/words/share";

/**
 * A share link sealed on the admin's device (/s/<token>, server/routes/shares.ts, src/lib/sealed.ts): the logo, the
 * password when the link has one, the download of the encrypted model with a bar, its decryption in this browser, then the
 * piece in 3D. The server never sees the password nor the key (the key of a link without password is in its #fragment).
 * The page speaks the language of the browser (src/viewer/words/share.ts); never indexed.
 */

type Meta = { hasPassword: boolean; salt: string; iv: string; iterations: number; verifier: string; bytes: number; expiresAt: string };

type Phase =
  | { kind: "loading" }
  | { kind: "unsupported" | "missing" | "expired" | "busy" | "key" | "failed" }
  | { kind: "password"; wrong: boolean; checking: boolean }
  | { kind: "downloading"; percent: number }
  | { kind: "decrypting" }
  | { kind: "ok"; model: PublicModel };

/** The answer of the server, as a phase when it is not a success. */
function phaseOf(status: number): Phase["kind"] {
  if (status === 404) return "missing";
  if (status === 410) return "expired";
  if (status === 429) return "busy";
  return "failed";
}

export default function SealedView() {
  const { token = "" } = useParams();
  const [lang] = useState(shareLang);
  const w = SHARE_WORDS[lang];
  const info = LOCALE_INFO[lang];
  // The words of the viewer itself (metals, buttons) in the same language, once loaded.
  useBundleVersion();
  useEffect(() => {
    void loadLocale(lang).catch(() => undefined);
    // The page stands alone (outside the Layout of the site): the document takes its language, for the Arabic fonts and the direction.
    const root = document.documentElement;
    const before = { lang: root.lang, dir: root.dir };
    root.lang = lang;
    root.dir = LOCALE_INFO[lang].dir;
    return () => {
      root.lang = before.lang;
      root.dir = before.dir;
    };
  }, [lang]);
  const viewerWords = bundleOf(lang).ui.viewer;

  // WebCrypto exists only on HTTPS pages (and localhost): without it, nothing can be opened.
  const [phase, setPhase] = useState<Phase>(() => (canSeal() ? { kind: "loading" } : { kind: "unsupported" }));
  const [meta, setMeta] = useState<Meta | null>(null);
  const [password, setPassword] = useState("");
  const key = useRef<CryptoKey | null>(null);
  const urls = useRef<string[]>([]);
  const abort = useRef<AbortController | null>(null);

  // The addresses of the decrypted files are freed with the page.
  useEffect(
    () => () => {
      abort.current?.abort();
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current = [];
    },
    [],
  );

  /** Downloads the ciphertext (with its percentage), decrypts it here, and shows the piece. */
  const open = useCallback(
    async (m: Meta, k: CryptoKey) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setPhase({ kind: "downloading", percent: 0 });
      try {
        const res = await fetch("/api/s/" + encodeURIComponent(token) + "/blob", { signal: controller.signal, cache: "no-store" });
        if (!res.ok || !res.body) {
          setPhase({ kind: phaseOf(res.status) } as Phase);
          return;
        }
        const data = new Uint8Array(m.bytes);
        const reader = res.body.getReader();
        let received = 0;
        let shown = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (received + value.length > data.length) throw new Error("Longer than announced");
          data.set(value, received);
          received += value.length;
          const percent = Math.floor((100 * received) / data.length);
          if (percent !== shown) {
            shown = percent;
            setPhase({ kind: "downloading", percent });
          }
        }
        if (received !== data.length) throw new Error("Incomplete download");
        setPhase({ kind: "decrypting" });
        const pkg = unpack(await unseal(k, m.iv, data));
        const full = URL.createObjectURL(new Blob([pkg.full], { type: "model/gltf-binary" }));
        const light = URL.createObjectURL(new Blob([pkg.light], { type: "model/gltf-binary" }));
        urls.current.forEach((u) => URL.revokeObjectURL(u));
        urls.current = [full, light];
        setPhase({
          kind: "ok",
          model: {
            id: "sealed-" + token.slice(0, 8),
            name: pkg.name,
            files: { full, light },
            bytes: { full: pkg.full.byteLength, light: pkg.light.byteLength },
            poster: null,
            size: pkg.size,
            settings: { ...DEFAULT_SETTINGS, ...pkg.settings },
          },
        });
      } catch {
        if (!controller.signal.aborted) setPhase({ kind: "failed" });
      }
    },
    [token],
  );

  // What the page needs to decrypt; the key of a link without password, from its #fragment.
  useEffect(() => {
    if (!canSeal()) return undefined;
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/s/" + encodeURIComponent(token), { headers: { Accept: "application/json" }, cache: "no-store" });
        if (!alive) return;
        if (!res.ok) {
          setPhase({ kind: phaseOf(res.status) } as Phase);
          return;
        }
        const m = (await res.json()) as Meta;
        if (!alive) return;
        setMeta(m);
        if (m.hasPassword) {
          setPhase({ kind: "password", wrong: false, checking: false });
          return;
        }
        const k = await fragmentKey(window.location.hash);
        if (!alive) return;
        if (!k || !(await checkVerifier(k, m.verifier))) {
          setPhase({ kind: "key" });
          return;
        }
        key.current = k;
        if (alive) void open(m, k);
      } catch {
        if (alive) setPhase({ kind: "failed" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!meta || !password) return;
    setPhase({ kind: "password", wrong: false, checking: true });
    try {
      const k = await passwordKey(password, meta.salt, meta.iterations);
      if (!(await checkVerifier(k, meta.verifier))) {
        setPhase({ kind: "password", wrong: true, checking: false });
        return;
      }
      key.current = k;
      setPassword("");
      void open(meta, k);
    } catch {
      setPhase({ kind: "password", wrong: true, checking: false });
    }
  };

  const retry = () => {
    if (meta && key.current) void open(meta, key.current);
    else window.location.reload();
  };

  const date = meta ? new Date(meta.expiresAt).toLocaleDateString(info.intl, { day: "numeric", month: "long", year: "numeric" }) : "";
  let body;
  if (phase.kind === "ok") {
    body = (
      <>
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">{w.eyebrow}</p>
          <h1 className="title-caps t-hero mt-4 break-words tracking-[0.12em]" data-share-title>
            {phase.model.name}
          </h1>
        </div>
        <Jewel3D model={phase.model} words={viewerWords} eager className="mt-10" />
        <p className="mt-6 text-center text-base text-mist">
          {w.validUntil(date)} · {w.sealedNote}
        </p>
      </>
    );
  } else if (phase.kind === "password") {
    body = (
      <form onSubmit={submit} className="mx-auto grid max-w-md gap-5 py-16 text-center" data-share-password>
        <LockKeyhole className="mx-auto size-6 text-rose-light" aria-hidden="true" />
        <h1 className="title-caps t-hero tracking-[0.12em]">{w.passwordTitle}</h1>
        <p className="text-base text-bone">{w.passwordText}</p>
        <label className="block text-start text-base text-bone">
          {w.password}
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={phase.wrong || undefined}
            className="mt-2 block min-h-12 w-full border border-white/30 bg-ink px-4 text-base text-white focus:border-rose-light focus:outline-none"
          />
        </label>
        {phase.wrong ? (
          <p role="alert" className="text-base text-rose-light" data-share-wrong>
            {w.wrongPassword}
          </p>
        ) : null}
        <button type="submit" disabled={phase.checking || !password} className="btn-primary disabled:opacity-60">
          {phase.checking ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null} {phase.checking ? w.checking : w.open}
        </button>
        <p className="text-base text-mist">{w.sealedNote}</p>
      </form>
    );
  } else if (phase.kind === "loading" || phase.kind === "downloading" || phase.kind === "decrypting") {
    const percent = phase.kind === "downloading" ? phase.percent : phase.kind === "decrypting" ? 100 : 0;
    const label = phase.kind === "downloading" ? w.downloading : phase.kind === "decrypting" ? w.decrypting : w.loading;
    body = (
      <div className="mx-auto grid max-w-md gap-5 py-24 text-center" role="status" data-share-progress={phase.kind}>
        <p className="flex items-center justify-center gap-3 text-base text-bone">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> {label}
          {phase.kind === "downloading" ? <span className="tabular-nums text-white"> {percent} %</span> : null}
        </p>
        {phase.kind === "loading" ? null : (
          <div className="h-px w-full bg-white/20" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div className="h-px bg-rose-light transition-[width] duration-200" style={{ width: percent + "%" }} />
          </div>
        )}
        <p className="text-base text-mist">{w.sealedNote}</p>
      </div>
    );
  } else {
    const texts: Record<typeof phase.kind, [string, string]> = {
      unsupported: [w.unsupportedTitle, w.unsupportedText],
      missing: [w.missingTitle, w.missingText],
      expired: [w.expiredTitle, w.expiredText],
      busy: [w.failedTitle, w.busyText],
      key: [w.keyTitle, w.keyText],
      failed: [w.failedTitle, w.failedText],
    };
    const [title, text] = texts[phase.kind];
    const canRetry = phase.kind === "failed" || phase.kind === "busy";
    body = (
      <div className="mx-auto grid max-w-xl gap-5 py-16 text-center" data-share-state={phase.kind}>
        <h1 className="title-caps t-hero tracking-[0.12em]">{title}</h1>
        <p className="text-base text-bone">{text}</p>
        <div className="flex flex-wrap justify-center gap-4">
          {canRetry ? (
            <button type="button" onClick={retry} className="btn-primary">
              {w.retry}
            </button>
          ) : null}
          <a href={waLink(w.askMessage)} target="_blank" rel="noreferrer" className="btn-primary">
            <BrandIcon name="whatsapp" className="size-5" /> {w.askLink}
          </a>
        </div>
      </div>
    );
  }

  return (
    <main lang={lang} dir={info.dir} className="min-h-svh bg-ink px-5 pt-8 pb-16 sm:px-8 lg:px-12" data-sealed-share>
      <header className="flex justify-center">
        <Logo variant="full" position="center" className="h-12 w-48 sm:h-14 sm:w-56" />
      </header>
      <div className="mx-auto mt-10 max-w-[1400px]">{body}</div>
    </main>
  );
}
