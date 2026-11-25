import BrandIcon from "@/components/BrandIcon";
import { Img } from "@/components/Media";
import { initials, instagramOf, personHref, portraitOf } from "@/data/relations";
import type { Catalogue, Person } from "@/data/types";
import { Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { coverSrcSet } from "@/lib/responsive";

/**
 * The photo of a person (4:5): their profile photo (by default their photo in their jersey), else the best photo of them
 * from the stories (cropped on them), else their initials in rose gold. It fades in once loaded, in a box of fixed size.
 * `priority`: the portrait at the top of their page, downloaded first.
 */
export function PlayerPortrait({ person, className = "", sizes = "96px", big = false, priority = false }: { person: Person; className?: string; sizes?: string; big?: boolean; priority?: boolean }) {
  const { t } = useI18n();
  const cat = useCatalogue();
  const src = portraitOf(cat, person);
  if (!src) {
    return (
      <span aria-hidden="true" data-initials className={"flex items-center justify-center bg-ink-soft " + className}>
        <span className={"text-rose-gold font-display font-light " + (big ? "text-[clamp(5rem,14vw,10rem)]" : "t-title")}>{initials(person.name)}</span>
      </span>
    );
  }
  return (
    <Img
      src={src}
      srcSet={coverSrcSet(src)}
      sizes={sizes}
      alt={t.players.portrait(person.name)}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      fade
      className={"object-cover " + className}
    />
  );
}

/** People with a photo first, in their order: the wall of the home page starts with faces. */
export function facesFirst(people: Person[], cat: Catalogue): Person[] {
  return [...people.filter((p) => portraitOf(cat, p) !== ""), ...people.filter((p) => portraitOf(cat, p) === "")];
}

/**
 * The wall of the players: one portrait per person (photo, name, club, Instagram). `compact`: the smaller wall of the
 * home page (three columns on phones). A click leads straight to the capsule of their piece (their page when they have
 * several: src/data/relations.ts, personHref).
 */
export default function PlayerWall({ people, compact = false }: { people: Person[]; compact?: boolean }) {
  const { t } = useI18n();
  const cat = useCatalogue();
  const houseClubs = new Set(cat.people.filter((x) => x.kind === "club").map((x) => x.name));
  // Four on a row on a computer, smaller (Yoni, 24/11/2026).
  const columns = compact ? "grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-4 sm:gap-x-5 lg:grid-cols-7 lg:gap-x-6" : "grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6";
  const sizes = compact ? "(max-width: 639px) 31vw, (max-width: 1023px) 23vw, 13vw" : "(max-width: 639px) 46vw, (max-width: 1023px) 31vw, 18rem";
  return (
    <ul data-player-wall className={"grid " + columns}>
      {people.map((p) => {
        const instagram = instagramOf(p);
        // One rule for every card (25/11/2026): the name, and under it the club only when it is a club of the house (Inter
        // Milan, VfB Stuttgart); the number of the jersey only on the page of the player.
        const role = p.kind === "player" && p.club && houseClubs.has(p.club) ? p.club : null;
        return (
          <li key={p.slug} data-player-card={p.slug} className="group relative">
            <Link to={personHref(cat, p)} data-player-link className="block">
              <span className="relative block aspect-[4/5] overflow-hidden border border-white/10 bg-ink-soft">
                <PlayerPortrait person={p} sizes={sizes} className="h-full w-full transition-[opacity,transform] duration-700 group-hover:scale-105" />
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-t from-ink/60 to-transparent" />
              </span>
              {/* Three narrow columns on phones: the names in plain letters, so that long names keep whole words. */}
              <span
                className={
                  "mt-3 flex items-baseline gap-2 leading-[1.15] text-white transition-colors group-hover:text-rose-light " +
                  (compact ? "text-base font-medium max-sm:mt-3 sm:font-display sm:text-lg sm:font-normal sm:uppercase sm:tracking-[0.05em]" : "font-display text-base uppercase tracking-[0.06em] sm:text-lg")
                }
              >
                <span className="min-w-0 break-words">{p.name}</span>
              </span>
              {role ? <span className="mt-1 block text-base text-mist">{role}</span> : null}
            </Link>
            {instagram ? (
              <a
                href={instagram}
                target="_blank"
                rel="noreferrer"
                data-player-instagram
                aria-label={t.players.instagramOf(p.name)}
                className="absolute end-2 top-2 inline-flex size-12 items-center justify-center rounded-full border border-white/25 bg-ink/70 text-white backdrop-blur-sm transition-colors hover:border-rose-light hover:text-rose-light"
              >
                <BrandIcon name="instagram" className="size-5" />
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
