import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router";
import { ArrowUpRight } from "lucide-react";
import SafeImage from "@/components/SafeImage";
import PageIntro from "@/components/PageIntro";
import Reveal from "@/components/Reveal";

/* ------------------------------------------------------------------ */
/* Small, tolerant data layer shared by the pages                       */
/* ------------------------------------------------------------------ */

export type Rec = Record<string, unknown>;

type ApiState<T> = { data: T | null; loading: boolean; error: string | null; status: number | null };

export function asRecord(v: unknown): Rec {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {};
}

export function str(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return fallback;
}

export function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : Number.NaN;
  return Number.isFinite(n) ? n : null;
}

export function pickList(key: string) {
  return (json: unknown): unknown[] => {
    if (Array.isArray(json)) return json;
    const r = asRecord(json);
    if (Array.isArray(r[key])) return r[key] as unknown[];
    if (Array.isArray(r.data)) return r.data as unknown[];
    const first = Object.values(r).find((v) => Array.isArray(v));
    return Array.isArray(first) ? first : [];
  };
}

export function pickOne(key: string) {
  return (json: unknown): Rec => {
    const r = asRecord(json);
    const inner = asRecord(r[key]);
    if (Object.keys(inner).length > 0) return inner;
    const data = asRecord(r.data);
    if (Object.keys(data).length > 0 && !("slug" in r)) return data;
    return r;
  };
}

function readError(json: unknown): string | null {
  const r = asRecord(json);
  return typeof r.error === "string" ? r.error : typeof r.message === "string" ? r.message : null;
}

export function useApi<T>(url: string | null, pick: (json: unknown) => T): ApiState<T> {
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: Boolean(url), error: null, status: null });

  useEffect(() => {
    if (!url) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(url, { headers: { Accept: "application/json" } })
      .then(async (res) => {
        const json: unknown = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setState({
            data: null,
            loading: false,
            error: readError(json) ?? "We could not load this content. Please try again in a moment.",
            status: res.status,
          });
          return;
        }
        setState({ data: pickRef.current(json), loading: false, error: null, status: res.status });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: "The connection was interrupted. Please check your network and try again.", status: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}


/* ------------------------------------------------------------------ */
/* Creations: gallery of every piece, each one opens /pieces/:slug      */
/* ------------------------------------------------------------------ */

const FILTERS = [
  { key: "all", param: "", label: "All" },
  { key: "chain", param: "chains", label: "Chains" },
  { key: "pendant", param: "pendants", label: "Pendants" },
  { key: "ring", param: "rings", label: "Rings" },
  { key: "bracelet", param: "bracelets", label: "Bracelets" },
  { key: "watch", param: "watches", label: "Watches" },
];

const TYPE_NAMES: Record<string, string> = { chain: "Chain", pendant: "Pendant", ring: "Ring", bracelet: "Bracelet", watch: "Watch" };

type GalleryPiece = { slug: string; title: string; type: string; client: string; coverImage: string; capsule: string };

export default function Creations() {
  const [params, setParams] = useSearchParams();
  const raw = (params.get("category") ?? "").toLowerCase();
  const active = FILTERS.find((f) => f.param === raw || f.key === raw)?.key ?? "all";
  const { data, loading, error } = useApi("/api/jewels", pickList("jewels"));

  const all = useMemo<GalleryPiece[]>(
    () =>
      (data ?? [])
        .map((x) => {
          const r = asRecord(x);
          return {
            slug: str(r.slug),
            title: str(r.title),
            type: str(r.type).toLowerCase(),
            client: r.clientPublic === true ? str(r.client) : "",
            coverImage: str(r.coverImage),
            capsule: str(asRecord(r.capsule).title),
          };
        })
        .filter((p) => p.slug !== "" && p.title !== ""),
    [data],
  );
  const pieces = active === "all" ? all : all.filter((p) => p.type === active);

  const select = (param: string) => {
    const next = new URLSearchParams(params);
    if (param === "") next.delete("category");
    else next.set("category", param);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageIntro
        eyebrow="Creations"
        title="The Creations"
        lead="Chains, pendants, rings, bracelets and watches. Each piece is drawn for one person, one club, one moment, then crafted in Dubai."
      />

      <section aria-label="All pieces" className="mx-auto max-w-[1600px] px-5 pb-28 sm:px-8 lg:px-12 lg:pb-40">
        <div role="group" aria-label="Filter the pieces" className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTERS.map((f) => {
            const isActive = f.key === active;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => select(f.param)}
                aria-pressed={isActive}
                className={
                  "inline-flex min-h-12 shrink-0 items-center border px-6 text-sm font-semibold uppercase tracking-[0.18em] transition-colors " +
                  (isActive ? "border-rose-light text-rose-light" : "border-white/25 text-white hover:border-rose-light hover:text-rose-light")
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="mt-12 lg:mt-16" aria-live="polite">
          {loading ? (
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[4/5] animate-pulse bg-white/5" />
                  <div className="mt-5 h-7 w-2/3 animate-pulse bg-white/10" />
                </div>
              ))}
              <span className="sr-only">Loading the pieces</span>
            </div>
          ) : error ? (
            <div className="border border-white/15 p-10 text-center">
              <p className="title-caps text-2xl tracking-[0.14em]">The vault is closed for a moment</p>
              <p className="mt-4 text-lg text-bone">{error}</p>
            </div>
          ) : pieces.length === 0 ? (
            <div className="border border-white/15 p-10 text-center">
              <p className="title-caps text-2xl tracking-[0.14em]">New pieces are being crafted</p>
              <p className="mt-4 text-lg text-bone">This collection will be revealed soon. Start yours in the meantime.</p>
              <Link to="/contact" className="mt-8 inline-flex min-h-12 items-center bg-white px-8 text-sm font-semibold uppercase tracking-[0.18em] text-ink hover:bg-rose-light">
                Start your piece
              </Link>
            </div>
          ) : (
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
              {pieces.map((p, i) => (
                <Reveal key={p.slug} delay={(i % 3) * 0.08}>
                  <Link to={"/pieces/" + p.slug} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden bg-ink-soft">
                      <SafeImage src={p.coverImage} alt={p.title} width={1200} height={1500} loading={i < 3 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover object-center transition-transform duration-[1.6s] ease-out group-hover:scale-105" />
                    </div>
                    <div className="mt-5 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="title-caps break-words text-2xl tracking-[0.1em] text-white group-hover:text-rose-light sm:text-3xl">{p.title}</h2>
                        <p className="mt-2 text-sm uppercase tracking-[0.2em] text-mist">
                          {TYPE_NAMES[p.type] ?? p.type}
                          {p.capsule ? " · " + p.capsule : ""}
                          {p.client ? " · " + p.client : ""}
                        </p>
                      </div>
                      <ArrowUpRight className="size-6 shrink-0 text-white transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-rose-light" aria-hidden="true" />
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* Old /creations/:slug addresses lead to the single piece template. */
export function Capsule() {
  const { slug = "" } = useParams();
  return <Navigate to={slug ? "/pieces/" + slug : "/creations"} replace />;
}
