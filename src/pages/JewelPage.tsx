import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight, Gift, Newspaper } from "lucide-react";
import HorizontalGallery, { type HorizontalGalleryItem } from "@/components/HorizontalGallery";
import BrandIcon from "@/components/BrandIcon";
import AutoVideo from "@/components/AutoVideo";
import Logo from "@/components/Logo";
import SafeImage from "@/components/SafeImage";
import { TYPE_LABELS } from "@/pages/CapsulePage";
import { asRecord, pickOne, str, useApi } from "@/pages/Creations";
import { gsap, useReducedMotion } from "@/lib/gsap";
import { pieceMessage, waLink } from "@/lib/site";

type Media = { src: string; type: "image" | "video"; alt: string };

const STEP_DEFS = [
  { key: "idea", n: "01", title: "The idea", line: "Where it starts: a sketch, a story, a symbol." },
  { key: "design", n: "02", title: "The design", line: "Modelled in 3D, refined curve by curve." },
  { key: "casting", n: "03", title: "The casting", line: "The model becomes raw metal." },
  { key: "setting", n: "04", title: "The setting", line: "Stone by stone, by hand, at the atelier." },
  { key: "polish", n: "05", title: "The polish", line: "A mirror finish, so only the stones are seen." },
] as const;

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.75)]";

function toMedia(v: unknown): Media[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x): Media => {
      if (typeof x === "string") return { src: x, type: /\.(mp4|webm|mov)(#.*)?$/i.test(x) ? "video" : "image", alt: "" };
      const o = asRecord(x);
      const src = str(o.src, str(o.url));
      return { src, type: str(o.type) === "video" || /\.(mp4|webm|mov)(#.*)?$/i.test(src) ? "video" : "image", alt: str(o.alt) };
    })
    .filter((m) => m.src !== "");
}

function MediaView({ m, title, eager = false }: { m: Media; title: string; eager?: boolean }) {
  if (m.type === "video") {
    return <AutoVideo src={m.src} label={m.alt || title} className="h-full w-full object-cover" />;
  }
  return <SafeImage src={m.src} alt={m.alt || title} width={1600} height={1000} loading={eager ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" />;
}

function StepPanel({ n, title, line, media, z, pieceTitle, children }: { n: string; title: string; line: string; media: Media[]; z: number; pieceTitle: string; children?: ReactNode }) {
  return (
    <article className="sticky top-0 h-svh w-full overflow-hidden bg-ink" style={{ zIndex: z }}>
      <div data-mask className="absolute inset-0">
        <div className={"grid h-full w-full " + (media.length > 1 ? "md:grid-cols-2" : "")}>
          {media.slice(0, 2).map((m, i) => (
            <div key={m.src + i} className={"h-full w-full overflow-hidden " + (i > 0 ? "hidden md:block" : "")}>
              <MediaView m={m} title={pieceTitle + ", " + title} />
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink via-ink/50 to-ink/10" />
      </div>
      <div className="relative z-10 mx-auto flex h-full max-w-[1600px] flex-col justify-end px-5 pb-28 sm:px-8 md:pb-20 lg:px-12">
        <p className="text-rose-gold font-display text-5xl font-light md:text-7xl">{n}</p>
        <h2 className={"title-caps mt-4 text-[clamp(2rem,6vw,5rem)] text-white " + shadow}>{title}</h2>
        <div className="rule-rose my-6 max-w-xs" aria-hidden="true" />
        <p className={"max-w-xl text-lg text-bone " + shadow}>{line}</p>
        {children}
      </div>
    </article>
  );
}

export default function JewelPage() {
  const { slug = "" } = useParams();
  const { data, loading, error, status } = useApi(slug ? "/api/jewels/" + encodeURIComponent(slug) : null, pickOne("jewel"));
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);

  const jewel = useMemo(() => {
    if (!data) return null;
    const steps = asRecord(data.steps);
    const capsule = asRecord(data.capsule);
    const next = asRecord(data.next);
    return {
      slug: str(data.slug),
      title: str(data.title),
      type: str(data.type).toLowerCase(),
      line: str(data.line),
      client: data.clientPublic === true ? str(data.client) : "",
      coverImage: str(data.coverImage),
      customBox: data.customBox === true,
      steps: STEP_DEFS.map((d) => ({ ...d, media: toMedia(steps[d.key]) })).filter((d) => d.media.length > 0),
      piece: toMedia(steps.piece),
      delivered: toMedia(steps.delivered),
      specs: (Array.isArray(data.specs) ? data.specs : [])
        .map((s) => ({ label: str(asRecord(s).label), value: str(asRecord(s).value) }))
        .filter((s) => s.label !== "" && s.value !== ""),
      press: (Array.isArray(data.press) ? data.press : [])
        .map((p) => ({ outlet: str(asRecord(p).outlet), title: str(asRecord(p).title), url: str(asRecord(p).url) }))
        .filter((p) => p.outlet !== "" || p.title !== ""),
      capsule: { slug: str(capsule.slug), title: str(capsule.title) },
      next: str(next.slug) ? { slug: str(next.slug), title: str(next.title) } : null,
    };
  }, [data]);

  useEffect(() => {
    if (reduced || !root.current || !jewel) return undefined;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-mask]").forEach((el, i) => {
        const from = i % 2 === 0 ? "inset(18% 12% 18% 12%)" : "circle(14% at 50% 50%)";
        const to = i % 2 === 0 ? "inset(0% 0% 0% 0%)" : "circle(80% at 50% 50%)";
        gsap.fromTo(el, { clipPath: from }, { clipPath: to, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "top top", scrub: true } });
      });
    }, root);
    return () => ctx.revert();
  }, [reduced, jewel]);

  if (loading) {
    return (
      <section aria-busy="true" className="flex min-h-svh items-center justify-center px-5">
        <p className="title-caps text-rose-gold text-2xl tracking-[0.3em]">Opening the piece</p>
      </section>
    );
  }

  if (error || !jewel || !jewel.title) {
    return (
      <section className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center px-5 text-center">
        <h1 className="title-caps text-[clamp(2.25rem,6vw,4.5rem)] tracking-[0.14em]">{status === 404 ? "This piece does not exist" : "The piece is not available"}</h1>
        <p className="mt-6 text-lg text-bone">{status === 404 ? "It may have moved. Discover the capsules." : error}</p>
        <Link to="/" className="mt-10 inline-flex min-h-12 items-center gap-2 bg-white px-8 text-sm font-semibold uppercase tracking-[0.18em] text-ink hover:bg-rose-light">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back home
        </Link>
      </section>
    );
  }

  const hero = jewel.coverImage || jewel.piece.find((m) => m.type === "image")?.src || "";
  const gallery: HorizontalGalleryItem[] = jewel.piece
    .filter((m) => m.type === "image")
    .map((m, i) => ({ src: m.src, alt: m.alt || jewel.title + ", photo " + (i + 1) }));
  const pieceVideos = jewel.piece.filter((m) => m.type === "video");
  const showPiece = jewel.piece.length > 0;
  const typeLabel = TYPE_LABELS[jewel.type] ?? jewel.type;

  return (
    <div ref={root}>
      <Logo className="pointer-events-none fixed right-4 bottom-24 z-30 h-10 w-28 opacity-20 md:bottom-6" />

      <section className="relative flex min-h-svh items-end overflow-hidden">
        <SafeImage src={hero} alt={jewel.title} width={1920} height={1200} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink via-ink/60 to-ink/30" />
        <div className="relative mx-auto w-full max-w-[1600px] px-5 pt-40 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          {jewel.capsule.slug ? (
            <Link to={"/capsules/" + jewel.capsule.slug} className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-bone hover:text-rose-light">
              <ArrowLeft className="size-4" aria-hidden="true" /> {jewel.capsule.title || "The capsule"}
            </Link>
          ) : null}
          <p className="eyebrow mt-8">
            {typeLabel}
            {jewel.client ? " · " + jewel.client : ""}
          </p>
          <h1 className={"title-caps mt-5 text-[clamp(2.5rem,8vw,7rem)] tracking-[0.08em] text-white " + shadow}>{jewel.title}</h1>
          {jewel.line ? <p className="mt-6 max-w-xl text-lg text-bone lg:text-xl">{jewel.line}</p> : null}
        </div>
      </section>

      {jewel.steps.length > 0 ? (
        <section aria-label="The making of the piece" className="relative">
          {jewel.steps.map((s, i) => (
            <StepPanel key={s.key} n={s.n} title={s.title} line={s.line} media={s.media} z={i + 1} pieceTitle={jewel.title} />
          ))}
        </section>
      ) : null}

      {showPiece || jewel.specs.length > 0 ? (
        <section aria-labelledby="piece-title" className="relative z-20 bg-ink">
          <div className="mx-auto max-w-[1600px] px-5 pt-24 sm:px-8 lg:px-12 lg:pt-36">
            <p className="text-rose-gold font-display text-5xl font-light md:text-7xl">06</p>
            <h2 id="piece-title" className="title-caps mt-4 text-[clamp(2rem,6vw,5rem)] text-white">The piece</h2>
            <div className="rule-rose my-6 max-w-xs" aria-hidden="true" />
            <p className="max-w-xl text-lg text-bone">The finished piece, as it left the atelier.</p>
          </div>
          {gallery.length > 0 ? <HorizontalGallery items={gallery} title="Final photos" /> : null}
          {pieceVideos.length > 0 ? (
            <div className={"mx-auto grid max-w-[1600px] gap-8 px-5 py-12 sm:px-8 lg:px-12 " + (pieceVideos.length > 1 ? "md:grid-cols-2" : "")}>
              {pieceVideos.map((v) => (
                <video key={v.src} src={v.src} muted playsInline controls preload="metadata" aria-label={v.alt || jewel.title} className="w-full bg-ink" />
              ))}
            </div>
          ) : null}
          <div className="mx-auto max-w-[1600px] px-5 pt-12 pb-24 sm:px-8 lg:px-12 lg:pb-32">
            <h3 className="title-caps text-[clamp(1.75rem,4vw,3rem)] tracking-[0.14em]">Technical sheet</h3>
            {jewel.specs.length > 0 ? (
              <dl className="mt-8 max-w-3xl border-t border-white/15">
                {jewel.specs.map((s) => (
                  <div key={s.label} className="grid gap-2 border-b border-white/15 py-5 sm:grid-cols-3 sm:gap-6">
                    <dt className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-light">{s.label}</dt>
                    <dd className="text-lg text-white sm:col-span-2">{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-8 text-lg text-bone">Full specifications shared on request.</p>
            )}
          </div>
        </section>
      ) : null}

      {jewel.delivered.length > 0 ? (
        <section aria-label="Delivered" className="relative">
          <StepPanel n="07" title="Delivered" line={jewel.client ? "Handed over to " + jewel.client + "." : "Handed over to its owner."} media={jewel.delivered} z={30} pieceTitle={jewel.title}>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
              {jewel.customBox ? (
                <Link to="/boxes" className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-white hover:text-rose-light">
                  <Gift className="size-4 text-rose-light" aria-hidden="true" /> Custom case
                </Link>
              ) : null}
              {jewel.press.map((p) =>
                p.url ? (
                  <a key={p.outlet + p.title} href={p.url} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-white hover:text-rose-light">
                    <Newspaper className="size-4 text-rose-light" aria-hidden="true" /> {p.outlet || p.title} <ArrowUpRight className="size-4" aria-hidden="true" />
                  </a>
                ) : (
                  <span key={p.outlet + p.title} className="inline-flex min-h-12 items-center gap-2 text-sm uppercase tracking-[0.2em] text-bone">
                    <Newspaper className="size-4 text-rose-light" aria-hidden="true" /> {p.outlet}
                    {p.title ? ": " + p.title : ""}
                  </span>
                ),
              )}
            </div>
          </StepPanel>
        </section>
      ) : null}

      <section className="relative z-40 bg-ink px-5 py-24 text-center sm:px-8 lg:py-36">
        <div className="rule-rose mx-auto mb-16 max-w-5xl" aria-hidden="true" />
        <p className="eyebrow">Inspired by this piece?</p>
        <h2 className="title-caps mx-auto mt-6 max-w-4xl text-[clamp(2rem,5vw,4.5rem)] tracking-[0.12em] text-white">Your story, in diamonds</h2>
        <div className="mt-12 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
          <a href={waLink(pieceMessage(jewel.title))} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center justify-center gap-3 bg-white px-8 text-sm font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-rose-light">
            <BrandIcon name="whatsapp" className="size-5" /> I want a piece like this
          </a>
          {jewel.next ? (
            <Link to={"/pieces/" + jewel.next.slug} className="inline-flex min-h-14 items-center justify-center gap-3 border border-rose-light/70 px-8 text-sm font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-rose-light hover:text-ink">
              Next piece: {jewel.next.title} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
