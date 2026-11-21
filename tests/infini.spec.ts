// The Hand (21/11/2026): its world becomes an endless space of blue and black (backdrop "infini", preset "infini"): the
// screen goes black, then the space unfolds from the piece in a circle of light (entrance "unfold"); lines of light rush to
// the sphere, rings ripple out of it, fine stars, its light breathes ("void"); on the piece a blue-white halo and cold
// glints ("jewel-void"). Readable, still with less motion, paused deep in the page. Nothing of the animation it recalls.
// Screenshots go to verification/infini/.
import { mkdirSync, readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { BACKDROPS, resolveTheme } from "../src/data/themes";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/infini";
mkdirSync(DIR, { recursive: true });
const SLUG = "the-hand";

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

async function groundContrast(page: Page, el: Locator): Promise<number> {
  const color = (await el.evaluate((e) => getComputedStyle(e).color)).match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
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

test("its world: the endless space, its own image for phones, its entrance, its effects; nothing of the work it recalls", () => {
  const piece = defaultCatalogue.pieces.find((p) => p.slug === SLUG)!;
  const theme = resolveTheme(piece.theme);
  expect(theme.preset).toBe("infini");
  expect(theme.backdrop).toBe("infini");
  expect(theme.entrance).toBe("unfold");
  expect(theme.effects).toEqual(expect.arrayContaining(["void", "stars", "jewel-void"]));
  const b = BACKDROPS.infini!;
  expect(b.portrait, "made for a whole phone screen: it surrounds a story of the piece too").toBe(true);
  expect(b.core).toBeTruthy();
  expect(b.mobileCore).toBeTruthy();
  // No name of the animation in what the visitors get (the texts of the site, the names of the files served).
  const served = [readFileSync("src/data/universes.generated.json", "utf8"), readFileSync("src/i18n/ui/en.ts", "utf8"), readFileSync("src/i18n/ui/fr.ts", "utf8"), JSON.stringify(piece)];
  for (const text of served) expect(text).not.toMatch(/jujutsu|gojo|vide infini|infinite void|domain expansion|extension du territoire/i);
});

test("The Hand: black, then the space unfolds from the piece; the lines, the rings, the sphere, the halo; readable", async ({ page }, info) => {
  const problems = watch(page);
  const phone = info.project.name !== "desktop";
  await skipIntro(page);
  await page.goto("/fr/pieces/" + SLUG, { waitUntil: "commit" });
  // The entrance: the screen black, the circle of light opening.
  const world = page.locator("article[data-piece] > .universe[data-backdrop='infini']");
  await expect(world).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator("article[data-piece]")).toHaveAttribute("data-entering", "");
  await page.waitForTimeout(450);
  await page.screenshot({ path: DIR + "/" + info.project.name + "-1-arrivee.jpg", type: "jpeg", quality: 70 });
  const clip = await world.locator(".universe-stage").evaluate((el) => getComputedStyle(el).clipPath);
  expect(clip, "the world opens in a circle").toContain("circle");
  // Nothing of the piece in the black: its halo comes with it.
  expect(Number(await page.locator("[data-piece-cover] .u-jewel-halo:visible").first().evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(0.3);
  await page.waitForTimeout(650);
  await page.screenshot({ path: DIR + "/" + info.project.name + "-1b-ouverture.jpg", type: "jpeg", quality: 70 });
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
  // After the entrance: the endless space, its own image for phones.
  const img = world.locator(".u-backdrop img").first();
  await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0), { timeout: 20_000 }).toBe(true);
  expect(await img.evaluate((el) => (el as HTMLImageElement).currentSrc)).toContain("/media/universes/infini" + (phone ? "-m-" : "-"));
  // Its sphere breathing, three rings rippling out of it, the lines of light and the stars on the canvas.
  await expect(world.locator(".u-genki[data-spot='void'] .u-genki-glow")).toBeVisible();
  await expect(world.locator(".u-void-ring")).toHaveCount(3);
  expect(await world.locator(".u-void-ring").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("u-void-ring");
  await expect(world.locator("canvas.u-fx")).toHaveAttribute("data-running", "");
  // On the piece: the blue-white halo behind it, the cold glints.
  await expect(page.locator("[data-piece-cover] .u-jewel[data-jewel='jewel-void']").first()).toBeAttached();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: DIR + "/" + info.project.name + "-2-apres-entree.jpg", type: "jpeg", quality: 70 });
  // Readable: the title on its ground; the words of the menu of a computer.
  expect(await groundContrast(page, page.locator("h1#piece-title")), "the title").toBeGreaterThanOrEqual(4.5);
  if (!phone) for (const link of await page.locator("header nav a").all()) if (await link.isVisible()) expect(await groundContrast(page, link), "the menu").toBeGreaterThanOrEqual(4.5);
  // Deep in the page, the world rests.
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
  await expect(world).toHaveAttribute("data-deep", "", { timeout: 5_000 });
  expect(await world.locator(".u-void-ring").first().evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("paused");
  expect(problems.errors).toEqual([]);
});

test("its story: no story shows The Hand yet; the world would surround it (as for Dragon Ball)", () => {
  const piece = defaultCatalogue.pieces.find((p) => p.slug === SLUG)!;
  const files = new Set([piece.cover, ...piece.gallery].map((m) => m.src));
  const stories = defaultCatalogue.stories.filter((s) => s.pieceSlug === SLUG || s.media.some((m) => files.has(m.src)));
  expect(stories.map((s) => s.slug)).toEqual([]);
  expect(BACKDROPS[resolveTheme(piece.theme).backdrop]?.portrait).toBe(true);
});

test("asked for less motion: the space still, no entrance, no lines, the piece and its texts there", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await skipIntro(page);
  await page.goto("/pieces/" + SLUG, { waitUntil: "load" });
  await expect(page.locator("h1#piece-title")).toBeVisible();
  await expect(page.locator(".universe canvas.u-fx").first()).toBeHidden();
  const moving = await page.evaluate(() => [...document.querySelectorAll(".universe-stage, .u-void-ring, .u-genki-glow, .u-jewel, .u-jewel > i, .u-jewel-halo")].filter((e) => getComputedStyle(e).animationName !== "none").length);
  expect(moving).toBe(0);
});
