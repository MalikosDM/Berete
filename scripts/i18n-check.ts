// Checks that every language of the site is complete (npm run i18n:check).
//   - every text of the built-in catalogue has its translation in content/<lang>.ts
//     (the proper names only in the languages that write them in another script);
//   - every page of seo.json has its title and description in ui/<lang>.ts (seoPages);
//   - no translation is left that no text uses any more.
// The words of the pages themselves (ui/<lang>.ts) are checked by TypeScript.
//
// npx tsx scripts/i18n-check.ts --source out.json writes the texts to translate.
import { writeFileSync } from "node:fs";
import { defaultCatalogue } from "../src/data/catalogue.js";
import seo from "../src/extensions/seo/seo.json" with { type: "json" };
import { catalogueTexts } from "../src/i18n/content.js";
import ar from "../src/i18n/content/ar.js";
import es from "../src/i18n/content/es.js";
import fr from "../src/i18n/content/fr.js";
import { ar as arUi } from "../src/i18n/ui/ar.js";
import { es as esUi } from "../src/i18n/ui/es.js";
import { fr as frUi } from "../src/i18n/ui/fr.js";

/** The languages whose script is not the Latin one: the names are written in it too. */
const OWN_SCRIPT = new Set(["ar"]);

const texts = catalogueTexts(defaultCatalogue);
const pages = Object.entries((seo as { pages: Record<string, { title?: string; description?: string; robots?: string }> }).pages)
  .filter(([path, page]) => !path.includes(":") && !path.includes("*") && path !== "/admin" && (page.title || page.description))
  .map(([path, page]) => ({ path, title: page.title ?? "", description: page.description ?? "" }));

const source = process.argv.indexOf("--source");
if (source !== -1) {
  const out = process.argv[source + 1] ?? "i18n-source.json";
  writeFileSync(out, JSON.stringify({ text: texts.text, name: texts.name, seoPages: pages }, null, 2) + "\n");
  console.log("i18n: " + texts.text.length + " texts, " + texts.name.length + " names, " + pages.length + " pages -> " + out);
  process.exit(0);
}

const languages = [
  { code: "fr", content: fr, ui: frUi },
  { code: "es", content: es, ui: esUi },
  { code: "ar", content: ar, ui: arUi },
];

let problems = 0;
for (const { code, content, ui } of languages) {
  const wanted = [...texts.text, ...(OWN_SCRIPT.has(code) ? texts.name : [])];
  const known = new Set([...texts.text, ...texts.name]);
  const missing = wanted.filter((t) => typeof content[t] !== "string" || content[t]!.trim() === "");
  const unused = Object.keys(content).filter((k) => !known.has(k));
  const seoMissing = pages.filter((p) => !ui.seoPages[p.path] || (p.title && !ui.seoPages[p.path]!.title) || (p.description && !ui.seoPages[p.path]!.description)).map((p) => p.path);
  for (const m of missing) console.log(code + ": missing translation: " + JSON.stringify(m));
  for (const u of unused) console.log(code + ": unused translation: " + JSON.stringify(u));
  for (const p of seoMissing) console.log(code + ": missing seoPages entry: " + p);
  problems += missing.length + unused.length + seoMissing.length;
  console.log(code + ": " + (wanted.length - missing.length) + "/" + wanted.length + " catalogue texts, " + (pages.length - seoMissing.length) + "/" + pages.length + " pages");
}
if (problems > 0) {
  console.error("i18n: " + problems + " problem(s)");
  process.exit(1);
}
console.log("i18n: every language is complete");
