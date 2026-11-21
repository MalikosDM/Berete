import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, test, type Locator, type Page } from "./fixtures";
import { catalogueRedirects } from "../scripts/vercel-redirects";
import { defaultCatalogue } from "../src/data/catalogue";
import { HOUSE_PHOTO_PLACES } from "../src/data/house";
import { NEW_PIECES, REMOVED_PIECES } from "../src/data/pieces";
import { removedPieceTarget } from "../src/data/relations";
import { CUTOUTS, resolveShowcase } from "../src/data/showcase";
import { resolveTheme } from "../src/data/themes";
import { fr as houseFr } from "../src/i18n/house/fr";
import { getCatalogue, scrollTo, shotPath, skipIntro, watch } from "./helpers";

/*
 * The "Berete identity" pass (November 2026): the new names of the founder in English and French, the ten pieces
 * removed from the catalogue (unpublished, their addresses redirected), the drafts made from his photos (unpublished),
 * "Enter the World" on every piece, the page The House, the universe of each piece (and the texts readable on it), the
 * Signature Trunk, the admin. Screenshots: verification/<device>/identity-*.jpg, univers-*.jpg, house-*.jpg, admin-*.jpg.
 */

const sharp = createRequire(import.meta.url)("sharp") as typeof import("sharp");
const desktopOnly = () => test.skip(test.info().project.name !== "desktop", "once is enough");

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

test("the removed pieces appear nowhere; their addresses lead to their player, else to the creations (301)", async ({ page }) => {
  desktopOnly();
  const cat = await getCatalogue(page);
  for (const slug of REMOVED_PIECES) expect(cat.pieces.some((p) => p.slug === slug), slug + " in the catalogue").toBe(false);
  for (const slug of REMOVED_PIECES) {
    const target = removedPieceTarget(defaultCatalogue, slug)!;
    for (const prefix of ["", "/fr", "/ar"]) {
      const res = await page.request.get(prefix + "/pieces/" + slug, { maxRedirects: 0 });
      expect(res.status(), prefix + "/pieces/" + slug).toBe(301);
      expect(res.headers()["location"], prefix + "/pieces/" + slug).toBe(prefix + target);
    }
  }
  // The players who have no published piece left leave the circle: their page leads to it.
  for (const slug of ["jeff-chabot", "sidney-eweka"]) {
    expect(cat.people.some((p) => p.slug === slug), slug + " in the circle").toBe(false);
    const res = await page.request.get("/players/" + slug, { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers()["location"]).toBe("/players");
  }
  // Nowhere in the lists, the sitemap or the previews of the pages.
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  for (const slug of REMOVED_PIECES) expect(sitemap, slug + " in the sitemap").not.toContain("/pieces/" + slug);
  for (const path of ["/creations", "/players", "/players/marcus-thuram", "/players/tanguy-nianzou", "/"]) {
    await page.goto(path);
    const links = await page.locator("a[href*='/pieces/']").evaluateAll((els) => els.map((a) => a.getAttribute("href") ?? ""));
    for (const slug of REMOVED_PIECES) expect(links.filter((h) => h.endsWith("/pieces/" + slug)), slug + " on " + path).toEqual([]);
  }
  // The site without its server (Vercel) has the same redirects.
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { redirects: unknown[]; headers: { headers: { value: string }[] }[] };
  expect(vercel.redirects, "vercel.json is up to date (npm run redirects)").toEqual(catalogueRedirects());
  // The pages stay closed to search engines until the launch.
  expect(JSON.stringify(vercel.headers)).toContain("noindex");
});

test("the drafts made from Yoni's photos are published (20/11/2026): each with its page, made for a private collector", async ({ page }) => {
  desktopOnly();
  const cat = await getCatalogue(page);
  // Unpublished: the 10 removed pieces, the tennis chain he crossed out and the 4 pieces with too few photos (21/11), only.
  expect(REMOVED_PIECES).toContain("two-row-tennis-chain");
  expect(defaultCatalogue.pieces.filter((p) => !p.published).map((p) => p.slug).sort()).toEqual([...REMOVED_PIECES].sort());
  for (const slug of NEW_PIECES.filter((s) => !REMOVED_PIECES.includes(s))) {
    const piece = cat.pieces.find((p) => p.slug === slug);
    expect(piece, slug).toBeTruthy();
    expect(piece!.gallery.length + 1, slug + " has its photos").toBeGreaterThanOrEqual(2);
    expect(piece!.people, slug + " linked to no page of a person").toEqual([]);
    // Made for a private collector, but the panther: made for Lasana Keita (the album of Yoni, 20/11/2026).
    if (slug === "panther-champion-pendant") expect(piece!.client).toBe("Lasana Keita");
    else expect(piece!.clientPublic, slug).toBe(false);
    // Never the first names engraved on the back of N14.
    expect(piece!.title + " " + piece!.line + " " + piece!.story, slug).not.toMatch(/Nathalie|José|Jose\b|Loan|Elya|Annie/i);
    const res = await page.request.get("/pieces/" + slug, { maxRedirects: 0 });
    expect(res.status(), slug).toBe(200);
  }
});

test("Enter the World / Entrer dans l'univers on every piece", async ({ page }, info) => {
  for (const [prefix, words] of [["", "Enter the World"], ["/fr", "Entrer dans l’univers"]] as const) {
    await page.goto(prefix + "/creations");
    const cards = page.locator("[data-piece-card]");
    const count = await cards.count();
    expect(count).toBe((await getCatalogue(page)).pieces.length);
    for (let i = 0; i < count; i++) await expect(cards.nth(i).locator("[data-enter-world]")).toHaveText(words);
  }
  await page.goto("/");
  await scrollTo(page, await page.locator("[data-enter-world]").first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY - 200));
  await page.waitForTimeout(900);
  await page.screenshot({ path: shotPath(info, "identity-enter-the-world"), type: "jpeg", quality: 70 });
});

/** Labels replaced by the founder: none may be seen any more (text, alt, aria-label, title, head). */
const OLD_LABELS: Record<"en" | "fr", string[]> = {
  en: [
    "Start your piece", "Chat with us on WhatsApp", "Discover creations", "Custom high jewellery for champions", "Designed for clubs. Worn by champions.", "Statement pieces, made to be seen",
    "Special project", "Discover the ring", "Lift the top", "By type of jewel", "Selected pieces", "The capsules", "All players", "Worn by champions", "Inside the house", "From sketch to handover",
    "Trusted by", "Your piece in 3 clicks", "Technical sheet", "Metal and stones", "Custom box available", "Similar pieces", "I want a piece like this", "Other ways to reach us", "How it was made",
    "The first drawing", "Raw piece", "Watch the stories", "Inspired by this piece?", "Up close", "Every symbol has a meaning", "See the photo", "Handed over to", "Handover to the squad",
    "Read the article", "The making of a piece", "Follow it on WhatsApp", "See the process", "Made to measure", "Create your own box", "we draw the box with you", "Six steps, one conversation", "First contact",
    "Balance & delivery", "Clear from the start", "Six steps, paid in stages", "Step one is a message", "Our story", "Portrait of the founder", "Prefer a call back?", "Prefer email?", "Something else",
    "Type of piece", "Featured capsule", "Enter the capsule", "See the piece",
  ],
  fr: [
    "Créer votre pièce", "Écrivez-nous sur WhatsApp", "Haute joaillerie sur mesure pour les champions", "Découvrir les créations", "Pensé pour les clubs", "Des pièces affirmées", "Projet spécial",
    "Bagues de champions", "Découvrir la bague", "Soulever le plateau", "Par type de bijou", "Pièces choisies", "Les capsules", "Tous les joueurs", "Portées par des champions", "Au cœur de la maison",
    "De l’esquisse à la remise", "Ils nous font confiance", "Votre pièce en 3 clics", "Réalisée pour", "Sa réalisation", "Le premier dessin", "Pièce brute", "Fiche technique", "Métal et pierres",
    "Écrin sur mesure disponible", "Pièces similaires", "Une pièce comme celle-ci", "Autres moyens de nous joindre", "Voir les stories", "Cette pièce vous inspire", "De près", "Chaque symbole a un sens",
    "Voir la photo", "Remise à l’équipe", "Lire l’article", "La réalisation d’une pièce", "Suivez-la sur WhatsApp", "Voir le processus", "Créer votre écrin", "nous dessinons l’écrin avec vous",
    "Six étapes, une conversation", "Premier contact", "Solde et livraison", "Clair dès le départ", "La première étape est un message", "Notre histoire", "Portrait du fondateur",
    "Vous préférez un rappel", "Vous préférez l’e-mail", "Autre chose", "Type de pièce", "Capsule à l’honneur", "Voir la pièce",
  ],
};
const WORDING_PAGES = ["/", "/creations", "/pieces/campione-d-italia-2023-2024", "/pieces/kevin-schade-dragon-ball-pendant", "/players", "/players/marcus-thuram", "/atelier", "/boxes", "/process", "/about", "/contact"];

async function pageWords(page: Page): Promise<string> {
  return page.evaluate(() => {
    const attrs = Array.from(document.querySelectorAll("[alt],[aria-label],[title],[placeholder]")).flatMap((el) => ["alt", "aria-label", "title", "placeholder"].map((a) => el.getAttribute(a) ?? ""));
    const description = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    const og = Array.from(document.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"]')).map((m) => m.getAttribute("content") ?? "");
    // The menus and dialogs not open yet count too.
    return [document.title, description, ...og, document.body.textContent ?? "", ...attrs].join("\n");
  });
}

test("the new names of the founder everywhere, in English and in French: no old label left", async ({ page }) => {
  desktopOnly();
  for (const lang of ["en", "fr"] as const) {
    for (const path of WORDING_PAGES) {
      const address = lang === "en" ? path : "/fr" + (path === "/" ? "" : path);
      await page.goto(address, { waitUntil: "load" });
      await page.waitForTimeout(300);
      const words = await pageWords(page);
      expect(OLD_LABELS[lang].filter((old) => words.includes(old)), "old labels on " + address).toEqual([]);
    }
  }
  // A few of the new ones, where they belong.
  await page.goto("/");
  for (const name of ["The Creations", "The Berete Circle", "The Atelier", "Signature Trunks", "The Bespoke Journey", "The House", "Private Enquiries"]) await expect(page.locator("header nav[data-desktop-nav]")).toContainText(name);
  await expect(page.locator("h1")).toContainText("The Art of Individuality");
  await page.goto("/fr");
  for (const name of ["Les Créations", "Le Cercle Berete", "L’Atelier", "Écrins Signature", "L’Expérience sur mesure", "La Maison", "Contact privé"]) await expect(page.locator("header nav[data-desktop-nav]")).toContainText(name);
  await expect(page.locator("h1")).toContainText("L’Art de la singularité");
});

test("The House: Yoni Berete's story in chapters, his three quotes, the signature, no empty photo frame", async ({ page }, info) => {
  const problems = watch(page);
  await page.goto("/about", { waitUntil: "load" });
  await page.waitForTimeout(1200);
  await expect(page.locator("h1")).toContainText("Yoni Berete");
  await expect(page.locator("h1")).toContainText("Founder & Creative Director");
  await expect(page.getByText("Two worlds. One legacy. A singular vision.")).toBeVisible();
  await expect(page.getByText("An independent vision of contemporary high jewellery.")).toBeVisible();
  await page.screenshot({ path: shotPath(info, "house-1-ouverture"), type: "jpeg", quality: 70 });
  await expect(page.locator("[data-house-chapter]")).toHaveCount(12);
  const quotes = page.locator("[data-house-quote]");
  await expect(quotes).toHaveCount(3);
  for (const [i, label] of ["01 — The Identity", "02 — The Philosophy", "03 — The Journey"].entries()) {
    await expect(quotes.nth(i)).toContainText(label);
    await expect(quotes.nth(i)).toContainText("Yoni Berete");
  }
  // His portrait only (22/11/2026): no photo, so no frame, in the chapters and the quotes.
  await expect(page.locator("[data-house-photo]")).toHaveCount(1);
  await expect(page.locator("[data-house-chapter] [data-house-photo], [data-house-quote] [data-house-photo]")).toHaveCount(0);
  await quotes.nth(0).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: shotPath(info, "house-2-citation"), type: "jpeg", quality: 70 });
  await expect(page.locator("[data-house]")).toContainText("A legacy passed down. An identity embraced. A singular vision.");
  await expect(page.locator("[data-house]")).toContainText("Made by us. Inspired by you.");
  // In French, the very text of Yoni, with Belgium and Antwerp in his story.
  await page.goto("/fr/about", { waitUntil: "load" });
  await page.waitForTimeout(800);
  const text = (await page.locator("[data-house]").textContent()) ?? "";
  for (const chapter of houseFr.chapters) {
    expect(text).toContain(chapter.title);
    for (const paragraph of chapter.paragraphs) expect(text).toContain(paragraph);
  }
  for (const quote of houseFr.quotes) expect(text).toContain(quote.text);
  expect(text).toContain("Un héritage transmis. Une identité assumée. Une vision singulière.");
  expect(text).toContain("Né en Belgique");
  expect(text).toContain("Anvers");
  await page.screenshot({ path: shotPath(info, "house-3-fr"), type: "jpeg", quality: 70 });
  await page.locator("[data-house-quote='3']").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.screenshot({ path: shotPath(info, "house-4-fr-parcours"), type: "jpeg", quality: 70 });
  expect(problems.errors).toEqual([]);
});

/** Relative luminance of an sRGB colour. */
function luminance(r: number, g: number, b: number): number {
  const c = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

/** The background behind a text, the text hidden: the luminance of its brightest pixels (95th percentile). */
async function backgroundLuminance(page: Page, el: Locator): Promise<number> {
  const box = await el.boundingBox();
  if (!box || box.width < 2 || box.height < 2) return 0;
  const png = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const values: number[] = [];
  for (let i = 0; i < data.length; i += info.channels * 3) values.push(luminance(data[i]!, data[i + 1]!, data[i + 2]!));
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length * 0.95)] ?? 0;
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

test("each piece enters its own world: its universe, readable texts (AA), still when motion is reduced", async ({ page }, info) => {
  const problems = watch(page);
  await skipIntro(page);
  const cat = await getCatalogue(page);
  const low: string[] = [];
  for (const piece of cat.pieces) {
    await page.goto("/pieces/" + piece.slug, { waitUntil: "load" });
    // Once its entrance has played.
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    await page.waitForTimeout(400);
    await expect(page.locator("[data-universe]"), piece.slug).toHaveAttribute("data-universe", resolveTheme(piece.theme).preset);
    await page.screenshot({ path: shotPath(info, "univers-" + piece.slug), type: "jpeg", quality: 62, timeout: 45_000 });
    // The texts of the opening, hidden, to measure the background they sit on.
    const opening = page.locator("[data-piece-opening]");
    // (a title painted with a gradient, gold or pearl, is text too: its gradient goes with it).
    await page.addStyleTag({
      content: "[data-piece-opening] p, [data-piece-opening] h1, [data-piece-opening] p * { color: transparent !important; text-shadow: none !important; background: none !important; filter: none !important; }",
    });
    await page.waitForTimeout(100);
    // The lightest texts of the opening (mist and rose gold) against the lightest part of their background.
    const textLum = luminance(0xe8, 0xb4, 0xa0);
    for (const el of [opening.locator("p.eyebrow").first(), opening.locator("h1"), opening.locator("h1 + p")]) {
      if ((await el.count()) === 0) continue;
      const ratio = contrast(textLum, await backgroundLuminance(page, el));
      if (ratio < 4.5) low.push(piece.slug + ": " + ratio.toFixed(2));
    }
  }
  expect(low, "texts under AA contrast on their universe").toEqual([]);
  // Reduced motion: the universe stands still.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/pieces/kevin-schade-dragon-ball-pendant", { waitUntil: "load" });
  expect(await page.locator(".universe-stage").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(await page.locator(".u-light").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(await page.locator("[data-piece-cover] img").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await expect(page.locator(".u-entrance")).toBeHidden();
  await expect(page.locator(".u-fx")).toBeHidden();
  await page.waitForTimeout(1500);
  expect(await page.locator(".u-fx").evaluate((el) => el.hasAttribute("data-running"))).toBe(false);
  expect(problems.errors).toEqual([]);
});

test("entering the world: the AI backdrop, the title typography, a cinematic entrance once per visit, the effects", async ({ page }, info) => {
  const problems = watch(page);
  await skipIntro(page);
  const cases: [slug: string, backdrop: string, font: string][] = [
    // Since 20/11/2026: its own world, the Genkidama (tests/capsules.spec.ts).
    ["kevin-schade-dragon-ball-pendant", "genkidama", "Shojumaru"],
    ["michy-batshuayi-butterfly-chain", "butterfly", "Italiana"],
    ["campione-d-italia-2023-2024", "inter", "Cinzel"],
    ["vfb-stuttgart-dfb-pokal-2025", "vfb", "Grenze Gotisch"],
    ["noah-okafor-jersey-pendant", "tunnel", "Big Shoulders Display"],
  ];
  for (const [slug, backdrop, font] of cases) {
    await page.goto("/pieces/" + slug, { waitUntil: "load" });
    const article = page.locator("article[data-piece]");
    await expect(article, slug).toHaveAttribute("data-entering", "");
    await expect(page.locator(".universe"), slug).toHaveAttribute("data-backdrop", backdrop);
    // The title font, announced in the page and really loaded (never a fallback that would change the title).
    await expect(page.locator(`link[rel="preload"][as="font"][href^="/fonts/universe/"]`), slug).toHaveCount(1);
    expect(await page.locator("[data-u-title]").evaluate((el) => getComputedStyle(el).fontFamily), slug).toContain(font);
    await expect.poll(() => page.evaluate((f) => [...document.fonts].some((x) => x.family.replace(/"/g, "") === f && x.status === "loaded"), font), { message: slug + " font" }).toBe(true);
    await page.waitForTimeout(700);
    await page.screenshot({ path: shotPath(info, "entree-" + backdrop + "-1"), type: "jpeg", quality: 62 });
    // The entrance ends; the backdrop is there, the effects run.
    await expect(article, slug).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    // Its file: landscape on a computer, the portrait crop on a phone.
    await expect.poll(() => page.locator(".u-backdrop img").evaluate((i: HTMLImageElement) => (i.complete && i.naturalWidth > 0 ? i.currentSrc : "")), { message: slug + " backdrop" }).toMatch(
      new RegExp("/media/universes/" + backdrop + (info.project.name === "desktop" ? "-\\d+" : "-m-\\d+") + "\\.(avif|webp)$"),
    );
    await expect(page.locator(".u-fx"), slug).toHaveAttribute("data-running", "", { timeout: 10_000 });
    await page.screenshot({ path: shotPath(info, "entree-" + backdrop + "-2"), type: "jpeg", quality: 62 });
  }
  // A return to a piece already entered: no entrance again.
  await page.goto("/pieces/campione-d-italia-2023-2024", { waitUntil: "load" });
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 1500 });
  await expect(page.locator(".u-twenty > span")).toHaveCount(20);
  // Dragon Ball: the watermark 力, and opening a photo strikes like an impact.
  await page.goto("/pieces/kevin-schade-dragon-ball-pendant", { waitUntil: "load" });
  await expect(page.locator(".u-mark[data-brush]")).toHaveText("力");
  const first = page.locator("#piece-details button").first();
  await first.scrollIntoViewIfNeeded();
  await first.click();
  await expect(page.locator("body > .u-impact")).toHaveCount(1);
  await page.keyboard.press("Escape");
  expect(problems.errors).toEqual([]);
});

test("the opening: every jewel whole on screen (cut out, one view or a showcase), a click or a swipe changes the view", async ({ page }, info) => {
  const problems = watch(page);
  await skipIntro(page);
  const cat = await getCatalogue(page);
  const cut: string[] = [];
  for (const piece of cat.pieces) {
    await page.goto("/pieces/" + piece.slug, { waitUntil: "load" });
    await expect(page.locator("article[data-piece]"), piece.slug).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    const shown = resolveShowcase(piece.slug, piece.showcase);
    await expect(page.locator("[data-showcase]"), piece.slug).toHaveCount(shown.mode === "photo" ? 0 : 1);
    if (shown.mode !== "photo") await expect(page.locator("[data-showcase]")).toHaveAttribute("data-showcase", shown.mode);
    await page.waitForTimeout(500);
    // The drawn image of each visible view (object-fit: contain) inside the screen: under the menu, above the bottom bar.
    const out = await page.evaluate(() => {
      const visible = (el: Element) => el.getClientRects().length > 0 && (el as HTMLElement).offsetParent !== null;
      const header = document.querySelector("header")!.getBoundingClientRect().bottom;
      const bar = [...document.querySelectorAll("div.fixed.bottom-0")].find(visible);
      const floor = bar ? bar.getBoundingClientRect().top : innerHeight;
      const imgs = [...document.querySelectorAll<HTMLImageElement>("[data-piece-cover] img")].filter((i) => visible(i) && i.complete && !i.closest('[data-showcase-slide]:not([data-showcase-slide="0"])'));
      return imgs.flatMap((img) => {
        const b = img.getBoundingClientRect();
        const k = Math.min(b.width / img.naturalWidth, b.height / img.naturalHeight);
        const w = img.naturalWidth * k;
        const h = img.naturalHeight * k;
        const r = { left: b.left + (b.width - w) / 2, top: b.top + (b.height - h) / 2, right: b.left + (b.width + w) / 2, bottom: b.top + (b.height + h) / 2 };
        const bad = [r.top < header + 6 && "top", r.bottom > floor - 6 && "bottom", r.left < 6 && "left", r.right > innerWidth - 6 && "right"].filter(Boolean);
        return bad.length ? [img.closest("[data-showcase-view]")?.getAttribute("data-showcase-view") ?? "photo", ...bad] : [];
      });
    });
    if (out.length) cut.push(piece.slug + ": " + out.join(" "));
    // The dots of a phone never over the title.
    const dots = page.locator("[data-showcase-dots]");
    if ((await dots.count()) && (await dots.isVisible())) expect((await dots.boundingBox())!.y + 48, piece.slug).toBeLessThanOrEqual((await page.locator("[data-u-title]").boundingBox())!.y);
  }
  expect(cut, "jewels cut by the screen").toEqual([]);

  await page.goto("/pieces/vfb-stuttgart-dfb-pokal-2025", { waitUntil: "load" });
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
  if (info.project.name === "desktop") {
    // A click on a view around: it takes the middle, the main one takes its place.
    const main = await page.locator('[data-place="0"]').getAttribute("data-showcase-view");
    const other = page.locator('[data-place="2"]');
    const id = await other.getAttribute("data-showcase-view");
    await other.click();
    await expect(page.locator('[data-place="0"]')).toHaveAttribute("data-showcase-view", id!);
    await expect(page.locator('[data-showcase-view="' + main + '"]')).toHaveAttribute("data-place", "2");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: shotPath(info, "vitrine-clic"), type: "jpeg", quality: 62 });
  } else {
    // A swipe (the track scrolls): the dot follows; a dot brings its view.
    const track = page.locator("[data-showcase-track]");
    await track.evaluate((t) => t.scrollTo({ left: t.clientWidth, behavior: "auto" }));
    await expect(page.locator("[data-showcase-dots] button").nth(1)).toHaveAttribute("aria-current", "true");
    await page.locator("[data-showcase-dots] button").nth(2).click();
    await expect.poll(() => track.evaluate((t) => Math.round(Math.abs(t.scrollLeft) / t.clientWidth))).toBe(2);
    await expect(page.locator("[data-showcase-dots] button").nth(2)).toHaveAttribute("aria-current", "true");
    await page.screenshot({ path: shotPath(info, "vitrine-glisser"), type: "jpeg", quality: 62 });
  }
  expect(problems.errors).toEqual([]);
});

test("the atelier opens on a horizontal film, sharp, in the warm black and white of the atelier", async ({ page }, info) => {
  const problems = watch(page);
  await page.goto("/atelier", { waitUntil: "load" });
  const video = page.locator("section[aria-labelledby='atelier-title'] video");
  await expect(video).toHaveAttribute("src", /\/media\/hd\/atelier\/v12\.mp4$/);
  await video.evaluate((v: HTMLVideoElement) => new Promise((r) => (v.readyState >= 1 ? r(null) : v.addEventListener("loadedmetadata", () => r(null), { once: true }))));
  const size = await video.evaluate((v: HTMLVideoElement) => [v.videoWidth, v.videoHeight]);
  expect(size[0]!).toBeGreaterThan(size[1]!);
  expect(size[0]!).toBeGreaterThanOrEqual(1280);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: shotPath(info, "identity-atelier-film"), type: "jpeg", quality: 70 });
  expect(problems.errors).toEqual([]);
});

test("admin: the removed pieces and the drafts unpublished, the universe of a piece, the photos of The House", async ({ page }, info) => {
  desktopOnly();
  const password = process.env.ADMIN_PASSWORD;
  test.skip(!password, "ADMIN_PASSWORD (.env) is needed to open the admin");
  const problems = watch(page);
  await page.goto("/admin");
  await page.getByLabel("Mot de passe").fill(password!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("tab", { name: "Pièces" })).toBeVisible();
  // The removed pieces, unpublished; the pieces published on 20/11/2026 in the list.
  await expect(page.locator("[data-row-unpublished]")).toHaveCount(REMOVED_PIECES.length);
  for (const slug of REMOVED_PIECES) await expect(page.locator("[data-admin-row='" + slug + "'] [data-row-unpublished]"), slug).toHaveCount(1);
  for (const slug of NEW_PIECES) await expect(page.locator("[data-admin-row='" + slug + "']"), slug).toHaveCount(1);
  await page.locator("[data-admin-row='pear-link-chain']").scrollIntoViewIfNeeded();
  await page.screenshot({ path: shotPath(info, "admin-1-pieces-non-publiees"), type: "jpeg", quality: 70, fullPage: true });
  // The universe of the Dragon Ball pendant, editable.
  await page.locator("[data-admin-row='kevin-schade-dragon-ball-pendant'] button[aria-label='Modifier']").click();
  const theme = page.locator("[data-theme-field]");
  await expect(theme).toBeVisible();
  await expect(theme.locator("select").first()).toHaveValue("energie");
  // Its showcase: automatic (the showcase of the priority universes), its views in their order.
  await expect(page.locator("[data-showcase-field] [data-showcase-choice]")).toHaveCount(CUTOUTS["kevin-schade-dragon-ball-pendant"]!.length);
  await expect(page.getByLabel(/Publiée sur le site/)).toBeChecked();
  await theme.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1600);
  await theme.screenshot({ path: shotPath(info, "admin-2-univers"), type: "jpeg", quality: 70 });
  await page.getByRole("button", { name: "Annuler" }).click();
  // The House: one place per photo; a photo sent here shows on the page, then is taken away.
  await page.getByRole("tab", { name: "La Maison" }).click();
  await expect(page.locator("[data-house-place]")).toHaveCount(HOUSE_PHOTO_PLACES.length);
  await page.screenshot({ path: shotPath(info, "admin-3-la-maison"), type: "jpeg", quality: 70 });
  const portrait = page.locator("[data-house-place='portrait']");
  await portrait.locator("input[type=file]").setInputFiles("public/media/hd/the-hand/p07.webp");
  await expect(portrait.getByText("Enregistré.")).toBeVisible();
  const about = await page.context().newPage();
  await about.goto("/about", { waitUntil: "load" });
  await expect(about.locator("[data-house-photo]")).toHaveCount(1, { timeout: 20_000 });
  await about.waitForTimeout(1500);
  await about.screenshot({ path: shotPath(info, "admin-4-photo-dans-la-maison"), type: "jpeg", quality: 70 });
  await about.close();
  await portrait.getByRole("button", { name: "Retirer" }).click();
  await expect(portrait.getByText("Enregistré.")).toBeVisible();
  await expect(portrait.locator("img")).toHaveCount(0);
  // The cutouts: every view on a checkerboard and on black; one excluded, gone from the page, then brought back.
  await page.getByRole("tab", { name: "Détourages" }).click();
  await expect(page.locator("[data-cutouts-piece]")).toHaveCount(Object.keys(CUTOUTS).length);
  await page.screenshot({ path: shotPath(info, "admin-5-detourages"), type: "jpeg", quality: 70 });
  const view = page.locator("[data-cutout='kevin-schade-dragon-ball-pendant/p18']");
  await view.getByRole("button", { name: "Exclure" }).click();
  await expect(view).toHaveAttribute("data-cutout-excluded", "");
  const piecePage = await page.context().newPage();
  await piecePage.goto("/pieces/kevin-schade-dragon-ball-pendant", { waitUntil: "load" });
  await expect(piecePage.locator("[data-showcase]")).toHaveCount(1);
  await expect(piecePage.locator('[data-showcase-view="p18"]')).toHaveCount(0, { timeout: 20_000 });
  await piecePage.close();
  await view.getByRole("button", { name: "Rétablir" }).click();
  await expect(view).not.toHaveAttribute("data-cutout-excluded", "");
  expect(problems.errors).toEqual([]);
});
