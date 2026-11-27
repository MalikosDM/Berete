/*
 * The personal invitation of a client to The Private Atelier (/vip/invite/<token>, sent by Berete from the admin): the
 * invitation checked, then his password created (12 characters at least, two kinds of characters: the rules of the server,
 * server/atelier/crypto.ts weakPassword, shown as he types), then the offer of a second step at sign-in (a code by e-mail,
 * an authenticator app, or not now) before his space (/vip). An invitation expired, used or unknown says so calmly, with
 * WhatsApp of the house.
 */
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { Check, Mail, Smartphone } from "lucide-react";
import { TotpSetup } from "@/components/atelier/TotpSetup";
import { Field, Msg, Spinner, Waiting, WhatsAppLink } from "@/components/atelier/ui";
import { Link, useI18n } from "@/i18n";
import { inviteAccept, inviteCheck, setTwoFactor } from "@/lib/atelier";

type Stage = { s: "checking" } | { s: "form"; name: string; email: string } | { s: "offer" } | { s: "app" } | { s: "closed"; why: "expired" | "used" | "missing" | "wait" } | { s: "error" };

/** The two rules of the server a client can see as he types (the third, "common", is said when the server refuses). */
export function passwordRules(password: string): { length: boolean; kinds: boolean } {
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  return { length: password.length >= 12, kinds: kinds >= 2 && new Set(password).size >= 6 };
}

export default function ClientInvite() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { t, path } = useI18n();
  const w = t.privateAtelier.invite;
  const [stage, setStage] = useState<Stage>({ s: "checking" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const a = await inviteCheck(token);
      if (!alive) return;
      if (a.state === "ok") setStage({ s: "form", name: a.name, email: a.email });
      else if (a.state === "expired" || a.state === "used" || a.state === "missing" || a.state === "wait") setStage({ s: "closed", why: a.state });
      else setStage({ s: "error" });
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  // A new step of the invitation starts at the top of the page (on a phone the button pressed was far below).
  useEffect(() => {
    if (stage.s === "offer" || stage.s === "app" || stage.s === "closed") window.scrollTo({ top: 0 });
  }, [stage.s]);

  const rules = passwordRules(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setNote(w.mismatch);
    setBusy("create");
    setNote("");
    const a = await inviteAccept(token, password);
    setBusy("");
    if (a.state === "ok") {
      setPassword("");
      setConfirm("");
      return setStage({ s: "offer" });
    }
    if (a.state === "weak") return setNote(w.weak[a.reason] ?? w.weak.simple);
    if (a.state === "expired" || a.state === "used" || a.state === "missing" || a.state === "wait") return setStage({ s: "closed", why: a.state });
    setNote(t.privateAtelier.error);
  };

  const toSpace = (notice?: string) => navigate(path("/vip"), { replace: true, state: notice ? { notice } : undefined });

  const chooseEmail = async () => {
    setBusy("email");
    const a = await setTwoFactor("email");
    setBusy("");
    if (a.state === "ok") return toSpace("2fa-email");
    setNote(t.privateAtelier.error);
  };

  if (stage.s === "checking") return <Waiting>{w.checking}</Waiting>;

  return (
    <section className="mx-auto max-w-xl px-5 pt-36 pb-24 sm:px-8 lg:pt-44" data-atelier-invite-page>
      <p className="eyebrow">{t.privateAtelier.eyebrow}</p>

      {stage.s === "closed" || stage.s === "error" ? (
        <div data-invite-state={stage.s === "error" ? "error" : stage.why}>
          <h1 className="title-caps mt-4 t-hero tracking-[0.12em]">{t.privateAtelier.signin.title}</h1>
          <p className="piece-text mt-6">{stage.s === "error" ? t.privateAtelier.error : w[stage.why]}</p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            {stage.s === "closed" && stage.why === "used" ? (
              <Link to="/vip" className="btn-primary">
                {w.signin}
              </Link>
            ) : null}
            <WhatsAppLink message={w.contactMessage} className={stage.s === "closed" && stage.why === "used" ? "btn-secondary" : "btn-primary"} data-invite-contact>
              {w.contact}
            </WhatsAppLink>
          </div>
        </div>
      ) : null}

      {stage.s === "form" ? (
        <>
          <h1 className="title-caps mt-4 t-hero tracking-[0.12em] break-words">{w.hello(stage.name)}</h1>
          <p className="mt-5 text-base text-bone">{w.intro}</p>
          <p className="mt-2 text-base break-all text-white" data-invite-email>
            {stage.email}
          </p>
          <form onSubmit={submit} className="mt-10 grid gap-5" data-atelier-invite>
            {/* The e-mail, for the password managers that keep the pair. */}
            <input type="email" name="username" autoComplete="username" value={stage.email} readOnly hidden />
            <Field label={w.password} name="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="invite-rules" />
            <ul id="invite-rules" className="grid gap-2 text-sm" aria-label={w.rules} data-invite-rules>
              {[
                { ok: rules.length, text: w.ruleLength, key: "length" },
                { ok: rules.kinds, text: w.ruleKinds, key: "kinds" },
              ].map((r) => (
                <li key={r.key} className={"flex items-start gap-2 " + (r.ok ? "text-white" : "text-mist")} data-rule={r.key} data-ok={r.ok ? "true" : undefined}>
                  <span className={"mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border " + (r.ok ? "border-rose-light bg-rose-light text-ink" : "border-white/30")} aria-hidden="true">
                    {r.ok ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  {r.text}
                </li>
              ))}
            </ul>
            <Field label={w.confirm} name="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={mismatch || undefined} />
            {mismatch ? <p className="text-sm text-rose-light">{w.mismatch}</p> : null}
            <button type="submit" disabled={busy !== "" || !password || !confirm} className="btn-primary mt-2 w-full disabled:opacity-60">
              {busy === "create" ? <Spinner /> : null} {w.submit}
            </button>
            {note ? <Msg tone="error">{note}</Msg> : null}
          </form>
        </>
      ) : null}

      {stage.s === "offer" || stage.s === "app" ? (
        <div data-invite-2fa>
          <h1 className="title-caps mt-4 t-hero tracking-[0.12em]">{w.offerTitle}</h1>
          <Msg tone="ok" className="mt-5">
            {w.created}
          </Msg>
          <p className="piece-text mt-4">{w.offerIntro}</p>
          {stage.s === "offer" ? (
            <div className="mt-10 grid gap-3">
              <button type="button" onClick={() => void chooseEmail()} disabled={busy !== ""} data-2fa-choice="email" className="flex min-h-16 items-center gap-4 border border-white/20 px-5 text-start text-base text-white transition-colors hover:border-rose-light disabled:opacity-60">
                {busy === "email" ? <Spinner className="size-5" /> : <Mail className="size-5 text-rose-light" aria-hidden="true" />}
                {w.chooseEmail}
              </button>
              <button type="button" onClick={() => setStage({ s: "app" })} disabled={busy !== ""} data-2fa-choice="app" className="flex min-h-16 items-center gap-4 border border-white/20 px-5 text-start text-base text-white transition-colors hover:border-rose-light disabled:opacity-60">
                <Smartphone className="size-5 text-rose-light" aria-hidden="true" />
                {w.chooseApp}
              </button>
              <button type="button" onClick={() => toSpace()} disabled={busy !== ""} data-2fa-choice="skip" className="btn-secondary mt-2 justify-center">
                {w.skip}
              </button>
            </div>
          ) : (
            <div className="mt-10">
              <TotpSetup onDone={() => toSpace("2fa-app")} onCancel={() => setStage({ s: "offer" })} />
            </div>
          )}
          {note ? <Msg tone="error" className="mt-5">{note}</Msg> : null}
        </div>
      ) : null}
    </section>
  );
}
