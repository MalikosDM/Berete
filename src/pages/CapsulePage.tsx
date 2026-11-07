import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowUpRight, Camera } from "lucide-react";
import Reveal from "@/components/Reveal";
import Logo from "@/components/Logo";
import { asRecord, pickOne, str, useApi } from "@/pages/Creations";

export const TYPE_LABELS: Record<string, string> = { chain: "Chain", pendant: "Pendant", ring: "Ring", bracelet: "Bracelet", watch: "Watch" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "chain", label: "Chains" },
  { key: "pendant", label: "Pendants" },
  { key: "ring", label: "Rings" },
  { key: "bracelet", label: "Bracelets" },
  { key: "watch", label: "Watches" },
];

const SPANS = ["lg:col-span-7", "lg:col-span-5 lg:mt-28", "lg:col-span-5", "lg:col-span-7 lg:mt-16"];

type JewelCard = { slug: string; title: string; type: string; client: string; coverImage: string };

export default function CapsulePage() {
  const { slug = "" } = useParams();
  const { data, loading, error, status } = useApi(slug ? "/api/capsules/" + encodeURIComponent(slug) : null, pickOne("capsule"));
  const [filter, setFilter] = useState("all");

  const capsule = useMemo(() => {
    if (!data) return null;
    const jewels: JewelCard[] = (Array.isArray(data.jewels) ? data.jewels : []).map((x) => {
      const r = asRecord(x);
      return { slug: str(r.slug), title: str(r.title), type: str(r.type).toLowerCase(), client: r.clientPublic === true ? str(r.client) : "", coverImage: str(r.coverImage) };
    });
    return { title: str(data.title), tagline: str(data.tagline), intro: str(data.intro), coverImage: str(data.coverImage), jewels };
  }, [data]);

  if (loading) {
    return (
      <section aria-busy="true" className="flex min-h-svh items-center justify-center px-5">
        <p className="title-caps text-rose-gold text-2xl tracking-[0.3em]">Opening the capsule</p>
      </section>
    );
  }

  if (error || !capsule || !capsule.title) {
    return (
      <section className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center px-5 text-center">
        <h1 className="title-caps text-[clamp(2.25rem,6vw,4.5rem)] tracking-[0.14em]">{status === 404 ? "This capsule does not exist" : "The capsule is closed"}</h1>
        <p className="mt-6 text-lg text-bone">{status === 404 ? "It may have moved. Discover the other capsules." : error}</p>
        <Link to="/" className="mt-10 inline-flex min-h-12 items-center gap-2 bg-white px-8 text-sm font-semibold uppercase tracking-[0.18em] text-ink hover:bg-rose-light">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back home
        </Link>
      </section>
    );
  }

  const list = filter === "all" ? capsule.jewels : capsule.jewels.filter((j) => j.type === filter);

  return (
    <article>
      <Logo className="pointer-events-none fixed right-4 bottom-24 z-30 h-10 w-28 opacity-20 md:bottom-6" />
      <section className="relative flex min-h-svh items-end overflow-hidden">
        {capsule.coverImage ? (
          <img src={capsule.coverImage} alt={capsule.title + " capsule"} width={1920} height={1200} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink via-ink/60 to-ink/30" />
        <div className="relative mx-auto w-full max-w-[1600px] px-5 pt-40 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <Link to="/" className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-bone hover:text-rose-light">
            <ArrowLeft className="size-4" aria-hidden="true" /> The capsules
          </Link>
          <p className="eyebrow mt-8">Capsule</p>
          <h1 className="title-caps mt-5 text-[clamp(2.75rem,9vw,8rem)] tracking-[0.1em] text-white">{capsule.title}</h1>
          {capsule.intro || capsule.tagline ? <p className="mt-6 max-w-xl text-lg text-bone lg:text-xl">{capsule.intro || capsule.tagline}</p> : null}
        </div>
      </section>

      <section aria-label="The pieces" className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-32">
        <div role="group" aria-label="Filter the pieces" className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={
                "inline-flex min-h-12 shrink-0 items-center border px-6 text-sm font-semibold uppercase tracking-[0.18em] transition-colors " +
                (filter === f.key ? "border-rose-light text-rose-light" : "border-white/25 text-white hover:border-rose-light hover:text-rose-light")
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <p className="mt-12 border border-white/15 p-10 text-center text-lg text-bone">No piece of this type in the capsule yet.</p>
        ) : (
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-12">
            {list.map((j, i) => (
              <Reveal key={j.slug} delay={(i % 4) * 0.1} className={SPANS[i % SPANS.length]}>
                <Link to={"/pieces/" + j.slug} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-ink-soft">
                    {j.coverImage ? (
                      <img src={j.coverImage} alt={j.title} width={1200} height={1500} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-105" />
                    ) : (
                      <span className="flex h-full w-full flex-col items-center justify-center gap-3 text-bone">
                        <Camera className="size-6 text-rose-light" aria-hidden="true" /> Photo coming soon
                      </span>
                    )}
                  </div>
                  <div className="mt-5 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="title-caps text-2xl tracking-[0.12em] text-white group-hover:text-rose-light sm:text-3xl">{j.title}</h2>
                      <p className="mt-2 text-sm uppercase tracking-[0.2em] text-mist">
                        {TYPE_LABELS[j.type] ?? j.type}
                        {j.client ? " · " + j.client : ""}
                      </p>
                    </div>
                    <ArrowUpRight className="size-6 shrink-0 text-white transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-rose-light" aria-hidden="true" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
