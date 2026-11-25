import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { ArrowLeft, Play } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import ContactBlock from "@/components/ContactBlock";
import { MediaView } from "@/components/Media";
import PieceThumb from "@/components/PieceThumb";
import PageIntro from "@/components/PageIntro";
import PlayerWall, { PlayerPortrait } from "@/components/PlayerWall";
import SplitHeading from "@/components/SplitHeading";
import { primeStoryVideo } from "@/components/stories/player";
import StoryViewer from "@/components/stories/StoryViewer";
import { defaultCatalogue } from "@/data/catalogue";
import { boxesOf, findPerson, instagramOf, leftTheCircle, mediaOfPiece, membersOf, personHref, photosOf, pieceVisualFor, piecesOf, storiesOf } from "@/data/relations";
import { BOX_PEOPLE } from "@/data/pieces";
import BoxSection from "@/components/BoxSection";
import type { PersonKind } from "@/data/types";
import { Link, Navigate, useI18n, useMadeFor } from "@/i18n";
import { CardLine, EnterWorld } from "@/components/PieceGrid";
import { useCatalogue } from "@/lib/catalogue";
import NotFound from "@/pages/NotFound";

const GROUPS: PersonKind[] = ["player", "club", "personality"];

export default function Players() {
  const { t } = useI18n();
  const { people } = useCatalogue();
  return (
    <>
      <PageIntro eyebrow={t.players.eyebrow} title={t.players.title} lead={t.players.lead} compact oneLine />

      <section aria-label={t.players.listLabel} className="wrap pt-8 pb-20  lg:pb-28">
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
  const madeFor = useMadeFor();
  const [open, setOpen] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const person = findPerson(cat, slug);
  // One of their stories asked by its address (/players/<person>?story=<story>): opened at once (24/11/2026: the stories live
  // on the profiles only, never on the pages of the pieces).
  const [params] = useSearchParams();
  const asked = params.get("story");
  useEffect(() => {
    if (!asked || !person) return;
    const list = storiesOf(cat, person.slug);
    const i = list.findIndex((s) => s.slug === asked);
    if (i < 0) return;
    // "&piece=<piece>": on the moment that shows that piece.
    const shown = cat.pieces.find((p) => p.slug === params.get("piece"));
    const files = new Set(shown ? mediaOfPiece(shown).map((m) => m.src) : []);
    const at = Math.max(0, list[i]!.media.findIndex((m) => files.has(m.src)));
    primeStoryVideo(list[i]!, at);
    const frame = window.requestAnimationFrame(() => {
      setStep(at);
      setOpen(i);
    });
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per story asked
  }, [asked, person?.slug]);
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
      <section data-player-hero className="wrap pt-24 pb-10  lg:pt-32 lg:pb-12">
        <Link to="/players" data-cta className="btn-secondary text-bone">
          <ArrowLeft className="size-3.5 rtl:-scale-x-100" aria-hidden="true" /> {t.nav.players}
        </Link>
        <div className="mt-6 grid items-end gap-8 lg:mt-8 lg:grid-cols-12 lg:gap-14">
          <div data-player-portrait className="mx-auto w-full max-w-sm lg:col-span-4 lg:max-w-none">
            <PlayerPortrait person={person} big priority sizes="(max-width: 1023px) 92vw, 26rem" className="aspect-[4/5] w-full border border-white/10" />
          </div>
          <div className="min-w-0 lg:col-span-8 lg:col-start-5 lg:pb-4">
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
            {person.bio ? <p data-player-bio className="mt-6 max-w-2xl text-base leading-relaxed text-bone">{person.bio}</p> : null}
            {instagram ? (
              <a href={instagram} target="_blank" rel="noreferrer" data-player-instagram className="mt-6 inline-flex min-h-12 w-fit items-center gap-3 text-base font-medium text-white hover:text-rose-light">
                <BrandIcon name="instagram" className="size-5" /> @{person.instagram}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {pieces.length > 0 ? (
        <section aria-labelledby="player-pieces" data-player-pieces className="wrap scroll-mt-32 pb-16  lg:pb-20">
          <h2 id="player-pieces" className="title-caps tracking-[0.12em] t-title ">{person.kind === "club" ? t.players.clubPieces(pieces.length) : t.players.pieces(pieces.length)}</h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
            {pieces.map((p) => {
              const visual = pieceVisualFor(p, person);
              return (
                <li key={p.slug}>
                  <Link to={"/pieces/" + p.slug} data-player-piece={p.slug} className="group block">
                    {/* The same card as everywhere (25/11/2026): the jewel on the black, at the same share of its frame; their own
                        ring (a photo of it), its edges fading into the page. */}
                    <span data-thumb-frame className="relative block aspect-[4/5] overflow-hidden bg-ink">
                      {visual === p.cover ? (
                        <span className="absolute inset-0 transition-opacity duration-700 group-hover:opacity-90">
                          <PieceThumb piece={p} sizes="(max-width: 1023px) 46vw, 18rem" />
                        </span>
                      ) : (
                        <span className="thumb-fade absolute inset-0 p-4 transition-opacity duration-700 group-hover:opacity-90">
                          <MediaView item={visual} alt={visual.alt ?? p.title} fit="contain" sizes="(max-width: 1023px) 46vw, 18rem" />
                        </span>
                      )}
                    </span>
                    <span data-piece-name className="title-caps mt-3 block text-base tracking-[0.08em] break-words text-white [text-wrap:balance] group-hover:text-rose-light lg:text-[1.0625rem]">{p.title}</span>
                    <CardLine piece={p} who={madeFor(cat, p)} />
                    <span data-enter-world data-cta className="card-enter group-hover:text-rose-light">
                      <EnterWorld text={t.common.enterWorld} />
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
        <section aria-labelledby="player-photos" data-player-moments className="wrap pb-20 lg:pb-28">
          <h2 id="player-photos" className="title-caps tracking-[0.12em] t-title ">{t.players.photos}</h2>
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
              data-cta
              className="btn-primary mt-10"
            >
              <Play className="size-4 fill-current" aria-hidden="true" /> {t.players.watch(stories.length)}
            </button>
          ) : null}
        </section>
      ) : null}

      {members.length > 0 ? (
        <section aria-labelledby="club-players" className="wrap pb-20 lg:pb-28">
          <h2 id="club-players" className="title-caps tracking-[0.12em] t-title ">{t.players.theirPlayers}</h2>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {members.map((m) => (
              <li key={m.slug}>
                <Link to={personHref(cat, m)} className="inline-flex min-h-12 items-baseline gap-2 font-display t-lead uppercase tracking-[0.05em] text-white hover:text-rose-light">
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}


      {/* A person known from the stories only: the button above opens them (no bubbles of stories any more, Yoni 23/11/2026). */}
      {open !== null ? <StoryViewer stories={stories} start={open} startStep={step} onClose={() => { setOpen(null); setStep(0); }} /> : null}

      <ContactBlock pieceName={pieces[0]?.title} compact id="player-contact" />
    </>
  );
}
