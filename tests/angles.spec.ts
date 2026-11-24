// Feedback of Yoni, 21/11/2026.
// 1. "Every Angle" on every piece: each photo and film with its text (a small title, one or two sentences), numbered,
//    photo and text in turn (src/components/EveryAngle.tsx, texts in src/data/angles.json, translated in the 6 languages),
//    "See N more" when there are many; on a phone the photo, then its text. Yoni changes the texts in the admin.
// 2. Four pieces with too few photos taken off the site (unpublished, kept in the admin): nowhere on the site, their old
//    addresses lead to the creations, the counts of the filters follow. (24/11/2026: the White Iced Cuban chain is back.)
// 3. The three Jesus pieces stay on the site.
// 24/11/2026 (Yoni): "Every Angle" shows four photos first (the strongest: on black first, films last), then "See N more".
// Screenshots go to verification/angles/.
import { mkdirSync, readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "./fixtures";
import { anglePhotos, wornSet, DEFAULT_ANGLES } from "../src/data/angles";
import { defaultCatalogue } from "../src/data/catalogue";
import { partOf, REMOVED_PIECES } from "../src/data/pieces";
import { pieceMediaOf } from "../src/data/pageMedia";
import { publicCatalogue } from "../src/data/relations";
import { resolveShowcase } from "../src/data/showcase";
import { PIECE_TYPES } from "../src/data/types";
import fr from "../src/i18n/content/fr";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/angles";
mkdirSync(DIR, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 66, timeout: 45_000 });
const desktopOnly = () => test.skip(test.info().project.name !== "desktop", "once is enough");

// (24/11/2026: the White Iced Cuban chain is back on the site, and the chain of folder 09 as the Infinity Link; the two
// others stay off.)
const TAKEN_OFF = ["flaneur-medallion", "two-tone-iced-cuban-chain"];
/** "Every Angle" shows four photos, then "See N more" (24/11/2026, src/components/EveryAngle.tsx). */
const anglesShownFirst = (n: number) => Math.min(n, 4);
const JESUS_PIECES = ["samuel-ballet-jesus-piece", "crown-of-thorns-jesus-piece", "jesus-piece-red-flowers"];
const PUBLISHED = publicCatalogue(defaultCatalogue).pieces;
/** The photos of Every Angle on its page: each once on the page (src/data/pageMedia.ts), never one its opening shows. */
const photosOf = (slug: string) => {
  const piece = PUBLISHED.find((p) => p.slug === slug)!;
  const part = partOf(slug);
  const partPiece = part ? defaultCatalogue.pieces.find((p) => p.slug === part.slug) : undefined;
  return pieceMediaOf(piece, {
    box: piece.boxSlug ? defaultCatalogue.boxes.find((b) => b.slug === piece.boxSlug) : undefined,
    part: part && partPiece ? { piece: partPiece, photos: part.photos } : null,
    opening: resolveShowcase(piece.slug, piece.showcase),
  }).angles;
};

/** The contrast of two colours (WCAG). */
function contrast(a: number[], b: number[]): number {
  const lum = (c: number[]) => {
    const [r, g, bl] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

/** A text on what lies behind it: its colour against the screenshot of its box without it, taken at its lightest. */
async function groundContrast(page: Page, el: Locator): Promise<number> {
  const color = (await el.evaluate((e) => getComputedStyle(e).color)).match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
  // In the middle of the screen: never under the bar of a phone, at the bottom.
  await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(400);
  const box = (await el.boundingBox())!;
  const vw = page.viewportSize()!.width;
  const clip = { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.min(box.width, vw - Math.max(0, box.x)), height: box.height };
  await el.evaluate((e) => ((e as HTMLElement).style.visibility = "hidden"));
  const ground = await page.screenshot({ clip, type: "png" });
  await el.evaluate((e) => ((e as HTMLElement).style.visibility = ""));
  const { default: sharp } = await import("sharp");
  const stats = await sharp(ground).stats();
  return contrast(color, stats.channels.slice(0, 3).map((c) => Math.min(255, c.mean + c.stdev)));
}

// Since 23/11/2026 (Yoni): no text that describes what is seen; at most a short caption (2 to 6 words), on a few photos only.
test("every photo of every piece is listed; no text; a few short captions, translated, no stone named, no invented figure", () => {
  let count = 0;
  let captions = 0;
  for (const piece of PUBLISHED) {
    const photos = anglePhotos(piece, resolveShowcase(piece.slug, piece.showcase).mode === "photo", wornSet(piece));
    // (A piece whose only photos are worn or held shows them in "Worn by", 23/11/2026.)
    expect(photos.length + wornSet(piece).size, piece.slug + " has photos").toBeGreaterThan(0);
    const told = [piece.title, piece.line, piece.story, ...piece.details.flatMap((d) => [d.title, d.text]), ...[piece.cover, ...piece.gallery].flatMap((m) => [m.alt ?? "", m.caption ?? ""])].join(" ");
    for (const m of photos) {
      const a = DEFAULT_ANGLES[piece.slug]?.[m.src];
      // Every photo keeps its place (the admin lists it), with no text.
      if (!a) continue;
      expect(a.text, piece.slug + " " + m.src + ": no text").toBe("");
      expect(piece.angles[m.src], piece.slug + " " + m.src + " in the piece").toEqual(a);
      if (a.title) {
        captions++;
        expect(a.title.split(/\s+/).length, a.title).toBeLessThanOrEqual(6);
        expect(a.title, piece.slug).not.toMatch(/\b(rub(y|ies)|emerald|sapphire|garnet|onyx|carat)/i);
        for (const n of a.title.match(/\d+/g) ?? []) expect(told, piece.slug + ": the figure " + n + " comes from the house").toContain(n);
        expect(fr[a.title], "translated: " + a.title).toBeTruthy();
      }
      count++;
    }
  }
  // (24/11/2026: fewer photos on Sirius and the twisted chain in BRT Flowers; the new studio photos have no entry yet.)
  expect(count).toBeGreaterThan(360);
  expect(captions).toBeLessThan(count / 5);
});

/** Six pieces, the Inter ring, chains, a watch, a Jesus piece with its films from the stories. */
const PAGES = ["campione-d-italia-2023-2024", "michy-batshuayi-butterfly-pendant", "sirius", "marcus-thuram-skeleton-watch", "kevin-schade-dragon-ball-pendant", "samuel-ballet-jesus-piece"];

for (const slug of PAGES) {
  test("Every Angle on " + slug + ": a gallery, at most a short caption, readable", async ({ page }, info) => {
    const problems = watch(page);
    const phone = info.project.name !== "desktop";
    const photos = photosOf(slug);
    await skipIntro(page);
    await page.goto("/fr/pieces/" + slug, { waitUntil: "load" });
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    const section = page.locator("[data-every-angle]");
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator("h2")).toHaveText("Sous tous les angles");
    const tiles = section.locator("[data-angle]");
    await expect(tiles).toHaveCount(anglesShownFirst(photos.length));
    // No text that describes what is seen.
    await expect(section.locator("[data-angle-text]")).toHaveCount(0);
    // A gallery: four on a row on a computer, two on a phone.
    const tops = await tiles.evaluateAll((li) => li.slice(0, 4).map((x) => Math.round(x.getBoundingClientRect().top)));
    if (tops.length >= 3) {
      expect(tops[1]).toBe(tops[0]);
      if (phone) expect(tops[2]).toBeGreaterThan(tops[0]!);
      else expect(tops[2]).toBe(tops[0]);
    }
    // Its captions, translated, readable (16 px at least on a phone, 15 on a computer since 24/11/2026, a contrast AA on its ground).
    for (const caption of await section.locator("[data-angle-title]").all()) {
      await caption.scrollIntoViewIfNeeded();
      expect(Object.values(fr)).toContain((await caption.textContent())!.trim());
      expect(await caption.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(phone ? 16 : 15);
      expect(await groundContrast(page, caption), "the caption on its ground").toBeGreaterThanOrEqual(4.5);
    }
    await section.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -80));
    await page.waitForTimeout(700);
    await shot(page, info.project.name + "-" + slug + "-1");
    // Many photos: the first ones, then "See N more" shows all of them.
    const more = section.locator("[data-angle-more]");
    if (photos.length > anglesShownFirst(photos.length)) {
      await expect(more).toHaveText("Voir plus");
      await more.scrollIntoViewIfNeeded();
      await shot(page, info.project.name + "-" + slug + "-2-voir-plus");
      await more.click();
      await expect(tiles).toHaveCount(photos.length);
    } else await expect(more).toHaveCount(0);
    // A film keeps its place, silent.
    for (const v of await section.locator("[data-angle-type='video'] video").all()) {
      expect(await v.evaluate((el) => (el as HTMLVideoElement).muted)).toBe(true);
    }
    // A photo opens full screen.
    await tiles.first().locator("button").click();
    await expect(page.locator("[role=dialog][data-lenis-prevent]")).toBeVisible();
    await page.keyboard.press("Escape");
    expect(problems.errors).toEqual([]);
  });
}

test("Créations: the four pieces taken off are gone, the counts of the filters follow, the three Jesus pieces stay", async ({ page }, info) => {
  const problems = watch(page);
  await skipIntro(page);
  // (The grid of every creation: "See all creations".)
  await page.goto("/fr/creations?view=grid");
  const cards = page.locator("a[data-piece-card]");
  await expect(cards).toHaveCount(PUBLISHED.length);
  const shown = await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-piece-card")));
  for (const slug of TAKEN_OFF) expect(shown, slug).not.toContain(slug);
  for (const slug of JESUS_PIECES) expect(shown, slug).toContain(slug);
  await expect(page.locator("[data-filter='all'] [data-filter-count]")).toHaveText(String(PUBLISHED.length));
  for (const type of PIECE_TYPES) {
    const n = PUBLISHED.filter((p) => p.type === type).length;
    const filter = page.locator("[data-filter='" + type + "']");
    if (n === 0) await expect(filter).toHaveCount(0);
    else await expect(filter.locator("[data-filter-count]"), type).toHaveText(String(n));
  }
  await page.locator("[data-filter='chain']").click();
  await expect(cards).toHaveCount(PUBLISHED.filter((p) => p.type === "chain").length);
  await shot(page, info.project.name + "-creations-chaines");
  await page.locator("[data-filter='watch']").click();
  await expect(cards).toHaveCount(PUBLISHED.filter((p) => p.type === "watch").length);
  await page.locator("[data-filter='all']").click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, info.project.name + "-creations");
  expect(problems.errors).toEqual([]);
});

test("the four pieces taken off: unpublished, kept; their old addresses lead to the creations; nowhere on the site", async ({ page }) => {
  desktopOnly();
  for (const slug of TAKEN_OFF) {
    expect(REMOVED_PIECES, slug).toContain(slug);
    expect(defaultCatalogue.pieces.find((p) => p.slug === slug)?.published, slug + " kept, unpublished").toBe(false);
    for (const prefix of ["", "/fr", "/ar"]) {
      const res = await page.request.get(prefix + "/pieces/" + slug, { maxRedirects: 0 });
      expect(res.status(), prefix + "/pieces/" + slug).toBe(301);
      expect(res.headers()["location"]).toBe(prefix + "/creations");
    }
  }
  // The site without its server (Vercel) has the same redirects.
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { redirects: { source: string; destination: string }[] };
  for (const slug of TAKEN_OFF) expect(vercel.redirects.find((r) => r.source === "/pieces/" + slug)?.destination).toBe("/creations");
  // In the browser, the old address lands on the creations.
  await skipIntro(page);
  await page.goto("/fr/pieces/flaneur-medallion");
  await expect(page).toHaveURL(/\/fr\/creations$/);
  // Not in the catalogue the visitors get, not in the stories ("Enter the World"), not in the sitemap.
  const cat = (await (await page.request.get("/api/catalogue")).json()) as typeof defaultCatalogue;
  for (const slug of TAKEN_OFF) {
    expect(cat.pieces.some((p) => p.slug === slug), slug).toBe(false);
    expect(cat.stories.filter((s) => s.pieceSlug === slug).map((s) => s.slug), slug + " in a story").toEqual([]);
  }
  for (const slug of JESUS_PIECES) expect(cat.pieces.some((p) => p.slug === slug), slug).toBe(true);
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  for (const slug of TAKEN_OFF) expect(sitemap, slug).not.toContain("/pieces/" + slug);
  // No link to them: the lists, the universes they shared (facettes, pluie), "Discover More Creations" of their neighbours.
  for (const path of ["/", "/creations", "/creations/chains", "/creations/pendants", "/players", "/pieces/baguette-cuban-chain", "/pieces/rose-iced-cuban-chain", "/pieces/wide-rose-iced-cuban-chain", "/pieces/lois-openda-script-pendant", "/pieces/tulips-on-tour-medallion"]) {
    await page.goto(path, { waitUntil: "load" });
    const links = await page.locator("a[href*='/pieces/']").evaluateAll((els) => els.map((a) => a.getAttribute("href") ?? ""));
    for (const slug of TAKEN_OFF) expect(links.filter((h) => h.endsWith("/pieces/" + slug)), slug + " on " + path).toEqual([]);
  }
});

test("admin: Yoni changes the text of a photo, and its French, then puts it back", async ({ page }) => {
  desktopOnly();
  const password = process.env.ADMIN_PASSWORD;
  test.skip(!password, "ADMIN_PASSWORD (.env) is needed to open the admin");
  const problems = watch(page);
  const slug = "the-safi-link";
  const photos = photosOf(slug);
  const src = photos[0]!.src;
  // (24/11/2026: its new studio photos, front first, have no text in the catalogue yet: an empty title then.)
  const before = DEFAULT_ANGLES[slug]?.[src] ?? { title: "", text: "" };
  const open = async () => {
    await page.goto("/admin");
    await expect(page.getByLabel("Mot de passe").or(page.getByRole("tab", { name: "Pièces" }))).toBeVisible({ timeout: 15_000 });
    if (await page.getByLabel("Mot de passe").isVisible()) {
      await page.getByLabel("Mot de passe").fill(password!);
      await page.getByRole("button", { name: "Se connecter" }).click();
    }
    await page.getByRole("tab", { name: "Pièces" }).click();
    await page.locator("[data-admin-row='" + slug + "'] button[aria-label='Modifier']").click();
    const row = page.locator("[data-angles-field] [data-angle-edit='" + src + "']");
    await row.scrollIntoViewIfNeeded();
    return row;
  };
  const row = await open();
  await expect(row.getByLabel("Petit titre", { exact: true })).toHaveValue(before.title);
  // (Since 23/11/2026 the site shows only the title: every text is empty.)
  await expect(row.getByLabel(/Texte \(une ou deux phrases\)/)).toHaveValue(before.text);
  await row.getByLabel("Petit titre", { exact: true }).fill("Test title from the admin");
  await row.locator("summary").click();
  await row.getByLabel("Petit titre · Français").fill("Titre d’essai depuis l’admin");
  await page.locator("[data-angles-field]").screenshot({ path: DIR + "/admin-sous-tous-les-angles.jpg", type: "jpeg", quality: 70 });
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.locator("[data-angles-field]")).toHaveCount(0);
  // On the page, in English and in French.
  for (const [path, title] of [["/pieces/" + slug, "Test title from the admin"], ["/fr/pieces/" + slug, "Titre d’essai depuis l’admin"]] as const) {
    await page.goto(path, { waitUntil: "load" });
    await expect(page.locator("[data-every-angle] [data-angle='1'] [data-angle-title]")).toHaveText(title, { timeout: 15_000 });
  }
  // Put back.
  const again = await open();
  await again.getByLabel("Petit titre", { exact: true }).fill(before.title);
  await again.locator("summary").click();
  await again.getByLabel("Petit titre · Français").fill("");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.locator("[data-angles-field]")).toHaveCount(0);
  await page.goto("/fr/pieces/" + slug, { waitUntil: "load" });
  const restored = page.locator("[data-every-angle] [data-angle='1'] [data-angle-title]");
  if (before.title) await expect(restored).toHaveText(fr[before.title]!, { timeout: 15_000 });
  else await expect(restored).toHaveCount(0, { timeout: 15_000 });
  expect(problems.errors).toEqual([]);
});
