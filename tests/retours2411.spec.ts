// The videos of Yoni of 24/11/2026 (11 h 01 to 11 h 06, a 13-inch MacBook Pro under Safari, a window of about 1440 × 780):
// full screen one can always leave, the Signature Trunks (the trunks first, their photos first, one staging), Begin Your
// Creation in one screen, the home photo whole under an opaque header, a menu read at once. Silent (tests/fixtures.ts).
import { expect, test } from "./fixtures";
import { skipIntro } from "./helpers";

const fullscreenOf = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const d = document as Document & { webkitFullscreenElement?: Element | null };
    return Boolean(d.fullscreenElement ?? d.webkitFullscreenElement);
  });

/** Every kind of film with a full-screen button: the film of a piece, the mechanism of Dragon Ball, the cross that turns. */
const FILMS = ["vfb-stuttgart-dfb-pokal-2025", "kevin-schade-dragon-ball-pendant", "malik-tillman-cross-pendant"];

for (const slug of FILMS) {
  test("full screen of the film of " + slug + ": our button enters and leaves it, Escape leaves it, the page stays where it was", async ({ page }, info) => {
    await skipIntro(page);
    await page.goto("/pieces/" + slug, { waitUntil: "load" });
    const section = page.locator("[data-feature-film]");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const button = section.locator("[data-feature-fullscreen]");
    const before = await page.evaluate(() => window.scrollY);
    await button.click();
    // A phone without the full screen of an element hands the film to the player of the system (its own "Done").
    const entered = await expect.poll(() => fullscreenOf(page), { timeout: 5_000 }).toBe(true).then(() => true, () => false);
    test.skip(!entered && info.project.name === "iphone", "the iPhone gives the film to its own player (its Done brings it back)");
    expect(entered, "full screen entered").toBe(true);
    // Our buttons stay there, in the full screen.
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: "verification/" + info.project.name + "/retours2411-plein-ecran-" + slug + ".jpg", type: "jpeg", quality: 55 });
    await button.click();
    await expect.poll(() => fullscreenOf(page), { timeout: 5_000 }).toBe(false);
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 3_000 }).toBeLessThanOrEqual(before + 4);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(before - 4);
    // Escape leaves it too.
    await button.click();
    await expect.poll(() => fullscreenOf(page), { timeout: 5_000 }).toBe(true);
    await page.keyboard.press("Escape");
    await expect.poll(() => fullscreenOf(page), { timeout: 5_000 }).toBe(false);
    await expect(button).toHaveAttribute("aria-pressed", "false");
  });
}

test("Signature Trunks: the trunks from the first screen, their photos first, the way to the piece small once open", async ({ page }, info) => {
  test.skip(info.project.name === "iphone", "the sizes of a laptop");
  await skipIntro(page);
  for (const [w, h] of [[1280, 800], [1440, 780]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/boxes", { waitUntil: "load" });
    await page.waitForTimeout(1200);
    // No large opening any more: its name on one line, then the trunks, three on a row.
    await expect(page.locator("[data-boxes-hero]")).toHaveCount(0);
    const cards = page.locator("[data-box]");
    await expect(cards).toHaveCount(9);
    const firstRow = await cards.evaluateAll((els) => els.slice(0, 3).map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(firstRow).size, "three on a row").toBe(1);
    for (let i = 0; i < 3; i++) {
      const name = (await cards.nth(i).locator("h3").boundingBox())!;
      expect(name.y + name.height, w + "×" + h + ": the first row with its names in the first screen").toBeLessThanOrEqual(h);
    }
    // Every card the same square.
    const squares = await page.locator("[data-trunk-state]").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
    expect(new Set(squares).size).toBe(1);
  }
  await page.screenshot({ path: "verification/desktop/retours2411-ecrins-haut.jpg", type: "jpeg", quality: 60 });
  const card = page.locator("[data-box='dragon-ball-trunk']");
  // Closed: "Discover the photos", plainly; no button to create or to enter on the card.
  await expect(card.locator("[data-box-photos]")).toHaveText("Discover the photos");
  await expect(card.locator("[data-trunk-create], [data-box-enter]")).toHaveCount(0);
  await card.locator("[data-box-photos]").click();
  const viewer = page.locator("[data-lightbox]");
  await expect(viewer).toBeVisible();
  await expect(viewer).toContainText(/01\s*\/\s*0\d/);
  await page.screenshot({ path: "verification/desktop/retours2411-ecrins-visionneuse.jpg", type: "jpeg", quality: 60 });
  await page.keyboard.press("ArrowRight");
  await expect(viewer).toContainText(/02\s*\/\s*0\d/);
  await page.keyboard.press("Escape");
  // Open: its photos first, then, small, the way to its piece.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await card.scrollIntoViewIfNeeded();
  await card.locator("[data-trunk-open]").click();
  const enter = card.locator("[data-box-enter]");
  await expect(enter).toBeVisible({ timeout: 10_000 });
  await expect(enter).toContainText("Discover the piece");
  const photosY = (await card.locator("[data-box-photos]").boundingBox())!.y;
  expect((await enter.boundingBox())!.y).toBeGreaterThan(photosY);
  await page.screenshot({ path: "verification/desktop/retours2411-ecrins-ouvert.jpg", type: "jpeg", quality: 60 });
  // Begin Your Creation once, at the end of the page.
  await expect(page.locator("main [data-cta]", { hasText: "Begin Your Creation" })).toHaveCount(1);
  // In French too.
  await page.goto("/fr/boxes", { waitUntil: "load" });
  await expect(page.locator("[data-box='sirius'] [data-box-photos]")).toHaveText("Découvrir les photos");
});

test("Signature Trunks: one staging, every base measured and set the same (the frames of the films with it)", async () => {
  const { trunks } = (await import("../src/data/trunks.generated.json", { with: { type: "json" } })).default as { trunks: Record<string, { set: string; marble?: { width: number; top: number; center: number }; frame?: { x: number; y: number; size: number } }> };
  const v3 = Object.entries(trunks).filter(([, t]) => t.set === "v3");
  expect(v3.length).toBe(9);
  const ref = trunks["butterfly-trunk"]!;
  for (const [slug, t] of v3) {
    expect(t.marble, slug).toBeTruthy();
    const f = t.frame!;
    // In the square: the base at the width of the reference (or a little narrower when a tall box keeps whole), its plateau
    // at the same height, centred.
    const width = t.marble!.width / f.size;
    if (slug === "dragon-ball-trunk") expect(width, slug).toBeLessThan(ref.marble!.width / ref.frame!.size);
    else expect(Math.abs(width - ref.marble!.width / ref.frame!.size), slug).toBeLessThan(0.002);
    expect(Math.abs((t.marble!.top - f.y) / f.size - (ref.marble!.top - ref.frame!.y) / ref.frame!.size), slug).toBeLessThan(0.002);
    expect(Math.abs((t.marble!.center - f.x) / f.size - 0.5), slug).toBeLessThan(0.002);
  }
});

test("Begin Your Creation: everything in one screen, By phone and By email two fine lines under the consultation", async ({ page }, info) => {
  await skipIntro(page);
  const sizes: [number, number][] = info.project.name === "iphone" ? [] : [[1440, 780], [1440, 900], [1280, 800]];
  for (const [w, h] of sizes) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/contact", { waitUntil: "load" });
    await page.waitForTimeout(1000);
    const columns = (await page.locator("[data-contact-columns]").boundingBox())!;
    expect(columns.y + columns.height, w + "×" + h + ": the whole content above the fold").toBeLessThanOrEqual(h);
    // The two lines in the right column, of the same width, under the consultation.
    const config = (await page.locator("[data-configurator]").boundingBox())!;
    const phone = (await page.locator("[data-contact-line='phone']").boundingBox())!;
    const email = (await page.locator("[data-contact-line='email']").boundingBox())!;
    expect(phone.y).toBeGreaterThan(config.y + config.height - 1);
    expect(Math.round(phone.width)).toBe(Math.round(email.width));
    expect(Math.abs(phone.x - config.x)).toBeLessThan(2);
    await page.screenshot({ path: "verification/desktop/retours2411-contact-" + w + "x" + h + ".jpg", type: "jpeg", quality: 60 });
  }
  if (info.project.name === "iphone") {
    await page.goto("/contact", { waitUntil: "load" });
    // Stacked in a natural order: the words, then the consultation, then the two lines.
    const order = await page.evaluate(() => ["[data-contact-columns] .lg\\:col-span-5", "[data-configurator]", "[data-contact-line='phone']", "[data-contact-line='email']"].map((s) => document.querySelector(s)?.getBoundingClientRect().top ?? -1));
    expect(order.every((y, i) => y >= 0 && (i === 0 || y > order[i - 1]!))).toBe(true);
  }
});

test("home: the photo of the Sirius trunk whole, under the header, centred, at every size; the header opaque, the menu read at once", async ({ page }, info) => {
  await skipIntro(page);
  const sizes: [number, number][] = info.project.name === "iphone" ? [[390, 844]] : [[1280, 800], [1440, 780], [1440, 900], [1470, 956], [1512, 982], [1920, 1080], [1440, 700]];
  for (const [w, h] of sizes) {
    if (info.project.name !== "iphone") await page.setViewportSize({ width: w, height: h });
    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(900);
    const header = (await page.locator("header").boundingBox())!;
    const box = (await page.locator("[data-home-photo-box]").boundingBox())!;
    const vw = page.viewportSize()!.width;
    const vh = page.viewportSize()!.height;
    expect(box.y, w + "×" + h + ": under the header").toBeGreaterThanOrEqual(header.y + header.height - 1);
    expect(box.y + box.height, w + "×" + h + ": whole in the window").toBeLessThanOrEqual(vh + 1);
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(vw + 1);
    // Centred in the room under the header.
    expect(Math.abs(box.x + box.width / 2 - vw / 2)).toBeLessThanOrEqual(2);
    // The photo of the shape of the box (contain): its own ratio.
    const ratio = await page.locator("[data-home-photo-img]").evaluate((img) => (img as HTMLImageElement).naturalWidth / (img as HTMLImageElement).naturalHeight);
    await expect.poll(() => page.locator("[data-home-photo-img]").evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    if (ratio > 0) expect(Math.abs(box.width / box.height - ratio), "the whole photo, never cut").toBeLessThan(0.03);
    await page.screenshot({ path: "verification/" + info.project.name + "/retours2411-accueil-" + w + "x" + h + ".jpg", type: "jpeg", quality: 55 });
  }
  // The header on black from the top; the menu a notch heavier, an ivory at 7:1 at least.
  const bg = await page.locator("header > div[aria-hidden]").first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toMatch(/rgb\(10, 10, 10\)|rgba\(10, 10, 10, 1\)/);
  if (info.project.name !== "iphone") {
    const link = page.locator("[data-desktop-nav] a").nth(1);
    // (Every weight a notch heavier since 27/11/2026: Manrope 600 for the menu.)
    expect(await link.evaluate((el) => getComputedStyle(el).fontWeight)).toBe("600");
    const color = await link.evaluate((el) => getComputedStyle(el).color);
    const [r, g, b] = color.match(/\d+/g)!.map(Number);
    const lum = (c: number) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const L = 0.2126 * lum(r!) + 0.7152 * lum(g!) + 0.0722 * lum(b!);
    const Lbg = 0.2126 * lum(10) + 0.7152 * lum(10) + 0.0722 * lum(10);
    expect((L + 0.05) / (Lbg + 0.05)).toBeGreaterThanOrEqual(7);
  }
});
