// The film of a piece page beside its story (26/11/2026, Malik's capture): the frame keeps the film's own proportions —
// never a narrow strip with black above and below, never its buttons cut — at every size of window, and even when its
// column is squeezed (a browser that measured the frame by its progress bar made it 128 px wide and 660 px high).
import { expect, test } from "./fixtures";
import { skipIntro } from "./helpers";

const SLUG = "kevin-schade-dragon-ball-pendant";

async function frameOf(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const f = document.querySelector("[data-piece-spread] [data-feature-frame]")!.getBoundingClientRect();
    const v = document.querySelector("[data-piece-spread] video") as HTMLVideoElement;
    const story = document.querySelector("[data-piece-story]")!.getBoundingClientRect();
    const buttons = [...document.querySelectorAll("[data-piece-spread] [data-feature-frame] button")].map((b) => b.getBoundingClientRect());
    return {
      ratio: f.width / f.height,
      expected: Number(v.getAttribute("width") ?? 0) / Number(v.getAttribute("height") ?? 1) || null,
      width: f.width,
      buttonsInside: buttons.every((b) => b.left >= f.left - 0.5 && b.right <= f.right + 0.5),
      storyRight: story.right,
      viewport: window.innerWidth,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
}

test("the film beside the story keeps its proportions at every size, its buttons inside, the story on screen", async ({ page, isMobile }) => {
  await skipIntro(page);
  await page.goto("/pieces/" + SLUG, { waitUntil: "load" });
  await page.locator("[data-piece-spread] [data-feature-frame]").scrollIntoViewIfNeeded();
  const sizes: [number, number][] = isMobile ? [[390, 844]] : [[1024, 768], [1089, 730], [1089, 1000], [1280, 800], [1440, 900], [1728, 1117], [1920, 1080]];
  for (const [w, h] of sizes) {
    if (!isMobile) await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(150);
    const f = await frameOf(page);
    // The Dragon Ball film is vertical (720 × 1280).
    expect(f.ratio, w + "×" + h + ": the film's proportions").toBeCloseTo(720 / 1280, 1);
    expect(f.width, w + "×" + h + ": a real width, not a strip").toBeGreaterThan(isMobile ? 200 : 280);
    expect(f.buttonsInside, w + "×" + h + ": its buttons inside the frame").toBe(true);
    expect(f.storyRight, w + "×" + h + ": the story inside the window").toBeLessThanOrEqual(f.viewport + 1);
    expect(f.overflow, w + "×" + h + ": no sideways scroll").toBeLessThanOrEqual(0);
  }
});

test("squeezed to 128 px, the frame still keeps the film's proportions (no black strip) and its buttons", async ({ page, isMobile }) => {
  test.skip(isMobile, "the two columns are a computer's");
  await skipIntro(page);
  await page.goto("/pieces/" + SLUG, { waitUntil: "load" });
  await page.locator("[data-piece-spread] [data-feature-frame]").scrollIntoViewIfNeeded();
  await page.evaluate(() => ((document.querySelector("[data-piece-spread] [data-film-block]")!.parentElement as HTMLElement).style.width = "128px"));
  const f = await frameOf(page);
  expect(f.ratio).toBeCloseTo(720 / 1280, 1);
  expect(f.buttonsInside).toBe(true);
});
