// Pre-renders every page to static HTML after "vite build" - written by the platform. Do not edit.
// npm run build runs vite build, then the server bundle of the pages
// (vite build --ssr src/extensions/seo/entry-server.tsx --outDir dist-ssr), then
// this script: one HTML file per route, with its rendered content and its head,
// plus sitemap.xml and robots.txt. SITE_URL gives the public address.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const server = await import(pathToFileURL(join(root, "dist-ssr", "entry-server.js")).href);
const template = await readFile(join(root, "dist", "index.html"), "utf8");
const origin = (process.env.SITE_URL || server.settings.siteUrl || "").replace(/\/+$/, "");
const targets = server.prerenderTargets();

/** "/" is dist/index.html; "/about" is dist/about.html (served at /about). */
function fileOf(path) {
  if (path === "/") return join(root, "dist", "index.html");
  return join(root, "dist", ...path.slice(1).split("/")) + ".html";
}

let written = 0;
for (const target of targets) {
  let body = "";
  try {
    body = server.render(target.path);
  } catch (error) {
    console.warn("prerender: " + target.path + " is rendered in the browser only (" + (error instanceof Error ? error.message : String(error)) + ")");
  }
  const head = server.headFor(server.settings, target.path, target.extras, origin);
  let html = server.injectHead(template, head).replace("<div id=\"root\"></div>", "<div id=\"root\">" + body + "</div>");
  // A page in another language of the site (/en/about) declares its own language.
  const language = typeof server.languageFor === "function" ? server.languageFor(server.settings, target.path) : server.settings.language;
  if (language !== server.settings.language) html = html.replace(/<html\b[^>]*>/i, () => "<html lang=\"" + language + "\" dir=\"" + (/^(ar|he|fa|ur)(-|$)/i.test(language) ? "rtl" : "ltr") + "\">");
  const file = fileOf(target.path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html, "utf8");
  written += 1;
}
await writeFile(join(root, "dist", "sitemap.xml"), server.sitemapXml(server.settings, targets.map((t) => t.path), origin), "utf8");
await writeFile(join(root, "dist", "robots.txt"), server.robotsTxt(server.settings, server.privatePaths(), origin), "utf8");
console.log("prerender: " + written + " page(s), sitemap.xml and robots.txt");
