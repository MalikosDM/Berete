import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowRight, Check, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { Link, useI18n } from "@/i18n";
import { IMAGINE, type ImagineError } from "@/i18n/imagine";
import { getLenis } from "@/lib/gsap";
import { HAS_SERVER } from "@/lib/site";

/** As the server (server/imagine.ts). */
const MAX_IDEA = 600;
/** The server gives up after 60 seconds; the page a little later. */
const PAGE_TIMEOUT = 75_000;

type Proposal = { url: string; file: File; idea: string };
type Problem = { kind: ImagineError } | { kind: "too-many"; wait: number };
type Answer = { image?: unknown; error?: unknown; wait?: unknown } | null;

function problemOf(status: number, body: Answer): Problem {
  const error = typeof body?.error === "string" ? body.error : "";
  if (status === 429 || error === "too-many") return { kind: "too-many", wait: Math.max(1, Math.round(Number(body?.wait)) || 10) };
  if (error === "empty" || error === "too-long" || error === "refused" || error === "timeout") return { kind: error };
  if (status === 504) return { kind: "timeout" };
  return { kind: "unavailable" };
}

/** Brings an element into view when most of it is below the screen (the loading frame, on a phone). */
function bringIntoView(el: HTMLElement | null): void {
  if (!el) return;
  const top = el.getBoundingClientRect().top;
  if (top >= 0 && top < window.innerHeight * 0.55) return;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(el, { offset: -96 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * « Imaginez votre création » (Private Enquiries, Yoni 23/11/2026): the visitor describes his idea, the server makes a
 * first image of it (server/imagine.ts, OpenAI); « Contacter la maison pour finaliser » then puts the idea and the image
 * in the private correspondence below (`onFinalise`), which the visitor sends himself. Shown only when the server says
 * the service is on (GET /api/imagine/status): without the server (Vercel), without its key or when the server does not
 * answer, nothing at all. Once the AI Creation Studio is open (GET /api/studio/status, Phase 2, 27/11/2026), a short invitation
 * to the studio (/create) takes its place.
 */
export default function Imagine({ onFinalise }: { onFinalise: (message: string, file: File) => void }) {
  const { locale, t } = useI18n();
  const s = IMAGINE[locale];
  const [studioOpen, setStudioOpen] = useState(false);
  const fieldId = useId();
  const countId = useId();
  const problemId = useId();
  const [enabled, setEnabled] = useState(false);
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [attached, setAttached] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const pending = useRef<AbortController | null>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => {
    if (!HAS_SERVER) return undefined;
    const controller = new AbortController();
    fetch("/api/imagine/status", { headers: { Accept: "application/json" }, signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<unknown>) : null))
      .then((body) => setEnabled(typeof body === "object" && body !== null && (body as { enabled?: unknown }).enabled === true))
      .catch(() => undefined);
    fetch("/api/studio/status", { headers: { Accept: "application/json" }, signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<unknown>) : null))
      .then((body) => setStudioOpen(typeof body === "object" && body !== null && (body as { open?: unknown }).open === true))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  // A request still on its way stops with the page; the images leave with it.
  useEffect(() => {
    const made = urls.current;
    return () => {
      const request = pending.current;
      pending.current = null;
      request?.abort();
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const generate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    const text = idea.trim();
    if (!text || text.length > MAX_IDEA) {
      setProblem({ kind: text ? "too-long" : "empty" });
      field.current?.focus();
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    const timer = window.setTimeout(() => controller.abort(), PAGE_TIMEOUT);
    setLoading(true);
    setProblem(null);
    setAttached(false);
    setProposal(null);
    window.requestAnimationFrame(() => bringIntoView(frame.current));
    try {
      const res = await fetch("/api/imagine", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ idea: text, language: locale }),
        signal: controller.signal,
      });
      const body = (await res.json().catch(() => null)) as Answer;
      if (pending.current !== controller) return;
      if (!res.ok || typeof body?.image !== "string") {
        setProblem(problemOf(res.status, body));
        return;
      }
      const bytes = Uint8Array.from(atob(body.image), (c) => c.charCodeAt(0));
      const file = new File([bytes], s.fileName, { type: "image/jpeg" });
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      setProposal({ url, file, idea: text });
    } catch {
      if (pending.current !== controller) return;
      setProblem({ kind: controller.signal.aborted ? "timeout" : "network" });
    } finally {
      window.clearTimeout(timer);
      if (pending.current === controller) {
        pending.current = null;
        setLoading(false);
      }
    }
  };

  const restart = () => {
    setProposal(null);
    setProblem(null);
    setAttached(false);
    setIdea("");
    field.current?.focus();
  };

  const finalise = () => {
    if (!proposal) return;
    onFinalise(s.messageIntro + "\n\n" + proposal.idea, proposal.file);
    setAttached(true);
  };

  if (studioOpen) {
    return (
      <section aria-labelledby="studio-teaser-title" data-studio-teaser className="bg-ink pb-12 lg:pb-16">
        <div className="wrap">
          <div className="max-w-3xl border border-white/15 p-6 sm:p-10">
            <h2 id="studio-teaser-title" className="title-caps t-sub tracking-[0.12em] text-balance break-words">
              {t.studio.teaserTitle}
            </h2>
            <p className="mt-4 text-base text-mist">{t.studio.teaserText}</p>
            <Link to="/create" className="btn-primary mt-8">
              <Sparkles className="size-5 shrink-0" aria-hidden="true" />
              {t.studio.teaserCta}
              <ArrowRight className="size-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!enabled) return null;

  const fieldProblem = problem?.kind === "empty" || problem?.kind === "too-long";
  const problemText = problem ? (problem.kind === "too-many" ? s.tooMany(problem.wait) : s.errors[problem.kind]) : "";

  return (
    <section id="imagine" aria-labelledby="imagine-title" data-imagine className="scroll-mt-32 bg-ink pb-12 lg:pb-16">
      <div className="wrap">
        <div className="max-w-3xl">
        <div className="border border-white/15 p-6 sm:p-10">
          {s.eyebrow ? <p className="eyebrow mb-4">{s.eyebrow}</p> : null}
          <h2 id="imagine-title" className="title-caps t-sub tracking-[0.12em] text-balance break-words">{s.title}</h2>
          <p className="mt-4 text-base text-mist sm:text-base">{s.lead}</p>

          <form onSubmit={generate} noValidate className="mt-8 grid gap-4" data-imagine-form>
            <label htmlFor={fieldId} className="text-base text-bone">{s.label}</label>
            <textarea
              id={fieldId}
              ref={field}
              name="idea"
              rows={4}
              maxLength={MAX_IDEA}
              value={idea}
              readOnly={loading}
              onChange={(e) => {
                setIdea(e.target.value);
                if (fieldProblem) setProblem(null);
              }}
              placeholder={s.placeholder}
              aria-invalid={fieldProblem}
              aria-describedby={countId + (problem ? " " + problemId : "")}
              className="block w-full border border-white/30 bg-ink px-4 py-3 text-base text-white placeholder:text-mist focus:border-rose-light focus:outline-none"
            />
            <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={loading}
                data-imagine-generate
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-rose-light/80 px-6 py-3 text-center text-base leading-snug font-medium uppercase tracking-[0.12em] text-white transition-colors hover:bg-rose-light hover:text-ink disabled:opacity-70 sm:w-auto sm:px-8 lg:min-h-11 lg:text-[0.75rem]"
              >
                {loading ? <LoaderCircle className="size-5 shrink-0 animate-spin" aria-hidden="true" /> : <Sparkles className="size-5 shrink-0" aria-hidden="true" />}
                {s.generate}
              </button>
              <span id={countId} className="text-base text-mist sm:text-end">
                <span dir="ltr">{idea.length + " / " + MAX_IDEA}</span>
              </span>
            </div>
            {problem ? (
              <p id={problemId} role="alert" data-imagine-error={problem.kind} className="text-base text-rose-light">
                {problemText}
              </p>
            ) : null}
          </form>

          <div ref={frame} className="scroll-mt-28">
            {loading ? (
              <div
                role="status"
                data-imagine-loading
                className="mx-auto mt-8 flex aspect-square w-full max-w-xl flex-col items-center justify-center gap-4 border border-white/15 bg-ink-soft bg-[radial-gradient(circle_at_center,rgba(232,180,160,0.16),transparent_62%)] p-6 text-center"
              >
                <LoaderCircle className="size-8 animate-spin text-rose-light" aria-hidden="true" />
                <p className="text-base text-bone">{s.loading}</p>
                <p className="text-base text-mist">{s.loadingHint}</p>
              </div>
            ) : proposal ? (
              <div className="mt-8 grid gap-6" data-imagine-result>
                <figure className="mx-auto grid w-full max-w-xl gap-4">
                  <img
                    src={proposal.url}
                    alt={s.alt(proposal.idea)}
                    width={1024}
                    height={1024}
                    className="aspect-square w-full border border-white/15 bg-black object-cover"
                  />
                  <figcaption className="text-base text-mist" data-imagine-note>{s.note}</figcaption>
                </figure>
                <div className="mx-auto flex w-full max-w-xl flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={finalise}
                    data-imagine-finalise
                    data-cta
                    className="btn-primary flex-1"
                  >
                    <ArrowDown className="size-5 shrink-0" aria-hidden="true" />
                    {s.finalise}
                  </button>
                  <button
                    type="button"
                    onClick={restart}
                    data-imagine-restart
                    className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/40 px-6 py-3 text-center text-base leading-snug font-medium uppercase tracking-[0.1em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-11 lg:text-[0.75rem]"
                  >
                    <RotateCcw className="size-5 shrink-0" aria-hidden="true" />
                    {s.restart}
                  </button>
                </div>
                {attached ? (
                  <p role="status" data-imagine-attached className="mx-auto flex w-full max-w-xl items-start gap-3 text-base text-bone">
                    <Check className="mt-0.5 size-5 shrink-0 text-rose-light" aria-hidden="true" />
                    {s.attached}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
