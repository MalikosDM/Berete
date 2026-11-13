import { useState } from "react";
import { useParams } from "react-router";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import ContactBlock from "@/components/ContactBlock";
import { Img, MediaView } from "@/components/Media";
import { coverSrcSet, SIZES_FOR } from "@/lib/responsive";
import PageIntro from "@/components/PageIntro";
import PlayerWall, { PlayerPortrait } from "@/components/PlayerWall";
import SplitHeading from "@/components/SplitHeading";
import { primeStoryVideo } from "@/components/stories/player";
import StoryViewer from "@/components/stories/StoryViewer";
import { findPerson, instagramOf, membersOf, pieceVisualFor, piecesOf, storiesOf } from "@/data/relations";
import type { PersonKind } from "@/data/types";
import { Link, useI18n } from "@/i18n";
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
  if (!person) return <NotFound />;

  const stories = storiesOf(cat, person.slug);
  const pieces = piecesOf(cat, person.slug);
  const members = membersOf(cat, person);
  const kindLabel = person.kind === "club" ? t.players.club : person.kind === "personality" ? t.players.personality : person.club;
  const instagram = instagramOf(person);

  return (
    <>
      <section className="mx-auto grid max-w-[1600px] gap-12 px-5 pt-32 pb-20 sm:px-8 lg:grid-cols-12 lg:px-12 lg:pt-40 lg:pb-28">
        <div className="lg:col-span-5">
          <PlayerPortrait person={person} big sizes="(max-width: 1023px) 100vw, 40vw" className="aspect-[4/5] w-full" />
        </div>
        <div className="flex flex-col justify-center lg:col-span-6 lg:col-start-7">
          <Link to="/players" className="inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-bone hover:text-rose-light">
            <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" /> {t.common.allPlayers}
          </Link>
          {kindLabel ? <p className="eyebrow mt-8">{kindLabel}</p> : null}
          <SplitHeading as="h1" className="mt-5 text-[clamp(2.5rem,7vw,6.5rem)] tracking-[0.05em]">
            {person.name}
          </SplitHeading>
          {person.number !== null ? (
            <p className="mt-6 flex items-baseline gap-4">
              <span className="text-base font-semibold uppercase tracking-[0.24em] text-bone">{t.players.number}</span>
              <span className="text-rose-gold font-display text-[clamp(4rem,10vw,8rem)] leading-none font-light">{person.number}</span>
            </p>
          ) : null}
          <p className="mt-8 max-w-xl text-lg text-bone">
            {person.bio || (pieces.length > 0 ? t.players.bioWithPieces(person.name) : t.players.bioStories(person.name))}
          </p>
          {instagram ? (
            <a href={instagram} target="_blank" rel="noreferrer" data-player-instagram className="mt-6 inline-flex min-h-12 w-fit items-center gap-3 text-base font-semibold text-white hover:text-rose-light">
              <BrandIcon name="instagram" className="size-5" /> @{person.instagram}
            </a>
          ) : null}
          {stories.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                primeStoryVideo(stories[0]!);
                setOpen(0);
              }}
              className="mt-10 inline-flex min-h-14 w-fit items-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:bg-rose-light"
            >
              <Play className="size-5 fill-current" aria-hidden="true" /> {t.players.watch(stories.length)}
            </button>
          ) : null}
        </div>
      </section>

      {pieces.length > 0 ? (
        <section aria-labelledby="player-pieces" className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <h2 id="player-pieces" className="title-caps text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">{t.players.pieces(pieces.length)}</h2>
          <ul className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {pieces.map((p) => {
              const visual = pieceVisualFor(p, person);
              return (
                <li key={p.slug}>
                  <Link to={"/pieces/" + p.slug} className="group block">
                    <span className="relative block aspect-[4/5] overflow-hidden bg-ink">
                      <span className="absolute inset-0 p-4 transition-transform duration-[1.6s] group-hover:scale-105">
                        <MediaView item={visual} fit="contain" sizes={SIZES_FOR.grid3} />
                      </span>
                    </span>
                    <span className="title-caps mt-5 block text-2xl tracking-[0.08em] break-words text-white [text-wrap:balance] group-hover:text-rose-light">{p.title}</span>
                    <span className="mt-2 inline-flex min-h-12 items-center gap-2 text-base text-mist group-hover:text-rose-light">
                      {visual.caption && visual !== p.cover ? visual.caption : t.types[p.type]} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {stories.length > 0 ? (
        <section aria-labelledby="player-stories" className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <h2 id="player-stories" className="title-caps text-[clamp(2rem,5vw,4rem)] tracking-[0.14em]">{t.players.stories}</h2>
          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {stories.map((s, i) => (
              <li key={s.slug}>
                <button
                  type="button"
                  data-player-story={s.slug}
                  onClick={() => {
                    primeStoryVideo(s);
                    setOpen(i);
                  }}
                  className="group block w-full text-start"
                >
                  <span className="relative block aspect-square overflow-hidden rounded-full bg-rose-gold p-[2px]">
                    <span className="block h-full w-full overflow-hidden rounded-full border-2 border-ink">
                      <Img src={s.cover} srcSet={coverSrcSet(s.cover)} sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20vw" alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    </span>
                  </span>
                  <span data-story-title className="mt-3 block text-center text-base font-medium text-white group-hover:text-rose-light">{s.title}</span>
                  <span className="block text-center text-base text-mist">
                    {t.players.moments(s.media.length)}
                  </span>
                </button>
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
                <Link to={"/players/" + m.slug} className="inline-flex min-h-12 items-baseline gap-2 font-display text-[clamp(1.5rem,3vw,2.5rem)] uppercase tracking-[0.05em] text-white hover:text-rose-light">
                  {m.number !== null ? <span className="text-rose-gold text-xl">{m.number}</span> : null}
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {open !== null ? <StoryViewer stories={stories} start={open} onClose={() => setOpen(null)} /> : null}

      <ContactBlock pieceName={pieces[0]?.title} compact id="player-contact" />
    </>
  );
}
