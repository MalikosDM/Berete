/* The films of the pieces in the page: which copy to play, and the films of the finished pieces already seen. */

/** The lighter copies: phones, a computer saving data or on a slow connection. */
export function wantsLight(): boolean {
  if (window.matchMedia("(max-width: 1023px)").matches) return true;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(c?.saveData) || /(^|-)(2g|3g)$/.test(c?.effectiveType ?? "");
}

const SEEN_KEY = "berete:films";

function seenList(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/** The film of the finished piece opens its page once per visit (src/components/PieceFilm.tsx). */
export function filmSeen(slug: string): boolean {
  return seenList().includes(slug);
}

export function markFilmSeen(slug: string): void {
  try {
    const seen = seenList().filter((s) => s !== slug);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, slug].slice(-60)));
  } catch {
    /* private browsing: it opens again next time */
  }
}
