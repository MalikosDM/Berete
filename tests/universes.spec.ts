// The feedback of Yoni on 21/11/2026, beside WhatsApp (tests/whatsapp.spec.ts):
// - the new worlds of VfB Stuttgart (a stadium at night, red flares, golden confetti) and of the Butterfly (a violet forest
//   under the moon): the image for phones on a phone, the one for computers elsewhere, a light animation that carries the
//   image on (rising smoke and falling golden confetti; butterflies of light, sparkles, the moon shining barely), the
//   piece and the texts readable; the same world around their story;
// - "Loïs Openda — Script Pendant" and "Bouzou — Pendant" are one piece, at the address of Loïs Openda;
// - the making-of of "Enter the Atelier" in HD on a sharp computer screen (a Retina Mac).
// Screenshots go to verification/universes/.
import { mkdirSync } from "node:fs";
import { devices, expect, silence, test, type Locator, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { RENAMED_PIECES } from "../src/data/pieces";
import media from "../src/data/media.generated.json" with { type: "json" };
import { skipIntro, watch } from "./helpers";

const DIR = "verification/universes";
mkdirSync(DIR, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 68, timeout: 45_000 });
const ready = (page: Page) => expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
const PUBLISHED = defaultCatalogue.pieces.filter((p) => p.published);

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

/**
 * The contrast of a light text (#F4F2EF) on what lies behind it: the screenshot of its box without the text, its light
 * taken high (the mean plus the spread of each colour).
 */
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

const WORLDS: [string, string, string[], string][] = [
  ["vfb-stuttgart-dfb-pokal-2025", "vfb", ["smoke-rise", "gold-confetti"], "VfB"],
  ["michy-batshuayi-butterfly-pendant", "butterfly", ["butterflies", "glints", "moon"], "Butterfly"],
];

for (const [slug, backdrop, effects] of WORLDS) {
  test(slug + ": its new world, the image of the screen, its animation, the texts readable", async ({ page }, info) => {
    const problems = watch(page);
    const phone = info.project.name !== "desktop";
    await skipIntro(page);
    await page.goto("/fr/pieces/" + slug, { waitUntil: "load" });
    await ready(page);
    const world = page.locator(".universe[data-backdrop='" + backdrop + "']").first();
    await expect(world).toHaveCount(1);
    for (const e of effects) await expect(world).toHaveAttribute("data-effects", new RegExp("(^| )" + e + "( |$)"));
    // The image of phones on a phone (portrait), the one of computers elsewhere: the new files.
    const img = world.locator(".u-backdrop img");
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0), { timeout: 20_000 }).toBe(true);
    const src = await img.evaluate((el) => (el as HTMLImageElement).currentSrc);
    expect(src).toContain("/media/universes/" + backdrop + (phone ? "-m-" : "-"));
    if (!phone) expect(src).not.toContain("-m-");
    const size = await img.evaluate((el) => [(el as HTMLImageElement).naturalWidth, (el as HTMLImageElement).naturalHeight]);
    expect(size[0]! > size[1]!, "landscape on a computer, portrait on a phone").toBe(!phone);
    // The animation: the smoke rises, the moon shines (CSS), the confetti and the butterflies fly (the canvas).
    if (effects.includes("smoke-rise")) await expect(world.locator(".u-smoke[data-rise] > span").first()).toHaveCSS("animation-name", "u-smoke-rise");
    if (effects.includes("moon")) {
      const glow = world.locator(".u-genki[data-spot='moon'] .u-genki-glow");
      await expect(glow).toHaveCSS("animation-name", "u-moon");
    }
    await expect(world.locator("canvas.u-fx")).toHaveCount(1);
    await page.waitForTimeout(2500);
    // The texts readable: the title and its line light on the darkened ground (AA), the piece itself in view.
    const title = page.locator("h1#piece-title");
    await expect(title).toBeVisible();
    expect(await groundContrast(page, title), "the title on its ground").toBeGreaterThanOrEqual(4.5);
    // The menu of a computer, over the light of the image (the moon of the forest, the lights of the stadium).
    if (!phone) {
      for (const link of await page.locator("header nav a").all()) {
        if (await link.isVisible()) expect(await groundContrast(page, link), "a word of the menu on its ground").toBeGreaterThanOrEqual(4.5);
      }
    }
    await expect(page.locator("[data-piece-cover] img:visible").first()).toBeVisible();
    await shot(page, info.project.name + "-" + backdrop + "-opening");
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.6));
    await page.waitForTimeout(1200);
    await shot(page, info.project.name + "-" + backdrop + "-scroll");
    expect(problems.errors).toEqual([]);
  });
}

test("the Butterfly: its world around its story", async ({ page }, info) => {
  const problems = watch(page);
  await skipIntro(page);
  // (Opened from the piece: no bubbles of stories since 23/11/2026.)
  await page.goto("/fr/pieces/michy-batshuayi-butterfly-pendant", { waitUntil: "load" });
  await page.locator("[data-seen-in-stories]").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.locator("[data-seen-in-stories]").click();
  await expect(page.locator('[role="dialog"][data-story]')).toBeVisible();
  const world = page.locator(".universe[data-fixed][data-backdrop='butterfly']");
  await expect(world).toHaveCount(1, { timeout: 15_000 });
  await page.waitForTimeout(1500);
  await shot(page, info.project.name + "-butterfly-story");
  await page.keyboard.press("Escape");
  expect(problems.errors).toEqual([]);
});

/* ---------- Loïs Openda and "Bouzou": one piece ---------- */

const OPENDA = "lois-openda-script-pendant";
const BOUZOU = "script-nameplate-pendant";

test("Loïs Openda — Script Pendant: one piece with everything of Bouzou, no duplicate, the old address leads to it", async ({ page, request }, info) => {
  const problems = watch(page);
  const piece = PUBLISHED.find((p) => p.slug === OPENDA)!;
  expect(PUBLISHED.find((p) => p.slug === BOUZOU)).toBeUndefined();
  expect(RENAMED_PIECES[BOUZOU]).toBe(OPENDA);
  expect(piece.title).toBe("Loïs Openda — Script Pendant");
  expect(piece.people).toEqual(["lois-openda"]);
  // Everything of the folder 14 (12 photos, its film, its cut-out), and the close-up of the stories, once each.
  const all = [piece.cover, ...piece.gallery].map((m) => m.src);
  expect(new Set(all).size, "no photo twice").toBe(all.length);
  expect(all.filter((s) => s.startsWith("/media/hd/" + OPENDA + "/")).length).toBe(12);
  expect(all).toContain("/media/pieces/lois-openda-nameplate-pendant/cover.webp");
  expect(piece.cover.src).toBe("/media/hd/" + OPENDA + "/p21.webp");
  const films = (media as unknown as { films: Record<string, { reveal?: { source: string } }> }).films;
  expect(films[OPENDA]?.reveal?.source).toMatch(/^14\/v01 · HD 1080p$/);
  expect(films[BOUZOU]).toBeUndefined();
  expect(piece.making.sketch?.src).toContain("/media/sketches/" + OPENDA);

  // Its page: the name of Loïs Openda, "Created exclusively for Loïs Openda".
  await skipIntro(page);
  await page.goto("/pieces/" + OPENDA, { waitUntil: "load" });
  await ready(page);
  await expect(page.locator("h1#piece-title")).toHaveText("Loïs Openda — Script Pendant");
  await expect(page.locator("[data-piece-intro]")).toContainText("Created exclusively for Loïs Openda");
  await shot(page, info.project.name + "-openda");

  // The old address of Bouzou leads to it, in every language (a permanent redirect of the server, and on the page).
  for (const prefix of ["", "/fr", "/ar"]) {
    const res = await request.get(prefix + "/pieces/" + BOUZOU, { maxRedirects: 0 });
    expect(res.status(), prefix + " old address").toBe(301);
    expect(res.headers()["location"]).toBe(prefix + "/pieces/" + OPENDA);
  }
  await page.goto("/fr/pieces/" + BOUZOU, { waitUntil: "load" });
  await expect(page).toHaveURL(new RegExp("/fr/pieces/" + OPENDA + "$"));

  // The player page of Loïs Openda, the wall of the players and the Creations lead to it; it is there once.
  await page.goto("/players/lois-openda", { waitUntil: "load" });
  await expect(page.locator("a[href='/pieces/" + OPENDA + "']").first()).toBeVisible();
  await expect(page.locator("a[href*='" + BOUZOU + "']")).toHaveCount(0);
  await shot(page, info.project.name + "-openda-player");
  await page.goto("/players", { waitUntil: "load" });
  // A click on her portrait leads straight to her piece (21/11/2026).
  await expect(page.locator("[data-player-card='lois-openda'] a[data-player-link]")).toHaveAttribute("href", "/pieces/" + OPENDA);
  await page.goto("/creations?view=grid", { waitUntil: "load" });
  await expect(page.locator("a[data-piece-card='" + OPENDA + "']")).toHaveCount(1);
  await expect(page.locator("a[data-piece-card='" + BOUZOU + "']")).toHaveCount(0);
  // No "Discover More Creations" of any piece leads to the old address.
  for (const p of PUBLISHED.filter((x) => x.type === "pendant").slice(0, 6)) {
    await page.goto("/pieces/" + p.slug, { waitUntil: "domcontentloaded" });
    await expect(page.locator("a[href*='" + BOUZOU + "']")).toHaveCount(0);
  }
  expect(problems.errors).toEqual([]);
});

/* ---------- The making-of in HD on a sharp computer screen ---------- */

test("Enter the Atelier: on a Retina Mac its making-of plays in HD, on a plain screen and a phone its light copy", async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop", "a computer with a sharp screen, opened once");
  const films = (media as unknown as { films: Record<string, { making?: { src: string; mobile: string } }> }).films;
  const making = films["campione-d-italia-2023-2024"]!.making!;
  for (const [name, options, want] of [
    ["retina", { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }, making.src],
    ["plain", { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, making.mobile],
  ] as const) {
    const context = await browser.newContext({ ...options, baseURL: process.env.BASE_URL ?? "http://localhost:3001" });
    await silence(context);
    const page = await context.newPage();
    await skipIntro(page);
    await page.goto("/pieces/campione-d-italia-2023-2024", { waitUntil: "load" });
    await ready(page);
    const preview = page.locator("[data-atelier-preview]");
    await preview.scrollIntoViewIfNeeded();
    await expect(preview, name).toHaveAttribute("src", want);
    await expect.poll(() => preview.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 30_000 }).toBeGreaterThan(0.3);
    const short = await preview.evaluate((v) => Math.min((v as HTMLVideoElement).videoWidth, (v as HTMLVideoElement).videoHeight));
    expect(short, name).toBe(name === "retina" ? 1080 : 720);
    await context.close();
  }
});
