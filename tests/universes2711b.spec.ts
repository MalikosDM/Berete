// "The Signature — An Architectural Study in Diamonds" (27/11/2026, src/components/universe/AsSignature.tsx): the world of
// Angelo Stiller's AS pendant, drawn in code like the two worlds of Noah Okafor (tests/universes2711.spec.ts): the crossed
// pattern of its baguettes as a wall of hairlines lit from above, its pointed silhouette as nested outlines, the lines of a
// study. No image at all; locked on the jewel at every size (its unit is the visible height of the jewel, --s-j); the title
// and the menu readable; resting off screen; still with "reduce motion". Computer (Chromium) and iPhone (WebKit).
// Screenshots: verification/universes2711b/.
//
// The live catalogue of the local server (/api/catalogue) is left out, as in tests/universes2711.spec.ts (until that server
// restarts, its base may still hold the former world of the piece).
import { mkdirSync } from "node:fs";
import { devices, expect, silence, test, type BrowserContext, type Locator, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { CODE_SCENES, THEME_PRESETS, cleanTheme, resolveTheme } from "../src/data/themes";
import { skipIntro } from "./helpers";

const DIR = "verification/universes2711b";
mkdirSync(DIR, { recursive: true });

const SLUG = "angelo-stiller-as-pendant";
const PRESET = "as-signature";

async function enter(ctx: BrowserContext, baseURL: string | undefined) {
  await silence(ctx);
  if (process.env.ACCESS_PASSWORD && baseURL) await ctx.request.post(new URL("/api/access", baseURL).href, { form: { password: process.env.ACCESS_PASSWORD, next: "/" }, maxRedirects: 0 });
}

/** Opens the piece as a visitor (the intro of the house seen), its entrance over; the requests for AI backgrounds counted. */
async function open(page: Page) {
  const universes: string[] = [];
  page.on("request", (r) => (r.url().includes("/media/universes/") ? universes.push(r.url()) : undefined));
  await page.route("**/api/catalogue", (r) => r.abort());
  await skipIntro(page);
  await page.goto("/pieces/" + SLUG, { waitUntil: "load" });
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
  return universes;
}

/** The visible part of the jewel (its opaque pixels, inside the frame of its main view), the heart of the study, the nearest outline. */
async function framing(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const img = [...document.querySelectorAll<HTMLImageElement>('[data-piece-cover] [data-place="0"] img, [data-piece-cover] [data-showcase-slide="0"] img')].find((e) => e.getBoundingClientRect().width > 0);
        return Boolean(img?.complete && img.naturalWidth > 0);
      }),
      { timeout: 20_000 },
    )
    .toBe(true);
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const cover = document.querySelector<HTMLElement>("[data-piece-cover]")!;
    const frame = [...cover.querySelectorAll<HTMLElement>('[data-place="0"] .sv-float, [data-showcase-slide="0"] .sv-float')].map((e) => e.getBoundingClientRect()).find((r) => r.width > 0)!;
    const img = [...cover.querySelectorAll<HTMLImageElement>('[data-place="0"] img, [data-showcase-slide="0"] img')].find((e) => e.getBoundingClientRect().width > 0)!;
    const k = Math.min(frame.width / img.naturalWidth, frame.height / img.naturalHeight);
    const w = img.naturalWidth * k;
    const h = img.naturalHeight * k;
    const left = frame.left + (frame.width - w) / 2;
    const top = frame.top + (frame.height - h) / 2;
    // Its opaque pixels (the cut-out), as the page measures them.
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = Math.round((96 * img.naturalHeight) / img.naturalWidth);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let x0 = canvas.width;
    let y0 = canvas.height;
    let x1 = 0;
    let y1 = 0;
    for (let y = 0; y < canvas.height; y++)
      for (let x = 0; x < canvas.width; x++)
        if (data[(y * canvas.width + x) * 4 + 3]! >= 40) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x + 1);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y + 1);
        }
    const jewel = { left: left + (w * x0) / canvas.width, top: top + (h * y0) / canvas.height, width: (w * (x1 - x0)) / canvas.width, height: (h * (y1 - y0)) / canvas.height };
    const f = document.querySelector("[data-scene-focus]")!.getBoundingClientRect();
    const o = document.querySelector('.u-scene [data-frame="60"]')!.getBoundingClientRect();
    return { jewel, focus: { x: f.left + f.width / 2, y: f.top + f.height / 2 }, outline: { left: o.left, top: o.top, width: o.width, height: o.height } };
  });
}

/** The contrast of two colours (WCAG). */
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

/** A light text (#F4F2EF) on what lies behind it: the screenshot of its box without the text, its light taken high. */
async function groundContrast(page: Page, el: Locator): Promise<number> {
  const box = (await el.boundingBox())!;
  const vw = page.viewportSize()!.width;
  const clip = { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.min(box.width, vw - Math.max(0, box.x)), height: box.height };
  await el.evaluate((e) => ((e as HTMLElement).style.visibility = "hidden"));
  const ground = await page.screenshot({ clip, type: "png" });
  await el.evaluate((e) => ((e as HTMLElement).style.visibility = ""));
  const { default: sharp } = await import("sharp");
  const stats = await sharp(ground).stats();
  return contrast([244, 242, 239], stats.channels.slice(0, 3).map((c) => Math.min(255, c.mean + c.stdev)));
}

/** The nearest outline around the jewel, and the heart of the study on it, as shares of the visible jewel. */
function shares(m: Awaited<ReturnType<typeof framing>>) {
  const { jewel: j, outline: o, focus: f } = m;
  return [(f.x - j.left) / j.width, (f.y - j.top) / j.height, (o.left - j.left) / j.height, (o.top - j.top) / j.height, o.width / j.height, o.height / j.height];
}

test("the signature: a preset of the house, drawn in code, on the AS pendant; the former world kept", () => {
  expect(THEME_PRESETS[PRESET]).toBeTruthy();
  expect(CODE_SCENES[PRESET]).toBeTruthy();
  const piece = defaultCatalogue.pieces.find((p) => p.slug === SLUG)!;
  expect(piece.theme?.preset).toBe(PRESET);
  const theme = resolveTheme(piece.theme);
  expect(theme.backdrop).toBe(PRESET);
  expect(theme.font).toBe("etoile");
  // No stadium, no celebration: none of the effects of the football worlds.
  for (const e of ["confetti", "gold-confetti", "flashes", "smoke-rise", "gold-light"] as const) expect(theme.effects).not.toContain(e);
  expect(cleanTheme({ preset: PRESET, backdrop: PRESET })?.backdrop).toBe(PRESET);
  expect(THEME_PRESETS.stuttgart).toBeTruthy();
});

test("the signature: drawn in code, locked on the jewel, readable, resting off screen", async ({ page }, info) => {
  const phone = info.project.name !== "desktop";
  const universes = await open(page);
  const world = page.locator("article[data-piece] > .universe[data-backdrop='" + PRESET + "']");
  await expect(world).toHaveCount(1);
  await expect(world.locator(".u-scene[data-scene='" + PRESET + "']")).toHaveCount(1);
  await expect(world).toHaveAttribute("data-scene-placed", "");
  // No image: no AI background asked, none in the page, no plinth (the piece floats in its study).
  await expect(world.locator(".u-backdrop")).toHaveCount(0);
  expect(universes, "no AI background").toEqual([]);
  await expect(page.locator("[data-scene-plinth]")).toHaveCount(0);
  await expect(world.locator(".s-plane")).toHaveCount(3);
  await expect(world.locator(".u-scene [data-frame]")).toHaveCount(5);
  // The baguettes that catch the light: ten on a computer, four on a phone (the others not drawn).
  const glints = await world.locator(".s-glint").evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== "none").length);
  expect(glints).toBe(phone ? 4 : 10);

  // The heart of the study on the heart of the jewel; the nearest outline around the whole jewel, its point below the jewel's.
  const m = await framing(page);
  const jx = m.jewel.left + m.jewel.width / 2;
  expect(Math.abs(m.focus.x - jx), "the heart on the axis of the jewel").toBeLessThan(m.jewel.width * 0.06 + 6);
  expect(m.focus.y).toBeGreaterThan(m.jewel.top + m.jewel.height * 0.4);
  expect(m.focus.y).toBeLessThan(m.jewel.top + m.jewel.height * 0.65);
  const o = m.outline;
  expect(o.left, "the outline around the jewel (left)").toBeLessThan(m.jewel.left - 4);
  expect(o.left + o.width, "the outline around the jewel (right)").toBeGreaterThan(m.jewel.left + m.jewel.width + 4);
  expect(o.top, "the outline above the bail").toBeLessThan(m.jewel.top);
  expect(o.top + o.height, "its point under the point of the jewel").toBeGreaterThan(m.jewel.top + m.jewel.height);
  expect(Math.abs(o.left + o.width / 2 - jx), "the outline centred on the jewel").toBeLessThan(m.jewel.width * 0.06 + 6);
  await page.screenshot({ path: DIR + "/" + info.project.name + "-" + PRESET + ".jpg", type: "jpeg", quality: 78 });

  // The title on its ground, and the words of the menu of a computer.
  expect(await groundContrast(page, page.locator("h1#piece-title")), "the title on its ground").toBeGreaterThanOrEqual(4.5);
  if (!phone) {
    for (const link of await page.locator("header nav a").all()) {
      if (await link.isVisible()) expect(await groundContrast(page, link), "a word of the menu").toBeGreaterThanOrEqual(4.5);
    }
  }

  // Deep in the page the study rests (its slow motions paused: the drift, the breathing light, the glints).
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.6));
  await expect(world).toHaveAttribute("data-scene-idle", "");
  const states = await world.locator(".s-plane, .s-lit, .s-glint").evaluateAll((els) => els.map((e) => getComputedStyle(e).animationPlayState));
  expect(states.every((s) => s === "paused"), "everything paused").toBe(true);
});

test("the signature falls the same on every screen: the jewel on the heart of its study, inside its outline", async ({ browser, baseURL }, info) => {
  test.skip(info.project.name !== "desktop", "four computer screens");
  const at: number[][] = [];
  for (const [width, height] of [[1280, 800], [1440, 900], [1920, 1080], [2560, 1440]] as const) {
    const ctx = await browser.newContext({ viewport: { width, height }, baseURL });
    await enter(ctx, baseURL);
    const page = await ctx.newPage();
    await open(page);
    at.push(shares(await framing(page)));
    await page.screenshot({ path: DIR + "/" + width + "x" + height + "-" + PRESET + ".jpg", type: "jpeg", quality: 78 });
    await ctx.close();
  }
  for (const p of at.slice(1)) for (let i = 0; i < p.length; i++) expect(Math.abs(p[i]! - at[0]![i]!), "share " + i + " at every size").toBeLessThan(0.03);
});

test("the depth: the planes of the study answer the mouse, the far ones the other way", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "a mouse: computers only");
  await open(page);
  await expect(page.locator("article[data-piece]")).toHaveAttribute("data-depth", "scene");
  const read = () =>
    page.evaluate(() => {
      const far = document.querySelector<HTMLElement>('.s-plane[data-plane="far"]')!.style.translate;
      const near = document.querySelector<HTMLElement>('.s-plane[data-plane="near"]')!.style.translate;
      const cover = new DOMMatrix(getComputedStyle(document.querySelector("[data-piece-cover]")!).transform);
      return { far: parseFloat(far) || 0, near: parseFloat(near) || 0, cover: cover.m41 };
    });
  await expect
    .poll(
      async () => {
        await page.mouse.move(720, 450);
        await page.mouse.move(60, 120, { steps: 6 });
        await page.waitForTimeout(1500);
        return (await read()).cover;
      },
      { timeout: 30_000 },
    )
    .toBeLessThan(-4);
  const moved = await read();
  // The pointer at the top left: the jewel to the left, the study to the right, its nearest plane the most.
  expect(moved.far).toBeGreaterThan(0);
  expect(moved.near).toBeGreaterThan(moved.far);
});

test("the signature, asked for less motion: nothing moves, no depth", async ({ browser, baseURL }, info) => {
  const phone = info.project.name !== "desktop";
  const ctx = await browser.newContext({ reducedMotion: "reduce", baseURL, ...(phone ? { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } : { viewport: { width: 1440, height: 900 } }) });
  await enter(ctx, baseURL);
  const page = await ctx.newPage();
  await open(page);
  await page.mouse.move(200, 200);
  await page.waitForTimeout(800);
  expect(await page.locator("article[data-piece]").getAttribute("data-depth")).toBeNull();
  const anims = await page.evaluate(() => [...document.querySelectorAll(".u-scene .s-plane, .u-scene .s-lit, .u-scene .s-glint")].map((e) => getComputedStyle(e).animationName));
  expect(anims.length).toBeGreaterThan(0);
  expect(anims.every((a) => a === "none"), "no animation").toBe(true);
  // Two looks at the opening a moment apart (its images and fonts there): the same picture.
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll<HTMLImageElement>("[data-piece-opening] img")]
        .filter((i) => {
          const r = i.getBoundingClientRect();
          return r.width > 0 && r.right > 0 && r.left < window.innerWidth;
        })
        .every((i) => i.complete) && document.fonts.status === "loaded",
  );
  await page.waitForTimeout(500);
  const clip = { x: 0, y: 0, width: phone ? 390 : 1440, height: phone ? 520 : 900 };
  const a = await page.screenshot({ clip, type: "png" });
  await page.mouse.move(phone ? 300 : 1300, 700);
  await page.waitForTimeout(1600);
  const b = await page.screenshot({ clip, type: "png" });
  const { default: sharp } = await import("sharp");
  const [ra, rb] = await Promise.all([sharp(a).raw().toBuffer(), sharp(b).raw().toBuffer()]);
  let diff = 0;
  for (let i = 0; i < ra.length; i++) diff += Math.abs(ra[i]! - rb[i]!);
  expect(diff / ra.length, "still").toBeLessThan(0.6);
  await ctx.close();
});
