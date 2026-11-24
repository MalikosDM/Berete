import { useState } from "react";
import { useParams } from "react-router";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import ContactBlock from "@/components/ContactBlock";
import { MediaView } from "@/components/Media";
import PageIntro from "@/components/PageIntro";
import PlayerWall, { PlayerPortrait } from "@/components/PlayerWall";
import SplitHeading from "@/components/SplitHeading";
import { primeStoryVideo } from "@/components/stories/player";
import StoryViewer from "@/components/stories/StoryViewer";
import { defaultCatalogue } from "@/data/catalogue";
import { boxesOf, findPerson, instagramOf, leftTheCircle, membersOf, personHref, photosOf, pieceVisualFor, piecesOf, storiesOf } from "@/data/relations";
import { BOX_PEOPLE } from "@/data/pieces";
import BoxSection from "@/components/BoxSection";
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
      <PageIntro eyebrow={t.players.eyebrow} title={t.players.title} lead={t.players.lead} compact oneLine />

      <section aria-label={t.players.listLabel} className="mx-auto max-w-[1240px] px-5 pt-8 pb-20 sm:px-8 lg:px-12 lg:pb-28">
        {GROUPS.map((kind) => {
          const list = people.filter((p) => p.kind === kind);
          if (list.length === 0) return null;
          return (
            <div key={kind} className="mt-14 first:mt-0">
              <h2 className="eyebrow mb-6">{t.players.groups[kind]}</h2>
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
  const boxes = boxesOf(cat, person.slug, BOX_PEOPLE);
  const kindLabel = person.kind === "club" ? t.players.club : person.kind === "personality" ? t.players.personality : person.club;
  const instagram = instagramOf(person);

  // Their moments (the stories that show them) open from the button of their photos.
  const openStory = (i: number) => {
    primeStoryVideo(stories[i]!);
    setOpen(i);
  };

  return (
    <>
      {/* One model for every profile (Yoni, 23/11/2026): their portrait large, who they are (club, number), their words and
          their Instagram when known, then all their pieces, then their photos and their moments. A part not known yet is
          simply not there (no empty frame, no generic sentence). */}
      <section data-player-hero className="mx-auto max-w-[1240px] px-5 pt-24 pb-10 sm:px-8 lg:px-12 lg:pt-32 lg:pb-12">
        <Link to="/players" className="inline-flex min-h-12 items-center gap-2 text-base font-medium uppercase tracking-[0.16em] text-bone hover:text-rose-light">
          <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" /> {t.common.allPlayers}
        </Link>
        <div className="mt-6 grid items-end gap-8 lg:mt-8 lg:grid-cols-12 lg:gap-14">
          <div data-player-portrait className="mx-auto w-full max-w-sm lg:col-span-4 lg:max-w-none">
            <PlayerPortrait person={person} big priority sizes="(max-width: 1023px) 92vw, 26rem" className="aspect-[4/5] w-full border border-white/10" />
          </div>
          <div className="min-w-0 lg:col-span-7 lg:col-start-6 lg:pb-4">
            {kindLabel ? <p data-player-club className="eyebrow">{kindLabel}</p> : null}
            <SplitHeading as="h1" className="mt-3 t-hero tracking-[0.05em] break-words">
              {person.name}
            </SplitHeading>
            {person.number !== null ? (
              <p data-player-number className="mt-4 flex items-baseline gap-3">
                <span className="text-base font-medium uppercase tracking-[0.24em] text-bone">{t.players.number}</span>
                <span className="text-rose-gold font-display t-lead leading-none font-light">{person.number}</span>
              </p>
            ) : null}
            {person.bio ? <p data-player-bio className="mt-6 max-w-2xl text-base leading-relaxed text-bone lg:text-[0.9375rem]">{person.bio}</p> : null}
            {instagram ? (
              <a href={instagram} target="_blank" rel="noreferrer" data-player-instagram className="mt-6 inline-flex min-h-12 w-fit items-center gap-3 text-base font-medium text-white hover:text-rose-light">
                <BrandIcon name="instagram" className="size-5" /> @{person.instagram}
              </a>
            ) : null}
            {pieces.length > 0 ? (
              <a href="#player-pieces" className="mt-6 flex min-h-12 w-fit items-center gap-3 border border-rose-light/70 px-5 text-base font-normal uppercase tracking-[0.14em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-10 lg:text-[0.8125rem]">
                {t.players.pieces(pieces.length)} <ArrowRight className="size-4 rotate-90" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {pieces.length > 0 ? (
        <section aria-labelledby="player-pieces" data-player-pieces className="mx-auto max-w-[1240px] scroll-mt-32 px-5 pb-16 sm:px-8 lg:px-12 lg:pb-20">
          <h2 id="player-pieces" className="title-caps t-title tracking-[0.14em]">{t.players.pieces(pieces.length)}</h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
            {pieces.map((p) => {
              const visual = pieceVisualFor(p, person);
              return (
                <li key={p.slug}>
                  <Link to={"/pieces/" + p.slug} data-player-piece={p.slug} className="group block">
                    <span className="relative block aspect-[4/5] overflow-hidden border border-white/10 bg-ink">
                      <span className="absolute inset-0 p-4 transition-transform duration-[1.6s] group-hover:scale-105">
                        <MediaView item={visual} fit="contain" sizes="(max-width: 1023px) 46vw, 18rem" />
                      </span>
                    </span>
                    <span className="title-caps mt-3 block text-base tracking-[0.08em] break-words text-white [text-wrap:balance] group-hover:text-rose-light lg:text-[1.0625rem]">{p.title}</span>
                    <span className="mt-1 block text-base text-mist">{visual.caption && visual !== p.cover ? visual.caption : t.types[p.type]}</span>
                    <span className="mt-1 inline-flex min-h-11 items-center gap-2 text-[0.8125rem] font-normal uppercase tracking-[0.14em] text-white group-hover:text-rose-light max-sm:text-base max-sm:tracking-[0.06em] lg:min-h-10 lg:text-[0.75rem]">
                      {t.common.enterWorld} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Their trunks (Yoni, 23/11/2026): those of their pieces, and the one made for them before its piece is known. */}
      <BoxSection boxes={boxes} title={t.players.trunks(boxes.length)} id="player-trunks" />

      {photos.length > 0 || stories.length > 0 ? (
        <section aria-labelledby="player-photos" data-player-moments className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <h2 id="player-photos" className="title-caps t-title tracking-[0.14em]">{photos.length > 0 ? t.players.photos : t.players.stories}</h2>
          {photos.length > 0 ? (
            <ul data-player-photos className="mt-10 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {photos.map((m, i) => (
                <li key={m.src} className="relative aspect-[4/5] overflow-hidden border border-white/10 bg-ink-soft">
                  <MediaView item={m} alt={t.players.photoNamed[m.src.match(/\/media\/extra\/players\/[^/]+\/([a-z-]+)\./)?.[1] ?? ""] ?? t.players.photo(person.name, i + 1)} fit="cover" fade sizes="(max-width: 1023px) 50vw, 33vw" />
                </li>
              ))}
            </ul>
          ) : null}
          {stories.length > 0 ? (
            <button
              type="button"
              onClick={() => openStory(0)}
              data-player-watch
              className="mt-10 flex min-h-12 w-fit items-center gap-3 border border-white/40 px-6 text-base font-medium uppercase tracking-[0.14em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-11 lg:text-[0.8125rem]"
            >
              <Play className="size-5 fill-current" aria-hidden="true" /> {t.players.watch(stories.length)}
            </button>
          ) : null}
        </section>
      ) : null}

      {members.length > 0 ? (
        <section aria-labelledby="club-players" className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
          <h2 id="club-players" className="title-caps t-title tracking-[0.14em]">{t.players.theirPlayers}</h2>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {members.map((m) => (
              <li key={m.slug}>
                <Link to={personHref(cat, m)} className="inline-flex min-h-12 items-baseline gap-2 font-display t-lead uppercase tracking-[0.05em] text-white hover:text-rose-light">
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
