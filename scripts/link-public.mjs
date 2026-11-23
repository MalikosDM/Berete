#!/usr/bin/env node
/**
 * For a local build on a Mac short of room (BERETE_LINK_PUBLIC=1 npm run build): instead of a copy of public/ in dist
 * (1.6 GB of photos and videos), each entry of public/ is linked into dist. Never used on Vercel nor on the VPS.
 *
 *   BERETE_LINK_PUBLIC=1 SITE_URL=http://localhost:3001 npm run build && node scripts/link-public.mjs
 */
import { existsSync } from "node:fs";
import { readdir, symlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC = join(ROOT, "public");
const DIST = join(ROOT, "dist");
for (const name of await readdir(PUBLIC)) {
  if (name === ".DS_Store") continue;
  const target = join(DIST, name);
  // A file the build wrote itself (robots.txt, sitemap.xml...) stays.
  if (existsSync(target)) continue;
  await symlink(join(PUBLIC, name), target);
}
console.log("public/ linked into dist/");
