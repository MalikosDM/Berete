/*
 * The AI Creation Studio (Phase 2, 27/11/2026), « Create Your Own Piece » (/create, and /create/<token>: a studio reached again
 * by its private link, no account). The visitor describes his idea, adds photos of inspiration, generates first concepts,
 * asks for other interpretations, another metal or another shape, keeps his favourites, and sends them to Berete with a
 * consultation request (it lands in the admin « AI Studio »). Yoni's message stands near the generator: the AI is for
 * inspiration; it replaces neither Berete's professional design nor guarantees that a concept can be made. Every image is
 * labelled as an AI concept for inspiration, never as a piece of Berete; the professional design service stays apart
 * (/contact, « Begin Your Creation »). The studio is created at the first concept or photo (server/routes/studio.ts); the page
 * then moves to its private link. Closed (switch off, no key, or no server): « The studio opens soon » and the way to /contact.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowRight, LoaderCircle } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import Generator, { MAX_REFS } from "@/components/studio/Generator";
import { ConceptCard, ConceptViewer, PendingCard, type Busy, type Problem } from "@/components/studio/Concepts";
import { KeepStudio, SendToBerete } from "@/components/studio/SendForm";
import { Link, useI18n } from "@/i18n";
import { getLenis } from "@/lib/gsap";
import { preparePhoto } from "@/lib/photos";
import { HAS_SERVER } from "@/lib/site";
import { savedToken, saveToken, studioApi, StudioError, type MetalKey, type PieceKey, type StudioConcept, type StudioReference, type StudioState, type StudioStatus, type VariantKey } from "@/lib/studio";

type Phase = "loading" | "ready" | "missing";

const EMPTY: StudioState = { email: "", createdAt: "", concepts: [], references: [], requests: [], open: false, reason: null, max: 0, remaining: 0 };
const CLOSED: StudioStatus = { open: false, reason: "off", max: 0, remaining: 0 };

/** Brings an element into view when most of it is below the screen (the waiting card, on a phone). */
function bringIntoView(el: HTMLElement | null): void {
  if (!el) return;
  const top = el.getBoundingClientRect().top;
  if (top >= 0 && top < window.innerHeight * 0.6) return;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(el, { offset: -96 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}

const problemOf = (x: unknown, where: string): NonNullable<Problem> => ({ where, code: x instanceof StudioError ? x.code : "unavailable", wait: x instanceof StudioError ? x.wait : 0 });

export default function Studio() {
  const { t, path } = useI18n();
  const s = t.studio;
  const { token: routeToken = "" } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [status, setStatus] = useState<StudioStatus>(CLOSED);
  const [studio, setStudio] = useState<StudioState | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const [uploading, setUploading] = useState(0);
  const [filter, setFilter] = useState<"all" | "kept">("all");
  const [viewing, setViewing] = useState<StudioConcept | null>(null);
  // The token of the studio shown (the private link); made at the first concept or photo. The ref for the actions under way,
  // the state for what the page shows.
  const token = useRef(routeToken);
  const [shownToken, setShownToken] = useState(routeToken);
  const setToken = useCallback((value: string) => {
    token.current = value;
    setShownToken(value);
  }, []);
  const gallery = useRef<HTMLDivElement>(null);
  const closeViewer = useCallback(() => setViewing(null), []);

  const apply = useCallback((state: StudioState) => {
    setStudio(state);
    setStatus({ open: state.open, reason: state.reason, max: state.max, remaining: state.remaining });
  }, []);

  // Opening: the studio of the link, else the one kept in this browser, else a fresh page.
  useEffect(() => {
    if (routeToken && routeToken === token.current && studio) return undefined;
    let alive = true;
    const run = async () => {
      if (!HAS_SERVER) {
        setPhase("ready");
        return;
      }
      if (routeToken) {
        try {
          const state = await studioApi.load(routeToken);
          if (!alive) return;
          setToken(routeToken);
          saveToken(routeToken);
          apply(state);
          setPhase("ready");
        } catch (x) {
          if (!alive) return;
          if (x instanceof StudioError && x.code === "missing") {
            if (savedToken() === routeToken) saveToken("");
            setPhase("missing");
            setStatus(await studioApi.status().catch(() => CLOSED));
          } else setPhase("ready");
        }
        return;
      }
      const kept = savedToken();
      if (kept) {
        try {
          await studioApi.load(kept);
          if (!alive) return;
          navigate(path("/create/" + kept), { replace: true });
          return;
        } catch {
          saveToken("");
        }
      }
      const st = await studioApi.status().catch(() => CLOSED);
      if (!alive) return;
      setToken("");
      setStudio(null);
      setStatus(st);
      setPhase("ready");
    };
    void run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per address
  }, [routeToken]);

  /** The token of the studio, made now when there is none yet (the address moves to it after the first action). */
  const ensureStudio = async (): Promise<string> => {
    if (token.current) return token.current;
    const made = await studioApi.create();
    setToken(made.token);
    saveToken(made.token);
    setStudio((st) => st ?? { ...EMPTY, open: status.open, reason: status.reason, max: status.max, remaining: status.remaining });
    return made.token;
  };

  /** After the first action of a fresh page, the address becomes the private link of the studio. */
  const settleAddress = () => {
    if (token.current && token.current !== routeToken) navigate(path("/create/" + token.current), { replace: true });
  };

  const addConcept = (concept: StudioConcept, remaining: number) => {
    setStudio((st) => (st ? { ...st, concepts: [concept, ...st.concepts] } : st));
    setStatus((st) => ({ ...st, remaining }));
    setFilter("all");
  };

  const generate = async (input: { idea: string; piece: PieceKey | null; metal: MetalKey | null; photos: boolean }) => {
    if (busy) return;
    setBusy({ where: "new" });
    setProblem(null);
    window.requestAnimationFrame(() => bringIntoView(gallery.current));
    try {
      const tk = await ensureStudio();
      const answer = await studioApi.generate(tk, input);
      addConcept(answer.concept, answer.remaining);
    } catch (x) {
      const p = problemOf(x, "new");
      setProblem(p);
      if (p.code === "limit") setStatus((st) => ({ ...st, remaining: 0 }));
    } finally {
      setBusy(null);
      settleAddress();
    }
  };

  const variant = async (c: StudioConcept, v: VariantKey) => {
    if (busy || !token.current) return;
    setBusy({ where: c.id, variant: v });
    setProblem(null);
    window.requestAnimationFrame(() => bringIntoView(gallery.current));
    try {
      const answer = await studioApi.variant(token.current, c.id, v);
      addConcept(answer.concept, answer.remaining);
    } catch (x) {
      const p = problemOf(x, c.id);
      setProblem(p);
      if (p.code === "limit") setStatus((st) => ({ ...st, remaining: 0 }));
    } finally {
      setBusy(null);
    }
  };

  const keep = async (c: StudioConcept) => {
    if (!token.current) return;
    const next = !c.kept;
    setStudio((st) => (st ? { ...st, concepts: st.concepts.map((x) => (x.id === c.id ? { ...x, kept: next } : x)) } : st));
    try {
      await studioApi.keep(token.current, c.id, next);
    } catch {
      setStudio((st) => (st ? { ...st, concepts: st.concepts.map((x) => (x.id === c.id ? { ...x, kept: !next } : x)) } : st));
    }
  };

  const removeConcept = async (c: StudioConcept) => {
    if (!token.current) return;
    try {
      await studioApi.removeConcept(token.current, c.id);
      setStudio((st) => (st ? { ...st, concepts: st.concepts.filter((x) => x.id !== c.id) } : st));
    } catch (x) {
      setProblem(problemOf(x, c.id));
    }
  };

  const addPhotos = async (files: File[]) => {
    const room = MAX_REFS - (studio?.references.length ?? 0) - uploading;
    const taken = files.slice(0, Math.max(0, room));
    setProblem(files.length > taken.length ? { where: "refs", code: "too-many-refs", wait: 0 } : null);
    if (taken.length === 0) return;
    setUploading((n) => n + taken.length);
    try {
      const tk = await ensureStudio();
      for (const file of taken) {
        try {
          const prepared = await preparePhoto(file);
          if (!prepared) throw new StudioError("file");
          const answer = await studioApi.addReference(tk, prepared.name, prepared.blob);
          if (prepared.preview) URL.revokeObjectURL(prepared.preview);
          setStudio((st) => (st ? { ...st, references: [...st.references, answer.reference] } : st));
        } catch (x) {
          setProblem(problemOf(x, "refs"));
        } finally {
          setUploading((n) => n - 1);
        }
      }
    } catch (x) {
      setUploading(0);
      setProblem(problemOf(x, "refs"));
    } finally {
      settleAddress();
    }
  };

  const removePhoto = async (r: StudioReference) => {
    if (!token.current) return;
    try {
      await studioApi.removeReference(token.current, r.id);
      setStudio((st) => (st ? { ...st, references: st.references.filter((x) => x.id !== r.id) } : st));
    } catch (x) {
      setProblem(problemOf(x, "refs"));
    }
  };

  const newStudio = () => {
    saveToken("");
    setToken("");
    setStudio(null);
    setProblem(null);
    setFilter("all");
    navigate(path("/create"));
    if (!routeToken) {
      setPhase("loading");
      void studioApi
        .status()
        .catch(() => CLOSED)
        .then((st) => {
          setStatus(st);
          setPhase("ready");
        });
    }
  };

  const onSent = (request: { id: string; createdAt: string }) => {
    setStudio((st) => {
      if (!st) return st;
      return { ...st, requests: [request, ...st.requests] };
    });
    // The concepts and photos sent are marked as such (from the server: the source of truth).
    if (token.current) void studioApi.load(token.current).then(apply, () => undefined);
  };

  const proService = (
    <section aria-labelledby="studio-pro-title" data-studio-pro className="wrap pb-20 lg:pb-28">
      <div className="rule-rose mb-10" aria-hidden="true" />
      <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <h2 id="studio-pro-title" className="title-caps t-sub tracking-[0.12em]">
            {s.proTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-base text-mist">{s.proText}</p>
        </div>
        <div className="lg:col-span-4 lg:text-end">
          <Link to="/contact" className="btn-primary" data-studio-pro-link>
            {s.proCta}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );

  const intro = <PageIntro title={s.title} lead={s.lead} compact />;

  if (phase === "loading") {
    return (
      <div data-studio="loading">
        {intro}
        <p role="status" className="wrap flex items-center gap-3 py-16 text-base text-mist">
          <LoaderCircle className="size-5 animate-spin text-rose-light" aria-hidden="true" />
          {s.loading}
        </p>
      </div>
    );
  }

  if (phase === "missing") {
    return (
      <div data-studio="missing">
        {intro}
        <section className="wrap pt-6 pb-16">
          <div className="max-w-2xl border border-white/15 p-6 sm:p-10">
            <h2 className="title-caps t-sub tracking-[0.12em]">{s.missingTitle}</h2>
            <p className="mt-4 text-base text-mist">{s.missingText}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              {status.open ? (
                <button type="button" onClick={newStudio} className="btn-primary" data-studio-new>
                  {s.newStudio}
                </button>
              ) : null}
              <Link to="/contact" className="btn-secondary">
                {s.proCta}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const current = studio ?? EMPTY;
  const hasStudio = Boolean(shownToken && studio);
  const readOnly = !status.open;
  const keptCount = current.concepts.filter((c) => c.kept).length;
  const shown = filter === "kept" ? current.concepts.filter((c) => c.kept) : current.concepts;
  const pending = busy !== null;

  return (
    <div data-studio={status.open ? "open" : "closed"}>
      {intro}

      {!status.open ? (
        <section className="wrap pt-6 pb-12" data-studio-closed>
          <div className="max-w-2xl border border-white/15 p-6 sm:p-10">
            <h2 className="title-caps t-sub tracking-[0.12em]">{s.closedTitle}</h2>
            <p className="mt-4 text-base text-mist">{s.closedText}</p>
            <Link to="/contact" className="btn-primary mt-8" data-studio-closed-link>
              {s.proCta}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : null}

      {status.open || current.concepts.length > 0 ? (
        <section className="wrap grid gap-10 pt-6 pb-16 lg:grid-cols-12 lg:gap-12" aria-label={s.title}>
          {status.open ? (
            <div className="lg:col-span-5">
              <Generator
                busy={busy}
                problem={problem}
                remaining={status.remaining}
                max={status.max}
                references={current.references}
                uploading={uploading}
                onGenerate={generate}
                onAddPhotos={(f) => void addPhotos(f)}
                onRemovePhoto={(r) => void removePhoto(r)}
                onFieldProblem={(code) => setProblem(code ? { where: "field", code, wait: 0 } : null)}
              />
            </div>
          ) : null}

          <div ref={gallery} className={"scroll-mt-28 " + (status.open ? "lg:col-span-7" : "lg:col-span-12")} data-studio-gallery>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="title-caps t-sub tracking-[0.12em]">{s.conceptsTitle}</h2>
                <p className="mt-2 text-base text-mist lg:text-[0.875rem]">{s.conceptsNote}</p>
              </div>
              {current.concepts.length > 0 ? (
                <div className="flex gap-1" role="group" aria-label={s.conceptsTitle}>
                  {(["all", "kept"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={filter === f}
                      onClick={() => setFilter(f)}
                      data-filter={f}
                      className={"min-h-12 border-b-2 px-3 text-base transition-colors lg:min-h-10 lg:text-[0.875rem] " + (filter === f ? "border-rose-light text-rose-light" : "border-transparent text-bone hover:text-white")}
                    >
                      {f === "all" ? s.filterAll : s.filterKept} <span dir="ltr">({f === "all" ? current.concepts.length : keptCount})</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {pending ? <PendingCard /> : null}
              {shown.map((c) => (
                <ConceptCard key={c.id} concept={c} readOnly={readOnly} busy={busy} problem={problem} onKeep={(x) => void keep(x)} onVariant={(x, v) => void variant(x, v)} onRemove={(x) => void removeConcept(x)} onOpen={setViewing} />
              ))}
              {!pending && shown.length === 0 ? (
                <p className="flex aspect-square items-center justify-center border border-dashed border-white/15 p-8 text-center text-base text-mist sm:col-span-2 sm:aspect-[2/1]" data-studio-empty>
                  {filter === "kept" ? s.emptyKept : s.empty}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {hasStudio && (status.open || current.concepts.length > 0) ? (
        <div className="wrap grid gap-10 pb-16 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <KeepStudio token={shownToken} email={current.email} onNew={newStudio} onEmail={(email) => setStudio((st) => (st ? { ...st, email } : st))} />
          </div>
          <div className="lg:col-span-7">
            <SendToBerete key={shownToken} token={shownToken} studio={current} onSent={onSent} />
          </div>
        </div>
      ) : null}

      {/* Closed, its panel already leads to the professional design service: one « Begin Your Creation » per page. */}
      {status.open ? proService : null}
      {viewing ? <ConceptViewer concept={viewing} onClose={closeViewer} /> : null}
    </div>
  );
}
