// The House (/about), 22/11/2026: the black and white portrait of Yoni as the main photo of the page. Since 24/11/2026 the
// chapters show only his own photos (chapters 4 and 11 from the folder, 5, 8, 9, 10 and 12 his WhatsApp photos; 1, 2, 3, 6
// and 7 none), the quotes none. His face whole, on a computer and on an iPhone. Silent. Screenshots go to verification/maison/.
import { mkdirSync } from "node:fs";
import { expect, test } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { HOUSE_CHAPTERS, houseChapterPhoto } from "../src/data/house";
import { media } from "../src/data/sources";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/maison";
mkdirSync(DIR, { recursive: true });

/** The chapters (1 to 12) with a photo of Yoni (24/11/2026). */
const WITH_PHOTO = [4, 5, 8, 9, 10, 11, 12];

test("the data: the portrait and the photos of chapters 4 and 11 from the folder; his own photos only", () => {
  expect(Object.keys(media.house ?? {}).sort()).toEqual(["chapitre-04", "chapitre-11", "portrait"]);
  expect(media.house!.portrait!.src).toBe("/media/house/portrait.webp");
  expect(media.house!["chapitre-04"]!.src).toBe("/media/house/chapitre-04.webp");
  expect(media.house!["chapitre-11"]!.src).toBe("/media/house/chapitre-11.webp");
  const photos = Array.from({ length: HOUSE_CHAPTERS }, (_, i) => houseChapterPhoto(defaultCatalogue, i));
  expect(photos.flatMap((m, i) => (m ? [i + 1] : []))).toEqual(WITH_PHOTO);
  // Never an image of a jewel (a sketch, a piece) in place of a missing photo.
  for (const m of photos) if (m) expect(m.src).toMatch(/^\/media\/(house|extra\/house)\//);
});

for (const lang of ["", "/fr"]) {
  test("the portrait of Yoni at the top of The House" + (lang ? " (" + lang.slice(1) + ")" : ""), async ({ page }, info) => {
    const problems = watch(page);
    await skipIntro(page);
    await page.goto(lang + "/about", { waitUntil: "load" });
    const photos = page.locator("[data-house-photo]");
    // The portrait at the top, then the photos of Yoni of seven chapters (24/11/2026), none on the quotes, no empty frame.
    await expect(photos).toHaveCount(1 + WITH_PHOTO.length);
    await expect(page.locator("[data-house-chapter] [data-house-photo]")).toHaveCount(WITH_PHOTO.length);
    for (const n of WITH_PHOTO) await expect(page.locator("[data-house-chapter='" + n + "'] [data-house-photo]")).toHaveCount(1);
    await expect(page.locator("[data-house-quote] [data-house-photo]")).toHaveCount(0);
    const img = photos.first().locator("img");
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
    // (A third of the page on a computer, smaller since 24/11/2026.)
    expect(fit.w).toBeGreaterThan(info.project.name === "desktop" ? 330 : 300);
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
