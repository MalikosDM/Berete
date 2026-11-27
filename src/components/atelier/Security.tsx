/*
 * The security of his access, in his space (/vip?tab=security, data-atelier-security): the second step at sign-in (off, a
 * code by e-mail, an authenticator app), his password, the devices where he is signed in (each can be signed out), his recent
 * sign-ins, and signing out.
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, LogOut } from "lucide-react";
import { useI18n } from "@/i18n";
import { changePassword, deviceOf, moment, revokeSession, security, setTwoFactor, type Security, type TwoFactor } from "@/lib/atelier";
import { TotpSetup } from "./TotpSetup";
import { Field, Msg, Spinner } from "./ui";

export function SecurityPanel({ onOut }: { onOut: () => void }) {
  const { t, intl } = useI18n();
  const w = t.privateAtelier.security;
  const [data, setData] = useState<Security | "error" | null>(null);
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState<string>("");
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const a = await security();
    if (a.state === "out") return onOut();
    setData(a.state === "ok" ? a : "error");
  }, [onOut]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const a = await security();
      if (!alive) return;
      if (a.state === "out") return onOut();
      setData(a.state === "ok" ? a : "error");
    })();
    return () => {
      alive = false;
    };
  }, [onOut]);

  const choose = async (mode: TwoFactor) => {
    setNote(null);
    if (mode === "totp") {
      setSetup(true);
      return;
    }
    setSetup(false);
    setBusy("2fa-" + mode);
    const a = await setTwoFactor(mode);
    setBusy("");
    if (a.state === "out") return onOut();
    if (a.state !== "ok") return setNote({ tone: "error", text: t.privateAtelier.error });
    setNote({ tone: "ok", text: mode === "email" ? w.emailNote : w.offNote });
    await load();
  };

  const revoke = async (id: string, current: boolean) => {
    setBusy("session-" + id);
    await revokeSession(id);
    setBusy("");
    if (current) return onOut();
    await load();
  };

  if (data === null) {
    return (
      <p className="flex items-center gap-3 text-bone" role="status" data-atelier-security>
        <Spinner /> {t.privateAtelier.opening}
      </p>
    );
  }
  if (data === "error") {
    return (
      <div data-atelier-security>
        <Msg tone="error">{t.privateAtelier.error}</Msg>
      </div>
    );
  }

  const modes: TwoFactor[] = ["off", "email", "totp"];
  const noteOf: Record<TwoFactor, string> = { off: w.offNote, email: w.emailNote, totp: w.totpNote };

  return (
    <div className="grid gap-16" data-atelier-security data-current-2fa={data.twoFactor}>
      <p className="max-w-2xl text-base text-bone">{w.intro}</p>

      {/* The second step */}
      <section aria-labelledby="sec-2fa">
        <h2 id="sec-2fa" className="eyebrow">
          {w.twoFactor}
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3" role="group" aria-label={w.twoFactor}>
          {modes.map((mode) => {
            const on = data.twoFactor === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => void choose(mode)}
                aria-pressed={on}
                disabled={busy !== ""}
                data-2fa-mode={mode}
                className={
                  "flex min-h-14 items-center justify-between gap-3 border px-5 text-start text-base transition-colors disabled:opacity-60 " +
                  (on ? "border-rose-light text-white" : "border-white/20 text-bone hover:border-rose-light/60 hover:text-white")
                }
              >
                <span>{w.modes[mode]}</span>
                {busy === "2fa-" + mode ? <Spinner /> : on ? <Check className="size-4 text-rose-light" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-mist">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-rose-light">{w.current}</span>
          <span className="mx-2 opacity-60" aria-hidden="true">
            ·
          </span>
          <span className="text-white">{w.modes[data.twoFactor]}</span>
          <span className="mx-2 opacity-60" aria-hidden="true">
            —
          </span>
          {noteOf[data.twoFactor]}
        </p>
        {setup ? (
          <div className="mt-8 border-t border-white/10 pt-8">
            <TotpSetup
              onDone={() => {
                setSetup(false);
                setNote({ tone: "ok", text: w.totpNote });
                void load();
              }}
              onCancel={() => setSetup(false)}
            />
          </div>
        ) : null}
        {note ? <Msg tone={note.tone} className="mt-5">{note.text}</Msg> : null}
      </section>

      <PasswordForm onOut={onOut} />

      {/* The devices */}
      <section aria-labelledby="sec-sessions">
        <h2 id="sec-sessions" className="eyebrow">
          {w.sessions}
        </h2>
        <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
          {data.sessions.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between" data-session={s.id} data-current={s.current ? "true" : undefined}>
              <div className="min-w-0">
                <p className="text-base text-white">
                  {deviceOf(s.userAgent) || w.unknownDevice}
                  {s.current ? <span className="ms-3 text-xs font-medium uppercase tracking-[0.2em] text-rose-light">{w.thisDevice}</span> : null}
                </p>
                <p className="mt-1 text-sm text-mist">
                  {w.since(moment(s.createdAt, intl))} · {w.lastSeen(moment(s.lastSeenAt, intl))}
                  {s.ip ? " · " + s.ip : ""}
                </p>
              </div>
              <button type="button" onClick={() => void revoke(s.id, s.current)} disabled={busy !== ""} data-session-revoke className="btn-secondary shrink-0 disabled:opacity-60">
                {busy === "session-" + s.id ? <Spinner /> : <LogOut className="size-4" aria-hidden="true" />} {w.revoke}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* The recent sign-ins */}
      <section aria-labelledby="sec-logins">
        <h2 id="sec-logins" className="eyebrow">
          {w.logins}
        </h2>
        <ul className="mt-6 grid gap-3" data-logins>
          {data.logins.map((l, i) => (
            <li key={i} className="flex flex-col gap-1 border-b border-white/10 pb-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6" data-login={l.event}>
              <span className={"text-base " + (/failed|cut|paused/.test(l.event) ? "text-rose-light" : "text-white")}>{w.events[l.event] ?? l.event}</span>
              <span className="text-sm text-mist">
                {moment(l.at, intl)}
                {deviceOf(l.userAgent) ? " · " + deviceOf(l.userAgent) : ""}
                {l.ip ? " · " + l.ip : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PasswordForm({ onOut }: { onOut: () => void }) {
  const { t } = useI18n();
  const w = t.privateAtelier.security;
  const iw = t.privateAtelier.invite;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const mismatch = confirm.length > 0 && next !== confirm;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return setNote({ tone: "error", text: iw.mismatch });
    setBusy(true);
    setNote(null);
    const a = await changePassword(current, next);
    setBusy(false);
    if (a.state === "out") return onOut();
    if (a.state === "ok") {
      setCurrent("");
      setNext("");
      setConfirm("");
      return setNote({ tone: "ok", text: w.passwordChanged });
    }
    if (a.state === "wrong") return setNote({ tone: "error", text: w.passwordWrong });
    if (a.state === "weak") return setNote({ tone: "error", text: iw.weak[a.reason] ?? iw.weak.simple });
    setNote({ tone: "error", text: t.privateAtelier.error });
  };

  return (
    <section aria-labelledby="sec-password">
      <h2 id="sec-password" className="eyebrow">
        {w.password}
      </h2>
      <form onSubmit={submit} className="mt-6 grid max-w-xl gap-5" data-password-change>
        <Field label={w.currentPassword} name="current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Field label={w.newPassword} name="next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} hint={iw.ruleLength + " · " + iw.ruleKinds} />
        <Field label={w.confirmPassword} name="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={mismatch || undefined} />
        {mismatch ? <p className="text-sm text-rose-light">{iw.mismatch}</p> : null}
        <button type="submit" disabled={busy || !current || !next || !confirm} className="btn-primary w-full sm:w-auto sm:justify-self-start disabled:opacity-60">
          {busy ? <Spinner /> : null} {w.changePassword}
        </button>
        {note ? <Msg tone={note.tone}>{note.text}</Msg> : null}
      </form>
    </section>
  );
}
