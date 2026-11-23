import { useState } from "react";
import { useParams } from "react-router";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import ContactBlock from "@/components/ContactBlock";
import { MediaView } from "@/components/Media";
import { SIZES_FOR } from "@/lib/responsive";
import PageIntro from "@/components/PageIntro";
import PlayerWall, { PlayerPortrait } from "@/components/PlayerWall";
import SplitHeading from "@/components/SplitHeading";
import { primeStoryVideo } from "@/components/stories/player";
import StoryViewer from "@/components/stories/StoryViewer";
import { defaultCatalogue } from "@/data/catalogue";
import { findPerson, instagramOf, leftTheCircle, membersOf, personHref, photosOf, pieceVisualFor, piecesOf, storiesOf } from "@/data/relations";
import type { PersonKind } from "@/data/types";
import { Link, Navigate, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import NotFound from "@/pages/NotFound";

const GROUPS: PersonKind[] = ["player", "club", "personality"];

export default function Players() {
  const { t } = useI18n();
  const { people } = useCatalogue();
  return (
    <>
      <PageIntro eyebrow={t.players.eyebrow} title={t.players.title} lead={t.players.lead} />

      <section aria-label={t.players.listLabel} className="mx-auto max-w-[1600px] px-5 pb-24 sm:px-8 lg:px-12 lg:pb-32">
        {GROUPS.map((kind) => {
          const list = people.filter((p) => p.kind === kind);
          if (list.length === 0) return null;
          return (
            <div key={kind} className="mt-20 first:mt-0">
              <h2 className="eyebrow mb-8">{t.players.groups[kind]}</h2>
              <PlayerWall people={list} />
            </div>
          );
        })}
      </section>
    </>
  );
}

export function PlayerPage() {
  const { slug = "" } = useParams();
  const { t } = useI18n();
  const cat = useCatalogue();
  const [open, setOpen] = useState<number | null>(null);
  const person = findPerson(cat, slug);
  // A person whose pieces are all unpublished left the circle: their page leads to it.
  if (!person) return leftTheCircle(defaultCatalogue, slug) ? <Navigate to="/players" replace /> : <NotFound />;

  const stories = storiesOf(cat, person.slug);
  const pieces = piecesOf(cat, person.slug);
  const members = membersOf(cat, person);
  const photos = photosOf(cat, person);
  const kindLabel = person.kind === "club" ? t.players.club : person.kind === "personality" ? t.players.personality : person.club;
  const instagram = instagramOf(person);

  // A person with pieces: their pieces first (feedback of Yoni, 21/11/2026); a person known from the stories only keeps the
  // button to watch them.
  const openStory = (i: number) => {
    primeStoryVideo(stories[i]!);
    setOpen(i);
  };

  return (
    <>
      <section data-player-hero className="mx-auto max-w-[1600px] px-5 pt-28 pb-10 sm:px-8 lg:px-12 lg:pt-36 lg:pb-14">
        <Link to="/players" className="inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-bone hover:text-rose-light">
          <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" /> {t.common.allPlayers}
        </Link>
        <div className="mt-6 flex items-center gap-5 sm:gap-8 lg:mt-8">
          <PlayerPortrait person={person} priority sizes="(max-width: 639px) 112px, (max-width: 1023px) 160px, 208px" className="aspect-[4/5] w-28 shrink-0 border border-white/10 sm:w-40 lg:w-52" />
          <div className="min-w-0">
            {kindLabel ? <p className="eyebrow">{kindLabel}</p> : null}
            <SplitHeading as="h1" className="mt-3 text-[clamp(2rem,5.5vw,4.5rem)] tracking-[0.05em] break-words">
              {person.name}
            </SplitHeading>
            {person.number !== null ? (
              <p className="mt-3 flex items-baseline gap-3">
                <span className="text-base font-semibold uppercase tracking-[0.24em] text-bone">{t.players.number}</span>
                <span className="text-rose-gold font-display text-[clamp(2rem,4vw,3rem)] leading-none font-light">{person.number}</span>
              </p>
            ) : null}
          </div>
        </div>
        <p className="mt-8 max-w-2xl text-lg text-bone">
          {person.bio || (pieces.length > 0 ? t.players.bioWithPieces(person.name) : t.players.bioStories(person.name))}
        </p>
        {instagram ? (
          <a href={instagram} target="_blank" rel="noreferrer" data-player-instagram className="mt-4 inline-flex min-h-12 w-fit items-center gap-3 text-base font-semibold text-white hover:text-rose-light">
            <BrandIcon name="instagram" className="size-5" /> @{person.instagram}
          </a>
        ) : null}
        {pieces.length === 0 && stories.length > 0 ? (
          <button
            type="button"
            onClick={() => openStory(0)}
            data-player-watch
            className="mt-8 flex min-h-14 w-fit items-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:bg-rose-light"
          >
            <Play className="size-5 fill-current" aria-hidden="true" /> {t.players.watch(stories.length)}
          </button>
        ) : null}
      </section>

      {pieces.length > 0 ? (
        <section aria-labelledby="player-pieces" data-player-pieces className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <h2 id="player-pieces" className="title-caps text-[clamp(1.75rem,4vw,3rem)] tracking-[0.14em]">{t.players.pieces(pieces.length)}</h2>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-10">
            {pieces.map((p) => {
              const visual = pieceVisualFor(p, person);
              return (
                <li key={p.slug}>
                  <Link to={"/pieces/" + p.slug} data-player-piece={p.slug} className="group block">
                    <span className="relative block aspect-[4/5] overflow-hidden border border-white/10 bg-ink">
                      <span className="absolute inset-0 p-4 transition-transform duration-[1.6s] group-hover:scale-105">
                        <MediaView item={visual} fit="contain" sizes={SIZES_FOR.grid3} />
                      </span>
                    </span>
                    <span className="title-caps mt-5 block text-2xl tracking-[0.08em] break-words text-white [text-wrap:balance] group-hover:text-rose-light">{p.title}</span>
                    <span className="mt-1 block text-base text-mist">{visual.caption && visual !== p.cover ? visual.caption : t.types[p.type]}</span>
                    <span className="mt-2 inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-white group-hover:text-rose-light">
                      {t.common.enterWorld} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {photos.length > 0 ? (
        <section aria-labelledby="player-photos" className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <h2 id="player-photos" className="title-caps text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">{t.players.photos}</h2>
          <ul data-player-photos className="mt-10 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {photos.map((m, i) => (
              <li key={m.src} className="relative aspect-[4/5] overflow-hidden border border-white/10 bg-ink-soft">
                <MediaView item={m} alt={t.players.photo(person.name, i + 1)} fit="cover" fade sizes="(max-width: 1023px) 50vw, 33vw" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {members.length > 0 ? (
        <section aria-labelledby="club-players" className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <h2 id="club-players" className="title-caps text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">{t.players.theirPlayers}</h2>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {members.map((m) => (
              <li key={m.slug}>
                <Link to={personHref(cat, m)} className="inline-flex min-h-12 items-baseline gap-2 font-display text-[clamp(1.5rem,3vw,2.5rem)] uppercase tracking-[0.05em] text-white hover:text-rose-light">
                  {m.number !== null ? <span className="text-rose-gold text-xl">{m.number}</span> : null}
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}


      {/* A person known from the stories only: the button above opens them (no bubbles of stories any more, Yoni 23/11/2026). */}
      {open !== null ? <StoryViewer stories={stories} start={open} onClose={() => setOpen(null)} /> : null}

      <ContactBlock pieceName={pieces[0]?.title} compact id="player-contact" />
    </>
  );
}
