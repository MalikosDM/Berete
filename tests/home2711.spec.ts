// The video of Yoni of 26/11/2026 (the home page scrolled on his MacBook, his voice over it): "make it my logo that loads";
// "this jewel, on the right or on the left, and the descriptive writing beside it, instead of empty space here and there";
// "the magnifying glass stays exactly where it is, but the image goes up: the ball must be here, so the whole piece is seen";
// "same for the ring". Desktop (Chromium 1440 × 900, and 1280 × 800, 1920 × 1080) and iPhone (WebKit 390 × 844), silent.
//   BASE_URL=http://localhost:5392 npx playwright test tests/home2711.spec.ts --project=desktop --project=iphone
import sharp from "sharp";
import monogram from "../src/data/monogram-lines.generated.json" with { type: "json" };
import { HOUSE_PIECE, MECHANISM_PIECE } from "../src/data/homeTexts";
import type { Catalogue } from "../src/data/types";
import { expect, test, type Page } from "./fixtures";
import { shotPath, skipIntro, watch } from "./helpers";

/** The sections with one piece, in their order, the side of their piece (start = left, end = right) and the piece. */
const BLOCKS = [
  { id: "home-next", block: "house", side: "start", piece: HOUSE_PIECE, visual: "[data-hero-piece]" },
  { id: "innovation", block: "mechanism", side: "end", piece: MECHANISM_PIECE, visual: "[data-innovation-visual]" },
  { id: "commission-1", block: "ring-campione-d-italia-2023-2024", side: "start", piece: "campione-d-italia-2023-2024", visual: "[data-special-ring]" },
  { id: "commission-2", block: "ring-vfb-stuttgart-dfb-pokal-2025", side: "end", piece: "vfb-stuttgart-dfb-pokal-2025", visual: "[data-special-ring]" },
] as const;

const isPhone = (name: string) => name === "iphone";

async function liveLines(page: Page): Promise<Record<string, string>> {
  const res = await page.request.get("/api/catalogue");
  const cat = (res.ok() ? await res.json() : { pieces: [] }) as Catalogue;
  return Object.fromEntries(cat.pieces.map((p) => [p.slug, p.line]));
}

/** Scrolls a section to the middle of the room under the header and lets it fade in. */
async function show(page: Page, id: string) {
  await page.locator("#" + id).evaluate((e) => {
    const header = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    const r = e.getBoundingClientRect();
    const room = window.innerHeight - header;
    window.scrollTo(0, r.top + window.scrollY - header - Math.max(0, (room - r.height) / 2));
  });
  await page.waitForTimeout(1700);
}

test("the intro: the monogram BRT draws itself in fine rose gold lines on black, gone sooner than before; none with reduce motion", async ({ page }, info) => {
  // When the intro appears, starts to leave and is gone, seen from the page itself (never slowed by the test).
  await page.addInitScript(() => {
    const w = window as unknown as { __intro: { added?: number; leaving?: number; removed?: number } };
    w.__intro = {};
    new MutationObserver(() => {
      const el = document.querySelector("[data-preloader]");
      const now = performance.now();
      if (el && w.__intro.added === undefined) w.__intro.added = now;
      if (el && el.className.includes("opacity-0") && w.__intro.leaving === undefined) w.__intro.leaving = now;
      if (!el && w.__intro.added !== undefined && w.__intro.removed === undefined) w.__intro.removed = now;
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const intro = page.locator("[data-preloader]");
  await expect(intro).toBeAttached({ timeout: 30_000 });
  // On black, every line of the monogram (the diamond, B, R, T), stroked with the rose gold of the house.
  expect(await intro.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(10, 10, 10)");
  await expect(intro.locator("[data-preloader-line]")).toHaveCount(monogram.lines.length);
  expect(await intro.locator("linearGradient stop").evaluateAll((s) => s.map((x) => x.getAttribute("stop-color")?.toUpperCase()))).toEqual(["#9C5B4F", "#E8B4A0", "#B76E79"]);
  expect(await intro.locator("g[stroke]").getAttribute("stroke")).toBe("url(#preloader-rose-gold)");
  // The lines draw themselves: hidden at first, all drawn after about 1.6 s.
  await expect.poll(() => intro.locator("[data-preloader-line]").evaluateAll((ps) => Math.max(...ps.map((p) => parseFloat(getComputedStyle(p).strokeDashoffset)))), { timeout: 2500, intervals: [100] }).toBeLessThan(0.02);
  await page.screenshot({ path: shotPath(info, "home2711-intro"), type: "jpeg", quality: 75 });
  await expect(intro).toHaveCount(0, { timeout: 5000 });
  const times = await page.evaluate(() => (window as unknown as { __intro: { added: number; leaving: number; removed: number } }).__intro);
  // Before 27/11/2026 it left at 2.6 s and was gone at 3.3 s.
  expect(times.leaving - times.added).toBeLessThan(2100);
  expect(times.removed - times.added).toBeLessThan(2800);
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-intro"))).toBe(false);

  // « Reduce motion »: no intro at all, the page at once (a new tab: a new visit).
  const still = await page.context().newPage();
  await still.emulateMedia({ reducedMotion: "reduce" });
  await still.goto("/", { waitUntil: "domcontentloaded" });
  await still.waitForTimeout(1500);
  await expect(still.locator("[data-preloader]")).toHaveCount(0);
  expect(await still.evaluate(() => document.documentElement.hasAttribute("data-intro"))).toBe(false);
  await still.close();
});

test("each piece on one side, in turn left and right, its words beside it (its line); on a phone the piece then its words", async ({ page }, info) => {
  const problems = watch(page);
  await skipIntro(page);
  const lines = await liveLines(page);
  await page.goto("/");
  for (const b of BLOCKS) {
    await show(page, b.id);
    const section = page.locator("#" + b.id);
    await expect(section).toHaveAttribute("data-home-side", b.side);
    const visual = (await section.locator(b.visual).first().boundingBox())!;
    const words = (await section.locator("[data-home-words]").boundingBox())!;
    // Its short text: the line of the piece, as on its page (the text of the admin only in French in the check below).
    const text = section.locator(`[data-home-text="${b.block}"]`);
    if (lines[b.piece]) await expect(text).toHaveText(lines[b.piece]!);
    else await expect(text).not.toBeEmpty();
    // Its way in stays (one per section).
    await expect(section.locator("[data-cta]")).toHaveCount(1);
    await expect(section.locator("h1, h2")).toHaveCount(1);
    if (isPhone(info.project.name)) {
      expect(visual.y + visual.height).toBeLessThanOrEqual(words.y + 1);
      expect(await section.locator("[data-home-words]").evaluate((el) => getComputedStyle(el).textAlign)).toBe("center");
      for (const p of await section.locator("[data-home-words] p").all()) expect(parseFloat(await p.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      expect((await section.locator("[data-cta]").boundingBox())!.height).toBeGreaterThanOrEqual(48);
    } else {
      // Side by side: the piece and its words share the same height of the screen, on two sides that never overlap.
      if (b.side === "start") expect(visual.x + visual.width).toBeLessThanOrEqual(words.x);
      else expect(words.x + words.width).toBeLessThanOrEqual(visual.x);
      expect(words.y).toBeLessThan(visual.y + visual.height);
      expect(words.y + words.height).toBeGreaterThan(visual.y);
      // The words take the half of the page beside the piece (no more empty space on that side).
      const vw = page.viewportSize()!.width;
      if (b.side === "start") expect(words.x).toBeGreaterThan(vw * 0.45);
      else expect(words.x + words.width).toBeLessThan(vw * 0.55);
    }
    await page.screenshot({ path: shotPath(info, "home2711-" + b.block), type: "jpeg", quality: 70 });
  }
  expect(problems.errors).toEqual([]);
});

test("The Mechanism: the piece and its circle where they were, the sphere turning in the middle of the circle, whole, no black band", async ({ page }, info) => {
  // Yoni, 26/11/2026, understood on 27/11: the picture and the circle never move; only what the circle shows goes up.
  await skipIntro(page);
  const sizes = isPhone(info.project.name) ? [null] : [{ width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }];
  for (const size of sizes) {
    if (size) await page.setViewportSize(size);
    await page.goto("/");
    await show(page, "innovation");
    const photo = page.locator("[data-innovation-photo]");
    await expect.poll(() => photo.evaluate((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0), { timeout: 15_000 }).toBe(true);
    const m = await page.evaluate(() => {
      const visual = document.querySelector("[data-innovation-visual]")!.getBoundingClientRect();
      const loupe = document.querySelector("[data-innovation-loupe] > div")!.getBoundingClientRect();
      const film = document.querySelector("[data-sphere-film]")!.getBoundingClientRect();
      return {
        visual: { top: visual.top, bottom: visual.bottom, right: visual.right, ratio: visual.width / visual.height },
        loupe: { top: loupe.top, bottom: loupe.bottom, left: loupe.left, right: loupe.right, width: loupe.width },
        film: { top: film.top, bottom: film.bottom, left: film.left, right: film.right, width: film.width, height: film.height },
        viewport: window.innerHeight,
        header: document.querySelector("header")!.getBoundingClientRect().bottom,
      };
    });
    // The picture of the piece in its 4:5 frame, the circle set on its bottom corner (over the piece, as before 27/11).
    expect(Math.abs(m.visual.ratio - 0.8)).toBeLessThan(0.01);
    expect(Math.abs(m.loupe.bottom - m.visual.bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(m.loupe.right - m.visual.right)).toBeLessThanOrEqual(32);
    expect(m.loupe.top).toBeGreaterThan(m.visual.top + (m.visual.bottom - m.visual.top) * 0.5);
    // The whole picture fits in the room under the header.
    expect(m.visual.bottom - m.visual.top).toBeLessThanOrEqual(m.viewport - m.header);
    // Inside the circle: the film still covers it whole, its sphere (at 60 % of the height of its square) in the middle.
    expect(m.film.top).toBeLessThanOrEqual(m.loupe.top + 0.5);
    expect(m.film.bottom).toBeGreaterThanOrEqual(m.loupe.bottom - 0.5);
    expect(m.film.left).toBeLessThanOrEqual(m.loupe.left + 0.5);
    expect(m.film.right).toBeGreaterThanOrEqual(m.loupe.right - 0.5);
    const sphereY = m.film.top + 0.6 * m.film.height;
    const middle = (m.loupe.top + m.loupe.bottom) / 2;
    expect(Math.abs(sphereY - middle) / m.loupe.width).toBeLessThan(0.04);
    // Never zoomed more than it must (1.25 times at most), so that the sphere stays whole in the circle.
    expect(m.film.width / m.loupe.width).toBeLessThanOrEqual(1.26);
    // No black band at the top of the circle: its top fifth (inside the round) mostly lit.
    const shot = await page.locator("[data-innovation-loupe] > div").screenshot();
    const { data, info: im } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let dark = 0;
    let all = 0;
    const r = im.width / 2;
    for (let y = 0; y < im.height * 0.2; y++)
      for (let x = 0; x < im.width; x++) {
        if ((x - r) ** 2 + (y - r) ** 2 > (r * 0.94) ** 2) continue;
        const i = (y * im.width + x) * 3;
        all++;
        if (Math.max(data[i]!, data[i + 1]!, data[i + 2]!) < 34) dark++;
      }
    expect(dark / all, "black at the top of the circle").toBeLessThan(0.3);
    await page.screenshot({ path: shotPath(info, "home2711-mechanism" + (size ? "-" + size.width : "")), type: "jpeg", quality: 70 });
  }
});

test("the trunk at the top of the page: whole in the room under the header, never cut", async ({ page }, info) => {
  await skipIntro(page);
  const sizes = isPhone(info.project.name) ? [null] : [{ width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }];
  for (const size of sizes) {
    if (size) await page.setViewportSize(size);
    await page.goto("/");
    const img = page.locator("[data-home-photo-img]");
    await expect.poll(() => img.evaluate((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0), { timeout: 15_000 }).toBe(true);
    const m = await page.evaluate(() => {
      const i = document.querySelector<HTMLImageElement>("[data-home-photo-img]")!;
      const r = document.querySelector("[data-home-photo-box]")!.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, ratio: r.width / r.height, natural: i.naturalWidth / i.naturalHeight, header: document.querySelector("header")!.getBoundingClientRect().bottom, vw: window.innerWidth, vh: window.innerHeight };
    });
    expect(m.top).toBeGreaterThanOrEqual(m.header - 1);
    expect(m.bottom).toBeLessThanOrEqual(m.vh + 1);
    expect(m.left).toBeGreaterThanOrEqual(-1);
    expect(m.right).toBeLessThanOrEqual(m.vw + 1);
    // Its frame has the shape of the photo: nothing of it is cut.
    expect(Math.abs(m.ratio / m.natural - 1)).toBeLessThan(0.02);
    await page.screenshot({ path: shotPath(info, "home2711-trunk" + (size ? "-" + size.width : "")), type: "jpeg", quality: 70 });
  }
});

test("the admin: « Textes de l'accueil » writes the text beside a piece, language by language; empty, the line of the piece again", async ({ page }, info) => {
  test.skip(isPhone(info.project.name), "the admin on a computer (one test changes the setting at a time)");
  const password = process.env.ADMIN_PASSWORD;
  test.skip(!password, "ADMIN_PASSWORD");
  const login = await page.request.post("/api/admin/login", { data: { password } });
  expect(login.ok()).toBeTruthy();
  const { token } = (await login.json()) as { token: string };
  const auth = { Authorization: "Bearer " + token };
  const before = (await (await page.request.get("/api/admin/home-texts", { headers: auth })).json()) as { texts: Record<string, Record<string, string>> };
  const lines = await liveLines(page);
  const mine = "Texte d'essai : la sphère tourne au cœur de la pièce.";
  try {
    await skipIntro(page);
    await page.addInitScript((t) => sessionStorage.setItem("bj-admin-token", t), token);
    await page.goto("/admin");
    await page.getByRole("tab", { name: "Textes de l'accueil" }).click();
    const field = page.locator('[data-home-text-field="mechanism:fr"]');
    await expect(field).toBeVisible();
    // Empty: the line of the piece, in grey, in each language.
    if (lines[MECHANISM_PIECE] && !before.texts.mechanism?.en) await expect(page.locator('[data-home-text-field="mechanism:en"]')).toHaveAttribute("placeholder", lines[MECHANISM_PIECE]!);
    await expect(page.locator("[data-home-text-block] textarea")).toHaveCount(BLOCKS.length * 6);
    await field.fill(mine);
    await page.locator("[data-home-texts-save]").click();
    await expect(page.getByRole("status")).toContainText("Enregistré");
    await page.screenshot({ path: shotPath(info, "home2711-admin"), type: "jpeg", quality: 70 });
    // Read by everyone, shown in French only; English keeps the line of the piece.
    const pub = (await (await page.request.get("/api/home-texts")).json()) as { texts: Record<string, Record<string, string>> };
    expect(pub.texts.mechanism?.fr).toBe(mine);
    await page.goto("/fr");
    await expect(page.locator('[data-home-text="mechanism"]')).toHaveText(mine, { timeout: 15_000 });
    await show(page, "innovation");
    await page.screenshot({ path: shotPath(info, "home2711-mechanism-fr-admin"), type: "jpeg", quality: 70 });
    if (lines[MECHANISM_PIECE] && !before.texts.mechanism?.en) {
      await page.goto("/");
      await page.waitForTimeout(2500);
      await expect(page.locator('[data-home-text="mechanism"]')).toHaveText(lines[MECHANISM_PIECE]!);
    }
    // Emptied: the line of the piece again.
    const cleared = await page.request.put("/api/admin/home-texts", { headers: auth, data: { texts: { ...before.texts, mechanism: { ...(before.texts.mechanism ?? {}), fr: "" } } } });
    expect(cleared.ok()).toBeTruthy();
    expect(((await cleared.json()) as { texts: Record<string, Record<string, string>> }).texts.mechanism?.fr).toBeUndefined();
  } finally {
    // The setting as it was.
    await page.request.put("/api/admin/home-texts", { headers: auth, data: { texts: before.texts } });
  }
});
