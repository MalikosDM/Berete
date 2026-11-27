// The two worlds of Noah Okafor drawn in code (27/11/2026, src/components/universe/CodeScene.tsx): "The Trophy Room" for his
// jersey pendant (a black marble plinth under the jewel, one warm light from above, stadium rays, the lines of a night pitch)
// and "The Octagon Gallery" for his octagon pendant (octagonal arches of black stone, cold light on the left, rose on the
// right, a mirror floor). No image at all; each world locked on the jewel at every size; the title and the menu readable;
// still with "reduce motion"; resting off screen. Computer (Chromium) and iPhone (WebKit). Screenshots:
// verification/universes2711/.
//
// The live catalogue of the local server (/api/catalogue) is left out: until that server restarts, its base still holds the
// former worlds of these two pieces (server/catalogue.ts gives them the catalogue's at its start); the pages then show the
// catalogue built into the site, as a visitor gets it first.
import { mkdirSync } from "node:fs";
import { devices, expect, silence, test, type BrowserContext, type Locator, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { THEME_PRESETS, cleanTheme, resolveTheme } from "../src/data/themes";
import { skipIntro } from "./helpers";

const DIR = "verification/universes2711";
mkdirSync(DIR, { recursive: true });

const WORLDS = [
  { slug: "noah-okafor-jersey-pendant", preset: "trophy-room", plinth: true },
  { slug: "noah-okafor-octagon-pendant", preset: "octagon-gallery", plinth: false },
] as const;

async function enter(ctx: BrowserContext, baseURL: string | undefined) {
  await silence(ctx);
  if (process.env.ACCESS_PASSWORD && baseURL) await ctx.request.post(new URL("/api/access", baseURL).href, { form: { password: process.env.ACCESS_PASSWORD, next: "/" }, maxRedirects: 0 });
}

/** Opens a piece as a visitor (the intro of the house seen), its entrance over; the requests for AI backgrounds counted. */
async function open(page: Page, slug: string, prefix = "") {
  const universes: string[] = [];
  page.on("request", (r) => (r.url().includes("/media/universes/") ? universes.push(r.url()) : undefined));
  await page.route("**/api/catalogue", (r) => r.abort());
  await skipIntro(page);
  await page.goto(prefix + "/pieces/" + slug, { waitUntil: "load" });
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
  return universes;
}

/** Where the jewel is drawn (its image inside the frame of the main view), the heart of its world, the top of its plinth. */
async function framing(page: Page) {
  // The jewel's own image loaded (the world is placed again then).
  await expect
    .poll(() =>
      page.evaluate(() => {
        const img = [...document.querySelectorAll<HTMLImageElement>('[data-piece-cover] [data-place="0"] img, [data-piece-cover] [data-showcase-slide="0"] img')].find((e) => e.getBoundingClientRect().width > 0);
        return Boolean(img?.complete && img.naturalWidth > 0);
      }),
      { timeout: 20_000 },
    )
    .toBe(true);
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const cover = document.querySelector<HTMLElement>("[data-piece-cover]")!;
    const frame = [...cover.querySelectorAll<HTMLElement>('[data-place="0"] .sv-float, [data-showcase-slide="0"] .sv-float')].map((e) => e.getBoundingClientRect()).find((r) => r.width > 0)!;
    const img = [...cover.querySelectorAll<HTMLImageElement>('[data-place="0"] img, [data-showcase-slide="0"] img')].find((e) => e.getBoundingClientRect().width > 0)!;
    const k = Math.min(frame.width / img.naturalWidth, frame.height / img.naturalHeight);
    const w = img.naturalWidth * k;
    const h = img.naturalHeight * k;
    const jewel = { left: frame.left + (frame.width - w) / 2, top: frame.top + (frame.height - h) / 2, width: w, height: h };
    const f = document.querySelector("[data-scene-focus]")!.getBoundingClientRect();
    const p = document.querySelector("[data-scene-plinth]")?.getBoundingClientRect() ?? null;
    return { jewel, focus: { x: f.left + f.width / 2, y: f.top + f.height / 2 }, plinth: p ? { x: p.left + p.width / 2, top: p.top, width: p.width } : null };
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

test("the two worlds: presets of the house, on their pieces, the former ones kept", () => {
  for (const w of WORLDS) {
    expect(THEME_PRESETS[w.preset], w.preset).toBeTruthy();
    const piece = defaultCatalogue.pieces.find((p) => p.slug === w.slug)!;
    expect(piece.theme?.preset, w.slug).toBe(w.preset);
    const theme = resolveTheme(piece.theme);
    // Drawn in code: its backdrop is the world itself, never an image; it survives the base (cleanTheme).
    expect(theme.backdrop).toBe(w.preset);
    expect(theme.font).toBe("stade");
    expect(cleanTheme({ preset: w.preset, backdrop: w.preset })?.backdrop).toBe(w.preset);
  }
  expect(THEME_PRESETS["okafor-jersey"]).toBeTruthy();
  expect(THEME_PRESETS.tunnel).toBeTruthy();
});

for (const w of WORLDS) {
  test(w.preset + " (" + w.slug + "): drawn in code, locked on the jewel, readable", async ({ page }, info) => {
    const phone = info.project.name !== "desktop";
    const universes = await open(page, w.slug);
    const world = page.locator("article[data-piece] > .universe[data-backdrop='" + w.preset + "']");
    await expect(world).toHaveCount(1);
    await expect(world.locator(".u-scene[data-scene='" + w.preset + "']")).toHaveCount(1);
    await expect(world).toHaveAttribute("data-scene-placed", "");
    // No image: no AI background asked, none in the page.
    await expect(world.locator(".u-backdrop")).toHaveCount(0);
    expect(universes, "no AI background").toEqual([]);
    expect(await world.locator(".u-scene svg").count()).toBeGreaterThan(0);
    if (w.plinth) await expect(page.locator("[data-scene-plinth]")).toHaveCount(1);
    else await expect(page.locator("[data-scene-plinth]")).toHaveCount(0);

    // The heart of the world under the jewel: on its axis, inside its height; the plinth right under it.
    const m = await framing(page);
    const jx = m.jewel.left + m.jewel.width / 2;
    expect(Math.abs(m.focus.x - jx), "the heart on the axis of the jewel").toBeLessThan(m.jewel.width * 0.06 + 14);
    expect(m.focus.y).toBeGreaterThan(m.jewel.top + m.jewel.height * 0.2);
    expect(m.focus.y).toBeLessThan(m.jewel.top + m.jewel.height * 0.85);
    if (m.plinth) {
      expect(Math.abs(m.plinth.x - jx), "the plinth on the axis of the jewel").toBeLessThan(m.jewel.width * 0.04 + 14);
      expect(m.plinth.top, "the plinth under the foot of the jewel").toBeGreaterThan(m.jewel.top + m.jewel.height * 0.7);
      expect(m.plinth.top).toBeLessThan(m.jewel.top + m.jewel.height * 1.02);
      expect(m.plinth.width).toBeGreaterThan(m.jewel.width * 0.5);
    }
    await page.screenshot({ path: DIR + "/" + info.project.name + "-" + w.preset + ".jpg", type: "jpeg", quality: 72 });

    // The title on its ground, and the words of the menu of a computer.
    const title = page.locator("h1#piece-title");
    expect(await groundContrast(page, title), "the title on its ground").toBeGreaterThanOrEqual(4.5);
    if (!phone) {
      for (const link of await page.locator("header nav a").all()) {
        if (await link.isVisible()) expect(await groundContrast(page, link), "a word of the menu").toBeGreaterThanOrEqual(4.5);
      }
    }

    // Deep in the page the world rests (its slow motions paused).
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.6));
    await expect(world).toHaveAttribute("data-scene-idle", "");
    expect(await world.locator(".s-plane").first().evaluate((e) => getComputedStyle(e).animationPlayState)).toBe("paused");
  });
}

test("the depth: the planes answer the mouse, the far ones the other way, the plinth with the jewel", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "a mouse: computers only");
  await open(page, "noah-okafor-jersey-pendant");
  await expect(page.locator("article[data-piece]")).toHaveAttribute("data-depth", "scene");
  const read = () =>
    page.evaluate(() => {
      const far = document.querySelector<HTMLElement>('.s-plane[data-plane="far"]')!.style.translate;
      const near = document.querySelector<HTMLElement>(".s-near")!.style.translate;
      const cover = new DOMMatrix(getComputedStyle(document.querySelector("[data-piece-cover]")!).transform);
      return { far: parseFloat(far) || 0, near: parseFloat(near) || 0, cover: cover.m41 };
    });
  // The pointer from the middle to the top left (again if the page was drawn anew meanwhile).
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
  // The pointer at the top left: the jewel and its plinth move to the left together, the room a little to the right.
  expect(moved.cover).toBeLessThan(-4);
  expect(Math.abs(moved.near - moved.cover)).toBeLessThan(0.5);
  expect(moved.far).toBeGreaterThan(0);
});

test("a world falls the same on every screen: the jewel on the heart of its world", async ({ browser, baseURL }, info) => {
  test.skip(info.project.name !== "desktop", "three computer screens");
  for (const w of WORLDS) {
    const at: number[][] = [];
    for (const [width, height] of [[1280, 800], [1440, 900], [1920, 1080]] as const) {
      const ctx = await browser.newContext({ viewport: { width, height }, baseURL });
      await enter(ctx, baseURL);
      const page = await ctx.newPage();
      await open(page, w.slug);
      const m = await framing(page);
      // The heart (and the plinth) as a share of the jewel: the same point of the jewel at every size.
      at.push([(m.focus.x - m.jewel.left) / m.jewel.width, (m.focus.y - m.jewel.top) / m.jewel.height, m.plinth ? (m.plinth.top - m.jewel.top) / m.jewel.height : 0]);
      await page.screenshot({ path: DIR + "/" + width + "x" + height + "-" + w.preset + ".jpg", type: "jpeg", quality: 72 });
      await ctx.close();
    }
    for (const p of at.slice(1)) {
      expect(Math.abs(p[0]! - at[0]![0]!), w.preset + " across").toBeLessThan(0.03);
      expect(Math.abs(p[1]! - at[0]![1]!), w.preset + " down").toBeLessThan(0.03);
      expect(Math.abs(p[2]! - at[0]![2]!), w.preset + " plinth").toBeLessThan(0.03);
    }
  }
});

test("asked for less motion: nothing moves, no depth", async ({ browser, baseURL }, info) => {
  const phone = info.project.name !== "desktop";
  for (const w of WORLDS) {
    const ctx = await browser.newContext({ reducedMotion: "reduce", baseURL, ...(phone ? { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } : { viewport: { width: 1440, height: 900 } }) });
    await enter(ctx, baseURL);
    const page = await ctx.newPage();
    await open(page, w.slug);
    await page.mouse.move(200, 200);
    await page.waitForTimeout(800);
    expect(await page.locator("article[data-piece]").getAttribute("data-depth")).toBeNull();
    const anims = await page.evaluate(() => [...document.querySelectorAll(".u-scene .s-plane, .u-scene .s-ray, .u-scene .s-haze, .u-scene-near .s-cone")].map((e) => getComputedStyle(e).animationName));
    expect(anims.every((a) => a === "none"), "no animation").toBe(true);
    // Two looks at the opening a moment apart (its images and fonts there): the same picture.
    await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>("[data-piece-opening] img")].filter((i) => {
      const r = i.getBoundingClientRect();
      return r.width > 0 && r.right > 0 && r.left < window.innerWidth;
    }).every((i) => i.complete) && document.fonts.status === "loaded");
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
    expect(diff / ra.length, w.preset + ": still").toBeLessThan(0.6);
    await ctx.close();
  }
});
