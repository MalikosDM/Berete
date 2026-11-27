// A photo opened is sharp, even zoomed to the end (Malik, 24/11/2026): its loupe copy (scripts/loupe.mjs, up to 3200 px from
// the original) loads behind the copy of the page and takes its place; the zoom stops where one pixel of the photo would be
// drawn over more than one point of the screen; a click zooms, a new click comes back; the help « Click to zoom » once per
// visit; the pages never load a loupe copy. Computers at 1512 × 982 drawn at 2 pixels per point (Chromium: desktop, WebKit:
// safari), and the iPhone. Silent (tests/fixtures.ts).
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, silence, test } from "./fixtures";

const LOUPES = JSON.parse(readFileSync(new URL("../src/data/loupe.generated.json", import.meta.url), "utf8")) as Record<string, { src: string; width: number; height: number }>;

/** The pieces of the brief: Inter, the iced Cuban, Sirius, Dragon Ball, BRT Flowers; and a trunk. */
const PIECES = ["campione-d-italia-2023-2024", "rose-iced-cuban-chain", "sirius", "kevin-schade-dragon-ball-pendant", "brt-flower-chain"];

/** A page of a computer of 1512 × 982 points at 2 pixels per point, or the iPhone of the project. */
async function screen(page: Page, browser: import("@playwright/test").Browser, phone: boolean): Promise<{ page: Page; close: () => Promise<void> }> {
  if (phone) return { page, close: async () => undefined };
  const ctx = await browser.newContext({ viewport: { width: 1512, height: 982 }, deviceScaleFactor: 2 });
  await silence(ctx);
  await ctx.addInitScript({ content: "try{sessionStorage.setItem('bj-intro-seen','1')}catch(e){}" });
  return { page: await ctx.newPage(), close: () => ctx.close() };
}

/** Opens the first photo of the gallery that has a loupe copy; returns that copy. */
async function openPhoto(page: Page, opener: string) {
  const items = page.locator(opener);
  const n = await items.count();
  for (let i = 0; i < n; i++) {
    const src = await items.nth(i).locator("img").first().getAttribute("src");
    if (src && LOUPES[src]) {
      await items.nth(i).scrollIntoViewIfNeeded();
      await items.nth(i).click();
      return { src, loupe: LOUPES[src] };
    }
  }
  throw new Error("no photo with a loupe copy in " + opener);
}

/** Zooms to the end at the middle of the photo (a click, then + until it greys). */
async function zoomToTheEnd(page: Page, phone: boolean) {
  const stage = (await page.locator("[data-lightbox-stage]").boundingBox())!;
  const at = { x: stage.x + stage.width / 2, y: stage.y + stage.height * 0.45 };
  if (phone) await page.touchscreen.tap(at.x, at.y);
  else await page.mouse.click(at.x, at.y);
  await expect.poll(() => page.locator("[data-lightbox-stage]").getAttribute("data-zoom").then(Number)).toBeGreaterThan(1.05);
  const plus = page.locator("[data-zoom-in]");
  for (let i = 0; i < 12 && !(await plus.isDisabled()); i++) {
    await plus.click();
    await page.waitForTimeout(420);
  }
  await expect(plus).toBeDisabled();
  await page.waitForTimeout(500);
}

/** The photo drawn now, in points of the screen, for one pixel of its file: never more than 1 (no pixel enlarged). */
const drawnPerPixel = (page: Page) =>
  page.evaluate(() => {
    const photo = document.querySelector("[data-lightbox-photo]")!.getBoundingClientRect();
    const loupe = document.querySelector<HTMLImageElement>("[data-lightbox-loupe]")!;
    // In pixels of the screen: (points × devicePixelRatio) for (pixels of the file × devicePixelRatio).
    return (photo.width * devicePixelRatio) / (loupe.naturalWidth * devicePixelRatio);
  });

for (const slug of PIECES) {
  test("the photos of " + slug + " open sharp: their loupe copy loaded, the zoom to the end never enlarges a pixel", async ({ page, browser }, info) => {
    const phone = info.project.name.startsWith("iphone");
    const { page: p, close } = await screen(page, browser, phone);
    const asked: string[] = [];
    p.on("request", (r) => asked.push(r.url()));
    await p.goto("/pieces/" + slug, { waitUntil: "load" });
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(1200);
    // The pages never load a loupe copy, nor their list.
    expect(asked.filter((u) => /\.loupe[.]|loupe\.generated/.test(u))).toEqual([]);
    const { loupe } = await openPhoto(p, "[data-angle][data-angle-type='image']");
    const viewer = p.locator("[data-lightbox]");
    await expect(viewer).toBeVisible();
    // The copy of the page at once, then its loupe copy, decoded, faded in.
    const sharp = p.locator("[data-lightbox-loupe]");
    await expect(sharp).toHaveAttribute("data-loaded", "", { timeout: 20_000 });
    expect(await sharp.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(loupe.width);
    await expect.poll(() => sharp.evaluate((img) => Number(getComputedStyle(img).opacity))).toBe(1);
    // As far as the photo is sharp: + greys at the end, and no pixel of the file is drawn larger than a point.
    await zoomToTheEnd(p, phone);
    const ratio = await drawnPerPixel(p);
    expect(ratio).toBeLessThanOrEqual(1.001);
    expect(ratio).toBeGreaterThan(0.95);
    const max = Number(await p.locator("[data-lightbox-stage]").getAttribute("data-zoom-max"));
    console.log(info.project.name + " · " + slug + ": zoom ×" + max.toFixed(2) + " (" + loupe.width + " × " + loupe.height + ")");
    await p.screenshot({ path: "verification/" + info.project.name + "/loupe-" + slug + ".jpg", type: "jpeg", quality: 80 });
    // A new click (a tap) comes back to the whole photo; the arrow goes to the next one, whole, its loupe copy ready.
    const stage = (await p.locator("[data-lightbox-stage]").boundingBox())!;
    if (phone) await p.touchscreen.tap(stage.x + stage.width / 2, stage.y + stage.height / 2);
    else await p.mouse.click(stage.x + stage.width / 2, stage.y + stage.height / 2);
    await expect(p.locator("[data-lightbox-stage]")).toHaveAttribute("data-zoom", "1.00");
    await p.keyboard.press("ArrowRight");
    await expect(p.locator("[data-lightbox-stage]")).toHaveAttribute("data-zoom", "1.00");
    await p.keyboard.press("Escape");
    await close();
  });
}

test("a trunk: its photos open sharp in the viewer, zoomed to the end", async ({ page, browser }, info) => {
  const phone = info.project.name.startsWith("iphone");
  const { page: p, close } = await screen(page, browser, phone);
  await p.goto("/boxes", { waitUntil: "load" });
  const card = p.locator("[data-box='sirius']");
  await card.scrollIntoViewIfNeeded();
  await card.locator("[data-box-photos]").click();
  const sharp = p.locator("[data-lightbox-loupe]");
  await expect(sharp).toHaveAttribute("data-loaded", "", { timeout: 20_000 });
  const src = await p.locator("[data-lightbox-image]").getAttribute("src");
  expect(LOUPES[src!]).toBeTruthy();
  expect(await sharp.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(LOUPES[src!]!.width);
  await zoomToTheEnd(p, phone);
  expect(await drawnPerPixel(p)).toBeLessThanOrEqual(1.001);
  await p.screenshot({ path: "verification/" + info.project.name + "/loupe-ecrin-sirius.jpg", type: "jpeg", quality: 80 });
  await close();
});

test("the help « Click to zoom »: shown once per visit, gone at the first zoom; the photo before and after ready", async ({ page, browser }, info) => {
  const phone = info.project.name.startsWith("iphone");
  const { page: p, close } = await screen(page, browser, phone);
  await p.goto("/fr/pieces/campione-d-italia-2023-2024", { waitUntil: "load" });
  await p.evaluate(() => sessionStorage.removeItem("bj-zoom-help"));
  await openPhoto(p, "[data-angle][data-angle-type='image']");
  const help = p.locator("[data-zoom-help]");
  // (25/11/2026: the magnifying glass that follows the pointer, a long press on a phone.)
  await expect(help).toHaveText(phone ? "Appui long pour la loupe · touchez pour zoomer" : "Survolez la photo pour la loupe · molette pour la grossir · cliquez pour zoomer");
  // The loupe copies of the photo after and of the photo before load too.
  const items = (await p.locator("[data-lightbox] p").first().innerText()).split("/").map((x) => Number(x.trim()));
  expect(items[0]).toBe(1);
  await expect
    .poll(() => p.evaluate(() => performance.getEntriesByType("resource").filter((e) => /\.loupe[.]/.test(e.name)).length))
    .toBeGreaterThanOrEqual(2);
  await zoomToTheEnd(p, phone);
  await expect(help).toHaveCount(0);
  await p.keyboard.press("Escape");
  await openPhoto(p, "[data-angle][data-angle-type='image']");
  await expect(p.locator("[data-lightbox-loupe]")).toHaveAttribute("data-loaded", "", { timeout: 20_000 });
  await expect(help).toHaveCount(0);
  await close();
});

test("a photo of a phone keeps its size: its zoom stops at its own pixels (« Porté par »)", async ({ page, browser }, info) => {
  const phone = info.project.name.startsWith("iphone");
  const { page: p, close } = await screen(page, browser, phone);
  // The photos where it is worn (stories, WhatsApp: small originals): the zoom never goes beyond their largest file.
  // (The Inter page shows its champions in its own section since 27/11/2026: the JL pendant, worn on its Cuban chain.)
  await p.goto("/pieces/jamie-leweling-jl-pendant", { waitUntil: "load" });
  // A photo (never a film: the viewer has no zoom for a film), once the photos of the section are in the page.
  await p.locator("[data-worn-by]").scrollIntoViewIfNeeded();
  await p.waitForTimeout(1200);
  const worn = p.locator("[data-worn-by] button:has(img)");
  test.skip((await worn.count()) === 0, "no worn photo on this page");
  await worn.first().scrollIntoViewIfNeeded();
  await worn.first().click();
  await expect(p.locator("[data-lightbox-image]")).toHaveCount(1);
  await expect.poll(() => p.locator("[data-lightbox-image]").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  const viewer = p.locator("[data-lightbox]");
  await expect(viewer).toBeVisible();
  // Its largest file: its loupe copy when it has one (from the list, loaded or not yet), else the photo itself.
  const src = (await p.locator("[data-lightbox-image]").getAttribute("src"))!;
  const width = LOUPES[src]?.width ?? (await p.locator("[data-lightbox-image]").evaluate((img: HTMLImageElement) => img.naturalWidth));
  const max = Number(await p.locator("[data-lightbox-stage]").getAttribute("data-zoom-max"));
  const drawn = (await p.locator("[data-lightbox-photo]").boundingBox())!.width;
  expect(max).toBeLessThanOrEqual(Math.max(1, width / drawn) + 0.01);
  await close();
});
