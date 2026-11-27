// The home page on every screen, the special project, the Inter ring, the players, the boxes, the link previews,
// the layout shifts and the accessibility of the home page. Runs on the computer (1440 px), the iPhone SE (320 px),
// the iPhone 13 (390 px) and the iPhone 15 Pro Max (430 px): npm run verify -- tests/home.spec.ts
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, test, type Page } from "./fixtures";
import { FILM_PIECES, getCatalogue, shotPath, skipIntro, watch } from "./helpers";

const INTER = "campione-d-italia-2023-2024";
const VFB = "vfb-stuttgart-dfb-pokal-2025";

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

// Since 23/11/2026 (Yoni) the home page is calm: no bubbles of stories, no film, the rings without their secret (it moved to
// The Atelier). Its new sections: tests/yoni2311.spec.ts.

test("Inter ring: created exclusively for Inter Milan, a historic commission, Marcus Thuram linked, the details open their photos", async ({ page }, info) => {
  // Superseded on 26/11/2026 by Yoni's definitive Inter page (its own words, the champions, its case): tests/contenus2711.spec.ts.
  test.skip(true, "the Inter page of before 26/11/2026: tests/contenus2711.spec.ts");
  const problems = watch(page);
  await page.goto("/pieces/" + INTER, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  // One small label above its name (24/11/2026); who it was created for in its own section, once.
  await expect(page.locator("[data-made-for] h2")).toContainText("Created exclusively for Inter Milan");
  await expect(page.locator("[data-made-for-person='marcus-thuram']")).toHaveCount(1);
  await page.screenshot({ path: shotPath(info, "inter-1-ouverture"), type: "jpeg", quality: 70 });
  const details = page.locator("[data-details]");
  await details.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  // Since 25/11/2026 (a magazine): the details shown by a photo stand beside it, the others listed after them — nine in all.
  expect((await details.locator("[data-detail]").count()) + (await details.locator("[data-magazine-text] h3").count())).toBe(9);
  for (const words of ["Six Months of Craftsmanship", "The Secret Within", "Beyond a Ring", "Twenty stars", "Black, blue, black, blue", "Italian flag", "Forza Inter", "Serie A", "Campione d'Italia", "cup", "pendant"]) await expect(details).toContainText(words);
  await page.screenshot({ path: shotPath(info, "inter-2-details"), type: "jpeg", quality: 70 });
  // Every detail shown by a photo opens it: the photos beside their words, and the titles of the others.
  const photos = details.locator("[data-detail-photo], [data-magazine-photo]");
  expect(await photos.count()).toBeGreaterThanOrEqual(6);
  await photos.nth(3).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shotPath(info, "inter-3-detail-en-grand"), type: "jpeg", quality: 70 });
  await page.keyboard.press("Escape");
  // The technical sheet: only what Yoni gave, never a provisional line (« as seen in the photos, to be confirmed », 25/11/2026).
  await expect(page.locator("main")).not.toContainText("to be confirmed");
  await expect(page.locator("main")).not.toContainText("Shared on request");
  if ((await page.locator("#sheet-title").count()) > 0) {
    await page.locator("#sheet-title").scrollIntoViewIfNeeded();
    await page.screenshot({ path: shotPath(info, "inter-4-fiche-technique"), type: "jpeg", quality: 70 });
  }
  expect(problems.errors).toEqual([]);
});

test("players: a wall of portraits on /players", async ({ page }, info) => {
  const problems = watch(page);
  const cat = await getCatalogue(page);
  await page.goto("/players", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const cards = page.locator("[data-player-card]");
  await expect(cards).toHaveCount(cat.people.length);
  // Each card: a photo or the initials, the name, a link: the capsule of their piece, else their page (21/11/2026).
  for (let i = 0; i < (await cards.count()); i++) {
    const card = cards.nth(i);
    expect(await card.locator("img, [data-initials]").count()).toBe(1);
    await expect(card.locator("a[data-player-link]")).toHaveAttribute("href", /\/(pieces|players)\/[a-z0-9-]+$/);
  }
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shotPath(info, "players-1-mur"), type: "jpeg", quality: 70, fullPage: true });
  expect(problems.errors).toEqual([]);
});

test("Signature Trunks: every trunk closed in a grid of squares, Begin Your Creation and WhatsApp at the end", async ({ page }, info) => {
  const problems = watch(page);
  await page.goto("/boxes", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await expect(page.locator("h1")).toContainText("Signature Trunks");
  // (24/11/2026: the page starts with the trunks themselves, no sentence under its name.)
  // One way to one's own trunk, at the end (24/11/2026: the buttons of the house, never twice on the page).
  const buttons = page.locator("[data-create-box]");
  await expect(buttons).toHaveCount(1);
  for (let i = 0; i < 1; i++) {
    await expect(buttons.nth(i)).toHaveText(/WhatsApp/);
    expect(decodeURIComponent((await buttons.nth(i).getAttribute("href")) ?? "")).toContain("discovered the Signature Trunks on your website and would like to commission a trunk of my own.");
  }
  await page.screenshot({ path: shotPath(info, "boxes-1-haut"), type: "jpeg", quality: 70 });
  // The trunks of the v3 (23/11/2026; the trunk of the house waits for its v3 files), Sirius first; every trunk a square of
  // the same size, closed (tests/trunks.spec.ts opens them).
  const cards = page.locator("[data-box]");
  await expect(cards.first()).toHaveAttribute("data-box", "sirius");
  const squares = await page.locator("[data-box] .aspect-square").evaluateAll((els) => els.map((e) => [Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)]));
  expect(squares.length).toBe(await cards.count());
  for (const [w, h] of squares) {
    expect(Math.abs(w! - h!)).toBeLessThanOrEqual(1);
    expect(Math.abs(w! - squares[0]![0]!)).toBeLessThanOrEqual(1);
  }
  // Its photos, under it (23/11/2026), each full screen with the magnifying glass.
  // "Discover the photos" opens them all, large (24/11/2026).
  await page.locator("[data-box-photos='sirius']").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: shotPath(info, "boxes-3-photo-en-grand"), type: "jpeg", quality: 70 });
  await page.keyboard.press("Escape");
  await buttons.nth(0).scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shotPath(info, "boxes-4-bas"), type: "jpeg", quality: 70 });
  expect(problems.errors).toEqual([]);
});

test("link previews: a 1200 x 630 image on every page, the photo of the piece on a piece page, its own locale", async ({ page }) => {
  // (Each address carries the version of its image since 23/11/2026: "?v=<fingerprint>".)
  const cases: [string, string, RegExp][] = [
    ["/", "en_GB", /\/media\/share\/brand\.jpg\?v=[0-9a-f]{10}$/],
    ["/fr/players", "fr_FR", /\/media\/share\/brand\.jpg\?v=[0-9a-f]{10}$/],
    ["/es/boxes", "es_ES", /\/media\/share\/brand\.jpg\?v=[0-9a-f]{10}$/],
    ["/de/pieces/" + VFB, "de_DE", new RegExp("/media/share/pieces/" + VFB + "\\.jpg\\?v=[0-9a-f]{10}$")],
    ["/nl/pieces/" + INTER, "nl_NL", new RegExp("/media/share/pieces/" + INTER + "\\.jpg\\?v=[0-9a-f]{10}$")],
    ["/ar/pieces/kevin-schade-dragon-ball-pendant", "ar_AE", /\/media\/share\/pieces\/kevin-schade-dragon-ball-pendant\.jpg\?v=[0-9a-f]{10}$/],
  ];
  for (const [path, locale, image] of cases) {
    // As written in the page sent by the server (what WhatsApp and iMessage read)...
    const html = await (await page.request.get(path)).text();
    expect(html, path).toContain('property="og:locale" content="' + locale + '"');
    expect(html, path).toContain('name="twitter:card" content="summary_large_image"');
    // ...and in the page in the browser, with the address of this server.
    await page.goto(path, { waitUntil: "load" });
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(og ?? "", path).toMatch(image);
    expect(await page.locator('meta[name="twitter:image"]').getAttribute("content")).toBe(og);
    expect(await page.locator('meta[property="og:image:width"]').getAttribute("content")).toBe("1200");
    expect(await page.locator('meta[property="og:image:height"]').getAttribute("content")).toBe("630");
    const res = await page.request.get(new URL(og!).pathname);
    expect(res.status(), og!).toBe(200);
    const jpeg = await res.body();
    // The size written in the JPEG itself (SOF marker).
    let size: [number, number] | null = null;
    for (let i = 2; i < jpeg.length - 9; ) {
      const marker = jpeg[i + 1]!;
      const length = jpeg.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xc2) {
        size = [jpeg.readUInt16BE(i + 7), jpeg.readUInt16BE(i + 5)];
        break;
      }
      i += 2 + length;
    }
    expect(size, og!).toEqual([1200, 630]);
  }
});

/** The layout shifts while a page loads and settles, without touching it (Chromium measures them; WebKit cannot). */
async function layoutShift(page: Page, path: string): Promise<number> {
  await page.goto(path, { waitUntil: "load" });
  await page.waitForTimeout(4000);
  return page.evaluate(() => (window as unknown as { __cls: number }).__cls);
}

const CLS_PAGES = ["/", "/fr", "/de", "/ar", "/players", "/fr/players", "/boxes", "/creations", "/pieces/" + INTER, "/fr/pieces/" + VFB, "/atelier", "/process", "/contact"];

test("layout shifts under 0.05 on every main page, on the computer and the three iPhones", async ({ browser, browserName }, info) => {
  // Only Chromium reports layout shifts: the computer run measures every screen size, in Chromium.
  test.skip(browserName !== "chromium" || info.project.name !== "desktop", "measured once, by the computer run (Chromium)");
  const screens = [
    { viewport: { width: 1440, height: 900 } },
    { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
    { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  ];
  for (const screen of screens) {
    const context = await browser.newContext({ ...screen, baseURL: process.env.BASE_URL ?? "http://localhost:3001" });
    // The film of a finished piece is a layer over its page (no shift of the page): counted as seen, the page is measured.
    await context.addInitScript((films) => {
      try {
        sessionStorage.setItem("bj-intro-seen", "1");
        sessionStorage.setItem("berete:films", JSON.stringify(films));
      } catch {
        /* ignore */
      }
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) w.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    }, FILM_PIECES);
    const page = await context.newPage();
    for (const path of CLS_PAGES) expect(await layoutShift(page, path), "CLS of " + path + " at " + screen.viewport.width + " px").toBeLessThan(0.05);
    await context.close();
  }
});

test("accessibility of the home page: no serious or critical axe-core violation", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
  const require = createRequire(import.meta.url);
  await page.addScriptTag({ content: readFileSync(require.resolve("axe-core/axe.min.js"), "utf8") });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<{ violations: { id: string; impact: string; nodes: { target: string[] }[] }[] }> } }).axe;
    const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice", "experimental"] } });
    return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id + ": " + v.nodes.map((n) => n.target.join(" ")).join(", "));
  });
  expect(violations).toEqual([]);
});
