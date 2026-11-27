import sharp from "sharp";
import { expect, test, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { publicCatalogue } from "../src/data/relations";
import { featureFilmOf } from "../src/data/featureFilms";
import { resolveReveal } from "../src/data/atelier";
import { filmData, YONI_MEDIA } from "../src/data/yoniMedia";

// The corrections of 27/11/2026 (afternoon) after the pass « contenus Yoni 27-11 »: the reveal of the jersey in Dubai, the images
// of the films never dark, the first and last words readable, the details of the Dragon Ball pendant back, the frieze of the T,
// the octagon, the title of the VfB ring, the photos of the Inter page, the home page on a phone. Computer and iPhone, silent.
const cat = publicCatalogue(defaultCatalogue);

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.locator("[data-piece-section], [data-home-photo]").first().waitFor();
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
}

test("the image of the first film of every piece page: bright, never a dark frame (mean luminance ≥ 0.15)", async () => {
  test.skip(test.info().project.name !== "desktop", "data, once");
  for (const p of cat.pieces) {
    const f = featureFilmOf(p.slug);
    const r = resolveReveal(p.slug, p.atelier);
    const poster = p.slug === "campione-d-italia-2023-2024" ? filmData(YONI_MEDIA.interFilm)?.poster : f ? f.film.poster : r?.poster;
    if (!poster) continue;
    const { data, info } = await sharp("public" + poster).resize(64, 64, { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let sum = 0;
    for (let i = 0; i < data.length; i += 3) sum += (0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!) / 255;
    expect(sum / (info.width * info.height), p.slug + " " + poster).toBeGreaterThanOrEqual(0.15);
  }
});

test("no photo of Every Angle without its image, on every piece page", async ({ page }) => {
  test.slow();
  for (const p of cat.pieces) {
    await open(page, "/pieces/" + p.slug);
    // (The catalogue of the server may redraw the page once it arrives: every check finds its photo again.)
    await page.waitForLoadState("networkidle").catch(() => undefined);
    const imgs = page.locator("[data-every-angle] [data-angle] img");
    const n = await imgs.count();
    for (let i = 0; i < n; i++) {
      await expect
        .poll(
          () =>
            imgs.nth(i).evaluate((el: HTMLImageElement) => {
              el.scrollIntoView({ block: "center" });
              return el.complete && el.naturalWidth > 0;
            }).catch(() => false),
          { message: p.slug + " photo " + (i + 1), timeout: 15_000 },
        )
        .toBe(true);
    }
  }
});

test("the first and last words of the texts of Yoni, and his subtitles: never smaller than the text beside them", async ({ page }) => {
  for (const slug of ["vfb-stuttgart-dfb-pokal-2025", "campione-d-italia-2023-2024", "noah-okafor-oka-pendant", "kevin-schade-dragon-ball-pendant"]) {
    await open(page, "/pieces/" + slug);
    const text = await page.locator("[data-piece-story] .piece-text").first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    for (const sel of ["[data-story-lead]", "[data-story-closing]"]) {
      const el = page.locator("[data-piece-story] " + sel);
      if ((await el.count()) === 0) continue;
      expect(await el.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)), slug + " " + sel).toBeGreaterThanOrEqual(text);
    }
  }
  await open(page, "/pieces/campione-d-italia-2023-2024");
  const text = await page.locator("[data-story-ring] .piece-text").first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(await page.locator("[data-story-ring] [data-story-lead]").evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(text);
  await open(page, "/pieces/noah-okafor-jersey-pendant");
  for (const li of await page.locator("[data-composition-notes] li").all()) expect(await li.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
});

test("the jersey of Noah Okafor: the whole film of Dubai beside its words, its two photos under it, the fitting in the fold-out only", async ({ page }) => {
  await open(page, "/pieces/noah-okafor-jersey-pendant");
  const reveal = page.locator("[data-reveal]");
  const film = reveal.locator("[data-feature-video]");
  await expect(film).toHaveAttribute("poster", /\/yoni-2711\/okafor-dubai\/reveal-poster\./);
  await expect(reveal.locator("[data-film-start]")).toBeVisible();
  expect(YONI_MEDIA.okaforReveal?.film?.duration).toBeGreaterThan(48);
  const row = reveal.locator("[data-photo-row] > li img");
  await expect(row).toHaveCount(2);
  await expect(row.nth(0)).toHaveAttribute("src", /okafor-dubai\/portrait\./);
  await expect(row.nth(1)).toHaveAttribute("src", /okafor-dubai\/group\./);
  await reveal.locator("[data-photo-more-button]").click();
  await expect(reveal.locator("[data-photo-more] img")).toHaveCount(1);
  await expect(reveal.locator("[data-photo-more] img")).toHaveAttribute("src", /okafor-dubai\/fitting\./);
  // The self-portrait in a hood is not one of its photos of the hand-over.
  await expect(reveal.locator("img[src*='/noah-okafor-jersey-pendant/p01']")).toHaveCount(0);
  // Side by side on a computer, to slide on a phone.
  const boxes = await row.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
  if (test.info().project.name === "desktop") expect(Math.abs(boxes[0]! - boxes[1]!)).toBeLessThan(4);
});

test("Dragon Ball: The Art of Detail back after its composition, with the validated sentences of Yoni", async ({ page }) => {
  await open(page, "/pieces/kevin-schade-dragon-ball-pendant");
  const blocks = page.locator("[data-magazine-block] [data-magazine-text] p");
  await expect(blocks).toHaveCount(4);
  const texts = (await blocks.allTextContents()).map((t) => t.replace(/\s+/g, " ").trim());
  expect(texts[0]).toMatch(/^At its center, the energy sphere/);
  expect(texts[1]).toMatch(/^Beneath the sphere stands Goku/);
  expect(texts[2]).toMatch(/^Surrounding him are the seven Dragon Balls/);
  expect(texts[3]).toMatch(/^Each cut, each orientation/);
  const order = await page.locator("[data-piece-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-piece-section")));
  expect(order.indexOf("details")).toBe(order.indexOf("composition") + 1);
});

test("the T9: the evolution of the T as a frieze, no empty frame, the T9 alone illustrated", async ({ page }) => {
  await open(page, "/pieces/marcus-thuram-t-serpent-pendant");
  const ev = page.locator("[data-evolution]");
  await expect(ev.locator("[data-evolution-step]")).toHaveCount(5);
  await expect(ev.locator("[data-evolution-step] img, [data-evolution-step] [aria-hidden] .font-display")).toHaveCount(0);
  await expect(ev.locator("[data-evolution-photo] img")).toHaveCount(1);
});

test("the octagon: Every Angle whole, four chains then See More", async ({ page }) => {
  await open(page, "/pieces/noah-okafor-octagon-pendant");
  await expect(page.locator("[data-every-angle] > ol > li")).toHaveCount(4);
  await expect(page.locator("[data-worn-as-photos] > li")).toHaveCount(4);
  await page.locator("[data-worn-as-more]").click();
  expect(await page.locator("[data-worn-as-photos] > li").count()).toBeGreaterThan(4);
});

test("the VfB ring: « DFB-Pokal » never broken in its title", async ({ page }) => {
  for (const lang of ["", "/fr", "/de", "/ar"]) {
    await open(page, lang + "/pieces/vfb-stuttgart-dfb-pokal-2025");
    const held = page.locator("#piece-title .whitespace-nowrap", { hasText: "DFB-Pokal" });
    await expect(held).toHaveCount(1);
    const lines = await held.evaluate((e) => e.getClientRects().length);
    expect(lines, lang).toBe(1);
  }
});

test("the Inter ring: Yoni with Marcus Thuram and Marko Arnautović beside its story, photo 2 among the champions", async ({ page }) => {
  await open(page, "/pieces/campione-d-italia-2023-2024");
  const photo = page.locator("[data-story-ring] img").first();
  await expect(photo).toHaveAttribute("src", /\/yoni-2711\/inter\/yoni-thuram-arnautovic\./);
  await expect.poll(() => photo.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0)).toBe(true);
  await expect(page.locator("[data-champions] [data-photo-row] > li img").first()).toHaveAttribute("src", /\/yoni-2711\/inter\/champion-trophy\./);
  // Opened large, with its magnifying glass (its loupe copy).
  await page.locator("[data-story-ring] button").first().click();
  await expect(page.locator("[role=dialog] img").first()).toBeVisible();
});

test("the home page on a phone: the trunk fills the top of the screen right under the header", async ({ page }) => {
  test.skip(test.info().project.name === "desktop", "a phone");
  await page.goto("/");
  await page.locator("[data-home-photo-img]").waitFor();
  const header = await page.locator("header").first().evaluate((e) => e.getBoundingClientRect().bottom);
  const box = (await page.locator("[data-home-photo-box]").boundingBox())!;
  expect(box.y - header).toBeLessThan(24);
  expect(box.width).toBeGreaterThan(page.viewportSize()!.width * 0.95);
});
