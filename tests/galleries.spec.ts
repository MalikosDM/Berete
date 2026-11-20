// Every photo and film of the pieces (20/11/2026): the folders of Yoni sorted again photo by photo (scripts/hd-media.mjs),
// the 15 hidden pieces published, and the pages still fast with many more photos. The page Créations shows every
// published piece; each page shows its whole gallery (the first photos sideways, the others in "Every Angle", loaded as
// the visitor comes near them), its films in their place, and loads little before the visitor scrolls.
// Screenshots go to verification/galleries/.
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import media from "../src/data/media.generated.json" with { type: "json" };
import { NEW_PIECES } from "../src/data/pieces";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/galleries";
mkdirSync(DIR, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 65, timeout: 45_000 });
const PUBLISHED = defaultCatalogue.pieces.filter((p) => p.published);
const HIGHLIGHTS = 8;

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
const NEW_PAGES = ["script-nameplate-pendant", "crown-of-thorns-jesus-piece", "panther-champion-pendant", "ampersand-initials-pendant", "rose-iced-cuban-chain", "cross-infinity-chain", "brt-flower-chain", "jesus-piece-red-flowers"];
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

/** The new pieces with a film of the finished piece: it opens their page (src/components/PieceFilm.tsx). */
const NEW_FILMS = ["ampersand-initials-pendant", "thorns-and-roses-crucifix", "script-nameplate-pendant", "panther-champion-pendant", "jesus-piece-red-flowers", "brt-flower-chain", "baguette-cuban-chain"];
for (const slug of NEW_FILMS) {
  test(slug + ": its film first, then the piece", async ({ page }, info) => {
    const problems = watch(page);
    await skipIntro(page, { films: false });
    await page.goto("/fr/creations");
    const card = page.locator("a[data-piece-card='" + slug + "']").first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await expect(page.locator("[data-piece-film]")).toBeVisible({ timeout: 20_000 });
    const src = await page.locator("[data-piece-film-video]").evaluate((el) => (el as HTMLVideoElement).currentSrc || (el as HTMLVideoElement).src);
    expect(src).toContain("/media/films/" + slug + "/reveal");
    await expect.poll(() => page.locator("[data-piece-film-video]").evaluate((el) => (el as HTMLVideoElement).currentTime), { timeout: 20_000 }).toBeGreaterThan(0.3);
    await page.waitForTimeout(600);
    await shot(page, info.project.name + "-" + slug + "-film");
    await page.locator("[data-piece-film-skip]").click();
    await expect(page.locator("[data-piece-film]")).toHaveCount(0, { timeout: 5_000 });
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

    // The sideways gallery: its first photos.
    const items = page.locator("[data-gallery-item]");
    await expect(items).toHaveCount(Math.min(HIGHLIGHTS, piece.gallery.length));
    // "Every Angle": the others, all of them after "See N more".
    const rest = piece.gallery.length - HIGHLIGHTS;
    if (rest > 0) {
      const grid = page.locator("[data-gallery-grid]");
      await grid.scrollIntoViewIfNeeded();
      const more = page.locator("[data-gallery-more]");
      if (await more.count()) await more.click();
      const tiles = page.locator("[data-gallery-tile]");
      await expect(tiles).toHaveCount(rest);
      // Each photo of the grid loads as the visitor comes near it (its small copy), each film shows its image.
      for (const tile of await tiles.all()) {
        await tile.scrollIntoViewIfNeeded();
        if ((await tile.getAttribute("data-gallery-tile")) === "video") {
          await expect(tile.locator("video")).toHaveAttribute("poster", /\.webp$/, { timeout: 20_000 });
        } else {
          await expect
            .poll(() => tile.locator("img").evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0), { timeout: 20_000, message: slug + " grid photo" })
            .toBe(true);
          const src = await tile.locator("img").evaluate((el) => (el as HTMLImageElement).currentSrc);
          expect(src, "the grid takes a small copy").toMatch(/\.w(640|1080)\.webp$|\.webp$/);
        }
      }
      await grid.scrollIntoViewIfNeeded();
      await shot(page, info.project.name + "-" + slug + "-grid");
      // A photo of the grid opens full screen, among all the photos of the piece.
      await tiles.first().click();
      const dialog = page.locator("[role=dialog][data-lenis-prevent]");
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(String(piece.gallery.length).padStart(2, "0"));
      await page.keyboard.press("Escape");
    }
    // Every film of the gallery is a silent loop that plays only on screen.
    for (const v of await page.locator("[data-gallery-item] video, [data-gallery-tile] video").all()) {
      expect(await v.evaluate((el) => (el as HTMLVideoElement).muted && (el as HTMLVideoElement).loop && (el as HTMLVideoElement).preload === "none")).toBe(true);
    }
    // No text of the gallery names a person of a private piece.
    if (!piece.clientPublic && piece.people.length === 0) {
      const words = await page.locator("[data-gallery-item] figcaption").allInnerTexts();
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
    const card = page.locator("a[href$='/players/" + slug + "']").first();
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator("img").first(), slug + " on the wall").toHaveAttribute("src", new RegExp(players[slug]![0]!.src.replace(/\.webp$/, "").replace(/[/.-]/g, "\\$&")));
  }
  expect(problems.errors).toEqual([]);
});
