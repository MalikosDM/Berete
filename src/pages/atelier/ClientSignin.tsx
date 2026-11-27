/*
 * A sign-in link of The Private Atelier (/vip/signin/<token>, sent by e-mail on request, 15 minutes, used once): used as soon
 * as the page opens; a client who chose an authenticator app still gives its code (data-atelier-code); then his space
 * (/vip). A link expired or already used says so, with the way to the sign-in page.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CodeStep } from "@/components/atelier/SignIn";
import { Msg, Waiting } from "@/components/atelier/ui";
import { Link, useI18n } from "@/i18n";
import { magicUse, type CodeAsked } from "@/lib/atelier";

export default function ClientSignin() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { t, path } = useI18n();
  const w = t.privateAtelier.magicPage;
  const [stage, setStage] = useState<{ s: "checking" } | { s: "code"; asked: CodeAsked } | { s: "expired"; message?: string } | { s: "error" }>({ s: "checking" });
  // The link is used once: React's second run of the effect in development must not use it again.
  const used = useRef(false);

  useEffect(() => {
    if (used.current) return;
    used.current = true;
    void (async () => {
      const a = await magicUse(token);
      if (a.state === "ok") return navigate(path("/vip"), { replace: true });
      if (a.state === "code") return setStage({ s: "code", asked: a });
      if (a.state === "expired") return setStage({ s: "expired" });
      if (a.state === "wait") return setStage({ s: "expired", message: t.privateAtelier.signin.wait });
      setStage({ s: "error" });
    })();
  }, [token, navigate, path, t]);

  if (stage.s === "checking") return <Waiting>{w.checking}</Waiting>;

  return (
    <section className="mx-auto max-w-xl px-5 pt-36 pb-24 sm:px-8 lg:pt-44" data-atelier-magic-page data-state={stage.s}>
      <p className="eyebrow">{t.privateAtelier.nav}</p>
      <h1 className="title-caps mt-4 t-hero tracking-[0.12em]">{t.privateAtelier.signin.title}</h1>
      {stage.s === "code" ? (
        <div className="mt-10">
          <CodeStep asked={stage.asked} onDone={() => navigate(path("/vip"), { replace: true })} onBack={(message) => (message ? setStage({ s: "expired", message }) : navigate(path("/vip")))} />
        </div>
      ) : (
        <>
          <Msg tone="error" className="mt-6">
            {stage.s === "error" ? t.privateAtelier.error : (stage.message ?? w.expired)}
          </Msg>
          <Link to="/vip" className="btn-primary mt-10 w-full sm:w-auto" data-magic-signin>
            {w.signin}
          </Link>
        </>
      )}
    </section>
  );
}
