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
 * unpublishing a piece in src/data/pieces.ts (tests/site.spec.ts checks that vercel.json is up to date).
 */
import fs from "node:fs";
import path from "node:path";
import { defaultCatalogue } from "../src/data/catalogue.js";
import { collectionPath, SUBCATEGORIES } from "../src/data/collections.js";
import { RENAMED_PIECES } from "../src/data/pieces.js";
import { leftTheCircle, removedPieceTarget } from "../src/data/relations.js";

/** statusCode 301 (Vercel answers 308 for "permanent: true"). */
export type Redirect = { source: string; destination: string; statusCode: 301 };

/** The redirects the catalogue needs, in order. */
export function catalogueRedirects(): Redirect[] {
  const out: Redirect[] = [];
  const both = (from: string, to: string) => {
    out.push({ source: from, destination: to, statusCode: 301 });
    out.push({ source: "/:lang(fr|es|de|nl|ar)" + from, destination: "/:lang" + to, statusCode: 301 });
  };
  for (const p of defaultCatalogue.pieces) {
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
  const redirects = catalogueRedirects();
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
