// The House (/about), 22/11/2026: the black and white portrait of Yoni as the main photo of the page, and no other photo
// (the quotes and the chapters keep theirs: none). His face whole, on a computer and on an iPhone. Silent.
// Screenshots go to verification/maison/.
import { mkdirSync } from "node:fs";
import { expect, test } from "./fixtures";
import { media } from "../src/data/sources";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/maison";
mkdirSync(DIR, { recursive: true });

test("the data: the portrait only", () => {
  expect(Object.keys(media.house ?? {})).toEqual(["portrait"]);
  expect(media.house!.portrait!.src).toBe("/media/house/portrait.webp");
});

for (const lang of ["", "/fr"]) {
  test("the portrait of Yoni at the top of The House" + (lang ? " (" + lang.slice(1) + ")" : ""), async ({ page }, info) => {
    const problems = watch(page);
    await skipIntro(page);
    await page.goto(lang + "/about", { waitUntil: "load" });
    const photos = page.locator("[data-house-photo]");
    await expect(photos).toHaveCount(1);
    await expect(page.locator("[data-house-chapter] [data-house-photo], [data-house-quote] [data-house-photo]")).toHaveCount(0);
    const img = photos.locator("img");
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((e) => new URL((e as HTMLImageElement).currentSrc).pathname), { timeout: 15_000 }).toMatch(/^\/media\/house\/portrait(\.w\d+)?\.webp$/);
    await expect.poll(() => img.evaluate((e) => (e as HTMLImageElement).naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0);
    await page.waitForTimeout(1600);
    // Framed from its top: the 4:5 frame only trims the bottom of the photo (the sweater), never the head.
    const fit = await img.evaluate((e) => {
      const el = e as HTMLImageElement;
      const box = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return { position: s.objectPosition, fit: s.objectFit, w: box.width, h: box.height, left: box.left, right: box.right, vw: innerWidth, drawnH: (box.width * el.naturalHeight) / el.naturalWidth };
    });
    expect(fit.fit).toBe("cover");
    expect(fit.position).toBe("50% 0%");
    expect(fit.drawnH).toBeGreaterThanOrEqual(fit.h - 1);
    // The face (the top half of the photo) stays inside the frame: at most 7 % of the photo is trimmed, all at the bottom.
    expect(fit.h / fit.drawnH).toBeGreaterThan(0.9);
    // Whole on the screen, at a good size.
    expect(fit.left).toBeGreaterThanOrEqual(0);
    expect(fit.right).toBeLessThanOrEqual(fit.vw);
    expect(fit.w).toBeGreaterThan(info.project.name === "desktop" ? 380 : 300);
    await img.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(800);
    await page.screenshot({ path: DIR + "/" + info.project.name + (lang ? "-fr" : "") + "-portrait.jpg", type: "jpeg", quality: 72 });
    if (!lang) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(800);
      await page.screenshot({ path: DIR + "/" + info.project.name + "-haut-de-page.jpg", type: "jpeg", quality: 72 });
    }
    expect(problems.errors).toEqual([]);
  });
}
