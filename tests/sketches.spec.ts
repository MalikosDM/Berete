// The step "The Original Vision" of every piece (src/pages/PiecePage.tsx, MakingSection): the hand of Yoni drawing the
// piece (scripts/import-media.mjs, folder "Croquis main de Yoni (site)"), sharp on a computer and on a phone, never
// stretched, light, loaded only when the visitor comes near it; Dragon Ball keeps its first hand drawing.
// Screenshots go to verification/sketches/.
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import media from "../src/data/media.generated.json" with { type: "json" };
import { skipIntro } from "./helpers";

const SKETCHES = (media as unknown as { sketches: Record<string, { src: string; width: number; height: number }> }).sketches;
/** Six pieces of different kinds: a hand, a watch, a ring, the former 3D image of Kenan, letters, a medallion. */
const PIECES = ["the-hand", "marcus-thuram-skeleton-watch", "campione-d-italia-2023-2024", "kenan-yildiz-celebration-pendant", "noah-okafor-oka-pendant", "tulips-on-tour-medallion"];
const DIR = "verification/sketches";
mkdirSync(DIR, { recursive: true });

async function openPiece(page: Page, path: string) {
  await page.goto(path);
  // The page ready (its entrance over).
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
}

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

for (const slug of PIECES) {
  test("The Original Vision of " + slug + ": the hand of Yoni, sharp, never stretched, loaded when near", async ({ page }, info) => {
    const sketch = SKETCHES[slug]!;
    expect(sketch.src).toBe("/media/sketches/" + slug + ".webp");
    // The hand of Yoni: 3:4, large enough for a retina screen and the full screen.
    expect(sketch.height).toBe(1920);
    expect(Math.abs(sketch.width / sketch.height - 3 / 4)).toBeLessThan(0.01);

    await openPiece(page, "/fr/pieces/" + slug);
    // Never with the first screen: loaded when the visitor comes near (the browser may start a little before, on a short
    // page, but only once the page itself is loaded).
    const early = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      return performance
        .getEntriesByType("resource")
        .filter((e) => e.name.includes("/media/sketches/"))
        .map((e) => ({ start: e.startTime, load: nav.loadEventStart }));
    });
    for (const e of early) expect(e.start, "sketch asked for before the page was loaded").toBeGreaterThanOrEqual(e.load);

    const step = page.locator("[data-making-step='sketch']");
    await step.scrollIntoViewIfNeeded();
    const button = step.locator("[data-making-open='sketch']");
    await expect(button).toBeVisible();
    // Named in the language of the page.
    await expect(button).toHaveAttribute("aria-label", /La main de Yoni Berete dessinant le premier croquis de /);
    const img = button.locator("img");
    await expect(img).toHaveAttribute("loading", "lazy");
    await expect(img).toHaveAttribute("decoding", "async");
    await expect.poll(() => img.evaluate((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0), { timeout: 15_000 }).toBe(true);
    const shown = await img.evaluate((i) => {
      const el = i as HTMLImageElement;
      const box = el.getBoundingClientRect();
      return { src: el.currentSrc, natural: [el.naturalWidth, el.naturalHeight], box: [box.width, box.height], fit: getComputedStyle(el).objectFit, dpr: window.devicePixelRatio };
    });
    // Its own sketch, one of its copies.
    expect(shown.src).toMatch(new RegExp("/media/sketches/" + slug + "(\\.w\\d+)?\\.webp$"));
    // Sharp: the copy downloaded has at least as many pixels as the screen draws (naturalWidth is counted in pixels of the
    // page when a srcset is used: the width is read from the name of the copy).
    const pixels = Number(/\.w(\d+)\.webp$/.exec(shown.src)?.[1] ?? sketch.width);
    expect(pixels).toBeGreaterThanOrEqual(Math.floor(shown.box[0]! * shown.dpr * 0.95));
    // Never stretched: covered (never squeezed), in a 3:4 frame of the same shape (less than 1 % cut).
    expect(shown.fit).toBe("cover");
    expect(Math.abs(shown.box[0]! / shown.box[1]! - 3 / 4)).toBeLessThan(0.01);
    expect(Math.abs(shown.natural[0]! / shown.natural[1]! - shown.box[0]! / shown.box[1]!)).toBeLessThan(0.01);
    // Light: the copy downloaded.
    const bytes = await page.evaluate((name) => {
      const entry = performance.getEntriesByType("resource").find((e) => e.name.endsWith(name)) as PerformanceResourceTiming | undefined;
      return entry ? entry.encodedBodySize || entry.transferSize : -1;
    }, new URL(shown.src).pathname);
    if (bytes > 0) expect(bytes).toBeLessThan(200_000);
    await page.waitForTimeout(700);
    await step.screenshot({ path: DIR + "/" + info.project.name + "-" + slug + ".jpg", type: "jpeg", quality: 75 });

    // Full screen: the largest copy, sharp.
    await button.click();
    const full = page.locator("[role='dialog'] img[src='" + sketch.src + "']");
    await expect(full).toBeVisible();
    await expect.poll(() => full.evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBe(sketch.width);
    // The screenshot once the opening of the full screen is over.
    if (slug === PIECES[0]) await page.waitForTimeout(900);
    if (slug === PIECES[0]) await page.screenshot({ path: DIR + "/" + info.project.name + "-plein-ecran.jpg", type: "jpeg", quality: 75 });
    await page.keyboard.press("Escape");
  });
}

test("Dragon Ball keeps its first hand drawing", async ({ page }) => {
  await openPiece(page, "/pieces/kevin-schade-dragon-ball-pendant");
  const step = page.locator("[data-making-step='sketch']");
  await step.scrollIntoViewIfNeeded();
  await expect(step.locator("img")).toHaveAttribute("src", "/media/stories/kevin-schade/08.webp");
  await expect(step).toContainText("The Original Vision");
});

test("every published piece with a file of the hand of Yoni shows it", async ({ page }) => {
  const res = await page.request.get("/api/catalogue").catch(() => null);
  const pieces = res?.ok() ? ((await res.json()) as { pieces: { slug: string; making: { sketch?: { src: string } } }[] }).pieces : null;
  test.skip(pieces === null, "the catalogue of the server is needed");
  // The pieces published on 20/11/2026 have no drawing of his hand yet: their step shows the atelier.
  const drawn = Object.keys((media as unknown as { sketches: Record<string, unknown> }).sketches);
  for (const p of pieces!) {
    if (p.slug === "kevin-schade-dragon-ball-pendant") continue;
    if (!drawn.includes(p.slug)) continue;
    expect(p.making.sketch?.src, p.slug).toBe("/media/sketches/" + p.slug + ".webp");
  }
  expect(pieces!.filter((p) => drawn.includes(p.slug)).length, "pieces drawn by the hand of Yoni").toBeGreaterThanOrEqual(28);
});
