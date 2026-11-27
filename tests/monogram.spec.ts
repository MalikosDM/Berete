// The monogram BRT in the background (24/11/2026, in place of the name BERETE): fine lines at 5 %, a light that follows the
// mouse with a little inertia over its lines only, a relief of 10 px at most, the diamond that twinkles; alone on a phone (a
// slow diagonal every 9 s); still with « reduce motion »; never in the viewer nor over the photo of the home page.
// Silent (tests/fixtures.ts).
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { skipIntro } from "./helpers";

const PIECE = "/pieces/bosnia-and-herzegovina-world-cup-2026-ring";

const state = (page: Page, root = "[data-monogram]") =>
  page.locator(root).first().evaluate((el) => {
    const shift = el.querySelector<HTMLElement>(".monogram-shift")!;
    const light = el.querySelector<HTMLElement>(".monogram-light")!;
    const m = new DOMMatrixReadOnly(getComputedStyle(light).transform);
    const s = new DOMMatrixReadOnly(getComputedStyle(shift).transform);
    const r = el.getBoundingClientRect();
    return {
      lines: Number(getComputedStyle(el.querySelector(".monogram-lines")!).opacity),
      glow: Number(getComputedStyle(el.querySelector(".monogram-glow")!).opacity),
      glowShown: getComputedStyle(el.querySelector(".monogram-glow")!).display !== "none",
      follow: el.hasAttribute("data-follow"),
      lit: el.hasAttribute("data-lit"),
      light: { x: m.m41 + r.width / 2, y: m.m42 + r.height / 2 },
      shift: { x: s.m41, y: s.m42 },
      sparks: [...el.querySelectorAll<HTMLElement>(".monogram-spark")].map((sp) => Number(getComputedStyle(sp).opacity)),
      box: { x: r.x, y: r.y, w: r.width, h: r.height },
    };
  });

test("a computer: the light follows the mouse over the lines, with inertia; a relief of 10 px at most; the diamond twinkles", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("iphone"), "a mouse");
  await skipIntro(page);
  await page.goto(PIECE, { waitUntil: "load" });
  const mono = page.locator(".universe [data-monogram]");
  await expect(mono).toHaveCount(1);
  // No name BERETE any more, anywhere.
  await expect(page.locator(".u-brand, .brand-mark, [data-brand-mark]")).toHaveCount(0);
  let s = await state(page, ".universe [data-monogram]");
  // Fainter behind the pieces since 27/11/2026 (Yoni: the monogram more discreet in the universes).
  expect(s.lines).toBeGreaterThanOrEqual(0.02);
  expect(s.lines).toBeLessThanOrEqual(0.06);
  expect(s.follow).toBe(true);
  // Large, in the middle of the screen.
  const vp = page.viewportSize()!;
  expect(Math.abs(s.box.x + s.box.w / 2 - vp.width / 2)).toBeLessThan(12);
  expect(Math.abs(s.box.y + s.box.h / 2 - vp.height / 2)).toBeLessThan(12);
  expect(s.box.w).toBeGreaterThan(vp.width * 0.4);
  // The mouse goes to the top of the diamond (its first point): the light follows, a little behind, then arrives.
  const spark = { x: s.box.x + s.box.w * 0.535, y: s.box.y + s.box.h * 0.111 };
  await page.mouse.move(40, vp.height - 40);
  await page.waitForTimeout(1500);
  await page.mouse.move(spark.x, spark.y, { steps: 2 });
  await page.waitForTimeout(40);
  s = await state(page, ".universe [data-monogram]");
  expect(s.lit).toBe(true);
  const early = Math.hypot(s.light.x + s.box.x + s.shift.x - spark.x, s.light.y + s.box.y + s.shift.y - spark.y);
  expect(early).toBeGreaterThan(20);
  await page.waitForTimeout(1600);
  s = await state(page, ".universe [data-monogram]");
  expect(Math.hypot(s.light.x + s.box.x + s.shift.x - spark.x, s.light.y + s.box.y + s.shift.y - spark.y)).toBeLessThan(12);
  expect(s.glow).toBeGreaterThan(0.08);
  expect(s.glow).toBeLessThan(0.23);
  expect(Math.max(...s.sparks)).toBeGreaterThan(0.2);
  // The relief: away from the mouse, never more than 10 px.
  expect(Math.abs(s.shift.x)).toBeLessThanOrEqual(10);
  expect(Math.abs(s.shift.y)).toBeLessThanOrEqual(10);
  // At rest, nothing moves any more (the frames stopped).
  const a = await state(page, ".universe [data-monogram]");
  await page.waitForTimeout(500);
  const b = await state(page, ".universe [data-monogram]");
  expect(b.light).toEqual(a.light);
  // The circle and the home page have it too, fixed under the content; the photo of the home page covers it.
  await page.goto("/players", { waitUntil: "load" });
  await expect(page.locator("[data-monogram]")).toHaveCount(1);
  expect(await page.locator("[data-monogram]").evaluate((el) => [getComputedStyle(el).position, getComputedStyle(el).zIndex])).toEqual(["fixed", "-1"]);
  await page.goto("/", { waitUntil: "load" });
  expect(await page.locator("[data-home-photo-frame]").evaluate((el) => getComputedStyle(el.closest("section")!).backgroundColor)).toBe("rgb(10, 10, 10)");
});

test("no mouse: the light passes alone, slowly, every 9 seconds; never in the viewer", async ({ page }, info) => {
  test.skip(!info.project.name.startsWith("iphone"), "a phone");
  await skipIntro(page);
  await page.goto(PIECE, { waitUntil: "load" });
  const s = await state(page, ".universe [data-monogram]");
  expect(s.follow).toBe(false);
  expect(s.glow).toBeGreaterThan(0.08);
  const sweep = await page.locator(".universe .monogram-light").evaluate((el) => el.getAnimations().map((a) => [(a as CSSAnimation).animationName, Number(a.effect?.getTiming().duration)]));
  expect(sweep).toEqual([["monogram-sweep", 9000]]);
  // The viewer has none.
  const photo = page.locator("[data-angle][data-angle-type='image']").first();
  await photo.scrollIntoViewIfNeeded();
  await photo.click();
  await expect(page.locator("[data-lightbox]")).toBeVisible();
  await expect(page.locator("[data-lightbox] [data-monogram]")).toHaveCount(0);
});

test("« reduce motion »: the monogram stays still, without light", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await skipIntro(page);
  await page.goto(PIECE, { waitUntil: "load" });
  await page.mouse.move(300, 300);
  await page.mouse.move(700, 400, { steps: 5 });
  await page.waitForTimeout(600);
  const s = await state(page, ".universe [data-monogram]");
  expect(s.follow).toBe(false);
  expect(s.glowShown).toBe(false);
  expect(s.shift).toEqual({ x: 0, y: 0 });
  expect(s.lines).toBeGreaterThan(0.02);
});
