import { expect, test, type Page } from "@playwright/test";
import { defaultCatalogue } from "../src/data/catalogue";
import { catalogueTexts } from "../src/i18n/content";
import arContent from "../src/i18n/content/ar";
import esContent from "../src/i18n/content/es";
import frContent from "../src/i18n/content/fr";
import { ar } from "../src/i18n/ui/ar";
import { en } from "../src/i18n/ui/en";
import { es } from "../src/i18n/ui/es";
import { fr } from "../src/i18n/ui/fr";
import { checkPage, scrollTo, shotPath, skipIntro, watch } from "./helpers";

/*
 * The languages of the site (English at the root, /fr, /es, /ar), on the
 * 1440px desktop and the 390px iPhone: every page answers in its language
 * with no English left (texts, photo descriptions, button labels), no
 * error and no overflow; Arabic reads right to left with its own fonts; the
 * language menu keeps the visitor on the same page; links, WhatsApp
 * messages, titles, hreflang, the sitemap and the "page not found" follow
 * the language. Screenshots: verification/<device>/<lang>-*.jpg.
 */

const LANGUAGES = [
  { code: "fr", ui: fr, content: frContent },
  { code: "es", ui: es, content: esContent },
  { code: "ar", ui: ar, content: arContent },
] as const;

const PAGES = ["/", "/creations", "/creations/pendants", "/pieces/kevin-schade-dragon-ball-pendant", "/pieces/vfb-stuttgart-dfb-pokal-2025", "/players", "/players/marcus-thuram", "/atelier", "/boxes", "/process", "/about", "/contact", "/legal", "/privacy"];

/** A text as React writes it in HTML. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

/** Every text of a dictionary (the words of functions are checked through the pages). */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v !== null && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

/** The English sentences that must not be seen in this language: every English text of 3 words or more that its translation does not keep. */
function englishLeft(code: (typeof LANGUAGES)[number]["code"]): string[] {
  const lang = LANGUAGES.find((l) => l.code === code)!;
  const own = [...strings(lang.ui), ...Object.values(lang.content)].join("\n");
  const source = [...strings({ ...en, seoPages: {} }), ...catalogueTexts(defaultCatalogue).text];
  return [...new Set(source)].filter((s) => s.trim().split(/\s+/).length >= 3 && !own.includes(s));
}

/** The text of the page and of its labels (alt, aria-label, title, placeholder, head). */
async function pageWords(page: Page): Promise<string> {
  return page.evaluate(() => {
    const attrs = Array.from(document.querySelectorAll("[alt],[aria-label],[title],[placeholder]")).flatMap((el) => ["alt", "aria-label", "title", "placeholder"].map((a) => el.getAttribute(a) ?? ""));
    const description = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    return [document.title, description, document.body.innerText, ...attrs].join("\n");
  });
}

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

for (const { code, ui } of LANGUAGES) {
  test(code + ": every page in its language, no English left, no error, no overflow", async ({ page }, info) => {
    const left = englishLeft(code);
    const titles = new Set<string>();
    let homeTitle = "";
    for (const path of PAGES) {
      const address = "/" + code + (path === "/" ? "" : path);
      const name = code + "-" + (path === "/" ? "home" : path.slice(1).replace(/\//g, "-"));
      const title = await checkPage(page, info, address, name, path === "/" ? 3 : 1);
      titles.add(title);
      if (path === "/") homeTitle = title;
      expect(await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]), "language of " + address).toEqual([code, code === "ar" ? "rtl" : "ltr"]);
      const words = await pageWords(page);
      expect(left.filter((s) => words.includes(s)), "English left on " + address).toEqual([]);
      // Every link of the page stays in the language (the language menu and the back-office aside).
      const links = await page.locator("a[href^='/']:not([hreflang])").evaluateAll((els) => els.map((a) => a.getAttribute("href") ?? ""));
      expect(links.filter((h) => !h.startsWith("/" + code + "/") && h !== "/" + code && !h.startsWith("/media/") && !h.startsWith("/api/")), "links out of " + code + " on " + address).toEqual([]);
    }
    expect(titles.size, "every page has its own title").toBe(PAGES.length);
    const home = ui.seoPages["/"]!.title;
    expect(homeTitle, "home title in " + code).toBe(home.includes("Berete Jewellers") ? home : home + " — Berete Jewellers");
  });
}

test("the language menu keeps the page, the links stay in the language", async ({ page, isMobile }) => {
  const problems = watch(page);
  await page.goto("/creations/pendants", { waitUntil: "load" });
  const choose = async (code: string) => {
    if (isMobile) {
      await page.getByRole("button", { name: en.nav.openMenu }).or(page.locator("header button[aria-controls='mobile-menu']")).first().click();
      await page.locator("#mobile-menu [data-language='" + code + "']").click();
    } else {
      await page.locator("header [data-language-menu] button").click();
      await page.locator("header [data-language-menu] [data-language='" + code + "']").click();
    }
    await page.waitForURL("**/" + code + "/creations/pendants");
    await expect(page.locator("html")).toHaveAttribute("lang", code);
  };
  await choose("fr");
  await expect(page.locator("h1")).toContainText(fr.collections.items.pendants.name);
  await choose("ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("h1")).toContainText(ar.collections.items.pendants.name);
  await choose("es");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

  // A card opens the piece in the same language, and its WhatsApp message is written in it.
  await page.locator("[data-piece-card]").first().scrollIntoViewIfNeeded();
  await page.locator("[data-piece-card]").first().click();
  await page.waitForURL("**/es/pieces/**");
  const title = (await page.locator("article[data-piece] h1").innerText()).trim();
  const href = (await page.locator("[data-want-piece]").getAttribute("href")) ?? "";
  expect(decodeURIComponent(href.split("text=")[1] ?? "").toLowerCase()).toBe(es.whatsapp.piece(title).toLowerCase());
  expect(problems.errors).toEqual([]);
});

test("Arabic reads right to left, with its fonts and mirrored gestures", async ({ page, isMobile }, info) => {
  const problems = watch(page);
  await page.goto("/ar", { waitUntil: "load" });
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const vw = await page.evaluate(() => document.documentElement.clientWidth);
  // The logo opens the bar on the right.
  const logo = await page.locator("header a").first().boundingBox();
  expect((logo?.x ?? 0) + (logo?.width ?? 0) / 2, "logo on the right").toBeGreaterThan(vw / 2);
  // No letter spacing (it would break the joined letters), the Arabic fonts loaded.
  const spacing = await page.locator("[data-collections] h2").evaluate((el) => getComputedStyle(el).letterSpacing);
  expect(["normal", "0px"]).toContain(spacing);
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => Array.from(document.fonts).filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")));
  expect(fonts, "Arabic fonts loaded").toEqual(expect.arrayContaining(["IBM Plex Sans Arabic"]));

  // A story moves forward with a tap on the left.
  await page.locator("[data-story-bubble]").first().click();
  const viewer = page.locator("[data-story]");
  await expect(viewer).toBeVisible();
  const surface = await page.locator("[data-story-surface]").boundingBox();
  await page.mouse.click((surface?.x ?? 0) + (surface?.width ?? 0) * 0.15, (surface?.y ?? 0) + (surface?.height ?? 0) / 2);
  await expect(viewer).toHaveAttribute("data-step", "1");
  await page.mouse.click((surface?.x ?? 0) + (surface?.width ?? 0) * 0.85, (surface?.y ?? 0) + (surface?.height ?? 0) / 2);
  await expect(viewer).toHaveAttribute("data-step", "0");
  await page.keyboard.press("Escape");

  if (!isMobile) {
    // The details of a piece scroll toward the left: the row moves to the right.
    await page.goto("/ar/pieces/kevin-schade-dragon-ball-pendant", { waitUntil: "load" });
    const top = await page.locator("#piece-details").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await scrollTo(page, top + 600);
    await page.waitForTimeout(1200);
    const x = await page.locator("[data-gallery-item]").first().evaluate((el) => new DOMMatrix(getComputedStyle(el.parentElement!).transform).m41);
    expect(x, "gallery moves to the right").toBeGreaterThan(50);
    await page.screenshot({ path: shotPath(info, "ar-gallery"), type: "jpeg", quality: 60 });
  }
  expect(problems.errors).toEqual([]);
});

test("addresses: each language has its pages, its not-found page, its hreflang and its sitemap", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "once is enough");
  // An address that is also a folder answers with its page, not a redirect.
  for (const path of ["/creations", "/fr", "/fr/creations", "/ar/players"]) {
    const res = await page.request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(200);
  }
  const arHome = await (await page.request.get("/ar")).text();
  expect(arHome).toMatch(/<html lang="ar" dir="rtl">/);
  expect(arHome).toContain(ar.home.title);

  // An unknown address: the "page not found" of its language, with the 404 status.
  for (const { code, ui } of LANGUAGES) {
    const res = await page.request.get("/" + code + "/not-a-page");
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(html).toContain('<html lang="' + code + '"');
    expect(html).toContain(escapeHtml(ui.notFound.eyebrow));
  }
  expect((await page.request.get("/not-a-page")).status()).toBe(404);

  // hreflang: every language of the page, and the English one by default.
  await page.goto("/fr/atelier", { waitUntil: "load" });
  const alternates = await page.locator("link[rel='alternate'][hreflang]").evaluateAll((els) => els.map((l) => l.getAttribute("hreflang") + " " + new URL(l.getAttribute("href") ?? "").pathname));
  expect(alternates.sort()).toEqual(["ar /ar/atelier", "en /atelier", "es /es/atelier", "fr /fr/atelier", "x-default /atelier"]);

  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  for (const path of ["/fr/creations/pendants", "/es/pieces/kevin-schade-dragon-ball-pendant", "/ar/players/marcus-thuram"]) expect(sitemap).toContain(path + "</loc>");
  expect(sitemap).not.toContain("/fr/admin");
});
