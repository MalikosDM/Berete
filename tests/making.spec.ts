// Feedback of Yoni, 21/11/2026 (2).
// 1. "The Making of a Masterpiece": only the real steps of each piece (src/data/making.ts), its complete making-of first;
//    no image of the atelier repeated from piece to piece; a piece without a real step has no section. Since 24/11/2026
//    (Yoni) it lives in The Atelier: /atelier?piece=<slug> opens its making-of at once, its steps wait under it.
// 2. From the opening of a capsule, one scroll leads to the next section (no pinned sequence any more).
// 3. The amateur films at the end of "Every Angle" (src/data/angles.ts, AMATEUR_FILMS).
// 4. N14: every useful photo of folder 22, its professional film at the opening and in its atelier.
// 5. The panther of Losene Keita: the night of his celebration, three images one after the other behind it.
// 6. Jesus Pieces: an entry of the menu, under The Creations.
// Screenshots go to verification/making/.
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "./fixtures";
import { AMATEUR_FILMS } from "../src/data/angles";
import { defaultCatalogue } from "../src/data/catalogue";
import { piecesOfCollection, SUBCATEGORIES } from "../src/data/collections";
import { resolveAtelier } from "../src/data/atelier";
import { completeMakingOf, makingSteps } from "../src/data/making";
import { publicCatalogue } from "../src/data/relations";
import { BACKDROPS } from "../src/data/themes";
import { pageAngles, skipIntro, watch } from "./helpers";

const DIR = "verification/making";
mkdirSync(DIR, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 66, timeout: 45_000 });
const CAT = publicCatalogue(defaultCatalogue);
const pieceOf = (slug: string) => CAT.pieces.find((p) => p.slug === slug)!;
const boxOf = (slug: string) => {
  const p = pieceOf(slug);
  return p.boxSlug ? CAT.boxes.find((b) => b.slug === p.boxSlug)?.images[0] : undefined;
};

test("the making-of of every piece: real media only, never an image of the atelier shared by several pieces", () => {
  const seen = new Map<string, string>();
  for (const p of CAT.pieces) {
    for (const { step, item } of makingSteps(p, boxOf(p.slug))) {
      expect(item.src, p.slug + " " + step).not.toMatch(/\/media\/atelier\//);
      const other = seen.get(item.src);
      // A box shared by the pieces of one owner (their trunk) is the only media two pieces may share.
      if (other && step !== "delivery") throw new Error(item.src + " shown by " + other + " and " + p.slug);
      seen.set(item.src, p.slug);
    }
  }
});

/** Six capsules: the Inter ring, the VfB ring, the T-Serpent, the Butterfly chain, the panther, a piece from the stories. */
const PAGES = ["campione-d-italia-2023-2024", "vfb-stuttgart-dfb-pokal-2025", "marcus-thuram-t-serpent-pendant", "michy-batshuayi-butterfly-pendant", "panther-champion-pendant", "samuel-ballet-jesus-piece"];

for (const slug of PAGES) {
  test(slug + ": one scroll from the opening to its content, its real making-of, its amateur films last", async ({ page }, info) => {
    const problems = watch(page);
    const piece = pieceOf(slug);
    await skipIntro(page);
    await page.goto("/fr/pieces/" + slug, { waitUntil: "load" });
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    // No pinned sequence between the opening and the content: one screen down, the next section is there.
    await expect(page.locator("article[data-piece] [data-pin-wrapper]")).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await page.waitForTimeout(900);
    const next = await page.locator("[data-piece-opening] + *").first().evaluate((el) => el.getBoundingClientRect().top);
    expect(next, "the section after the opening, one screen down").toBeLessThan(page.viewportSize()!.height * 0.5);
    await shot(page, info.project.name + "-" + slug + "-1-apres-ouverture");

    // "Every Angle": the amateur films after everything else.
    const photos = pageAngles(piece);
    const firstAmateur = photos.findIndex((m) => AMATEUR_FILMS.has(m.src));
    if (firstAmateur >= 0) expect(photos.slice(firstAmateur).every((m) => AMATEUR_FILMS.has(m.src)), "amateur films last").toBe(true);
    const more = page.locator("[data-angle-more]");
    if (await more.count()) await more.click();
    const types = await page.locator("[data-every-angle] [data-angle]").evaluateAll((els) => els.map((e) => e.querySelector("video")?.getAttribute("src") ?? e.querySelector("video source")?.getAttribute("src") ?? ""));
    expect(types.length).toBe(photos.length);

    // "The Making of a Masterpiece": not on the page of the piece any more (24/11/2026), a way to The Atelier.
    const steps = makingSteps(piece, boxOf(slug));
    const atelier = resolveAtelier(slug, piece.atelier);
    const film = atelier?.making ?? completeMakingOf(slug, piece.atelier);
    await expect(page.locator("[data-making]")).toHaveCount(0);
    if (steps.length === 0 && !film) {
      await expect(page.locator("[data-enter-atelier]")).toHaveCount(0);
    } else {
      await expect(page.locator("[data-enter-atelier-link]")).toHaveAttribute("href", "/fr/atelier?piece=" + slug);
      await page.goto("/fr/atelier?piece=" + slug, { waitUntil: "load" });
      // Its making-of first: its film opens at once.
      if (film) {
        const room = page.locator("[data-atelier-room]");
        await expect(room.locator("[data-atelier-video]")).toHaveAttribute("src", info.project.name === "desktop" ? film.src : film.mobile);
        await page.waitForTimeout(600);
        await shot(page, info.project.name + "-" + slug + "-2-making-of-film");
        // (Again until it is gone: the page may still be settling when it opens.)
        await expect(async () => {
          if (await room.count()) await page.keyboard.press("Escape");
          await expect(room).toHaveCount(0, { timeout: 2_000 });
        }).toPass({ timeout: 20_000 });
      }
      // Then its real steps only, in their order, never an image of the atelier.
      const section = page.locator("[data-atelier-piece='" + slug + "'] [data-making]");
      if (steps.length === 0) await expect(page.locator("[data-atelier-piece]")).toHaveCount(0);
      else {
        await section.scrollIntoViewIfNeeded();
        await expect(section.locator("[data-making-step]")).toHaveCount(steps.length);
        const order = await section.locator("ol > li[data-making-step]").evaluateAll((els) => els.map((e) => e.getAttribute("data-making-step")));
        expect(order).toEqual(steps.map((s) => s.step));
        const srcs = await section.locator("img, video").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).currentSrc || e.getAttribute("src") || ""));
        for (const s of srcs) expect(s, "no image of the atelier").not.toMatch(/\/media\/atelier\//);
        await section.evaluate((el) => el.scrollIntoView({ block: "start" }));
        await page.waitForTimeout(900);
        await shot(page, info.project.name + "-" + slug + "-2-making-of");
      }
    }
    expect(problems.errors).toEqual([]);
  });
}

test("N14: every useful photo of folder 22 with its text, its professional film at the opening and in its atelier", async ({ page }, info) => {
  const problems = watch(page);
  const slug = "celestial-initial-medallion";
  const piece = pieceOf(slug);
  for (const f of ["p05", "p15", "p17", "p10"]) expect(piece.gallery.some((m) => m.src === "/media/hd/" + slug + "/" + f + ".webp"), f).toBe(true);
  await skipIntro(page);
  await page.goto("/fr/pieces/" + slug, { waitUntil: "load" });
  // Its film, in its own section right after the opening (24/11/2026: silent, in a loop, on screen).
  await expect(page.locator("[data-piece-film]")).toHaveCount(0);
  const film = page.locator("[data-feature-film='" + slug + "']");
  await film.locator("[data-feature-frame]").evaluate((el) => el.scrollIntoView({ block: "center" }));
  const video = film.locator("[data-feature-video]");
  await expect.poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentSrc || (el as HTMLVideoElement).src), { timeout: 20_000 }).toContain("/media/films/" + slug + "/reveal");
  await page.waitForTimeout(1200);
  await shot(page, info.project.name + "-n14-1-film");
  // Every Angle: its photos (since 23/11/2026, no text).
  const section = page.locator("[data-every-angle]");
  await section.scrollIntoViewIfNeeded();
  const more = section.locator("[data-angle-more]");
  if (await more.count()) await more.click();
  await expect(section.locator("[data-angle]")).toHaveCount(pageAngles(piece).length);
  await expect(section.locator("[data-angle-text]")).toHaveCount(0);
  await shot(page, info.project.name + "-n14-2-angles");
  // Its atelier (in The Atelier since 24/11/2026): the same film, once (one chapter).
  await page.goto("/fr/atelier?piece=" + slug, { waitUntil: "load" });
  const room = page.locator("[data-atelier-room]");
  await expect(room).toBeVisible();
  await expect(room.locator("[data-chapter='making']")).toHaveCount(1);
  await expect(room.locator("[data-chapter='reveal']")).toHaveCount(0);
  await page.waitForTimeout(800);
  await shot(page, info.project.name + "-n14-3-atelier");
  expect(problems.errors).toEqual([]);
});

test("the panther: the knockout, the open cage and the celebration follow one another behind it", async ({ page }, info) => {
  const problems = watch(page);
  const phone = info.project.name !== "desktop";
  await skipIntro(page);
  await page.goto("/fr/pieces/panther-champion-pendant", { waitUntil: "load" });
  const world = page.locator("article[data-piece] > .universe[data-backdrop='keita']");
  await expect(world).toHaveCount(1);
  expect(BACKDROPS.keita!.sequence).toEqual(["keita-ko", "keita-cage", "keita-tribune"]);
  // The three images, once the page is there; the first one on.
  const frames = world.locator(".u-backdrop[data-frame]");
  await expect(frames).toHaveCount(3, { timeout: 20_000 });
  await expect(world.locator(".u-backdrop[data-frame='0']")).toHaveAttribute("data-on", "");
  const img = world.locator(".u-backdrop[data-frame='0'] img");
  await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).currentSrc)).toContain("/media/universes/keita-ko" + (phone ? "-m-" : "-"));
  await page.waitForTimeout(1500);
  await shot(page, info.project.name + "-panthere-1-ko");
  // Then the next ones, in a slow fade; the flashes of the crowd wait for the celebration.
  await expect(world.locator(".u-backdrop[data-frame='1']")).toHaveAttribute("data-on", "", { timeout: 15_000 });
  await expect(world.locator(".u-region[data-region='crowd']")).toHaveAttribute("data-off", "");
  await page.waitForTimeout(3200);
  await shot(page, info.project.name + "-panthere-2-cage");
  await expect(world.locator(".u-backdrop[data-frame='2']")).toHaveAttribute("data-on", "", { timeout: 15_000 });
  await expect(world.locator(".u-region[data-region='crowd']")).not.toHaveAttribute("data-off", "");
  await page.waitForTimeout(3200);
  await shot(page, info.project.name + "-panthere-3-celebration");
  // Its effects: the canvas (embers, golden confetti, flashes), the spotlight of each image.
  await expect(world.locator("canvas.u-fx")).toHaveAttribute("data-running", "");
  // The text of the celebration, in its story.
  await expect(page.locator("[data-story-paragraph='2']")).toContainText("Black Panther");
  expect(problems.errors).toEqual([]);
});

test("asked for less motion: the panther shows the celebration, still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await skipIntro(page);
  await page.goto("/pieces/panther-champion-pendant", { waitUntil: "load" });
  await expect(page.locator(".universe .u-backdrop[data-frame='2']")).toHaveAttribute("data-on", "", { timeout: 10_000 });
  await page.waitForTimeout(9000);
  await expect(page.locator(".universe .u-backdrop[data-frame='2']")).toHaveAttribute("data-on", "");
});

test("Jesus Pieces: from the menu, every Jesus piece of the house", async ({ page }, info) => {
  const problems = watch(page);
  const phone = info.project.name !== "desktop";
  const theme = SUBCATEGORIES.find((t) => t.slug === "jesus-pieces")!;
  const pieces = piecesOfCollection(CAT, theme);
  expect(pieces.length).toBeGreaterThanOrEqual(4);
  await skipIntro(page);
  await page.goto("/fr", { waitUntil: "load" });
  if (phone) {
    await page.locator("button[aria-controls='mobile-menu']").click();
    await page.locator("#mobile-menu a[href='/fr/creations/pendants/jesus-pieces']").click();
  } else {
    // The menu of The Creations opens under its name.
    await page.locator("[data-desktop-nav] a[href='/fr/creations']").first().hover();
    const entry = page.locator("[data-desktop-nav] a[href='/fr/creations/pendants/jesus-pieces']");
    await expect(entry).toBeVisible();
    await page.waitForTimeout(900);
    await shot(page, info.project.name + "-jesus-pieces-menu");
    await entry.click();
  }
  await expect(page).toHaveURL(/\/fr\/creations\/pendants\/jesus-pieces$/);
  await expect(page.locator("h1")).toContainText("Jesus Pieces");
  // (Its grid, since 23/11/2026.)
  const cards = await page.locator("main [data-creations-grid] [data-piece-card]").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-piece-card")))]);
  expect(cards).toEqual(pieces.map((p) => p.slug));
  await shot(page, info.project.name + "-jesus-pieces");
  expect(problems.errors).toEqual([]);
});
