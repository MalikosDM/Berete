/*
 * A commission in The Private Atelier (/vip/project/<id>, data-client-project): only what Berete published for him, in the
 * order of the commission — the design (versions, 3D, comparison, a change asked, the final design approved), the quotation,
 * the payment, the making, the journal of the atelier, the messages. The page reads the project again after each action;
 * back from the page of Stripe (?payment=done) it reads it every 3 seconds for a minute, until the payment shows as received
 * (?payment=cancelled: a calm word). Not signed in: the sign-in, then the same commission. WhatsApp of the house always there.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { SignInPanel } from "@/components/atelier/SignIn";
import { Msg, Waiting, WhatsAppLink } from "@/components/atelier/ui";
import { DesignSection } from "@/components/atelier/project/Design";
import { JournalSection } from "@/components/atelier/project/Journal";
import { MakingSection } from "@/components/atelier/project/Making";
import { MessagesSection } from "@/components/atelier/project/Messages";
import { PaymentSection, type Return } from "@/components/atelier/project/Payment";
import { QuoteSection } from "@/components/atelier/project/Quote";
import { Link, useI18n } from "@/i18n";
import { markRead, project as fetchProject, type Project } from "@/lib/atelier";
import { PRIVATE_ONLY } from "@/lib/private";
import { waLink } from "@/lib/site";

type State = { s: "loading" } | { s: "ok"; p: Project } | { s: "out" } | { s: "missing" } | { s: "error" };

const SECTIONS = ["design", "quote", "payment", "making", "journal", "messages"] as const;
const POLL_MS = 3000;
const POLL_FOR_MS = 60_000;
/** A payment received this recently counts as the one he just made (the notification of Stripe may come before the page). */
const RECENT_MS = 30 * 60_000;

export default function ClientProject() {
  const { id = "" } = useParams();
  const { t } = useI18n();
  const w = t.privateAtelier;
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState<State>({ s: "loading" });
  const back = params.get("payment");
  const [returned, setReturned] = useState<Return>(back === "done" ? { kind: "done", confirmed: false, slow: false } : back === "cancelled" ? { kind: "cancelled" } : null);
  const readSent = useRef(false);

  const load = useCallback(async (): Promise<Project | null> => {
    const a = await fetchProject(id);
    if (a.state === "ok") {
      setState({ s: "ok", p: a.project });
      return a.project;
    }
    setState(a.state === "out" ? { s: "out" } : a.state === "missing" ? { s: "missing" } : { s: "error" });
    return null;
  }, [id]);

  const reload = useCallback(async () => {
    await load();
  }, [load]);

  // First reading; his messages from the house marked read once he opened the commission.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const a = await fetchProject(id);
      if (!alive) return;
      if (a.state === "ok") {
        setState({ s: "ok", p: a.project });
        const unread = a.project.thread.some((m) => m.type === "message" && m.author === "house" && !m.readAt);
        if (unread && !readSent.current) {
          readSent.current = true;
          void markRead(id);
        }
      } else setState(a.state === "out" ? { s: "out" } : a.state === "missing" ? { s: "missing" } : { s: "error" });
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // Back from Stripe: the payment confirmed only by its notification; the page asks every 3 s, a minute at most.
  const polling = returned?.kind === "done" && !returned.confirmed;
  useEffect(() => {
    if (!polling) return undefined;
    const started = Date.now();
    let stopped = false;
    let timer = 0;
    const paidRecently = (p: Project) => p.payments.some((x) => x.status === "paid" && x.paidAt && Date.now() - new Date(x.paidAt).getTime() < RECENT_MS);
    const tick = async () => {
      const p = await load();
      if (stopped) return;
      if (p && paidRecently(p)) {
        setReturned({ kind: "done", confirmed: true, slow: false });
        return;
      }
      if (Date.now() - started >= POLL_FOR_MS) {
        setReturned({ kind: "done", confirmed: false, slow: true });
        return;
      }
      timer = window.setTimeout(() => void tick(), POLL_MS);
    };
    timer = window.setTimeout(() => void tick(), 0);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [polling, load]);

  // The word of the return stays on the page, the address loses its ?payment= (a reload does not wait again).
  useEffect(() => {
    if (!back || polling) return;
    const next = new URLSearchParams(params);
    next.delete("payment");
    setParams(next, { replace: true });
  }, [back, polling, params, setParams]);

  if (state.s === "loading") return <Waiting>{w.opening}</Waiting>;

  if (state.s === "out") {
    return (
      <section className="mx-auto max-w-xl px-5 pt-36 pb-24 sm:px-8 lg:pt-44" data-atelier-login>
        <p className="eyebrow">{w.nav}</p>
        <h1 className="title-caps mt-4 t-hero tracking-[0.12em]">{w.signin.title}</h1>
        <p className="mt-5 text-base text-bone">{w.signin.intro}</p>
        <div className="mt-10">
          <SignInPanel onSignedIn={() => void reload()} />
        </div>
      </section>
    );
  }

  if (state.s === "missing" || state.s === "error") {
    return (
      <section className="mx-auto max-w-xl px-5 pt-36 pb-24 sm:px-8 lg:pt-44" data-client-project-missing>
        <p className="eyebrow">{w.eyebrow}</p>
        <Msg tone="error" className="mt-6">
          {state.s === "missing" ? w.project.missing : w.error}
        </Msg>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          {state.s === "error" ? (
            <button type="button" onClick={() => void reload()} className="btn-primary">
              {w.retry}
            </button>
          ) : null}
          <Link to="/vip" className="btn-secondary">
            <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" /> {w.project.back}
          </Link>
        </div>
      </section>
    );
  }

  const p = state.p;
  return (
    <div className="wrap pt-32 pb-24 lg:pt-40" data-client-project={p.id}>
      <Link to="/vip" className="btn-secondary text-mist" data-back>
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" /> {w.project.back}
      </Link>
      <header className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{w.eyebrow}</p>
          <h1 className="title-caps mt-4 t-hero tracking-[0.12em] break-words">{p.title}</h1>
        </div>
        <WhatsAppLink message={w.whatsappProject(p.title)} className="btn-primary shrink-0" data-project-whatsapp>
          {w.whatsappHouse}
        </WhatsAppLink>
      </header>

      <nav className="mt-10 -mx-1 flex gap-x-6 gap-y-1 overflow-x-auto border-y border-white/10 px-1 [scrollbar-width:none]" aria-label={p.title}>
        {SECTIONS.map((s) => (
          <a key={s} href={"#" + s} className="inline-flex min-h-12 shrink-0 items-center text-sm font-medium uppercase tracking-[0.2em] whitespace-nowrap text-mist transition-colors hover:text-rose-light" data-section-link={s}>
            {w.project.sections[s]}
          </a>
        ))}
      </nav>

      <DesignSection p={p} onChanged={reload} onOut={() => setState({ s: "out" })} />
      <QuoteSection p={p} onChanged={reload} onOut={() => setState({ s: "out" })} />
      <PaymentSection p={p} returned={returned} onChanged={reload} onOut={() => setState({ s: "out" })} />
      <MakingSection p={p} />
      <JournalSection p={p} />
      <MessagesSection p={p} onChanged={reload} onOut={() => setState({ s: "out" })} />

      {/* On the page alone (the site under construction: no menu, no bar of the site), WhatsApp of the house stays at hand. */}
      {PRIVATE_ONLY ? (
        <a
          href={waLink(w.whatsappProject(p.title))}
          target="_blank"
          rel="noreferrer"
          aria-label={w.whatsappHouse}
          className="fixed end-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex size-14 items-center justify-center rounded-full border border-rose-light/55 bg-ink/90 text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md transition-colors hover:border-rose-light hover:text-rose-light"
          data-whatsapp-float
        >
          <BrandIcon name="whatsapp" className="size-6" />
        </a>
      ) : null}
    </div>
  );
}
