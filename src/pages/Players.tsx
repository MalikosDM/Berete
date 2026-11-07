import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight, Play } from "lucide-react";
import PageIntro from "@/components/PageIntro";
import SplitHeading from "@/components/SplitHeading";
import JewelImage from "@/components/JewelImage";
import ContactBlock from "@/components/ContactBlock";
import SafeImage from "@/components/SafeImage";
import { Viewer, toStory, type Story } from "@/components/Stories";
import { TYPE_LABELS } from "@/pages/CapsulePage";
import { asRecord, num, pickList, pickOne, str, useApi, type Rec } from "@/pages/Creations";

type JewelCard = { slug: string; title: string; type: string; coverImage: string };
type GalleryItem = { src: string; type: "image" | "video"; alt: string };

type PlayerView = {
  slug: string;
  name: string;
  number: number | null;
  club: string;
  kind: string;
  portrait: string;
  bio: string;
  piece: { slug: string; title: string; subtitle: string; coverImage: string } | null;
  stories: Story[];
  jewels: JewelCard[];
  gallery: GalleryItem[];
};

function toPlayer(r: Rec): PlayerView {
  const p = asRecord(r.piece);
  const pieceSlug = str(p.slug);
  const kind = str(r.kind, "player");
  return {
    slug: str(r.slug),
    name: str(r.name),
    number: num(r.number),
    club: str(r.club),
    kind: kind === "club" || kind === "personality" ? kind : "player",
    portrait: str(r.portrait, str(r.image)),
    bio: str(r.bio, str(r.story)),
    piece: pieceSlug ? { slug: pieceSlug, title: str(p.title), subtitle: str(p.subtitle), coverImage: str(p.coverImage) } : null,
    stories: (Array.isArray(r.stories) ? r.stories : []).map((s) => toStory(asRecord(s))).filter((s) => s.title !== ""),
    jewels: (Array.isArray(r.jewels) ? r.jewels : [])
      .map((x) => {
        const j = asRecord(x);
        return { slug: str(j.slug), title: str(j.title), type: str(j.type).toLowerCase(), coverImage: str(j.coverImage) };
      })
      .filter((j) => j.slug !== ""),
    gallery: (Array.isArray(r.gallery) ? r.gallery : [])
      .map((x): GalleryItem => {
        const g = asRecord(x);
        const src = str(g.src);
        const type: GalleryItem["type"] = str(g.type) === "video" || /\.(mp4|webm|mov)$/i.test(src) ? "video" : "image";
        return { src, type, alt: str(g.alt) };
      })
      .filter((g) => g.src !== ""),
  };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const GROUPS = [
  { kind: "player", title: "Players" },
  { kind: "club", title: "Clubs" },
  { kind: "personality", title: "Personalities" },
];

const noop = () => undefined;

export default function Players() {
  const { data, loading, error } = useApi("/api/players", pickList("players"));
  const players = useMemo(() => (data ?? []).map((p) => toPlayer(asRecord(p))).filter((p) => p.name && p.slug), [data]);

  return (
    <>
      <PageIntro eyebrow="Players" title="Worn by champions" lead="Footballers, clubs and personalities who trusted us with their moment. Each name opens their stories and their pieces." />

      <section aria-label="Players list" className="mx-auto max-w-[1600px] px-5 pb-28 sm:px-8 lg:px-12 lg:pb-40" aria-live="polite">
        {loading ? (
          <ul aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="border-b border-white/15 py-8">
                <div className="h-14 w-3/4 animate-pulse bg-white/10" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <div className="border border-white/15 p-10 text-center">
            <p className="title-caps text-2xl tracking-[0.14em]">The list is not available</p>
            <p className="mt-4 text-lg text-bone">{error}</p>
          </div>
        ) : players.length === 0 ? (
          <p className="border border-white/15 p-10 text-center text-lg text-bone">New names are coming soon.</p>
        ) : (
          GROUPS.map((g) => {
            const list = players.filter((p) => p.kind === g.kind);
            if (list.length === 0) return null;
            return (
              <div key={g.kind} className="mt-16 first:mt-0">
                <h2 className="eyebrow mb-6">{g.title}</h2>
                <ul className="border-t border-white/15">
                  {list.map((p) => (
                    <li key={p.slug} className="border-b border-white/15">
                      <Link to={"/players/" + p.slug} className="group grid min-h-24 items-baseline gap-x-6 gap-y-2 py-7 sm:grid-cols-[4rem_1fr_auto] lg:py-10">
                        <span className="text-rose-gold font-display text-2xl lg:text-3xl">{p.number !== null ? String(p.number).padStart(2, "0") : "··"}</span>
                        <span className="font-display text-[clamp(2.25rem,7.5vw,7.5rem)] leading-[0.95] font-light uppercase tracking-[0.04em] text-white transition-colors duration-500 group-hover:text-rose-gold group-focus-visible:text-rose-gold">
                          {p.name}
                        </span>
                        <span className="flex items-center gap-4 text-base text-bone">
                          {p.club}
                          <ArrowUpRight className="size-6 text-white transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-rose-light" aria-hidden="true" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}

export function PlayerPage() {
  const { slug = "" } = useParams();
  const { data, loading, error, status } = useApi(slug ? "/api/players/" + encodeURIComponent(slug) : null, pickOne("player"));
  const player = useMemo(() => (data ? toPlayer(data) : null), [data]);
  const [open, setOpen] = useState<number | null>(null);

  if (loading) {
    return (
      <section aria-busy="true" className="flex min-h-svh items-center justify-center">
        <p className="title-caps text-rose-gold text-2xl tracking-[0.3em]">Loading</p>
      </section>
    );
  }

  if (error || !player || !player.name) {
    return (
      <section className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center px-5 text-center">
        <h1 className="title-caps text-[clamp(2.25rem,6vw,4.5rem)] tracking-[0.14em]">{status === 404 ? "Player not found" : "Not available"}</h1>
        <p className="mt-6 text-lg text-bone">{status === 404 ? "This page does not exist, or not yet." : error}</p>
        <Link to="/players" className="mt-10 inline-flex min-h-12 items-center gap-2 bg-white px-8 text-sm font-semibold uppercase tracking-[0.18em] text-ink hover:bg-rose-light">
          <ArrowLeft className="size-4" aria-hidden="true" /> All players
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="mx-auto grid max-w-[1600px] gap-12 px-5 pt-28 pb-20 sm:px-8 lg:grid-cols-12 lg:px-12 lg:pt-36 lg:pb-32">
        <div className="lg:col-span-5">
          {player.portrait ? (
            <SafeImage src={player.portrait} alt={"Portrait of " + player.name} width={1200} height={1500} decoding="async" className="aspect-[4/5] w-full object-cover" />
          ) : (
            <div className="border-rose-gold flex aspect-[4/5] w-full flex-col items-center justify-center bg-ink-soft">
              <span className="text-rose-gold font-display text-[clamp(5rem,14vw,10rem)] font-light">{initials(player.name)}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center lg:col-span-6 lg:col-start-7">
          <Link to="/players" className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-bone hover:text-rose-light">
            <ArrowLeft className="size-4" aria-hidden="true" /> All players
          </Link>
          {player.club ? <p className="eyebrow mt-8">{player.club}</p> : null}
          <SplitHeading as="h1" className="mt-5 text-[clamp(2.5rem,7vw,6.5rem)] tracking-[0.06em]">
            {player.name}
          </SplitHeading>
          {player.number !== null ? (
            <p className="mt-6 flex items-baseline gap-4">
              <span className="text-sm font-semibold uppercase tracking-[0.24em] text-bone">No.</span>
              <span className="text-rose-gold font-display text-[clamp(4rem,10vw,8rem)] leading-none font-light">{player.number}</span>
            </p>
          ) : null}
          {player.bio ? <p className="mt-8 max-w-xl text-lg text-bone">{player.bio}</p> : null}

          {player.jewels.length === 0 && player.piece ? (
            <Link to={"/pieces/" + player.piece.slug} className="group mt-12 grid grid-cols-[7rem_1fr] items-center gap-6 border border-white/15 p-5 transition-colors hover:border-rose-light sm:grid-cols-[9rem_1fr]">
              <JewelImage src={player.piece.coverImage} alt={player.piece.title} sizes="9rem" className="aspect-square w-full" />
              <span>
                <span className="eyebrow block">The piece</span>
                <span className="title-caps mt-3 block text-2xl tracking-[0.12em] text-white">{player.piece.title}</span>
                <span className="mt-4 inline-flex min-h-12 items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] group-hover:text-rose-light">
                  Discover the piece <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </span>
            </Link>
          ) : null}
        </div>
      </section>

      {player.jewels.length > 0 ? (
        <section aria-labelledby="player-pieces" className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <h2 id="player-pieces" className="title-caps text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">Pieces</h2>
          <ul className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {player.jewels.map((j) => (
              <li key={j.slug}>
                <Link to={"/pieces/" + j.slug} className="group block">
                  <span className="block aspect-[4/5] overflow-hidden bg-black">
                    <SafeImage src={j.coverImage} alt={j.title} width={1200} height={1500} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-[1.6s] group-hover:scale-105" />
                  </span>
                  <span className="title-caps mt-5 block text-2xl tracking-[0.1em] text-white group-hover:text-rose-light">{j.title}</span>
                  <span className="mt-2 block text-sm uppercase tracking-[0.2em] text-mist">{TYPE_LABELS[j.type] ?? j.type}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {player.stories.length > 0 ? (
        <section aria-labelledby="player-stories" className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <h2 id="player-stories" className="title-caps text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">Stories</h2>
          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {player.stories.map((s, i) => (
              <li key={s.slug}>
                <button type="button" onClick={() => setOpen(i)} className="group block w-full text-left" aria-label={"Open the story " + s.title}>
                  <span className="relative block aspect-[9/16] overflow-hidden bg-black">
                    {s.coverType === "video" ? (
                      <video src={s.coverImage + "#t=0.1"} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} className="h-full w-full object-cover" />
                    ) : (
                      <SafeImage src={s.coverImage} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    )}
                    {s.coverType === "video" ? <Play className="absolute top-3 right-3 size-5 text-white" aria-hidden="true" /> : null}
                  </span>
                  <span className="mt-3 block text-sm font-medium uppercase tracking-[0.12em] text-white group-hover:text-rose-light">{s.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {player.gallery.length > 0 ? (
        <section aria-labelledby="player-gallery" className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <h2 id="player-gallery" className="title-caps text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">Galerie</h2>
          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {player.gallery.map((g) => (
              <li key={g.src} className="aspect-[4/5] overflow-hidden bg-black">
                {g.type === "video" ? (
                  <video src={g.src} controls playsInline preload="metadata" aria-label={g.alt || player.name} className="h-full w-full object-cover" />
                ) : (
                  <SafeImage src={g.src} alt={g.alt || player.name} width={1200} height={1500} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {open !== null ? <Viewer stories={player.stories} start={open} onClose={() => setOpen(null)} onSeen={noop} /> : null}

      <ContactBlock pieceName={player.jewels[0]?.title ?? player.piece?.title} compact id="player-contact" />
    </>
  );
}
