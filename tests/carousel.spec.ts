// The creations one by one (Yoni, 22/11/2026): in "All", in each collection and sub-category, a carousel (the creation in
// the middle large, those before and after smaller and blurred at its sides; a swipe, a horizontal wheel, the arrows, the
// keys, a counter; a click on the middle one opens it, a click on a blurred one brings it to the middle), then, with "See
// all creations", the grid: cards all of the same size (3 on a row on a computer, 2 on a tablet, 1 on a phone), the names
// at the same height. No jump of the layout; every language. Computer and iPhone, silent. Screenshots: verification/carousel/.
import { mkdirSync } from "node:fs";
import { expect, test, type Locator, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { COLLECTIONS, piecesOfCollection, SUBCATEGORIES } from "../src/data/collections";
import { publicCatalogue } from "../src/data/relations";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/carousel";
mkdirSync(DIR, { recursive: true });
const CAT = publicCatalogue(defaultCatalogue);
const ALL = CAT.pieces.filter((p) => p.published !== false);
const CHAINS = piecesOfCollection(CAT, COLLECTIONS.find((c) => c.slug === "chains")!);
const JESUS = piecesOfCollection(CAT, SUBCATEGORIES.find((s) => s.slug === "jesus-pieces")!);

const shot = (page: Page, name: string) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 68 });
const counter = (page: Page) => page.locator("[data-carousel-counter]");
const activeSlide = (page: Page) => page.locator("[data-slide][data-active]");

/** How far the middle of the active slide is from the middle of the screen (px). */
async function offCentre(page: Page): Promise<number> {
  return activeSlide(page).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return Math.abs(r.left + r.width / 2 - window.innerWidth / 2);
  });
}

/** A click (a touch) on the part of an element that shows on the screen, as a visitor does. */
async function tapVisible(page: Page, el: Locator, touch: boolean) {
  const b = (await el.boundingBox())!;
  const vw = page.viewportSize()!.width;
  const x = Math.min(b.x + b.width, vw) - 12;
  const y = b.y + b.height / 2;
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

async function settle(page: Page, n: number) {
  await expect(counter(page)).toHaveText(new RegExp("\\s" + n + "\\s*/"), { timeout: 10_000 });
  await expect.poll(() => offCentre(page), { timeout: 10_000 }).toBeLessThan(4);
  // The creation in the middle grows to its size (0.55 s).
  await page.waitForTimeout(650);
}

/** The sizes of the cards of the grid, and how many on a row. */
async function gridLayout(grid: Locator) {
  return grid.locator("a[data-piece-card]").evaluateAll((els) =>
    els.map((a) => {
      const r = a.getBoundingClientRect();
      const frame = a.querySelector("span")!.getBoundingClientRect();
      const title = a.querySelector("[data-card-title]") as HTMLElement;
      const t = title.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), fw: Math.round(frame.width), fh: Math.round(frame.height), titleTop: Math.round(t.top), cut: title.scrollHeight > title.clientHeight + 1 };
    }),
  );
}

const LISTS: { name: string; path: string; pieces: typeof ALL }[] = [
  { name: "all", path: "/fr/creations", pieces: ALL },
  { name: "chains", path: "/fr/creations/chains", pieces: CHAINS },
  { name: "jesus-pieces", path: "/fr/creations/pendants/jesus-pieces", pieces: JESUS },
];

for (const list of LISTS) {
  test(list.name + ": the carousel, one by one, then the grid of equal cards", async ({ page }, info) => {
    const problems = watch(page);
    const phone = info.project.name !== "desktop";
    const n = list.pieces.length;
    expect(n).toBeGreaterThan(2);
    await skipIntro(page);
    await page.goto(list.path, { waitUntil: "load" });
    // (With the server, the list of the house arrives after the page, in its own order: the carousel waits for it.)
    await page.waitForLoadState("networkidle");
    const carousel = page.locator("[data-carousel]");
    await carousel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    // The first one in the middle, large; its neighbour smaller and blurred, at its side.
    await expect(page.locator("[data-slide]")).toHaveCount(n);
    await expect(counter(page)).toHaveText(new RegExp("^\\s*Création\\s*1\\s*/\\s*" + n + "\\s*$"));
    expect(await offCentre(page)).toBeLessThan(4);
    const look = await page.locator("[data-slide='1'] .pc-card").evaluate((el) => ({ transform: getComputedStyle(el).transform, blur: getComputedStyle(el.querySelector(".pc-photo")!).filter }));
    expect(look.transform).toMatch(/matrix\(0\.8/);
    expect(look.blur).toContain("blur");
    const big = (await page.locator("[data-slide='0'] .pc-frame").boundingBox())!;
    const small = (await page.locator("[data-slide='1'] .pc-frame").boundingBox())!;
    expect(small.width).toBeLessThan(big.width * 0.85);
    // It peeks out at the side of the screen.
    expect(small.x).toBeLessThan(page.viewportSize()!.width);
    expect(big.width).toBeGreaterThan(phone ? 280 : 400);
    await shot(page, info.project.name + "-" + list.name + "-1");

    // The arrow: the next one.
    await page.locator("[data-carousel-next]").click();
    await settle(page, 2);
    // A swipe (a finger, a trackpad): the row moves under it, one creation at a time.
    if (phone) {
      await page.locator("[data-carousel-track]").evaluate((t) => t.scrollBy({ left: (t.querySelector("[data-slide]") as HTMLElement).offsetWidth * 0.7, behavior: "instant" }));
    } else {
      await page.locator("[data-slide][data-active] .pc-frame").hover();
      const y = await page.evaluate(() => window.scrollY);
      await page.mouse.wheel(260, 0);
      // A horizontal wheel moves the row, never the page.
      await page.waitForTimeout(400);
      expect(Math.abs((await page.evaluate(() => window.scrollY)) - y)).toBeLessThan(2);
    }
    await settle(page, 3);
    // The keyboard.
    await page.locator("[data-slide][data-active] a").focus();
    await page.keyboard.press("ArrowLeft");
    await settle(page, 2);
    await page.keyboard.press("ArrowRight");
    await settle(page, 3);
    await shot(page, info.project.name + "-" + list.name + "-3");
    // A blurred one, touched where it shows at the side: it comes to the middle (the page stays).
    const url = page.url();
    await tapVisible(page, page.locator("[data-slide='3'] .pc-frame"), phone);
    await settle(page, 4);
    expect(page.url()).toBe(url);
    // The middle one: its piece (the order of the list is the one of the house: read on the page).
    const slug = (await page.locator("[data-slide='3'] a").getAttribute("data-carousel-piece"))!;
    await page.locator("[data-slide='3'] a").click();
    await expect(page).toHaveURL(new RegExp("/fr/pieces/" + slug + "$"));
    // Back: the carousel where it was left.
    await page.goBack();
    await settle(page, 4);

    // "See all creations": the grid, then back to the carousel.
    await page.locator("[data-carousel-all]").click();
    await expect(page).toHaveURL(/view=grid/);
    const grid = page.locator("[data-creations-grid]");
    await expect(grid.locator("a[data-piece-card]")).toHaveCount(n);
    await page.waitForTimeout(600);
    const cards = await gridLayout(grid);
    const columns = new Set(cards.map((c) => c.x)).size;
    expect(columns).toBe(phone ? 1 : Math.min(3, n));
    // Every card the same size, the same frame; the names of a row at the same height; no name cut.
    for (const c of cards) {
      expect(Math.abs(c.w - cards[0]!.w)).toBeLessThanOrEqual(1);
      expect(Math.abs(c.h - cards[0]!.h)).toBeLessThanOrEqual(1);
      expect(Math.abs(c.fw - cards[0]!.fw)).toBeLessThanOrEqual(1);
      expect(Math.abs(c.fh - cards[0]!.fh)).toBeLessThanOrEqual(1);
      expect(c.cut, "a name cut").toBe(false);
    }
    for (const row of new Set(cards.map((c) => c.y))) {
      const tops = cards.filter((c) => c.y === row).map((c) => c.titleTop);
      expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
    }
    await expect(page.locator("[data-carousel-back]")).toBeInViewport();
    await shot(page, info.project.name + "-" + list.name + "-grille");
    await page.locator("[data-carousel-back]").click();
    await expect(page).not.toHaveURL(/view=grid/);
    await expect(page.locator("[data-carousel]")).toBeVisible();
    expect(problems.errors).toEqual([]);
  });
}

test("the grid on a tablet: two cards on a row, all of the same size", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "a tablet: the computer browser at 820 px");
  await page.setViewportSize({ width: 820, height: 1180 });
  await skipIntro(page);
  await page.goto("/fr/creations?view=grid", { waitUntil: "load" });
  const grid = page.locator("[data-creations-grid]");
  await expect(grid.locator("a[data-piece-card]")).toHaveCount(ALL.length);
  await page.waitForTimeout(500);
  const cards = await gridLayout(grid);
  expect(new Set(cards.map((c) => c.x)).size).toBe(2);
  for (const c of cards) {
    expect(Math.abs(c.h - cards[0]!.h)).toBeLessThanOrEqual(1);
    expect(c.cut).toBe(false);
  }
  await page.screenshot({ path: DIR + "/tablette-grille.jpg", type: "jpeg", quality: 68 });
});

test("no jump of the layout while the page loads", async ({ page }, info) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      /* WebKit: no layout shifts measured; the place of the carousel is compared instead */
    }
  });
  await skipIntro(page);
  await page.goto("/fr/creations", { waitUntil: "domcontentloaded" });
  const place = () => page.locator("[data-carousel-track]").evaluate((t) => { const r = t.getBoundingClientRect(); return [Math.round(r.top + window.scrollY), Math.round(r.height)]; });
  const before = await place();
  await page.waitForLoadState("load");
  await page.waitForTimeout(2500);
  expect(await place()).toEqual(before);
  if (info.project.name === "desktop") expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.02);
});

/** The words of the carousel in each language. */
const WORDS: [string, string, string][] = [
  ["", "See all creations", "Back to the carousel"],
  ["/es", "Ver todas las creaciones", "Volver al carrusel"],
  ["/de", "Alle Kreationen ansehen", "Zurück zum Karussell"],
  ["/nl", "Alle creaties bekijken", "Terug naar de carrousel"],
  ["/ar", "عرض كل الإبداعات", "العودة إلى العرض الدوّار"],
];

test("every language: its words; in Arabic the row reads from right to left", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the words: once");
  await skipIntro(page);
  for (const [prefix, all, back] of WORDS) {
    await page.goto(prefix + "/creations", { waitUntil: "load" });
    await expect(page.locator("[data-carousel-all]")).toHaveText(all);
    await page.locator("[data-carousel-all]").click();
    await expect(page.locator("[data-carousel-back]")).toHaveText(back);
    await page.locator("[data-carousel-back]").click();
    if (prefix === "/ar") {
      await page.locator("[data-carousel]").scrollIntoViewIfNeeded();
      await page.locator("[data-carousel-next]").click();
      await settle(page, 2);
      // The next one stands to the left of the first.
      const x = (sel: string) => page.locator(sel).evaluate((el) => el.getBoundingClientRect().left);
      expect(await x("[data-slide='0']")).toBeGreaterThan(await x("[data-slide='1']"));
      await page.screenshot({ path: DIR + "/desktop-ar.jpg", type: "jpeg", quality: 68 });
    }
  }
});
