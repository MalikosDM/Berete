/*
 * The permanent redirects of the site without its server (Vercel), written into vercel.json from the catalogue:
 *   npm run redirects
 * - an unpublished piece (removed from the catalogue, or a draft) -> the page of its player still in the circle, else
 *   /creations;
 * - a person who left the circle (all their pieces unpublished) -> /players;
 * - a renamed piece (RENAMED_PIECES: two pieces become one, a new address) -> its page;
 * - the address of a box (a box removed by Yoni, 21/11/2026, or any other: the boxes have no page of their own) -> /boxes;
 * - a sub-category under its old address (/creations/jesus-pieces, until 22/11/2026) -> its place in its collection;
 * in every language. With the server, server/index.ts does the same from the base. Run it again after publishing or
 * unpublishing a piece in src/data/pieces.ts (tests/identity.spec.ts checks that vercel.json is up to date).
 *
 * Since the site lives on its own server at its domain (MOVED_TO, 25/11/2026), every address of Vercel leads there (301),
 * the same address on the domain: the redirects above go straight to their page there, and every other address to itself
 * on the domain. Vercel never competes with the real site again. MOVED_TO = "" brings the site back on Vercel.
 */
import fs from "node:fs";
import path from "node:path";
import { defaultCatalogue } from "../src/data/catalogue.js";
import { collectionPath, SUBCATEGORIES } from "../src/data/collections.js";
import { RENAMED_PIECES } from "../src/data/pieces.js";
import { leftTheCircle, removedPieceTarget } from "../src/data/relations.js";

/** statusCode 301 (Vercel answers 308 for "permanent: true"). */
export type Redirect = { source: string; destination: string; statusCode: 301 };

/** The real site (its own server): where every address of Vercel leads. "" = the site is served by Vercel itself. */
export const MOVED_TO = "https://beretejewellers.com";

/** The redirects of vercel.json: those of the catalogue, then, once the site has moved, every address to the domain. */
export function vercelRedirects(): Redirect[] {
  if (!MOVED_TO) return catalogueRedirects();
  return [
    ...catalogueRedirects().map((r) => ({ ...r, destination: MOVED_TO + r.destination })),
    // The home page apart: Vercel serves "/" from its files before "/:path*" sees it.
    { source: "/", destination: MOVED_TO + "/", statusCode: 301 },
    { source: "/:path*", destination: MOVED_TO + "/:path*", statusCode: 301 },
  ];
}

/** The redirects the catalogue needs, in order. */
export function catalogueRedirects(): Redirect[] {
  const out: Redirect[] = [];
  const both = (from: string, to: string) => {
    out.push({ source: from, destination: to, statusCode: 301 });
    out.push({ source: "/:lang(fr|es|de|nl|ar)" + from, destination: "/:lang" + to, statusCode: 301 });
  };
  for (const p of defaultCatalogue.pieces) {
    // A piece merged into another (RENAMED_PIECES) leads to it, not to its player.
    if (RENAMED_PIECES[p.slug]) continue;
    const target = removedPieceTarget(defaultCatalogue, p.slug);
    if (target) both("/pieces/" + p.slug, target);
  }
  for (const person of defaultCatalogue.people) if (leftTheCircle(defaultCatalogue, person.slug)) both("/players/" + person.slug, "/players");
  for (const [from, to] of Object.entries(RENAMED_PIECES)) both("/pieces/" + from, "/pieces/" + to);
  both("/boxes/:slug", "/boxes");
  for (const s of SUBCATEGORIES) both("/creations/" + s.slug, collectionPath(s));
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const file = path.resolve(import.meta.dirname, "..", "vercel.json");
  const config = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
  const redirects = vercelRedirects();
  // The redirects come right after the rewrites (same order of keys as before).
  const next: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (k === "redirects") continue;
    next[k] = v;
    if (k === "trailingSlash") next.redirects = redirects;
  }
  if (!("redirects" in next)) next.redirects = redirects;
  fs.writeFileSync(file, JSON.stringify(next, null, 2) + "\n");
  console.log("vercel.json: " + redirects.length + " redirects");
}
