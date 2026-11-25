import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { LoopVideo, MediaView } from "@/components/Media";
import Reveal from "@/components/Reveal";
import films from "@/data/mechanisms.generated.json" with { type: "json" };
import { featureFilm } from "@/data/featureFilms";
import { SPECIAL_PROJECT } from "@/data/pieces";
import type { MediaItem, Piece } from "@/data/types";
import { Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";

/** A photo of a piece by its address, else null. */
function photoOf(piece: Piece, src: string): MediaItem | null {
  if (!src) return null;
  return [piece.cover, ...piece.gallery].find((m) => m.src === src) ?? null;
}

/** "The top lifts off": a championship ring, closed, then open on its trophy (hover on a computer, the button everywhere). */
function LiftingRing({ piece, trophy, closed, open }: { piece: Piece; trophy: string; closed: MediaItem; open: MediaItem }) {
  const { t } = useI18n();
  const [lifted, setLifted] = useState(false);
  const lift = lifted ? t.home.closeTop : t.home.liftTop;
  return (
    <li data-lifting-ring={piece.slug} className="flex flex-col">
      {/* The ring itself lifts its top (hover on a computer, a touch everywhere); one button on the card: its world (25/11/2026). */}
      <button
        type="button"
        onClick={() => setLifted((v) => !v)}
        aria-pressed={lifted}
        aria-label={lift + " · " + piece.title}
        className="group relative block aspect-square w-full cursor-pointer overflow-hidden border border-white/10 bg-ink"
      >
        <span className={"absolute inset-0 p-4 transition-opacity duration-700 sm:p-6 " + (lifted ? "opacity-0" : "md:group-hover:opacity-0")}>
          <MediaView item={closed} fit="contain" sizes="(max-width: 767px) 92vw, 30vw" />
        </span>
        <span className={"absolute inset-0 p-4 transition-opacity duration-700 sm:p-6 " + (lifted ? "opacity-100" : "opacity-0 md:group-hover:opacity-100")}>
          <MediaView item={open} fit="contain" sizes="(max-width: 767px) 92vw, 30vw" />
        </span>
      </button>
      <p className="eyebrow mt-4">{piece.client ?? piece.title}</p>
      <p className="title-caps mt-2 text-xl tracking-[0.08em] text-white">{trophy}</p>
      <Link to={"/pieces/" + piece.slug} data-cta className="btn-secondary mt-2 text-bone">
        {t.common.enterWorld} <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
      </Link>
    </li>
  );
}

/**
 * "Engineering the Extraordinary" (Yoni, 23/11/2026), on the page The Atelier: the mechanisms of the house, each with the
 * films and photos that exist. Today the Spirit Bomb of the Dragon Ball pendant that rotates, and the top of the
 * championship rings that lifts off (it was on the home page), the cross of Malik Tillman whose centre turns. The ring
 * that opens will come with its film: a mechanism without its media is not shown (never an empty block).
 */
export default function Mechanisms() {
  const { t } = useI18n();
  const cat = useCatalogue();
  const sphere = films["dragon-ball-sphere"];
  const dragon = cat.pieces.find((p) => p.slug === "kevin-schade-dragon-ball-pendant");
  // The cross of Malik Tillman whose centre turns (Yoni, 23/11/2026: « un détail très important »).
  const crossFilm = featureFilm("tillman-cross-spin");
  const cross = cat.pieces.find((p) => p.slug === "malik-tillman-cross-pendant");
  const rings = SPECIAL_PROJECT.map((r) => {
    const piece = cat.pieces.find((p) => p.slug === r.slug);
    const closed = piece ? (photoOf(piece, r.closed) ?? piece.cover) : null;
    const open = piece ? photoOf(piece, r.open) : null;
    return piece && closed && open ? { ...r, piece, closed, open } : null;
  }).filter((r) => r !== null);
  if (!(sphere && dragon) && rings.length === 0) return null;

  return (
    <section aria-labelledby="engineering-title" data-engineering className="relative z-20 border-t border-white/10 bg-ink">
      <div className="mx-auto max-w-[1600px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <Reveal>
          <p className="eyebrow">{t.atelier.engineering.eyebrow}</p>
          <h2 id="engineering-title" className="title-caps tracking-[0.12em] mt-5 max-w-4xl t-title leading-[1.08] text-white [text-wrap:balance]">
            {t.atelier.engineering.title}
          </h2>
          <p className="mt-6 max-w-2xl text-base text-bone">{t.atelier.engineering.lead}</p>
        </Reveal>

        {sphere && dragon ? (
          <article data-mechanism="sphere" className="mt-16 grid items-center gap-10 border-t border-white/10 pt-14 lg:grid-cols-12 lg:gap-16">
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:col-span-7">
              <div className="relative aspect-square overflow-hidden border border-white/10 bg-ink-soft">
                <LoopVideo item={{ type: "video", src: sphere.video, poster: sphere.poster, width: sphere.width, height: sphere.height }} label={t.atelier.engineering.sphereFilm} className="h-full w-full object-cover" />
              </div>
              <div className="relative aspect-square overflow-hidden border border-white/10 bg-ink">
                <span className="absolute inset-0 p-4">
                  <MediaView item={dragon.cover} alt={dragon.title} fit="contain" sizes="(max-width: 1023px) 46vw, 28vw" />
                </span>
              </div>
            </div>
            <div className="lg:col-span-5">
              <span aria-hidden="true" className="text-rose-gold font-display text-3xl">01</span>
              <h3 className="title-caps mt-3 t-lead leading-[1.15] tracking-[0.08em] text-white">{t.atelier.engineering.sphereTitle}</h3>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-bone">{t.atelier.engineering.sphereText}</p>
              <Link to={"/pieces/" + dragon.slug} className="mt-6 inline-flex min-h-12 items-center gap-2 text-base font-medium uppercase tracking-[0.14em] text-white hover:text-rose-light">
                {t.common.enterWorld} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </div>
          </article>
        ) : null}

        {rings.length > 0 ? (
          <article data-mechanism="lift" className="mt-16 grid gap-10 border-t border-white/10 pt-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <span aria-hidden="true" className="text-rose-gold font-display text-3xl">{sphere && dragon ? "02" : "01"}</span>
              <h3 className="title-caps mt-3 t-lead leading-[1.15] tracking-[0.08em] text-white">{t.atelier.engineering.liftTitle}</h3>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-bone">{t.atelier.engineering.liftText}</p>
            </div>
            <ul className="grid gap-8 sm:grid-cols-2 lg:col-span-7">
              {rings.map((r) => (
                <LiftingRing key={r.slug} piece={r.piece} trophy={r.trophy} closed={r.closed} open={r.open} />
              ))}
            </ul>
          </article>
        ) : null}

        {crossFilm && cross ? (
          <article data-mechanism="cross" className="mt-16 grid items-center gap-10 border-t border-white/10 pt-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5 lg:order-2 lg:col-start-8">
              <span aria-hidden="true" className="text-rose-gold font-display text-3xl">{String(1 + (sphere && dragon ? 1 : 0) + (rings.length > 0 ? 1 : 0)).padStart(2, "0")}</span>
              <h3 className="title-caps mt-3 t-lead leading-[1.15] tracking-[0.08em] text-white">{t.atelier.engineering.crossTitle}</h3>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-bone">{t.feature.crossText}</p>
              <p className="mt-3 text-base text-mist">{cross.title}</p>
              <Link to={"/pieces/" + cross.slug} className="mt-6 inline-flex min-h-12 items-center gap-2 text-base font-medium uppercase tracking-[0.14em] text-white hover:text-rose-light">
                {t.common.enterWorld} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </div>
            <div className="flex justify-center lg:col-span-6 lg:order-1">
              <div className="relative aspect-[9/16] h-[min(80svh,calc((100vw-2.5rem)*16/9))] max-w-full overflow-hidden border border-white/10 bg-black">
                <LoopVideo item={{ type: "video", src: crossFilm.mobile ?? crossFilm.video, poster: crossFilm.poster, width: crossFilm.width, height: crossFilm.height }} label={t.feature.crossLabel} className="h-full w-full object-contain" />
              </div>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
