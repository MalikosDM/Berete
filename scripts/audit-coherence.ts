/**
 * The control of coherence of the site (24/11/2026: "zéro incohérence, et une vraie impression de luxe"), run after every
 * large change so that what was corrected never comes back:
 *
 *   npm run audit:coherence                                  (the local site, http://localhost:3001)
 *   BASE_URL=https://berete-nxsp.vercel.app npm run audit:coherence
 *   SIZES=1440x900 LANGS=en,fr ONLY=/pieces npm run audit:coherence     (a part of it)
 *
 * It opens every page of the sitemap, in every language of the site, at 1280 × 800, 1440 × 900 and on an iPhone (WebKit,
 * Safari's engine), silent (Chromium --mute-audio, the films' volume at 0 on the iPhone), and reports:
 *   - fonts:      any text in another font than the two of the house (Cormorant Garamond, Manrope; the Arabic letters come
 *                 from Amiri and IBM Plex Sans Arabic, after them), and any other font loaded by the page;
 *   - sizes:      a page title over 56 px, a section title over 36 px, a small label above a title outside 11–12 px, a text
 *                 outside 15–17 px on a computer (on a phone: a text under 16 px);
 *   - duplicates: a photo or a film shown twice on the same page (by its file, whatever its width or version), a sentence
 *                 written twice on the same page;
 *   - buttons:    a button of the house whose words are not those of the house ("Begin Your Creation", "WhatsApp", "Enter the
 *                 World", "Discover Their World", "All Creations", "See More", and the way to The Atelier, the names of the
 *                 pages and of the collections), and any former formula still written somewhere;
 *   - photos:     a photo without its description;
 *   - gold tone:  "gold tone" (or its translation) anywhere;
 *   - English:    a sentence left in English on a page in another language (the same text as on the English page);
 *   - names:      the name of a piece cut in its card;
 *   - overflow:   a page wider than the screen; a photo or a film cut by the edge of the screen;
 *   - order:      a page of a piece whose sections are not in the order of the house (opening, film, Every Angle, Behind
 *                 the Creation, Composition & Craftsmanship, Created exclusively for, The Trunk, The Atelier, the end).
 * Its report: verification/coherence/rapport.md (and rapport.json). It ends with an error when something is found.
 */
import { chromium, devices, webkit, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { defaultCatalogue } from "../src/data/catalogue";
import { SPECIAL_PROJECT } from "../src/data/pieces";
import { publishedPress } from "../src/data/press";
import { en } from "../src/i18n/ui/en";
import { fr } from "../src/i18n/ui/fr";
import { es } from "../src/i18n/ui/es";
import { de } from "../src/i18n/ui/de";
import { nl } from "../src/i18n/ui/nl";
import { ar } from "../src/i18n/ui/ar";
import type { Messages } from "../src/i18n/ui/en";

const BASE = (process.env.BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
const LANGS = (process.env.LANGS ?? "en,fr,es,de,nl,ar").split(",");
const SIZES = (process.env.SIZES ?? "1280x800,1440x900,iphone").split(",");
const ONLY = process.env.ONLY ?? "";
const WORKERS = Number(process.env.WORKERS ?? 6);
const OUT = resolve(import.meta.dirname, "..", "verification", "coherence");

const BUNDLES: Record<string, Messages> = { en, fr, es, de, nl, ar } as Record<string, Messages>;

/** The words a button of the house may carry, in each language (24/11/2026, point B1), and the ways it is allowed to name. */
function allowedButtons(t: Messages): Set<string> {
  const words = [
    t.common.startPiece,
    t.common.whatsapp,
    t.common.enterWorld,
    t.piece.theProfile,
    t.common.allCreations,
    t.common.seeMore,
    t.films.enter,
    t.home.discoverMore,
    // A button that opens photos, and the way from a trunk to its piece (24/11/2026).
    t.boxes.discoverPhotos,
    t.boxes.discoverPiece,
    ...Object.values(t.nav).filter((v): v is string => typeof v === "string"),
    ...Object.values(t.collections.items).map((c) => c.name),
  ];
  return new Set(words.map(norm));
}

/**
 * The former formulas (the site of 1872a7cc, in each language): none may be written any more. "exact": only when it is the
 * whole text of an element (common words); "piece": only on the pages of the pieces (the stories stay on the profiles).
 */
const FORMER: Record<string, { text: string; exact?: boolean; pieces?: boolean }[]> = {
  en: ["Begin a Private Conversation", "Beyond This Universe", "Commission Your Own", "Commission Your Signature Trunk", "Create your own trunk", "Discover the Circle", "Discover the Creations", "Discover the Detail", "Discover the Masterpiece", "Dragon Ball, in Motion", "Explore Their World", "Explore the Portfolio", "Historic Commissions", "I want this piece", "In the Spotlight", "More of the Portfolio", "Private Correspondence", "Private Enquiries", "Request a Private Call", "See all creations", "See all the trunks", "Seen in our stories", "Start on WhatsApp", "The Cross That Turns", "The Final Reveal", "Want yours? WhatsApp", "Your Next Creation", "Imagine your creation"].map((text) => ({ text })),
  fr: ["Au-delà de cet univers", "Commencer sur WhatsApp", "Contact privé", "Correspondance privée", "Créations historiques", "Créer votre écrin", "Demander un appel privé", "Dragon Ball, en mouvement", "Découvrir le Cercle", "Découvrir le chef-d’œuvre", "Découvrir le détail", "Entamer une conversation privée", "Envie de la vôtre ? WhatsApp", "Explorer le Portfolio", "Explorer les créations", "Explorer leur univers", "Imaginez votre création", "Imaginez votre propre création", "Imaginez votre écrin Signature", "Je veux cette pièce", "La Révélation finale", "La croix qui tourne", "Plus loin dans le Portfolio", "Sous les projecteurs", "Voir tous les écrins", "Voir toutes les créations", "Votre prochaine création", "À voir dans nos stories", "La Spirit Bomb", "le Genki Dama (le Genkidama)"].map((text) => ({ text })),
  es: ["Bajo los focos", "Contacto privado", "Correspondencia privada", "Crear su propio estuche", "Descubra las creaciones", "Descubrir el Círculo", "Descubrir el detalle", "Descubrir la obra maestra", "Dragon Ball, en movimiento", "Empezar por WhatsApp", "Encargos históricos", "Encargue su Estuche Signature", "Encargue su propia creación", "Explorar el Portfolio", "Explorar su universo", "Inicie una conversación privada", "La cruz que gira", "La revelación final", "Más allá de este universo", "Más del Portfolio", "Quiero esta pieza", "Solicite una llamada privada", "Su próxima creación", "Ver todas las creaciones", "Ver todos los estuches", "Vista en nuestras historias", "¿Quiere la suya? WhatsApp"].map((text) => ({ text })),
  de: ["Alle Etuis ansehen", "Alle Kreationen ansehen", "Auf WhatsApp starten", "Das Detail entdecken", "Das Kreuz, das sich dreht", "Das Meisterwerk entdecken", "Das Portfolio entdecken", "Das Schmuckstück entdecken", "Den Kreis entdecken", "Die Kreationen entdecken", "Die Momente entdecken", "Die große Enthüllung", "Dragon Ball in Bewegung", "Ein privates Gespräch beginnen", "Historische Auftragswerke", "Ich möchte dieses Stück", "Ihr Signature-Etui in Auftrag geben", "Ihr Unikat in Auftrag geben", "Ihr eigenes Etui gestalten", "Ihr eigenes Stück? WhatsApp", "Ihre Kreation gestalten", "Ihre nächste Kreation", "Im Rampenlicht", "Mehr aus dem Portfolio", "Private Anfragen", "Private Korrespondenz", "Privater Rückruf", "Weitere Welten", "Zu sehen in unseren Storys"].map((text) => ({ text })),
  nl: ["Alle creaties bekijken", "Begin een privégesprek", "Begin via WhatsApp", "Bekijk alle etuis", "De grote onthulling", "Dragon Ball in beweging", "Het kruis dat draait", "Historische opdrachten", "Ik wil dit stuk", "In de schijnwerpers", "Meer uit het portfolio", "Ontdek de Kring", "Ontdek de creaties", "Ontdek het detail", "Ontdek het juweel", "Ontdek het meesterwerk", "Ontwerp uw Signature-koffer", "Ontwerp uw eigen creatie", "Persoonlijk contact", "Persoonlijke correspondentie", "Te zien in onze stories", "Uw eigen juweel? WhatsApp", "Uw eigen koffer ontwerpen", "Uw volgende creatie", "Verken het portfolio", "Verken zijn wereld", "Voorbij dit universum", "Vraag een persoonlijk gesprek aan"].map((text) => ({ text })),
  ar: ["Dragon Ball في حركة", "أريد هذه القطعة", "إبداعات تاريخية", "إبداعكم القادم", "ابدؤوا عبر WhatsApp", "ابدؤوا محادثة خاصة", "استكشفوا عالمه", "استكشفوا معرض الأعمال", "اطلبوا إبداعكم الخاص", "اطلبوا صندوق Signature الخاص بكم", "اطلبوا مكالمة خاصة", "اكتشف القطعة", "اكتشفوا الإبداعات", "اكتشفوا التحفة", "اكتشفوا التفصيل", "اكتشفوا دائرة Berete", "الاستفسارات الخاصة", "الصليب الذي يدور", "المزيد من معرض الأعمال", "تحت الأضواء", "ترغبون في قطعتكم؟ WhatsApp", "شاهد كل العلب", "صمّم صندوقك الخاص", "ظهرت في قصصنا", "عرض كل الإبداعات", "لحظة الكشف", "ما وراء هذا العالم", "مراسلة خاصة"].map((text) => ({ text })),
};
for (const [l, film, moments] of [
  ["en", "The Film", "The Moments"],
  ["fr", "Le film", "Moments exclusifs"],
  ["es", "La película", "Los momentos"],
  ["de", "Der Film", "Die Momente"],
  ["nl", "De film", "De momenten"],
  ["ar", "الفيلم", "اللحظات"],
] as const) {
  FORMER[l]!.push({ text: film, exact: true }, { text: moments, exact: true, pieces: true });
}

/** "Gold tone" in each language (point B7): pieces in gold, never "tones". */
const GOLD_TONE: Record<string, RegExp> = {
  en: /gold tones?\b/i,
  fr: /\btons? (d’)?or\b/i,
  es: /\btonos? (de )?oro\b/i,
  de: /goldt[öo]n/i,
  nl: /goudtint/i,
  ar: /درجات الذهب/,
};

/** Names that are the same in every language (pieces, people, clubs, trunks, newspapers): never "left in English". */
const NAMES = new Set(
  [
    ...defaultCatalogue.pieces.map((p) => p.title),
    ...defaultCatalogue.people.map((p) => p.name),
    ...defaultCatalogue.people.map((p) => p.club ?? ""),
    ...defaultCatalogue.boxes.map((b) => b.name),
    ...defaultCatalogue.stories.map((s) => s.title),
    // The names of the collections that keep their English name in a language ("Jesus Pieces").
    ...Object.values(BUNDLES).flatMap((t) => Object.values(t.collections.items).map((c) => c.name)).filter((name) => Object.values(en.collections.items).some((c) => c.name === name)),
    // The newspapers, the trophies.
    ...publishedPress().map((a) => a.outlet),
    ...SPECIAL_PROJECT.map((r) => r.trophy),
    "Campione d'Italia",
    "Berete Jewellers",
    "BERETE JEWELLERS",
    "WhatsApp",
    "Instagram",
  ]
    .filter(Boolean)
    .map((s) => norm(s)),
);

/** A text made only of names, numbers and signs ("9 MARCUS THURAM Inter Milan", "JESUS PIECES 4"): the same in every language. */
function onlyNames(text: string): boolean {
  let rest = " " + norm(text) + " ";
  for (const name of [...NAMES].sort((a, b) => b.length - a.length)) if (name.length > 1) rest = rest.split(name).join(" ");
  return rest.replace(/[\d\s·•/—–\-:,.()'’&+]+/g, "").length < 4;
}

function norm(s: string): string {
  return s.replace(/\s+/g, " ").replace(/[“”«»"]/g, "").trim().toLocaleLowerCase();
}

type Issue = { check: string; page: string; size: string; detail: string };
const issues: Issue[] = [];
const seen = new Set<string>();
const add = (check: string, page: string, size: string, detail: string) => {
  const key = check + "|" + page + "|" + size + "|" + detail;
  if (seen.has(key)) return;
  seen.add(key);
  issues.push({ check, page, size, detail });
};

/** What the page itself reports (run in the browser). */
type Found = {
  wide: number;
  fonts: string[];
  loadedFonts: string[];
  sizes: string[];
  media: string[];
  texts: string[];
  repeated: string[];
  buttons: string[];
  noAlt: string[];
  cut: string[];
  edge: string[];
  order: string[];
  allText: string[];
};

/** Collects everything to check, once the whole page has been scrolled through (its lazy parts mounted). */
async function inspect(page: Page, phone: boolean): Promise<Found> {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.9;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 70));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 250));
  });
  return page.evaluate((phone) => {
    const vw = window.innerWidth;
    // Arabic has no capitals and its letters are drawn larger to be read (html[lang="ar"]): its small labels go up to 16 px.
    const arabic = document.documentElement.lang === "ar";
    const labelMax = arabic ? 16.6 : 12.1;
    const textMax = arabic ? 18 : 17.2;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.02 && !el.closest("[aria-hidden='true'], [hidden], dialog:not([open])");
    };
    const decorative = (el: Element) => Boolean(el.closest("[aria-hidden='true'], .universe, [data-decor], [role='presentation']"));
    const firstFamily = (el: Element) => (getComputedStyle(el).fontFamily.split(",")[0] ?? "").replace(/["']/g, "").trim();
    // Its words as read on screen: the words kept for screen readers only (.sr-only) are not on screen.
    const textOf = (el: Element) => {
      const copy = el.cloneNode(true) as HTMLElement;
      copy.querySelectorAll(".sr-only").forEach((n) => n.remove());
      return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
    };
    const ownText = (el: Element) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join("").replace(/\s+/g, " ").trim();
    const key = (src: string) => {
      const path = (src.split("?")[0] ?? "").replace(/^https?:\/\/[^/]+/, "");
      const dir = path.slice(0, path.lastIndexOf("/") + 1);
      const name = (path.split("/").pop() ?? "")
        .replace(/\.(webp|avif|jpe?g|png|mp4|webm|mov)$/i, "")
        .replace(/\.m$/, "")
        .replace(/\.[0-9a-f]{10}$/i, "")
        .replace(/\.w\d+$/, "")
        .replace(/-(\d{3,4})$/, "")
        .replace(/-m$/, "")
        .replace(/-mobile$/, "");
      return dir + name;
    };

    const fonts = new Set<string>();
    const sizes: string[] = [];
    const allText: string[] = [];
    const all = [...document.querySelectorAll("body *")];
    for (const el of all) {
      if (el.closest("script, style, noscript, svg, [data-admin]")) continue;
      const own = ownText(el);
      if (!own || !visible(el)) continue;
      const family = firstFamily(el);
      if (!["Cormorant Garamond", "Manrope"].includes(family)) fonts.add(family + " · " + own.slice(0, 40));
      allText.push(own);
      const px = parseFloat(getComputedStyle(el).fontSize);
      const tag = el.tagName.toLowerCase();
      const label = tag + " " + px.toFixed(1) + " px · " + own.slice(0, 50);
      if (tag === "h1" || el.closest("h1")) {
        if (px > 56.5) sizes.push("page title over 56 px: " + label);
        continue;
      }
      if (/^h[2-6]$/.test(tag) || el.closest("h2, h3, h4") || family === "Cormorant Garamond") {
        if (px > 36.5) sizes.push("title over 36 px: " + label);
        continue;
      }
      // A small label: the label above a title, the name of a line of a sheet (small capitals).
      const caps = getComputedStyle(el).textTransform === "uppercase" || el.closest(".uppercase, .title-caps") !== null;
      if (el.closest(".eyebrow") || (caps && px <= labelMax + 0.5 && tag !== "p")) {
        if (!phone && (px < 10.9 || px > labelMax)) sizes.push("label outside 11–12 px: " + label);
        continue;
      }
      if (["p", "li", "dd", "dt", "figcaption", "blockquote"].includes(tag) && !el.closest("button, a, [data-cta], nav, form, label")) {
        if (!phone && (px < 14.5 || px > textMax)) sizes.push("text outside 15–16 px: " + label);
        if (phone && px < 15.9) sizes.push("phone text under 16 px: " + label);
      }
    }
    const loadedFonts = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, ""));

    // Photos and films: once each on the page (by their file).
    const media: string[] = [];
    const counts = new Map<string, number>();
    for (const el of document.querySelectorAll("main img, main video")) {
      if (!visible(el) || decorative(el)) continue;
      const src = el.tagName === "IMG" ? (el.getAttribute("src") ?? "") : ((el as HTMLVideoElement).currentSrc || el.getAttribute("src") || el.querySelector("source")?.getAttribute("src") || "");
      if (!src || src.endsWith(".svg") || src.startsWith("data:") || src.startsWith("blob:")) continue;
      const k = key(src);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (const [k, n] of counts) if (n > 1) media.push(k + " (" + n + " times)");

    // Sentences once each on the page (the cards' short lines excepted).
    const said = new Map<string, number>();
    for (const el of document.querySelectorAll("main p, main h1, main h2, main h3, main figcaption")) {
      if (!visible(el) || el.closest("[data-piece-card], [data-creations-grid], nav") || el.querySelector("[data-cta]")) continue;
      const tx = textOf(el);
      if (tx.length < 20) continue;
      said.set(tx, (said.get(tx) ?? 0) + 1);
    }
    const repeated = [...said].filter(([, n]) => n > 1).map(([tx, n]) => tx.slice(0, 80) + " (" + n + " times)");

    const buttons = [...document.querySelectorAll("[data-cta]")].filter(visible).map((el) => textOf(el));
    const noAlt = [...document.querySelectorAll("img")]
      .filter((img) => visible(img) && !decorative(img) && !img.getAttribute("src")?.endsWith(".svg") && !(img.getAttribute("alt") ?? "").trim())
      .map((img) => key(img.getAttribute("src") ?? ""));

    // Names of pieces: whole in their card, never cut.
    const cut = [...document.querySelectorAll("[data-piece-name], [data-card-title]")]
      .filter(visible)
      .filter((el) => {
        const cs = getComputedStyle(el);
        const h = el as HTMLElement;
        return cs.webkitLineClamp !== "none" && cs.webkitLineClamp !== "" ? true : h.scrollWidth > h.clientWidth + 1 || (cs.overflow !== "visible" && h.scrollHeight > h.clientHeight + 1) || /—\s*$/.test(textOf(el));
      })
      .map((el) => textOf(el));

    // A photo or a film cut by the edge of the screen (not by its own frame).
    const edge: string[] = [];
    for (const el of document.querySelectorAll("main img, main video")) {
      if (!visible(el) || decorative(el)) continue;
      const r = el.getBoundingClientRect();
      let left = r.left;
      let right = r.right;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX !== "visible" || cs.overflow !== "visible" || cs.clipPath !== "none") {
          const ar = a.getBoundingClientRect();
          left = Math.max(left, ar.left);
          right = Math.min(right, ar.right);
        }
      }
      if (right - left < 4) continue;
      if (left < -1 || right > vw + 1) edge.push(key(el.getAttribute("src") ?? (el as HTMLVideoElement).currentSrc ?? "") + " [" + Math.round(left) + "…" + Math.round(right) + " / " + vw + "]");
    }

    const order = [...document.querySelectorAll("[data-piece-section]")].map((el) => el.getAttribute("data-piece-section") ?? "");
    const texts = [...document.querySelectorAll("main p, main h1, main h2, main h3, main li, main dt, main dd, main a, main button, main figcaption, header a, footer a, footer p")]
      .filter((el) => visible(el) && !el.closest("[lang]:not(html)") && !el.querySelector("[lang]") && !el.closest("[translate='no']"))
      .map((el) => textOf(el))
      .filter((tx) => tx.length >= 12 && /\p{L}{3,}.*\s.*\p{L}{3,}/u.test(tx));
    return { wide: document.documentElement.scrollWidth - vw, fonts: [...fonts], loadedFonts, sizes, media, texts, repeated, buttons, noAlt, cut, edge, order, allText };
  }, phone);
}

const ORDER: Record<string, number> = { opening: 0, film: 1, angles: 2, story: 3, details: 3.1, "worn-as": 3.2, composition: 4, "created-for": 5, trunk: 6, atelier: 7, press: 7.5, end: 8 };
const ALLOWED_FONTS = new Set(["Cormorant Garamond", "Manrope", "Cormorant Fallback", "Manrope Fallback", "Amiri", "IBM Plex Sans Arabic"]);

/** The English texts of each address (the English page), to find a sentence left untranslated. */
const englishTexts = new Map<string, Set<string>>();

async function check(page: Page, path: string, lang: string, size: string, phone: boolean) {
  const url = BASE + path;
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  if (!res || res.status() >= 400) {
    add("page", path, size, "HTTP " + (res?.status() ?? "?"));
    return;
  }
  await page.waitForLoadState("load", { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  const f = await inspect(page, phone);
  const t = BUNDLES[lang]!;
  if (f.wide > 1) add("overflow", path, size, "page wider than the screen by " + f.wide + " px");
  for (const x of f.fonts) add("fonts", path, size, x);
  for (const x of f.loadedFonts) if (!ALLOWED_FONTS.has(x)) add("fonts", path, size, "font loaded: " + x);
  for (const x of f.sizes) add("sizes", path, size, x);
  for (const x of f.media) add("duplicates", path, size, "photo or film twice: " + x);
  for (const x of f.repeated) add("duplicates", path, size, "sentence twice: " + x);
  const allowed = allowedButtons(t);
  for (const b of f.buttons) if (!allowed.has(norm(b))) add("buttons", path, size, "button: “" + b + "”");
  const page_ = path.replace(/^\/(fr|es|de|nl|ar)(?=\/|$)/, "") || "/";
  const onPiece = page_.startsWith("/pieces/");
  const all = f.allText.join("\n");
  for (const former of FORMER[lang] ?? []) {
    if (former.pieces && !onPiece) continue;
    const hit = former.exact ? f.allText.some((x) => norm(x) === norm(former.text)) : all.toLocaleLowerCase().includes(former.text.toLocaleLowerCase());
    if (hit) add("buttons", path, size, "former formula still written: “" + former.text + "”");
  }
  for (const x of f.noAlt) add("photos", path, size, "photo without description: " + x);
  if (GOLD_TONE[lang]!.test(all)) add("gold tone", path, size, (all.match(GOLD_TONE[lang]!) ?? [""])[0]);
  for (const x of f.cut) add("names", path, size, "name cut: " + x);
  for (const x of f.edge) add("overflow", path, size, "cut by the edge of the screen: " + x);
  if (onPiece) {
    const ranks = f.order.map((s) => ORDER[s] ?? -1);
    const sorted = ranks.every((r, i) => i === 0 || r >= ranks[i - 1]!);
    const missing = ["opening", "story", "created-for", "end"].filter((s) => !f.order.includes(s));
    if (!sorted || missing.length > 0) add("order", path, size, "sections: " + f.order.join(" > ") + (missing.length ? " · missing: " + missing.join(", ") : ""));
  }
  if (lang === "en") {
    englishTexts.set(page_ + "|" + size, new Set(f.texts.map(norm)));
  } else {
    const english = englishTexts.get(page_ + "|" + size);
    if (english) for (const x of f.texts) if (english.has(norm(x)) && !onlyNames(x)) add("english", path, size, "“" + x.slice(0, 90) + "”");
  }
}

async function pages(): Promise<string[]> {
  const xml = await (await fetch(BASE + "/sitemap.xml")).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!.replace(/^https?:\/\/[^/]+/, "") || "/");
  // The English pages first: the other languages compare their texts with them.
  const lang = (p: string) => /^\/(fr|es|de|nl|ar)(\/|$)/.exec(p)?.[1] ?? "en";
  return paths.filter((p) => LANGS.includes(lang(p)) && (!ONLY || p.replace(/^\/(fr|es|de|nl|ar)(?=\/|$)/, "").startsWith(ONLY))).sort((a, b) => (lang(a) === "en" ? 0 : 1) - (lang(b) === "en" ? 0 : 1));
}

async function context(browser: Browser, size: string): Promise<BrowserContext> {
  const phone = size === "iphone";
  const ctx = phone
    ? await browser.newContext({ ...devices["iPhone 13"], reducedMotion: "reduce" })
    : await browser.newContext({ viewport: { width: Number(size.split("x")[0]), height: Number(size.split("x")[1]) }, reducedMotion: "reduce" });
  // tsx keeps the names of the functions (a helper "__name" the page does not have); silent: every film at volume 0.
  await ctx.addInitScript({
    content:
      "window.__name = function (f) { return f; };" +
      "(function () { function mute(v) { v.muted = true; v.volume = 0; }" +
      " new MutationObserver(function () { document.querySelectorAll('video, audio').forEach(mute); }).observe(document, { childList: true, subtree: true });" +
      " document.addEventListener('play', function (e) { if (e.target instanceof HTMLMediaElement) mute(e.target); }, true); })();",
  });
  return ctx;
}

async function main() {
  const list = await pages();
  const desktop = await chromium.launch({ args: ["--mute-audio", "--autoplay-policy=user-gesture-required"] });
  const phoneBrowser = SIZES.includes("iphone") ? await webkit.launch() : null;
  let done = 0;
  const total = list.length * SIZES.length;
  for (const size of SIZES) {
    const browser = size === "iphone" ? phoneBrowser! : desktop;
    const queue = [...list];
    // The English pages of a size before the others (they are compared with them).
    const english = queue.filter((p) => !/^\/(fr|es|de|nl|ar)(\/|$)/.test(p));
    const others = queue.filter((p) => /^\/(fr|es|de|nl|ar)(\/|$)/.test(p));
    for (const batch of [english, others]) {
      const work = [...batch];
      await Promise.all(
        Array.from({ length: Math.min(WORKERS, work.length) }, async () => {
          const ctx = await context(browser, size);
          const page = await ctx.newPage();
          for (let path = work.shift(); path !== undefined; path = work.shift()) {
            const lang = /^\/(fr|es|de|nl|ar)(\/|$)/.exec(path)?.[1] ?? "en";
            try {
              await check(page, path, lang, size, size === "iphone");
            } catch (e) {
              add("page", path, size, "could not be checked: " + String((e as Error).message).split("\n")[0]);
            }
            done += 1;
            if (done % 50 === 0) console.log("  " + done + " / " + total);
          }
          await ctx.close();
        }),
      );
    }
  }
  await desktop.close();
  await phoneBrowser?.close();

  mkdirSync(OUT, { recursive: true });
  const checks = ["fonts", "sizes", "duplicates", "buttons", "photos", "gold tone", "english", "names", "overflow", "order", "page"];
  const lines = [
    "# Contrôle de cohérence",
    "",
    "Site : " + BASE + " · " + list.length + " pages × " + SIZES.join(", ") + " · " + new Date().toISOString().slice(0, 16).replace("T", " "),
    "",
    "| Contrôle | Problèmes |",
    "|---|---|",
    ...checks.map((c) => "| " + c + " | " + issues.filter((i) => i.check === c).length + " |"),
    "",
  ];
  for (const c of checks) {
    const found = issues.filter((i) => i.check === c);
    if (found.length === 0) continue;
    lines.push("## " + c, "");
    for (const i of found.slice(0, 400)) lines.push("- " + i.page + " (" + i.size + ") — " + i.detail);
    if (found.length > 400) lines.push("- … " + (found.length - 400) + " de plus");
    lines.push("");
  }
  if (issues.length === 0) lines.push("Aucun problème : le site est cohérent sur toutes ses pages, dans toutes ses langues.");
  writeFileSync(join(OUT, "rapport.md"), lines.join("\n") + "\n");
  writeFileSync(join(OUT, "rapport.json"), JSON.stringify({ base: BASE, pages: list.length, sizes: SIZES, issues }, null, 1) + "\n");
  console.log(lines.slice(0, 18).join("\n"));
  console.log("Report: verification/coherence/rapport.md");
  process.exit(issues.length === 0 ? 0 : 1);
}

void main();
