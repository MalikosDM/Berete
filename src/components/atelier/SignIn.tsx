/*
 * Signing in to The Private Atelier: the e-mail and the password (data-atelier-signin), a sign-in link by e-mail
 * (data-atelier-magic), then, when the client chose one, the second step: the 6-digit code sent by e-mail or shown by his
 * authenticator app (data-atelier-code). Every answer of the server is said in one line (data-atelier-msg).
 */
import { useState, type FormEvent } from "react";
import { useI18n } from "@/i18n";
import { sendMagic, signin, signinCode, type CodeAsked } from "@/lib/atelier";
import { Field, Msg, Spinner } from "./ui";

type Note = { tone: "info" | "error" | "ok"; text: string } | null;

export function SignInPanel({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useI18n();
  const w = t.privateAtelier.signin;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"" | "signin" | "magic">("");
  const [note, setNote] = useState<Note>(null);
  const [asked, setAsked] = useState<CodeAsked | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("signin");
    setNote(null);
    const a = await signin(email.trim(), password);
    setBusy("");
    if (a.state === "ok") return onSignedIn();
    if (a.state === "code") {
      setPassword("");
      setAsked(a);
      return;
    }
    if (a.state === "wrong") setNote({ tone: "error", text: w.wrong });
    else if (a.state === "wait") setNote({ tone: "error", text: w.wait });
    else if (a.state === "paused") setNote({ tone: "error", text: w.paused });
    else setNote({ tone: "error", text: t.privateAtelier.error });
  };

  const magic = async () => {
    if (!email.trim()) {
      setNote({ tone: "error", text: w.magicNeedsEmail });
      document.querySelector<HTMLInputElement>('[data-atelier-signin] input[name="email"]')?.focus();
      return;
    }
    setBusy("magic");
    setNote(null);
    const a = await sendMagic(email.trim());
    setBusy("");
    if (a.state === "sent") setNote({ tone: "ok", text: w.magicSent });
    else if (a.state === "wait") setNote({ tone: "error", text: w.wait });
    else setNote({ tone: "error", text: t.privateAtelier.error });
  };

  if (asked) {
    return (
      <CodeStep
        asked={asked}
        onDone={onSignedIn}
        onBack={(text) => {
          setAsked(null);
          setNote(text ? { tone: "error", text } : null);
        }}
      />
    );
  }

  return (
    <div>
      <form onSubmit={submit} className="grid gap-5" data-atelier-signin noValidate>
        <Field label={w.email} name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field label={w.password} name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" disabled={busy !== "" || !email.trim() || !password} className="btn-primary mt-1 w-full disabled:opacity-60">
          {busy === "signin" ? <Spinner /> : null} {w.submit}
        </button>
      </form>
      <button type="button" onClick={() => void magic()} disabled={busy !== ""} data-atelier-magic className="btn-secondary mt-3 w-full justify-center text-center disabled:opacity-60">
        {busy === "magic" ? <Spinner /> : null} {w.magic}
      </button>
      <div className="mt-4 min-h-6" aria-live="polite">
        {note ? <Msg tone={note.tone}>{note.text}</Msg> : null}
      </div>
    </div>
  );
}

/** The second step: 6 digits, by e-mail or from the app. */
export function CodeStep({ asked, onDone, onBack }: { asked: CodeAsked; onDone: () => void; onBack: (message?: string) => void }) {
  const { t } = useI18n();
  const w = t.privateAtelier.code;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    const a = await signinCode(asked.challenge, code);
    setBusy(false);
    if (a.state === "ok") return onDone();
    if (a.state === "expired") return onBack(w.expired);
    setCode("");
    if (a.state === "wrong") setNote({ tone: "error", text: w.wrong });
    else if (a.state === "wait") setNote({ tone: "error", text: t.privateAtelier.signin.wait });
    else setNote({ tone: "error", text: t.privateAtelier.error });
  };

  return (
    <form onSubmit={submit} className="grid gap-5" data-atelier-code data-via={asked.via}>
      <div>
        <h2 className="title-caps t-sub tracking-[0.12em] text-white">{w.title}</h2>
        <p className="mt-3 text-base text-bone">{asked.via === "totp" ? w.totp : w.email}</p>
      </div>
      <Field
        label={w.label}
        name="code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        autoFocus
        className="text-center text-xl tracking-[0.5em] tabular-nums"
      />
      <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full disabled:opacity-60">
        {busy ? <Spinner /> : null} {w.submit}
      </button>
      <button type="button" onClick={() => onBack()} className="btn-secondary justify-center">
        {w.back}
      </button>
      <div className="min-h-6" aria-live="polite">
        {note ? <Msg tone={note.tone}>{note.text}</Msg> : null}
      </div>
    </form>
  );
}
