import BrandIcon from "@/components/BrandIcon";
import { Img } from "@/components/Media";
import { initials, instagramOf, portraitOf } from "@/data/relations";
import type { Catalogue, Person } from "@/data/types";
import { Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { coverSrcSet } from "@/lib/responsive";

/**
 * The photo of a person: their profile photo, else the best photo of them from the stories (cropped on them), else
 * their initials in rose gold.
 */
export function PlayerPortrait({ person, className = "", sizes = "96px", big = false }: { person: Person; className?: string; sizes?: string; big?: boolean }) {
  const { t } = useI18n();
  const cat = useCatalogue();
  const src = portraitOf(cat, person);
  if (!src) {
    return (
      <span aria-hidden="true" data-initials className={"flex items-center justify-center bg-ink-soft " + className}>
        <span className={"text-rose-gold font-display font-light " + (big ? "text-[clamp(5rem,14vw,10rem)]" : "text-[clamp(2.25rem,6vw,3.5rem)]")}>{initials(person.name)}</span>
      </span>
    );
  }
  return <Img src={src} srcSet={coverSrcSet(src)} sizes={sizes} alt={t.players.portrait(person.name)} loading="lazy" decoding="async" className={"object-cover " + className} />;
}

/** People with a photo first, in their order: the wall of the home page starts with faces. */
export function facesFirst(people: Person[], cat: Catalogue): Person[] {
  return [...people.filter((p) => portraitOf(cat, p) !== ""), ...people.filter((p) => portraitOf(cat, p) === "")];
}

/**
 * The wall of the players: one portrait per person (photo, name, club, Instagram). `compact`: the smaller wall of the
 * home page (three columns on phones).
 */
export default function PlayerWall({ people, compact = false }: { people: Person[]; compact?: boolean }) {
  const { t } = useI18n();
  const columns = compact ? "grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-4 sm:gap-x-5 lg:grid-cols-6" : "grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 xl:grid-cols-5";
  const sizes = compact ? "(max-width: 639px) 31vw, (max-width: 1023px) 23vw, 15vw" : "(max-width: 639px) 46vw, (max-width: 1023px) 31vw, (max-width: 1279px) 23vw, 18vw";
  return (
    <ul data-player-wall className={"grid " + columns}>
      {people.map((p) => {
        const instagram = instagramOf(p);
        const role = p.kind === "club" ? t.players.club : p.kind === "personality" ? t.players.personality : p.club;
        return (
          <li key={p.slug} data-player-card={p.slug} className="group relative">
            <Link to={"/players/" + p.slug} className="block">
              <span className="relative block aspect-[4/5] overflow-hidden border border-white/10 bg-ink-soft">
                <PlayerPortrait person={p} sizes={sizes} className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-t from-ink/60 to-transparent" />
              </span>
              {/* Three narrow columns on phones: the names in plain letters, so that long names keep whole words. */}
              <span
                className={
                  "mt-4 flex items-baseline gap-2 leading-[1.15] text-white transition-colors group-hover:text-rose-light " +
                  (compact ? "text-base font-medium max-sm:mt-3 sm:font-display sm:text-xl sm:font-normal sm:uppercase sm:tracking-[0.05em]" : "font-display text-xl uppercase tracking-[0.05em] sm:text-2xl")
                }
              >
                {p.number !== null ? <span className="text-rose-gold shrink-0">{p.number}</span> : null}
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
