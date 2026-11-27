/*
 * An authenticator app for the second step: the server gives a new secret and its otpauth:// address, drawn here as a QR code
 * (the qrcode package, an SVG made in the page: the secret never leaves for another site), the key in clear for typing it by
 * hand (data-totp-secret), then the first code of the app confirms it (input name="totp").
 */
import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { useI18n } from "@/i18n";
import { totpConfirm, totpStart } from "@/lib/atelier";
import { Field, Msg, Spinner } from "./ui";

export function TotpSetup({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const w = t.privateAtelier.security;
  const [start, setStart] = useState<{ secret: string; svg: string } | "error" | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const a = await totpStart();
      if (!alive) return;
      if (a.state !== "ok") return setStart("error");
      const svg = await QRCode.toString(a.uri, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0a0a0aff", light: "#ffffffff" } });
      if (alive) setStart({ secret: a.secret, svg });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setWrong("");
    const a = await totpConfirm(code);
    setBusy(false);
    if (a.state === "ok") return onDone();
    setCode("");
    setWrong(a.state === "wrong" ? w.appWrong : t.privateAtelier.error);
  };

  if (start === null) {
    return (
      <p className="flex items-center gap-3 text-base text-bone" role="status">
        <Spinner /> {t.privateAtelier.opening}
      </p>
    );
  }
  if (start === "error") return <Msg tone="error">{t.privateAtelier.error}</Msg>;

  return (
    <form onSubmit={submit} className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-8" data-totp-setup>
      <div className="mx-auto w-48 bg-white p-3 sm:mx-0" role="img" aria-label={w.qrAlt} data-totp-qr dangerouslySetInnerHTML={{ __html: start.svg }} />
      <div className="grid gap-5">
        <p className="text-base text-bone">{w.appIntro}</p>
        <div>
          <p className="text-sm text-mist">{w.appKey}</p>
          <p className="mt-2 font-mono text-base break-all tracking-[0.18em] text-white select-all" data-totp-secret>
            {start.secret}
          </p>
        </div>
        <Field
          label={w.appCode}
          name="totp"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="text-center text-xl tracking-[0.5em] tabular-nums"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={busy || code.length !== 6} className="btn-primary disabled:opacity-60" data-totp-confirm>
            {busy ? <Spinner /> : null} {w.appConfirm}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary justify-center">
            {w.appCancel}
          </button>
        </div>
        {wrong ? <Msg tone="error">{wrong}</Msg> : null}
      </div>
    </form>
  );
}
