// The feedback of Yoni of 25/11/2026 (two calls and a video of the atelier): the pages of the pieces as a magazine, the bar of
// the films, the magnifying glass that follows the pointer, the L of Deniz Undav without any image made by AI, the Genkidama
// v2, the gold and the depth of the universes, the universes placed under the piece at every size, The Bespoke Journey (the
// client space, the price), the atelier around its films, the padlock of the admin. Computer, iPhone, Safari.
import { expect, test, type Page } from "./fixtures";
import { mkdirSync } from "node:fs";
import { skipIntro, watch } from "./helpers";
import { BACKDROPS } from "../src/data/themes";

const DIR = "verification/retours2511";
mkdirSync(DIR, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 70 });

async function piece(page: Page, slug: string, prefix = "") {
  await skipIntro(page);
  await page.goto(prefix + "/pieces/" + slug, { waitUntil: "load" });
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
}

test("a magazine: the film and the story side by side, four photos of the whole, the details beside their sentence", async ({ page }, info) => {
  const problems = watch(page);
  const phone = info.project.name === "iphone";
  await piece(page, "kevin-schade-dragon-ball-pendant");
  const spread = page.locator("[data-piece-spread]");
  await expect(spread.locator("[data-feature-frame]")).toBeVisible();
  await expect(spread.locator("h2#piece-story-title")).toHaveText(/Behind the Creation/i);
  await expect(spread.locator("[data-story-paragraph]").first()).toBeVisible();
  const film = await spread.locator("[data-feature-frame]").boundingBox();
  const story = await spread.locator("[data-piece-story]").boundingBox();
  // The film on the left, the story on the right on a computer; one under the other on a phone.
  if (phone) expect(story!.y).toBeGreaterThan(film!.y + film!.height - 2);
  else expect(story!.x).toBeGreaterThan(film!.x + film!.width - 2);
  // The film has its bar to move in it.
  await expect(spread.locator("[data-seek]")).toHaveCount(1);
  // The photos of the whole first, then the details beside their sentence (never more than five), the sides changing.
  expect(await page.locator("[data-every-angle] [data-angle]").count()).toBeLessThanOrEqual(4);
  const blocks = page.locator("[data-magazine-block]");
  expect(await blocks.count()).toBeGreaterThanOrEqual(3);
  expect(await blocks.count()).toBeLessThanOrEqual(5);
  // Each sentence once on the page: what a detail tells is no longer in the story at the top.
  const told = await blocks.locator("[data-magazine-text] p").allInnerTexts();
  const top = (await spread.locator("[data-piece-story]").innerText()).replace(/\s+/g, " ");
  for (const s of told) expect(top, "told once").not.toContain(s.replace(/\s+/g, " ").slice(0, 60));
  if (!phone) {
    const sides = await blocks.evaluateAll((els) =>
      els.map((li) => {
        const photo = li.querySelector("[data-magazine-photo]")!.getBoundingClientRect();
        const text = li.querySelector("[data-magazine-text]")!.getBoundingClientRect();
        return photo.left > text.left ? "right" : "left";
      }),
    );
    expect(sides[0]).toBe("right");
    expect(sides[1]).toBe("left");
  }
  // A photo of a detail opens full screen.
  await blocks.first().locator("[data-magazine-photo]").click();
  await expect(page.locator("[data-lightbox]")).toBeVisible();
  await page.keyboard.press("Escape");
  await spread.scrollIntoViewIfNeeded();
  await shot(page, info.project.name + "-retours2511-magazine");
  expect(problems.errors).toEqual([]);
});

test("the film of a piece: its bar moves it forward and back", async ({ page }) => {
  await piece(page, "kevin-schade-dragon-ball-pendant");
  const frame = page.locator("[data-piece-spread] [data-feature-frame]");
  await frame.scrollIntoViewIfNeeded();
  const video = frame.locator("video");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.duration || 0), { timeout: 30_000 }).toBeGreaterThan(2);
  const bar = page.locator("[data-piece-spread] [data-seek]");
  await bar.evaluate((el: HTMLInputElement) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    set.call(el, String(Number(el.max) * 0.6));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime / v.duration)).toBeGreaterThan(0.5);
});

test("the magnifying glass: only over the photo, sharp at its strongest", async ({ page }, info) => {
  const phone = info.project.name === "iphone";
  await piece(page, "campione-d-italia-2023-2024");
  await page.locator("[data-every-angle] [data-angle='1'] button").click();
  const stage = page.locator("[data-lightbox-stage]");
  const img = page.locator("[data-lightbox-image]");
  await expect(img).toBeVisible();
  await page.waitForTimeout(600);
  const box = (await img.boundingBox())!;
  const lens = page.locator("[data-loupe-lens]");
  if (phone) {
    // A long press: the glass above the finger, following it; gone when the finger lifts.
    const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, pointerId: 7, pointerType: "touch", isPrimary: true, bubbles: true };
    await stage.dispatchEvent("pointerdown", at);
    await page.waitForTimeout(650);
    await expect(lens).toBeVisible();
    await expect(lens).toHaveAttribute("data-touch", "");
    const above = (await lens.boundingBox())!;
    expect(above.y + above.height, "above the finger").toBeLessThan(at.clientY);
    await stage.dispatchEvent("pointerup", at);
    await expect(lens).toHaveCount(0);
    return;
  }
  // Over the photo: the glass, round, about 180 px, its edge in rose gold.
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await expect(lens).toBeVisible();
  const size = await lens.evaluate((e) => [e.getBoundingClientRect().width, getComputedStyle(e).borderRadius]);
  expect(Math.round(size[0] as number)).toBe(180);
  // The wheel makes it stronger, as far as the file stays sharp (one pixel of the file for one point of the screen at most).
  for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -200);
  const mag = Number(await lens.getAttribute("data-mag"));
  expect(mag).toBeGreaterThan(2);
  expect(mag).toBeLessThanOrEqual(5);
  const sharp = await page.evaluate(() => {
    const l = document.querySelector<HTMLElement>("[data-loupe-lens]")!;
    const w = parseFloat(l.style.backgroundSize);
    const src = /url\("(.+)"\)/.exec(l.style.backgroundImage)![1]!;
    return new Promise<number>((resolve) => {
      const i = new Image();
      i.onload = () => resolve(i.naturalWidth / w);
      i.src = src;
    });
  });
  expect(sharp, "file pixels for one point of the screen").toBeGreaterThanOrEqual(0.98);
  await shot(page, info.project.name + "-retours2511-loupe");
  // Beside the photo (the arrows, the cross): no glass, the pointer again.
  const next = page.getByRole("button", { name: /suivante|next/i }).first();
  const nb = (await next.boundingBox())!;
  await page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2);
  await expect(lens).toHaveCount(0);
  const sb = (await stage.boundingBox())!;
  await page.mouse.move(sb.x + 4, sb.y + 4);
  await expect(lens).toHaveCount(0);
});

test("the L of Deniz Undav: no image made by AI anywhere", async ({ page }, info) => {
  await piece(page, "deniz-undav-l-pendant");
  const html = await page.content();
  expect(html).not.toContain("/media/extra/deniz-undav-l-pendant/");
  expect(html).not.toContain("/media/cutouts/deniz-undav-l-pendant/studio");
  // It opens on its real photo of the whole L, its edges faded into the black.
  await expect(page.locator("[data-opening-fade] img").first()).toHaveAttribute("src", /\/media\/hd\/deniz-undav-l-pendant\/p10/);
  await shot(page, info.project.name + "-retours2511-pendentif-L");
  await page.goto("/creations/pendants", { waitUntil: "load" });
  const card = page.locator("[data-piece-card='deniz-undav-l-pendant'] img").first();
  await expect(card).toHaveAttribute("src", /\/media\/hd\/deniz-undav-l-pendant\/p10/);
});

test("the Genkidama v2: the sphere right above the piece, at the top of the page", async ({ page }, info) => {
  await piece(page, "kevin-schade-dragon-ball-pendant");
  const u = page.locator(".universe");
  await expect(u).toHaveAttribute("data-anchored", /wide|tall/);
  await expect(page.locator(".u-backdrop img").first()).toHaveAttribute("src", new RegExp("genkidama-1600\\." + BACKDROPS.genkidama!.version));
  // The bottom of the sphere at the top of the piece (a few points), its centre on the axis of the piece.
  const m = await page.evaluate(() => {
    const core = document.querySelector(".u-genki-core")!.getBoundingClientRect();
    const cover = document.querySelector<HTMLElement>("[data-piece-cover]")!;
    const r = cover.getBoundingClientRect();
    const cs = getComputedStyle(cover);
    return { sphereBottom: core.top + core.height / 2, sphereX: core.left + core.width / 2, pieceTop: r.top + parseFloat(cs.paddingTop), pieceX: r.left + parseFloat(cs.paddingLeft) + (r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) / 2 };
  });
  expect(Math.abs(m.sphereX - m.pieceX), "same vertical axis").toBeLessThan(info.project.name === "iphone" ? 30 : 40);
  await shot(page, info.project.name + "-retours2511-genkidama");
});

test("Inter and VfB: the gold of the champions, the depth", async ({ page }, info) => {
  for (const slug of ["campione-d-italia-2023-2024", "vfb-stuttgart-dfb-pokal-2025"]) {
    await piece(page, slug);
    await expect(page.locator(".u-gold")).toHaveCount(1);
    await expect(page.locator("article[data-champion]")).toHaveCount(1);
    const rule = await page.locator("#piece-title").evaluate((e) => getComputedStyle(e, "::after").backgroundImage);
    expect(rule).toContain("gradient");
    // The background in depth (WebGL, else CSS); on a computer the jewel answers the mouse.
    await expect(page.locator("article[data-piece]")).toHaveAttribute("data-depth", /gl|css/, { timeout: 20_000 });
    await shot(page, info.project.name + "-retours2511-" + slug);
  }
});

test("asked for less motion: no depth, nothing moves", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await skipIntro(page);
  await page.goto("/pieces/campione-d-italia-2023-2024", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  expect(await page.locator("article[data-piece]").getAttribute("data-depth")).toBeNull();
  await ctx.close();
});

test("a universe falls the same on every screen: the piece on its anchor", async ({ browser }) => {
  // The Hand between its two spheres: the centre of the piece is the same point of the image at three sizes.
  const at: number[][] = [];
  for (const [w, h] of [[1280, 800], [1440, 900], [1920, 1080]] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await skipIntro(page);
    await page.goto("/pieces/the-hand", { waitUntil: "load" });
    await expect(page.locator(".universe")).toHaveAttribute("data-anchored", "wide");
    at.push(
      await page.evaluate(() => {
        const u = document.querySelector<HTMLElement>(".universe")!;
        const s = u.style;
        const l = parseFloat(s.getPropertyValue("--u-img-l"));
        const t = parseFloat(s.getPropertyValue("--u-img-t"));
        const iw = parseFloat(s.getPropertyValue("--u-img-w"));
        const ratio = parseFloat(s.getPropertyValue("--u-img-ratio"));
        const c = document.querySelector<HTMLElement>("[data-piece-cover]")!;
        const r = c.getBoundingClientRect();
        const cs = getComputedStyle(c);
        const px = r.left + parseFloat(cs.paddingLeft) + (r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) / 2;
        const py = r.top + parseFloat(cs.paddingTop) + (r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / 2;
        return [(px - l) / iw, (py - t) / (iw / ratio)];
      }),
    );
    await ctx.close();
  }
  for (const p of at.slice(1)) {
    expect(Math.abs(p[0]! - at[0]![0]!)).toBeLessThan(0.02);
    expect(Math.abs(p[1]! - at[0]![1]!)).toBeLessThan(0.03);
  }
});

test("The Bespoke Journey: follow your piece live, how the price is set", async ({ page }, info) => {
  await skipIntro(page);
  await page.goto("/fr/process", { waitUntil: "load" });
  await expect(page.locator("[data-timeline-live]")).toContainText("Suivez votre pièce, en direct");
  await expect(page.locator("[data-journey-price]")).toContainText("Comment le prix est-il fixé ?");
  // Never a figure in the price.
  expect(await page.locator("[data-journey-price]").innerText()).not.toMatch(/\d/);
  await page.locator("[data-timeline-live]").scrollIntoViewIfNeeded();
  await shot(page, info.project.name + "-retours2511-bespoke");
});

test("The Atelier: the film watched in the atelier, its steps, full screen", async ({ page }, info) => {
  await skipIntro(page);
  await page.goto("/atelier?piece=kevin-schade-dragon-ball-pendant", { waitUntil: "load" });
  const room = page.locator("[data-atelier-room]");
  await expect(room).toBeVisible({ timeout: 20_000 });
  const scene = room.locator("[data-atelier-scene]");
  await expect(scene).toHaveCount(1);
  expect(Number(await scene.evaluate((e) => getComputedStyle(e).opacity))).toBeGreaterThan(0.3);
  await expect(room.locator("[data-atelier-fullscreen]")).toBeVisible();
  // The film never covers the whole screen: the room shows around it.
  const film = (await room.locator("[data-atelier-film]").boundingBox())!;
  const vw = page.viewportSize()!.width;
  expect(film.width).toBeLessThan(vw - 10);
  await page.waitForTimeout(1200);
  await shot(page, info.project.name + "-retours2511-atelier");
});

test("the padlock of the admin: only for a device that came in", async ({ page, context }) => {
  await skipIntro(page);
  await page.goto("/", { waitUntil: "load" });
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-admin-lock]")).toHaveCount(process.env.ACCESS_PASSWORD ? 1 : 0);
  await context.addCookies([{ name: "bj_in", value: "1", url: new URL(page.url()).origin }]);
  await page.reload({ waitUntil: "load" });
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-admin-lock]")).toHaveAttribute("href", "/admin");
});
