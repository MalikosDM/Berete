// The home page on every screen, the special project, the Inter ring, the players, the boxes, the link previews,
// the layout shifts and the accessibility of the home page. Runs on the computer (1440 px), the iPhone SE (320 px),
// the iPhone 13 (390 px) and the iPhone 15 Pro Max (430 px): npm run verify -- tests/home.spec.ts
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, test, type Page } from "@playwright/test";
import { getCatalogue, scrollTo, shotPath, skipIntro, watch } from "./helpers";

const INTER = "campione-d-italia-2023-2024";
const VFB = "vfb-stuttgart-dfb-pokal-2025";
const phone = (name: string) => name !== "desktop";

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

/** Where the opening text sits against the bar of stories, and how far apart the names under the bubbles are. */
async function heroLayout(page: Page) {
  return page.evaluate(() => {
    const bar = document.querySelector("[data-stories-bar]")!.getBoundingClientRect();
    const hero = document.querySelector("[data-home-hero]")!;
    const parts = [hero.querySelector("p"), hero.querySelector("h1"), ...Array.from(hero.querySelectorAll("a"))].filter((e): e is Element => e !== null).map((e) => e.getBoundingClientRect());
    const names = Array.from(document.querySelectorAll("[data-story-name]"))
      .map((n) => {
        const range = document.createRange();
        range.selectNodeContents(n);
        const r = range.getBoundingClientRect();
        return { left: r.left, right: r.right, lines: Math.round(r.height / parseFloat(getComputedStyle(n).lineHeight)), clipped: n.scrollHeight > n.clientHeight + 1 };
      })
      .filter((n) => n.right > 0 && n.left < innerWidth);
    let gap = Infinity;
    for (let i = 1; i < names.length; i++) gap = Math.min(gap, Math.abs(names[i]!.left - names[i - 1]!.right));
    return {
      barBottom: bar.bottom,
      top: Math.min(...parts.map((r) => r.top)),
      bottom: Math.max(...parts.map((r) => r.bottom)),
      height: innerHeight,
      gap,
      lines: Math.max(...names.map((n) => n.lines)),
      clipped: names.filter((n) => n.clipped).length,
    };
  });
}

test("home: the title, its sentence and the 3 buttons show whole under the bar of stories; names never touch", async ({ page }, info) => {
  const problems = watch(page);
  for (const path of ["/", "/fr", "/de", "/es", "/nl", "/ar"]) {
    await page.goto(path, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const r = await heroLayout(page);
    expect(r.top, path + ": the text starts under the bar of stories").toBeGreaterThanOrEqual(r.barBottom);
    expect(r.bottom, path + ": the buttons are inside the screen").toBeLessThanOrEqual(r.height);
    expect(r.gap, path + ": space between two names").toBeGreaterThanOrEqual(8);
    expect(r.lines, path + ": two lines at most").toBeLessThanOrEqual(2);
    expect(r.clipped, path + ": no name cut").toBe(0);
    if (path === "/") await page.screenshot({ path: shotPath(info, "home-1-haut-de-page"), type: "jpeg", quality: 70 });
    if (path === "/fr") await page.screenshot({ path: shotPath(info, "home-1-haut-de-page-fr"), type: "jpeg", quality: 70 });
  }
  expect(problems.errors).toEqual([]);
});

test("home film: each sentence on its dark halo, one screenshot per sentence", async ({ page }, info) => {
  const problems = watch(page);
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(3000);
  const film = await page.evaluate(() => {
    const el = document.querySelector("[data-scroll-video]")!;
    return { top: el.getBoundingClientRect().top + scrollY, height: el.getBoundingClientRect().height };
  });
  // The middle of each text step (src/pages/Home.tsx).
  const middles = [0.02, 0.14, 0.315, 0.495, 0.685, 0.885];
  for (const [i, p] of middles.entries()) {
    await scrollTo(page, film.top + p * (film.height - page.viewportSize()!.height));
    await page.waitForTimeout(1600);
    const step = page.locator("[data-film-step='" + i + "']");
    await expect(step).toHaveCSS("opacity", "1");
    await expect(step.locator("[data-text-halo]")).toHaveCount(1);
    await page.screenshot({ path: shotPath(info, "home-2-film-phrase-" + (i + 1)), type: "jpeg", quality: 70 });
  }
  expect(problems.errors).toEqual([]);
});

test("stories bar: hides going down, comes back going up, never over the footer", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const bar = page.locator("[data-stories-bar]");
  await expect(bar).toBeVisible();
  // After the film (whose magnet glides the page by itself to its texts).
  const after = await page.evaluate(() => {
    const film = document.querySelector("[data-scroll-video]")!.getBoundingClientRect();
    return film.bottom + scrollY;
  });
  await scrollTo(page, after + 200);
  await scrollTo(page, after + 1200);
  await expect(bar).toHaveAttribute("data-hidden", "true");
  await expect(bar).toBeHidden();
  await scrollTo(page, after + 800);
  await expect(bar).not.toHaveAttribute("data-hidden", "true");
  await expect(bar).toBeVisible();
  // The bottom of the page: the footer is on screen, the bar stays away, even going up a little.
  const end = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await scrollTo(page, end - 1200);
  await scrollTo(page, end);
  await scrollTo(page, end - 150);
  await expect(page.locator("footer")).toBeInViewport();
  await expect(bar).toBeHidden();
});

test("special project: the Inter and VfB rings side by side, both open onto the trophy, each leads to its page", async ({ page }, info) => {
  const problems = watch(page);
  await page.goto("/", { waitUntil: "load" });
  const section = page.locator("[data-special-project]");
  // Right after the film.
  expect(await page.evaluate(() => document.querySelector("[data-scroll-video]")?.nextElementSibling?.matches("[data-special-project]"))).toBe(true);
  await section.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -1));
  await page.waitForTimeout(1500);
  const rings = section.locator("[data-special-ring]");
  await expect(rings).toHaveCount(2);
  const [a, b] = [await rings.nth(0).boundingBox(), await rings.nth(1).boundingBox()];
  if (phone(info.project.name)) expect(b!.y).toBeGreaterThan(a!.y);
  else expect(Math.abs(b!.y - a!.y)).toBeLessThan(2);
  await expect(rings.nth(0).locator("a[href$='/pieces/" + INTER + "']")).toHaveCount(1);
  await expect(rings.nth(1).locator("a[href$='/pieces/" + VFB + "']")).toHaveCount(1);
  await section.screenshot({ path: shotPath(info, "home-3-special-project"), type: "jpeg", quality: 70 });
  for (const i of [0, 1]) {
    const lift = rings.nth(i).locator("button[aria-pressed]");
    await lift.click();
    await expect(lift).toHaveAttribute("aria-pressed", "true");
  }
  await page.waitForTimeout(900);
  await section.screenshot({ path: shotPath(info, "home-3-special-project-ouvertes"), type: "jpeg", quality: 70 });
  await rings.nth(0).locator("a[href$='/pieces/" + INTER + "']").click();
  await expect(page).toHaveURL(new RegExp("/pieces/" + INTER + "$"));
  expect(problems.errors).toEqual([]);
});

test("Inter ring: made for Inter Milan, Marcus Thuram linked, the details open their photos", async ({ page }, info) => {
  const problems = watch(page);
  await page.goto("/pieces/" + INTER, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await expect(page.locator("#piece-title").locator("xpath=..")).toContainText("Made for Inter Milan");
  await expect(page.locator("[data-made-for-person='marcus-thuram']")).toHaveCount(1);
  await page.screenshot({ path: shotPath(info, "inter-1-ouverture"), type: "jpeg", quality: 70 });
  const details = page.locator("[data-details]");
  await details.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await expect(details.locator("[data-detail]")).toHaveCount(9);
  for (const words of ["Six months", "Twenty stars", "Black, blue, black, blue", "Italian flag", "Forza Inter", "Serie A", "Campione d'Italia", "cup", "pendant"]) await expect(details).toContainText(words);
  await details.screenshot({ path: shotPath(info, "inter-2-details"), type: "jpeg", quality: 70 });
  const photos = details.locator("[data-detail-photo]");
  expect(await photos.count()).toBeGreaterThanOrEqual(8);
  await photos.nth(3).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shotPath(info, "inter-3-detail-en-grand"), type: "jpeg", quality: 70 });
  await page.keyboard.press("Escape");
  // The technical sheet says what the photos show, as a draft.
  await page.locator("#sheet-title").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-spec='seen']")).toHaveCount(1);
  await expect(page.locator("[data-seen-note]")).toBeVisible();
  await expect(page.locator("#sheet-title").locator("xpath=..")).not.toContainText("Shared on request");
  await page.locator("#sheet-title").locator("xpath=..").screenshot({ path: shotPath(info, "inter-4-fiche-technique"), type: "jpeg", quality: 70 });
  expect(problems.errors).toEqual([]);
});

test("players: a wall of portraits on /players and on the home page", async ({ page }, info) => {
  const problems = watch(page);
  const cat = await getCatalogue(page);
  await page.goto("/players", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const cards = page.locator("[data-player-card]");
  await expect(cards).toHaveCount(cat.people.length);
  // Each card: a photo or the initials, the name, a link to the profile.
  for (let i = 0; i < (await cards.count()); i++) {
    const card = cards.nth(i);
    expect(await card.locator("img, [data-initials]").count()).toBe(1);
    await expect(card.locator("a[href*='/players/']")).toHaveCount(1);
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
  await page.goto("/", { waitUntil: "load" });
  const band = page.locator("#players-band-title").locator("xpath=ancestor::section[1]");
  await band.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await expect(band.locator("[data-player-card]")).toHaveCount(cat.people.filter((p) => p.kind === "player").length);
  await band.screenshot({ path: shotPath(info, "players-2-accueil"), type: "jpeg", quality: 70 });
  expect(problems.errors).toEqual([]);
});

test("boxes: Create your own box, at the top and at the bottom, opens WhatsApp already written", async ({ page }, info) => {
  const problems = watch(page);
  await page.goto("/boxes", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const buttons = page.locator("[data-create-box]");
  await expect(buttons).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await expect(buttons.nth(i)).toHaveText(/Create your own box/);
    expect(decodeURIComponent((await buttons.nth(i).getAttribute("href")) ?? "")).toContain("I'd like to create my own box");
  }
  await expect(buttons.nth(0)).toBeInViewport();
  await page.screenshot({ path: shotPath(info, "boxes-1-haut"), type: "jpeg", quality: 70 });
  await buttons.nth(1).scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shotPath(info, "boxes-2-bas"), type: "jpeg", quality: 70 });
  expect(problems.errors).toEqual([]);
});

test("link previews: a 1200 x 630 image on every page, the photo of the piece on a piece page, its own locale", async ({ page }) => {
  const cases: [string, string, RegExp][] = [
    ["/", "en_GB", /\/media\/share\/brand\.jpg$/],
    ["/fr/players", "fr_FR", /\/media\/share\/brand\.jpg$/],
    ["/es/boxes", "es_ES", /\/media\/share\/brand\.jpg$/],
    ["/de/pieces/" + VFB, "de_DE", new RegExp("/media/share/pieces/" + VFB + "\\.jpg$")],
    ["/nl/pieces/" + INTER, "nl_NL", new RegExp("/media/share/pieces/" + INTER + "\\.jpg$")],
    ["/ar/pieces/kevin-schade-dragon-ball-pendant", "ar_AE", /\/media\/share\/pieces\/kevin-schade-dragon-ball-pendant\.jpg$/],
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
    await context.addInitScript(() => {
      try {
        sessionStorage.setItem("bj-intro-seen", "1");
      } catch {
        /* ignore */
      }
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) w.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
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
