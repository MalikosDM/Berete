/*
 * The official logos of the clubs (src/assets/clubs/<slug of the club>.svg: the file of the club itself, never redrawn
 * nor changed), shown in "Created exclusively for" on the page of a piece made for the club. Adding the file of another
 * club ("vfb-stuttgart.svg", named after its page in the catalogue) is enough to show it. Today: Inter Milan only (its
 * logo of 2021, FC Internazionale Milano / Bureau Borsche). Their use is to be confirmed by Yoni (CLAUDE.md).
 */
// "?no-inline": the file itself, served as it is (never turned into text inside the code).
const files = import.meta.glob("../assets/clubs/*.svg", { eager: true, query: "?no-inline", import: "default" }) as Record<string, string>;

const LOGOS: Record<string, string> = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split("/").pop()!.replace(/\.svg$/, ""), url]));

/** The address of the official logo of a club, or null. */
export function clubLogo(slug: string): string | null {
  return LOGOS[slug] ?? null;
}
