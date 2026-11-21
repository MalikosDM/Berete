// The 15 universes of 21/11/2026 (Yoni), like the one of Dragon Ball (Genkidama): an AI background (the phone image on a
// phone, the computer one elsewhere), effects that carry it on (particles, smoke, lights of the image: effect "scene"),
// an effect on the piece itself that ties it to its world (src/components/universe/JewelFx.tsx). One piece of each
// universe, on a computer and an iPhone: its world on arrival (a screenshot), the piece and the texts readable (contrast
// AA), its story in its world, everything still when the visitor asks for less motion. Screenshots: verification/universes15/.
import { mkdirSync } from "node:fs";
import { expect, test, type Locator, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { BACKDROPS, resolveTheme } from "../src/data/themes";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/universes15";
mkdirSync(DIR, { recursive: true });
const PUBLISHED = defaultCatalogue.pieces.filter((p) => p.published);

/**
 * Each universe, the pieces it holds (from the feedback of Yoni), and the one opened here. Flâneur and the two iced Cuban
 * chains of "facettes" were taken off the site on 21/11/2026 (too few photos): their universes wait for them.
 */
const UNIVERSES: { backdrop: string; preset: string; pieces: string[] }[] = [
  // The panther: since 21/11/2026 the night of his celebration (a sequence of three images, tests/making.spec.ts).
  { backdrop: "keita", preset: "keita", pieces: ["panther-champion-pendant"] },
  { backdrop: "bianconero", preset: "bianconero", pieces: ["kenan-yildiz-celebration-pendant"] },
  { backdrop: "serpent", preset: "serpent", pieces: ["marcus-thuram-t-serpent-pendant"] },
  { backdrop: "sirius", preset: "sirius", pieces: ["sirius"] },
  { backdrop: "tulipes", preset: "tulipes", pieces: ["tulips-on-tour-medallion"] },
  { backdrop: "trefle", preset: "emeraude", pieces: ["eljero-elia-clover-medallion"] },
  // The Hand: since 21/11/2026 the endless space (tests/infini.spec.ts).
  { backdrop: "infini", preset: "infini", pieces: ["the-hand"] },
  { backdrop: "forge", preset: "forge", pieces: ["kevin-schade-twisted-chain"] },
  {
    backdrop: "sacre",
    preset: "sacre",
    pieces: ["deniz-undav-l-pendant", "samuel-ballet-jesus-piece", "malik-tillman-cross-pendant", "lois-openda-script-pendant", "baguette-cross-pendant", "crown-of-thorns-jesus-piece", "cross-infinity-chain"],
  },
  { backdrop: "roses", preset: "roses", pieces: ["thorns-and-roses-crucifix", "marcus-thuram-thorned-t-pendant", "tanguy-nianzou-fam-medallion", "the-safi-link", "brt-flower-chain"] },
  { backdrop: "velours", preset: "velours", pieces: ["marcus-thuram-ruby-t-necklace", "jesus-piece-red-flowers", "rose-iced-cuban-chain"] },
  {
    backdrop: "facettes",
    preset: "facettes",
    pieces: ["ampersand-initials-pendant", "malik-tillman-tm-pendant", "baguette-cuban-chain", "oval-eternity-band"],
  },
  { backdrop: "mecanique", preset: "mecanique", pieces: ["marcus-thuram-skeleton-watch", "tajon-buchanan-iced-watch", "radja-nainggolan-iced-watch"] },
  { backdrop: "n14", preset: "n14", pieces: ["celestial-initial-medallion"] },
];

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

test("each universe: its pieces, its image in two versions, its effects and the effect on the piece", () => {
  for (const u of UNIVERSES) {
    const b = BACKDROPS[u.backdrop];
    expect(b, u.backdrop).toBeTruthy();
    expect(b!.portrait, u.backdrop + ": its own image for phones").toBe(true);
    for (const slug of u.pieces) {
      const piece = PUBLISHED.find((p) => p.slug === slug);
      expect(piece, slug).toBeTruthy();
      const theme = resolveTheme(piece!.theme);
      expect(theme.preset, slug).toBe(u.preset);
      expect(theme.backdrop, slug).toBe(u.backdrop);
      expect(theme.effects.some((e) => e.startsWith("jewel-")), slug + ": an effect on the piece").toBe(true);
    }
  }
});

for (const u of UNIVERSES) {
  const slug = u.pieces[0]!;
  test(u.backdrop + " (" + slug + "): its world on arrival, the piece and the texts readable", async ({ page }, info) => {
    const problems = watch(page);
    const phone = info.project.name !== "desktop";
    await skipIntro(page);
    await page.goto("/fr/pieces/" + slug, { waitUntil: "load" });
    const world = page.locator("article[data-piece] > .universe[data-backdrop='" + u.backdrop + "']");
    await expect(world).toHaveCount(1);
    const img = world.locator(".u-backdrop img").first();
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0), { timeout: 20_000 }).toBe(true);
    const src = await img.evaluate((el) => (el as HTMLImageElement).currentSrc);
    expect(src).toContain("/media/universes/" + (BACKDROPS[u.backdrop]!.sequence?.[0] ?? u.backdrop) + (phone ? "-m-" : "-"));
    if (!phone) expect(src).not.toContain("-m-");
    // On arrival: its entrance playing.
    await page.waitForTimeout(1200);
    await page.screenshot({ path: DIR + "/" + info.project.name + "-" + u.backdrop + "-1-arrivee.jpg", type: "jpeg", quality: 66 });
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    // Its effects: the canvas, the lights of the image, the effect on the piece.
    const effects = ((await world.getAttribute("data-effects")) ?? "").split(" ");
    if (effects.some((e) => !["scene", "smoke", "smoke-rise", "rain"].includes(e) && !e.startsWith("jewel-"))) await expect(world.locator("canvas.u-fx")).toHaveAttribute("data-running", "");
    if (effects.includes("scene")) expect(await world.locator(".u-spot:visible").count(), "lights of the image").toBeGreaterThan(0);
    const jewel = effects.find((e) => e.startsWith("jewel-"))!;
    await expect(page.locator("[data-piece-cover] .u-jewel[data-jewel='" + jewel + "']:visible").first()).toBeAttached();
    await page.waitForTimeout(1500);
    // The texts readable: the title on its ground, and the words of the menu of a computer.
    const title = page.locator("h1#piece-title");
    await expect(title).toBeVisible();
    expect(await groundContrast(page, title), "the title on its ground").toBeGreaterThanOrEqual(4.5);
    if (!phone) {
      for (const link of await page.locator("header nav a").all()) {
        if (await link.isVisible()) expect(await groundContrast(page, link), "a word of the menu on its ground").toBeGreaterThanOrEqual(4.5);
      }
    }
    await page.screenshot({ path: DIR + "/" + info.project.name + "-" + u.backdrop + "-2-piece.jpg", type: "jpeg", quality: 66 });
    expect(problems.errors).toEqual([]);
  });
}

test("asked for less motion: the worlds stay still (no canvas, no animation), the piece and its texts there", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await skipIntro(page);
  for (const slug of ["kevin-schade-twisted-chain", "celestial-initial-medallion", "kenan-yildiz-celebration-pendant"]) {
    await page.goto("/pieces/" + slug, { waitUntil: "load" });
    await expect(page.locator("h1#piece-title")).toBeVisible();
    await expect(page.locator(".universe canvas.u-fx")).toHaveCount(1);
    await expect(page.locator(".universe canvas.u-fx").first()).toBeHidden();
    const moving = await page.evaluate(() => [...document.querySelectorAll(".u-spot, .u-spot > i, .u-jewel, .u-jewel > i")].filter((e) => getComputedStyle(e).animationName !== "none").length);
    expect(moving, slug).toBe(0);
  }
});

/** A piece of each universe that has a story: its story in its world. */
const STORIES: [string, string][] = [
  ["kenan-yildiz", "bianconero"],
  ["thuram", "serpent"],
  ["deniz-undav", "sacre"],
  ["thuram-ii", "velours"],
];
for (const [story, backdrop] of STORIES) {
  test("the story " + story + " in the world of its piece (" + backdrop + ")", async ({ page }, info) => {
    const problems = watch(page);
    await skipIntro(page);
    await page.goto("/fr", { waitUntil: "load" });
    // Clicked again until the page is ready (online, the bar may be drawn before it answers).
    const dialog = page.locator('[role="dialog"][data-story="' + story + '"]');
    await expect(async () => {
      if (!(await dialog.isVisible())) await page.locator('[data-story-bubble="' + story + '"]').click();
      await expect(dialog).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await expect(page.locator(".universe[data-fixed][data-backdrop='" + backdrop + "']")).toHaveCount(1, { timeout: 15_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: DIR + "/" + info.project.name + "-story-" + story + ".jpg", type: "jpeg", quality: 62 });
    await page.keyboard.press("Escape");
    expect(problems.errors).toEqual([]);
  });
}
