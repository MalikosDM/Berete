// Every photo and film of the pieces (20/11/2026): the folders of Yoni sorted again photo by photo (scripts/hd-media.mjs),
// the 15 hidden pieces published, and the pages still fast with many more photos. The page Créations shows every
// published piece; each page shows its whole gallery ("Every Angle": each photo with its text, loaded as the visitor
// comes near it), its films in their place, and loads little before the visitor scrolls.
// Screenshots go to verification/galleries/.
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import media from "../src/data/media.generated.json" with { type: "json" };
import { NEW_PIECES, partOf } from "../src/data/pieces";
import { pieceMediaOf } from "../src/data/pageMedia";
import { resolveShowcase } from "../src/data/showcase";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/galleries";
mkdirSync(DIR, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 65, timeout: 45_000 });
const PUBLISHED = defaultCatalogue.pieces.filter((p) => p.published);
/** "Every Angle" shows four photos, then "See N more" (24/11/2026, src/components/EveryAngle.tsx). */
const anglesShownFirst = (n: number) => Math.min(n, 4);

test("Créations: every published piece is there, each card with its photo", async ({ page }, info) => {
  const problems = watch(page);
  await skipIntro(page);
  await page.goto("/fr/creations");
  const cards = page.locator("a[data-piece-card]");
  await expect(cards).toHaveCount(PUBLISHED.length);
  const shown = await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-piece-card")));
  for (const p of PUBLISHED) expect(shown, p.slug + " on the page").toContain(p.slug);
  // Every card's photo loads once it is on screen.
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => card.locator("img").first().evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0), { timeout: 20_000 }).toBe(true);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, info.project.name + "-creations");
  expect(problems.errors).toEqual([]);
});

/** Eight new pieces (the most photos, films, the albums of Yoni), and the four pieces of the site with the most photos. */
const NEW_PAGES = ["thorns-and-roses-crucifix", "crown-of-thorns-jesus-piece", "panther-champion-pendant", "ampersand-initials-pendant", "rose-iced-cuban-chain", "white-iced-cuban-chain", "brt-flower-chain", "jesus-piece-red-flowers"];
const PAGES = [
  ...NEW_PAGES,
  ...PUBLISHED.filter((p) => !NEW_PIECES.includes(p.slug))
    .sort((a, b) => b.gallery.length - a.gallery.length)
    .slice(0, 4)
    .map((p) => p.slug),
];

test("the pages chosen: eight new pieces and four of the site", () => {
  expect(PAGES.length).toBe(12);
  for (const slug of NEW_PAGES) expect(NEW_PIECES).toContain(slug);
});

/** The new pieces with a film of the finished piece: since 24/11/2026 in its own section right after the opening, silent, in a loop (src/components/FeatureFilm.tsx). */
const NEW_FILMS = ["ampersand-initials-pendant", "thorns-and-roses-crucifix", "lois-openda-script-pendant", "panther-champion-pendant", "jesus-piece-red-flowers", "brt-flower-chain", "baguette-cuban-chain"];
for (const slug of NEW_FILMS) {
  test(slug + ": the piece first, its film in its section", async ({ page }, info) => {
    const problems = watch(page);
    await skipIntro(page);
    await page.goto("/fr/creations");
    const card = page.locator("a[data-piece-card='" + slug + "']").first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await expect(page.locator("[data-piece-opening] h1")).toBeVisible();
    await page.waitForTimeout(1000);
    // No film over the piece (the cinema window lives in The Atelier only).
    await expect(page.locator("[data-piece-film]")).toHaveCount(0);
    const section = page.locator("[data-feature-film='" + slug + "']");
    await section.locator("[data-feature-frame]").evaluate((el) => el.scrollIntoView({ block: "center" }));
    const video = section.locator("[data-feature-video]");
    await expect.poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentSrc || (el as HTMLVideoElement).src), { timeout: 20_000 }).toContain("/media/films/" + slug + "/reveal");
    await expect.poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentTime), { timeout: 20_000 }).toBeGreaterThan(0.3);
    expect(await video.evaluate((el) => (el as HTMLVideoElement).muted && (el as HTMLVideoElement).loop)).toBe(true);
    await page.waitForTimeout(600);
    await shot(page, info.project.name + "-" + slug + "-film");
    expect(problems.errors).toEqual([]);
  });
}

for (const slug of PAGES) {
  test(slug + ": its whole gallery, its films, fast", async ({ page }, info) => {
    const problems = watch(page);
    const piece = PUBLISHED.find((p) => p.slug === slug)!;
    const phone = info.project.name !== "desktop";
    await skipIntro(page);
    await page.goto("/pieces/" + slug, { waitUntil: "load" });
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    // Before any scroll: the page loads its top only (the photos of the gallery wait for the visitor).
    const before = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .filter((e) => /\/media\/hd\//.test(e.name))
        .reduce((sum, e) => sum + ((e as PerformanceResourceTiming).transferSize || (e as PerformanceResourceTiming).encodedBodySize || 0), 0),
    );
    expect(before, "gallery bytes loaded before scrolling").toBeLessThan(2_500_000);
    const lcp = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          new PerformanceObserver((list) => {
            const all = list.getEntries();
            resolve(all[all.length - 1]?.startTime ?? 0);
          }).observe({ type: "largest-contentful-paint", buffered: true });
          setTimeout(() => resolve(0), 3000);
        }),
    );
    if (!phone) expect(lcp, "largest paint (ms)").toBeLessThan(4000);

    // "Every Angle": every photo and film; all of them after "See N more".
    // (Each photo once on the page since 24/11/2026: never one the opening shows, src/data/pageMedia.ts.)
    const part = partOf(piece.slug);
    const partPiece = part ? defaultCatalogue.pieces.find((p) => p.slug === part.slug) : undefined;
    const angles = pieceMediaOf(piece, {
      box: piece.boxSlug ? defaultCatalogue.boxes.find((b) => b.slug === piece.boxSlug) : undefined,
      part: part && partPiece ? { piece: partPiece, photos: part.photos } : null,
      opening: resolveShowcase(piece.slug, piece.showcase),
    }).angles;
    const section = page.locator("[data-every-angle]");
    await section.scrollIntoViewIfNeeded();
    const tiles = page.locator("[data-angle]");
    // Since 25/11/2026 a magazine: four photos of the whole at most, the details beside their sentence, then See more.
    expect(await section.locator("[data-angle]").count()).toBeLessThanOrEqual(Math.max(1, anglesShownFirst(angles.length)));
    expect(await tiles.count()).toBeLessThanOrEqual(angles.length);
    const more = page.locator("[data-angle-more]");
    if (await more.count()) await more.click();
    // (Since 27/11/2026 Every Angle may also show the photo of its opening or of its chain, chosen first: src/data/magazine.ts.)
    await expect.poll(() => tiles.count()).toBeGreaterThanOrEqual(angles.length);
    expect(await tiles.count()).toBeLessThanOrEqual(angles.length + 3);
    // Each photo loads as the visitor comes near it (its small copy), each film shows its image; each has its text.
    for (const tile of await tiles.all()) {
      await tile.scrollIntoViewIfNeeded();
      // (Since 23/11/2026: no text, at most a short caption.)
      expect(await tile.locator("[data-angle-title]").count()).toBeLessThanOrEqual(1);
      await expect(tile.locator("[data-angle-text]")).toHaveCount(0);
      if ((await tile.getAttribute("data-angle-type")) === "video") {
        await expect(tile.locator("video")).toHaveAttribute("poster", /\.webp$/, { timeout: 20_000 });
      } else {
        await expect
          .poll(() => tile.locator("img").evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0), { timeout: 20_000, message: slug + " photo" })
          .toBe(true);
        const src = await tile.locator("img").evaluate((el) => (el as HTMLImageElement).currentSrc);
        expect(src, "a small copy").toMatch(/\.w(640|1080)\.webp$|\.webp$/);
      }
    }
    await section.scrollIntoViewIfNeeded();
    await shot(page, info.project.name + "-" + slug + "-angles");
    // A photo opens full screen, among all the photos of the section.
    await tiles.first().locator("button").click();
    const dialog = page.locator("[role=dialog][data-lenis-prevent]");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("/" + String(await tiles.count()).padStart(2, "0"));
    await page.keyboard.press("Escape");
    // Every film is a silent loop that plays only on screen.
    for (const v of await page.locator("[data-angle] video").all()) {
      expect(await v.evaluate((el) => (el as HTMLVideoElement).muted && (el as HTMLVideoElement).loop && (el as HTMLVideoElement).preload === "none")).toBe(true);
    }
    // No text of the section names a person of a private piece.
    if (!piece.clientPublic && piece.people.length === 0) {
      const words = await section.allInnerTexts();
      for (const w of words) expect(w).not.toMatch(/Nathalie|José|LASANA/i);
    }
    expect(problems.errors).toEqual([]);
  });
}

/** The five jersey photos Yoni sent on 19/11/2026: the portrait of each player, on his page and on the wall. */
const NEW_PORTRAITS = ["kenan-yildiz", "marcus-thuram", "noah-okafor", "lois-openda", "michy-batshuayi"];
test("the new jersey photos of five players: their portrait on their page and on the wall of the players", async ({ page }, info) => {
  const problems = watch(page);
  await skipIntro(page);
  const players = (media as unknown as { players: Record<string, { src: string; width: number }[]> }).players;
  for (const slug of NEW_PORTRAITS) {
    const portrait = players[slug]![0]!;
    await page.goto("/players/" + slug, { waitUntil: "load" });
    const img = page.locator("img[src='" + portrait.src + "'], img[srcset*='" + portrait.src.replace(/\.webp$/, "") + "']").first();
    await expect(img, slug).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0), { timeout: 20_000 }).toBe(true);
    await shot(page, info.project.name + "-player-" + slug);
  }
  await page.goto("/players", { waitUntil: "load" });
  for (const slug of NEW_PORTRAITS) {
    const card = page.locator("[data-player-card='" + slug + "'] a[data-player-link]");
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator("img").first(), slug + " on the wall").toHaveAttribute("src", new RegExp(players[slug]![0]!.src.replace(/\.webp$/, "").replace(/[/.-]/g, "\\$&")));
  }
  expect(problems.errors).toEqual([]);
});
